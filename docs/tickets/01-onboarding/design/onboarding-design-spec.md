# Savoro onboarding design pack

**Wireframe medium:** inline ASCII blocks. No PNGs or preview code are part of this pack.

**Purpose:** one reviewable source for the first-run account flow, the optional targets step, the
goal-less Today, and the Profile account surface. The blocks are low-fi: hierarchy, content, states,
and behavior are intentional; pixel values are not.

## Flow at a glance

```text
Welcome / auth
├─ Sign in with Apple ────────┐
└─ Continue with email ───────┤
                              ▼
                 common opaque session
                              ▼
                    GET /v1/me onboardingState
                       ├─ complete → authenticated app
                       └─ incomplete
                          ├─ new → Username → Profile basics
                          └─ interrupted → resume returned step
                                               ▼
                                              Intent
                                        ┌──────┴──────┐
                                        │             │
                                targets offered   targets not offered
                                        │             │
                                        ▼             │
                                    Targets           │
                                        │             │
                                        └──────┬──────┘
                                               ▼
                                 Today or Cookbook, per intent
                                               │
                                               ▼
                                    Profile account screen
```

Apple and email credential exchange both produce the same opaque session. The app then asks
`GET /v1/me` for the server-authoritative `onboardingState`: a completed account enters the
authenticated app directly, while a new or interrupted account resumes the returned onboarding
step. A newly created account whose next step is username opens the dedicated Username page before
Profile basics; an interrupted account resumes at its reported step rather than restarting. Intent
only chooses the first tab and whether the targets page is offered; it is not sent to the service and
is not part of identity.

The targets step can be skipped. A skipped person lands in a complete Today mode with nil targets;
the app never substitutes a zero-valued target. The Profile screen remains the place to add or edit
targets later.

## Shared visual and state rules

- Compose screens from the existing L-35 primitives: `SavoroCard` and its semantic styles,
  `SavoroButton` variants, `SavoroPill`/`SavoroChip`, `SavoroSegmentedControl`,
  `SavoroMacroValue`, `SavoroMacroStatBlock`, `SavoroMacroRing` only where a target exists,
  `SavoroTypography`, `SavoroSpacing`, `SavoroRadius`, and `SavoroColor`. A standard SwiftUI
  `TextField` or `SecureField` may sit inside the same tokenized card treatment; it does not get a
  new visual language.
- Use the same page surface, card rhythm, tap-target minimum, focus treatment, and dynamic-type
  behavior already established by those primitives. Accessibility-size layouts stack content rather
  than shrinking it.
- **Normal** means the person can read the step and use the available action. The normal state
  includes the screen's named content variants such as `taken`, `derived`, or `no-targets`.
- **Loading** keeps the current screen and entered values visible, shows one progress indicator and
  a short status line, and disables only actions that could duplicate the work. A person can never
  submit the same credential, profile update, or target twice from one loading state.
- **Error** is an inline `SavoroCard(style: .toast)` or equivalent calm card near the action. It
  names the next step in plain language, preserves entered values, and provides a `Try again`
  action. Raw response codes, service envelopes, internal identifiers, and implementation labels do
  not appear.
- A screen may use a local handoff or routing state in addition to the three required presentation
  states. Those states are documented below so snapshot names and test fixtures have one clear
  source.
- User-supplied values shown in the Profile examples (`@sunnytable`, `Dylan`, and
  `dylan@example.com`) stand for live profile fields. They are not identifier fallbacks. If a field
  is absent, its row is omitted rather than filled with an internal value.

## 1. Welcome / auth

**Build ticket:** P5.1 (`WelcomeAuthView.swift`).  
**Design decisions:** 1 (two auth methods, one session), 2 (no reset or verification surface), 11
(session comes from real sign-in), 13 (calm visible copy), and 14 (private by default).

This is the signed-out root. It offers exactly two entry paths: Apple authorization and the email
forms. The email action is a navigation handoff, not an email field on this surface.

### Normal — `idle`

