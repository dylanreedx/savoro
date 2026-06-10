# Savoro MVP Architecture

_Last updated: 2026-06-05_

## Context

Savoro is being rebuilt from scratch. The existing landing page is useful as brand/product context, but the real product codebase should start clean.

Core decision:

- Native iOS app in **Swift / SwiftUI**.
- No Expo / React Native.
- Build around recipes, logging, profiles, friends, and communities from the beginning.
- Keep the first version focused, but model the social/marketplace primitives correctly so they do not need to be rewritten later.

## Product thesis

Savoro is a nutrition platform where **recipes and food logs are the same object**.

A recipe is not just content. It is:

- a structured nutrition object
- a reusable food log template
- a public/shareable page
- something users can save, fork, remix, and log
- something creators and communities can distribute

The MVP should prove that this loop feels great:

```txt
Create recipe → calculate macros → publish/share → save/fork/log → discover through people/communities
```

## Strategic pillars

From the research report and landing page direction:

1. **Trust**
   - Food data should be source-attributed.
   - Logs should preserve nutrition snapshots.
   - User-generated data should be transparent, not magical.

2. **Speed**
   - Logging common meals and recipes should be fast.
   - Recipe logging should beat normal macro tracking friction.

3. **Shareability**
   - Recipes should have beautiful public pages.
   - Profiles should act like food/recipe identities.
   - Communities should make recipes feel social without exposing private food logs.

4. **Non-shaming design**
   - No streak pressure.
   - No public adherence by default.
   - Recipes can be public; goals/logs/body metrics stay private unless explicitly shared later.

## Architecture overview

### 1. Native iOS app

Primary product surface.

```txt
iOS App
- SwiftUI
- async/await URLSession API client
- Keychain token storage
- local cache for recent logs, recipes, foods, profiles, feeds
- no complex offline-first sync in MVP
```

Main tabs:

1. **Today**
   - daily macro overview
   - meal timeline
   - quick food/recipe logging

2. **Cookbook**
   - my recipes
   - saved recipes
   - create/edit recipe

3. **Discover**
   - public recipe marketplace
   - creators
   - communities
   - friend activity / social discovery

4. **Community**
   - friends
   - joined communities
   - community recipe feeds
   - invitations

5. **Profile**
   - user profile
   - public recipes
   - friends/followers
   - settings/goals

The exact tab count can be revisited. If 5 tabs feels too heavy, Discover and Community can merge initially.

### 2. Backend API

Canonical source of truth.

Recommended stack:

```txt
Backend: TypeScript + Hono or Fastify
Database: Postgres
ORM: Drizzle or Prisma
Storage: S3/R2 for images
Auth: Sign in with Apple + email auth
Search: Postgres full-text + pg_trgm initially
```

Postgres is preferred because Savoro needs:

- public recipe search
- marketplace feeds
- profiles
- communities
- tags
- activity feeds
- future marketplace/creator analytics

### 3. Public web

The current SvelteKit landing page can remain the web base.

Public web should eventually serve:

- landing page
- public recipe pages
- public creator profiles
- public community pages, if enabled
- SEO/share previews
- deep links into the iOS app

### 4. Nutrition data/import layer

MVP sources:

- USDA FoodData Central
- Open Food Facts
- user-created foods
- recipe-generated foods

Future sources/features:

- recipe URL import
- AI ingredient parsing
- barcode/label correction queue
- creator-submitted recipe packs

## Core data model

This is conceptual, not final schema syntax.

---

# Users, profiles, identity

## User

Private account object.

```txt
User
- id
- email
- username
- displayName
- avatarUrl
- bio
- isPublic
- createdAt
- updatedAt
```

## AuthIdentity

```txt
AuthIdentity
- id
- userId
- provider: apple | email | google
- providerUserId
- email
- createdAt
```

## UserProfile

Can initially be folded into `User`, but conceptually this is the public profile.

