# Triage plan

## Summary

Savoro MVP should be built **from scratch as a native Swift/SwiftUI iOS app**, using the Claude Design MVP/prototype as the **visual source of truth**, not as implementation code. The MVP includes **friends and communities from the beginning**, but keeps social surfaces recipe-first and privacy-safe.

Primary MVP loop:

```txt
Discover recipe → inspect macros/trust/social context → save/fork/log →
Today reflects private log → Cookbook stores saved/remixed recipes →
share/publish into profile/community
```

Recommended IA: **5 tabs** to match architecture and mockup brief:

```txt
Today | Cookbook | Discover | Community | Profile
```

Note: the prototype currently has 4 tabs and nests communities under Discover. Treat this as design-prototype drift; implement dedicated Community tab for MVP unless product reverses this decision.

## Build sequence

1. **Foundation**
   - Native SwiftUI app scaffold
   - Design system tokens/components
   - App shell/navigation
   - API client/model layer
   - Auth/session/current user basics

2. **Private nutrition core**
   - Goals/logs data model
   - Today dashboard
   - Log recipe sheet
   - Log picker/search shell
   - Frozen nutrition snapshots

3. **Recipe core**
   - Recipe models/versioning
   - Cookbook
   - Recipe editor
   - Recipe detail
   - Save/log/fork actions

4. **Discovery and social recipe surfaces**
   - Discover feed/search/filters
   - Public profiles
   - Follow/friend relationship primitives
   - Friend-context recipe sections

5. **Communities**
   - Community home tab
   - Community detail/feed
   - Join/invite states
   - Share recipe to community

6. **Publish/share/polish**
   - Visibility sheets
   - Share links
   - Empty/loading/error states
   - Privacy QA
   - Visual regression/manual screenshots

## Tickets

### 1. Bootstrap native SwiftUI app scaffold

- **Type:** data-model
- **Priority:** P0
- **Dependencies:** None
- **Scope:**
  - Create clean native iOS app structure.
  - No Expo/React Native/prototype code reuse.
  - Use SwiftUI, async/await, URLSession API client, Swift Observation.
  - Add feature folders: Today, Cookbook, RecipeDetail, RecipeEditor, Discover, Community, Profile, Logging.
- **API/data contract:** None yet; stub protocol-driven API client.
- **Acceptance criteria:**
  - App launches into SwiftUI shell.
  - Feature modules/folders exist.
  - API client supports authenticated JSON requests.
  - Preview/mock data path exists for UI work.
- **QA evidence required:**
  - Simulator screenshot of app launch.
  - Short note confirming implementation is native SwiftUI.
- **False-positive risks:**
  - Accidentally porting React prototype patterns instead of native iOS navigation/state.

---

### 2. Bootstrap Savoro design system

- **Type:** design-system
- **Priority:** P0
- **Dependencies:** Ticket 1
- **Scope:**
  - Implement visual tokens from Claude Design MVP/design system:
    - warm sand surfaces
    - blush accent
    - fixed macro colors
    - glass cards
    - rounded cards/pills
    - Plus Jakarta Sans or documented fallback
    - tabular macro numerals
  - Build reusable primitives:
    - buttons
    - cards
    - chips
    - segmented control
    - search field
    - avatar/avatar cluster
    - toast
    - bottom sheet styling
    - macro bars/ring/stat blocks
    - trust badge
- **API/data contract:** None
- **Acceptance criteria:**
  - Tokens are centralized and reusable.
  - Macro colors are consistent across app:
    - calories
    - protein
    - carbs
    - fat
  - Components visually match Claude MVP direction: warm, premium, soft, non-clinical.
  - Dark mode is either supported or explicitly deferred.
- **QA evidence required:**
  - Screenshot/component preview sheet.
  - Visual comparison against prototype/design brief.
- **False-positive risks:**
  - SwiftUI materials may not match CSS glass exactly; validate visual feel, not CSS parity.

---

### 3. App shell and 5-tab navigation

- **Type:** flow
- **Priority:** P0
- **Dependencies:** Tickets 1, 2
- **Scope:**
  - Implement tabs:
    - Today
    - Cookbook
    - Discover
    - Community
    - Profile
  - Add NavigationStack per tab.
  - Add sheet host and toast host.
  - Support pushed detail screens and native back gestures.