```text
┌────────────────────────────────────┐
│            Welcome to Savoro        │
│ A calm place to keep your food      │
│ notes and recipes together.         │
│                                    │
│ [ Sign in with Apple ]              │
│                                    │
│                 or                 │
│                                    │
│ [ Continue with email ]             │
│                                    │
│ Your account starts private.        │
│ You choose what to share.           │
└────────────────────────────────────┘
```

**Behavior and copy:** both actions are enabled. `Sign in with Apple` starts the Apple adapter;
`Continue with email` opens the credential screen. A cancelled Apple sheet returns to this exact
state without an error card. Successful Apple exchange stores the common session, then asks
`GET /v1/me` for `onboardingState`: a new account opens Username, a completed account enters the
authenticated app directly, and an interrupted account resumes its server-authoritative step.

### Loading — `appleInFlight` / `emailEntryHandoff`

```text
┌────────────────────────────────────┐
│            Welcome to Savoro        │
│ A calm place to keep your food      │
│ notes and recipes together.         │
│                                    │
│ [ ◌ Signing you in… ]               │
│                                    │
│ Continue with email                 │
│                                    │
│ Your account starts private.        │
│ You choose what to share.           │
└────────────────────────────────────┘
```

For `appleInFlight`, the Apple action and email action are disabled while the authorization and
exchange complete. For `emailEntryHandoff`, the same temporary treatment reads `Opening email
sign-in…` in place of `Signing you in…`, then immediately presents the credential form; no
credential request starts on this screen.

### Error — `error(message:)`

```text
┌────────────────────────────────────┐
│            Welcome to Savoro        │
│                                    │
│ That didn’t go through — try again.│
│                                    │
│ [ Try again ]                       │
│ [ Continue with email ]             │
│                                    │
│ Your account starts private.        │
│ You choose what to share.           │
└────────────────────────────────────┘
```

The card is used for a real Apple or session-exchange error. `Try again` resets the Apple action to
idle; `Continue with email` remains an alternate path. The screen never displays a token, response
code, or account identifier.

## 2. Email credential forms

**Build ticket:** P5.2 (`EmailCredentialsView.swift`).  
**Design decisions:** 1 (same downstream session as Apple), 2 (no reset or verification surface),
3 (password handling is a service concern, never exposed in copy), and 13.

One screen supports signup and login through a two-option segmented control. The mode changes the
heading, supporting line, submit label, and status copy without changing the field order.

### Normal — `signup-idle`, `login-idle`, and `inline-validation`

Signup:

```text
┌────────────────────────────────────┐
│ [ Create account ]   Sign in        │
│ Create your account                │
│ Use your email and a password to   │
│ get started.                       │
│                                    │
│ Email                              │
│ [ you@example.com                 ] │
│ Password                           │
│ [ Choose a password               ] │
│ Use a password you’ll remember.    │
│                                    │
│ [ Create account ]                  │
└────────────────────────────────────┘
```

Login:

```text
┌────────────────────────────────────┐
│ Create account    [ Sign in ]       │
│ Welcome back                       │
│ Sign in to continue to your        │
│ private space.                     │
│                                    │
│ Email                              │
│ [ you@example.com                 ] │
│ Password                           │
│ [ Enter your password             ] │
│                                    │
│ [ Sign in ]                         │
└────────────────────────────────────┘
```

The fields are editable and the submit action is enabled only when both fields have content. The
segmented control changes mode without clearing the email; password content is cleared on a mode
change. Inline validation keeps the field in place and adds one message below it:

- `Enter an email address like you@example.com.`
- `Add a password to continue.`

The submit action is disabled until the local message is resolved. No reset or verification action
is shown.

### Loading — `submitting`

```text
┌────────────────────────────────────┐
│ [ Create account ]   Sign in        │
│ Create your account                │
│ Use your email and a password to   │
│ get started.                       │
│                                    │
│ Email       you@example.com        │
│ Password    ••••••••               │
│                                    │
│ [ ◌ Creating your account… ]        │
└────────────────────────────────────┘
```

