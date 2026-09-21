# Leaderboard: Actual Attendance vs Total RSVPs Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the ratio of actual matches attended versus total RSVPs (e.g., `17 / 20 RSVPs`) in the "Sessions Attended" column of the leaderboard table.

**Architecture:** Extract player leaderboard statistics calculation into a testable pure utility `app/utils/leaderboardStats.ts` with TDD via `node:test`, update localization keys for English and Vietnamese, and update `app/pages/leaderboard.vue` to use the utility and render the enhanced count and ratio in the table.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS, `node:test`.

## Global Constraints

- Preserve all existing leaderboard ranking order, sorting priority, and tiebreaker criteria.
- Invariants: `totalRsvps` must be at least equal to `matchesPlayed` (`Math.max(matches, rsvps)`) to handle manual/walk-in check-in records cleanly.
- Keep English (`app/locales/en.ts`) and Vietnamese (`app/locales/vi.ts`) key parity in sync.
- Verification must include `node --test tests/*.mjs` and `npm run build`.

---

### Task 1: Add i18n Keys for Attended vs RSVPs Ratio

**Files:**
- Modify: `app/locales/en.ts`
- Modify: `app/locales/vi.ts`
- Test: `tests/i18n.test.mjs`

**Interfaces:**
- Produces: `leaderboard.attendedVsRsvps` and `leaderboard.rsvpsLabel` i18n strings.

- [x] **Step 1: Run existing i18n test to verify baseline**

Run: `node --test tests/i18n.test.mjs`
Expected: PASS

- [x] **Step 2: Add localization keys to `app/locales/en.ts` and `app/locales/vi.ts`**

In `app/locales/en.ts` under `leaderboard`:
```typescript
attendedVsRsvps: '{attended} / {total} RSVPs',
rsvpsLabel: '{count} RSVPs',
```

In `app/locales/vi.ts` under `leaderboard`:
```typescript
attendedVsRsvps: '{attended} / {total} lượt đăng ký',
rsvpsLabel: '{count} lượt đăng ký',
```

- [x] **Step 3: Run i18n parity test to verify**

Run: `node --test tests/i18n.test.mjs`
Expected: PASS with 0 missing keys.

- [x] **Step 4: Commit**

```bash
git add app/locales/en.ts app/locales/vi.ts
git commit -m "feat(i18n): add attended vs rsvps labels to leaderboard translations"
```

---

### Task 2: Create `app/utils/leaderboardStats.ts` with TDD

**Files:**
- Create: `app/utils/leaderboardStats.ts`
- Test: `tests/leaderboardStats.test.mjs`

**Interfaces:**
- Produces:
  ```typescript
  export interface RawAttendance {
    name: string;
    isJoining: boolean;
    actualAttended: boolean;
    guestCount?: number;
  }

  export interface RawSessionItem {
    id?: string;
    date: string;
    shuttlecocksUsed?: number;
    attendances: RawAttendance[];
  }

  export interface PlayerStats {
    rank?: number;
    name: string;
    matchesPlayed: number;
    totalRsvps: number;
    reliabilityRate: number;
    lastPlayedDate: string;
  }

  export function calculatePlayerStats(sessions: RawSessionItem[]): PlayerStats[];
  ```

- [x] **Step 1: Write failing unit test `tests/leaderboardStats.test.mjs`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayerStats } from '../app/utils/leaderboardStats.ts';

