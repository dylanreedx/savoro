#!/usr/bin/env bash
set -euo pipefail

# This guard is intentionally read-only. It validates the program files in place and
# never rewrites the queue, ledger, or packet headers.
SCRIPT_PATH="${BASH_SOURCE[0]}"
case "$SCRIPT_PATH" in
  /*) ;;
  *) SCRIPT_PATH="$PWD/$SCRIPT_PATH" ;;
esac
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ "$#" -gt 1 ]; then
  printf 'usage: %s [program-directory]\n' "$0" >&2
  exit 2
fi

if [ "$#" -eq 1 ]; then
  PROGRAM_DIR="$1"
  case "$PROGRAM_DIR" in
    /*) ;;
    *) PROGRAM_DIR="$PWD/$PROGRAM_DIR" ;;
  esac
else
  PROGRAM_DIR="$REPO_ROOT/docs/tickets/01-onboarding"
fi

if [ -d "$PROGRAM_DIR" ]; then
  PROGRAM_DIR="$(cd "$PROGRAM_DIR" && pwd)"
fi

QUEUE_FILE="$PROGRAM_DIR/_QUEUE.md"
LEDGER_FILE="$PROGRAM_DIR/_LEDGER.md"
EXPECTED_QUEUE_ROWS=50

violations=0

violation() {
  violations=$((violations + 1))
  printf 'VIOLATION: %s\n' "$*" >&2
}

trim() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

strip_bold() {
  local value
  value="$(trim "$1")"
  value="$(printf '%s' "$value" | sed -e 's/^\*\*//' -e 's/\*\*$//')"
  trim "$value"
}

count_in_array() {
  local needle="$1"
  shift
  local value count=0
  for value in "$@"; do
    [ "$value" = "$needle" ] && count=$((count + 1))
  done
  printf '%s\n' "$count"
}

queue_line=()
queue_ticket=()
queue_id=()
queue_track=()
queue_dependencies=()
queue_execution=()
queue_packet_track=()

if [ ! -d "$PROGRAM_DIR" ]; then
  violation "$PROGRAM_DIR: program directory does not exist"
fi

