#!/usr/bin/env bash
# Sequential worker/reviewer loop for docs/tickets/01-onboarding.
# The harness owns selection, scope validation, final checks, ledger, and commits.
# Intended supervisor: a pi session (gpt-5.6-sol, xhigh) running scripts/onboarding-loopctl.sh.
# Workers default to gpt-5.6-luna at max thinking; the reviewer is the opposite model at xhigh.
# The harness commits locally and does NOT push by default (PUSH_AFTER_COMMIT=1 to enable);
# the supervising session owns pushes.

set -uo pipefail
cd "$(dirname "$0")/.."

PROGRAM_DIR="${PROGRAM_DIR:-docs/tickets/01-onboarding}"
QUEUE_FILE="$PROGRAM_DIR/_QUEUE.md"
LEDGER_FILE="$PROGRAM_DIR/_LEDGER.md"
PROMPT_FILE="scripts/onboarding-worker-prompt.md"
STOP_FILE="$PROGRAM_DIR/STOP"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-main}"
MAX_ITER="${MAX_ITER:-50}"
MAX_REPAIR_PASSES="${MAX_REPAIR_PASSES:-2}"
PI_WORKER_MODELS="${PI_WORKER_MODELS:-openai-codex/gpt-5.6-luna}"
PI_WORKER_THINKING="${PI_WORKER_THINKING:-max}"
PI_REVIEW_THINKING="${PI_REVIEW_THINKING:-xhigh}"
PUSH_AFTER_COMMIT="${PUSH_AFTER_COMMIT:-0}"
ALLOWED_UNTRACKED="${ALLOWED_UNTRACKED:-.codex/}"
RESUME_TICKET="${RESUME_TICKET:-}"
RESUME_REVIEW_FILE="${RESUME_REVIEW_FILE:-}"
RESUME_REVIEW_SHA256="${RESUME_REVIEW_SHA256:-}"
RESUME_CANDIDATE_SHA256="${RESUME_CANDIDATE_SHA256:-}"
RESUME_STATUS_SHA256="${RESUME_STATUS_SHA256:-}"
IOS_DESTINATION="${IOS_DESTINATION:-platform=iOS Simulator,name=iPhone 17}"
ROOT_PI_DIR="${ROOT_PI_DIR:-$HOME/.pi}"
CONTROL_DIR="${CONTROL_DIR:-$ROOT_PI_DIR/onboarding-loop-control/$(basename "$(git rev-parse --show-toplevel)")}"
RUN_ROOT="${RUN_ROOT:-$ROOT_PI_DIR/onboarding-runs/$(basename "$(git rev-parse --show-toplevel)")}"
STAMP="$(date +%Y%m%dT%H%M%S)"
RUN_DIR="$RUN_ROOT/run-$STAMP"
TASKS_DIR="$RUN_DIR/tasks"
STATUS_FILE="$RUN_DIR/status.json"
EVENTS_FILE="$RUN_DIR/events.log"
CURRENT_TICKET=""
CURRENT_CHILD=""
ITERATION=0
START_HEAD="$(git rev-parse HEAD)"
STOP_REASON="running"

mkdir -p "$CONTROL_DIR" "$TASKS_DIR"
printf '%s\n' "$RUN_DIR" > "$CONTROL_DIR/latest-run.txt"
printf '%s\n' "$$" > "$CONTROL_DIR/loop.pid"
ln -sfn "$RUN_DIR" "$RUN_ROOT/latest" 2>/dev/null || true

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }
json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g'; }
log() { printf '[%s] %s\n' "$(now_utc)" "$*" | tee -a "$EVENTS_FILE"; }

unexpected_status() {
  git status --porcelain | awk -v allowed="$ALLOWED_UNTRACKED" -v stop="$STOP_FILE" '
    BEGIN { n = split(allowed, list, ":") }
    $1 == "??" {
      if ($2 == stop) next
      for (i = 1; i <= n; i++) if (list[i] != "" && index($2, list[i]) == 1) next
    }
    { print }
  '
}

