# Admin Unpaid Summary Tab, Additional Shuttlecocks & Bank Input UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an unpaid-fee player summary tab on `/admin`, support additional shuttlecock count and unit price in session fee calculations, and fix the cramped 4-column bank account form in `AdminQRCodeManager.vue`.

**Architecture:** Extend `app/utils/sessionFinancials.ts` with `additionalShuttlecocksUsed` / `additionalShuttlecockPrice` cost math plus a pure `calculateUnpaidSummary` aggregator that groups unpaid checked-in attendances by player across sessions. Wire the new financial fields through `app/pages/admin/session/[id].vue`, `app/pages/admin/index.vue`, `app/pages/session/[id].vue`, `app/components/session/QRCodeDisplay.vue`, `app/utils/sessionSocialShare.ts`, `app/utils/sessionExport.ts`, and `app/pages/leaderboard.vue`. Replace the broken `lg:grid-cols-4` bank form in `app/components/admin/AdminQRCodeManager.vue` with a clean full/2-column stacked grid and full-width save button.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Firebase Firestore (`collectionGroup` with per-session fallback), PrimeVue (`InputNumber`, `Toast`), Node.js built-in test runner (`node --test`).

## Global Constraints

- Preserve all product invariants in `AGENTS.md` (existing Firestore field names remain backward-compatible, `calculateFeePerPerson` rounds up to nearest `1,000` VND, only `actualAttended && !hasPaid` count as unpaid debts).
- Maintain 100% key parity between `app/locales/en.ts` and `app/locales/vi.ts` (`tests/i18n.test.mjs`).
- Follow Ponytail rules: reuse `app/utils/sessionFinancials.ts` for all math and unpaid aggregation instead of creating new utility files or abstractions.
- Both `npm test` and `npm run build` must pass before completion.

---

### Task 1: Additional Shuttlecock Math & Unpaid Summary Aggregator in `sessionFinancials.ts`

**Files:**
- Modify: `app/types/session.ts`
- Modify: `app/utils/sessionFinancials.ts`
- Modify: `tests/sessionFinancials.test.mjs`

**Interfaces:**
- Produces in `app/utils/sessionFinancials.ts`:
  - Extended `SessionFinancials` with `additionalShuttlecocksUsed?: number` and `additionalShuttlecockPrice?: number`
  - Extended `getSessionFinancialBreakdown` returning `packShuttlecockCost`, `additionalShuttlecocksUsed`, `additionalShuttlecockPrice`, `additionalShuttlecockCost`, and updated `shuttlecockCost` + `totalSessionCost`
  - `calculateUnpaidSummary(sessions: any[], attendancesBySessionId: Record<string, any[]> | Map<string, any[]>): UnpaidPlayerSummary[]`

- [x] **Step 1: Write the failing tests in `tests/sessionFinancials.test.mjs`**

Append tests for additional shuttlecocks and `calculateUnpaidSummary` to `tests/sessionFinancials.test.mjs`:

```js
import {
  roundToNearestThousand,
  getShuttlecockPriceFromPack,
  resolveShuttlecockPrice,
  calculateTotalSessionCost,
  calculateFeePerPerson,
  getSessionFinancialBreakdown,
  calculateUnpaidSummary,
} from '../app/utils/sessionFinancials.ts';

test('calculateTotalSessionCost and getSessionFinancialBreakdown include additional shuttlecocks', () => {
  const financials = {
    courtCost: 225000,
    shuttlecocksUsed: 9,
    shuttlecockPackPrice: 300000, // 25,000 per shuttle
    additionalShuttlecocksUsed: 2,
    additionalShuttlecockPrice: 30000,
  };
  const b = getSessionFinancialBreakdown(financials, 8);
  assert.equal(b.shuttlecockPrice, 25000);
  assert.equal(b.packShuttlecockCost, 225000);
  assert.equal(b.additionalShuttlecocksUsed, 2);
  assert.equal(b.additionalShuttlecockPrice, 30000);
  assert.equal(b.additionalShuttlecockCost, 60000);
  assert.equal(b.shuttlecockCost, 285000);
  assert.equal(b.totalSessionCost, 510000);
  assert.equal(b.feePerPerson, 64000);
});

test('calculateUnpaidSummary aggregates unpaid checked-in players and guests across sessions', () => {
  const sessions = [
    {
      id: 's1',
      date: '2026-10-20',
      time: '19:00',
      location: 'Court A',
      financials: { calculatedFeePerPerson: 60000 },
    },
    {
      id: 's2',
      date: '2026-10-25',
      time: '19:00',
      location: 'Court B',
      financials: { courtCost: 200000, shuttlecocksUsed: 4, shuttlecockPackPrice: 240000 },
    },
  ];

  const attendancesBySession = {
    s1: [
      { id: 'a1', name: 'Nam', actualAttended: true, hasPaid: false, guestCount: 1 },
      { id: 'a2', name: 'Minh', actualAttended: true, hasPaid: true, guestCount: 0 },
      { id: 'a3', name: 'Ghost', actualAttended: false, hasPaid: false, guestCount: 0 },
    ],
    s2: [
      { id: 'a4', name: 'nam', actualAttended: true, hasPaid: false, guestCount: 0 },
      { id: 'a5', name: 'Lan', actualAttended: true, hasPaid: false, guestCount: 2 },
    ],
  };

  // In s2, totalActualPlayers = 1 (nam) + 3 (Lan + 2 guests) = 4. Total cost = 200k + 80k = 280k -> 70k/person.
  const summary = calculateUnpaidSummary(sessions, attendancesBySession);
  assert.equal(summary.length, 2);

  // Lan owes 3 * 70,000 = 210,000
  assert.equal(summary[0].name, 'Lan');
  assert.equal(summary[0].totalSlots, 3);
  assert.equal(summary[0].totalOwed, 210000);
  assert.equal(summary[0].sessions.length, 1);

  // Nam owes (2 * 60,000) in s1 + (1 * 70,000) in s2 = 190,000
  assert.equal(summary[1].name, 'Nam');
  assert.equal(summary[1].totalSlots, 3);
  assert.equal(summary[1].totalOwed, 190000);
  assert.equal(summary[1].sessions.length, 2);
  assert.equal(summary[1].sessions[0].sessionId, 's2'); // newer date first
  assert.equal(summary[1].sessions[1].sessionId, 's1');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/sessionFinancials.test.mjs`
Expected: FAIL (`calculateUnpaidSummary` not exported and `additionalShuttlecockCost` undefined).

- [x] **Step 3: Update `app/types/session.ts` and `app/utils/sessionFinancials.ts`**

In `app/types/session.ts`, update `SessionFinancials`:

```ts
export interface SessionFinancials {
  courtCost: number;
  shuttlecocksUsed: number;
  shuttlecockPackPrice?: number;
  shuttlecockPrice: number;
  additionalShuttlecocksUsed?: number;
  additionalShuttlecockPrice?: number;
  calculatedFeePerPerson: number;
}
```

In `app/utils/sessionFinancials.ts`, update the types and functions:

```ts
export type SessionFinancials = {
  courtCost?: number;
  shuttlecocksUsed?: number;
  shuttlecockPackPrice?: number;
  shuttlecockPrice?: number;
  additionalShuttlecocksUsed?: number;
  additionalShuttlecockPrice?: number;
  calculatedFeePerPerson?: number;
};

export interface UnpaidSessionItem {
  sessionId: string;
  attendanceId: string;
  date: string;
  time: string;
  location: string;
  guestCount: number;
  slots: number;
  feePerPerson: number;
  amountOwed: number;
}

export interface UnpaidPlayerSummary {
  name: string;
  totalSlots: number;
  totalOwed: number;
  sessions: UnpaidSessionItem[];
}

const SHUTTLECOCKS_PER_PACK = 12;
const PRICE_ROUNDING_STEP = 1000;

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 0;
};

export const roundToNearestThousand = (value: number) => {
  return Math.round(value / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
};

export const getShuttlecockPriceFromPack = (packPrice: number) => {
  if (packPrice <= 0) {
    return 0;
  }

  return roundToNearestThousand(packPrice / SHUTTLECOCKS_PER_PACK);
};

export const resolveShuttlecockPrice = (financials?: SessionFinancials | null) => {
  const packPrice = toNumber(financials?.shuttlecockPackPrice);

  if (packPrice > 0) {
    return getShuttlecockPriceFromPack(packPrice);
  }

  return toNumber(financials?.shuttlecockPrice);
};

export const calculateTotalSessionCost = (financials?: SessionFinancials | null) => {
  const courtCost = Math.max(0, toNumber(financials?.courtCost));
  const shuttlecocksUsed = Math.max(0, toNumber(financials?.shuttlecocksUsed));
  const shuttlecockPrice = Math.max(0, resolveShuttlecockPrice(financials));
  const additionalShuttlecocksUsed = Math.max(0, toNumber(financials?.additionalShuttlecocksUsed));
  const additionalShuttlecockPrice = Math.max(0, toNumber(financials?.additionalShuttlecockPrice));

  return (
    courtCost +
    shuttlecocksUsed * shuttlecockPrice +
    additionalShuttlecocksUsed * additionalShuttlecockPrice
  );
};

export const calculateFeePerPerson = (totalSessionCost: number, totalActualPlayers: number) => {
  if (totalActualPlayers <= 0) {
    return 0;
  }

  return Math.ceil(totalSessionCost / totalActualPlayers / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
};

export const getSessionFinancialBreakdown = (
  financials: SessionFinancials | null | undefined,
  totalActualPlayers: number,
) => {
  const courtCost = Math.max(0, toNumber(financials?.courtCost));
  const shuttlecocksUsed = Math.max(0, toNumber(financials?.shuttlecocksUsed));
  const shuttlecockPackPrice = Math.max(0, toNumber(financials?.shuttlecockPackPrice));
  const rawShuttlecockPrice = shuttlecockPackPrice > 0 ? shuttlecockPackPrice / SHUTTLECOCKS_PER_PACK : 0;
  const shuttlecockPrice = Math.max(0, resolveShuttlecockPrice(financials));
  const packShuttlecockCost = shuttlecocksUsed * shuttlecockPrice;
  const additionalShuttlecocksUsed = Math.max(0, toNumber(financials?.additionalShuttlecocksUsed));
  const additionalShuttlecockPrice = Math.max(0, toNumber(financials?.additionalShuttlecockPrice));
  const additionalShuttlecockCost = additionalShuttlecocksUsed * additionalShuttlecockPrice;
  const shuttlecockCost = packShuttlecockCost + additionalShuttlecockCost;
  const totalSessionCost = courtCost + shuttlecockCost;
  const rawFeePerPerson = totalActualPlayers > 0 ? totalSessionCost / totalActualPlayers : 0;
  const feePerPerson = calculateFeePerPerson(totalSessionCost, totalActualPlayers);

  return {
    courtCost,
    shuttlecocksPerPack: SHUTTLECOCKS_PER_PACK,
    shuttlecocksUsed,
    shuttlecockPackPrice,
    rawShuttlecockPrice,
    shuttlecockPrice,
    packShuttlecockCost,
    additionalShuttlecocksUsed,
    additionalShuttlecockPrice,
    additionalShuttlecockCost,
    shuttlecockCost,
    totalSessionCost,
    rawFeePerPerson,
    feePerPerson,
    totalActualPlayers,
  };
};

export const calculateUnpaidSummary = (
  sessions: any[],
  attendancesBySessionId: Record<string, any[]> | Map<string, any[]>,
): UnpaidPlayerSummary[] => {
  const byPlayer = new Map<string, UnpaidPlayerSummary>();

  for (const session of sessions || []) {
    if (!session?.id) continue;
    const attList: any[] =
      attendancesBySessionId instanceof Map
        ? attendancesBySessionId.get(session.id) || []
        : attendancesBySessionId?.[session.id] || [];

    const totalActualPlayers = attList.reduce((acc, a) => {
      if (!a?.actualAttended) return acc;
      const guests = Math.max(0, Math.floor(Number(a.guestCount) || 0));
      return acc + 1 + guests;
    }, 0);

    const persistedFee = toNumber(session.financials?.calculatedFeePerPerson);
    const feePerPerson =
      persistedFee > 0
        ? persistedFee
        : getSessionFinancialBreakdown(session.financials, totalActualPlayers).feePerPerson;

    for (const att of attList) {
      if (!att?.actualAttended || att?.hasPaid) continue;
      const cleanName = String(att.name || '').trim();
      if (!cleanName) continue;

      const key = cleanName.toLowerCase();
      const guestCount = Math.max(0, Math.floor(Number(att.guestCount) || 0));
      const slots = 1 + guestCount;
      const amountOwed = feePerPerson * slots;

      const existing = byPlayer.get(key) || {
        name: cleanName,
        totalSlots: 0,
        totalOwed: 0,
        sessions: [],
      };

      existing.totalSlots += slots;
      existing.totalOwed += amountOwed;
      existing.sessions.push({
        sessionId: session.id,
        attendanceId: att.id || '',
        date: session.date || '',
        time: session.time || '',
        location: session.location || '',
        guestCount,
        slots,
        feePerPerson,
        amountOwed,
      });

      byPlayer.set(key, existing);
    }
  }

  return Array.from(byPlayer.values())
    .map((entry) => ({
      ...entry,
      sessions: [...entry.sessions].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }))
    .sort((a, b) => {
      if (b.totalOwed !== a.totalOwed) return b.totalOwed - a.totalOwed;
      if (b.sessions.length !== a.sessions.length) return b.sessions.length - a.sessions.length;
      return a.name.localeCompare(b.name);
    });
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/sessionFinancials.test.mjs`
Expected: PASS