queue_records=''
if [ -f "$QUEUE_FILE" ]; then
  queue_records="$(awk -F'|' '
    /^[[:space:]]*\|[[:space:]]*[0-9]+[[:space:]]*\|[[:space:]]*`P[0-9]+\.[0-9]+-[^`|]+\.md`[[:space:]]*\|/ {
      ticket=$3
      track=$4
      dependencies=$5
      execution=$6
      gsub(/^[ \t]+|[ \t]+$/, "", ticket)
      gsub(/^`|`$/, "", ticket)
      gsub(/^[ \t]+|[ \t]+$/, "", track)
      gsub(/^[ \t]+|[ \t]+$/, "", dependencies)
      gsub(/^[ \t]+|[ \t]+$/, "", execution)
      printf "%d|%s|%s|%s|%s\n", NR, ticket, track, dependencies, execution
    }
  ' "$QUEUE_FILE" 2>/dev/null || true)"
else
  violation "$QUEUE_FILE: queue file does not exist"
fi

while IFS='|' read -r row_number ticket track dependencies execution; do
  [ -n "${ticket:-}" ] || continue
  index=${#queue_ticket[@]}
  queue_line[$index]="$row_number"
  queue_ticket[$index]="$ticket"
  queue_id[$index]="${ticket%%-*}"
  queue_track[$index]="$(trim "$track")"
  queue_dependencies[$index]="$(trim "$dependencies")"
  queue_execution[$index]="$(trim "$execution")"
  queue_packet_track[$index]=''
done <<EOF
$queue_records
EOF

queue_count=${#queue_ticket[@]}
if [ "$queue_count" -ne "$EXPECTED_QUEUE_ROWS" ]; then
  violation "$QUEUE_FILE: expected $EXPECTED_QUEUE_ROWS data rows, found $queue_count (queue row count)"
fi

# Validate the queue's row-local fields and the uniqueness used by dependency lookup.
for ((i = 0; i < queue_count; i++)); do
  ticket="${queue_ticket[$i]}"
  ticket_id="${queue_id[$i]}"
  track="${queue_track[$i]}"
  dependencies="${queue_dependencies[$i]}"
  execution="${queue_execution[$i]}"
  row_number="${queue_line[$i]}"

  case "$ticket" in
    */*)
      violation "$QUEUE_FILE row $row_number: ticket filename '$ticket' must be a packet filename in the program directory"
      ;;
  esac

  case "$track" in
    B) queue_packet_track[$i]='backend' ;;
    F) queue_packet_track[$i]='frontend' ;;
    I) queue_packet_track[$i]='integration' ;;
    M) queue_packet_track[$i]='meta' ;;
    *)
      violation "$QUEUE_FILE row $row_number ticket '$ticket': invalid track '$track'; expected B, F, I, or M"
      ;;
  esac

  case "$execution" in
    autonomous|supervised) ;;
    *)
      violation "$QUEUE_FILE row $row_number ticket '$ticket': invalid execution '$execution'; expected autonomous or supervised"
      ;;
  esac

  for ((j = 0; j < i; j++)); do
    if [ "$ticket" = "${queue_ticket[$j]}" ]; then
      violation "$QUEUE_FILE row $row_number: duplicate ticket filename '$ticket' (also row ${queue_line[$j]})"
    fi
    if [ "$ticket_id" = "${queue_id[$j]}" ]; then
      violation "$QUEUE_FILE row $row_number ticket '$ticket': duplicate ticket id '$ticket_id' (also row ${queue_line[$j]})"
    fi
  done

  if [ -z "$dependencies" ]; then
    violation "$QUEUE_FILE row $row_number ticket '$ticket': Depends on cell is empty; expected — or packet ids"
  elif [ "$dependencies" != '—' ]; then
    dependency_records="$(printf '%s\n' "$dependencies" | tr ',' '\n')"
    while IFS= read -r dependency; do
      dependency="$(trim "$dependency")"
      if [ -z "$dependency" ]; then
        violation "$QUEUE_FILE row $row_number ticket '$ticket': Depends on contains an empty entry"
        continue
      fi
      if ! printf '%s\n' "$dependency" | grep -Eq '^P[0-9]+\.[0-9]+$'; then
        violation "$QUEUE_FILE row $row_number ticket '$ticket': invalid dependency '$dependency'; expected a P<phase>.<n> id"
        continue
      fi

      dependency_found=0
      for known_id in "${queue_id[@]}"; do
        if [ "$known_id" = "$dependency" ]; then
          dependency_found=1
          break
        fi
      done
      if [ "$dependency_found" -eq 0 ]; then
        violation "$QUEUE_FILE row $row_number ticket '$ticket': dependency '$dependency' does not map to a queue ticket filename"
      elif [ "$dependency" = "$ticket_id" ]; then
        violation "$QUEUE_FILE row $row_number ticket '$ticket': dependency '$dependency' must name another queue row"
      fi
    done <<EOF
$dependency_records
EOF
  fi

done

# The supervised set is a deliberate program invariant, not just an execution whitelist.
expected_supervised_ids='P0.8 P1.2 P7.3 P8.4 P8.5'
supervised_ids=()
for ((i = 0; i < queue_count; i++)); do
  if [ "${queue_execution[$i]}" = supervised ]; then
    supervised_ids[${#supervised_ids[@]}]="${queue_id[$i]}"
  fi
done

supervised_count=${#supervised_ids[@]}
if [ "$supervised_count" -ne 5 ]; then
  violation "$QUEUE_FILE: supervised-set expected exactly 5 rows [$expected_supervised_ids], found $supervised_count"
fi

for expected_id in $expected_supervised_ids; do
  expected_found=0
  if [ "$supervised_count" -gt 0 ]; then
    for actual_id in "${supervised_ids[@]}"; do
      [ "$actual_id" = "$expected_id" ] && expected_found=1
    done
  fi
  if [ "$expected_found" -eq 0 ]; then
    violation "$QUEUE_FILE: supervised-set is missing expected supervised ticket '$expected_id'"
  fi
done

if [ "${#supervised_ids[@]}" -gt 0 ]; then
  for actual_id in "${supervised_ids[@]}"; do
    actual_expected=0
    for expected_id in $expected_supervised_ids; do
      [ "$actual_id" = "$expected_id" ] && actual_expected=1
    done
    if [ "$actual_expected" -eq 0 ]; then
      violation "$QUEUE_FILE: supervised-set contains unexpected supervised ticket '$actual_id'"
    fi
  done
fi

ledger_line=()
ledger_ticket=()
ledger_state=()

ledger_records=''
if [ -f "$LEDGER_FILE" ]; then
  ledger_records="$(awk -F'|' '
    /^[[:space:]]*\|[[:space:]]*`P[0-9]+\.[0-9]+-[^`|]+\.md`[[:space:]]*\|/ {
      ticket=$2
      state=$3
      gsub(/^[ \t]+|[ \t]+$/, "", ticket)
      gsub(/^`|`$/, "", ticket)
      gsub(/^[ \t]+|[ \t]+$/, "", state)
      printf "%d|%s|%s\n", NR, ticket, state
    }
  ' "$LEDGER_FILE" 2>/dev/null || true)"
else
  violation "$LEDGER_FILE: ledger file does not exist"
fi

while IFS='|' read -r row_number ticket state; do
  [ -n "${ticket:-}" ] || continue
  index=${#ledger_ticket[@]}
  ledger_line[$index]="$row_number"
  ledger_ticket[$index]="$ticket"
  ledger_state[$index]="$(trim "$state")"

done <<EOF
$ledger_records
EOF

ledger_count=${#ledger_ticket[@]}
if [ "$ledger_count" -ne "$queue_count" ]; then
  violation "$LEDGER_FILE: expected $queue_count data rows to match the queue, found $ledger_count"
fi

for ((i = 0; i < ledger_count; i++)); do
  state="${ledger_state[$i]}"
  case "$state" in
    pending|in-progress|done|blocked) ;;
    *)
      violation "$LEDGER_FILE row ${ledger_line[$i]} ticket '${ledger_ticket[$i]}': invalid state '$state'; expected pending|in-progress|done|blocked"
      ;;
  esac

done

# Compare the filename sets in both directions. Counts are compared to the parsed
# queue count above; the ledger is not independently trusted to contain 50 rows.
for ((i = 0; i < queue_count; i++)); do
  ticket="${queue_ticket[$i]}"
  ledger_occurrences="$(count_in_array "$ticket" "${ledger_ticket[@]}")"
  if [ "$ledger_occurrences" -eq 0 ]; then
    violation "$LEDGER_FILE: missing ticket filename '$ticket' required by $QUEUE_FILE row ${queue_line[$i]}"
  elif [ "$ledger_occurrences" -gt 1 ]; then
    violation "$LEDGER_FILE: ticket filename '$ticket' appears $ledger_occurrences times; queue row ${queue_line[$i]} requires exactly one ledger row"
  fi
done

for ((i = 0; i < ledger_count; i++)); do
  ticket="${ledger_ticket[$i]}"
  queue_occurrences="$(count_in_array "$ticket" "${queue_ticket[@]}")"
  if [ "$queue_occurrences" -eq 0 ]; then
    violation "$LEDGER_FILE row ${ledger_line[$i]} ticket '$ticket': filename is not present in $QUEUE_FILE"
  fi
done

packet_count=0
for ((i = 0; i < queue_count; i++)); do
  ticket="${queue_ticket[$i]}"
  packet_path="$PROGRAM_DIR/$ticket"
  row_number="${queue_line[$i]}"

  if [ ! -f "$packet_path" ]; then
    violation "$QUEUE_FILE row $row_number ticket '$ticket': packet file does not exist: $packet_path"
    continue
  fi
  packet_count=$((packet_count + 1))

  # A packet header is the preamble before the first level-two section.  Blank
  # separators are allowed inside it; body prose must not satisfy or override metadata.
  packet_header="$(awk '
    /^##[[:space:]]/ { exit }
    { print }
  ' "$packet_path")"

  phase_header_count="$(printf '%s\n' "$packet_header" | grep -c '^Phase:' || true)"
  track_header_count="$(printf '%s\n' "$packet_header" | grep -c '^Track:' || true)"
  execution_header_count="$(printf '%s\n' "$packet_header" | grep -c '^Execution:' || true)"
  dependencies_header_count="$(printf '%s\n' "$packet_header" | grep -c '^Depends on:' || true)"

  if [ "$phase_header_count" -eq 0 ]; then
    violation "$packet_path (queue row $row_number): missing required header 'Phase:'"
  elif [ "$phase_header_count" -gt 1 ]; then
    violation "$packet_path (queue row $row_number): header contains $phase_header_count 'Phase:' fields; expected exactly one"
  fi
  if [ "$track_header_count" -eq 0 ]; then
    violation "$packet_path (queue row $row_number): missing required header 'Track:'"
  elif [ "$track_header_count" -gt 1 ]; then
    violation "$packet_path (queue row $row_number): header contains $track_header_count 'Track:' fields; expected exactly one"
  fi
  if [ "$execution_header_count" -eq 0 ]; then
    violation "$packet_path (queue row $row_number): missing required header 'Execution:'"
  elif [ "$execution_header_count" -gt 1 ]; then
    violation "$packet_path (queue row $row_number): header contains $execution_header_count 'Execution:' fields; expected exactly one"
  fi
  if [ "$dependencies_header_count" -eq 0 ]; then
    violation "$packet_path (queue row $row_number): missing required header 'Depends on:'"
  elif [ "$dependencies_header_count" -gt 1 ]; then
    violation "$packet_path (queue row $row_number): header contains $dependencies_header_count 'Depends on:' fields; expected exactly one"
  fi

  phase_header="$(printf '%s\n' "$packet_header" | grep -m1 '^Phase:' || true)"
  track_header="$(printf '%s\n' "$packet_header" | grep -m1 '^Track:' || true)"
  execution_header="$(printf '%s\n' "$packet_header" | grep -m1 '^Execution:' || true)"
  dependencies_header="$(printf '%s\n' "$packet_header" | grep -m1 '^Depends on:' || true)"

  if [ "$phase_header_count" -gt 0 ]; then
    phase_value="$(trim "${phase_header#Phase:}")"
    if [ -z "$phase_value" ]; then
      violation "$packet_path (queue row $row_number): required header 'Phase:' is empty"
    else
      expected_phase="${queue_id[$i]#P}"
      expected_phase="${expected_phase%%.*}"
      packet_phase="$(printf '%s' "$phase_value" | sed -nE 's/^([0-9]+)([[:space:]].*)?$/\1/p')"
      if [ -z "$packet_phase" ]; then
        violation "$packet_path (queue row $row_number): Phase value '$phase_value' does not start with a phase number"
      elif [ "$packet_phase" != "$expected_phase" ]; then
        violation "$packet_path (queue row $row_number): Phase is '$packet_phase', expected '$expected_phase' for ticket ${queue_id[$i]}"
      fi
    fi
  fi

  if [ "$track_header_count" -gt 0 ]; then
    packet_track="$(trim "${track_header#Track:}" | tr '[:upper:]' '[:lower:]')"
    if [ -z "$packet_track" ]; then
      violation "$packet_path (queue row $row_number): required header 'Track:' is empty"
    elif [ -n "${queue_packet_track[$i]}" ] && [ "$packet_track" != "${queue_packet_track[$i]}" ]; then
      violation "$packet_path (queue row $row_number): Track is '$packet_track', expected '${queue_packet_track[$i]}' from queue track '${queue_track[$i]}'"
    fi
  fi

  if [ "$execution_header_count" -gt 0 ]; then
    packet_execution="$(strip_bold "${execution_header#Execution:}")"
    case "$packet_execution" in
      autonomous|supervised) ;;
      *)
        violation "$packet_path (queue row $row_number): invalid Execution '$packet_execution'"
        ;;
    esac
    if [ -n "$packet_execution" ] && [ "$packet_execution" != "${queue_execution[$i]}" ]; then
      violation "$packet_path (queue row $row_number): Execution is '$packet_execution', expected '${queue_execution[$i]}' from queue"
    fi
  fi

  if [ "$dependencies_header_count" -gt 0 ]; then
    packet_dependencies="$(trim "${dependencies_header#Depends on:}")"
    if [ -z "$packet_dependencies" ]; then
      violation "$packet_path (queue row $row_number): required header 'Depends on:' is empty"
    elif [ "$packet_dependencies" != "${queue_dependencies[$i]}" ]; then
      violation "$packet_path (queue row $row_number): Depends on is '$packet_dependencies', expected '${queue_dependencies[$i]}' from queue"
    fi
  fi
done

if [ "$violations" -ne 0 ]; then
  printf 'onboarding program guard: %d violation(s)\n' "$violations" >&2
  exit 1
fi

printf 'onboarding program guard: %d rows checked, %d packets checked\n' "$queue_count" "$packet_count"
