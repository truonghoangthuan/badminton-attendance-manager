## Project Scope

This repository is the Nuxt 4 frontend for badminton session management. It has two product surfaces that share Firebase data but serve different users:

- Public flow at `/`, `/session/:id`, and `/leaderboard` for session discovery, RSVP submission, fee/payment visibility, and community attendance rankings
- Admin flow at `/admin`, `/admin/login`, and `/admin/session/:id` for authentication, session management, attendance tracking, and cost handling

Treat this as a live product UI backed by Firebase and Supabase. Prefer small, surgical changes over broad rewrites.

## Stack And Source Of Truth

- Framework: Nuxt 4 + Vue 3 + TypeScript
- Styling: Tailwind CSS with shared glass-style UI primitives under `app/components/UI`
- Localization (i18n): Bilingual Vietnamese (`vi`, default) and English (`en`) via `app/composables/useI18n.ts`, `app/locales/vi.ts`, `app/locales/en.ts`, and `app/components/UI/LanguageSwitcher.vue`
- Data/auth: Firebase Auth + Firestore
- Session QR storage: Supabase Storage via `app/composables/useSupabaseQRCode.ts` (stored on session document as `paymentQR`)
- Payment & banking: Smart 1-tap copy for `bankInfo` (`bankName`, `bankCode`, `accountNumber`, `accountName`) and dynamic VietQR transfer notes (`addInfo`: `BDM <date> <name>`) in `app/components/session/QRCodeDisplay.vue` and `app/utils/vietqr.ts`
- Financial & leaderboard math: `app/utils/sessionFinancials.ts` and `app/utils/leaderboardStats.ts`
- UI feedback & dialogs: PrimeVue `Toast` / `useToast` and custom confirmation state via `app/composables/useUIConfirm.ts` + `app/components/UI/ConfirmDialog.vue`
- Telemetry: `@vercel/analytics` and `@vercel/speed-insights`
- Tests: Node.js built-in test runner (`npm test` -> `node --test tests/*.test.mjs`)

If code and README disagree, follow the code and then update documentation if needed.

## Files To Read First

Read the page, composable, layout, and shared component files that govern the behavior you are about to change.

Core routes and state:

- `app/pages/index.vue`: public landing page, nearest upcoming featured-session logic, community leaderboard teaser, and personal greeting via `useUserProfile`
- `app/pages/session/[id].vue`: public RSVP flow, live attendance list, court capacity meter, personalized cost breakdown, dynamic VietQR, match metadata chips, and social announcement generator
- `app/pages/leaderboard.vue`: community member directory, timeframe filtering (`all`, `this_month`, `custom`), lifetime game analytics from completed sessions via `collectionGroup(db, 'attendances')`, actual attendance vs total RSVPs, and top attendance podium
- `app/pages/admin/index.vue`: session creation, editing, cascade deletion (deleting `sessions/{id}/attendances` before the session document), max capacity limits, court metadata (court number, shuttle brand, skill level), and status cycling
- `app/pages/admin/session/[id].vue`: attendance check-in, walk-in manual player entry, guest-aware debt tracking, financial calculations, dynamic VietQR preview, CSV export, and social announcement sharing
- `app/pages/admin/login.vue`: admin email/password sign-in and admin-claim validation
- `app/composables/useUserProfile.ts`: singleton anonymous auth listener and profile persistence (`displayName`)
- `app/composables/useAdminAccess.ts`: singleton admin auth listener, `authStateReady()` synchronization, and custom claim refresh
- `app/composables/useI18n.ts`: cookie + `localStorage` backed locale state (`vi`/`en`) and `t()` translation helper
- `app/composables/useUIConfirm.ts`: reactive confirmation dialog state used across admin flows
- `app/composables/useSupabaseQRCode.ts`: Supabase Storage upload/remove helper for custom session QR images
- `app/locales/vi.ts` & `app/locales/en.ts`: Vietnamese and English translation dictionaries
- `app/middleware/auth.ts`: admin route protection and redirect behavior
- `app/utils/firebase.ts`: centralized Firebase initialization
- `app/utils/sessionFinancials.ts`: shared financial calculations (`getShuttlecockPriceFromPack`, `resolveShuttlecockPrice`, `calculateTotalSessionCost`, `calculateFeePerPerson`, `getSessionFinancialBreakdown`)
- `app/utils/leaderboardStats.ts`: pure leaderboard aggregation and tie-breaking (`calculatePlayerStats`), counting only `completed` sessions
- `app/utils/dateFormat.ts`: `formatDisplayDate` (`DD/MM/YYYY`) formatter
- `app/utils/vietqr.ts`: dynamic VietQR open standard URL builder with bank BIN/alias lookup, exact fee encoding (`amount`), and memo encoding (`addInfo`)
- `app/utils/sessionSocialShare.ts`: 1-click Zalo/Messenger formatted announcement and settlement generators
- `app/utils/sessionExport.ts`: CSV report exporter with UTF-8 BOM for Microsoft Excel Vietnamese compatibility
- `app/types/session.ts`: shared TypeScript definitions for `Session`, `SessionMetadata`, `SessionFinancials`, `BankInfo`, and `SKILL_LEVEL_OPTIONS`