---

### Task 2: Localization Keys & Social Share / CSV Export Support for Additional Shuttlecocks

**Files:**
- Modify: `app/locales/vi.ts`
- Modify: `app/locales/en.ts`
- Modify: `app/utils/sessionSocialShare.ts`
- Modify: `app/utils/sessionExport.ts`
- Modify: `tests/sessionSocialShare.test.mjs`

**Interfaces:**
- Produces new i18n keys in `app/locales/vi.ts` and `app/locales/en.ts` under `admin`, `admin.detail`, and `sessionDetail`.
- Updates `generateSessionSettlementText` in `app/utils/sessionSocialShare.ts` and `exportSessionToCSV` in `app/utils/sessionExport.ts` to include additional shuttlecocks when present.

- [x] **Step 1: Write failing test in `tests/sessionSocialShare.test.mjs`**

Append a test to `tests/sessionSocialShare.test.mjs`:

```js
test('generateSessionSettlementText includes additional shuttlecocks in shuttle count and cost', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
    courtNumber: 'Sân 3',
  };

  const attendances = [
    { name: 'Thuan', actualAttended: true, guestCount: 1 },
    { name: 'Minh', actualAttended: true, guestCount: 2 },
  ];

  const financials = {
    courtCost: 200000,
    shuttlecocksUsed: 4,
    shuttlecockPrice: 25000,
    additionalShuttlecocksUsed: 2,
    additionalShuttlecockPrice: 30000,
    shuttlecockCost: 160000,
    totalSessionCost: 360000,
    calculatedFeePerPerson: 72000,
  };

  const result = generateSessionSettlementText(session, attendances, financials);
  const lines = result.trim().split('\n');
  assert.equal(lines[4], '💰 Chi phí: Sân 200.000đ + Cầu (6 quả = 160.000đ) = 360.000đ');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/sessionSocialShare.test.mjs`
Expected: FAIL (`4 quả = 100.000đ` instead of `6 quả = 160.000đ`).

- [x] **Step 3: Update `app/utils/sessionSocialShare.ts`, `app/utils/sessionExport.ts`, `app/locales/vi.ts`, and `app/locales/en.ts`**

In `app/utils/sessionSocialShare.ts` lines 56-61:

```ts
  const courtCost = financials?.courtCost || 0;
  const shuttlecocksUsed = financials?.shuttlecocksUsed || 0;
  const shuttlePrice = financials?.shuttlecockPrice || 0;
  const additionalShuttlecocksUsed = financials?.additionalShuttlecocksUsed || 0;
  const additionalShuttlecockPrice = financials?.additionalShuttlecockPrice || 0;
  const totalShuttlecocksUsed = shuttlecocksUsed + additionalShuttlecocksUsed;
  const shuttleCost =
    financials?.shuttlecockCost ??
    shuttlecocksUsed * shuttlePrice + additionalShuttlecocksUsed * additionalShuttlecockPrice;
  const totalCost = financials?.totalSessionCost || (courtCost + shuttleCost);
  const feePerPerson = financials?.calculatedFeePerPerson || financials?.feePerPerson || 0;
```
And update line 68 to use `totalShuttlecocksUsed`:
```ts
  text += `💰 Chi phí: Sân ${courtCost.toLocaleString('vi-VN')}đ + Cầu (${totalShuttlecocksUsed} quả = ${shuttleCost.toLocaleString('vi-VN')}đ) = ${totalCost.toLocaleString('vi-VN')}đ\n`;
```

In `app/utils/sessionExport.ts` lines 24-28:

```ts
  csv += `Tiền sân (VND),${financials?.courtCost || 0}\r\n`;
  csv += `Số quả cầu dùng (trong ống),${financials?.shuttlecocksUsed || 0},quả\r\n`;
  csv += `Đơn giá cầu trong ống (VND),${financials?.shuttlecockPrice || 0}\r\n`;
  if ((financials?.additionalShuttlecocksUsed || 0) > 0) {
    csv += `Số quả cầu mua thêm,${financials?.additionalShuttlecocksUsed || 0},quả\r\n`;
    csv += `Đơn giá cầu mua thêm (VND),${financials?.additionalShuttlecockPrice || 0}\r\n`;
  }
  csv += `Tổng chi phí phiên (VND),${financials?.totalSessionCost || 0}\r\n`;
```

In `app/locales/vi.ts`:
- Under `admin` (after `filterCompleted`):
```ts
    filterUnpaid: 'Chưa đóng tiền',
    unpaidSummaryTitle: 'Tổng hợp người chơi chưa đóng tiền',
    unpaidSummaryDesc: 'Danh sách các thành viên đã điểm danh có mặt nhưng chưa thanh toán tiền sân.',
    unpaidPlayersCount: 'Người chưa đóng',
    unpaidSessionsCount: '{count} phiên chưa đóng',
    unpaidTotalAmount: 'Tổng tiền cần thu',
    unpaidTotalSlots: '{count} suất (gồm khách)',
    allSessionsPaidTitle: 'Tất cả đã thanh toán đủ!',
    allSessionsPaidDesc: 'Không có người chơi nào còn nợ tiền sân trong các phiên đấu.',
    markPaidQuickBtn: 'Đã đóng',
    markedPaidSuccess: 'Đã đánh dấu thanh toán cho {name}.',
```
- Under `admin.detail` (after `shuttlePackPrice`):
```ts
      additionalShuttlesUsed: 'Số cầu mua thêm',
      additionalShuttlePrice: 'Giá 1 quả mua thêm',
```
- Under `sessionDetail` (after `feeFormulaHeading`):
```ts
    additionalShuttleCostLine: 'Cầu mua thêm = {count} × {price} = {total}',
```

In `app/locales/en.ts`:
- Under `admin` (after `filterCompleted`):
```ts
    filterUnpaid: 'Unpaid',
    unpaidSummaryTitle: 'Unpaid Players Summary',
    unpaidSummaryDesc: 'Players who checked in on court but have not settled their session fee yet.',
    unpaidPlayersCount: 'Unpaid players',
    unpaidSessionsCount: '{count} unpaid session(s)',
    unpaidTotalAmount: 'Total outstanding',
    unpaidTotalSlots: '{count} slot(s) (incl. guests)',
    allSessionsPaidTitle: 'Everyone is paid up!',
    allSessionsPaidDesc: 'There are no outstanding session fees across your sessions.',
    markPaidQuickBtn: 'Mark paid',
    markedPaidSuccess: 'Marked {name} as paid.',
```
- Under `admin.detail` (after `shuttlePackPrice`):
```ts
      additionalShuttlesUsed: 'Extra Shuttles',
      additionalShuttlePrice: 'Extra Shuttle Price',
```
- Under `sessionDetail` (after `feeFormulaHeading`):
```ts
    additionalShuttleCostLine: 'Additional shuttles = {count} × {price} = {total}',
```