```txt
UserProfile
- userId
- username
- displayName
- bio
- avatarUrl
- coverImageUrl
- websiteUrl
- instagramUrl
- tiktokUrl
- isPublic
- createdAt
- updatedAt
```

## UserSettings

```txt
UserSettings
- userId
- defaultMealType
- preferredUnits: metric | imperial
- calorieDisplayMode
- macroDisplayMode
- privacyDefaults
- notificationSettings
```

## NutritionGoal

```txt
NutritionGoal
- id
- userId
- calories
- protein
- carbs
- fat
- fiber
- startDate
- endDate nullable
- createdAt
- updatedAt
```

Goals are private by default.

---

# Friends and social graph

Savoro should include friends in MVP because social discovery makes recipes/community feel alive.

There are two possible relationship models:

1. **Follow model** — asymmetrical, creator-friendly.
2. **Friend model** — mutual, more personal.

For MVP, support both concepts with one relationship table.

## UserRelationship

```txt
UserRelationship
- id
- actorUserId
- targetUserId
- type: follow | friend_request | friend
- status: pending | accepted | blocked | muted
- createdAt
- updatedAt
```

Interpretation:

- follow: actor follows target, no approval required if target allows followers
- friend_request pending: actor requested friendship
- friend accepted: mutual friend relationship
- blocked/muted: safety/privacy controls

Alternative: split follows and friendships into separate tables. But one table is acceptable for MVP if implemented carefully.

## FriendActivity

Do not store every activity as a permanent feed item at first unless needed. But conceptually:

```txt
ActivityEvent
- id
- actorUserId
- type:
  - recipe_published
  - recipe_saved
  - recipe_forked
  - recipe_logged_publicly_optional
  - joined_community
  - created_collection
- recipeId nullable
- communityId nullable
- metadata json
- visibility: public | friends | community | private
- createdAt
```

Important privacy rule:

- Publishing/saving/forking recipes can be social.
- Food logs should **not** appear in friend activity by default.
- If logging activity is ever shown, make it opt-in and probably recipe-only, not calorie/macro totals.

---

# Communities

Communities are MVP because they create a better marketplace/discovery loop.

Think of communities as lightweight groups centered around recipe sharing, not full social networks.

Examples:

- High Protein Meal Prep
- Cut-Friendly Recipes
- College Lifters
- Cozy Macro Meals
- Dylan's Kitchen
- Creator's private recipe club later

## Community

```txt
Community
- id
- slug
- name
- description
- imageUrl
- ownerUserId
- visibility: public | private | unlisted
- joinPolicy: open | request | invite_only
- createdAt
- updatedAt
```

## CommunityMember

```txt
CommunityMember
- id
- communityId
- userId
- role: owner | admin | moderator | member
- status: active | pending | banned | left
- joinedAt
- createdAt
- updatedAt
```

## CommunityInvite

```txt
CommunityInvite
- id
- communityId
- invitedByUserId
- invitedUserId nullable
- email nullable
- inviteCode
- status: pending | accepted | expired | revoked
- expiresAt nullable
- createdAt
```

## CommunityRecipe

A recipe can be shared into a community without transferring ownership.

```txt
CommunityRecipe
- id
- communityId
- recipeId
- recipeVersionId
- sharedByUserId
- caption nullable
- pinnedByUserId nullable
- pinnedAt nullable
- createdAt
```

## CommunityPost

MVP can skip general text posts if we want communities to stay recipe-first. But if included:

```txt
CommunityPost
- id
- communityId
- authorUserId
- type: recipe_share | text | question
- body nullable
- recipeId nullable
- createdAt
- updatedAt
```

Recommendation for MVP:

- Use `CommunityRecipe` as the main community feed primitive.
- Defer general discussion posts/comments until after recipe sharing works.

## CommunityActivity

```txt
CommunityActivity
- id
- communityId
- actorUserId
- type: recipe_shared | member_joined | recipe_pinned
- recipeId nullable
- metadata json
- createdAt
```

---

# Food and nutrition data