- **API/data contract:** None
- **Acceptance criteria:**
  - 5 tabs render with stable state.
  - Detail push/pop works.
  - Bottom sheets dismiss correctly.
  - Toasts do not overlap tab bar/sheets.
- **QA evidence required:**
  - Screenshot of each tab.
  - Screen recording showing tab switching, push, sheet, toast.
- **False-positive risks:**
  - Prototype only has 4 tabs; QA should validate against MVP decision, not prototype tab count.

---

### 4. Core API models and privacy-safe domain contracts

- **Type:** data-model
- **Priority:** P0
- **Dependencies:** Ticket 1
- **Scope:**
  - Define Codable models for:
    - UserSummary
    - UserProfile
    - MacroTotals
    - NutritionGoal
    - FoodLogEntry
    - RecipeSummary
    - RecipeDetail
    - RecipeVersion
    - CommunitySummary
    - CommunityDetail
    - SearchResult
    - ViewerState
  - Encode visibility semantics:
    - recipe: private/unlisted/public
    - profile: private/public
    - community: public/private/unlisted
  - Ensure logs/goals are private-only domain concepts.
- **API/data contract:** See API contracts section.
- **Acceptance criteria:**
  - Models compile.
  - Mock JSON fixtures decode successfully.
  - Recipe logs require `recipeVersionId`.
  - Visibility states are represented explicitly.
- **QA evidence required:**
  - Unit tests for JSON decoding.
  - Unit test confirming log entry snapshot fields exist.
- **False-positive risks:**
  - Using latest recipe macros for historical log display.

---

### 5. Today dashboard

- **Type:** screen
- **Priority:** P0
- **Dependencies:** Tickets 2, 4
- **Scope:**
  - Build Today screen from Claude MVP visual source:
    - greeting/date
    - “Today so far” macro summary
    - calorie ring/progress
    - protein/carbs/fat bars
    - meal sections: Breakfast, Lunch, Dinner, Snack
    - quick actions: Log recipe, Log food/Search
    - recently logged/saved rail
    - private reassurance copy
  - Aggregate day totals from frozen log entries.
- **API/data contract:**
  - `GET /goals/current`
  - `GET /logs?date=YYYY-MM-DD`
- **Acceptance criteria:**
  - Day totals equal sum of meal entries.
  - Meal sections render entries and empty states.
  - Over-goal state uses non-shaming copy.
  - Logs/goals are not exposed in public/social screens.
- **QA evidence required:**
  - Screenshot with populated day.
  - Screenshot with empty day.
  - Unit test for macro aggregation.
  - QA note verifying neutral copy.
- **False-positive risks:**
  - Prototype local state may make logging look persistent when it is not.

---

### 6. Log recipe bottom sheet

- **Type:** flow
- **Priority:** P0
- **Dependencies:** Tickets 5, 8
- **Scope:**
  - Native bottom sheet for logging a recipe.
  - Include:
    - recipe preview
    - serving stepper/presets
    - meal picker
    - date picker
    - macro preview
    - privacy note: “Your logs stay private.”
  - On success, update Today and route/refresh appropriately.
- **API/data contract:**
  - `POST /logs` or `POST /recipes/:id/log`
- **Acceptance criteria:**
  - Creates one frozen `FoodLogEntry`.
  - Stores `recipeId` and `recipeVersionId`.
  - Meal/date/servings are respected.
  - Failure keeps sheet open with recoverable error.
- **QA evidence required:**
  - Screen recording: recipe detail → log sheet → Today update.
  - API payload/response captured in test log.
  - Test showing recipe edit does not mutate past log.
- **False-positive risks:**
  - Prototype date row is inert; production must implement real date selection.

---

### 7. Log picker/search sheet

- **Type:** flow
- **Priority:** P1
- **Dependencies:** Tickets 5, 6
- **Scope:**
  - Search/select item to log from Today.
  - Include sections:
    - Recent
    - Saved recipes
    - My recipes
    - Foods
  - Meal preset carries into log sheet.
