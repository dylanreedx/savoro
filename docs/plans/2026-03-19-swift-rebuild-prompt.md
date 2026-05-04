# Savoro iOS — Native Swift Rebuild Prompt

> Drop this into a fresh Claude Code session. It contains everything needed to build the app from scratch.

---

## 1. What is Savoro

Savoro is a **chat-first AI food tracking app** where your recipes ARE your food log. You talk to an AI agent that understands food, matches what you ate against branded databases (Open Food Facts, USDA) and your personal cookbook, then logs it with rich interactive cards rendered inline in the conversation. The app should feel like a beautiful kitchen notebook that happens to be intelligent.

**Core principles:**
- Chat is the primary input. The AI agent IS the UX.
- Instant daily macro visibility — you must see your day at a glance without opening a conversation.
- Recipes = food log. Logging a meal IS opening a recipe. Your recipe collection grows from how you actually eat.
- Social that isn't social media — shared "Kitchens" for couples/roommates/families, recipe sharing with provenance, no posts/feeds/likes/comments.
- Native Swift — real SwiftUI materials, native spring animations, 120fps. The glass/animation quality demands it.

---

## 2. Tech Stack

### iOS Client (what we're building)
- **Swift 6** / **SwiftUI** — iOS 17+ minimum, iOS 18+ for MeshGradient
- **Architecture:** MVVM with `@Observable` macro (Observation framework, NOT Combine ObservableObject)
- **Networking:** async/await with URLSession — no Alamofire, no third-party HTTP libs
- **Local persistence:** SwiftData for offline cache of food/recipes/logs
- **Secure storage:** Keychain via Security framework for auth tokens
- **Animations:** SwiftUI native springs, `PhaseAnimator`, `TimelineView`, `MeshGradient`
- **Barcode scanning:** AVFoundation `AVCaptureSession` + `AVCaptureMetadataOutput`
- **Haptics:** `UIImpactFeedbackGenerator`, `UINotificationFeedbackGenerator`, `UISelectionFeedbackGenerator`
- **Charts:** Swift Charts framework
- **Camera:** AVFoundation (for barcode)
- **Testing:** Swift Testing framework (`@Test`, `#expect`) for unit tests, XCTest for UI tests
- **Package management:** Swift Package Manager only
- **NO third-party dependencies unless absolutely necessary** — stay lean and native
- **Fonts:** Plus Jakarta Sans (bundle .ttf files, register in Info.plist)

### Existing Backend (already built — we consume this API)
- **API:** Hono on Fly.io at `api.savoro.app` (Node runtime)
- **Database:** Drizzle ORM + Turso (LibSQL/SQLite dialect)
- **Blob storage:** Tigris on Fly.io (S3-compatible) at `cdn.savoro.app`
- **AI:** Vercel AI SDK with Claude (Haiku for routine food parsing, Sonnet for complex queries)
- **Food data:** Open Food Facts (primary, barcode lookup) + USDA FoodData Central (secondary, lab-verified generics)

The API code lives at `/Users/dylan/Documents/personal/savoro/apps/api/src/`. The database schema lives at `/Users/dylan/Documents/personal/savoro/packages/db/src/schema.ts`. Read these files to understand the exact API contract.

---

## 3. API Endpoints (existing — the Swift app consumes these)

### Auth
```
POST /auth/register        { email, username, password } → { token, user }
POST /auth/login           { email, password } → { token, user }
POST /auth/apple           { identityToken, authorizationCode, fullName? } → { token, user }
POST /auth/logout          (authenticated) → { success }
```
All authenticated requests: `Authorization: Bearer {token}` header.
Tokens stored in iOS Keychain. Sessions last 30 days, auto-extend within 15 days of expiry.

### Chat / AI Agent
```
GET  /chat/messages?date=YYYY-MM-DD    → { messages: ChatMessage[] }
POST /chat/message         { content, attachments? } → SSE stream OR JSON (smart-routed)
```

The chat endpoint has two response modes:
1. **SSE streaming** (when LLM is invoked): Server-Sent Events stream with `event: text-delta`, `event: tool-calls`, `event: ui-components`, `event: done`
2. **JSON response** (when smart-routed): Direct JSON with `{ messages, uiComponents }` — bypasses LLM for simple food descriptions