changed_paths() {
  {
    git diff --name-only
    git diff --cached --name-only
    git ls-files --others --exclude-standard
  } | LC_ALL=C sort -u | awk -v allowed="$ALLOWED_UNTRACKED" -v stop="$STOP_FILE" '
    BEGIN { n = split(allowed, list, ":") }
    {
      if ($0 == stop) next
      for (i = 1; i <= n; i++) if (list[i] != "" && index($0, list[i]) == 1) next
      if (NF) print
    }
  '
}

candidate_snapshot() {
  local newfile
  git diff --binary
  git ls-files --others --exclude-standard | while IFS= read -r newfile; do
    [ -n "$newfile" ] && printf '\n--- new file: %s ---\n' "$newfile" && cat "$newfile" 2>/dev/null
  done
}

write_status() {
  local state="$1" detail="${2:-}"
  cat > "$STATUS_FILE.tmp" <<EOF
{
  "state": "$(json_escape "$state")",
  "detail": "$(json_escape "$detail")",
  "updatedAt": "$(now_utc)",
  "iteration": $ITERATION,
  "ticket": "$(json_escape "$CURRENT_TICKET")",
  "loopPid": "$$",
  "childPid": "$(json_escape "$CURRENT_CHILD")",
  "startHead": "$START_HEAD",
  "head": "$(git rev-parse HEAD)"
}
EOF
  mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

finish() {
  STOP_REASON="$1"
  write_status stopped "$STOP_REASON"
  log "stopped: $STOP_REASON"
}

cleanup() { rm -f "$CONTROL_DIR/loop.pid"; }
trap cleanup EXIT
trap 'touch "$STOP_FILE"; log "termination requested; STOP armed"' INT TERM

ledger_state() {
  grep -F "| \`$1\` |" "$LEDGER_FILE" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/,"",$3); print $3}'
}

ledger_state_for_id() {
  grep -E "^\| \`$1-[^\`]+\.md\` \|" "$LEDGER_FILE" | head -1 |
    awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/,"",$3); print $3}'
}

first_eligible_ticket() {
  local row file deps state dep eligible old_ifs
  while IFS= read -r row; do
    [ -n "$row" ] || continue
    file="$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]*`|`[ \t]*$/,"",$3); print $3}')"
    deps="$(printf '%s' "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/,"",$5); print $5}')"
    state="$(ledger_state "$file")"
    [ "$state" = pending ] || continue
    eligible=1
    if [ "$deps" != "—" ] && [ -n "$deps" ]; then
      old_ifs="$IFS"; IFS=','
      for dep in $deps; do
        dep="$(printf '%s' "$dep" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        [ "$(ledger_state_for_id "$dep")" = done ] || eligible=0
      done
      IFS="$old_ifs"
    fi
    [ "$eligible" = 1 ] && { printf '%s\n' "$file"; return 0; }
  done <<EOF
$(grep -E '^\| [0-9]+ \| `P[0-9]+\.[0-9]+-[^`]+\.md` \|' "$QUEUE_FILE" || true)
EOF
  return 1
}

queue_field() {
  # $1 = ticket file, $2 = 1-based pipe field (4 = track, 6 = execution)
  grep -F "| \`$1\` |" "$QUEUE_FILE" | awk -F'|' -v f="$2" '{gsub(/^[ \t]+|[ \t]+$/,"",$f); print $f}'
}

packet_track() {
  grep -m1 '^Track:' "$PROGRAM_DIR/$1" | sed 's/^Track:[[:space:]]*//' | tr '[:upper:]' '[:lower:]'
}

packet_files() {
  awk '/^## Files$/{f=1; next} /^## /{f=0} f' "$PROGRAM_DIR/$1" |
    sed -nE 's/^- `([^`]+)`.*/\1/p'
}

