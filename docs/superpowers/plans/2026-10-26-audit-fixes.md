# Ponytail Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 19 audit findings across authentication lifecycle, RSVP state/validation, dynamic VietQR/clipboard handling, leaderboard scaling/filtering, test coverage, and UI/dependency hygiene.

**Architecture:** Fix auth readiness and singleton listeners in existing composables (`useAdminAccess`, `useUserProfile`), harden RSVP & fee calculations in `session/[id].vue`, add canvas-based PNG conversion for clipboard QR copy, optimize leaderboard queries to completed sessions with `collectionGroup` + fallback, add missing unit tests for financials and VietQR, and standardize `admin/index.vue` on `UIGlass*` components while removing unused Pinia/Firebase Storage code.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Firebase Auth & Firestore, PrimeVue Toast, Node.js test runner (`node:test`)

**Spec:** Conversation audit report (Findings #1–#19, 2026-10-26)

## Global Constraints

- Preserve existing Firestore document and field names (`sessions`, `sessions/{sessionId}/attendances`, `profiles`).
- Keep client-only Firebase Auth calls guarded by `import.meta.client` or client lifecycle hooks.
- Maintain bilingual i18n parity (`app/locales/en.ts` and `app/locales/vi.ts`).
- Reuse `UIGlassCard`, `UIGlassButton`, `UIGlassInput`, and `UIGlassModal` primitives.
- All unit tests in `tests/*.test.mjs` must pass via `npm test`.

## Review Focus

- `calculateFeePerPerson` and `resolveShuttlecockPrice` when `totalActualPlayers <= 0`, `packPrice <= 0`, or inputs are `NaN`/`undefined` -> must return `0` without throwing or producing `NaN`.
- `generateVietQRUrl` when `memo` contains Vietnamese diacritics and special characters (e.g. `BDM 20261026 Nguyễn Văn A #1`) -> must strip diacritics/symbols and encode `addInfo` in URL query string.
- `calculatePlayerStats` when sessions include `status: 'open'` or `status: 'locked'` -> must ignore non-completed sessions so future RSVPs do not reduce `reliabilityRate`.
- RSVP submission and capacity math when `guestCount` is negative or decimal (e.g. `-3` or `1.7`) -> must clamp to non-negative integer `Math.max(0, Math.floor(Number(val) || 0))`.
- `UIGlassInput` when a `type="number"` input is cleared (`""`) -> must emit `""` instead of `0` so the user can type a new number cleanly.

---

### Task 1: Test Runner, Financial Unit Tests, and VietQR Memo Support (Findings #9, #10, #11)

**Files:**
- Modify: `package.json:5-11`
- Modify: `app/utils/vietqr.ts:92-117`
- Create: `tests/sessionFinancials.test.mjs`
- Create: `tests/vietqr.test.mjs`

**Interfaces:**
- Produces: `npm test` script in `package.json` running `node --test tests/*.test.mjs`
- Produces: `generateVietQRUrl(params: VietQRParams): string` in `app/utils/vietqr.ts` appending `addInfo` query param when `params.memo` is non-empty

- [ ] **Step 1: Write failing tests for `sessionFinancials.ts` and `vietqr.ts`**

Create `tests/sessionFinancials.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToNearestThousand,
  getShuttlecockPriceFromPack,
  resolveShuttlecockPrice,
  calculateTotalSessionCost,
  calculateFeePerPerson,
  getSessionFinancialBreakdown,
} from '../app/utils/sessionFinancials.ts';

test('roundToNearestThousand rounds to nearest 1000', () => {
  assert.equal(roundToNearestThousand(20833.33), 21000);
  assert.equal(roundToNearestThousand(20400), 20000);
  assert.equal(roundToNearestThousand(0), 0);
});

test('getShuttlecockPriceFromPack divides by 12 and rounds to 1000', () => {
  assert.equal(getShuttlecockPriceFromPack(250000), 21000);
  assert.equal(getShuttlecockPriceFromPack(0), 0);
  assert.equal(getShuttlecockPriceFromPack(-120000), 0);
});

test('resolveShuttlecockPrice prefers packPrice over shuttlecockPrice', () => {
  assert.equal(resolveShuttlecockPrice({ shuttlecockPackPrice: 240000, shuttlecockPrice: 30000 }), 20000);
  assert.equal(resolveShuttlecockPrice({ shuttlecockPackPrice: 0, shuttlecockPrice: 25000 }), 25000);
  assert.equal(resolveShuttlecockPrice(null), 0);
});

test('calculateTotalSessionCost and calculateFeePerPerson handle normal and zero/invalid inputs', () => {
  const total = calculateTotalSessionCost({ courtCost: 200000, shuttlecocksUsed: 5, shuttlecockPrice: 25000 });
  assert.equal(total, 325000);
  assert.equal(calculateFeePerPerson(325000, 6), 55000);
  assert.equal(calculateFeePerPerson(325000, 0), 0);
  assert.equal(calculateFeePerPerson(325000, -2), 0);
});

test('getSessionFinancialBreakdown returns consistent breakdown', () => {
  const b = getSessionFinancialBreakdown({ courtCost: 200000, shuttlecocksUsed: 4, shuttlecockPackPrice: 240000 }, 5);
  assert.equal(b.shuttlecockPrice, 20000);
  assert.equal(b.shuttlecockCost, 80000);
  assert.equal(b.totalSessionCost, 280000);
  assert.equal(b.feePerPerson, 56000);
});
```

Create `tests/vietqr.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  removeVietnameseDiacritics,
  resolveBankCode,
  generateVietQRUrl,
} from '../app/utils/vietqr.ts';

test('removeVietnameseDiacritics strips accents and đ/Đ', () => {
  assert.equal(removeVietnameseDiacritics('Nguyễn Văn Đạt'), 'Nguyen Van Dat');
});

test('resolveBankCode matches BIN, code, and alias', () => {
  assert.equal(resolveBankCode('970422'), 'MB');
  assert.equal(resolveBankCode('vcb'), 'VCB');
  assert.equal(resolveBankCode('Techcombank'), 'TCB');
});

test('generateVietQRUrl encodes amount, accountName, and memo as addInfo', () => {
  const url = generateVietQRUrl({
    bankId: 'MB',
    accountNumber: '0123 456 789',
    accountName: 'Nguyễn Văn A',
    amount: 55000,
    memo: 'BDM 20261026 Nguyễn Văn A #1',
    template: 'qr_only',
  });
  assert.equal(
    url,
    'https://img.vietqr.io/image/MB-0123456789-qr_only.jpg?amount=55000&accountName=Nguyen%20Van%20A&addInfo=BDM%2020261026%20Nguyen%20Van%20A%201'
  );
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/sessionFinancials.test.mjs tests/vietqr.test.mjs`
Expected: `tests/vietqr.test.mjs` FAILS because `addInfo` is missing from generated URL.

- [ ] **Step 3: Add `test` script to `package.json` and `memo` (`addInfo`) encoding to `app/utils/vietqr.ts`**

In `package.json:5-11`, add `"test": "node --test tests/*.test.mjs"` to `"scripts"`.

In `app/utils/vietqr.ts:92-117`, destructure `memo` from `params` and append `addInfo` after `accountName`:
```ts
  if (memo) {
    const cleanMemo = removeVietnameseDiacritics(memo)
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanMemo) {
      searchParams.append('addInfo', cleanMemo);
    }
  }
```

- [ ] **Step 4: Run test suite to verify pass**

Run: `npm test`
Expected: PASS (all test files including `sessionFinancials.test.mjs` and `vietqr.test.mjs`).

- [ ] **Step 5: Commit**

```bash
git add package.json app/utils/vietqr.ts tests/sessionFinancials.test.mjs tests/vietqr.test.mjs
git commit -m "feat(vietqr,test): encode memo as addInfo and add financial/vietqr unit tests"
```

---

### Task 2: Firebase Auth Reload & Singleton Listener Lifecycle (Findings #1, #2, #18)

**Files:**
- Modify: `app/utils/firebase.ts:1-38`
- Modify: `app/composables/useAdminAccess.ts:1-51`
- Modify: `app/composables/useUserProfile.ts:1-89`

**Interfaces:**
- Produces: `useFirebase()` returning `{ app, auth, db }` (removes unused `storage`)
- Produces: `useAdminAccess()` waiting for `await auth.authStateReady()` inside `refreshAdminClaims` and registering `onAuthStateChanged` once per client session
- Produces: `useUserProfile()` registering `onAuthStateChanged` once per client session without tearing down on component unmount

- [ ] **Step 1: Remove unused Firebase Storage from `app/utils/firebase.ts`**

In `app/utils/firebase.ts`, remove `import { getStorage, type FirebaseStorage } from 'firebase/storage'`, remove `const storage: FirebaseStorage = getStorage(app)`, and return `{ app, auth, db }`.

- [ ] **Step 2: Await `auth.authStateReady()` and use module-level listener guard in `app/composables/useAdminAccess.ts`**

Update `app/composables/useAdminAccess.ts`:
```ts
import { getIdTokenResult, onAuthStateChanged, type User } from 'firebase/auth'

let adminAuthListenerInitialized = false

export const useAdminAccess = () => {
  const { auth } = useFirebase()
  const adminUser = useState<User | null>('admin-auth-user', () => null)
  const isAdmin = useState<boolean>('admin-is-admin', () => false)
  const claimsLoading = useState<boolean>('admin-claims-loading', () => true)

  const refreshAdminClaims = async (forceRefresh = false) => {
    if (import.meta.client) {
      await auth.authStateReady()
    }
    const currentUser = auth.currentUser

    if (!currentUser) {
      adminUser.value = null
      isAdmin.value = false
      claimsLoading.value = false
      return false
    }

    const tokenResult = await getIdTokenResult(currentUser, forceRefresh)
    adminUser.value = currentUser
    isAdmin.value = tokenResult.claims.admin === true
    claimsLoading.value = false

    return isAdmin.value
  }

  if (import.meta.client && !adminAuthListenerInitialized) {
    adminAuthListenerInitialized = true
    onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        adminUser.value = null
        isAdmin.value = false
        claimsLoading.value = false
        return
      }

      claimsLoading.value = true
      await refreshAdminClaims()
    })
  }

  return {
    adminUser,
    isAdmin,
    claimsLoading,
    refreshAdminClaims,
  }
}
```

- [ ] **Step 3: Use module-level listener guard in `app/composables/useUserProfile.ts`**

In `app/composables/useUserProfile.ts:25-48`, replace `onMounted` / `onUnmounted(unsubscribe)` with a module-level singleton guard `let profileAuthListenerInitialized = false`:
```ts
  if (import.meta.client && !profileAuthListenerInitialized) {
    profileAuthListenerInitialized = true
    onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          await signInAnonymously(auth)
        } catch (e) {
          console.error('Error signing in anonymously:', e)
          loading.value = false
        }
        return
      }

      user.value = currentUser
      await fetchProfile(currentUser.uid)
      loading.value = false
    })
  }
```

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/firebase.ts app/composables/useAdminAccess.ts app/composables/useUserProfile.ts
git commit -m "fix(auth): await authStateReady on reload and keep auth listeners alive across navigation"
```

---

### Task 3: Public Session RSVP State, Validation, Fee Display, & Redundancy (Findings #3, #4, #8, #17)

**Files:**
- Modify: `app/pages/session/[id].vue:1-185, 394-414, 512-528`

**Interfaces:**
- Consumes: `getSessionFinancialBreakdown` from `~/utils/sessionFinancials`
- Modifies: `vote` initialization, `personalAmount` computation, and `submitVote` guestCount sanitization in `app/pages/session/[id].vue`

- [ ] **Step 1: Remove redundant `calculateFeePerPerson` call and clamp `guestCount` in slot aggregations (`app/pages/session/[id].vue:1-66`)**

In `app/pages/session/[id].vue`:
- Remove `calculateFeePerPerson` from the `~/utils/sessionFinancials` import at line 4.
- Clamp guest counts in `totalJoinedSlots` and `totalActualPlayers`:
  `const guests = Math.max(0, Math.floor(Number(curr.guestCount) || 0));`
- Replace `calculatedFeePerPerson` with:
  `const calculatedFeePerPerson = computed(() => financialBreakdown.value.feePerPerson);`
- Add `personalAmount` computed property that returns `0` when the session is locked/completed and the user did not attend (`!myAttendanceRecord.value?.actualAttended`), or when `!myAttendanceRecord.value?.isJoining`:
```ts
const personalAmount = computed(() => {
  if (!myAttendanceRecord.value?.isJoining) return 0;
  if (isMatchOrSettling.value && !myAttendanceRecord.value?.actualAttended) return 0;
  const guests = Math.max(0, Math.floor(Number(myAttendanceRecord.value.guestCount) || 0));
  return calculatedFeePerPerson.value * (1 + guests);
});
```

- [ ] **Step 2: Prevent background `attendanceList` snapshots from overwriting active form edits (`app/pages/session/[id].vue:86-98`)**

In `app/pages/session/[id].vue`, add `const voteSynced = ref(false);` and update the `watchEffect` inside `onMounted`:
```ts
    watchEffect(() => {
      if (voteSynced.value) return;
      if (user.value && attendanceList.value.length) {
        const myVote = attendanceList.value.find((a) => a.id === user.value?.uid);
        if (myVote) {
          vote.value.isJoining = myVote.isJoining;
          vote.value.guestCount = Math.max(0, Math.floor(Number(myVote.guestCount) || 0));
          voteSynced.value = true;
        } else if (isSessionFull.value) {
          vote.value.isJoining = false;
        }
      } else if (isSessionFull.value && !isUserAlreadyJoining.value) {
        vote.value.isJoining = false;
      }
    });
```

- [ ] **Step 3: Sanitize `guestCount` in `submitVote` and bind `personalAmount` in template (`app/pages/session/[id].vue:148-183, 394-414, 523`)**

In `submitVote`:
```ts
  const safeGuestCount = vote.value.isJoining
    ? Math.max(0, Math.floor(Number(vote.value.guestCount) || 0))
    : 0;
  vote.value.guestCount = safeGuestCount;
```
Use `safeGuestCount` in `requestedSlots = 1 + safeGuestCount` and in `setDoc(..., { ..., guestCount: safeGuestCount, ... })`.

In template lines 395-413:
- Gate the personal share banner with `v-if="myAttendanceRecord?.isJoining && (!isMatchOrSettling || myAttendanceRecord.actualAttended)"`.
- Replace `formatCurrency(calculatedFeePerPerson * (1 + (myAttendanceRecord.guestCount || 0)))` with `formatCurrency(personalAmount)`.
- At line 523 on `<SessionQRCodeDisplay>`, replace `:personal-amount="calculatedFeePerPerson * (1 + (myAttendanceRecord?.guestCount || 0))"` with `:personal-amount="personalAmount"`.

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/session/[id].vue
git commit -m "fix(session): preserve RSVP form edits, clamp guestCount, and zero fee for absent players"
```

---

### Task 4: Social Share Clipboard PNG Conversion & Shared UI Fixes (Findings #5, #15, #19)

**Files:**
- Modify: `app/components/session/SocialShareModal.vue:114-140`
- Modify: `app/components/UI/GlassInput.vue:11-25`
- Modify: `app/components/UI/ConfirmDialog.vue:40-46`

**Interfaces:**
- Modifies: `copyQRImage` in `app/components/session/SocialShareModal.vue` to convert fetched image blob to real `image/png` via `<canvas>` before calling `ClipboardItem`
- Modifies: `app/components/UI/GlassInput.vue` `@input` event to emit `''` when number input is cleared
- Modifies: `app/components/UI/ConfirmDialog.vue` confirm button `variant="primary"`

- [ ] **Step 1: Convert QR image blob to PNG via canvas in `app/components/session/SocialShareModal.vue`**

In `app/components/session/SocialShareModal.vue:114-136`, add `convertBlobToPng` and use it in `copyQRImage`:
```ts
const convertBlobToPng = (blob: Blob): Promise<Blob> => {
  if (blob.type === 'image/png') return Promise.resolve(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
};
```
In `copyQRImage`, replace `const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });` with `const pngBlob = await convertBlobToPng(blob);`.

- [ ] **Step 2: Preserve empty string when clearing number input in `app/components/UI/GlassInput.vue` and remove dead ternary in `app/components/UI/ConfirmDialog.vue`**

In `app/components/UI/GlassInput.vue:14`, replace `@input` handler with:
```vue
@input="$emit('update:modelValue', type === 'number' ? (($event.target as HTMLInputElement).value === '' ? '' : Number(($event.target as HTMLInputElement).value)) : ($event.target as HTMLInputElement).value)"
```

In `app/components/UI/ConfirmDialog.vue:41`, replace `:variant="state.options?.severity === 'danger' ? 'primary' : 'primary'"` with `variant="primary"`.

- [ ] **Step 3: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/components/session/SocialShareModal.vue app/components/UI/GlassInput.vue app/components/UI/ConfirmDialog.vue
git commit -m "fix(ui,share): convert QR JPEG to PNG for clipboard and allow clearing number inputs"
```

---

### Task 5: Leaderboard Query Optimization & Completed-Session Filtering (Findings #6, #7)

**Files:**
- Modify: `app/utils/leaderboardStats.ts:8-30`
- Modify: `app/pages/leaderboard.vue:1-74`
- Modify: `tests/leaderboardStats.test.mjs`

**Interfaces:**
- Modifies: `RawSessionItem` in `app/utils/leaderboardStats.ts` to include `status?: 'open' | 'locked' | 'completed'`
- Modifies: `calculatePlayerStats(sessions: RawSessionItem[]): PlayerStats[]` to skip sessions where `session.status !== undefined && session.status !== 'completed'`

- [ ] **Step 1: Add test in `tests/leaderboardStats.test.mjs` verifying non-completed sessions are ignored**

Append to `tests/leaderboardStats.test.mjs`:
```js
test('calculatePlayerStats ignores open and locked sessions when status is present', () => {
  const sessions = [
    {
      date: '2026-09-01',
      status: 'completed',
      attendances: [{ name: 'Alice', isJoining: true, actualAttended: true }],
    },
    {
      date: '2026-09-15',
      status: 'open',
      attendances: [{ name: 'Alice', isJoining: true, actualAttended: false }],
    },
    {
      date: '2026-09-10',
      status: 'locked',
      attendances: [{ name: 'Alice', isJoining: true, actualAttended: false }],
    },
  ];

  const stats = calculatePlayerStats(sessions);
  assert.equal(stats.length, 1);
  assert.equal(stats[0].matchesPlayed, 1);
  assert.equal(stats[0].totalRsvps, 1);
  assert.equal(stats[0].reliabilityRate, 100);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test tests/leaderboardStats.test.mjs`
Expected: FAIL (`totalRsvps` is `3` and `reliabilityRate` is `33` instead of `1` and `100`).

- [ ] **Step 3: Filter out non-completed sessions in `app/utils/leaderboardStats.ts` and optimize `app/pages/leaderboard.vue`**

In `app/utils/leaderboardStats.ts:8-30`:
- Add `status?: 'open' | 'locked' | 'completed';` to `RawSessionItem`.
- At top of `for (const session of sessions)` loop:
  `if (session.status && session.status !== 'completed') continue;`

In `app/pages/leaderboard.vue`:
- Import `collectionGroup` from `'firebase/firestore'`.
- In `onMounted`, filter `sessionsSnap.docs` to `sessionDoc.data().status === 'completed'`.
- Fetch all attendances in a single `getDocs(collectionGroup(db, 'attendances'))` call and group by `attDoc.ref.parent.parent?.id` (with fallback to `Promise.all` over completed sessions only if `collectionGroup` throws a permission/index error):
```ts
    const sessionsSnap = await getDocs(query(collection(db, 'sessions'), orderBy('date', 'desc')));
    const completedDocs = sessionsSnap.docs.filter((d) => d.data().status === 'completed');

    let attendanceBySession: Record<string, RawAttendance[]> | null = null;
    try {
      const groupSnap = await getDocs(collectionGroup(db, 'attendances'));
      attendanceBySession = {};
      for (const attDoc of groupSnap.docs) {
        const sid = attDoc.ref.parent.parent?.id;
        if (!sid) continue;
        const att = attDoc.data();
        const name = (att.name || '').trim();
        if (!name) continue;
        (attendanceBySession[sid] ??= []).push({
          name,
          isJoining: !!att.isJoining,
          actualAttended: !!att.actualAttended,
          guestCount: att.guestCount || 0,
        });
      }
    } catch {
      // shortcut: fallback to per-completed-session fetch if remote rules block collectionGroup
      attendanceBySession = null;
    }

    const loadedSessions = await Promise.all(
      completedDocs.map(async (sessionDoc) => {
        const sessionData = sessionDoc.data();
        let attendances = attendanceBySession?.[sessionDoc.id];
        if (!attendances) {
          const attendancesSnap = await getDocs(
            collection(db, `sessions/${sessionDoc.id}/attendances`)
          );
          attendances = attendancesSnap.docs
            .map((attDoc) => {
              const att = attDoc.data();
              return {
                name: (att.name || '').trim(),
                isJoining: !!att.isJoining,
                actualAttended: !!att.actualAttended,
                guestCount: att.guestCount || 0,
              };
            })
            .filter((att) => !!att.name);
        }
        return {
          id: sessionDoc.id,
          date: sessionData.date || '',
          status: sessionData.status,
          shuttlecocksUsed: sessionData.financials?.shuttlecocksUsed || 0,
          attendances,
        };
      })
    );
```

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/leaderboardStats.ts app/pages/leaderboard.vue tests/leaderboardStats.test.mjs
git commit -m "fix(leaderboard): exclude uncompleted sessions and batch attendance reads via collectionGroup"
```

---

### Task 6: Admin Dashboard Cleanup, Subcollection Deletion, Toast Feedback, & Unused Dependencies (Findings #12, #13, #14, #16)

**Files:**
- Modify: `app/pages/admin/index.vue:1-348`
- Modify: `nuxt.config.ts:16-24`
- Modify: `package.json:12-28`

**Interfaces:**
- Modifies: `deleteSession` in `app/pages/admin/index.vue` to delete `sessions/{id}/attendances` documents before deleting parent session
- Modifies: `copySessionLink` in `app/pages/admin/index.vue` to trigger PrimeVue `useToast()` feedback
- Modifies: `app/pages/admin/index.vue` template to use `UIGlassCard`, `UIGlassButton`, `UIGlassInput`, and `UIGlassModal`
- Removes: `@pinia/nuxt` and `pinia` from `nuxt.config.ts` and `package.json`

- [ ] **Step 1: Delete attendance subcollection in `deleteSession` and add toast in `copySessionLink` (`app/pages/admin/index.vue`)**

In `app/pages/admin/index.vue`:
- Import `getDocs` from `'firebase/firestore'`.
- Initialize `const toast = useToast();`.
- In `deleteSession` (`accept` callback):
```ts
      try {
        const attSnap = await getDocs(collection(db, `sessions/${session.id}/attendances`));
        await Promise.all(attSnap.docs.map((d) => deleteDoc(d.ref)));
        await deleteDoc(doc(db, 'sessions', session.id));
      }
```
- In `copySessionLink`:
```ts
const copySessionLink = async (id: string) => {
  const url = `${window.location.origin}/session/${id}`;
  await navigator.clipboard.writeText(url);
  toast.add({
    severity: 'success',
    summary: t('common.copied'),
    detail: url,
    life: 2500,
  });
};
```
- Remove unused `dateInputRef` and `openDatePicker`.

- [ ] **Step 2: Replace custom modal and card markup in `app/pages/admin/index.vue` with `UIGlassCard`, `UIGlassButton`, `UIGlassInput`, and `UIGlassModal`**

In `app/pages/admin/index.vue:218-347`:
- Replace the header create button with `<UIGlassButton @click="openCreateModal">`.
- Replace each session `<div>` card with `<UIGlassCard>` using standard status pill classes (`border-emerald-200 bg-emerald-50 text-emerald-700`, `border-amber-200 bg-amber-50 text-amber-700`, `border-slate-200 bg-slate-100 text-slate-600`) and `<UIGlassButton>` actions.
- Replace `<div v-if="showCreateForm" ...>` with `<UIGlassModal v-model="showCreateForm">` and `<UIGlassInput>` fields matching `app/pages/admin/session/[id].vue:985-1071`.

- [ ] **Step 3: Remove unused `@pinia/nuxt` and `pinia` from `nuxt.config.ts` and `package.json`**

In `nuxt.config.ts:16-24`, remove `'@pinia/nuxt',` from `modules`.
In `package.json`, remove `"@pinia/nuxt": "^0.11.3",` and `"pinia": "^3.0.4",` from `dependencies`.

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS (all unit and i18n parity tests pass).

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/index.vue nuxt.config.ts package.json
git commit -m "refactor(admin,deps): use UIGlass primitives, cascade delete attendances, and remove unused Pinia"
```