**Smart routing rules** (handled server-side, but client must handle both response types):
- Messages ≤5 words, no question marks, no quantities with units → direct food search (JSON response)
- `/recent` → returns QuickLogChips component (JSON)
- `/summary` → returns MacroSummary component (JSON)
- Everything else → LLM with tool calling (SSE stream)

### Food
```
GET  /food/search?q={query}&limit=5    → { foods: Food[] }
GET  /food/barcode/{code}              → { food, serving } | 404
GET  /food/{id}/servings               → { servings: Serving[] }
```
Food search uses local-first proxy pattern: check Turso DB first → fallback to Open Food Facts API → cache result → return.

### Logging
```
GET    /log?date=YYYY-MM-DD            → { totals: { calories, protein, carb, fat }, goals: { ... } }
GET    /log/entries?date=YYYY-MM-DD    → { entries: FoodLogEntry[] }
POST   /log                            { foodId, servingId, quantity, meal } → { entry }
POST   /log/recipe                     { recipeId, quantity, meal } → { entry }
DELETE /log/{id}                        → { success }
```

### Goals
```
GET  /goal/current                     → { goal } | null
POST /goal                             { calories, protein, carb, fat, fiber? } → { goal }
```
Goals are versioned — creating a new goal sets `endDate` on the previous one.

### Favorites
```
GET    /favorites                      → { favorites: Favorite[] }
POST   /favorites                      { foodId } | { recipeId } → { favorite }
DELETE /favorites/{id}                  → { success }
```

### Recipes
```
GET    /recipe                         → { recipes: Recipe[] } (user's recipes)
GET    /recipe/{id}                    → { recipe, ingredients }
POST   /recipe                         { title, slug, description?, instructions?, servings, prepTime?, cookTime?, isPublic?, tags?, ingredients[] } → { recipe }
PUT    /recipe/{id}                    { ...updates } → { recipe }
DELETE /recipe/{id}                    → { success }
POST   /recipe/{id}/fork              → { forkedRecipe }
GET    /recipe/feed?cursor=&limit=&sort=&tags= → { recipes, nextCursor } (public discovery feed)
GET    /recipe/similar/{id}            → { recipes } (by ingredient overlap)
GET    /profile/{username}             → { user, recipes } (public profile)
GET    /profile/{username}/{slug}      → { recipe, ingredients, author } (public recipe page)
```

---

## 4. Database Schema (Swift models must mirror these)

All IDs are `text` (cuid2 format). All timestamps are ISO 8601 strings.

### Existing tables (in Turso, defined in Drizzle):

```swift
// User
struct User {
    let id: String              // cuid2
    let email: String
    let username: String
    let displayName: String?
    let bio: String?
    let avatarUrl: String?
    let isPublic: Bool
    let createdAt: String
}

// Session (server-side, not stored on client)

// UserGoal
struct UserGoal {
    let id: String
    let userId: String
    let calories: Int?
    let protein: Int?
    let carb: Int?
    let fat: Int?
    let fiber: Int?
    let startDate: String       // YYYY-MM-DD
    let endDate: String?        // null = current goal
}

// Food
struct Food {
    let id: String
    let name: String
    let brandName: String?
    let barcode: String?
    let source: String          // "off" | "usda" | "user" | "recipe"
    let sourceId: String?
    let isVerified: Bool
}

// Serving
struct Serving {
    let id: String
    let foodId: String
    let description: String     // "1 cup", "100g", "1 medium"
    let amountGrams: Double?
    let isDefault: Bool
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?
    // Extended nutrients (all optional):
    let saturatedFat: Double?
    let transFat: Double?
    let polyunsaturatedFat: Double?
    let monounsaturatedFat: Double?
    let cholesterol: Double?
    let sodium: Double?
    let potassium: Double?
    let fiber: Double?
    let sugar: Double?
    let addedSugars: Double?
    let vitaminD: Double?
    let vitaminA: Double?
    let vitaminC: Double?
    let calcium: Double?
    let iron: Double?
}

// FoodLog
struct FoodLog {
    let id: String
    let userId: String
    let foodId: String
    let servingId: String
    let quantity: Double        // default 1
    let meal: String            // "breakfast" | "lunch" | "dinner" | "snack"
    let date: String            // YYYY-MM-DD
    let chatMessageId: String?
    let createdAt: String
}

// Recipe
struct Recipe {
    let id: String
    let userId: String
    let slug: String
    let title: String
    let description: String?
    let instructions: String?   // markdown
    let servings: Int
    let prepTime: Int?          // minutes
    let cookTime: Int?
    let imageUrl: String?
    let isPublic: Bool
    let tags: [String]
    let caloriesPerServing: Double?
    let proteinPerServing: Double?
    let carbPerServing: Double?
    let fatPerServing: Double?
    let forkCount: Int
}

// RecipeIngredient
struct RecipeIngredient {
    let id: String
    let recipeId: String
    let foodId: String?         // nullable for free-text ingredients
    let servingId: String?
    let quantity: Double?
    let unit: String?
    let label: String           // display text
    let sortOrder: Int
}

// RecipeFork
struct RecipeFork {
    let id: String
    let originalRecipeId: String
    let forkedRecipeId: String
}

// ChatMessage
struct ChatMessage {
    let id: String
    let userId: String
    let role: String            // "user" | "assistant" | "system" | "tool"
    let content: String?
    let toolCalls: [ToolCall]?  // JSON decoded
    let uiComponents: [UIComponent]?  // JSON decoded — these render as gen-UI
    let attachments: [Attachment]?
    let date: String            // YYYY-MM-DD
    let error: String?          // client-side only, for error display
    let createdAt: String
}

// Favorite
struct Favorite {
    let id: String
    let userId: String
    let foodId: String?
    let recipeId: String?
    let useCount: Int
    let lastUsedAt: String?
}
```