- [x] **Step 4: Run tests to verify `sessionSocialShare` and `i18n` pass**

Run: `node --test tests/sessionSocialShare.test.mjs tests/i18n.test.mjs`
Expected: PASS

---

### Task 3: Add Unpaid Summary Tab in `/admin` (`app/pages/admin/index.vue`)

**Files:**
- Modify: `app/pages/admin/index.vue`

**Interfaces:**
- Consumes: `calculateUnpaidSummary` from `~/utils/sessionFinancials`
- Adds `'unpaid'` tab to `activeFilter` in `app/pages/admin/index.vue`, subscribes to `collectionGroup(db, 'attendances')` (with per-session `getDocs` fallback), renders total unpaid KPI banner + per-player unpaid summary cards with session links and 1-tap `markPaid` action, and inherits `additionalShuttlecockPrice` when creating new sessions.

- [x] **Step 1: Update `app/pages/admin/index.vue` script to load attendances, compute `unpaidSummary`, and support quick `markAsPaid`**

In `app/pages/admin/index.vue`:
- Import `collectionGroup` from `firebase/firestore`, `CircleDollarSign, ReceiptText` from `lucide-vue-next`, and `calculateUnpaidSummary` from `~/utils/sessionFinancials`.
- Change `activeFilter` type to `'all' | 'active' | 'completed' | 'unpaid'`.
- Add reactive `attendancesBySession = ref<Record<string, any[]>>({})` and `markingPaidId = ref<string | null>(null)`.
- In `onMounted`, subscribe to `onSnapshot(collectionGroup(db, 'attendances'), ...)` to populate `attendancesBySession.value` keyed by `attDoc.ref.parent?.parent?.id`, with a fallback `loadAttendancesFallback(sessions.value)` using `getDocs(collection(db, 'sessions/${s.id}/attendances'))` if `collectionGroup` fails.
- Compute:
  ```ts
  const unpaidSummary = computed(() =>
    calculateUnpaidSummary(sessions.value, attendancesBySession.value)
  );
  const totalUnpaidAmount = computed(() =>
    unpaidSummary.value.reduce((sum, p) => sum + p.totalOwed, 0)
  );
  const totalUnpaidSlots = computed(() =>
    unpaidSummary.value.reduce((sum, p) => sum + p.totalSlots, 0)
  );
  ```
- Add `markSessionAttendancePaid(sessionId: string, attendanceId: string, playerName: string)` that calls `updateDoc(doc(db, 'sessions', sessionId, 'attendances', attendanceId), { hasPaid: true })` and shows a success toast.
- In `handleSaveSession` (when creating a new session), include:
  ```ts
  additionalShuttlecocksUsed: 0,
  additionalShuttlecockPrice: inherit?.financials?.additionalShuttlecockPrice || 0,
  ```

- [x] **Step 2: Add the Unpaid tab button and Unpaid Summary view in `app/pages/admin/index.vue` template**

In `app/pages/admin/index.vue`:
- Add the 4th tab button in `<!-- Filter Tabs -->`:
  ```vue
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
    :class="
      activeFilter === 'unpaid'
        ? 'bg-amber-600 text-white shadow-sm'
        : unpaidSummary.length > 0
        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
        : 'bg-white/70 text-brand-slate hover:bg-white hover:text-brand-ink'
    "
    @click="activeFilter = 'unpaid'"
  >
    <CircleDollarSign :size="14" />
    <span>{{ t('admin.filterUnpaid') }} ({{ unpaidSummary.length }})</span>
  </button>
  ```
- When `activeFilter === 'unpaid'`, render the Unpaid Summary section (KPI summary bar + player cards with each unpaid session date, guest badge, amount owed, link to `/admin/session/${item.sessionId}`, and 1-tap `markSessionAttendancePaid` button; or the `allSessionsPaidTitle` empty state when `unpaidSummary.length === 0`).

- [x] **Step 3: Run tests to verify no regressions**

Run: `npm test`
Expected: PASS

---

### Task 4: Wire Additional Shuttlecock Inputs in Admin & Public Session Views