## Food

Atomic food item.

```txt
Food
- id
- name
- brandName nullable
- barcode nullable
- source: usda | open_food_facts | user | recipe
- sourceId nullable
- sourceRevision nullable
- countryCode nullable
- isVerified
- createdByUserId nullable
- createdAt
- updatedAt
```

## FoodNutrientProfile

Nutrition facts for a food.

```txt
FoodNutrientProfile
- id
- foodId
- basis: per_100g | per_serving
- calories
- protein
- carbs
- fat
- fiber
- sugar
- sodium
- saturatedFat
- cholesterol
- potassium
- calcium
- iron
- sourceAttribution json
- createdAt
- updatedAt
```

## Serving

```txt
Serving
- id
- foodId
- label: "100g" | "1 cup" | "1 package"
- amountGrams nullable
- isDefault
- createdAt
- updatedAt
```

## FoodCorrection

Can be deferred, but the data model should be anticipated.

```txt
FoodCorrection
- id
- foodId
- submittedByUserId
- field
- oldValue
- newValue
- evidenceImageUrl nullable
- evidenceText nullable
- status: pending | accepted | rejected
- reviewedByUserId nullable
- createdAt
- reviewedAt nullable
```

---

# Recipes

## Recipe

Stable top-level recipe identity.

```txt
Recipe
- id
- ownerUserId
- slug
- title
- description
- imageUrl
- visibility: private | unlisted | public
- status: draft | published | archived
- currentVersionId
- forkedFromRecipeId nullable
- forkedFromVersionId nullable
- createdAt
- updatedAt
```

## RecipeVersion

Exact version of a recipe. Logs and forks should point to a version.

```txt
RecipeVersion
- id
- recipeId
- versionNumber
- title
- description
- instructionsMarkdown
- servings
- yieldAmount nullable
- yieldUnit nullable
- prepTimeMinutes nullable
- cookTimeMinutes nullable
- caloriesPerServing
- proteinPerServing
- carbsPerServing
- fatPerServing
- fiberPerServing nullable
- sodiumPerServing nullable
- createdByUserId
- publishedAt nullable
- createdAt
```

Why versions matter:

- A recipe can evolve without changing past logs.
- Public recipe pages can show latest while logs preserve the version used.
- Forks/remixes know exactly what they forked from.

## RecipeIngredient

```txt
RecipeIngredient
- id
- recipeVersionId
- foodId nullable
- servingId nullable
- quantity
- unit
- label
- note nullable
- sortOrder
```

Supports both:

- linked data ingredients
- free-text ingredients like "pinch of salt" or "hot sauce to taste"

## RecipeStep

```txt
RecipeStep
- id
- recipeVersionId
- body
- sortOrder
```

## RecipeTag

```txt
RecipeTag
- recipeId
- tag
```

Examples:

- high-protein
- breakfast
- meal-prep
- quick
- low-calorie
- vegetarian
- bulk
- cut
- cozy

## SavedRecipe

```txt
SavedRecipe
- id
- userId
- recipeId
- recipeVersionId nullable
- savedAt
```

## RecipeFork

```txt
RecipeFork
- id
- sourceRecipeId
- sourceVersionId
- forkedRecipeId
- userId
- createdAt
```

Forking should create a new private editable recipe owned by the forking user.

## RecipeReaction

MVP optional, but useful for marketplace/community feel.

```txt
RecipeReaction
- id
- userId
- recipeId
- type: like
- createdAt
```

## RecipeComment

Probably defer unless communities feel empty without comments.

```txt
RecipeComment
- id
- recipeId
- userId
- body
- parentCommentId nullable
- status: visible | hidden | deleted
- createdAt
- updatedAt
```

Recommendation:

- Defer comments initially.
- Start with saves, forks, likes, and community shares.

---

# Marketplace/discovery

For MVP, marketplace means **public recipe discovery**, not paid commerce.

## Marketplace listing