### NEW tables to add (social/kitchens — extend the Drizzle schema in `packages/db/src/schema.ts`):

```sql
-- Kitchens (groups for couples, roommates, families, friend groups)
kitchen: id(text/cuid2), name(text), avatarUrl(text?), createdBy(text->user.id), timestamps
kitchenMember: id(text/cuid2), kitchenId(text->kitchen.id CASCADE), userId(text->user.id CASCADE), role(text enum: owner|admin|member), joinedAt(text)
kitchenInvite: id(text/cuid2), kitchenId(text->kitchen.id CASCADE), invitedBy(text->user.id), inviteeEmail(text), code(text UNIQUE), status(text enum: pending|accepted|expired), timestamps

-- Shared meal planning
mealPlan: id(text/cuid2), kitchenId(text->kitchen.id CASCADE), date(text YYYY-MM-DD), meal(text enum: breakfast|lunch|dinner|snack), recipeId(text->recipe.id), assignedBy(text->user.id), note(text?), timestamps

-- Grocery lists
groceryList: id(text/cuid2), kitchenId(text->kitchen.id CASCADE), name(text), isArchived(boolean default false), timestamps
groceryItem: id(text/cuid2), listId(text->groceryList.id CASCADE), name(text), quantity(real?), unit(text?), category(text enum: produce|protein|dairy|pantry|frozen|other), isChecked(boolean default false), checkedBy(text?->user.id), addedBy(text->user.id), recipeId(text?->recipe.id), timestamps

-- Social graph
follow: id(text/cuid2), followerId(text->user.id CASCADE), followingId(text->user.id CASCADE), timestamps
  UNIQUE(followerId, followingId)

-- Recipe sharing
recipeShare: id(text/cuid2), userId(text->user.id CASCADE), recipeId(text->recipe.id CASCADE), kitchenId(text?->kitchen.id), note(text?), timestamps

-- Kitchen activity feed
kitchenActivity: id(text/cuid2), kitchenId(text->kitchen.id CASCADE), userId(text->user.id CASCADE), type(text enum: recipe_added|meal_planned|grocery_checked|member_joined), referenceId(text?), referenceType(text?), description(text?), timestamps
```

---

## 5. Gen-UI Component System (rendered inline in chat)

The AI agent responds with `uiComponents` JSON that the Swift app renders as interactive cards inline in the chat conversation. Each component type maps to a SwiftUI view.

### Component types and their props:

```swift
enum UIComponentType: String, Codable {
    case food_card
    case macro_summary
    case confirm_button
    case food_list
    case quick_log_chips
    case daily_snapshot
    case recipe_card
}

// food_card — single food match with serving picker, macros, log button
struct FoodCardProps: Codable {
    let foodId: String
    let name: String
    let brandName: String?
    let servingId: String
    let servingDescription: String?
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?
    let quantity: Double?
}

// macro_summary — daily progress ring/aura
struct MacroSummaryProps: Codable {
    let calories: Double
    let protein: Double
    let carb: Double
    let fat: Double
    let goals: MacroGoals?
}

// food_list — multiple food search results to pick from
struct FoodListProps: Codable {
    let foods: [FoodListItem]
}

// quick_log_chips — tappable pills for favorite/recent foods
struct QuickLogChipsProps: Codable {
    let foods: [QuickLogFood]
}

// confirm_button — action button to finalize a log
struct ConfirmButtonProps: Codable {
    let action: String      // "log_food"
    let foodId: String
    let servingId: String
    let quantity: Double
    let meal: String
    let label: String
}

// recipe_card — recipe with per-serving macros
// daily_snapshot — glanceable day summary (empty state)
```

### Verification Card Patterns (NEW — design these as food_card variants):

The previous RN app had a simple food_card. The redesign adds three verification patterns:

1. **Branded match:** "Chick-fil-A Chicken Sandwich" with source tag "Chick-fil-A menu data", macro line, portion selector, "Log This" / "Not Right" buttons
2. **Cookbook match:** "Chicken Shawarma Bowl" with source tag "Your Cookbook" in rose, "Cooked 13x" counter, "Cook & Log" / "Edit First" buttons
3. **Disambiguation:** Multiple selectable rows when the match is ambiguous — "Your Chicken Shawarma Bowl (Cookbook) · 620 cal", "Generic Chicken Rice Bowl (Estimated) · 540 cal", "Chipotle Chicken Bowl (Restaurant) · 710 cal"

These should be evolved versions of the existing food_card and food_list components, with source tags and dual action buttons.

---

## 6. Design Language

Reference screenshots at `/Users/dylan/Documents/personal/savoro/docs/stitch-v2/screenshots/` (01-today.png through 05-profile.png).

### Color Palette
```swift
// Canvas
static let canvas = Color(hex: "#FAFAF9")        // warm off-white, never pure white

// Glass surfaces
static let glassBg = Color.white.opacity(0.65)
static let glassBgSubtle = Color.white.opacity(0.45)
static let glassBorder = Color.white.opacity(0.35)
static let glassBorderSubtle = Color(hex: "#E7E5E0").opacity(0.4)

// Accent
static let rose = Color(hex: "#FB7185")           // used sparingly, meaningfully

// Text
static let textPrimary = Color(hex: "#1C1917")    // stone-warm, never blue-gray
static let textSecondary = Color(hex: "#78716C")

// Stone scale (warm neutrals)
static let stone50 = Color(hex: "#FAFAF9")
static let stone100 = Color(hex: "#F5F3F0")
static let stone200 = Color(hex: "#E7E5E0")
static let stone300 = Color(hex: "#D6D3CD")
static let stone400 = Color(hex: "#A8A29E")
static let stone500 = Color(hex: "#78716C")
static let stone600 = Color(hex: "#57534E")
static let stone700 = Color(hex: "#44403C")
static let stone800 = Color(hex: "#292524")
static let stone900 = Color(hex: "#1C1917")

// Macro colors (used EVERYWHERE consistently — these ARE the brand)
static let macroProtein = Color(hex: "#F87171")   // coral-red
static let macroCarbs = Color(hex: "#A78BFA")     // lavender
static let macroFat = Color(hex: "#FBBF24")       // warm gold
static let macroCalories = Color(hex: "#FB7185")  // rose (same as accent)
```

**IMPORTANT:** The macro colors have changed from the old RN app. The old app used `#93C5FD` (blue) for protein, `#FDE68A` (amber) for carbs, `#C4B5FD` (violet) for fat. The new palette is:
- Protein: `#F87171` coral-red
- Carbs: `#A78BFA` lavender
- Fat: `#FBBF24` warm gold

These were chosen because they blend into beautiful gradients for the Aura: coral+lavender = rose, lavender+gold = sunset, coral+gold = fire. No muddy transitions.

### Typography
Plus Jakarta Sans (bundle all weights: Regular, Medium, SemiBold, Bold, ExtraBold).
- Display: 32pt bold, letter-spacing -0.02em
- Headline: 20pt bold
- Body: 16pt medium, line height 1.6
- Caption: 13pt medium
- Micro: 10-11pt medium (labels, counters)

### Surfaces
Every elevated card uses `.ultraThinMaterial` with:
- 20pt corner radius (standard), 28pt (hero cards)
- Hairline white border at 30% opacity (the only border allowed)
- Ambient shadow: stone-900 at 4% opacity, 30pt blur — no hard drop shadows
- No solid 1px borders for sectioning — use background tonal shifts instead

