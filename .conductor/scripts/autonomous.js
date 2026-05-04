#!/usr/bin/env node
'use strict';

/**
 * Conductor MCP — Autonomous Mode (Stream-JSON Wrapper)
 *
 * Spawns `claude -p --output-format stream-json` for each task,
 * enforcing a strict one-task-per-session contract:
 *
 *   1. Resume from handoff / pick up next task
 *   2. Implement the task
 *   3. git commit with a descriptive message
 *   4. mark_task_complete + end_work
 *   5. Orchestrator kills session, starts fresh for next task
 *
 * The orchestrator listens for end_work to rotate. A guard after
 * mark_task_complete ensures the agent wraps up rather than
 * starting the next task.
 *
 * Usage: node autonomous.js <project-name> [--max-budget=N]
 */

const { spawn, execSync } = require('child_process');
const { createInterface } = require('readline');
const fs = require('fs');
const path = require('path');

// --- Argument parsing ---
const rawArgs = process.argv.slice(2);
let projectName = null;
let maxBudget = null;

for (const arg of rawArgs) {
  if (arg.startsWith('--max-budget=')) {
    maxBudget = arg.split('=')[1];
  } else if (!arg.startsWith('--')) {
    projectName = arg;
  }
}

if (!projectName) {
  console.error('Usage: autonomous.js <project-name> [--max-budget=N]');
  process.exit(1);
}

const CONDUCTOR_DIR = '.conductor';
const LOG_FILE = path.join(CONDUCTOR_DIR, 'autonomous.log');

// Track current child for cleanup on signals
let currentProc = null;

