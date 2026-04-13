## Project Scope

This repository is the Nuxt 4 frontend for badminton session management. It has two product surfaces that share Firebase data but serve different users:

- Public flow at `/` and `/session/:id` for session discovery, RSVP submission, and fee/payment visibility
- Admin flow at `/admin`, `/admin/login`, and `/admin/session/:id` for authentication, session management, attendance tracking, and cost handling

Treat this as a live product UI backed by Firebase and Supabase. Prefer small, surgical changes over broad rewrites.

## Stack And Source Of Truth

- Framework: Nuxt 4 + Vue 3 + TypeScript
- Styling: Tailwind CSS with shared glass-style UI primitives under `app/components/UI`
- Data/auth: Firebase Auth + Firestore
- QR generation: VietQR URL builder in `app/utils/vietqr.ts`
- QR profile storage: Supabase Storage via `app/composables/useSupabaseQRCode.ts`
- UI feedback: PrimeVue `Toast` / `useToast`

If code and README disagree, follow the code and then update documentation if needed.

## Files To Read First

Read the page, composable, layout, and shared component files that govern the behavior you are about to change.

Core routes and state:

- `app/pages/index.vue`: public landing page, featured-session logic, and legacy greeting lookup from `localStorage` + `roster`
- `app/pages/session/[id].vue`: public RSVP flow, live attendance list, and fee display
- `app/pages/admin/index.vue`: session creation, editing, deletion, and status cycling
- `app/pages/admin/session/[id].vue`: attendance control, financial calculations, and QR/payment admin tools
- `app/pages/admin/login.vue`: admin email/password sign-in and admin-claim validation
- `app/composables/useUserProfile.ts`: anonymous auth, profile persistence, and payment QR profile fields
- `app/composables/useAdminAccess.ts`: admin claim refresh and auth state
- `app/middleware/auth.ts`: admin route protection and redirect behavior
- `app/utils/firebase.ts`: centralized Firebase initialization

Read these too when relevant:

- `app/layouts/default.vue`: shared public-shell behavior, profile editing modal, top-level public actions
- `app/layouts/admin.vue`: shared admin shell and sign-out behavior
- `app/components/UsernamePrompt.vue`: modal that blocks public flow until a display name exists
- `app/components/session/QRCodeDisplay.vue`: public payment QR rendering
- `app/components/admin/AdminQRCodeManager.vue`: admin-side payment QR rendering and expand behavior
- `app/components/UI/GlassCard.vue`
- `app/components/UI/GlassButton.vue`
- `app/components/UI/GlassInput.vue`
- `app/components/UI/GlassModal.vue`
- `app/components/UI/ConfirmDialog.vue`

## Required Working Style

Before editing:

- Read the relevant route, composable, layout, and shared component files first
- Preserve existing patterns unless there is a concrete reason to change them
- Keep public-flow and admin-flow responsibilities separate
- Do not refactor unrelated areas while implementing a focused change
- Check whether the behavior already exists in a shared composable or UI primitive before adding local logic

While editing:

- Prefer extending existing composables and shared UI components over duplicating logic
- Keep changes localized; avoid introducing new abstractions unless repetition or coupling justifies them
- Maintain the existing visual language used through the `UIGlass*` component auto-imports backed by files in `app/components/UI`
- Keep client-only auth logic safe for Nuxt by respecting existing `import.meta.client`, `import.meta.server`, `onMounted`, and `onUnmounted` patterns
- Keep Firestore field names stable unless a migration is explicitly part of the task

Before finishing:

- Re-read changed files for accidental behavior drift
- Run verification commands relevant to the change
- Do not claim success without reporting what you actually verified

## Verification Requirements

Minimum expectation for most code changes:

- `npm run build`

Use additional checks when applicable:

- For route or auth changes, trace the affected public/admin code paths and redirect behavior before finishing
- For attendance or cost changes, verify the computed totals and persisted financial fields remain internally consistent
- For profile or QR changes, verify both Firestore profile fields and Supabase-related behavior still line up
- For UI-only changes, still run `npm run build`

If a command cannot be run, say so clearly and explain why.

## Product Invariants

These rules should not change unless the user explicitly asks for product behavior changes.

### Session lifecycle

- Session statuses are `open`, `locked`, and `completed`
- Public RSVP submission is only available when a session is `open`
- Admin pages may reopen sessions by moving `completed -> locked` or `locked -> open`
- Deleting a session removes it from both admin and public listings

### Public user identity

- Public users are automatically signed in anonymously when needed
- A player name is stored in the `profiles` collection as `displayName`
- RSVP submission must not proceed without a display name
- Existing behavior supports saving a new display name during RSVP submission
- `app/pages/index.vue` still contains a separate legacy greeting lookup from `localStorage` key `badminton_user_id` and the `roster` collection; do not casually remove or repurpose that flow without updating the landing page behavior intentionally

### Admin access

- Admin pages depend on Firebase Auth email/password sign-in plus custom claim `admin: true`
- `app/pages/admin/login.vue` signs the user in first, then forces a claims refresh with `refreshAdminClaims(true)`
- Route middleware refreshes admin claims before allowing access
- Changes to admin auth must preserve redirect behavior to `/admin/login`

### Attendance model

- Attendance records live at `sessions/{sessionId}/attendances`
- Public RSVP submission currently writes:
  - `uid`
  - `name`
  - `isJoining`
  - `guestCount`
  - `actualAttended`
  - `hasPaid`
  - `updatedAt`
- Current public behavior sets `actualAttended` equal to `isJoining` on submission and initializes `hasPaid` to `false`
- Admin tools later toggle attendance and payment-related fields directly on the attendance document

### Cost calculation

- Total session cost is:
  - `courtCost + (shuttlecocksUsed * shuttlecockPrice)`
- Fee per person is:
  - `totalSessionCost / totalActualPlayers`
- `totalActualPlayers` counts one player plus their guests only when `actualAttended` is true
- Guests are included in the cost split
- The admin session page persists `financials.calculatedFeePerPerson` from the computed value
- The public session page independently computes and displays the live fee from session financials plus current attendance data, so any formula change must be updated in both public and admin flows

## Data And Integration Constraints

- Firebase initialization is centralized in `app/utils/firebase.ts`; do not create ad hoc app instances
- User profile data lives in Firestore `profiles`
- QR code uploads use Supabase Storage and the public URL is stored on the user profile as `paymentQR`
- Admin and public payment QR displays derive from the VietQR utility; keep amount/date inputs aligned if changing payment behavior
- Be careful when changing profile fields because they affect both identity and payment QR behavior

## UI And UX Constraints

- Preserve the existing branded visual direction
- Reuse shared UI primitives before creating new one-off button/input/card/modal patterns
- Keep status colors and badges semantically aligned across public and admin pages
- Avoid introducing dense enterprise-style layouts that conflict with the current product feel
- Respect the existing split between public default layout and admin layout instead of recreating shell behavior inside pages

## Change Risk Checklist

Double-check these areas before shipping:

- Admin auth still works when claims are absent, stale, or refreshed after login
- Public RSVP still works for first-time anonymous users
- Session status still correctly gates public actions
- Attendance totals and guest counts still line up between public and admin views
- Fee-per-person math still matches the persisted financial fields
- Any QR code changes still keep Firestore profile state, VietQR generation, and Supabase storage behavior aligned
- Shared `UIGlass*` component usage still matches the styles and props expected by the rest of the app

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run generate`

Prefer `rg` for code search.
