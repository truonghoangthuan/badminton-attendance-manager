# Badminton Attendance Manager

Nuxt 4 frontend for managing badminton sessions, collecting RSVPs, tracking court attendance, splitting session costs, and ranking community participation.

The app serves two flows backed by Firebase and Supabase:

- **Public flow** (`/`, `/session/:id`, `/leaderboard`): session discovery, anonymous RSVP with guest counts, live capacity & fee breakdown, dynamic VietQR payment, social share announcements, and community leaderboard analytics.
- **Admin flow** (`/admin/login`, `/admin`, `/admin/session/:id`): custom-claim protected session creation, capacity & court metadata management, on-court attendance & payment check-in, manual walk-in entries, QR/bank configuration, and CSV reporting.

## Feature Overview

### Public player experience

- Browse featured upcoming and recent sessions on the landing page (`/`).
- Switch between Vietnamese (`vi`, default) and English (`en`) via the header language switcher.
- Authenticate anonymously via Firebase Auth and persist `displayName` in Firestore (`profiles`).
- Submit or update RSVPs (`isJoining`, `guestCount`) while a session is `open`, subject to `maxPlayers` capacity limits.
- View live attendance status, court metadata (`courtNumber`, `shuttlecockType`, `level`), and real-time per-person fee calculation.
- Pay via dynamic VietQR (pre-filled with exact personalized fee and `BDM <date> <name>` transfer memo) or static QR uploaded to Supabase Storage, with 1-tap copy for bank details.
- Generate 1-click Zalo/Messenger invite and settlement announcements (with clipboard QR image copy).
- Explore the community leaderboard (`/leaderboard`) with timeframe filters (`all`, `this_month`, `custom` date range), top-3 podium, actual attendance vs total RSVPs (`matchesPlayed / totalRsvps`), reliability rates, and ranking rules modal.

### Admin experience

- Sign in with email/password at `/admin/login` (validated against Firebase custom claim `admin: true`).
- Create, edit, and delete sessions (cascading deletion to `sessions/{sessionId}/attendances`) with date, time, location, `maxPlayers`, court number, shuttlecock brand, and skill level.
- Transition session lifecycle between `open`, `locked`, and `completed` (with confirmation dialogs when completing or reopening).
- Check in attendees (`actualAttended`), record fee payments (`hasPaid`), and add manual walk-in players (`walkin_<timestamp>`).
- Configure court cost, shuttlecock count, and shuttlecock tube/unit pricing with automatic 1,000 VND rounding.
- Manage bank details (`bankName`, `bankCode`, `accountNumber`, `accountName`) with live VietQR preview and upload custom payment QR images to Supabase Storage.
- Export session metadata, financial summary, and attendance ledger to UTF-8 BOM CSV for Microsoft Excel compatibility.

## Route Map

- `/`: public landing page with featured upcoming session, recent sessions, and leaderboard CTA
- `/session/:id`: public session detail, RSVP form, attendance table, fee breakdown, and VietQR payment
- `/leaderboard`: community leaderboard, timeframe filter bar, and lifetime/period stats from completed sessions
- `/admin/login`: admin email/password sign-in page
- `/admin`: protected admin dashboard for session lifecycle and metadata management
- `/admin/session/:id`: protected admin control center for check-in, walk-ins, financials, QR/bank setup, and CSV export

## Tech Stack

