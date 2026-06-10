# Savoro iOS MVP Mockup Brief

_Last updated: 2026-06-05_

## Purpose

This brief is for creating an initial high-quality iOS app mockup for Savoro.

The goal is not to design every possible screen. The goal is to design a polished, believable MVP flow that proves the core product:

> Recipes, nutrition logging, friends, and communities belong in one warm, trustworthy app.

Savoro should feel native, friendly, bright, premium, and useful — not clinical, not gym-bro, not childish, and not like a generic calorie tracker.

## Product summary

Savoro is a native iOS nutrition app where recipes and food logs are deeply connected.

A recipe is:

- something you cook
- something you log
- something you save
- something you publish
- something friends and communities can share
- something you can fork/remix

The MVP should make this loop obvious:

```txt
Discover recipe → inspect macros → save/fork/log → share with friend/community → build your own cookbook
```

## Design personality

Desired feel:

- bright
- warm
- friendly
- pink-forward, but not overwhelmingly pink
- clean and premium
- soft but not washed out
- trustworthy, not medical
- social, but not noisy
- food-centered, not body-centered

Avoid:

- black/dark aggressive fitness UI
- cold hospital/clinical health app styling
- calorie-shame language
- streak pressure
- excessive gamification
- childish candy pink
- generic SaaS cards with no food personality

## Core product principles

1. **Recipes are first-class nutrition objects**
   - Show macros clearly.
   - Make recipe logging feel easier than manual food tracking.

2. **Trust without heaviness**
   - Use light provenance signals like “USDA verified,” “label verified,” “creator recipe,” etc.
   - Do not overload the UI with database complexity.

3. **Social discovery, private nutrition**
   - Recipes, profiles, and communities can be public.
   - Logs, goals, and daily adherence are private by default.

4. **Non-shaming nutrition**
   - No “bad food.”
   - No guilt messages.
   - No public calorie streaks.
   - The app helps users pay attention without making food feel moralized.

5. **Native iOS polish**
   - Use SwiftUI/native interaction assumptions.
   - Bottom tabs, sheets, swipe gestures, large titles, haptics, smooth transitions.

## Suggested app information architecture

Use 5 main tabs for the mockup:

```txt
Today
Cookbook
Discover
Community
Profile
```

If 5 tabs feels too busy, Discover and Community can be conceptually merged, but the mockup should still represent both social discovery and community recipe spaces.

---

# Main tabs

## 1. Today

Purpose: private daily logging dashboard.

This screen should answer:

- What have I logged today?
- How am I doing against my macro goals?
- What can I log quickly?

Key UI elements:

- warm greeting/header
- daily macro summary card
- calories/protein/carbs/fat progress
- meal sections: Breakfast, Lunch, Dinner, Snack
- quick action: Log Food
- quick action: Log Recipe
- recently logged/saved recipes
- subtle non-shaming tone

Important tone:

- Avoid “you failed,” “streak broken,” “over limit” energy.
- Prefer language like “Today so far,” “Still flexible,” “Logged meals.”

Potential hero card:

```txt
Today so far
1,420 / 2,200 cal
Protein 112g / 160g
Carbs 145g / 220g
Fat 48g / 70g
```

Sample meal timeline:

```txt
Breakfast
- High-Protein Overnight Oats · 420 cal · P34 C45 F12

Lunch
- Chicken Shawarma Bowl · 520 cal · P42 C48 F18

Snack
- Greek Yogurt Parfait · 310 cal · P28 C32 F8
```

Primary actions:

- `+ Log`
- `Log recipe`
- `Search food`

## 2. Cookbook

Purpose: user’s personal recipe library.

Contains:

- My Recipes
- Saved Recipes
- Drafts
- Collections

Key UI elements:

- segmented control or tabs: Mine / Saved / Drafts
- recipe cards with macro badges
- search/filter
- prominent Create Recipe button
- saved/forked indicators

Recipe card should show:

- image/gradient/food visual
- title
- creator if saved from someone else
- calories/protein per serving
- tags
- save/fork/log affordance

Example:

```txt
Chicken Shawarma Bowl
520 cal · 42g protein
meal prep · high protein
Saved from @maya
[Log] [Fork]
```

## 3. Discover

Purpose: marketplace-style public recipe discovery.

This should feel like browsing useful, beautiful recipes — not like scrolling diet content.

Sections:

- Featured for you
- Popular in your communities
- High protein this week
- Quick meals under 20 minutes
- From friends
- Creator spotlight

Filters:

- High protein
- Meal prep
- Quick
- Breakfast
- Dinner
- Under 500 cal
- Vegetarian
- Cozy

Key UI elements:

- large search bar
- horizontal category chips
- rich recipe cards
- creator metadata
- macro preview
- save/fork/log buttons

Important: Discover is not just a database search. It should feel social and curated.

Example cards:

```txt
High-Protein Overnight Oats
@livfit · 420 cal · 34g protein
Saved by 2 friends
[Save] [Log]
```

```txt
Turkey Meatball Meal Prep
@marcoeats · 440 cal · 45g protein
Popular in High Protein Meal Prep
[Save] [Fork]
```

## 4. Community

Purpose: friends and community recipe sharing.

This is not a full social network yet. It is a recipe-first community layer.

Top-level screen should include:

- joined communities
- friend activity
- community recipe feed
- invitations/requests

Community examples:

- High Protein Meal Prep
- Cozy Macro Meals
- College Lifters
- Sunday Kitchen

Community card should show:

- name
- member count
- recent shared recipes
- join/open action

Community detail screen should show:

- community header
- member count
- join/share button
- recipe feed
- pinned recipes
- member avatars

Community feed item:

```txt
@dylan shared Chicken Shawarma Bowl
in High Protein Meal Prep
520 cal · 42g protein
[Save] [Log] [Fork]
```

Friend activity examples:

- “Maya published Salmon Poke Bowl”
- “Alex forked Turkey Meatball Meal Prep”
- “Jordan saved High-Protein Overnight Oats”

Avoid showing:

- friend calorie totals
- friend weigh-ins
- private daily logs
- adherence/streaks

## 5. Profile

Purpose: identity, public recipes, social graph, and settings.

Own profile should show:

- avatar
- display name
- username
- bio
- public recipe count
- saved/forked count maybe
- friends/following
- public recipes
- collections
- settings/goals access

Public profile should show:

- public recipes
- collections
- communities if public
- friend/follow button

Example profile:

```txt
Dylan Reed
@dylan
Macro-friendly recipes I actually want to eat.

24 recipes · 4 collections · 128 followers
[Edit Profile]
```

Privacy note:

- Do not expose daily food logs or nutrition goals on public profiles.

---

# Critical flows to mock up

The mockup should prioritize these flows.

## Flow 1: Discover → Recipe detail → Log

This is probably the most important MVP demo flow.

1. User opens Discover.
2. Finds a public recipe.
3. Opens recipe detail.
4. Sees:
   - image/title/creator
   - macro summary
   - ingredients
   - instructions
   - source/trust indicators
   - save/fork/log buttons
5. Taps Log.
6. Bottom sheet asks:
   - serving amount
   - meal type
   - date
7. Confirms.
8. Returns to Today with logged recipe visible.

Recipe detail should feel premium and food-first.

Important recipe detail sections:

```txt
Header image
Title
Creator row
Macro summary per serving
Serving selector
Tags
Ingredients
Instructions
Community/social context
Actions: Save, Fork, Log
```

## Flow 2: Create recipe → Save private → Publish/share

1. User opens Cookbook.
2. Taps Create Recipe.
3. Adds title/photo/servings.
4. Adds ingredients.
5. Macros update live.
6. Adds instructions.
7. Saves private draft.
8. Optional publish/share sheet:
   - Keep private
   - Unlisted link
   - Publish to profile
   - Share to community

Recipe editor should feel approachable, not like a spreadsheet.

Important editor UI:

- progressive sections
- ingredient rows
- live macro preview card
- “add ingredient” search
- free-text fallback
- serving/yield controls

## Flow 3: Fork/remix recipe

1. User opens public recipe.
2. Taps Fork.
3. App creates private editable copy.
4. User modifies ingredients or servings.
5. Macro summary updates.
6. User saves to Cookbook.

This flow matters because it makes the marketplace feel participatory.

Tone:

- “Make your version”
- “Saved as a private remix”
- Not “copy” or “steal.”

## Flow 4: Share recipe to community

1. User opens own recipe.
2. Taps Share.
3. Selects community.
4. Adds optional caption.
5. Recipe appears in community feed.

Share sheet options:

- Send to friend
- Share to community
- Copy public link
- Publish to profile

## Flow 5: Add friend / view friend activity

1. User opens profile from recipe card.
2. Taps Follow or Add Friend.
3. Friend activity appears in Community/Discover.

Friend activity should be recipe-centered.

---

# Screens to design for initial high-quality mockup

Minimum recommended screen set:

1. Today dashboard
2. Discover feed
3. Recipe detail
4. Log recipe bottom sheet
5. Cookbook/library
6. Recipe editor
7. Community home
8. Community detail/feed
9. Profile
10. Share/publish sheet

If fewer screens are needed, prioritize:

1. Discover feed
2. Recipe detail
3. Log recipe sheet
4. Today dashboard
5. Community feed
6. Recipe editor

## Component inventory

Design these reusable components:

### Nutrition components

- Macro summary card
- Macro pill/badge
- Calorie/protein/carbs/fat mini bars
- Per-serving macro row
- Nutrition snapshot

### Recipe components

- Recipe card compact
- Recipe card large
- Recipe detail header
- Ingredient row
- Instruction step
- Save/fork/log action cluster
- Creator row

### Social/community components

- Profile avatar cluster
- Friend activity item
- Community card
- Community recipe feed item
- Share-to-community sheet
- Follow/add friend button

### Logging components

- Meal timeline item
- Log confirmation bottom sheet
- Serving quantity selector
- Meal/date picker

### Trust/provenance components

- Verified source badge
- “USDA verified” badge
- “Open Food Facts” badge
- “Creator recipe” badge
- “Nutrition snapshot saved” microcopy

## Data concepts that should appear visually

The mockup should subtly communicate these models:

### Recipe versioning

Do not make it technical, but allow language like:

- “Logged from latest version”
- “Remix from @maya’s original”
- “Updated 2 days ago”

### Fork/remix

Use friendly language:

- Fork
- Remix
- Make your version

### Saved recipes

Clear saved state:

- bookmark icon
- “Saved to Cookbook”

### Community source

Recipe cards can say:

- “Popular in High Protein Meal Prep”
- “Shared by @dylan”
- “Saved by 2 friends”

### Privacy

Use small but reassuring microcopy:

- “Your logs stay private.”
- “Publishing shares the recipe, not your daily log.”
- “Saved privately to your Cookbook.”

## Sample content for mockup

Use realistic, warm, macro-aware food examples.

Recipes:

- Chicken Shawarma Bowl
- High-Protein Overnight Oats
- Turkey Meatball Meal Prep
- Salmon Poke Bowl
- Greek Yogurt Power Bowl
- Cozy Lentil Soup
- Spicy Tofu Rice Bowl
- Cottage Cheese Pancakes

Creators/users:

- @maya
- @dylan
- @livfit
- @marcoeats
- @alexmealprep

Communities:

- High Protein Meal Prep
- Cozy Macro Meals
- Sunday Kitchen
- College Lifters

Tags:

- high-protein
- meal-prep
- quick
- breakfast
- dinner
- under-500
- vegetarian
- cozy

Macro examples:

```txt
Chicken Shawarma Bowl
520 cal · 42g protein · 48g carbs · 18g fat
```

```txt
High-Protein Overnight Oats
420 cal · 34g protein · 45g carbs · 12g fat
```

```txt
Turkey Meatball Meal Prep
440 cal · 45g protein · 30g carbs · 14g fat
```

## Interaction notes

Use native iOS patterns:

- bottom sheets for logging, sharing, publishing
- large title navigation where appropriate
- swipe actions on log entries
- segmented controls for Cookbook filters
- search bars in Discover/Cookbook
- haptic-feeling confirmation states
- sticky bottom action bar on recipe detail: Save / Fork / Log

Recipe detail should probably have a sticky primary CTA:

```txt
[Save] [Fork] [Log]
```

or:

```txt
[Save] [Log this]
```

with fork in overflow.

## Tone/microcopy examples

Good:

- “Log this serving”
- “Save to Cookbook”
- “Make your version”
- “Share to a community”
- “Your logs stay private”
- “Macros per serving”
- “Source: USDA verified”
- “Published by @maya”
- “Popular with your friends”

Avoid:

- “cheat meal”
- “bad food”
- “burn it off”
- “you failed”
- “streak lost”
- “over your limit”
- “guilt-free” if it moralizes food

## Suggested visual hierarchy

The app should not be only numbers. Food/recipes should lead, macros should support.

Priority order on recipe cards:

1. food/recipe identity
2. creator/community source
3. macro usefulness
4. social actions

Priority order on Today:

1. daily state
2. logged meals
3. quick actions
4. goals/details

Priority order on Community:

1. community identity
2. shared recipes
3. friend/member activity
4. join/share actions

## Mockup deliverable request

Create a high-fidelity iOS MVP mockup showing Savoro as a polished native app.

Focus on:

- Today dashboard
- Discover recipe feed
- Recipe detail with macros and creator/community context
- Log recipe bottom sheet
- Cookbook
- Recipe editor
- Community recipe feed
- Profile

The mockup should demonstrate the end-to-end product loop:

```txt
Discover a recipe → view details → log it → see it on Today → save/fork/share into community
```

The design should make Savoro feel like a bright, warm, trustworthy nutrition app where food stays enjoyable and social, while personal tracking remains private.