A public recipe is effectively a marketplace listing. We can model separately or derive from Recipe.

```txt
MarketplaceListing
- id
- recipeId
- recipeVersionId
- creatorUserId
- title
- summary
- coverImageUrl
- status: active | hidden | removed
- publishedAt
- updatedAt
```

Could be skipped initially and derived from `Recipe.visibility = public`, but a listing table becomes useful for moderation/featuring later.

## RecipeStats

```txt
RecipeStats
- recipeId
- viewCount
- saveCount
- forkCount
- logCount
- likeCount
- shareCount
- updatedAt
```

Can be denormalized/cache-based later.

## Collection

Collections make creator profiles and marketplace browsing much better.

```txt
Collection
- id
- ownerUserId
- slug
- title
- description
- coverImageUrl
- visibility: private | unlisted | public
- createdAt
- updatedAt
```

## CollectionRecipe

```txt
CollectionRecipe
- id
- collectionId
- recipeId
- sortOrder
- addedAt
```

MVP use cases:

- "High Protein Breakfasts"
- "Weeknight Dinners"
- "Cut-Friendly Meal Prep"
- "My Favorites"

---

# Logging

## FoodLogEntry

Logs should store frozen nutrient snapshots.

```txt
FoodLogEntry
- id
- userId
- date
- mealType: breakfast | lunch | dinner | snack
- itemType: food | recipe
- foodId nullable
- servingId nullable
- recipeId nullable
- recipeVersionId nullable
- quantity
- quantityUnit
- displayName

// frozen snapshot at time of logging
- calories
- protein
- carbs
- fat
- fiber nullable
- sodium nullable

- sourceType: manual | search | barcode | recipe | ai_draft
- createdAt
- updatedAt
```

Reason:

If a recipe changes later, old logs must not silently change.

## LogDraft

Useful for future AI/import flows.

```txt
LogDraft
- id
- userId
- source: ai | barcode | recipe_import | manual
- status: draft | confirmed | discarded
- date
- mealType
- rawInput nullable
- createdAt
```

## LogDraftItem

```txt
LogDraftItem
- id
- logDraftId
- foodId nullable
- recipeId nullable
- displayName
- quantity
- unit
- calories
- protein
- carbs
- fat
- confidence nullable
- explanation nullable
- sourceAttribution nullable
```

MVP can skip this unless AI/log assistant is included.

---

# Sharing/privacy

## Visibility model

Recipes:

```txt
private  - only owner
unlisted - anyone with link
public   - visible in marketplace/profile/community
```

Profiles:

```txt
private - limited public info
public  - public profile and public recipes
```

Communities:

```txt
public      - discoverable, content visible depending on settings
unlisted    - link-only
private     - members only
```

Logs/goals:

```txt
private by default
not included in marketplace, profile, or friend feeds
```

## ShareLink

```txt
ShareLink
- id
- resourceType: recipe | profile | community | collection
- resourceId
- token nullable
- createdByUserId
- expiresAt nullable
- createdAt
```

Public route patterns:

```txt
/@username
/@username/recipe-slug
/@username/collections/collection-slug
/c/community-slug
```

Deep link patterns:

```txt
savoro://profile/username
savoro://recipe/recipeId
savoro://community/communityId
```

---

# User flows

## Onboarding

1. Sign in with Apple/email.
2. Choose username.
3. Set display name/avatar optional.
4. Set basic goal optional.
5. Choose interests:
   - high protein
   - meal prep
   - weight loss
   - muscle gain
   - vegetarian
   - quick meals
6. Optional: find friends.
7. Land on Today.

## Create recipe

1. Tap Create Recipe.
2. Add title, photo, description.
3. Set servings/yield.
4. Add ingredients:
   - search food database
   - add custom food
   - free-text fallback
5. Macros calculate live.
6. Add steps.
7. Save private draft.
8. Optional publish:
   - private
   - unlisted
   - public
   - share to community

## Log recipe

