# Badminton Attendance Manager Frontend

Nuxt 4 frontend for managing badminton sessions, collecting RSVPs, tracking attendance, and calculating per-player session costs. The app has two sides:

- A public flow where players can open a session link, identify themselves, and submit an RSVP.
- An admin flow where organizers create sessions, monitor attendance, lock or complete sessions, and manage cost splitting.

## Feature Overview

### Public player experience

- Browse recent and upcoming badminton sessions from the landing page.
- Open a dedicated session page for a specific date and location.
- Join anonymously through Firebase Authentication and save a display name in Firestore.
- RSVP as attending or unavailable.
- Add guest count to an RSVP.
- See live response counts and the current calculated fee per player.

### Admin experience

- Sign in through Firebase Authentication at `/admin/login`.
- View all sessions from a protected admin dashboard.
- Create new sessions with date, time, and location.
- Copy a public session link to share with players.
- Change session state between `open`, `locked`, and `completed`.
- Open a session control page to monitor attendance and payment status.
- Track expected players, actual attendees, unpaid players, and total session cost.
- Update financial inputs such as court cost, shuttlecocks used, and shuttlecock price.

## Route Map

- `/`: public landing page showing featured and recent sessions
- `/session/:id`: public RSVP page for a single session
- `/admin/login`: admin sign-in page
- `/admin`: protected admin dashboard for session management
- `/admin/session/:id`: protected admin detail page for attendance and financial tracking

## Tech Stack

- [Nuxt 4](https://nuxt.com/)
- [Vue 3](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Pinia](https://pinia.vuejs.org/)
- [PrimeVue](https://primevue.org/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Lucide Vue Next](https://lucide.dev/)

## How The App Works

### Authentication model

- Public players are signed in anonymously through Firebase Auth.
- A player display name is stored in the `profiles` collection.
- Admin pages use Firebase Auth email/password sign-in and a Nuxt route middleware guard.

### Session lifecycle

Each session moves through three states:

- `open`: players can still submit or update RSVPs
- `locked`: RSVP collection is frozen and the session is ready for final attendance and payment handling
- `completed`: session is closed

### Cost calculation

The admin session page calculates the fee per player using:

`courtCost + (shuttlecocksUsed * shuttlecockPrice)`

That total is divided by the number of actual attendees, including guests counted against confirmed attendance records.

## Firebase Setup

This frontend expects a Firebase project with:

- Authentication enabled
- Anonymous authentication enabled for public player access
- Email/password authentication enabled for admin access
- Cloud Firestore enabled

The repository includes Firestore security rules in [`firestore.rules`](/Users/truonghoangthuan/Documents/Coding/personal/badminton-attendance-manager/badminton-attendance-manager-frontend/firestore.rules).

### Expected Firestore collections

- `sessions`
  - stores session metadata such as `date`, `time`, `location`, `status`, and `financials`
- `sessions/{sessionId}/attendances`
  - stores RSVP and attendance records per authenticated user
- `profiles`
  - stores public player profile data such as `displayName`
- `roster`
  - legacy or admin-managed member list used by the landing page for saved identity lookup

## Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase client configuration:

```bash
cp .env.example .env
```

```env
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_APP_BASE_URL=/
```

## Local Development

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Nuxt will start the local development server and hot-reload changes automatically.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Generate a static build

```bash
npm run generate
```

## Project Structure

```text
app/
  assets/css/             Global styles
  components/             Shared UI and form components
  composables/            Reusable state and auth/profile logic
  layouts/                Default and admin layouts
  middleware/             Route protection for admin pages
  pages/                  Public and admin route pages
  utils/                  Firebase initialization
public/                   Static assets
nuxt.config.ts            Nuxt configuration and runtime config
tailwind.config.ts        Tailwind configuration
firestore.rules           Firestore security rules
```

## Scripts

- `npm run dev`: start the Nuxt development server
- `npm run build`: create a production build
- `npm run preview`: preview the production build locally
- `npm run generate`: generate a static site build

## Notes For Maintainers

- Public session access depends on anonymous Firebase Auth being available in the browser.
- Admin page protection is implemented in Nuxt middleware, so Firebase Auth must be configured correctly before testing admin flows.
- The public landing page currently reads from both `sessions` and `roster`, so the frontend assumes that legacy roster data may still exist.
- Firestore rules currently allow public reads for sessions, attendances, profiles, and roster, while write access is restricted by authenticated user identity for `profiles` and `attendances`.

## Status

This README documents the frontend app in `badminton-attendance-manager-frontend` only. If the full project later gains a root-level backend or deployment workflow, document those separately at the repository root.