Read these too when relevant:

- `app/layouts/default.vue`: shared public-shell behavior, language switcher, profile editing modal, leaderboard link, top-level public actions
- `app/layouts/admin.vue`: shared admin shell, language switcher, and sign-out behavior
- `app/components/UsernamePrompt.vue`: modal that blocks public flow until a display name exists
- `app/components/session/QRCodeDisplay.vue`: dynamic VietQR switcher with exact fee pre-filling and 1-tap copy mobile banking display
- `app/components/session/SocialShareModal.vue`: modal for 1-tap copy of invite & settlement announcements and PNG-converted QR image clipboard copy
- `app/components/admin/AdminQRCodeManager.vue`: admin-side payment QR uploading, bank selector, and dynamic VietQR live preview
- `app/components/leaderboard/TimeframeFilterBar.vue`: leaderboard timeframe mode (`all`, `this_month`, `custom`) and date range controls
- `app/components/leaderboard/RankingRulesModal.vue`: modal explaining leaderboard ranking criteria and tie-breakers
- `app/components/UI/GlassCard.vue`
- `app/components/UI/GlassButton.vue`
- `app/components/UI/GlassInput.vue`
- `app/components/UI/GlassModal.vue`
- `app/components/UI/ConfirmDialog.vue`
- `app/components/UI/LanguageSwitcher.vue`

## Required Working Style

Before editing:

- Read the relevant route, composable, layout, and shared component files first
- Preserve existing patterns unless there is a concrete reason to change them
- Keep public-flow and admin-flow responsibilities separate
- Do not refactor unrelated areas while implementing a focused change
- Check whether the behavior already exists in a shared composable, utility, or UI primitive before adding local logic

While editing:

- Prefer extending existing composables, utils, and shared UI components over duplicating logic
- Keep changes localized; avoid introducing new abstractions unless repetition or coupling justifies them
- Maintain the existing visual language used through the `UIGlass*` component auto-imports backed by files in `app/components/UI`
- Add or update translation keys in both `app/locales/vi.ts` and `app/locales/en.ts` when changing user-facing text
- Keep client-only auth logic safe for Nuxt by respecting existing `import.meta.client`, `import.meta.server`, `onMounted`, and `onUnmounted` patterns
- Keep Firestore field names stable unless a migration is explicitly part of the task

Before finishing:

- Re-read changed files for accidental behavior drift
- Run verification commands relevant to the change
- Do not claim success without reporting what you actually verified

## Verification Requirements

Minimum expectation for code changes:

- `npm test`
- `npm run build`

Use additional checks when applicable:

- For route or auth changes, trace the affected public/admin code paths and redirect behavior before finishing
- For attendance, leaderboard, or cost changes, verify unit tests in `tests/` and ensure computed totals and persisted financial fields remain internally consistent
- For localization changes, verify key parity between `app/locales/vi.ts` and `app/locales/en.ts` (`tests/i18n.test.mjs`)
- For profile or QR changes, verify both Firestore profile fields and Supabase-related behavior still line up
- For UI-only changes, still run `npm test` and `npm run build`

If a command cannot be run, say so clearly and explain why.

## Product Invariants

These rules should not change unless the user explicitly asks for product behavior changes.

### Session lifecycle

- Session statuses are `open`, `locked`, and `completed`
- Public RSVP submission is only available when a session is `open`
- Admin pages may reopen sessions by moving `completed -> locked` or `locked -> open` (with confirmation when completing or reopening completed sessions)
- Deleting a session cascades deletion to its `sessions/{sessionId}/attendances` subcollection and removes it from both admin and public listings
- Sessions have a `maxPlayers` capacity limit (default 8) that enforces slot limits on RSVP

### Public user identity

- Public users are automatically signed in anonymously when needed (`useUserProfile`)
- A player name is stored in the `profiles` collection as `displayName`
- RSVP submission must not proceed without a display name
- Existing behavior supports saving a new display name during RSVP submission
- `app/pages/index.vue` supports personal greeting through `useUserProfile` while preserving fallback `roster` greeting compatibility

### Admin access

- Admin pages depend on Firebase Auth email/password sign-in plus custom claim `admin: true`
- `useAdminAccess` awaits `auth.authStateReady()` on the client before checking `auth.currentUser` and registers its `onAuthStateChanged` listener once per client session
- `app/pages/admin/login.vue` signs the user in first, then forces a claims refresh with `refreshAdminClaims(true)`
- Route middleware refreshes admin claims before allowing access
- Changes to admin auth must preserve redirect behavior to `/admin/login`

### Attendance & leaderboard model

- Attendance records live at `sessions/{sessionId}/attendances`
- Public RSVP submission writes:
  - `uid`
  - `name`
  - `isJoining`
  - `guestCount` (clamped to non-negative integer `>= 0`)
  - `actualAttended`
  - `hasPaid`
  - `updatedAt`
