# Leaderboard: Actual Attendance vs Total RSVPs Display

## Overview
Enhance the Member Directory table on the `/leaderboard` page to display each player's actual session attendance in comparison to their total RSVPs (e.g., `17 / 20 RSVPs`).

## User Experience & UI Details

### Leaderboard Table Cell ("Sessions Attended")
Currently, the "Sessions Attended" column (`sessionsAttended`) renders only `player.matchesPlayed` with `{count} matches` / `{count} buổi`.

With this enhancement, the cell displays the relationship between matches attended and total sessions RSVP'd:
- Prominently displays the attended count and the total RSVP count:
  - Format: `<span class="font-black text-brand-ink text-base">{{ player.matchesPlayed }}</span><span class="text-xs font-bold text-brand-slate"> / {{ player.totalRsvps }}</span>`
  - Secondary label: `<span class="text-[11px] text-brand-slate block font-medium">{{ t('leaderboard.rsvpsCount', { count: player.totalRsvps }) }}</span>` or unified label `{{ t('leaderboard.attendedRatio', { attended: player.matchesPlayed, total: player.totalRsvps }) }}`.

## Data Model & Logic (`app/pages/leaderboard.vue`)

1. **Interface Update**:
   ```typescript
   interface PlayerStats {
     rank?: number;
     name: string;
     matchesPlayed: number;
     totalRsvps: number;
     reliabilityRate: number;
     lastPlayedDate: string;
   }
   ```

2. **Computation in `allPlayers`**:
   - `stat.matches`: Number of filtered sessions where `att.actualAttended === true`.
   - `stat.rsvps`: Number of filtered sessions where `att.isJoining === true`.
   - In mapping to `PlayerStats`:
     - `totalRsvps: Math.max(stat.matches, stat.rsvps)` ensures that players who attended as walk-ins or manual entries without a prior explicit RSVP are never shown with fewer RSVPs than matches attended.
     - `reliabilityRate`: Computed as `stat.rsvps > 0 ? Math.round((stat.matches / stat.rsvps) * 100) : 100`, capped at 100%.

## Localization (`app/locales/en.ts`, `app/locales/vi.ts`)
- Add key in `leaderboard` namespace:
  - `en.ts`: `attendedRatio: '{attended} / {total} RSVPs'` or subtext `rsvpsLabel: '{count} RSVPs'`
  - `vi.ts`: `attendedRatio: '{attended} / {total} buổi hẹn'` or subtext `rsvpsLabel: '{count} lượt đăng ký'`

## Verification
- Verify build with `npm run build`.
- Inspect layout on both desktop and mobile viewports to ensure no column distortion or broken wrapping.
