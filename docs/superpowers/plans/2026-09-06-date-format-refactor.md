# Date Format Refactor (DD/MM/YYYY) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all displayed dates across the application to standard `DD/MM/YYYY` format while keeping backend Firestore storage and HTML date inputs in ISO `YYYY-MM-DD`.

**Architecture:** Introduce a centralized Nuxt auto-imported utility `formatDisplayDate` in `app/utils/dateFormat.ts` that converts ISO date strings (`YYYY-MM-DD` or ISO timestamps) into `DD/MM/YYYY`. Integrate this utility across public pages, admin pages, social announcements, and CSV export.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Node.js

## Global Constraints
- Preserve existing Firestore data model (`date: "YYYY-MM-DD"`). Do not perform breaking database schema changes.
- HTML `<input type="date">` elements continue to bind to ISO `YYYY-MM-DD`.
- Keep banking transfer memo formatting (`BDM <date> <name>`) intact.
- Follow existing UI component and composable patterns per `AGENTS.md`.
- Ensure `npm run build` succeeds cleanly without type errors or warnings.

---

### Task 1: Centralized Date Utility (`app/utils/dateFormat.ts`)

**Files:**
- Create: `app/utils/dateFormat.ts`
- Test: `tests/utils/dateFormat.test.mjs`

**Interfaces:**
- Produces: `formatDisplayDate(dateStr?: string | null): string`
  - Input: `string | null | undefined` (e.g. `'2026-09-04'`)
  - Output: `string` in `'DD/MM/YYYY'` (e.g. `'04/09/2026'`)

- [ ] **Step 1: Write verification test script**

Create `tests/utils/dateFormat.test.mjs`:
```js
import assert from 'node:assert/strict';
import { formatDisplayDate } from '../../app/utils/dateFormat.ts';

// Test 1: Standard YYYY-MM-DD string
assert.equal(formatDisplayDate('2026-09-04'), '04/09/2026', 'Should convert YYYY-MM-DD to DD/MM/YYYY');
assert.equal(formatDisplayDate('2026-12-31'), '31/12/2026', 'Should convert end of year date');
assert.equal(formatDisplayDate('2026-01-05'), '05/01/2026', 'Should preserve leading zeros');

// Test 2: ISO timestamp string
assert.equal(formatDisplayDate('2026-09-04T15:30:00.000Z'), '04/09/2026', 'Should handle full ISO timestamp');

// Test 3: Already formatted string
assert.equal(formatDisplayDate('04/09/2026'), '04/09/2026', 'Should return already formatted DD/MM/YYYY as-is');

// Test 4: Falsy and edge case handling
assert.equal(formatDisplayDate(''), '', 'Empty string should return empty string');
assert.equal(formatDisplayDate(null), '', 'Null should return empty string');
assert.equal(formatDisplayDate(undefined), '', 'Undefined should return empty string');

console.log('✅ All dateFormat tests passed!');
```

- [ ] **Step 2: Run test to verify it fails initially**

Run: `node tests/utils/dateFormat.test.mjs`
Expected: FAIL with module not found or function not exported.

- [ ] **Step 3: Implement `formatDisplayDate` in `app/utils/dateFormat.ts`**

Write `app/utils/dateFormat.ts`:
```ts
/**
 * Formats a date string or timestamp into DD/MM/YYYY.
 *
 * @param dateStr - ISO string (YYYY-MM-DD), full ISO timestamp, or date string
 * @returns Formatted date string in DD/MM/YYYY, or empty string if input is falsy
 *
 * @example
 * formatDisplayDate('2026-09-04') // => '04/09/2026'
 * formatDisplayDate('2026-09-04T12:00:00Z') // => '04/09/2026'
 */
export const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Return as-is if already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Fast path for standard YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Fallback for full ISO timestamps or valid date strings
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/utils/dateFormat.test.mjs`
Expected: `✅ All dateFormat tests passed!`

- [ ] **Step 5: Commit**

```bash
git add app/utils/dateFormat.ts tests/utils/dateFormat.test.mjs
git commit -m "feat: add formatDisplayDate utility for DD/MM/YYYY formatting"
```

---

### Task 2: Refactor Public UI Pages (`index.vue`, `session/[id].vue`, `leaderboard.vue`)

**Files:**
- Modify: `app/pages/index.vue`
- Modify: `app/pages/session/[id].vue`
- Modify: `app/pages/leaderboard.vue`

**Interfaces:**
- Consumes: `formatDisplayDate(dateStr?: string | null): string` (auto-imported from `app/utils/dateFormat.ts`)

- [ ] **Step 1: Update `app/pages/index.vue`**

In `app/pages/index.vue`:
- Replace raw `{{ featuredSession.date }}` at line 108 with `{{ formatDisplayDate(featuredSession.date) }}`.
- Replace raw `{{ session.date }}` at line 217 with `{{ formatDisplayDate(session.date) }}`.

- [ ] **Step 2: Update `app/pages/session/[id].vue`**

In `app/pages/session/[id].vue`:
- Replace raw `{{ session.date }}` at line 290 with `{{ formatDisplayDate(session.date) }}`.

- [ ] **Step 3: Update `app/pages/leaderboard.vue`**

In `app/pages/leaderboard.vue`:
- At line 381, update:
  `{{ t('leaderboard.latestPlayed', { date: formatDisplayDate(player.lastPlayedDate) }) }}`