1. Open recipe.
2. Tap Log.
3. Choose serving amount.
4. Pick date/meal.
5. Confirm.
6. Create `FoodLogEntry` with frozen nutrition snapshot.

## Discover recipe

1. Browse Discover.
2. Filter by tag/macro/prep time/community/friends.
3. Open recipe detail.
4. Save, Log, Like, or Fork.
5. Visit creator profile.

## Fork/remix recipe

1. Open public recipe.
2. Tap Fork.
3. App creates private copy.
4. User edits ingredients/servings.
5. New macros calculate.
6. User can keep private or publish remix.

## Add friend

1. Search username or open profile.
2. Tap Add Friend / Follow.
3. If friend request:
   - target receives request
   - accepts/rejects
4. Friend activity can influence Discover.

## Join community

1. Discover public community or open invite link.
2. Join/request invite depending on join policy.
3. Community feed shows shared recipes.
4. User can save/fork/log recipes from the community.
5. User can share their own public/unlisted recipes into community.

## Share to community

1. Open own recipe.
2. Tap Share.
3. Select community.
4. Add optional caption.
5. Recipe appears in community feed.

## Public web share

1. User publishes recipe.
2. Web page exists at `/@username/recipe-slug`.
3. Link preview shows recipe image, title, macros.
4. Viewer can:
   - open in app
   - save if signed in
   - view creator profile

---

# MVP API surface

Approximate endpoints.

## Auth

```txt
POST /auth/apple
POST /auth/email/start
POST /auth/email/verify
POST /auth/logout
GET  /me
PATCH /me/profile
```

## Goals/logging

```txt
GET  /goals/current
POST /goals
GET  /logs?date=YYYY-MM-DD
POST /logs
PATCH /logs/:id
DELETE /logs/:id
```

## Food

```txt
GET  /foods/search?q=
GET  /foods/barcode/:barcode
POST /foods/custom
GET  /foods/:id
```

## Recipes

```txt
GET    /recipes/mine
POST   /recipes
GET    /recipes/:id
PATCH  /recipes/:id
DELETE /recipes/:id
POST   /recipes/:id/publish
POST   /recipes/:id/unpublish
POST   /recipes/:id/log
POST   /recipes/:id/save
DELETE /recipes/:id/save
POST   /recipes/:id/fork
POST   /recipes/:id/like
DELETE /recipes/:id/like
```

## Marketplace/discover

```txt
GET /discover/recipes
GET /discover/creators
GET /discover/communities
GET /search?q=
```

Filters:

```txt
tags
maxCalories
minProtein
prepTime
sort=recent|popular|friends|community
cursor
```

## Profiles/friends

```txt
GET  /profiles/:username
GET  /profiles/:username/recipes
GET  /profiles/:username/collections
POST /profiles/:username/follow
DELETE /profiles/:username/follow
POST /profiles/:username/friend-request
POST /friend-requests/:id/accept
POST /friend-requests/:id/decline
GET  /friends
GET  /friend-requests
```

## Communities

```txt
GET  /communities
POST /communities
GET  /communities/:idOrSlug
PATCH /communities/:id
POST /communities/:id/join
POST /communities/:id/leave
GET  /communities/:id/members
GET  /communities/:id/recipes
POST /communities/:id/recipes
DELETE /communities/:id/recipes/:communityRecipeId
POST /communities/:id/invites
POST /community-invites/:code/accept
```

## Collections

```txt
GET  /collections/mine
POST /collections
GET  /collections/:id
PATCH /collections/:id
POST /collections/:id/recipes
DELETE /collections/:id/recipes/:recipeId
```

---

# iOS app structure

```txt
Savoro/
  App/
    SavoroApp.swift
    AppRouter.swift

  DesignSystem/
    Colors.swift
    Typography.swift
    Spacing.swift
    Components/

  Core/
    API/
      APIClient.swift
      AuthInterceptor.swift
      Endpoint.swift
    Auth/
      AuthStore.swift
      KeychainStore.swift
    Cache/
      LocalCache.swift
    Models/

  Features/
    Auth/
    Onboarding/
    Today/
    Logging/
    Cookbook/
    RecipeEditor/
    RecipeDetail/
    Discover/
    Communities/
    Friends/
    Profile/
    Settings/
```

