#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
record_marker="$project_directory/.snapshot-record-all"
record_log="${TMPDIR:-/tmp}/savoro-snapshot-record.$$.log"
expected_snapshot_count=36

after_recording() {
    rm -f "$record_marker" "$record_log"
}
trap after_recording EXIT

cd "$project_directory"
touch "$record_marker"

set +e
xcodebuild test \
    -scheme Savoro \
    -destination "platform=iOS Simulator,name=iPhone 17" \
    -only-testing:SavoroTests/SnapshotTests \
    | tee "$record_log"
record_status=${PIPESTATUS[0]}
set -e

recorded_count="$(grep -c "Record mode is on" "$record_log" || true)"
if [[ "$recorded_count" -ne "$expected_snapshot_count" ]]; then
    echo "Expected $expected_snapshot_count recorded snapshots, found $recorded_count (xcodebuild status $record_status)." >&2
    exit 1
fi

# SnapshotTesting reports each intentional `.all` recording as a test failure.
echo "Recorded $recorded_count reference images; verifying with record mode disabled."
rm -f "$record_marker"

xcodebuild test \
    -scheme Savoro \
    -destination "platform=iOS Simulator,name=iPhone 17" \
    -only-testing:SavoroTests/SnapshotTests
