## Project Scope

This repository is the Nuxt 4 frontend for badminton session management. It has two distinct product surfaces:

- Public flow at `/` and `/session/:id` for player RSVP and payment visibility
- Admin flow at `/admin`, `/admin/login`, and `/admin/session/:id` for session management, attendance tracking, and cost handling

Treat this as a live product UI backed by Firebase and Supabase. Prefer small, surgical changes over broad rewrites.

## Stack And Source Of Truth

- Framework: Nuxt 4 + Vue 3 + TypeScript
- Styling: Tailwind CSS with shared glass-style UI components in `app/components/UI`
- Data/auth: Firebase Auth + Firestore
- QR storage: Supabase Storage via `app/composables/useSupabaseQRCode.ts`

Read these files before changing related behavior:

- `app/pages/index.vue`: public landing page and featured-session logic
- `app/pages/session/[id].vue`: public RSVP flow and fee display
- `app/pages/admin/index.vue`: session creation, edit, delete, status cycling
- `app/pages/admin/session/[id].vue`: attendance control and financial calculations
- `app/composables/useUserProfile.ts`: anonymous auth, profile persistence, QR profile fields
- `app/composables/useAdminAccess.ts`: admin claim refresh and auth state
- `app/middleware/auth.ts`: admin route protection
- `app/utils/firebase.ts`: Firebase initialization

If code and README disagree, follow the code and then update documentation if needed.

## Required Working Style

Before editing:

- Read the relevant page, composable, and shared component files first
- Preserve existing patterns unless there is a concrete reason to change them
- Keep public-flow and admin-flow responsibilities separate
- Do not refactor unrelated areas while implementing a focused change

While editing:

- Prefer extending current composables and shared UI components over duplicating logic
- Keep changes localized; avoid introducing new abstractions unless repetition or coupling justifies them
- Maintain the current visual language used by `UIGlassCard`, `UIGlassButton`, `UIGlassInput`, and related components
- Keep client-only auth logic safe for Nuxt by respecting existing `import.meta.client` and `onMounted` patterns

Before finishing:

- Re-read changed files for accidental behavior drift
- Run verification commands relevant to the change
- Do not claim success without reporting what you actually verified

## Verification Requirements

Minimum expectation for most code changes:

- `npm run build`

Use additional checks when applicable:

- For route or auth changes, verify the affected public/admin page logic in code paths before finishing
- For cost or attendance changes, verify the computed totals and persisted fields remain internally consistent
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
- A player name is stored in the `profiles` collection
- RSVP submission must not proceed without a display name
- Existing behavior supports saving a new display name during RSVP submission

### Admin access

- Admin pages depend on Firebase Auth email/password sign-in plus custom claim `admin: true`
- Route middleware refreshes admin claims before allowing access
- Changes to admin auth must preserve redirect behavior to `/admin/login`

### Attendance model

- Attendance records live at `sessions/{sessionId}/attendances`
- RSVP submission currently writes:
  - `isJoining`
  - `guestCount`
  - `actualAttended`
  - `hasPaid`
  - `updatedAt`
- Current behavior sets `actualAttended` equal to `isJoining` on public submission and initializes `hasPaid` to `false`
- Admin tools can later toggle attendance/payment-related fields

### Cost calculation

- Total session cost is:
  - `courtCost + (shuttlecocksUsed * shuttlecockPrice)`
- Fee per person is:
  - `totalSessionCost / totalActualPlayers`
- `totalActualPlayers` counts one player plus their guests only when `actualAttended` is true
- Guests are included in the cost split
- The admin session page persists `financials.calculatedFeePerPerson` from the computed value

Any change to attendance or financial logic must preserve these relationships or intentionally update them everywhere they are used.

## Data And Integration Constraints

- Firebase initialization is centralized in `app/utils/firebase.ts`; do not create ad hoc app instances
- QR code uploads use Supabase Storage and the public URL is stored on the user profile
- Be careful when changing profile fields because they affect both identity and payment QR behavior
- Keep Firestore field names stable unless a migration is explicitly part of the task

## UI And UX Constraints

- Preserve the existing visual direction; this project already has a defined branded style
- Reuse shared UI primitives before creating new one-off button/input/card patterns
- Keep status colors and badges semantically aligned across public and admin pages
- Avoid introducing dense enterprise-style layouts that conflict with the current product feel

## Change Risk Checklist

Double-check these areas before shipping:

- Admin auth still works when claims are absent or stale
- Public RSVP still works for first-time anonymous users
- Session status still correctly gates public actions
- Attendance totals and guest counts still line up between public and admin views
- Fee-per-person math still matches the persisted financial fields
- Any QR code changes still keep Firestore profile state and Supabase storage behavior aligned

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run generate`

Prefer `rg` for code search.
