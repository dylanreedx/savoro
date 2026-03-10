#!/usr/bin/env node
'use strict';

/**
 * Conductor MCP — Autonomous Mode (Stream-JSON Wrapper)
 *
 * Replaces the bash wrapper. Spawns Claude by default, or Codex with `--codex`,
 * injects a system prompt telling the agent to call end_work after each task,
 * and parses the NDJSON stream to detect handoff and trigger rotation.
 *
 * Usage: node autonomous.js <project-name> [--max-budget=N] [--codex]
 */

const { spawn, execSync } = require('child_process');
const { createInterface } = require('readline');
const fs = require('fs');
const path = require('path');

// --- Argument parsing ---
const rawArgs = process.argv.slice(2);
let projectName = null;
let maxBudget = null;
let useCodex = false;

for (const arg of rawArgs) {
  if (arg.startsWith('--max-budget=')) {
    maxBudget = arg.split('=')[1];
  } else if (arg === '--codex') {
    useCodex = true;
  } else if (!arg.startsWith('--')) {
    projectName = arg;
  }
}

if (!projectName) {
  console.error('Usage: autonomous.js <project-name> [--max-budget=N] [--codex]');
  process.exit(1);
}
const runner = useCodex ? 'codex' : 'claude';

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
// Tool results from complete_work contain JSON followed by prompt text.
// Extract the first top-level JSON object by tracking brace depth.
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
    // Check for any uncommitted changes (staged or unstaged)
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