In login mode the heading remains `Welcome back` and the button reads `Signing you in…`. Both
fields and the mode switch are disabled until the response arrives. On success, the returned opaque
session follows the same state-machine path as Apple: `GET /v1/me` supplies `onboardingState`, so a
new account opens Username, a completed account enters the authenticated app directly, and an
interrupted account resumes its server-authoritative step.

### Error — `server-error`

```text
┌────────────────────────────────────┐
│ Create your account                │
│                                    │
│ That email already has a Savoro    │
│ account — try signing in instead.  │
│                                    │
│ Email       you@example.com        │
│ Password    ••••••••               │
│                                    │
│ [ Try again ]                       │
└────────────────────────────────────┘
```

The card maps the named server outcomes to these exact user-facing messages:

- 409 in signup: `That email already has a Savoro account — try signing in instead.`
- 401 in login: `That email and password don’t match what we have.`
- 422 in signup: `Choose a longer password to keep your account safe.`
- Transport or unexpected response: `We couldn’t create that account right now. Try again.`
  In login mode, use `We couldn’t sign you in right now. Try again.`

`Try again` keeps both fields and resubmits the current mode. A 409 card also leaves the `Sign in`
segment available, so the person can switch modes without starting over. No response code or
service wording is rendered.

## 3. Username

**Build ticket:** P5.3 (`UsernameView.swift`).  
**Design decisions:** 4 (dedicated page for both auth methods), 5 (identity is complete before
onboarding ends and no internal identifier is shown), and 13.

A newly created Apple or email account arrives here when `GET /v1/me` reports the username step.
A returning completed account goes directly to the authenticated app, and an interrupted account
resumes the server-authoritative step reported by that response. The client mirrors the service
rule: 3–30 characters, lowercase letters and numbers, with hyphens or underscores only in the
middle. The field lowercases input and disables autocorrection.

### Normal — `empty`, `available`, `taken`, and `invalid`

```text
┌────────────────────────────────────┐
│ Choose your username               │
│ This is how people can find you    │
│ later.                             │
│                                    │
│ Username                           │
│ [ yourname                       ] │
│ 3–30 characters. Lowercase letters,│
│ numbers, hyphens, or underscores —  │
│ starting and ending with a letter   │
│ or number.                          │
│                                    │
│ Your username is yours to choose.  │
│                                    │
│ [ Continue ]                       │
└────────────────────────────────────┘
```

`Continue` is disabled for `empty` and `invalid`. For `available`, the status line reads `That name
is available.` and `Continue` is enabled. For `taken`, it reads `That name is in use. Try one of
these:` followed by two or three selectable suggestions such as `sunny-table`, `sunny-table-2`,
and `sunny_table`; each suggestion follows the same rule. For `invalid`, the status line reads `Use
the format shown above.` and the rules copy uses the focus treatment. Choosing a suggestion replaces
the field and starts a fresh availability check.

### Loading — `checkingAvailability`

```text
┌────────────────────────────────────┐
│ Choose your username               │
│                                    │
│ Username                           │
│ [ sunny-table                    ] │
│ [ ◌ Checking that name… ]           │
│ 3–30 characters. Lowercase letters,│
│ numbers, hyphens, or underscores —  │
│ starting and ending with a letter   │
│ or number.                          │
│                                    │
│ [ Continue ]                       │
└────────────────────────────────────┘
```

The field stays enabled so typing can cancel the prior debounce; `Continue` is disabled and the
availability status is replaced by the spinner line. A valid candidate starts one availability
request about 300 ms after typing stops. A local-rule mismatch makes no request.

### Error — `availability-error` or `save-error`

```text
┌────────────────────────────────────┐
│ Choose your username               │
│                                    │
│ Username                           │
│ [ sunny-table                    ] │
│                                    │
│ We couldn’t check that name right  │
│ now. Try again.                    │
│                                    │
│ [ Try again ]       [ Continue ]    │
└────────────────────────────────────┘
```

