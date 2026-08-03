#!/usr/bin/env bash
# Small lifecycle wrapper for onboarding-loop.sh.
# Usage: ./scripts/onboarding-loopctl.sh {arm|start|restart|status|logs [--follow]|stop|preflight}

set -uo pipefail
cd "$(dirname "$0")/.."

PROGRAM_DIR="${PROGRAM_DIR:-docs/tickets/01-onboarding}"
STOP_FILE="$PROGRAM_DIR/STOP"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-main}"
ALLOWED_UNTRACKED="${ALLOWED_UNTRACKED:-.codex/}"
ROOT_PI_DIR="${ROOT_PI_DIR:-$HOME/.pi}"
CONTROL_DIR="${CONTROL_DIR:-$ROOT_PI_DIR/onboarding-loop-control/$(basename "$(git rev-parse --show-toplevel)")}"
LOOP_SCRIPT="${LOOP_SCRIPT:-./scripts/onboarding-loop.sh}"
SUPERVISOR_LOG="$CONTROL_DIR/supervisor.log"
mkdir -p "$CONTROL_DIR"

pid_value() { [ -f "$CONTROL_DIR/loop.pid" ] && cat "$CONTROL_DIR/loop.pid" 2>/dev/null || true; }
pid_live() { local pid; pid="$(pid_value)"; [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; }
latest_run() { [ -f "$CONTROL_DIR/latest-run.txt" ] && cat "$CONTROL_DIR/latest-run.txt" 2>/dev/null || true; }
json_string() {
  local file="$1" key="$2"
  sed -nE "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\1/p" "$file" 2>/dev/null | head -1
}
unexpected_status() {
  git status --porcelain | awk -v allowed="$ALLOWED_UNTRACKED" '
    BEGIN { n = split(allowed, list, ":") }
    $1 == "??" {
      for (i = 1; i <= n; i++) if (list[i] != "" && index($2, list[i]) == 1) next
    }
    { print }
  '
}

start_loop() {
  if pid_live; then echo "already running: pid $(pid_value)"; return 0; fi
  [ ! -f "$STOP_FILE" ] || { echo "STOP is present; run '$0 arm' first" >&2; return 2; }
  [ "$(git branch --show-current)" = "$EXPECTED_BRANCH" ] || { echo "wrong branch: expected $EXPECTED_BRANCH" >&2; return 2; }
  [ -z "$(unexpected_status)" ] || { echo "tracked/non-authorized changes present:" >&2; unexpected_status >&2; return 2; }
  : > "$SUPERVISOR_LOG"
  nohup caffeinate -is "$LOOP_SCRIPT" >> "$SUPERVISOR_LOG" 2>&1 &
  printf '%s\n' "$!" > "$CONTROL_DIR/launcher.pid"
  sleep 3
  if pid_live; then
    echo "started: pid $(pid_value)"
    echo "log: $SUPERVISOR_LOG"
  else
    echo "loop did not stay up" >&2
    tail -60 "$SUPERVISOR_LOG" >&2 || true
    return 3
  fi
}

status_loop() {
  local run status pid child
  run="$(latest_run)"; pid="$(pid_value)"
  echo "branch: $(git branch --show-current)"
  echo "loop:   $(pid_live && echo "running pid=$pid" || echo stopped)"
  echo "STOP:   $([ -f "$STOP_FILE" ] && echo present || echo absent)"
  if [ -n "$(unexpected_status)" ]; then
    echo "tree:   DIRTY"
    unexpected_status | sed 's/^/        /'
  else
    echo "tree:   clean (allowed untracked: ${ALLOWED_UNTRACKED:-none})"
  fi
  echo "queue:  $(grep -c '| pending |' "$PROGRAM_DIR/_LEDGER.md" 2>/dev/null || echo '?') pending, $(grep -c '| done |' "$PROGRAM_DIR/_LEDGER.md" 2>/dev/null || echo '?') done, $(grep -c '| blocked |' "$PROGRAM_DIR/_LEDGER.md" 2>/dev/null || echo '?') blocked"
  echo "run:    ${run:-none}"
  [ -n "$run" ] || return 0
  status="$run/status.json"
  echo "state:  $(json_string "$status" state) / $(json_string "$status" detail)"
  echo "ticket: $(json_string "$status" ticket)"
  echo "head:   $(json_string "$status" head)"
  echo "update: $(json_string "$status" updatedAt)"
  child="$(json_string "$status" childPid)"
  if [ -n "$child" ] && kill -0 "$child" 2>/dev/null; then
    echo "child:  $(ps -o pid=,ppid=,etime=,%cpu=,comm= -p "$child" 2>/dev/null)"
    pgrep -P "$child" 2>/dev/null | while read -r descendant; do
      ps -o pid=,ppid=,etime=,%cpu=,comm= -p "$descendant" 2>/dev/null | sed 's/^/        /'
    done
  else
    echo "child:  none active"
  fi
  echo "recent:"
  tail -12 "$run/events.log" 2>/dev/null | sed 's/^/        /' || true
}

show_logs() {
  local run
  run="$(latest_run)"
  if [ "${1:-}" = --follow ]; then tail -F "$SUPERVISOR_LOG"; return; fi
  tail -100 "$SUPERVISOR_LOG" 2>/dev/null || true
  [ -z "$run" ] || find "$run/tasks" -type f \( -name 'worker-*.md' -o -name 'review-final-*.md' \) -print 2>/dev/null | sort | tail -6
}

case "${1:-status}" in
  arm) rm -f "$STOP_FILE"; echo "armed" ;;
  start|restart) start_loop ;;
  status) status_loop ;;
  stop) touch "$STOP_FILE"; echo "STOP armed; loop exits between tickets" ;;
  logs) show_logs "${2:-}" ;;
  preflight) ONBOARDING_PREFLIGHT_ONLY=1 "$LOOP_SCRIPT" ;;
  *) echo "usage: $0 {arm|start|restart|status|logs [--follow]|stop|preflight}" >&2; exit 2 ;;
esac