path_allowed() {
  local path="$1" ticket="$2" fence prefix suffix middle
  case "$path" in docs/api-contract.md) return 1 ;; esac
  while IFS= read -r fence; do
    [ -n "$fence" ] || continue
    case "$fence" in
      */)
        case "$path" in "$fence"*) return 0 ;; esac
        ;;
      *'*'*)
        prefix="${fence%%\**}"; suffix="${fence#*\*}"
        case "$suffix" in *'*'*) continue ;; esac
        case "$path" in
          "$prefix"*"$suffix")
            middle="${path#"$prefix"}"; middle="${middle%"$suffix"}"
            case "$middle" in */*) ;; *) return 0 ;; esac
            ;;
        esac
        ;;
      *) [ "$path" = "$fence" ] && return 0 ;;
    esac
  done <<EOF
$(packet_files "$ticket")
EOF
  return 1
}

validate_scope() {
  local ticket="$1" path count=0
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    count=$((count + 1))
    path_allowed "$path" "$ticket" || { echo "out-of-fence path: $path" >&2; return 1; }
  done <<EOF
$(changed_paths)
EOF
  [ "$count" -gt 0 ] || { echo "worker produced no ticket changes" >&2; return 1; }
}

capture_ledger_evidence() {
  local worker_output="$1" evidence_file="$2" count evidence
  count="$(grep -c '^LEDGER_EVIDENCE: ' "$worker_output" || true)"
  [ "$count" -eq 1 ] || {
    echo "worker must provide exactly one LEDGER_EVIDENCE line; found $count" >&2
    return 1
  }
  evidence="$(sed -n 's/^LEDGER_EVIDENCE: //p' "$worker_output")"
  [ -n "$evidence" ] || { echo "LEDGER_EVIDENCE is empty" >&2; return 1; }
  case "$evidence" in
    *'|'*) echo "LEDGER_EVIDENCE contains a literal pipe; encode it as &#124;" >&2; return 1 ;;
    *$'\r'*) echo "LEDGER_EVIDENCE contains a carriage return" >&2; return 1 ;;
  esac
  printf '%s\n' "$evidence" |
    grep -Eq '^commands=.+; counts=.+; evidence=.+; negative-witness=.+; limits=.+$' || {
      echo "LEDGER_EVIDENCE must contain nonempty commands, counts, evidence, negative-witness, and limits fields" >&2
      return 1
    }
  printf '%s\n' "$evidence" > "$evidence_file"
}

worker_model() {
  local models=($PI_WORKER_MODELS) index
  index=$(( (ITERATION - 1) % ${#models[@]} ))
  printf '%s\n' "${models[$index]}"
}

review_model() {
  case "$1" in
    *gpt-5.6-luna) printf '%s\n' openai-codex/gpt-5.6-sol ;;
    *) printf '%s\n' openai-codex/gpt-5.6-luna ;;
  esac
}

run_worker() {
  local ticket="$1" model="$2" task_dir="$3" pass="$4" review_file="${5:-}"
  local session_dir="$task_dir/worker-session-$pass" output="$task_dir/worker-$pass.md" rc token prompt
  mkdir -p "$session_dir"
  prompt="$(cat <<EOF
[onboarding harness]
TICKET=$ticket
PACKET=$PROGRAM_DIR/$ticket
TASK_DIR=$task_dir
PASS=$pass
EOF
)"
  if [ -n "$review_file" ]; then
    prompt="$prompt
This is a repair pass. Address only blocking findings in $review_file."
  fi
  prompt="$prompt

$(cat "$PROMPT_FILE")"

  log "$ticket worker pass $pass ($model, thinking=$PI_WORKER_THINKING)"
  pi --approve --no-extensions --model "$model" --thinking "$PI_WORKER_THINKING" \
    --session-dir "$session_dir" --name "onboarding-$ITERATION-worker-$pass" --mode text -p "$prompt" \
    > "$output" 2> "$task_dir/worker-$pass.stderr" &
  CURRENT_CHILD=$!
  write_status running "worker-pass-$pass"
  wait "$CURRENT_CHILD"; rc=$?
  CURRENT_CHILD=""
  write_status running "worker-pass-$pass-finished"
  [ "$rc" -eq 0 ] || return "$rc"

  token="$(awk 'NF { line=$0 } END { print line }' "$output")"
  case "$token" in
    'WORKER: READY')
      capture_ledger_evidence "$output" "$task_dir/ledger-evidence-$pass.txt" || return 22
      return 0
      ;;
    'WORKER: BLOCKED '*) echo "$token" >&2; return 20 ;;
    *) echo "malformed worker result: ${token:-empty}" >&2; return 21 ;;
  esac
}

run_review() {
  local ticket="$1" model="$2" task_dir="$3" round="$4"
  local diff="$task_dir/candidate-$round.diff" request="$task_dir/review-request-$round.md"
  local worker_report="$task_dir/worker-$round.md" ledger_evidence="$task_dir/ledger-evidence-$round.txt"
  local output="$task_dir/review-final-$round.md" session="$task_dir/reviewer-session-$round" rc
  candidate_snapshot > "$diff"
  cat > "$request" <<EOF
Review the candidate implementation for $ticket.

Read:
- $PROGRAM_DIR/$ticket
- $PROGRAM_DIR/_DESIGN.md
- $PROGRAM_DIR/_RUNBOOK.md
- $diff
- $worker_report
- $ledger_evidence
- scripts/onboarding-loop.sh (the orchestrator-owned post-approval ledger path)
- relevant production files needed to understand the changed seams

Be strict about correctness, packet architecture, privacy (no raw ids, no credential exposure, DTO
privacy projection), banned copy in visible strings, file scope, deterministic proof (including the
packet's required negative witness), and gate weakening. The worker must not edit _LEDGER.md;
instead, verify that $ledger_evidence contains every ticket-specific fact the packet requires in
its commands, counts, evidence, negative-witness, and limits fields. After approval and
final checks, the harness copies that evidence into the row verbatim. Do not reject a candidate
merely because the orchestrator-owned ledger update has not happened
yet. Report only blocking issues: behavior that can be wrong, architecture that violates a locked
decision in _DESIGN.md, unsafe handling, or a named done criterion left unproved. Do not request
stylistic cleanup or unrelated hardening. Give at most five blocking findings. You are read-only.

End with exactly DECISION: APPROVE or DECISION: REWORK.
EOF
  mkdir -p "$session"
  log "$ticket review round $round ($model, thinking=$PI_REVIEW_THINKING)"
  pi --no-approve --no-extensions --model "$model" --thinking "$PI_REVIEW_THINKING" --tools read,grep,find,ls \
    --session-dir "$session" --name "onboarding-$ITERATION-review-$round" --mode text -p "@$request" \
    > "$output" 2> "$task_dir/review-$round.stderr" &
  CURRENT_CHILD=$!
  write_status running "review-round-$round"
  wait "$CURRENT_CHILD"; rc=$?
  CURRENT_CHILD=""
  write_status running "review-round-$round-finished"
  [ "$rc" -eq 0 ] || return 30
  case "$(awk 'NF { line=$0 } END { print line }' "$output")" in
    'DECISION: APPROVE') return 0 ;;
    'DECISION: REWORK') return 10 ;;
    *) return 31 ;;
  esac
}

run_backend_checks() {
  local task_dir="$1"
  log "$CURRENT_TICKET final backend suite"
  (cd apps/api && bun run test && bun run typecheck) > "$task_dir/backend-checks.log" 2>&1
}

run_frontend_checks() {
  local task_dir="$1"
  log "$CURRENT_TICKET final iOS suite"
  (cd SavoroIOS && xcodebuild test -scheme Savoro -destination "$IOS_DESTINATION") \
    > "$task_dir/ios-checks.log" 2>&1
}

run_final_checks() {
  local task_dir="$1" track
  if [ -x scripts/check-onboarding-program.sh ]; then
    log "$CURRENT_TICKET program guard"
    ./scripts/check-onboarding-program.sh > "$task_dir/program-guard.log" 2>&1 || return 1
  fi
  if [ -x scripts/preland.sh ]; then
    log "$CURRENT_TICKET final preland"
    ./scripts/preland.sh > "$task_dir/preland.log" 2>&1
    return $?
  fi
  track="$(packet_track "$CURRENT_TICKET")"
  case "$track" in
    backend) run_backend_checks "$task_dir" ;;
    frontend) run_frontend_checks "$task_dir" ;;
    integration) run_backend_checks "$task_dir" && run_frontend_checks "$task_dir" ;;
    meta) run_backend_checks "$task_dir" ;;
    *) echo "unknown track: $track" >&2; return 1 ;;
  esac
}

update_ledger_done() {
  local ticket="$1" task_dir="$2" worker="$3" reviewer="$4" approved_pass="$5"
  local timestamp tmp note evidence_file ledger_evidence
  timestamp="$(now_utc)"
  tmp="$LEDGER_FILE.tmp"
  evidence_file="$task_dir/ledger-evidence-$approved_pass.txt"
  [ -s "$evidence_file" ] || { echo "missing ledger evidence: $evidence_file" >&2; return 1; }
  ledger_evidence="$(cat "$evidence_file")"
  case "$ledger_evidence" in
    *'|'*) echo "ledger evidence contains a literal pipe" >&2; return 1 ;;
  esac
  note="$ledger_evidence Harness completion: focused worker checks ($worker), independent opposite-model review ($reviewer), and final track checks exited 0. Evidence root: $task_dir."
  LEDGER_NOTE="$note" awk -F'|' -v OFS='|' -v ticket="$ticket" -v timestamp="$timestamp" '
    BEGIN { note=ENVIRON["LEDGER_NOTE"] }
    /^last-touch / {
      print "last-touch " timestamp " · ticket " ticket " · attempt 1 · pid — · status done"
      next
    }
    {
      key=$2
      gsub(/^[[:space:]]*`|`[[:space:]]*$/, "", key)
      if (key == ticket) {
        state=$3; gsub(/^[[:space:]]+|[[:space:]]+$/, "", state)
        if (state != "pending") exit 42
        $3=" done "; $4=" this commit "; $5=" " timestamp " "; $6=" " note " "
        found++
      }
      print
    }
    END { if (found != 1) exit 43 }
  ' "$LEDGER_FILE" > "$tmp" || { rm -f "$tmp"; return 1; }
  mv "$tmp" "$LEDGER_FILE"
}

stage_and_commit() {
  local ticket="$1" task_dir="$2" path id slug subject
  while IFS= read -r path; do
    [ -n "$path" ] && git add -A -- "$path"
  done <<EOF
$(changed_paths)
EOF
  git add -- "$LEDGER_FILE"
  git diff --cached --binary > "$task_dir/final.diff"
  id="${ticket%%-*}"
  slug="${ticket#*-}"; slug="${slug%.md}"; slug="${slug//-/ }"
  subject="$id: $slug"
  git commit -m "$subject" > "$task_dir/commit.log" 2>&1 || return 1
  if [ "$PUSH_AFTER_COMMIT" = 1 ]; then
    git push origin "$EXPECTED_BRANCH" > "$task_dir/push.log" 2>&1 || return 2
  fi
}

preflight() {
  local eligible resume_task_dir resume_run_dir review_name review_round source_candidate
  local candidate_review candidate_round review_hash source_hash current_hash status_file status_hash duplicate_status_keys
  local latest_review="" latest_round=-1
  [ "$(git branch --show-current)" = "$EXPECTED_BRANCH" ] || { echo "wrong branch: expected $EXPECTED_BRANCH" >&2; return 1; }
  [ ! -f "$STOP_FILE" ] || { echo "STOP is present" >&2; return 1; }
  [ -f "$QUEUE_FILE" ] && [ -f "$LEDGER_FILE" ] && [ -f "$PROMPT_FILE" ] || { echo "program files missing" >&2; return 1; }
  if [ -n "$RESUME_TICKET" ]; then
    [ -f "$PROGRAM_DIR/$RESUME_TICKET" ] || { echo "resume packet does not exist: $RESUME_TICKET" >&2; return 1; }
    [ -n "$RESUME_REVIEW_FILE" ] && [ -f "$RESUME_REVIEW_FILE" ] || { echo "resume review file does not exist" >&2; return 1; }
    [ ! -L "$RESUME_REVIEW_FILE" ] || { echo "resume review file must not be a symlink" >&2; return 1; }
    printf '%s\n' "$RESUME_REVIEW_SHA256" | grep -Eq '^[0-9a-f]{64}$' || { echo "valid RESUME_REVIEW_SHA256 is required" >&2; return 1; }
    printf '%s\n' "$RESUME_CANDIDATE_SHA256" | grep -Eq '^[0-9a-f]{64}$' || { echo "valid RESUME_CANDIDATE_SHA256 is required" >&2; return 1; }
    printf '%s\n' "$RESUME_STATUS_SHA256" | grep -Eq '^[0-9a-f]{64}$' || { echo "valid RESUME_STATUS_SHA256 is required" >&2; return 1; }
    [ -x /usr/bin/jq ] || { echo "/usr/bin/jq is required for resume status validation" >&2; return 1; }
    resume_task_dir="$(cd "$(dirname "$RESUME_REVIEW_FILE")" 2>/dev/null && pwd -P)" || { echo "cannot resolve resume review directory" >&2; return 1; }
    review_name="$(basename "$RESUME_REVIEW_FILE")"
    RESUME_REVIEW_FILE="$resume_task_dir/$review_name"
    case "$RESUME_REVIEW_FILE" in
      "$RUN_ROOT"/run-*/tasks/iteration-*-$RESUME_TICKET/review-final-[0-9]*.md) ;;
      *) echo "resume review is not a matching harness review artifact: $RESUME_REVIEW_FILE" >&2; return 1 ;;
    esac
    [ -f "$resume_task_dir/task.json" ] && [ ! -L "$resume_task_dir/task.json" ] && grep -Fq "\"ticket\":\"$RESUME_TICKET\"" "$resume_task_dir/task.json" || {
      echo "resume review task metadata does not match $RESUME_TICKET" >&2; return 1
    }
    review_round="${review_name#review-final-}"; review_round="${review_round%.md}"
    source_candidate="$resume_task_dir/candidate-$review_round.diff"
    [ -f "$source_candidate" ] && [ ! -L "$source_candidate" ] || { echo "matching source candidate artifact is missing" >&2; return 1; }
    review_hash="$(shasum -a 256 "$RESUME_REVIEW_FILE" | awk '{print $1}')"
    source_hash="$(shasum -a 256 "$source_candidate" | awk '{print $1}')"
    current_hash="$(candidate_snapshot | shasum -a 256 | awk '{print $1}')"
    [ "$review_hash" = "$RESUME_REVIEW_SHA256" ] || { echo "resume review hash mismatch" >&2; return 1; }
    [ "$source_hash" = "$RESUME_CANDIDATE_SHA256" ] || { echo "source candidate hash mismatch" >&2; return 1; }
    [ "$current_hash" = "$RESUME_CANDIDATE_SHA256" ] || { echo "current candidate does not match reviewed source" >&2; return 1; }
    [ "$(awk 'NF { line=$0 } END { print line }' "$RESUME_REVIEW_FILE")" = 'DECISION: REWORK' ] || {
      echo "resume review is not a REWORK decision" >&2; return 1
    }
    for candidate_review in "$resume_task_dir"/review-final-[0-9]*.md; do
      [ -f "$candidate_review" ] || continue
      candidate_round="${candidate_review##*/review-final-}"; candidate_round="${candidate_round%.md}"
      case "$candidate_round" in *[!0-9]*|'') continue ;; esac
      if [ "$candidate_round" -gt "$latest_round" ]; then
        latest_round="$candidate_round"
        latest_review="$candidate_review"
      fi
    done
    [ "$RESUME_REVIEW_FILE" = "$latest_review" ] || { echo "resume review is not the latest harness review" >&2; return 1; }
    resume_run_dir="$(dirname "$(dirname "$resume_task_dir")")"
    status_file="$resume_run_dir/status.json"
    [ -f "$status_file" ] && [ ! -L "$status_file" ] || { echo "resume source status is missing" >&2; return 1; }
    status_hash="$(shasum -a 256 "$status_file" | awk '{print $1}')"
    [ "$status_hash" = "$RESUME_STATUS_SHA256" ] || { echo "resume source status hash mismatch" >&2; return 1; }
    duplicate_status_keys="$(/usr/bin/jq --stream -r 'select(length == 2 and (.[0] | length) == 1) | .[0][0]' "$status_file" 2>/dev/null | LC_ALL=C sort | uniq -d)" || {
      echo "resume source status is not valid JSON" >&2; return 1
    }
    [ -z "$duplicate_status_keys" ] || { echo "resume source status contains duplicate keys" >&2; return 1; }
    /usr/bin/jq --stream -s -e 'all(.[]; (length != 2) or ((.[0] | length) == 1))' "$status_file" >/dev/null || {
      echo "resume source status must be a flat JSON object" >&2; return 1
    }
    /usr/bin/jq -e --arg ticket "$RESUME_TICKET" '
      type == "object" and
      (keys | sort) == ["childPid", "detail", "head", "iteration", "loopPid", "startHead", "state", "ticket", "updatedAt"] and
      (.state | type) == "string" and
      (.detail | type) == "string" and
      (.updatedAt | type) == "string" and
      (.iteration | type) == "number" and
      (.ticket | type) == "string" and
      (.loopPid | type) == "string" and
      (.childPid | type) == "string" and
      (.startHead | type) == "string" and
      (.head | type) == "string" and
      .state == "stopped" and
      .detail == ("review-rework-limit:" + $ticket) and
      .ticket == $ticket
    ' "$status_file" >/dev/null || {
      echo "resume source run did not stop at this ticket's rework limit" >&2; return 1
    }
    eligible="$(first_eligible_ticket || true)"
    [ "$eligible" = "$RESUME_TICKET" ] || { echo "resume ticket is not first eligible: $RESUME_TICKET (expected ${eligible:-none})" >&2; return 1; }
    [ "$(queue_field "$RESUME_TICKET" 6)" != supervised ] || { echo "cannot resume a supervised ticket" >&2; return 1; }
    git diff --cached --quiet || { echo "resume requires an unstaged candidate" >&2; return 1; }
    validate_scope "$RESUME_TICKET" || { echo "resume candidate failed scope validation" >&2; return 1; }
  elif [ -n "$(unexpected_status)" ]; then
    echo "tree is dirty (resolve or commit before looping — see _RUNBOOK.md preconditions):" >&2
    unexpected_status >&2
    return 1
  fi
  command -v pi >/dev/null 2>&1 || { echo "pi CLI not found" >&2; return 1; }
  command -v bun >/dev/null 2>&1 || { echo "bun not found" >&2; return 1; }
  if [ -x scripts/check-onboarding-program.sh ]; then
    ./scripts/check-onboarding-program.sh || { echo "program guard failed" >&2; return 1; }
  fi
}