A check error uses `We couldn’t check that name right now. Try again.`; a save error uses
`We couldn’t save that name right now. Try again.`. The entered name and rules remain visible.
`Continue` stays disabled until a fresh availability result is available; only `Try again` is enabled
in this error state. `Try again` repeats only the relevant operation. A successful save advances from
the server response,
not from a client guess.

## 4. Profile basics

**Build ticket:** P5.4 (`ProfileBasicsView.swift`).  
**Design decisions:** 5 (identity fields are explicit and no internal value is displayed), 14
(private by default), and 13.

The display name is optional. This page explains the privacy default but does not ask for a sharing
choice and does not send a visibility field.

### Normal — `idle-empty` and `idle-filled`

```text
┌────────────────────────────────────┐
│ A little about you                │
│ Add a display name if you’d like. │
│                                    │
│ Display name (optional)            │
│ [ How should we call you?        ] │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Your space starts private      │ │
│ │ Your daily notes, targets, and │ │
│ │ progress stay private. Sharing │ │
│ │ recipes later is always a      │ │
│ │ separate choice.               │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ Continue ]                       │
└────────────────────────────────────┘
```

A blank field is valid and keeps `Continue` enabled. A filled value is trimmed and limited to the
service's 1–80 character range. The privacy card is informational only: there is no toggle or
picker. The blank request omits the display-name field entirely. The server response determines the
next step.

### Loading — `submitting`

```text
┌────────────────────────────────────┐
│ A little about you                │
│                                    │
│ Display name (optional)            │
│ How should we call you?            │
│                                    │
│ Your space starts private          │
│ Your daily notes, targets, and     │
│ progress stay private. Sharing     │
│ recipes later is always a separate  │
│ choice.                            │
│                                    │
│ [ ◌ Saving your profile… ]          │
└────────────────────────────────────┘
```

The field and continue action are disabled while the profile update is in flight. Entered text is
preserved and the page does not optimistically advance.

### Error — `error`

```text
┌────────────────────────────────────┐
│ A little about you                │
│                                    │
│ We couldn’t save this yet. Try     │
│ again when you’re ready.           │
│                                    │
│ [ Try again ]                       │
└────────────────────────────────────┘
```

`Try again` repeats the update with the same trimmed payload and preserves the blank optional path
when there is no display name. No privacy selector is introduced by the error state, and the page
does not advance until the server accepts the update.

## 5. Intent

**Build ticket:** P5.5 (`IntentView.swift`).  
**Design decision:** 8 (intent is a client-side routing hint, not identity), plus 13.

There are exactly three options. The choice is held in app state or local preferences, never in a
profile update or any other request. It selects the first tab and whether the targets page is
offered:

| Choice | First tab | Offer targets? |
| --- | --- | --- |
| `Track what I eat` | Today | Yes |
| `Build my recipe collection` | Cookbook | No |
| `Both` | Today | Yes |

### Normal — `unselected` and selected variants

```text
┌────────────────────────────────────┐
│ What brings you to Savoro?         │
│ Pick what you’d like to see first. │
│ You can change course anytime.     │
│                                    │
│ [ Track what I eat              ]  │
│ [ Build my recipe collection    ]  │
│ [ Both                          ]  │
│                                    │
│ This only sets your starting view. │
│                                    │
│ [ Continue ]                       │
└────────────────────────────────────┘
```

With no selection, `Continue` is disabled. One selected card uses the existing selection-card
state; the other two remain available. The three option labels never change and no fourth choice,
free-form field, or sharing question appears.

### Loading — `routing`

```text
┌────────────────────────────────────┐
│ What brings you to Savoro?         │
│                                    │
│ [✓ Track what I eat             ]  │
│ [ Build my recipe collection    ]  │
│ [ Both                          ]  │
│                                    │
│ [ ◌ Opening your starting view… ]  │
└────────────────────────────────────┘
```

The selected choice is retained; cards and continue are disabled for the short local transition.
No network call occurs. `Track what I eat` and `Both` route through the targets offer; `Build my
recipe collection` completes onboarding toward Cookbook.

### Error — `routing-error`