test('calculatePlayerStats correctly computes matches, totalRsvps, and reliabilityRate', () => {
  const sessions = [
    {
      date: '2026-09-01',
      attendances: [
        { name: 'Alice', isJoining: true, actualAttended: true },
        { name: 'Bob', isJoining: true, actualAttended: false },
        { name: 'Charlie', isJoining: false, actualAttended: true }, // walkin
      ],
    },
    {
      date: '2026-09-08',
      attendances: [
        { name: 'Alice', isJoining: true, actualAttended: true },
        { name: 'Bob', isJoining: true, actualAttended: true },
      ],
    },
  ];

  const stats = calculatePlayerStats(sessions);

  // Alice: 2 matches, 2 rsvps -> 100%
  // Bob: 1 match, 2 rsvps -> 50%
  // Charlie: 1 match, 0 rsvps recorded -> totalRsvps = Math.max(1, 0) = 1, 100%
  assert.equal(stats.length, 3);

  const alice = stats.find(p => p.name === 'Alice');
  assert.deepEqual(alice, {
    rank: 1,
    name: 'Alice',
    matchesPlayed: 2,
    totalRsvps: 2,
    reliabilityRate: 100,
    lastPlayedDate: '2026-09-08',
  });

  const bob = stats.find(p => p.name === 'Bob');
  assert.equal(bob.matchesPlayed, 1);
  assert.equal(bob.totalRsvps, 2);
  assert.equal(bob.reliabilityRate, 50);

  const charlie = stats.find(p => p.name === 'Charlie');
  assert.equal(charlie.matchesPlayed, 1);
  assert.equal(charlie.totalRsvps, 1);
  assert.equal(charlie.reliabilityRate, 100);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/leaderboardStats.test.mjs`
Expected: FAIL (module not found).

- [x] **Step 3: Implement `app/utils/leaderboardStats.ts`**

```typescript
export interface RawAttendance {
  name: string;
  isJoining: boolean;
  actualAttended: boolean;
  guestCount?: number;
}

export interface RawSessionItem {
  id?: string;
  date: string;
  shuttlecocksUsed?: number;
  attendances: RawAttendance[];
}

export interface PlayerStats {
  rank?: number;
  name: string;
  matchesPlayed: number;
  totalRsvps: number;
  reliabilityRate: number;
  lastPlayedDate: string;
}

export function calculatePlayerStats(sessions: RawSessionItem[]): PlayerStats[] {
  const statsMap: Record<string, { matches: number; rsvps: number; lastDate: string }> = {};

  for (const session of sessions) {
    const sessionDate = (session.date || '').split('T')[0];
    for (const att of session.attendances || []) {
      const name = att.name;
      if (!name) continue;

      if (!statsMap[name]) {
        statsMap[name] = { matches: 0, rsvps: 0, lastDate: '' };
      }

      if (att.isJoining) {
        statsMap[name].rsvps += 1;
      }

      if (att.actualAttended) {
        statsMap[name].matches += 1;
        if (!statsMap[name].lastDate || sessionDate > statsMap[name].lastDate) {
          statsMap[name].lastDate = sessionDate;
        }
      }
    }
  }

  return Object.entries(statsMap)
    .filter(([_, stat]) => stat.matches > 0)
    .map(([name, stat]) => {
      const totalRsvps = Math.max(stat.matches, stat.rsvps);
      const reliability = stat.rsvps > 0 ? Math.round((stat.matches / stat.rsvps) * 100) : 100;
      return {
        name,
        matchesPlayed: stat.matches,
        totalRsvps,
        reliabilityRate: Math.min(100, reliability),
        lastPlayedDate: stat.lastDate,
      };
    })
    .sort((a, b) => {
      if (b.matchesPlayed !== a.matchesPlayed) {
        return b.matchesPlayed - a.matchesPlayed;
      }
      if (b.reliabilityRate !== a.reliabilityRate) {
        return b.reliabilityRate - a.reliabilityRate;
      }
      const dateComparison = (b.lastPlayedDate || '').localeCompare(a.lastPlayedDate || '');
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return a.name.localeCompare(b.name);
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/leaderboardStats.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/utils/leaderboardStats.ts tests/leaderboardStats.test.mjs
git commit -m "feat: implement calculatePlayerStats utility with totalRsvps support"
```

---

### Task 3: Update `app/pages/leaderboard.vue` to Render Attendance vs RSVPs

**Files:**
- Modify: `app/pages/leaderboard.vue`

**Interfaces:**
- Consumes: `calculatePlayerStats`, `PlayerStats` from `app/utils/leaderboardStats.ts`
- Renders:
  - In `Sessions Attended` table cell:
    - Primary: `<span class="font-black text-brand-ink text-base">{{ player.matchesPlayed }}</span>`
    - Separator & total: `<span class="text-xs font-bold text-brand-slate"> / {{ player.totalRsvps }}</span>`
    - Subtitle / badge: `<p class="text-[11px] font-medium text-brand-slate">{{ t('leaderboard.rsvpsLabel', { count: player.totalRsvps }) }}</p>`

- [x] **Step 1: Update `app/pages/leaderboard.vue`**

Replace local interfaces and `allPlayers` calculation logic with `calculatePlayerStats`:
```typescript
const allPlayers = computed<PlayerStats[]>(() => calculatePlayerStats(filteredSessions.value));
```
Update the table cell for `Sessions Attended` in `app/pages/leaderboard.vue`:
```html
<!-- Matches -->
<td class="px-5 py-4 text-center">
  <div class="inline-flex items-baseline gap-1">
    <span class="font-black text-brand-ink text-base">{{ player.matchesPlayed }}</span>
    <span class="text-xs font-bold text-brand-slate">/ {{ player.totalRsvps }}</span>
  </div>
  <p class="text-[11px] font-medium text-brand-slate">
    {{ t('leaderboard.rsvpsLabel', { count: player.totalRsvps }) }}
  </p>
</td>
```

- [x] **Step 2: Run all unit tests**

Run: `node --test tests/*.mjs`
Expected: All 14 tests pass.

- [x] **Step 3: Run production build verification**

Run: `npm run build`
Expected: Build succeeds without TypeScript or Vite errors.

- [x] **Step 4: Commit**

```bash
git add app/pages/leaderboard.vue
git commit -m "feat(leaderboard): display actual attendance vs total RSVPs in table"
```

---

## Verification Plan

### Automated Tests
- `node --test tests/*.mjs`:
  - `i18n.test.mjs` verifying key parity across EN and VI.
  - `leaderboardStats.test.mjs` verifying `totalRsvps`, `matchesPlayed`, `reliabilityRate`, tie-breaking, and walk-in fallback.
- `npm run build`:
  - Full Nuxt 4 production build and TypeScript compilation.

### Manual Verification
- Navigate to `/leaderboard` on desktop and mobile viewports.
- Verify that every row in the table shows the format:
  ```
  12 / 14
  14 RSVPs
  ```
- Toggle timeframes ("All Time", "This Month", "Custom") and ensure attendance vs RSVP counts update dynamically.