if ! preflight; then finish preflight-failed; exit 1; fi
if [ "${ONBOARDING_PREFLIGHT_ONLY:-0}" = 1 ]; then finish preflight-ok; exit 0; fi

log "started at $START_HEAD (workers: $PI_WORKER_MODELS @$PI_WORKER_THINKING, review @$PI_REVIEW_THINKING)"
write_status running starting

for ITERATION in $(seq 1 "$MAX_ITER"); do
  [ ! -f "$STOP_FILE" ] || { finish stop-file; break; }
  resume_review_file=""
  if [ "$ITERATION" -eq 1 ] && [ -n "$RESUME_TICKET" ]; then
    CURRENT_TICKET="$RESUME_TICKET"
    resume_review_file="$RESUME_REVIEW_FILE"
  else
    [ -z "$(unexpected_status)" ] || { finish dirty-before-ticket; break; }
    CURRENT_TICKET="$(first_eligible_ticket || true)"
  fi
  if [ -z "$CURRENT_TICKET" ]; then
    if grep -q '| pending |' "$LEDGER_FILE"; then finish dependencies-blocked; else finish queue-drained; fi
    break
  fi
  if [ "$(queue_field "$CURRENT_TICKET" 6)" = supervised ]; then
    finish "supervised-required:$CURRENT_TICKET"
    break
  fi

  task_dir="$TASKS_DIR/iteration-$(printf '%03d' "$ITERATION")-$CURRENT_TICKET"
  mkdir -p "$task_dir"
  before_head="$(git rev-parse HEAD)"
  model="$(worker_model)"
  reviewer="$(review_model "$model")"
  printf '{"ticket":"%s","worker":"%s","reviewer":"%s","startedAt":"%s","beforeHead":"%s"}\n' \
    "$CURRENT_TICKET" "$model" "$reviewer" "$(now_utc)" "$before_head" > "$task_dir/task.json"

  if ! run_worker "$CURRENT_TICKET" "$model" "$task_dir" 1 "$resume_review_file"; then finish "worker-failed:$CURRENT_TICKET"; break; fi
  [ "$(git rev-parse HEAD)" = "$before_head" ] || { finish "worker-committed:$CURRENT_TICKET"; break; }
  if ! validate_scope "$CURRENT_TICKET"; then finish "scope-failed:$CURRENT_TICKET"; break; fi

  approved=0
  approved_pass=0
  for round in $(seq 1 $((MAX_REPAIR_PASSES + 1))); do
    run_review "$CURRENT_TICKET" "$reviewer" "$task_dir" "$round"
    review_rc=$?
    if [ "$review_rc" -eq 0 ]; then approved=1; approved_pass="$round"; break; fi
    if [ "$review_rc" -ne 10 ]; then finish "reviewer-failed:$CURRENT_TICKET"; break 2; fi
    [ "$round" -le "$MAX_REPAIR_PASSES" ] || break
    if ! run_worker "$CURRENT_TICKET" "$model" "$task_dir" $((round + 1)) "$task_dir/review-final-$round.md"; then
      finish "repair-failed:$CURRENT_TICKET"; break 2
    fi
    [ "$(git rev-parse HEAD)" = "$before_head" ] || { finish "worker-committed:$CURRENT_TICKET"; break 2; }
    if ! validate_scope "$CURRENT_TICKET"; then finish "scope-failed:$CURRENT_TICKET"; break 2; fi
  done
  [ "$approved" = 1 ] || { finish "review-rework-limit:$CURRENT_TICKET"; break; }

  if ! run_final_checks "$task_dir"; then finish "final-check-failed:$CURRENT_TICKET"; break; fi
  [ "$(git rev-parse HEAD)" = "$before_head" ] || { finish "unexpected-commit:$CURRENT_TICKET"; break; }
  if ! validate_scope "$CURRENT_TICKET"; then finish "scope-failed-after-checks:$CURRENT_TICKET"; break; fi
  if ! update_ledger_done "$CURRENT_TICKET" "$task_dir" "$model" "$reviewer" "$approved_pass"; then finish "ledger-update-failed:$CURRENT_TICKET"; break; fi
  stage_and_commit "$CURRENT_TICKET" "$task_dir"
  commit_rc=$?
  if [ "$commit_rc" -eq 2 ]; then finish "push-failed:$CURRENT_TICKET"; break; fi
  if [ "$commit_rc" -ne 0 ]; then finish "commit-failed:$CURRENT_TICKET"; break; fi
  if [ -n "$(unexpected_status)" ]; then finish "dirty-after-commit:$CURRENT_TICKET"; break; fi

  log "$CURRENT_TICKET committed as $(git rev-parse --short HEAD)"
  write_status running "ticket-complete"
  RESUME_TICKET=""
  RESUME_REVIEW_FILE=""
done

if [ "$STOP_REASON" = running ]; then finish max-iterations; fi
printf '%s\n' "$STOP_REASON" > "$RUN_DIR/result.txt"
