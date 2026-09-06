# Date Format Refactor Design (DD/MM/YYYY)

## Problem Statement
Currently, session dates across the application are displayed in raw ISO format `YYYY-MM-DD` (e.g. `2026-09-04`). The user requested that all dates displayed across the project be refactored to use slash format `DD/MM/YYYY` (e.g. `04/09/2026`).

## Goals
- Format all displayed session dates as `DD/MM/YYYY` across public and admin interfaces.
- Format dates in social sharing templates (Zalo/Messenger invites and settlement announcements).
- Format dates in CSV exported reports.
- Maintain Firestore schema compatibility and query functionality (`orderBy('date', 'desc')`).
- Maintain native HTML5 `<input type="date">` compatibility (`YYYY-MM-DD`).

## Architecture & Design

### 1. Centralized Date Utility (`app/utils/dateFormat.ts`)
A dedicated utility function `formatDisplayDate(dateStr?: string | null): string`:
- Input: String, null, or undefined.
- Logic:
  1. Return empty string for falsy/empty values.
  2. If already `DD/MM/YYYY`, return as-is.
  3. Match `YYYY-MM-DD` pattern: extract `year`, `month`, `day`, return `${day}/${month}/${year}`.
  4. If ISO 8601 timestamp (e.g. `2026-09-04T10:00:00Z`), parse with `Date` and return padded `${day}/${month}/${year}`.
  5. Fallback: return raw string if format cannot be determined.
- Nuxt auto-imports all exports from `app/utils/`, making `formatDisplayDate` globally available in all Vue templates, script setups, composables, and utility modules without explicit import statements.

### 2. Affected Surfaces

1. **Public Homepage (`app/pages/index.vue`)**:
   - Featured upcoming session banner: `{{ formatDisplayDate(featuredSession.date) }}`
   - Additional sessions card list: `{{ formatDisplayDate(session.date) }}`

2. **Public Session Details (`app/pages/session/[id].vue`)**:
   - Session header: `{{ formatDisplayDate(session.date) }}`

3. **Public Leaderboard (`app/pages/leaderboard.vue`)**:
   - Player's latest game played: `{{ t('leaderboard.latestPlayed', { date: formatDisplayDate(player.lastPlayedDate) }) }}`

4. **Admin Session List (`app/pages/admin/index.vue`)**:
   - Session card header: `{{ formatDisplayDate(session.date) }}`
   - Delete confirmation dialog message: `t('admin.deleteConfirmMsg', { date: formatDisplayDate(session.date), time: session.time })`

5. **Admin Session Detail (`app/pages/admin/session/[id].vue`)**:
   - Hero header: `{{ formatDisplayDate(session.date) }}`

6. **Social Sharing Announcements (`app/utils/sessionSocialShare.ts`)**:
   - Session invite text: `📅 Ngày: ${formatDisplayDate(session.date)}`
   - Session settlement text: `📅 Ngày: ${formatDisplayDate(session.date)} | 📍 ${session.location}`

7. **Social Share Modal (`app/components/session/SocialShareModal.vue`)**:
   - Native OS share dialog title: `title: Badminton - ${formatDisplayDate(props.session?.date)}`

8. **Session CSV Report Export (`app/utils/sessionExport.ts`)**:
   - CSV header row: `Ngày,${formatDisplayDate(session.date)},Giờ,...`

## Invariants Preserved
- Firestore documents retain `date: "YYYY-MM-DD"`.
- Admin forms continue to bind `<input type="date">` to `YYYY-MM-DD`.
- VietQR transfer note memo (`BDM 20260904 NAME`) continues to work without disruption.