```text
┌────────────────────────────────────┐
│ What brings you to Savoro?         │
│                                    │
│ [✓ Track what I eat             ]  │
│ [ Build my recipe collection    ]  │
│ [ Both                          ]  │
│                                    │
│ We couldn’t open that view right  │
│ now. Try again.                    │
│                                    │
│ [ Try again ]                       │
└────────────────────────────────────┘
```

This state covers a local store or route handoff problem, not a service response. `Try again` uses
the retained choice. If the selected choice cannot be stored, the app keeps it in transient state
for the current flow and still does not add it to a request body.

## 6. Calories-first targets

**Build ticket:** P5.6 (`TargetsView.swift` and the reusable
`CaloriesFirstTargetsEditor.swift`).  
**Design decisions:** 6 (calories first, editable P/C/F values through the existing goal action), 7
(Skip is first-class and nil remains nil), and 13.

The editor starts with one calorie value. A valid value proposes a 30% protein / 40% carbohydrate /
30% fat split by calories, converted to whole grams. For 2,000 calories the proposal is Protein
150 g, Carbs 200 g, and Fat 67 g. Each gram field is editable independently; editing a field stops
its automatic derivation. Derived values are clamped to at least 1 g so a plausible calorie entry
never creates an unusable field.

### Normal — `empty`, `derived`, and `edited`

Empty:

```text
┌────────────────────────────────────┐
│ Set daily targets                  │
│ Start with calories. We’ll suggest │
│ a split you can adjust.            │
│                                    │
│ Daily calories                     │
│ [ 2,000                          ] │
│                                    │
│ [ Save targets ]  [ Skip for now ] │
│ You can add targets anytime from   │
│ Profile.                           │
└────────────────────────────────────┘
```

The empty-field example shows the input placeholder `2,000`; `Save targets` is disabled until the
calorie value is usable. `Skip for now` is a full-size, equally reachable secondary action, not a
small link.

Derived:

```text
┌────────────────────────────────────┐
│ Set daily targets                  │
│ Start with calories. We’ll suggest │
│ a split you can adjust.            │
│                                    │
│ Daily calories       2,000 cal     │
│ Suggested split                    │
│ Protein              150 g         │
│ Carbs                200 g         │
│ Fat                   67 g         │
│ Adjust any number to make this fit │
│ your day.                          │
│                                    │
│ [ Save targets ]  [ Skip for now ] │
└────────────────────────────────────┘
```

Edited uses the same layout, changes the section label to `Your split`, and keeps the helper
`Adjust any number to make this fit your day.`. All four values are visible before save. The app
validates that each is finite and above zero, then sends the existing four-value goal shape with
today's date. The date is not a new visible field.

### Loading — `submitting`

```text
┌────────────────────────────────────┐
│ Set daily targets                  │
│ Your values are ready to save.     │
│                                    │
│ Daily calories       2,000 cal     │
│ Protein              150 g         │
│ Carbs                200 g         │
│ Fat                   67 g         │
│                                    │
│ [ ◌ Saving targets… ]              │
│ [ Skip for now ]                   │
└────────────────────────────────────┘
```

All fields and both actions are disabled while the goal request is in flight. On success, the flow
returns to the intent-selected destination. Skip never starts a request and is available again as
soon as the editor is not submitting.

### Error — `error`

```text
┌────────────────────────────────────┐
│ Set daily targets                  │
│                                    │
│ We couldn’t save those targets     │
│ right now. Try again.              │
│                                    │
│ Use a number above zero for each   │
│ field.                             │
│                                    │
│ [ Try again ]   [ Skip for now ]   │
└────────────────────────────────────┘
```

The fields retain their values. Local validation places `Use a number above zero for each field.`
under the first field that needs attention; a transport issue uses `We couldn’t save those targets
right now. Try again.`. `Try again` repeats the save. `Skip for now` remains a complete alternate
path: it sends no goal request, sets no local goal, and lands in the goal-less Today mode.

## 7. Goal-less Today

**Build ticket:** P6.2 (`TodayPlaceholderView.swift`).  
**Design decision:** 7 (skipping is a complete mode with bare totals, no denominator, and one calm
way to add targets), plus 13 and 14.