**Files:**
- Modify: `app/pages/admin/session/[id].vue`
- Modify: `app/pages/session/[id].vue`
- Modify: `app/components/session/QRCodeDisplay.vue`
- Modify: `app/pages/leaderboard.vue`

**Interfaces:**
- Consumes: `additionalShuttlecocksUsed`, `additionalShuttlecockPrice`, `additionalShuttlecockCost`, `packShuttlecockCost` from `getSessionFinancialBreakdown`.

- [x] **Step 1: Add additional shuttlecock inputs and persistence in `app/pages/admin/session/[id].vue`**

In `app/pages/admin/session/[id].vue`:
- Update `financeDraft`:
  ```ts
  const financeDraft = ref({
    courtCost: 0,
    shuttlecocksUsed: 0,
    shuttlecockPackPrice: 0,
    additionalShuttlecocksUsed: 0,
    additionalShuttlecockPrice: 0,
  });
  ```
- In `onSnapshot(sessionRef, ...)`:
  ```ts
  financeDraft.value = {
    courtCost: session.value.financials.courtCost || 0,
    shuttlecocksUsed: session.value.financials.shuttlecocksUsed || 0,
    shuttlecockPackPrice: session.value.financials.shuttlecockPackPrice || 0,
    additionalShuttlecocksUsed: session.value.financials.additionalShuttlecocksUsed || 0,
    additionalShuttlecockPrice: session.value.financials.additionalShuttlecockPrice || 0,
  };
  ```
- In `updateFinancials()`:
  ```ts
  await updateDoc(docRef, {
    'financials.courtCost': financeDraft.value.courtCost,
    'financials.shuttlecocksUsed': financeDraft.value.shuttlecocksUsed,
    'financials.shuttlecockPackPrice': financeDraft.value.shuttlecockPackPrice,
    'financials.shuttlecockPrice': financialBreakdown.value.shuttlecockPrice,
    'financials.additionalShuttlecocksUsed': financeDraft.value.additionalShuttlecocksUsed,
    'financials.additionalShuttlecockPrice': financeDraft.value.additionalShuttlecockPrice,
    'financials.calculatedFeePerPerson': calculatedFeePerPerson.value,
  });
  ```
- In the Settlement Card template (`Bảng kết toán`), right under the `shuttlesUsed` + `shuttlePackPrice` grid (change both grids to `grid gap-3 sm:grid-cols-2`), add the 2-column grid for `additionalShuttlesUsed` and `additionalShuttlePrice`:
  ```vue
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-2">
      <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
        {{ t('admin.detail.additionalShuttlesUsed') }}
      </label>
      <InputNumber
        v-model="financeDraft.additionalShuttlecocksUsed"
        :min="0"
        locale="en-US"
        :use-grouping="true"
        :min-fraction-digits="0"
        :max-fraction-digits="0"
        fluid
        input-class="finance-input"
        @focus="financeEditing = true"
        @blur="onFinanceBlur"
      />
    </div>

    <div class="space-y-2">
      <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
        {{ t('admin.detail.additionalShuttlePrice') }}
      </label>
      <InputNumber
        v-model="financeDraft.additionalShuttlecockPrice"
        :min="0"
        locale="en-US"
        :use-grouping="true"
        :min-fraction-digits="0"
        :max-fraction-digits="0"
        fluid
        input-class="finance-input"
        @focus="financeEditing = true"
        @blur="onFinanceBlur"
      />
    </div>
  </div>
  ```

- [x] **Step 2: Update `app/pages/session/[id].vue`, `app/components/session/QRCodeDisplay.vue`, and `app/pages/leaderboard.vue`**

In `app/pages/session/[id].vue`:
- Pass `:pack-shuttlecock-cost="financialBreakdown.packShuttlecockCost"`, `:additional-shuttlecocks-used="financialBreakdown.additionalShuttlecocksUsed"`, `:additional-shuttlecock-price="financialBreakdown.additionalShuttlecockPrice"`, and `:additional-shuttlecock-cost="financialBreakdown.additionalShuttlecockCost"` to `<SessionQRCodeDisplay />`.
- Pass `:financials="{ ...financialBreakdown, calculatedFeePerPerson }"` to `<SessionSocialShareModal />`.