- [Nuxt 4](https://nuxt.com/) + [Vue 3](https://vuejs.org/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + custom `UIGlass*` components
- [PrimeVue 4](https://primevue.org/) (`@primeuix/themes/aura` for Toast notifications)
- [Firebase Authentication](https://firebase.google.com/docs/auth) & [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Supabase Storage](https://supabase.com/docs/guides/storage) (`@nuxtjs/supabase` for custom payment QR images)
- [Lucide Vue Next](https://lucide.dev/)
- [Vercel Analytics](https://vercel.com/analytics) & [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- Node.js built-in test runner (`node --test`)

## How The App Works

### Authentication model

- Public players sign in anonymously via Firebase Auth (`useUserProfile`), storing `displayName` in `profiles/{uid}`.
- Admin routes require Firebase Auth email/password sign-in with custom claim `admin: true` (`useAdminAccess` + `app/middleware/auth.ts`).

### Session lifecycle

Each session moves through three states:

- `open`: players can submit or update RSVPs (gated by `maxPlayers` capacity, default `8`)
- `locked`: RSVPs are frozen; on-court attendance check-in and settlement are active
- `completed`: session is finalized and included in `/leaderboard` statistics

### Cost calculation

Shared financial math lives in `app/utils/sessionFinancials.ts`:

- **Shuttlecock unit price**: if `shuttlecockPackPrice > 0`, unit price is `Math.round((shuttlecockPackPrice / 12) / 1000) * 1000`; otherwise `shuttlecockPrice`.
- **Total session cost**: `courtCost + (shuttlecocksUsed * shuttlecockPrice)`.
- **Fee per person**: `Math.ceil(totalSessionCost / totalActualPlayers / 1000) * 1000` (rounded up to the nearest 1,000 VND; `0` when `totalActualPlayers <= 0`).
- **Actual player count**: counts `1 + guestCount` for each record where `actualAttended === true`.
- **Personal share**: `calculatedFeePerPerson * (1 + guestCount)` for attending players (`0` for absent players once locked/completed).

## Firebase & Supabase Setup

### Expected Firebase configuration

- Firebase Authentication enabled with **Anonymous** and **Email/Password** providers
- Cloud Firestore enabled with a collection group index on `attendances` if required by Firestore queries

### Firestore collections

- `sessions`: session documents (`date`, `time`, `location`, `maxPlayers`, `status`, `courtNumber`, `shuttlecockType`, `level`, `bankInfo`, `paymentQR`, `financials`)
- `sessions/{sessionId}/attendances`: RSVP and check-in records (`uid`, `name`, `isJoining`, `guestCount`, `actualAttended`, `hasPaid`, `isManual`, `updatedAt`)
- `profiles`: public user profiles (`displayName`, `isAnonymous`, `createdAt`, `updatedAt`)
- `roster`: optional legacy member lookup used as fallback greeting on `/`

### Supabase configuration

- Supabase Storage bucket `payment-qr-codes` with public read access for uploaded session QR images (`useSupabaseQRCode.ts`)

## Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase and Supabase credentials:

```bash
cp .env.example .env
```

```env
# Firebase Client Configuration
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-public-key

# Nuxt App Configuration
NUXT_APP_BASE_URL=/
```

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

## Project Structure

```text
app/
  assets/                 Global CSS and SVG assets
  components/
    UI/                   Glass UI primitives (GlassCard, GlassButton, GlassInput, GlassModal, ConfirmDialog, LanguageSwitcher)
    admin/                AdminQRCodeManager
    leaderboard/          TimeframeFilterBar, RankingRulesModal
    session/              QRCodeDisplay, SocialShareModal
    UsernamePrompt.vue    Public display-name onboarding modal
  composables/            useAdminAccess, useI18n, useSupabaseQRCode, useUIConfirm, useUserProfile
  layouts/                default.vue (public) and admin.vue (admin)
  locales/                Bilingual dictionaries (vi.ts, en.ts)
  middleware/             auth.ts (admin route protection)
  pages/                  /, /leaderboard, /session/[id], /admin, /admin/login, /admin/session/[id]
  types/                  Shared TypeScript interfaces (session.ts)
  utils/                  dateFormat, firebase, leaderboardStats, sessionExport, sessionFinancials, sessionSocialShare, vietqr
public/                   Static public assets
tests/                    Node test suites (*.test.mjs)
nuxt.config.ts            Nuxt 4, PrimeVue, Tailwind, Supabase, and Vercel module config
tailwind.config.ts        Tailwind theme and custom brand tokens
```

## Admin Authorization

Admin write operations and `/admin*` routes require a Firebase Auth user with custom claim:

- `admin: true`

### Provisioning an admin

1. Create or locate the email/password user in Firebase Console.
2. Assign custom claim `{ "admin": true }` to the user's UID via the Firebase Admin SDK.
3. Sign in at `/admin/login` (which forces a token refresh via `refreshAdminClaims(true)`).
4. Verify the **Dashboard** button appears in the public header and `/admin` is accessible.