This mode is deliberately not an empty shell. It uses the same page surface and card rhythm as the
rest of Today, but shows facts only. There is no ring, fraction, denominator, target comparison, or
progress support line. A single `Add daily targets` action routes to the reusable P5.6 editor.

### Normal — `goalless-empty-day`

```text
┌────────────────────────────────────┐
│ Today                              │
│ A calm check-in for what you’ve    │
│ logged today.                      │
│                                    │
│ Private nutrition space             │
│ Your daily notes stay private.     │
│ Recipes can be shared later.       │
│                                    │
│ A fresh day                        │
│ Nothing has been logged yet. Add   │
│ something whenever it feels useful;│
│ it stays private.                  │
│                                    │
│ Calories today                     │
│ 0 cal                              │
│                                    │
│ Today’s totals                     │
│ Protein  0 g   Carbs  0 g   Fat 0 g│
│                                    │
│ [ Add daily targets ]              │
│ Set them anytime from Profile if  │
│ you want a little context.         │
└────────────────────────────────────┘
```

`0 cal` and each `0 g` are bare values, not fractions. The single button is the only target-related
affordance on this surface.

### Normal — `goalless-with-logs`

```text
┌────────────────────────────────────┐
│ Today                              │
│ A calm check-in for what you’ve    │
│ logged today.                      │
│                                    │
│ Private nutrition space             │
│ Your daily notes stay private.     │
│ Recipes can be shared later.       │
│                                    │
│ Calories today                     │
│ 1,420 cal                          │
│                                    │
│ Today’s totals                     │
│ Protein  82 g  Carbs 190 g  Fat 48 g│
│                                    │
│ [ Add daily targets ]              │
│ Set them anytime from Profile if  │
│ you want a little context.         │
└────────────────────────────────────┘
```

The values remain bare when logs exist. No ring track or fill is calculated, and the macro rows do
not compare values with anything. After a successful target save, Today refreshes into the regular
targeted presentation; until then the optional values remain nil.

### Loading — `loading`

```text
┌────────────────────────────────────┐
│ Today                              │
│                                    │
│ [ ◌ Gathering your day ]            │
│ Your private log will be ready in  │
│ a moment.                          │
└────────────────────────────────────┘
```

The page shows no invented totals while the live day loads. The retry and target actions are not
shown until the day response is available.

### Error — `error`

```text
┌────────────────────────────────────┐
│ Today                              │
│                                    │
│ Your day needs a moment             │
│ We couldn’t load your day right    │
│ now. Your private log is safe. Try │
│ again when you’re ready.           │
│                                    │
│ [ Try again ]                       │
└────────────────────────────────────┘
```

`Try again` repeats the Today read. This surface contains no denominator or target-comparison
copy, even while the read is unavailable.

## 8. Profile account

**Build ticket:** P6.3 (`ProfilePlaceholderView.swift` replacement or `ProfileView.swift`).  
**Design decisions:** 1 (sign out returns to the common signed-out root), 5 (account fields never
fall back to internal values), 6 and 7 (reuse the complete targets editor and preserve nil), and 14
(private by default).

Profile has three sections: account information, daily targets, and the sign-out action. It reads the
current account and current goal; it never displays an internal account identifier. Editing saves a
complete new set of four target values through the existing goal action. The editor is the same one
used by onboarding.

### Normal — `targets-set`, `no-targets`, and `editing-targets`

Targets set:

```text
┌────────────────────────────────────┐
│ Profile                            │
│ Account                            │
│ Username       @sunnytable         │
│ Display name   Dylan               │
│ Email          dylan@example.com   │
│                                    │
│ Daily targets                      │
│ Calories       2,000 cal           │
│ Protein        150 g               │
│ Carbs          200 g               │
│ Fat            67 g                │
│                                    │
│ [ Edit daily targets ]             │
│                                    │
│ [ Sign out ]                       │
└────────────────────────────────────┘
```

No targets:

```text
┌────────────────────────────────────┐
│ Profile                            │
│ Account                            │
│ Username       @sunnytable         │
│ Display name   Dylan               │
│ Email          dylan@example.com   │
│                                    │
│ Daily targets                      │
│ No daily targets yet.              │
│ Add them anytime if you want       │
│ context.                           │
│ [ Add daily targets ]              │
│                                    │
│ [ Sign out ]                       │
└────────────────────────────────────┘
```

Editing:

```text
┌────────────────────────────────────┐
│ Edit daily targets                 │
│ Calories       [ 2,000 ] cal       │
│ Protein        [ 150   ] g         │
│ Carbs          [ 200   ] g         │
│ Fat            [ 67    ] g         │
│                                    │
│ [ Cancel ]       [ Save targets ]  │
└────────────────────────────────────┘
```

`Cancel` returns to the prior Profile state without changing Today. `Save targets` validates all
four values, saves a complete new set, and refreshes both Profile and Today. A nil current goal
keeps the no-targets state; it is not rendered as four zero values.

Sign-out confirmation is a local confirmation card, not a required network state:

```text
┌────────────────────────────────────┐
│ Sign out of Savoro?                │
│ Your daily notes will stay with    │
│ your account.                      │
│                                    │
│ [ Cancel ]       [ Sign out ]      │
└────────────────────────────────────┘
```

### Loading — `loading`, `saving-targets`, and `signing-out`

Profile read:

```text
┌────────────────────────────────────┐
│ Profile                            │
│ [ ◌ Loading your profile ]          │
│ Your account details will be here  │
│ in a moment.                       │
└────────────────────────────────────┘
```

While editing, the action reads `Saving targets…` and the four fields stay visible but disabled.
After confirming sign out, the action reads `Signing you out…`; the confirmation controls are
locked. The sequence is revoke session, clear local session storage, then transition to the welcome
root. If the network is unavailable, local clearing and the transition still happen; the person is
not left on a signed-in Profile screen.

### Error — `error`

```text
┌────────────────────────────────────┐
│ Profile                            │
│                                    │
│ Your profile needs a moment         │
│ We couldn’t load your account      │
│ details right now. Try again when  │
│ you’re ready.                      │
│                                    │
│ [ Try again ]                       │
└────────────────────────────────────┘
```

A target-save issue reuses `We couldn’t save those targets right now. Try again.` and preserves the
four entered values. `Try again` repeats only the read or save that produced the card. A sign-out
network miss is not used to keep the person on Profile: local session clearing wins and the next
screen is Welcome.

## Review checklist and traceability

- [x] Eight screens are specified in flow order, each with normal, loading, and error wireframes.
- [x] Apple and email converge on one session; both new-account paths arrive at the dedicated Username
      page, completed accounts enter the app directly, and interrupted accounts resume `onboardingState`.
- [x] Email forms include signup, login, inline validation, and distinct calm status copy.
- [x] Username availability is debounced, suggests valid alternatives, and shows the plain-language
      3–30 character rule.
- [x] Profile basics keeps display name optional and explains private-by-default behavior without a
      sharing control.
- [x] Intent has exactly `Track what I eat`, `Build my recipe collection`, and `Both`; it is
      client-side only.
- [x] Targets start with calories, show the editable 30/40/30 proposal, and make `Skip for now`
      a full-size first-class action.
- [x] Goal-less Today contains bare values and one `Add daily targets` affordance, with no ring
      denominator or progress comparison.
- [x] Profile covers current or nil targets, account fields, editing, and sign out, including the
      local-clear path when the network is unavailable.
- [x] All new surfaces use named L-35 primitives and leave pixel tuning to implementation review.

### Draft-copy self-check

The required lint intentionally matches only this inventory line, not any drafted user-facing
string: `adherence`, `compliance`, `failure`, `failed`, `over limit`, `guilt`, `cheat`, `bad food`,
`raw IDs`, `mock`, `scaffold`, and `backend jargon`.

The exact drafted strings above were reviewed for calm, plain-language copy. No internal response
codes, service envelopes, or account identifiers are included in a user-facing block.