### Animation
- Spring-based everything: `response: 0.35, dampingFraction: 0.8`
- Card entry: `scale(0.97) → scale(1.0)` + opacity fade, staggered 50ms apart
- Tap feedback: micro-bounce `scale(0.98)` with haptic
- Shared geometry transitions via `.matchedGeometryEffect` where possible
- Pull gestures: rubber-band physics
- Nothing instant. Nothing over 300ms. Everything has momentum.

### Haptics
- Light tap: selections, chip taps
- Medium impact: confirmations, logging food
- Success notification: barcode scanned, food logged
- Selection changed: serving picker, filter toggles

---

## 7. Key UI Components

### The Gradient Aura (Savoro's signature visual)

A living, breathing visualization of daily macro balance. This is the most important visual element in the app.

**Implementation:** `MeshGradient` (iOS 18+) with animated control points, or fallback `AngularGradient` + blur for iOS 17.

Three macro colors at fixed spatial positions:
- Protein coral-red `#F87171` — top region
- Carbs lavender `#A78BFA` — bottom-left region
- Fat warm gold `#FBBF24` — bottom-right region

**The aura lives and evolves throughout the day:**
- Early morning (nothing logged): faint, ghostly, nearly transparent. Dormant.
- After breakfast: soft color pools in. The dominant macro's region glows warmer.
- Midday: alive and rich. Colors are saturated, blend is shifting.
- Evening (well-fed day): vibrant and full. Balanced = harmonious blend. Unbalanced = one color dominates.
- Constant slow breathing pulse via `TimelineView` — gentle scale animation (0.98→1.02) on a 4-second cycle.

**Sizes:**
- XL (80pt): hero on Today screen
- MD (40pt): compact header in Chat
- SM (24pt): kitchen member status, inline indicators

### The Daily Card

Glass card combining Aura + nutritional data. The universal dashboard component.

**Hero variant** (Today screen):
- Left: XL Aura orb (80pt)
- Right: "1,550 / 2,200" calorie headline (bold 20pt), three macro rows each with colored dot (8pt) + name + grams + thin fill bar (4pt tall, rounded) in the macro's color

**Compact variant** (Chat header):
- Left: MD Aura (40pt)
- Right: "1,550 / 2,200 kcal" single line
- 48pt tall total, tappable to expand

### Floating Action Bar (FAB)

Glass pill pinned above tab bar, always visible, always at thumb reach. This is how you log food from ANY tab.
- Text input with contextual ghost text ("What did you eat?", "Overnight oats again?")
- Barcode scanner icon button (right side)
- Rose microphone button (far right)
- 28pt corner radius, `.regularMaterial`, stronger ambient shadow

### Consistency Grid

GitHub-contributions-style heatmap on the Profile screen.
- 7 rows (days of week) × ~16 columns (weeks of history)
- Small rounded squares (12pt, 3pt gaps, 3pt corner radius)
- Rose-tinted by logging intensity: empty → 15% → 40% → solid `#FB7185`
- Today marked with hairline outline
- Below: "68 of 90 days" in muted text
- Labels: only M, W, F on left side

### Macro Line

Compact inline macro display: `P 42g · C 58g · F 18g` where each value uses its macro color. Used inside recipe cards, timeline entries, verification cards.

### Recipe Card

Typographic glass card for masonry grids:
- Recipe name (bold 17pt)
- Macro Line
- "Cooked 12x" counter (muted)
- Optional provenance "From Sarah" (rose)
- NO food photos by default
- 20pt corners, glass surface

---

## 8. App Structure

### Tab Bar — 4 tabs
```
Today (house.fill)  |  Chat (bubble.left.fill)  |  Cookbook (book.fill)  |  Discover (safari.fill)
```
Active: rose `#FB7185`. Inactive: stone-400 `#A8A29E`.

### Tab 1: Today (Home)
- Time-aware greeting: "Good morning, Dylan" (32pt bold) + date (14pt muted)
- Avatar button top-right → opens Profile sheet
- **Daily Card (Hero)** — XL Aura + calorie headline + 3 macro rows with fill bars
- **Meal Timeline** — "Today's Log" section. Vertical list of glass cards:
  - Time label left edge ("8:20a")
  - Meal name bold center
  - Macro Line small below
  - Calorie count right edge
  - "Cookbook" tag if from a recipe