// --- Spawn an agent session (Claude by default, Codex with --codex) ---
function spawnSession(project, opts = {}) {
  return new Promise((resolve) => {
    let state = 'running'; // running | waitingForEndWork | resolved
    let timeoutHandle = null;
    let heartbeatHandle = null;
    const trackedTools = new Map(); // tool_use id -> { id, name }
    let toolCallsSeen = 0;
    const seenEventTypes = new Set();
    const sessionStartedAt = Date.now();
    let lastEventAt = Date.now();
    let eventCount = 0;

    const systemPrompt =
      'AUTONOMOUS MODE: After completing EACH task (after calling complete_work or complete_maestro_work and seeing nextTask), ' +
      'you MUST: 1) git add and git commit your changes with a descriptive commit message, ' +
      '2) call end_work to save the handoff. Do NOT proceed to the next task. ' +
      'The orchestrator will start a fresh session for it.';

    const sessionRunner = opts.runner || 'claude';
    const isCodexRunner = sessionRunner === 'codex';

    let command = 'claude';
    let cmdArgs = [
      '-p', `/conductor-resume ${project}`,
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--permission-mode', 'bypassPermissions',
      '--append-system-prompt', systemPrompt,
    ];

    if (isCodexRunner) {
      const codexPrompt = [
        `Conductor autonomous mode for project "${project}".`,
        'Do not use slash commands. Use Conductor MCP tools directly.',
        `1) Call resume_from_handoff with projectName="${project}".`,
        `2) If needed to start work, call begin_work with projectName="${project}".`,
        '3) Implement exactly one task (or one full maestro task lifecycle if maestro is enabled).',
        '4) Run relevant tests/checks.',
        '5) After task completion and after seeing nextTask from complete_work/complete_maestro_work, run git add + git commit with a descriptive message.',
        `6) Call end_work with projectName="${project}" and the active sessionId.`,
        '7) Stop immediately after end_work. Do not start the next task in this same run.',
        systemPrompt,
      ].join('\n');

      command = 'codex';
      cmdArgs = [
        'exec',
        '--json',
        '--skip-git-repo-check',
        '--dangerously-bypass-approvals-and-sandbox',
        codexPrompt,
      ];
    } else if (opts.maxBudget) {
      cmdArgs.push('--max-budget-usd', opts.maxBudget);
    }

    log('session', `Spawning ${command} session (iteration ${opts.iteration || '?'})`);

    const proc = spawn(command, cmdArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    currentProc = proc;
    log('session', `${command} pid=${proc.pid || '?'}`);

    if (isCodexRunner) {
      heartbeatHandle = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - sessionStartedAt) / 1000);
        const idleSec = Math.floor((Date.now() - lastEventAt) / 1000);
        log('session', `Heartbeat: runner=codex state=${state} elapsed=${elapsedSec}s idle=${idleSec}s events=${eventCount}`);
      }, 20000);
    }

    proc.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      if (isCodexRunner) {
        const text = String(chunk);
        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (trimmed) log('session', `codex stderr: ${trimmed}`);
        }
      }
    });

    function doResolve(result) {
      if (state === 'resolved') return;
      state = 'resolved';
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (heartbeatHandle) clearInterval(heartbeatHandle);
      currentProc = null;
      // Give process a moment to finish naturally
      setTimeout(() => {
        if (!proc.killed) {
          try { proc.kill('SIGTERM'); } catch {}
        }
      }, 1000);
      resolve(result);
    }

    function enterWaitingForEndWork(reason) {
      if (state !== 'running') return;
      state = 'waitingForEndWork';
      log('rotate', `Waiting for end_work (${reason}). 60s timeout started.`);
      timeoutHandle = setTimeout(() => {
        log('rotate', 'Timeout: end_work not received in 60s. Killing session.');
        try { proc.kill('SIGTERM'); } catch {}
        doResolve('rotate');
      }, 60000);
    }

    function handleToolResult(toolName, text) {
      if (state === 'resolved') return;

      // Normalize tool name (strip mcp__conductor__ prefix)
      const name = toolName.replace(/^mcp__conductor__/, '');

      if (name === 'complete_work') {
        const data = extractJSON(text);
        if (!data) {
          log('tool', 'complete_work -> could not parse response');
          return;
        }

        if (data.nextTask) {
          const nextDesc = data.nextTask.description || data.nextTask.id || '?';
          log('tool', `complete_work -> task passed, next: ${nextDesc}`);
          enterWaitingForEndWork('task completed, next available');
        } else if (data.complete) {
          log('tool', 'complete_work -> all tasks complete');
        } else {
          log('tool', `complete_work -> ${JSON.stringify(data).slice(0, 100)}`);
        }
        return;
      }

      if (name === 'complete_maestro_work') {
        const data = extractJSON(text);
        if (!data) {
          log('tool', 'complete_maestro_work -> could not parse response');
          return;
        }

        if (!data.completedTaskId) {
          // Phase advance, not task completion
          log('tool', 'complete_maestro_work -> phase advance');
          return;
        }

        if (data.nextTask) {
          const nextDesc = data.nextTask.description || '?';
          log('tool', `complete_maestro_work -> task ${data.completedTaskId.slice(0, 8)} done, next: ${nextDesc}`);
          enterWaitingForEndWork('maestro task completed, next available');
        } else if (data.complete) {
          log('tool', 'complete_maestro_work -> all tasks complete');
        } else {
          log('tool', `complete_maestro_work -> ${data.completedTaskId.slice(0, 8)}`);
        }
        return;
      }

      if (name === 'end_work') {
        const data = extractJSON(text);
        log('tool', `end_work -> ${text.slice(0, 200)}`);

        if (data) {
          // Server returns { handoff, session, progress: { pending, inProgress, ... } }
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
          // Can't parse, but end_work was called — rotate as safety fallback
          log('rotate', 'end_work called (unparseable). Rotating as safety fallback.');
          doResolve('rotate');
        }
        return;
      }
    }

    function collectText(payload, depth = 0) {
      if (depth > 4 || payload == null) return '';
      if (typeof payload === 'string') return payload;
      if (Array.isArray(payload)) {
        return payload.map((p) => collectText(p, depth + 1)).filter(Boolean).join('\n');
      }
      if (typeof payload !== 'object') return '';

      const parts = [];
      if (typeof payload.text === 'string') parts.push(payload.text);
      if (typeof payload.output_text === 'string') parts.push(payload.output_text);
      if (typeof payload.message === 'string') parts.push(payload.message);
      if (typeof payload.content === 'string') parts.push(payload.content);
      if (payload.content) parts.push(collectText(payload.content, depth + 1));
      if (payload.output) parts.push(collectText(payload.output, depth + 1));
      if (payload.result) parts.push(collectText(payload.result, depth + 1));
      return parts.filter(Boolean).join('\n');
    }

    function maybeTrackToolUse(item) {
      if (!item || typeof item !== 'object') return;
      const itemType = item.type || '';
      if (
        itemType !== 'function_call' &&
        itemType !== 'tool_use' &&
        itemType !== 'mcp_tool_call'
      ) return;

      const id = item.call_id || item.tool_use_id || item.id;
      const name =
        item.name ||
        item.tool_name ||
        item.function?.name ||
        item.server_tool_name;
      if (!id || !name) return;

      trackedTools.set(id, { id, name });
      toolCallsSeen += 1;
      log('tool', `Calling: ${name}`);
    }

    function maybeHandleToolResultItem(item) {
      if (!item || typeof item !== 'object') return;
      const itemType = item.type || '';
      if (
        itemType !== 'function_call_output' &&
        itemType !== 'tool_result' &&
        itemType !== 'mcp_tool_result'
      ) return;

      const id = item.call_id || item.tool_use_id || item.id;
      const tracked = id ? trackedTools.get(id) : null;
      const name =
        item.name ||
        item.tool_name ||
        item.server_tool_name ||
        tracked?.name;
      if (!name) return;

      const text = collectText(item.output || item.content || item.result || item);
      handleToolResult(name, text);
    }

    function maybeHandleCodexItemEvent(event) {
      const item = event.item || event.output_item || event.data?.item;
      if (!item || typeof item !== 'object') return;

      maybeTrackToolUse(item);
      maybeHandleToolResultItem(item);

      const itemType = item.type || 'unknown';
      if (isCodexRunner && event.type === 'item.completed') {
        log('session', `Codex item completed: ${itemType}`);
      }

      if (itemType === 'agent_message' && typeof item.text === 'string') {
        process.stdout.write(item.text);
        if (isCodexRunner && item.text.trim()) {
          log('session', `Codex assistant text: ${item.text.trim().slice(0, 240)}`);
        }
      }

      if ((itemType === 'message' || item.role === 'assistant') && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (!block || typeof block !== 'object') continue;
          if ((block.type === 'text' || block.type === 'output_text') && block.text) {
            process.stdout.write(block.text);
          }
          maybeTrackToolUse(block);
          maybeHandleToolResultItem(block);
        }

        if (isCodexRunner) {
          const text = collectText(item.content).trim();
          if (text) {
            log('session', `Codex assistant text: ${text.slice(0, 240)}`);
          }
        }
      }
    }

    // --- Parse NDJSON stream ---
    const rl = createInterface({ input: proc.stdout });

    rl.on('line', (rawLine) => {
      let event;
      try {
        event = JSON.parse(rawLine);
      } catch {
        return; // skip non-JSON lines
      }

      eventCount += 1;
      lastEventAt = Date.now();
      const type = event.type;
      const message = event.message;

      if (isCodexRunner && type && !seenEventTypes.has(type)) {
        seenEventTypes.add(type);
        log('session', `Codex event type: ${type}`);
      }

      if (isCodexRunner) {
        if (type === 'thread.started' && event.thread_id) {
          log('session', `Codex thread started: ${event.thread_id}`);
        } else if (type === 'turn.started') {
          log('session', 'Codex turn started.');
        } else if (type === 'turn.completed') {
          log('session', 'Codex turn completed.');
        } else if (type === 'turn.failed') {
          const errMsg = event.error?.message || event.message || 'unknown error';
          log('session', `Codex turn failed: ${errMsg}`);
        } else if (type === 'error') {
          const errMsg = event.error?.message || event.message || 'unknown error';
          log('session', `Codex error: ${errMsg}`);
        }
      }

      if (type === 'item.started' || type === 'item.completed') {
        maybeHandleCodexItemEvent(event);
      }

      // --- Assistant events: text output and tool calls ---
      // Each event contains one content block in message.content[]
      if (type === 'assistant' && message?.content) {
        for (const block of message.content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write(block.text);
          }
          if (block.type === 'tool_use') {
            trackedTools.set(block.id, { id: block.id, name: block.name });
            log('tool', `Calling: ${block.name}`);
          }
        }
        return;
      }

      // --- User events: tool results ---
      if (type === 'user' && message?.content) {
        for (const part of message.content) {
          if (part.type !== 'tool_result') continue;

          const tool = trackedTools.get(part.tool_use_id);
          if (!tool) continue;

          // Content can be a string or array of typed blocks
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

      // --- Result event: session cost summary ---
      if (type === 'result') {
        const cost = event.cost_usd ?? event.total_cost_usd ?? event.cost ?? '?';
        const turns = event.num_turns ?? event.turns ?? '?';
        const duration = event.duration_ms ? `${(event.duration_ms / 1000).toFixed(1)}s` : (event.duration_secs ? `${event.duration_secs}s` : '?');
        log('session', `Cost: $${cost}, turns: ${turns}, duration: ${duration}`);
        return;
      }
    });

    proc.on('close', (code) => {
      if (isCodexRunner && toolCallsSeen === 0) {
        log('session', 'Warning: codex session ended without any MCP/tool calls. Verify Codex MCP config and avoid slash-command prompts in exec mode.');
      }
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
  log('autonomous', `Runner: ${runner}`);
  if (maxBudget) {
    if (runner === 'codex') {
      log('autonomous', 'Note: --max-budget is ignored when using --codex.');
    } else {
      log('autonomous', `Max budget per session: $${maxBudget}`);
    }
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

    const result = await spawnSession(projectName, { maxBudget, iteration, runner });

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
    // Re-check whether there's more work
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