- [ ] **Step 4: Verify Nuxt builds cleanly**

Run: `npm run build`
Expected: Nuxt build passes without errors.

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue app/pages/session/[id].vue app/pages/leaderboard.vue
git commit -m "refactor(public): display session dates as DD/MM/YYYY"
```

---

### Task 3: Refactor Admin UI Pages (`admin/index.vue`, `admin/session/[id].vue`)

**Files:**
- Modify: `app/pages/admin/index.vue`
- Modify: `app/pages/admin/session/[id].vue`

**Interfaces:**
- Consumes: `formatDisplayDate(dateStr?: string | null): string`

- [ ] **Step 1: Update `app/pages/admin/index.vue`**

In `app/pages/admin/index.vue`:
- Line 190 in delete confirmation prompt:
  ```ts
  message: t('admin.deleteConfirmMsg', { date: formatDisplayDate(session.date), time: session.time }),
  ```
- Line 279 in session card header:
  ```vue
  <h3 class="text-2xl font-black tracking-tight text-brand-ink">{{ formatDisplayDate(session.date) }}</h3>
  ```
- Note: Keep `<input ref="dateInputRef" v-model="newSession.date" type="date" ... />` as-is.

- [ ] **Step 2: Update `app/pages/admin/session/[id].vue`**

In `app/pages/admin/session/[id].vue`:
- Line 492 in hero header:
  ```vue
  <h1 class="text-3xl font-black tracking-tight text-brand-ink sm:text-[2.5rem]">
    {{ formatDisplayDate(session.date) }}
  </h1>
  ```
- Note: Keep `<UIGlassInput v-model="editForm.date" type="date" ... />` as-is.

- [ ] **Step 3: Verify Nuxt builds cleanly**

Run: `npm run build`
Expected: Nuxt build passes without errors.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/index.vue app/pages/admin/session/[id].vue
git commit -m "refactor(admin): display session dates as DD/MM/YYYY"
```

---

### Task 4: Refactor Social Sharing and CSV Export Utilities

**Files:**
- Modify: `app/utils/sessionSocialShare.ts`
- Modify: `app/components/session/SocialShareModal.vue`
- Modify: `app/utils/sessionExport.ts`

**Interfaces:**
- Consumes: `formatDisplayDate(dateStr?: string | null): string`

- [ ] **Step 1: Update `app/utils/sessionSocialShare.ts`**

Import `formatDisplayDate` in `app/utils/sessionSocialShare.ts`:
```ts
import { formatDisplayDate } from './dateFormat';
```
Update `generateSessionInviteText`:
```ts
text += `📅 Ngày: ${formatDisplayDate(session.date)}\n`;
```
Update `generateSessionSettlementText`:
```ts
text += `📅 Ngày: ${formatDisplayDate(session.date)} | 📍 ${session.location || ''}\n`;
```

- [ ] **Step 2: Update `app/components/session/SocialShareModal.vue`**

Update lines 172 & 182 in `app/components/session/SocialShareModal.vue`:
```ts
title: `Badminton - ${formatDisplayDate(props.session?.date)}`,
```
(Keep `memoDate = props.session?.date ? props.session.date.replace(/-/g, '') : ''` intact for VietQR memo).

- [ ] **Step 3: Update `app/utils/sessionExport.ts`**

Import `formatDisplayDate` in `app/utils/sessionExport.ts`:
```ts
import { formatDisplayDate } from './dateFormat';
```
Update line 14:
```ts
csv += `Ngày,${formatDisplayDate(session.date)},Giờ,${session.time || ''}\r\n`;
```

- [ ] **Step 4: Verify test script and run tests**

Add social sharing and CSV export tests to `tests/utils/dateFormat.test.mjs`:
```js
import { generateSessionInviteText, generateSessionSettlementText } from '../../app/utils/sessionSocialShare.ts';

const mockSession = {
  date: '2026-09-04',
  time: '18:00 - 20:00',
  location: 'Sân Cầu Lông Quân Đội',
};

const inviteText = generateSessionInviteText(mockSession, 'https://example.com/session/123');
assert.ok(inviteText.includes('📅 Ngày: 04/09/2026'), 'Invite text should contain 04/09/2026');

const settlementText = generateSessionSettlementText(mockSession, [], { totalSessionCost: 200000 });
assert.ok(settlementText.includes('📅 Ngày: 04/09/2026'), 'Settlement text should contain 04/09/2026');
```
Run: `node tests/utils/dateFormat.test.mjs`
Expected: `✅ All dateFormat tests passed!`

- [ ] **Step 5: Commit**

```bash
git add app/utils/sessionSocialShare.ts app/components/session/SocialShareModal.vue app/utils/sessionExport.ts tests/utils/dateFormat.test.mjs
git commit -m "refactor(social,export): format dates as DD/MM/YYYY in announcements and CSV export"
```

---

### Task 5: End-to-End Build & Regression Verification

**Files:**
- Review: all modified files

- [ ] **Step 1: Run complete build**

Run: `npm run build`
Expected: Exit code 0, production build output generated in `.output/`.

- [ ] **Step 2: Clean up scratch test artifacts if needed**

Ensure temporary test files are either kept in `tests/` or organized properly.

- [ ] **Step 3: Final Commit**

```bash
git commit --allow-empty -m "chore: complete date format refactoring to DD/MM/YYYY"
```