- **API/data contract:**
  - `GET /search?q=`
  - `GET /foods/search?q=`
  - `GET /recipes/mine?q=`
- **Acceptance criteria:**
  - Empty query shows recents/saved recipes.
  - Search returns recipes and foods.
  - Selecting recipe opens Log Recipe sheet.
  - Meal preset remains selected.
- **QA evidence required:**
  - Screenshot of empty/recent state.
  - Screenshot of search results.
  - Screen recording from meal add button to successful log.
- **False-positive risks:**
  - Prototype says food search but only supports sample recipes.

---

### 8. Recipe detail screen

- **Type:** screen
- **Priority:** P0
- **Dependencies:** Tickets 2, 4
- **Scope:**
  - Build premium recipe detail:
    - hero image/gradient
    - title/tags
    - creator row
    - trust/provenance badge
    - macro summary per serving
    - serving selector
    - ingredients
    - instructions
    - friend/community context
    - sticky Save/Fork/Log bar
    - share button
  - Support owner/private/unauthorized states.
- **API/data contract:**
  - `GET /recipes/:id`
  - `POST /recipes/:id/save`
  - `DELETE /recipes/:id/save`
  - `POST /recipes/:id/fork`
  - `POST /recipes/:id/like`
- **Acceptance criteria:**
  - Displays current recipe version.
  - Trust badge derives from source/provenance.
  - Save persists and updates UI.
  - Fork opens remix flow.
  - Log opens log sheet with correct version.
  - Sticky CTA never overlaps final content.
- **QA evidence required:**
  - Screenshot of public recipe.
  - Screenshot of private/owner recipe.
  - Screen recording of Save/Fork/Log actions.
- **False-positive risks:**
  - Serving selector semantics are ambiguous in prototype; decide whether it changes display quantity or log quantity.

---

### 9. Cookbook library

- **Type:** screen
- **Priority:** P0
- **Dependencies:** Tickets 2, 4, 8
- **Scope:**
  - Build Cookbook tab:
    - segmented Mine / Saved / Drafts
    - search/filter
    - create recipe CTA
    - two-column cards
    - saved/forked/draft badges
    - empty states
- **API/data contract:**
  - `GET /recipes/mine?status=`
  - `GET /recipes/saved`
- **Acceptance criteria:**
  - Mine, Saved, Drafts are distinct datasets.
  - Drafts remain private.
  - Saved state persists after refresh.
  - Create recipe reachable from plus and CTA card.
- **QA evidence required:**
  - Screenshots for Mine/Saved/Drafts.
  - API fixture proving private drafts do not appear in public profile.
- **False-positive risks:**
  - Prototype saved state is local `Set`, not persistent.

---

### 10. Recipe editor MVP

- **Type:** screen
- **Priority:** P0
- **Dependencies:** Tickets 4, 9
- **Scope:**
  - Build editor:
    - photo placeholder/upload hook
    - title
    - description
    - servings/yield
    - ingredient rows
    - food search/custom/free-text fallback
    - quantity/unit editing
    - instructions add/remove/reorder
    - live per-serving macro preview
    - Save draft
    - Save & publish
- **API/data contract:**
  - `GET /foods/search?q=`
  - `POST /foods/custom`
  - `POST /recipes`
  - `PATCH /recipes/:id`
- **Acceptance criteria:**
  - Ingredient add/remove/quantity/servings changes recalculate macros.
  - Draft save persists in Cookbook Drafts.
  - Free-text ingredients are allowed but clearly indicate incomplete nutrition.
  - Validation prevents publishing incomplete public recipes.
- **QA evidence required:**
  - Screen recording creating draft.
  - Unit test for macro recalculation.
  - Screenshot of incomplete/free-text nutrition warning.
- **False-positive risks:**
  - Prototype uses fixed sample ingredient quantities and hides real unit complexity.

---

### 11. Publish/save visibility sheet

- **Type:** flow
- **Priority:** P1
- **Dependencies:** Tickets 9, 10
- **Scope:**
  - Implement visibility choices:
    - Keep private
    - Unlisted link
    - Publish to profile
    - Share to community
  - Privacy note: publishing shares recipe, not daily log.
  - Community option chains to community selector.