In `app/components/session/QRCodeDisplay.vue`:
- Add optional props `packShuttlecockCost?: number`, `additionalShuttlecocksUsed?: number`, `additionalShuttlecockPrice?: number`, `additionalShuttlecockCost?: number`.
- In the fee breakdown block (`v-if="showFeeBreakdown"`), show the additional shuttlecock line when `(additionalShuttlecocksUsed || 0) > 0`:
  ```vue
  <p v-if="(additionalShuttlecocksUsed || 0) > 0">
    {{
      t('sessionDetail.additionalShuttleCostLine', {
        count: additionalShuttlecocksUsed,
        price: formatCurrency(additionalShuttlecockPrice),
        total: formatCurrency(additionalShuttlecockCost),
      })
    }}
  </p>
  ```

In `app/pages/leaderboard.vue` line 86:
- Count total shuttles including additional shuttles:
  ```ts
  shuttlecocksUsed:
    (sessionData.financials?.shuttlecocksUsed || 0) +
    (sessionData.financials?.additionalShuttlecocksUsed || 0),
  ```

---

### Task 5: Redesign Bank Account Information Form UI in `AdminQRCodeManager.vue`

**Files:**
- Modify: `app/components/admin/AdminQRCodeManager.vue:305-382`

**Interfaces:**
- Replaces the cramped `grid gap-3 sm:grid-cols-2 lg:grid-cols-4` and squished footer in `app/components/admin/AdminQRCodeManager.vue` with a clean, aligned layout designed for the right sidebar width.

- [x] **Step 1: Update the banking form layout in `app/components/admin/AdminQRCodeManager.vue`**

In `app/components/admin/AdminQRCodeManager.vue` lines 317-381, replace the `<form>` block with:

```vue
      <form @submit.prevent="saveBankDetails" class="space-y-4">
        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <!-- Full-width Bank Selector -->
          <div class="flex w-full flex-col gap-2 sm:col-span-2">
            <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
              {{ t('admin.qr.selectBankLabel') }}
            </label>
            <div class="group relative">
              <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
                <Building2 :size="16" />
              </div>
              <div class="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                <ChevronDown :size="16" />
              </div>
              <select
                :value="bankForm.bankCode"
                @change="onBankSelect"
                class="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm text-brand-ink outline-none transition-all hover:border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{{ t('admin.qr.chooseStandardBank') }}</option>
                <option v-for="bank in COMMON_VIETNAMESE_BANKS" :key="bank.code" :value="bank.code">
                  {{ bank.code }} - {{ bank.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Bank Short Name & Account Number side-by-side -->
          <UIGlassInput
            v-model="bankForm.bankName"
            type="text"
            :label="t('admin.qr.bankNameLabel')"
            :placeholder="t('admin.qr.bankNamePlaceholder')"
          >
            <template #icon><Building2 :size="16" /></template>
          </UIGlassInput>

          <UIGlassInput
            v-model="bankForm.accountNumber"
            type="text"
            :label="t('admin.qr.accountNumberLabel')"
            :placeholder="t('admin.qr.accountNumberPlaceholder')"
            required
          >
            <template #icon><CreditCard :size="16" /></template>
          </UIGlassInput>

          <!-- Full-width Account Holder Name -->
          <div class="sm:col-span-2">
            <UIGlassInput
              v-model="bankForm.accountName"
              type="text"
              :label="t('admin.qr.accountNameLabel')"
              :placeholder="t('admin.qr.accountNamePlaceholder')"
            >
              <template #icon><UserCheck :size="16" /></template>
            </UIGlassInput>
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-1">
          <p class="text-xs leading-relaxed text-brand-slate">
            {{ t('admin.qr.vietQrHint') }}
          </p>
          <UIGlassButton type="submit" :loading="savingBank" class="w-full justify-center !py-2.5 !text-xs font-bold">
            <template #icon-left><Save :size="14" /></template>
            {{ t('admin.qr.saveBankBtn') }}
          </UIGlassButton>
        </div>
      </form>
```

- [x] **Step 2: Run full test suite and production build**

Run: `npm test && npm run build`
Expected: All unit tests PASS and Nuxt production build succeeds with 0 errors.
