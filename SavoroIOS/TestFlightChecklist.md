# Savoro TestFlight morning checklist

## 1. Sign in and select the signing team

1. Open `SavoroIOS/Savoro.xcodeproj` in Xcode.
2. Open **Xcode > Settings > Accounts**.
3. Add or select the Apple ID that belongs to the Savoro Apple Developer team, then confirm its certificates/team details load.
4. Select the **Savoro** project in the navigator, then **Targets > Savoro > Signing & Capabilities**.
5. Turn on **Automatically manage signing** and choose the correct **Team**.
6. Confirm the bundle identifier remains exactly `com.savoro.Savoro` and Xcode reports no signing errors.

## 2. Create the App Store Connect app record

1. Go to [App Store Connect](https://appstoreconnect.apple.com/) and open **My Apps**.
2. Click **+ > New App**.
3. Use:
   - Platform: **iOS**
   - Name: **Savoro** (or the approved available App Store name)
   - Primary language: the intended launch language
   - Bundle ID: **`com.savoro.Savoro`**
   - SKU: a stable private value such as **`savoro-ios`**
4. Create the record. If `com.savoro.Savoro` is not offered, register it under the Apple Developer account's **Certificates, Identifiers & Profiles > Identifiers**, or let Xcode automatic signing register it, then refresh App Store Connect.
5. Resolve any App Store Connect agreements, tax, banking, or account-role prompts that block uploads.

## 3. Make the signed Release archive

1. Back in Xcode, select the **Savoro** scheme and **Any iOS Device (arm64)** as the run destination.
2. Under **Targets > Savoro > General**, confirm:
   - Version: **`0.1.0`**
   - Build: **`1`**
3. Choose **Product > Archive**.
4. Wait for Organizer to open and select the newest Savoro archive.
5. Click **Validate App** if Xcode offers it and resolve any signing or App Store Connect account errors.

## 4. Upload and enable TestFlight Internal Testing

1. In Organizer, select the signed archive and click **Distribute App**.
2. Choose **App Store Connect** and then **Upload** (newer Xcode versions may label this path **TestFlight & App Store**).
3. Keep automatic signing/symbol upload enabled unless the developer account requires a different policy, review the summary, and click **Upload**.
4. In App Store Connect, open **My Apps > Savoro > TestFlight** and wait for build **0.1.0 (1)** to finish processing.
5. If export-compliance questions appear, confirm that the app does not use non-exempt encryption; `ITSAppUsesNonExemptEncryption` is configured as `NO`.
6. Under **Internal Testing**, create or select an internal group (for example, **Savoro Internal**) and add build **0.1.0 (1)** to it.
7. If Dylan is not already an App Store Connect user, add his Apple ID under **Users and Access** with access to Savoro.
8. In the internal group, click **Add Testers**, select Dylan, and send the invitation.
9. On Dylan's iPhone, install/open Apple's **TestFlight** app, accept the invitation, install Savoro, and launch the build.

## Configured tonight

- Added the final brand icon to `AppIcon.appiconset` using one modern universal iOS `1024x1024` entry. The catalog copy is RGB with no alpha channel and matches the supplied artwork pixel-for-pixel.
- Confirmed the Release asset build emits Savoro app-icon renditions and declares `AppIcon` as the primary icon.
- Set app version/build to **0.1.0 (1)** in the plist and target settings.
- Kept bundle identifier **`com.savoro.Savoro`**.
- Set `ITSAppUsesNonExemptEncryption` to `NO`.
- Added supported iPhone/iPad orientations so archive validation does not emit the iPad multitasking-orientation warning.
- Made the app entry point explicitly use the local mock client. No conditional Debug-only app source paths are present, and Release compiles against local fixtures/in-memory stores.
- Replaced developer-facing Community, Discover, and Profile tab language with honest coming-soon product copy and added regression coverage for denied terms.
- Required simulator tests passed: **204 tests, 0 failures**.
- Required unsigned Release archive succeeded at `/tmp/savoro-l36.xcarchive`.

## Caveats

- The project intentionally has no development team selected in source control. Dylan must select the correct team before making the upload archive.
- Tonight's `/tmp/savoro-l36.xcarchive` was built with code signing disabled to prove Release compilation; it cannot be uploaded. Create a fresh signed archive in Xcode using the steps above.
- This TestFlight build is deliberately self-contained and local-only. Data resets with app/session state where implemented; no production service or durable account sync is included.
- No signed App Store Connect validation, upload, TestFlight processing, or physical-device visual pass was performed tonight.
- Release compilation still reports one pre-existing non-blocking Swift warning in `Savoro/App/RootPlaceholderView.swift:172` for an unused dictionary-default expression. Xcode also notes that App Intents metadata extraction is skipped because the app has no App Intents dependency.
- Increment the build number before every later upload if build `1` has already been uploaded.