- **API/data contract:**
  - `POST /recipes/:id/publish`
  - `POST /recipes/:id/unpublish`
  - `POST /share-links`
  - `POST /communities/:id/recipes`
- **Acceptance criteria:**
  - Private recipes are not searchable/public.
  - Unlisted creates link but does not appear in Discover/profile.
  - Public appears on profile and eligible Discover.
  - Community share requires selected community and persists caption.
- **QA evidence required:**
  - Visibility matrix test.
  - Screenshots for each option.
  - API evidence that community share creates feed item.
- **False-positive risks:**
  - Prototype “share to community” publish path closes without selecting a community.

---

### 12. Fork/remix flow

- **Type:** flow
- **Priority:** P1
- **Dependencies:** Tickets 8, 9, 10
- **Scope:**
  - Fork public recipe into private editable copy.
  - Preserve attribution:
    - sourceRecipeId
    - sourceVersionId
    - original creator
  - Route to editor or forked recipe detail with clear Edit CTA.
- **API/data contract:**
  - `POST /recipes/:id/fork`
- **Acceptance criteria:**
  - Forked recipe starts private.
  - Fork appears in user Cookbook.
  - Source recipe is unchanged.
  - Attribution banner appears: “Remix from @creator.”
- **QA evidence required:**
  - Screen recording fork → private remix in Cookbook.
  - API response showing source/fork IDs.
- **False-positive risks:**
  - Prototype routes to detail, but product flow likely needs immediate edit capability.

---

### 13. Discover feed/search

- **Type:** screen
- **Priority:** P1
- **Dependencies:** Tickets 8, 12
- **Scope:**
  - Build Discover tab:
    - search bar
    - category chips
    - editorial rails default
    - featured recipe
    - popular in communities
    - high protein this week
    - from friends
    - creator spotlight
    - pagination
  - Recipe cards support Save/Fork/Log.
- **API/data contract:**
  - `GET /discover/recipes?tags=&maxCalories=&minProtein=&prepTime=&sort=&cursor=`
  - `GET /discover/communities`
  - `GET /discover/creators`
  - `GET /search?q=`
- **Acceptance criteria:**
  - Search and chips change returned data.
  - Feed never shows private logs, goals, calorie adherence, or weigh-ins.
  - Cards show title, creator/source, macros, and social context.
  - Feed position preserved after Save/Fork/Log.
- **QA evidence required:**
  - Screenshot of default rails.
  - Test proving filter query parameters are sent.
  - Privacy QA pass on feed content.
- **False-positive risks:**
  - Prototype chips/search are mostly visual.

---

### 14. Community home tab

- **Type:** screen
- **Priority:** P1
- **Dependencies:** Tickets 3, 13
- **Scope:**
  - Build dedicated Community tab:
    - joined communities
    - friend activity
    - invitations/requests
    - recipe-first community feed
  - Friend activity examples:
    - published recipe
    - saved recipe
    - forked recipe
    - joined community
  - Exclude private log activity.
- **API/data contract:**
  - `GET /communities?scope=joined`
  - `GET /friends`
  - `GET /friend-requests`
  - `GET /activity?scope=friends`
- **Acceptance criteria:**
  - Joined communities list renders.
  - Friend activity is recipe/social only.
  - No private daily logs/goals/adherence appear.
  - Community cards open detail.
- **QA evidence required:**
  - Screenshot of populated Community home.
  - Privacy QA checklist for activity feed.
- **False-positive risks:**
  - Architecture includes friends; prototype does not fully define friend request UX.

---

### 15. Community detail/feed

- **Type:** screen
- **Priority:** P1
- **Dependencies:** Tickets 11, 14
- **Scope:**
  - Build community detail:
    - header
    - member avatars/count
    - join/joined/request/pending states
    - invite action
    - pinned recipes
    - recent recipe feed
    - Save/Fork/Log actions on feed items
- **API/data contract:**
  - `GET /communities/:idOrSlug`
  - `POST /communities/:id/join`
  - `POST /communities/:id/leave`
  - `GET /communities/:id/recipes`
  - `POST /communities/:id/invites`
