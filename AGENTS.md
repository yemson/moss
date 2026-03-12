# AGENTS

## Project Shape
- This is an iOS-first Expo Router app.
- Keep the structure flat and simple:
  - Routes in `src/app`
  - Reusable UI in `src/components`
  - Non-UI logic in `src/lib`
- Avoid re-introducing `features/`, `screens/`, or deep folder hierarchies.

## Architecture Rules
- Route files own page composition and route-level state.
- Reusable UI blocks live in `src/components/...`.
- Shared non-UI logic lives in `src/lib/...`.
- Prefer route-local state over new global stores.
- Avoid new caching layers unless there is a clear product need. This app mostly uses direct SQLite reads.

## Data Rules
- Source of truth is SQLite in `src/lib/subscription-store.ts`.
- Home and detail screens re-read data with `useFocusEffect`.
- Create/edit screens load categories on mount.
- Recurring billing calculations and D-day behavior should use device local date, not UTC date boundaries.
- Do not add speculative network/data abstractions for local-only problems.

## UI / UX Principles
- The app aims for a balance between compact and comfy.
- Prefer simple, obvious UI over defensive or heavily abstracted UI states.
- Avoid over-engineered empty/loading/error branches unless they are user-visible and necessary.
- iOS is the target platform. Do not add Android-specific branches unless explicitly requested.

## Home Screen Conventions
- Empty home state is a full-page empty view.
- In empty state:
  - Hide title/summary/list content
  - Keep the top toolbar
  - Keep the floating `+` button
- Category filter and sort control are separate components:
  - `src/components/subscriptions/subscription-category-filter.tsx`
  - `src/components/subscriptions/subscription-sort-select.tsx`
- Category filter uses HeroUI `TagGroup` with horizontal scrolling.
- Sort uses HeroUI `Select` popover, not a menu.

## Subscription Card Conventions
- No pin feature.
- No card footer.
- Secondary line shows category on the left and billing info on the right.
- D-day badge sits inline with billing text: `... 결제 / 오늘|N일 후`.
- Swipe actions are on the right side:
  - Near the card: edit
  - Outer edge: delete
- Swipe action buttons use spring scale, but keep the implementation simple.

## Navigation Conventions
- `new` subscription opens as a modal route.
- Open `new` from home with `router.push("/subscriptions/new")`.
- Create/edit success should usually return with `router.back()`, then rely on focus re-query.
- Avoid `replace` unless the UX specifically requires replacing history.
- New subscription modal allows gesture dismiss only on step 1.
- After the user advances past step 1, prefer explicit close handling with a confirmation alert instead of silent dismiss.

## Form Conventions
- Shared form UI lives in `src/components/subscriptions/subscription-form.tsx`.
- New subscription uses the step flow in `src/components/subscriptions/subscription-create-flow.tsx`.
- Edit subscription continues to use the shared single-screen form in `src/components/subscriptions/subscription-form.tsx`.
- Date picking uses HeroUI `BottomSheet`, not `Dialog`.
- In the create flow, step 1 is a dedicated template-selection screen.
- If the user switches from a template back to `직접 입력`, clear template-filled name/category state instead of preserving it.
- Shared edit form still uses HeroUI `Select` with `popover` for template/category controls.

## Template / Logo Rules
- Templates are defined in `src/lib/subscription-templates.ts`.
- Keep template definitions easy to extend: key, name, category, optional logo, optional logo fit.
- Template logos currently use local image assets via `require(...)`.
- If a template has no logo, fall back to the initial-letter badge.
- Logo badges use a white background by default.

## Currency / Amount Rules
- `currencyDisplayMode` and `themeMode` are persisted in app settings.
- KRW input is integer-only.
- USD input supports up to 2 decimal places.
- Formatting rules:
  - KRW: no decimals
  - USD: up to 2 decimals
- When sorting by `큰 금액 순`, compare mixed currencies in KRW terms using the stored USD/KRW exchange rate.
- If exchange rate data is unavailable, USD subscriptions sort after KRW subscriptions for amount-desc ordering.

## Theming
- Theme and currency display settings are persisted through `src/lib/app-settings.tsx`.
- App startup applies saved theme before rendering UI.
- Do not introduce additional settings providers for one-off settings.

## Notifications
- Global notification settings are persisted in `src/lib/app-settings.tsx`.
- Per-subscription day-before alerts are stored in SQLite and synchronized through `src/lib/subscription-notifications.ts`.
- Notification scheduling is aggregated: if multiple subscriptions are due on the same next day, schedule a single grouped notification instead of one per subscription.
- Development-only notification testing lives under `src/app/dev/...` and should stay hidden outside `__DEV__`.

## Summary Card Conventions
- The large summary amount on home represents the remaining scheduled amount for the current month.
- The smaller gray amount beside it represents the full current-month billing amount, including charges earlier in the same month.
- Both summary amounts exclude active trials.

## Implementation Style
- Prefer modifying existing code paths over adding new systems.
- Prefer explicit small helpers over generalized abstractions.
- If a solution feels like “building infrastructure,” it is probably too much for this app.
