# Savoro iOS Navigation Smoke Checklist

Purpose: repeatable manual smoke evidence for SAV-40 / SAV-11 when a full Xcode install and simulator are available. This checklist does not validate completed product UX; it validates the current placeholder navigation scaffold only.

## Prerequisites

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
cd SavoroIOS
```

## Build and test commands

```sh
xcodebuild -list -project Savoro.xcodeproj
xcodebuild -project Savoro.xcodeproj -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 16' build
xcodebuild -project Savoro.xcodeproj -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 16' test
```

If the simulator name differs, list available destinations:

```sh
xcodebuild -project Savoro.xcodeproj -scheme Savoro -showdestinations
```

## Manual simulator smoke steps

1. Launch the Savoro app.
2. Verify the bottom tab bar shows exactly five tabs, in order: Today, Cookbook, Discover, Community, Profile.
3. Tap each tab and verify the selected tab changes without crashing and each tab displays its placeholder root.
4. Return to previously visited tabs and verify tab switching preserves the shell without unexpected sheet/toast presentation.
5. Confirm no real backend, persistence, logging, recipe detail, editor, share, publish, or SAV-13 screen flow is presented from the placeholders.
6. If future temporary debug entry points are added for route/sheet smoke, verify:
   - routes are scoped to the tab where they were pushed,
   - switching tabs does not leak another tab's navigation path,
   - sheet route titles/subtitles match the placeholder route metadata,
   - toast host appears at the top and dismisses without blocking tab bar navigation.

## Evidence to attach to SAV-11 parent

- Full command output from `xcodebuild ... build` and `xcodebuild ... test`.
- Notes for each manual step above: pass/fail, simulator/device, iOS runtime, Xcode version.
- Screenshots are optional only after simulator access is restored; code/test/checklist evidence is sufficient while local Xcode is blocked.