- **Acceptance criteria:**
  - Feed only shows recipes viewer may access.
  - Join button reflects join policy/status.
  - Invite creates/copies invite link.
  - Shared recipe opens recipe detail.
  - Save/Fork/Log work from feed.
- **QA evidence required:**
  - Screenshots for not joined/joined/pending.
  - API evidence for invite creation.
  - Privacy visibility test for private community.
- **False-positive risks:**
  - Prototype join state is local only and does not model private/request communities.

---

### 16. Share recipe sheet

- **Type:** flow
- **Priority:** P1
- **Dependencies:** Tickets 11, 15
- **Scope:**
  - Build share sheet options:
    - Share to community
    - Send to friend
    - Publish to profile
    - Copy public/unlisted link
  - Community sub-state:
    - list communities
    - caption
    - confirm
  - Private recipe warning/conversion flow.
- **API/data contract:**
  - `POST /communities/:id/recipes`
  - `POST /share-links`
  - `POST /recipes/:id/publish`
- **Acceptance criteria:**
  - Sharing private recipe requires intentional visibility change or unlisted link.
  - Community share appears in community feed.
  - Caption persists.
  - Logs are never shared.
- **QA evidence required:**
  - Screen recording share → community feed item.
  - Visibility/privacy test.
- **False-positive risks:**
  - Prototype “Send to friend” only toasts; true friend messaging may need deferral.

---

### 17. Own Profile

- **Type:** screen
- **Priority:** P1
- **Dependencies:** Tickets 4, 9, 13
- **Scope:**
  - Build own Profile tab:
    - avatar/name/handle/bio
    - public recipe count
    - collections count
    - followers/following
    - public recipes
    - collections
    - settings links
    - privacy note: logs/goals are private
  - Theme toggle may be implemented or explicitly disabled.
- **API/data contract:**
  - `GET /me`
  - `PATCH /me/profile`
  - `GET /profiles/:username/recipes`
  - `GET /profiles/:username/collections`
- **Acceptance criteria:**
  - Public recipes exclude drafts/private recipes.
  - Privacy reassurance visible.
  - Settings rows navigate or are clearly disabled.
  - Profile updates persist.
- **QA evidence required:**
  - Screenshot of own profile.
  - API fixture proving draft/private exclusion.
- **False-positive risks:**
  - Prototype own profile may display recipes regardless of visibility.

---

### 18. Public Profile and follow/friend actions

- **Type:** screen
- **Priority:** P1
- **Dependencies:** Tickets 13, 17
- **Scope:**
  - Build public profile:
    - cover/avatar
    - display name/handle/bio
    - stats
    - Follow/Add Friend button
    - public recipes grid
    - optional Message hidden/deferred unless backend exists
  - Support public/private profile states.
- **API/data contract:**
  - `GET /profiles/:username`
  - `GET /profiles/:username/recipes`
  - `POST /profiles/:username/follow`
  - `DELETE /profiles/:username/follow`
  - Optional: `POST /profiles/:username/friend-request`
- **Acceptance criteria:**
  - Public profile never shows logs/goals.
  - Follow state persists after refresh.
  - Private/unauthorized state handled.
  - Public recipes open detail.
- **QA evidence required:**
  - Screenshot of public profile.
  - Screen recording follow/unfollow persistence.
  - Privacy QA pass.
- **False-positive risks:**
  - Follow vs mutual friend model needs final product choice.

---

### 19. Loading, error, empty states pass

- **Type:** polish
- **Priority:** P2
- **Dependencies:** All screen tickets
- **Scope:**
  - Add loading/error/empty states for:
    - Today
    - Cookbook
    - Discover
    - Community
    - Profile
    - Recipe detail
    - Editor
    - Sheets
  - Use warm, non-shaming language.
- **API/data contract:** None
- **Acceptance criteria:**
  - Every async screen has loading and recoverable error UI.
  - Empty states include next action.
  - Error messages do not expose backend internals.
- **QA evidence required:**
  - Screenshot matrix of empty/error/loading states.
- **False-positive risks:**
  - Happy-path prototype lacks many of these states.

---

### 20. MVP privacy and regression QA harness

