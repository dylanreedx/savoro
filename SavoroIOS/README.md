# Savoro iOS

Fresh native SwiftUI scaffold for the Savoro MVP.

## Structure

- `Savoro/App` — SwiftUI app entrypoint, root placeholder, app environment.
- `Savoro/Core` — API request/endpoint abstractions, `APIClient`, URLSession JSON client skeleton, mock client, fixture loading utilities.
- `Savoro/DesignSystem` — initial native design token placeholder.
- `Savoro/Features` — future feature folders: Today, Cookbook, RecipeDetail, RecipeEditor, Discover, Community, Profile, Logging.
- `Savoro/Resources` — app resources and asset catalog placeholder.
- `SavoroTests` — XCTest scaffold target.

## Xcode project

`Savoro.xcodeproj` defines a native iOS app target (`Savoro`) and unit test target (`SavoroTests`) wired to the SwiftUI scaffold sources and asset catalog.

- Minimum deployment target: **iOS 17.0**. The scaffold keeps `Observation` / `@Observable`, which requires iOS 17+.
- Bundle identifier: `com.savoro.Savoro` placeholder, to be replaced with the team-approved identifier.
- App icon asset catalog is scaffold-only and does not include final icon artwork.
- `AppEnvironment.live(baseURL:authTokenProvider:)` wires `URLSessionAPIClient` with an injected async bearer-token provider. No secrets or tokens are hardcoded.

Expected validation commands on a machine with full Xcode selected:

```bash
xcodebuild -list -project SavoroIOS/Savoro.xcodeproj
xcodebuild -project SavoroIOS/Savoro.xcodeproj -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 15' build test
```

This scaffold intentionally does not reuse Expo, React Native, or prototype runtime code.