- **FAB** at bottom
- Pull-to-refresh

### Tab 2: Chat (AI Agent)
- **Daily Card (Compact)** pinned header, tappable to expand
- **Chat thread** — ScrollView, newest at bottom
  - User messages: right-aligned, rose background, white text, rounded bubble (bottom-right: 6pt)
  - AI messages: left-aligned, glass background, stone text, rounded bubble (bottom-left: 6pt)
  - Gen-UI components rendered inline below AI text via ComponentMap
- **Verification cards** inline (branded match, cookbook match, disambiguation)
- **FAB** at bottom (same as Today, but ghost text "Ask Savoro anything...")
- On first visit (empty): DailySnapshot card with greeting, mini macro rings, quick-log chips

### Tab 3: Cookbook
- Glass search bar ("Search your recipes...")
- "Cookbook" heading (32pt bold)
- Masonry grid (2 columns) of Recipe Cards — typographic, no photos
- "Discover" section at bottom with horizontal scroll, gradient-border cards
- FAB at bottom

### Tab 4: Discover
- **"Your Kitchens"** — horizontal scroll of glass cards (kitchen name, member avatars, SM aura)
- **"From Your People"** — vertical feed of recipe share cards (avatar + name + time, recipe name, Macro Line, provenance chain). NO likes. NO comments. NO engagement.
- **"Trending"** — horizontal scroll of popular recipes with "Saved by 2.4k" quiet social proof
- FAB at bottom

### Profile (sheet overlay from avatar button)
- Close (X) top-left, "Profile" center
- Avatar (64pt), name, "Member since 2024"
- **Daily Targets** — 2×2 grid of editable fields (Calories neutral, Protein coral, Carbs lavender, Fat gold)
- **Consistency Grid** — full width, 16 weeks of rose heatmap
- **Weekly Trends** — three sparkline charts (one per macro in its color)
- Notifications / Account / Settings rows

---

## 9. File Structure