- **Type:** QA
- **Priority:** P0
- **Dependencies:** Tickets 4–18
- **Scope:**
  - Build automated/manual QA harness for:
    - log privacy
    - visibility matrix
    - recipe version snapshot
    - social feed privacy
    - macro aggregation
    - save/fork/log persistence
- **API/data contract:** Uses all MVP contracts.
- **Acceptance criteria:**
  - Tests verify private logs/goals never appear in:
    - Discover
    - Community
    - Public Profile
    - Friend activity
  - Tests verify past logs retain frozen nutrition after recipe edit.
  - Tests verify private/unlisted/public behavior.
- **QA evidence required:**
  - Test run output.
  - Manual screenshot checklist.
  - API fixtures for privacy scenarios.
- **False-positive risks:**
  - Visual privacy copy is not enough; backend authorization/visibility must be tested.

## API contracts

### Shared types

```ts
type MacroTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

type UserSummary = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
}

type ViewerRecipeState = {
  isOwner: boolean
  isSaved: boolean
  isLiked?: boolean
  canFork: boolean
  canLog: boolean
}
```

### Today/logs

```ts
GET /logs?date=YYYY-MM-DD

type DailyLogResponse = {
  date: string
  goal: MacroTotals
  meals: {
    mealType: "breakfast" | "lunch" | "dinner" | "snack"
    entries: FoodLogEntry[]
    totals: MacroTotals
  }[]
  dayTotals: MacroTotals
}

type FoodLogEntry = {
  id: string
  itemType: "food" | "recipe"
  displayName: string
  recipeId?: string
  recipeVersionId?: string
  foodId?: string
  quantity: number
  quantityUnit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sourceType: "manual" | "search" | "barcode" | "recipe" | "ai_draft"
  createdAt: string
}
```

```ts
POST /logs

type LogRecipeRequest = {
  recipeId: string
  recipeVersionId: string
  date: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  servings: number
}

type LogRecipeResponse = {
  entry: FoodLogEntry
  dayTotals: MacroTotals
  mealTotals: MacroTotals
}
```

### Recipes

```ts
type RecipeSummary = {
  id: string
  currentVersionId: string
  title: string
  imageUrl?: string
  creator: UserSummary
  status: "draft" | "published" | "archived"
  visibility: "private" | "unlisted" | "public"
  forkedFromRecipeId?: string
  caloriesPerServing: number
  proteinPerServing: number
  carbsPerServing: number
  fatPerServing: number
  tags: string[]
  updatedAt: string
  savedAt?: string
}
```

```ts
GET /recipes/:id

type RecipeDetailResponse = RecipeSummary & {
  slug: string
  ownerUserId: string
  currentVersion: {
    id: string
    versionNumber: number
    description: string
    servings: number
    prepTimeMinutes?: number
    cookTimeMinutes?: number
    caloriesPerServing: number
    proteinPerServing: number
    carbsPerServing: number
    fatPerServing: number
    ingredients: {
      id: string
      label: string
      quantity: number
      unit: string
      foodId?: string
      servingId?: string
      calories: number
      protein: number
      carbs: number
      fat: number
      source: "usda" | "open_food_facts" | "label" | "creator" | "user"
      sourceAttribution?: object
    }[]
    steps: { id: string; sortOrder: number; body: string }[]
  }
  stats: {
    saveCount: number
    forkCount: number
    logCount: number
    likeCount?: number
  }
  viewerState: ViewerRecipeState
  communityContext?: {
    communityId: string
    name: string
    memberCount: number
  }
  friendContext?: {
    savedByFriendCount: number
    sampleFriends: UserSummary[]
  }
}
```

### Recipe editor

```ts
type UpsertRecipeRequest = {
  title: string
  description?: string
  imageUploadId?: string
  servings: number
  yieldAmount?: number
  yieldUnit?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  visibility: "private" | "unlisted" | "public"
  status: "draft" | "published"
  ingredients: {
    foodId?: string
    servingId?: string
    quantity: number
    unit: string
    label: string
    note?: string
    sortOrder: number
  }[]
  steps: {
    body: string
    sortOrder: number
  }[]
  tags?: string[]
}
```

### Discover

