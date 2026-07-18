#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
reference_directory="$project_directory/SavoroTests/__Snapshots__/SnapshotTests"
record_marker="$project_directory/.snapshot-record-accessibility-xxxl"
record_log="${TMPDIR:-/tmp}/savoro-snapshot-record.$$.log"
expected_snapshot_count=18

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

# Snapshot tests use a writable copy bundled into the test host. Copy only the
# recorded Accessibility XXXL references back to the source directory before verification.
data_container="$(xcrun simctl get_app_container booted com.savoro.Savoro data)"
recorded_reference_directory="$data_container/tmp/SavoroSnapshotReferences"
recorded_file_count="$(find "$recorded_reference_directory" -type f -name '*accessibility-xxxl*.png' | wc -l | tr -d ' ')"
if [[ "$recorded_file_count" -ne "$expected_snapshot_count" ]]; then
    echo "Expected $expected_snapshot_count Accessibility XXXL files in $recorded_reference_directory, found $recorded_file_count." >&2
    exit 1
fi
find "$recorded_reference_directory" -type f -name '*accessibility-xxxl*.png' -exec cp {} "$reference_directory"/ \;

# SnapshotTesting reports each intentional `.all` recording as a test failure.
echo "Recorded $recorded_count Accessibility XXXL reference images; verifying the full matrix with record mode disabled."
rm -f "$record_marker"

xcodebuild test \
    -scheme Savoro \
    -destination "platform=iOS Simulator,name=iPhone 17" \
    -only-testing:SavoroTests/SnapshotTests