```
Savoro/
├── SavoroApp.swift                    # App entry, font registration, scene
├── Info.plist                         # Font declarations, camera usage
├── Models/
│   ├── User.swift                     # User, UserGoal
│   ├── Food.swift                     # Food, Serving
│   ├── FoodLog.swift                  # FoodLog, DailyTotals
│   ├── Recipe.swift                   # Recipe, RecipeIngredient, RecipeFork
│   ├── Chat.swift                     # ChatMessage, UIComponent, all component prop types
│   ├── Kitchen.swift                  # Kitchen, KitchenMember, KitchenInvite
│   ├── Social.swift                   # Follow, RecipeShare, KitchenActivity
│   ├── Grocery.swift                  # GroceryList, GroceryItem
│   └── MealPlan.swift                 # MealPlan
├── Services/
│   ├── APIClient.swift                # Base HTTP client, auth headers, error handling
│   ├── AuthService.swift              # Login, register, Apple Sign-In, Keychain
│   ├── ChatService.swift              # SSE streaming, smart-route JSON parsing
│   ├── FoodService.swift              # Search, barcode lookup, servings
│   ├── LogService.swift               # CRUD food logs, daily totals
│   ├── GoalService.swift              # Get/set goals
│   ├── RecipeService.swift            # CRUD recipes, fork, feed, search
│   ├── FavoriteService.swift          # CRUD favorites
│   ├── KitchenService.swift           # CRUD kitchens, members, invites
│   ├── SocialService.swift            # Follow/unfollow, recipe shares
│   ├── GroceryService.swift           # CRUD grocery lists/items
│   └── KeychainHelper.swift           # Keychain read/write/delete
├── ViewModels/
│   ├── TodayViewModel.swift           # Daily card data, timeline, macros
│   ├── ChatViewModel.swift            # Messages, SSE handling, send/retry
│   ├── CookbookViewModel.swift        # User recipes, search, masonry
│   ├── DiscoverViewModel.swift        # Kitchens, people feed, trending
│   ├── ProfileViewModel.swift         # Goals, consistency data, trends
│   ├── AuthViewModel.swift            # Login/register state
│   └── KitchenDetailViewModel.swift   # Meal plans, grocery, shared cookbook
├── Views/
│   ├── ContentView.swift              # Root: auth gate + tab view
│   ├── Today/
│   │   ├── TodayView.swift
│   │   ├── DailyCardView.swift        # Hero variant
│   │   └── MealTimelineView.swift
│   ├── Chat/
│   │   ├── ChatView.swift
│   │   ├── ChatBubbleView.swift
│   │   ├── GenerativeUIRenderer.swift # ComponentMap dispatch
│   │   ├── FoodCardView.swift         # Verification card with source tag + dual buttons
│   │   ├── FoodListView.swift         # Disambiguation card
│   │   ├── MacroSummaryView.swift
│   │   ├── QuickLogChipsView.swift
│   │   ├── RecipeCardChatView.swift
│   │   └── BarcodeScannerView.swift   # AVFoundation camera
│   ├── Cookbook/
│   │   ├── CookbookView.swift
│   │   ├── RecipeCardView.swift       # Typographic masonry card
│   │   ├── RecipeDetailView.swift
│   │   └── RecipeEditorView.swift
│   ├── Discover/
│   │   ├── DiscoverView.swift
│   │   ├── KitchenCardView.swift
│   │   ├── RecipeShareCardView.swift
│   │   └── KitchenDetailView.swift    # Full kitchen: meal plans, groceries, shared cookbook
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   ├── ConsistencyGridView.swift
│   │   ├── GoalEditorView.swift
│   │   └── WeeklyTrendsView.swift
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── RegisterView.swift
│   └── Components/
│       ├── GradientAuraView.swift     # MeshGradient + TimelineView animation
│       ├── MacroLineView.swift        # Compact inline P·C·F display
│       ├── FloatingActionBar.swift    # Glass pill with input + barcode + mic
│       ├── GlassCard.swift            # Reusable glass surface modifier
│       ├── ThinkingIndicator.swift    # Animated dots while AI processes
│       └── SkeletonView.swift         # Loading placeholders
├── Utilities/
│   ├── Color+Hex.swift                # Color(hex:) extension
│   ├── Date+Helpers.swift             # Formatting, relative dates
│   ├── HapticManager.swift            # Centralized haptic triggers
│   └── Constants.swift                # API base URL, animation presets
├── Resources/
│   ├── Fonts/                         # PlusJakartaSans-{Regular,Medium,SemiBold,Bold,ExtraBold}.ttf
│   ├── Assets.xcassets/               # App icon, colors
│   └── Preview Content/
└── Tests/
    ├── SavoroTests/
    │   ├── APIClientTests.swift
    │   ├── ChatViewModelTests.swift
    │   ├── SmartRouterTests.swift
    │   └── ModelDecodingTests.swift
    └── SavoroUITests/
        ├── TodayViewTests.swift
        └── ChatFlowTests.swift
```

---

## 10. Implementation Phases

### Phase 1 — Core (this build)
1. Xcode project setup, Plus Jakarta Sans fonts, color/design tokens
2. Auth (login, register, Keychain token storage, auth gate)
3. API client (base HTTP, auth headers, error types, SSE parser)
4. Today screen (Daily Card with Aura, meal timeline, pull-to-refresh)
5. Chat screen (messages, SSE streaming, gen-UI rendering, verification cards)
6. Barcode scanner (AVFoundation, camera permissions)
7. Food logging (text input, barcode, favorites/quick-log, recipe logging)
8. Cookbook (list recipes, masonry grid, recipe detail, create/edit)
9. Profile (goals editor, consistency grid, weekly sparklines)
10. Offline queue (cache log entries when offline, sync on reconnect)
11. The Gradient Aura (MeshGradient animation, breathing, macro-reactive)
12. Floating Action Bar (universal input component)

### Phase 2 — Social (later)
1. Kitchens (create, invite, manage members)
2. Kitchen detail (meal planning, shared grocery list, shared cookbook)
3. Discover feed (follow users, recipe shares, trending)
4. Apple Sign-In
5. Recipe sharing via deep links
6. iOS Widgets (Aura + Daily Card via WidgetKit)

---

## 11. Key Reference Files

Read these to understand the existing implementation:

```
# Database schema (THE source of truth for models)
/Users/dylan/Documents/personal/savoro/packages/db/src/schema.ts

# AI agent
/Users/dylan/Documents/personal/savoro/packages/ai/src/tools.ts          # Tool definitions
/Users/dylan/Documents/personal/savoro/packages/ai/src/system-prompt.ts   # Agent personality + context
/Users/dylan/Documents/personal/savoro/packages/ai/src/smart-router.ts    # LLM bypass logic
/Users/dylan/Documents/personal/savoro/packages/ai/src/types.ts           # UI component types

# Food data
/Users/dylan/Documents/personal/savoro/packages/food-data/src/off.ts          # Open Food Facts client
/Users/dylan/Documents/personal/savoro/packages/food-data/src/normalizer.ts   # OFF → savoro schema

# API routes (understand the contract)
/Users/dylan/Documents/personal/savoro/apps/api/src/index.ts             # Route registration
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/chat.ts       # SSE streaming + tools
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/food.ts       # Search + barcode
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/log.ts        # CRUD logs
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/recipe.ts     # CRUD recipes + feed
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/auth.ts       # Register/login/Apple
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/goal.ts       # Goal versioning
/Users/dylan/Documents/personal/savoro/apps/api/src/routes/favorites.ts  # Favorites CRUD

# Design tokens (port to Swift)
/Users/dylan/Documents/personal/savoro/packages/ui/src/index.ts          # Colors, glass, fonts, springs

# Design references
/Users/dylan/Documents/personal/savoro/docs/stitch-v2/screenshots/       # Latest Stitch mockups
/Users/dylan/Documents/personal/savoro/docs/plans/2026-03-19-ios-redesign-handoff.md  # Full design spec

# Previous RN implementation (reference for patterns, NOT for porting)
/Users/dylan/Documents/personal/savoro/apps/mobile/                      # Expo/RN app
/Users/dylan/Documents/personal/savoro/apps/mobile/lib/stores/chat.ts    # Chat store with SSE parsing
/Users/dylan/Documents/personal/savoro/apps/mobile/components/chat/GenerativeUI.tsx  # ComponentMap

# Deep research
/Users/dylan/Documents/personal/savoro/deep-research-report-savoro.md    # Competitive analysis

# Predecessor project
/Users/dylan/Documents/personal/bite/src/lib/db/schema.ts               # Original schema
```

---

## 12. Project Management

Use **Conductor maestro mode**. Create a new project:
- Name: `savoro-ios`
- Type: `swift`
- Workspace: `/Users/dylan/Documents/personal/savoro-ios`

The 5-phase lifecycle per task: analyze → design → implement → test → review.

Save memories for reusable patterns (API client structure, SSE parsing, glass card modifier, aura animation approach). Record errors so future attempts learn from them.

---

## 13. Critical Gotchas

1. **SSE parsing:** The chat endpoint streams Server-Sent Events. Parse `event:` and `data:` lines. Handle `text-delta` (append text), `tool-calls` (JSON), `ui-components` (JSON array → render gen-UI), `done` (finalize). Also handle JSON responses for smart-routed messages (no SSE, just a direct JSON body).

2. **MeshGradient iOS 18:** `MeshGradient` is only available on iOS 18+. Provide a fallback using `AngularGradient` + blur for iOS 17. Check `if #available(iOS 18, *)`.

3. **Font registration:** Plus Jakarta Sans must be bundled as .ttf files and declared in Info.plist under `UIAppFonts`. Use `Font.custom("PlusJakartaSans-Bold", size: 32)`.

4. **Macro colors changed:** Old app used blue/amber/violet. New app uses coral/lavender/gold. Do NOT use the old colors.

5. **Barcode types:** Support EAN-13, EAN-8, UPC-A, UPC-E via `AVMetadataObject.ObjectType`.

6. **Goal versioning:** Creating a new goal doesn't delete the old one — it sets `endDate` on the previous goal. Always fetch `/goal/current` for the active goal.

7. **Food source provenance:** Every food has a `source` field: "off" (Open Food Facts), "usda" (USDA FoodData Central), "user" (user-created), "recipe" (derived from recipe). Display this as source tags in verification cards.

8. **Draft logs, not silent writes:** The agent should NEVER auto-log food. It always presents a verification card first. The user confirms before anything is logged. This is a core design principle from the deep research report.

9. **Offline queue:** When offline, food log requests should be queued locally (SwiftData or UserDefaults) and flushed when connectivity returns. Use `NWPathMonitor` for network state.

10. **Keychain, not UserDefaults:** Auth tokens go in Keychain, never UserDefaults. Use `kSecClassGenericPassword` with service identifier "app.savoro.auth".