```ts
GET /discover/recipes?tags=&maxCalories=&minProtein=&prepTime=&sort=&cursor=

type DiscoverRecipesResponse = {
  sections?: {
    id: string
    title: string
    layout: "hero" | "rail" | "grid" | "feed"
    items: DiscoverRecipeItem[]
  }[]
  items?: DiscoverRecipeItem[]
  nextCursor?: string
}

type DiscoverRecipeItem = RecipeSummary & {
  sourceContext?: {
    type: "featured" | "community" | "friends" | "creator"
    label: string
    communityId?: string
    savedByFriendCount?: number
  }
  stats: {
    saveCount: number
    forkCount: number
    logCount: number
    likeCount?: number
  }
  isSaved: boolean
  isLiked?: boolean
}
```

### Communities

```ts
GET /communities/:idOrSlug

type CommunityDetailResponse = {
  id: string
  slug: string
  name: string
  description: string
  imageUrl?: string
  visibility: "public" | "private" | "unlisted"
  joinPolicy: "open" | "request" | "invite_only"
  memberCount: number
  recipeCount: number
  viewerMembership?: {
    status: "active" | "pending" | "banned" | "left"
    role?: "owner" | "admin" | "moderator" | "member"
  }
  pinnedRecipes: DiscoverRecipeItem[]
  recentRecipes: CommunityRecipeFeedItem[]
}

type CommunityRecipeFeedItem = {
  id: string
  recipe: DiscoverRecipeItem
  sharedBy: UserSummary
  caption?: string
  createdAt: string
}
```

### Profiles/friends

```ts
type UserProfileResponse = {
  userId: string
  username: string
  displayName: string
  bio?: string
  avatarUrl?: string
  coverImageUrl?: string
  isPublic: boolean
  stats: {
    publicRecipeCount: number
    collectionCount: number
    followerCount: number
    followingCount: number
  }
  viewerRelationship?: {
    isSelf: boolean
    isFollowing: boolean
    friendshipStatus?: "none" | "pending" | "accepted"
  }
}
```

## QA harness plan

Minimum required QA evidence before MVP acceptance:

1. **Visual QA**
   - Screenshots for all tabs.
   - Screenshots for recipe detail, log sheet, editor, community detail, profile.
   - Compare against Claude Design MVP for warmth, spacing, hierarchy, macro color consistency.

2. **Privacy QA**
   - Confirm logs/goals never appear in:
     - Discover
     - Community
     - Public Profile
     - Friend Activity
   - Confirm public profile only shows public recipes.
   - Confirm private/unlisted recipes obey access rules.

3. **Nutrition correctness QA**
   - Unit test macro aggregation on Today.
   - Unit test recipe per-serving calculation.
   - Regression test: edit recipe after logging; old log remains unchanged.

4. **Flow QA**
   - Discover → Recipe detail → Log → Today.
   - Cookbook → Create recipe → Save draft.
   - Recipe → Fork → Private remix in Cookbook.
   - Recipe → Publish/share → Community feed.
   - Profile → Follow → state persists.

5. **API QA**
   - Decode tests for all core response fixtures.
   - Request payload snapshot tests for log, recipe upsert, fork, publish, community share.
   - Visibility matrix test.

## Open questions

1. **Backend final stack:** architecture recommends TypeScript + Hono/Fastify + Postgres + Drizzle/Prisma. Need final pick.
2. **Auth scope:** Apple-only first, or Apple + email from day one?
3. **Follow vs friend:** implement follow only first, or both follow and mutual friend request in MVP?
4. **Recipe detail serving selector:** does selector scale displayed macros, prepare log quantity, or both?
5. **Food logging MVP:** is manual/custom food logging required in first cut, or can “Log food” initially route to food search with limited custom fallback?
6. **Image uploads:** include real S3/R2 upload in MVP or use placeholder/mock image upload initially?
7. **Community creation:** should users create communities in MVP, or only join seeded/admin-created communities?
8. **Messaging:** prototype has “Send to friend”/Message, but no defined messaging backend. Defer to native share/link unless explicitly required.
9. **Public web pages:** are public recipe/profile web pages part of same MVP milestone, or iOS-only with share links stubbed?