- Public RSVP submission preserves existing `actualAttended` status (or initializes to `false`) and existing `hasPaid` status (or initializes to `false`). Physical check-in is verified on court by organizers.
- Admin walk-in entries write custom IDs (`walkin_<timestamp>`) with `isManual: true`.
- Admin tools toggle attendance (`actualAttended`) and payment (`hasPaid`) fields directly on the attendance document.
- Leaderboard stats (`app/utils/leaderboardStats.ts`) only include sessions with `status === 'completed'`, batching attendance reads via `collectionGroup(db, 'attendances')` and ranking players by `matchesPlayed`, `reliabilityRate`, `lastPlayedDate`, and `name`.
- Unpaid session fees are aggregated across sessions using `calculateUnpaidSummary(sessions, attendancesBySession)` in `app/utils/sessionFinancials.ts`, powering the `unpaid` tab on `/admin` with 1-tap `hasPaid: true` settlement.

### Cost calculation

- All financial math is centralized in `app/utils/sessionFinancials.ts`:
  - Shuttlecock unit price (`resolveShuttlecockPrice`): if `shuttlecockPackPrice > 0`, `Math.round((shuttlecockPackPrice / 12) / 1000) * 1000`; otherwise `shuttlecockPrice`
  - Total session cost (`calculateTotalSessionCost`): `courtCost + (shuttlecocksUsed * shuttlecockPrice) + (additionalShuttlecocksUsed * additionalShuttlecockPrice)`
  - Fee per person (`calculateFeePerPerson`): `Math.ceil(totalSessionCost / totalActualPlayers / 1000) * 1000` (rounded up to the nearest 1,000 VND; `0` when `totalActualPlayers <= 0`)
- `totalActualPlayers` counts one player plus their guests (`1 + guestCount`) only when `actualAttended` is true
- Guests are included in the cost split
- Individual debts are calculated as `calculatedFeePerPerson * (1 + guestCount)` for attendees who attended (`0` for absent players once locked/completed)
- Additional shuttlecock pricing (`additionalShuttlecockPrice`) is inherited when creating new sessions from the latest session, while `additionalShuttlecocksUsed` initializes to `0`
- Leaderboard total shuttlecocks used aggregates both `shuttlecocksUsed` and `additionalShuttlecocksUsed`
- The admin session page persists `financials.calculatedFeePerPerson` from the computed value
- Both public (`app/pages/session/[id].vue`) and admin (`app/pages/admin/session/[id].vue`) flows must use `app/utils/sessionFinancials.ts` so fee calculations stay identical

## Data And Integration Constraints

- Firebase initialization is centralized in `app/utils/firebase.ts`; do not create ad hoc app instances
- User profile data lives in Firestore `profiles`
- QR code uploads use Supabase Storage and the public URL is stored on the session document as `paymentQR`
- Mobile banking transfer details are stored on the session document as `bankInfo` (`bankName`, `bankCode`, `accountNumber`, `accountName`)
- VietQR URLs encode the transfer note in the `addInfo` query parameter (`app/utils/vietqr.ts`)
- Be careful when changing profile fields because they affect identity across the app

## UI And UX Constraints

- Preserve the existing branded visual direction
- Reuse shared UI primitives (`UIGlass*` and `useUIConfirm`) before creating new one-off button/input/card/modal patterns
- Keep status colors and badges semantically aligned across public and admin pages
- Avoid introducing dense enterprise-style layouts that conflict with the current product feel
- Respect the existing split between public default layout and admin layout instead of recreating shell behavior inside pages
- In sidebar cards and narrow containers (<450px wide, such as `AdminQRCodeManager.vue`), avoid multi-column grids (`lg:grid-cols-4`) that cause severe label wrapping and input truncation; prefer clean stacked 2-column layouts (`sm:grid-cols-2`) and full-width action buttons.

## Change Risk Checklist

Double-check these areas before shipping:

- Admin auth still works when claims are absent, stale, or refreshed after login or page reload
- Public RSVP still works for first-time anonymous users and preserves local edits while typing
- Session status still correctly gates public actions and leaderboard inclusion
- Attendance totals and guest counts still line up between public, admin, and leaderboard views
- Fee-per-person math still matches `app/utils/sessionFinancials.ts` and persisted financial fields
- Translation keys exist in both `app/locales/vi.ts` and `app/locales/en.ts`
- Any QR code or bank detail changes keep session state, Supabase storage, VietQR parameters, and clipboard copy functions aligned
- Shared `UIGlass*` component usage still matches the styles and props expected by the rest of the app

## Commands

- `npm install`
- `npm run dev`
- `npm test`
- `npm run build`
- `npm run preview`
- `npm run generate`

Prefer `codegraph_explore` (when `.codegraph/` is present) and `rg` for code search. Always quote file paths with brackets in zsh (e.g. `"app/pages/admin/session/[id].vue"`).