// --- Logging ---
function log(tag, msg) {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const line = `[${ts}] [${tag}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// --- JSON extraction helper ---
// Extract the first top-level JSON object from text by tracking brace depth.
function extractJSON(text) {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          start = -1; // malformed, keep scanning
        }
      }
    }
  }
  return null;
}

// --- Safety net: commit any uncommitted changes between sessions ---
function gitCommitSafetyNet() {
  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (!status) return; // clean working tree

    execSync('git add -A', { timeout: 30000, stdio: 'pipe' });
    execSync('git commit -m "feat: autonomous mode changes (uncommitted work)"', { timeout: 30000, stdio: 'pipe' });
    log('git', 'Safety net: committed uncommitted changes left by agent.');
  } catch {
    // Non-critical — best effort
  }
}

// --- Check for remaining tasks ---
function checkTasks(project) {
  try {
    const output = execSync(`conductor-mcp next "${project}"`, {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (output.includes('All tasks complete')) return 'complete';
    if (output.includes(`Project '${project}' not found`)) return 'not_found';
    if (output.includes('Next Task')) return 'has_tasks';
    if (output.includes('waiting on dependencies')) return 'blocked';
    return 'unknown';
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    if (output.includes('All tasks complete')) return 'complete';
    if (output.includes(`Project '${project}' not found`)) return 'not_found';
    return 'error';
  }
}

// Tools the agent is allowed to call after mark_task_complete.
// Anything else means it's moving on to the next task — kill it.
const WRAP_UP_TOOLS = new Set([
  'Bash',            // git commit (if not done yet)
  'end_work',        // save handoff + complete session
  'record_commit',   // record the commit hash
  'save_memory',     // save patterns learned
]);

// --- Spawn a Claude session ---
function spawnSession(project, opts = {}) {
  return new Promise((resolve) => {
    let state = 'running'; // running | wrapping_up | resolved
    let wrapUpTimeout = null;
    const trackedTools = new Map(); // tool_use id -> { id, name }

    const systemPrompt = [
      'AUTONOMOUS MODE — STRICT ONE-TASK-PER-SESSION CONTRACT:',
      'You are orchestrated by an autonomous runner that starts a fresh session for each task.',
      'Complete EXACTLY ONE task per session, then hand off. Follow this exact sequence:',
      '',
      '1. Resume from handoff and implement the current task',
      '2. git add -A && git commit with a descriptive commit message',
      '3. Call record_commit with the commit hash',
      '4. Call mark_task_complete to mark the task done',
      '5. Call end_work to save the handoff',
      '',
      'CRITICAL: Do NOT call complete_work or get_next_task.',
      'Do NOT start implementing another task.',
      'The orchestrator will kill this session after end_work and start a new one.',
    ].join('\n');

    const cmdArgs = [
      '-p', `/conductor-resume ${project}`,
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--permission-mode', 'bypassPermissions',
      '--append-system-prompt', systemPrompt,
    ];
    if (opts.maxBudget) {
      cmdArgs.push('--max-budget-usd', opts.maxBudget);
    }

    log('session', `Spawning claude session (iteration ${opts.iteration || '?'})`);

    const proc = spawn('claude', cmdArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    currentProc = proc;

    proc.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });

    function doResolve(result) {
      if (state === 'resolved') return;
      state = 'resolved';
      if (wrapUpTimeout) clearTimeout(wrapUpTimeout);
      currentProc = null;
      setTimeout(() => {
        if (!proc.killed) {
          try { proc.kill('SIGTERM'); } catch {}
        }
      }, 1000);
      resolve(result);
    }

    // --- Tool result handlers ---

    function handleToolResult(toolName, text) {
      if (state === 'resolved') return;
      const name = toolName.replace(/^mcp__conductor__/, '');

      // mark_task_complete: task is done, enter wrapping_up state
      if (name === 'mark_task_complete') {
        log('tool', 'mark_task_complete -> task done, entering wrap-up');
        if (state === 'running') {
          state = 'wrapping_up';
          log('rotate', 'Waiting for end_work. 60s timeout.');
          wrapUpTimeout = setTimeout(() => {
            log('rotate', 'Wrap-up timeout. Killing session.');
            try { proc.kill('SIGTERM'); } catch {}
            doResolve('rotate');
          }, 60000);
        }
        return;
      }

      // end_work: handoff saved, rotate or finish
      if (name === 'end_work') {
        const data = extractJSON(text);
        log('tool', `end_work -> ${text.slice(0, 200)}`);

        if (data) {
          const p = data.progress || data.remaining || data;
          const pending = p.pending ?? 0;
          const inProgress = p.inProgress ?? 0;

          if (pending + inProgress > 0) {
            log('rotate', `Handoff saved. ${pending} pending, ${inProgress} in-progress remaining.`);
            doResolve('rotate');
          } else {
            log('rotate', 'All tasks done.');
            doResolve('done');
          }
        } else {
          log('rotate', 'end_work called (unparseable). Rotating.');
          doResolve('rotate');
        }
        return;
      }
    }

    // --- Parse NDJSON stream ---
    const rl = createInterface({ input: proc.stdout });

    rl.on('line', (rawLine) => {
      let event;
      try {
        event = JSON.parse(rawLine);
      } catch {
        return;
      }

      const type = event.type;
      const message = event.message;

      // --- Assistant: text output and tool calls ---
      if (type === 'assistant' && message?.content) {
        for (const block of message.content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write(block.text);
          }
          if (block.type === 'tool_use') {
            trackedTools.set(block.id, { id: block.id, name: block.name });
            log('tool', `Calling: ${block.name}`);

            // Enforce wrap-up: after mark_task_complete, only allow wrap-up tools
            if (state === 'wrapping_up') {
              const name = block.name.replace(/^mcp__conductor__/, '');
              if (!WRAP_UP_TOOLS.has(name)) {
                log('rotate', `Agent called ${block.name} during wrap-up. Killing session.`);
                try { proc.kill('SIGTERM'); } catch {}
                doResolve('rotate');
              }
            }
          }
        }
        return;
      }

      // --- User: tool results ---
      if (type === 'user' && message?.content) {
        for (const part of message.content) {
          if (part.type !== 'tool_result') continue;

          const tool = trackedTools.get(part.tool_use_id);
          if (!tool) continue;

          let text = '';
          if (typeof part.content === 'string') {
            text = part.content;
          } else if (Array.isArray(part.content)) {
            text = part.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join('');
          }

          handleToolResult(tool.name, text);
        }
        return;
      }

      // --- Result: session cost summary ---
      if (type === 'result') {
        const cost = event.cost_usd ?? event.total_cost_usd ?? event.cost ?? '?';
        const turns = event.num_turns ?? event.turns ?? '?';
        const duration = event.duration_ms ? `${(event.duration_ms / 1000).toFixed(1)}s` : (event.duration_secs ? `${event.duration_secs}s` : '?');
        log('session', `Cost: $${cost}, turns: ${turns}, duration: ${duration}`);
        return;
      }
    });

    proc.on('close', (code) => {
      log('session', `Process exited (code ${code})`);
      if (state !== 'resolved') {
        doResolve('finished');
      }
    });

    proc.on('error', (err) => {
      log('session', `Process error: ${err.message}`);
      if (state !== 'resolved') {
        doResolve('finished');
      }
    });
  });
}

// --- Main loop ---
async function main() {
  if (!fs.existsSync(CONDUCTOR_DIR)) {
    console.error('Error: .conductor/ not found. Run "conductor-mcp init" first.');
    process.exit(1);
  }

  log('autonomous', `=== Autonomous mode started for project: ${projectName} ===`);
  if (maxBudget) {
    log('autonomous', `Max budget per session: $${maxBudget}`);
  }

  let iteration = 0;

  while (true) {
    iteration++;

    // Check for remaining tasks
    const status = checkTasks(projectName);

    if (status === 'complete') {
      log('autonomous', 'All tasks complete! Exiting.');
      break;
    }
    if (status === 'not_found') {
      log('autonomous', `Project '${projectName}' not found. Exiting.`);
      process.exit(1);
    }
    if (status === 'blocked') {
      log('autonomous', 'All remaining tasks are blocked on dependencies. Exiting.');
      break;
    }

    log('autonomous', `--- Iteration ${iteration} ---`);

    const result = await spawnSession(projectName, { maxBudget, iteration });

    // Safety net: commit any changes the agent didn't commit itself
    gitCommitSafetyNet();

    if (result === 'rotate') {
      log('autonomous', 'Rotation complete. Starting new session in 2s...');
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    if (result === 'done') {
      log('autonomous', 'All tasks done. Exiting.');
      break;
    }

    // result === 'finished' — session ended without explicit rotation signal
    const recheck = checkTasks(projectName);

    if (recheck === 'complete') {
      log('autonomous', 'All tasks complete! Exiting.');
      break;
    }

    if (recheck === 'has_tasks') {
      log('autonomous', 'Session ended without rotation signal but tasks remain. Continuing in 2s...');
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    log('autonomous', 'No more actionable tasks. Exiting.');
    break;
  }

  log('autonomous', '=== Autonomous mode finished ===');
}

// --- Cleanup on signals ---
function cleanup() {
  log('autonomous', 'Received shutdown signal.');
  if (currentProc && !currentProc.killed) {
    try { currentProc.kill('SIGTERM'); } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().catch((err) => {
  log('autonomous', `Fatal error: ${err.message}`);
  process.exit(1);
});