State approach:

- Swift Observation (`@Observable`) for view models/stores.
- async/await for networking.
- Keep domain models simple and Codable.
- Do not introduce heavy architecture too early.

Suggested shared stores:

```txt
SessionStore
CurrentUserStore
TodayStore
RecipeStore
DiscoverStore
CommunityStore
```

---

# MVP build sequence

Because we are coding agentically, we can include friends/communities in MVP, but still sequence carefully.

## Phase 0 — foundations

- New monorepo/app structure.
- Backend scaffold.
- Postgres schema.
- SwiftUI app scaffold.
- Design system tokens from Claude design system.
- Auth/session flow.

## Phase 1 — nutrition/logging core

- Food model.
- Food search stub/seed data.
- Daily log CRUD.
- Nutrition goals.
- Today screen.

## Phase 2 — recipe core

- Recipe CRUD.
- Ingredients.
- Macro calculation.
- Recipe detail.
- Log recipe flow.
- Save recipe flow.

## Phase 3 — public recipes/marketplace

- Publish/unpublish.
- Public Discover feed.
- Filters/tags.
- Public recipe detail.
- Fork/remix.
- Public web recipe page.

## Phase 4 — profiles/friends

- Public profiles.
- Profile recipe list.
- Follow/friend request.
- Friend list.
- Friend-influenced Discover section.

## Phase 5 — communities

- Create community.
- Join/invite.
- Community recipe feed.
- Share recipe to community.
- Community members.
- Public/private community visibility.

## Phase 6 — polish/legitimacy

- Real waitlist/auth handoff from web.
- Share previews.
- Deep links.
- Image uploads.
- Moderation basics.
- Loading/empty/error states.

---

# What to defer

Even with agentic coding, avoid these in the first cut:

- paid creator marketplace
- comments/reviews
- complex recommendation algorithm
- trainer/client workflows
- grocery lists
- meal planning calendar
- full offline sync
- AI photo meal estimation
- full micronutrient perfection
- public body metrics/progress posts
- monetization/payouts

Maybe include later:

- comments inside communities
- creator analytics
- paid recipe packs
- AI recipe import
- correction review queue
- grocery lists from recipes

---

# MVP success criteria

The MVP should prove:

1. Creating a macro-aware recipe feels easy.
2. Logging a recipe serving is much faster than traditional tracking.
3. Public recipe pages feel worth sharing.
4. Users want to save/fork/log other people’s recipes.
5. Friends make discovery better.
6. Communities create durable recipe-sharing spaces.
7. The app feels warm, trustworthy, and non-shaming.

## Non-negotiable product rules

- Past logs never change because a food/recipe changed.
- Logs/goals are private by default.
- Recipes can be public, unlisted, or private.
- Public profiles should not expose sensitive nutrition adherence.
- Food data should carry source/provenance where possible.
- AI/imported suggestions should create drafts, not silent writes.

## Immediate next decisions

Before implementation, decide:

1. Backend stack: Hono/Fastify vs Swift Vapor.
2. ORM: Drizzle vs Prisma.
3. Auth: Apple-first only, or Apple + email from day one.
4. Exact iOS tabs: 4 tabs or 5 tabs.
5. Whether marketplace listing is derived from public recipes or has its own table now.
6. Whether communities support general posts in MVP, or recipe shares only.
7. Whether friend model is follow-only first, or true mutual friends.

Recommended defaults:

```txt
Backend: TypeScript + Hono
DB: Postgres
ORM: Drizzle
Auth: Apple + email
Tabs: Today, Cookbook, Discover, Community, Profile
Marketplace: derive from public recipes initially
Communities: recipe shares only initially
Social: follow + friend request model
```
