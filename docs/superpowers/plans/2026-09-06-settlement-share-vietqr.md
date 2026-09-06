# Settlement Message Text Simplification & VietQR Image Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the session settlement announcement text in `app/utils/sessionSocialShare.ts` to an exact 6-line concise breakdown, and enhance `app/components/session/SocialShareModal.vue` with VietQR card preview (`compact2` template), 1-tap QR image clipboard copying, and native file sharing with the QR image attached.

**Architecture:**
- `app/utils/sessionSocialShare.ts`: Refactor `generateSessionSettlementText` to compute total actual players from `attendances` (including guests) and output the streamlined 6-line summary.
- `app/locales/vi.ts` & `app/locales/en.ts`: Add localized strings for QR image copy actions, tooltips, and toasts with strict key parity.
- `app/components/session/SocialShareModal.vue`: Compute dynamic VietQR url (`compact2` template) or custom `paymentQR`, render an aesthetic preview card on the settlement tab, implement `copyQRImage` using `navigator.clipboard.write([new ClipboardItem(...)])`, and upgrade `handleNativeShare` to attach the QR image file when supported.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, Tailwind CSS, Lucide Icons, Node.js built-in test runner (`node --test`).

## Global Constraints

- Preserve existing `generateSessionInviteText` without regressions.
- Follow `AGENTS.md` strictly: preserve existing glass visual style (`border-brand-line`, `bg-brand-sand`, `text-brand-ink`, `text-brand-court`).
- Keep function signatures backward-compatible for `generateSessionSettlementText`.
- Formatted currency amounts must use Vietnamese format: `.toLocaleString('vi-VN')}đ`.
- Strict key parity between `en.ts` and `vi.ts`.
- Clipboard copying and native sharing must include graceful fallbacks when browser permissions or APIs are restricted.

---

### Task 1: Unit Tests & Settlement Text Simplification (`sessionSocialShare.ts`)

**Files:**
- Create: `tests/sessionSocialShare.test.mjs`
- Modify: `app/utils/sessionSocialShare.ts`

**Interfaces:**
- Produces:
  ```ts
  export const generateSessionSettlementText: (
    session: any,
    attendancesOrFinancials?: any,
    financialsOrUrl?: any,
    sessionUrl?: string,
  ) => string;
  ```

- [ ] **Step 1: Write the failing unit test for `generateSessionSettlementText`**

Create `tests/sessionSocialShare.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSessionSettlementText } from '../app/utils/sessionSocialShare.ts';

test('generateSessionSettlementText produces exact 6-line simplified settlement text', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
    courtNumber: 'Sân 3',
  };

  const attendances = [
    { name: 'Thuan', actualAttended: true, guestCount: 1 },
    { name: 'Minh', actualAttended: true, guestCount: 0 },
    { name: 'Hoang', actualAttended: false, guestCount: 2 }, // Did not attend
    { name: 'Nam', actualAttended: true, guestCount: 2 },
  ];

  const financials = {
    courtCost: 200000,
    shuttlecocksUsed: 4,
    shuttlecockPrice: 25000,
    totalSessionCost: 300000,
    calculatedFeePerPerson: 60000,
  };

  const result = generateSessionSettlementText(session, attendances, financials, 'https://example.com/session/123');

  const lines = result.trim().split('\n');
  assert.equal(lines.length, 6, `Expected 6 lines, got ${lines.length}:\n${result}`);
  assert.equal(lines[0], '🏸 TỔNG KẾT TIỀN SÂN - GRAVITY BADMINTON');
  assert.equal(lines[1], '📅 Ngày: 2026-09-06 | 📍 Sân Cầu Lông Sky');
  assert.equal(lines[2], '🏟️ Số lượng sân: Sân 3');
  assert.equal(lines[3], '🙌 Tổng số người: 5'); // (1+1) + (1+0) + (1+2) = 5
  assert.equal(lines[4], '💰 Chi phí: Sân 200.000đ + Cầu (4 quả = 100.000đ) = 300.000đ');
  assert.equal(lines[5], '💵 Tiền sân/người: 60.000đ / người');
});

test('generateSessionSettlementText defaults courtNumber to 1 when missing', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
  };

  const attendances = [
    { name: 'Thuan', actualAttended: true, guestCount: 0 },
  ];

  const financials = {
    courtCost: 100000,
    shuttlecocksUsed: 0,
    shuttlecockPrice: 25000,
    totalSessionCost: 100000,
    calculatedFeePerPerson: 100000,
  };

  const result = generateSessionSettlementText(session, attendances, financials);
  const lines = result.trim().split('\n');
  assert.equal(lines[2], '🏟️ Số lượng sân: 1');
  assert.equal(lines[3], '🙌 Tổng số người: 1');
  assert.equal(lines[4], '💰 Chi phí: Sân 100.000đ + Cầu (0 quả = 0đ) = 100.000đ');
  assert.equal(lines[5], '💵 Tiền sân/người: 100.000đ / người');
});

test('generateSessionSettlementText handles 3-argument legacy signature gracefully', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
    courtNumber: '2',
  };

  const financials = {
    courtCost: 150000,
    shuttlecocksUsed: 2,
    shuttlecockPrice: 25000,
    totalSessionCost: 200000,
    calculatedFeePerPerson: 50000,
    totalActualPlayers: 4,
  };

  const result = generateSessionSettlementText(session, financials, 'https://example.com/session/123');
  const lines = result.trim().split('\n');
  assert.equal(lines[2], '🏟️ Số lượng sân: 2');
  assert.equal(lines[3], '🙌 Tổng số người: 4');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sessionSocialShare.test.mjs`
Expected: FAIL because current `generateSessionSettlementText` produces additional lines (bank info, url, etc.).

- [ ] **Step 3: Refactor `generateSessionSettlementText` in `app/utils/sessionSocialShare.ts`**

Update `generateSessionSettlementText` in `app/utils/sessionSocialShare.ts`:
```typescript
export const generateSessionSettlementText = (
  session: any,
  attendancesOrFinancials?: any,
  financialsOrUrl?: any,
  sessionUrl?: string,
): string => {
  if (!session) return '';
  const isFourArgs = Array.isArray(attendancesOrFinancials);
  const attendances = isFourArgs ? attendancesOrFinancials : [];
  const financials = isFourArgs ? financialsOrUrl : attendancesOrFinancials;

  const actualPlayers = (attendances || []).filter((a: any) => a?.actualAttended);
  const calculatedPlayers = actualPlayers.reduce(
    (acc: number, a: any) => acc + 1 + (Number(a?.guestCount) || 0),
    0,
  );
  const totalActualPlayers = calculatedPlayers || Number(financials?.totalActualPlayers) || 0;

  const courtCost = financials?.courtCost || 0;
  const shuttlecocksUsed = financials?.shuttlecocksUsed || 0;
  const shuttlecockPrice = financials?.shuttlecockPrice || 0;
  const shuttleCost = shuttlecocksUsed * shuttlecockPrice;
  const totalCost = financials?.totalSessionCost || (courtCost + shuttleCost);
  const feePerPerson = financials?.calculatedFeePerPerson || 0;
  const courtNumberDisplay = session.courtNumber || 1;

  let text = `🏸 TỔNG KẾT TIỀN SÂN - GRAVITY BADMINTON\n`;
  text += `📅 Ngày: ${session.date || ''} | 📍 ${session.location || ''}\n`;
  text += `🏟️ Số lượng sân: ${courtNumberDisplay}\n`;
  text += `🙌 Tổng số người: ${totalActualPlayers}\n`;
  text += `💰 Chi phí: Sân ${courtCost.toLocaleString('vi-VN')}đ + Cầu (${shuttlecocksUsed} quả = ${shuttleCost.toLocaleString('vi-VN')}đ) = ${totalCost.toLocaleString('vi-VN')}đ\n`;
  text += `💵 Tiền sân/người: ${feePerPerson.toLocaleString('vi-VN')}đ / người`;

  return text;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sessionSocialShare.test.mjs`
Expected: PASS (3/3 tests pass).

- [ ] **Step 5: Commit Task 1**

```bash
git add tests/sessionSocialShare.test.mjs app/utils/sessionSocialShare.ts
git commit -m "refactor(social-share): simplify settlement message text to 6-line breakdown"
```

---

### Task 2: Internationalization Keys (`en.ts` and `vi.ts`)

**Files:**
- Modify: `app/locales/vi.ts:191-206`
- Modify: `app/locales/en.ts:191-206`
- Test: `tests/i18n.test.mjs`

**Interfaces:**
- Consumes: None
- Produces: `socialShare` dictionary additions:
  - `copyQRImage`: string
  - `toastQRCopied`: string
  - `copyQRFailed`: string
  - `qrPaymentCard`: string
  - `copiedQRImage`: string

- [ ] **Step 1: Add translation keys to `app/locales/vi.ts`**

In `app/locales/vi.ts`, under `socialShare`:
```typescript
    copyQRImage: 'Sao chép ảnh QR',
    toastQRCopied: 'Đã sao chép ảnh QR vào bộ nhớ tạm!',
    copyQRFailed: 'Không thể sao chép ảnh QR. Bạn có thể nhấn giữ ảnh để lưu.',
    qrPaymentCard: 'Mã VietQR thanh toán',
    copiedQRImage: 'Đã sao chép ảnh QR!',
```

- [ ] **Step 2: Add matching translation keys to `app/locales/en.ts`**

In `app/locales/en.ts`, under `socialShare`:
```typescript
    copyQRImage: 'Copy QR Image',
    toastQRCopied: 'QR image copied to clipboard!',
    copyQRFailed: 'Failed to copy QR image. You can long-press the image to save.',
    qrPaymentCard: 'VietQR Payment Card',
    copiedQRImage: 'QR Image Copied!',
```

- [ ] **Step 3: Run i18n parity test**

Run: `node --test tests/i18n.test.mjs`
Expected: PASS (parity check passes with 0 missing keys).

- [ ] **Step 4: Commit Task 2**

```bash
git add app/locales/vi.ts app/locales/en.ts
git commit -m "feat(i18n): add translations for VietQR image copy and card preview"
```

---

### Task 3: VietQR Card Preview, 1-Tap Copy & Native File Sharing (`SocialShareModal.vue`)

**Files:**
- Modify: `app/components/session/SocialShareModal.vue`

**Interfaces:**
- Consumes:
  - `generateVietQRUrl` from `~/utils/vietqr`
  - `generateSessionInviteText`, `generateSessionSettlementText` from `~/utils/sessionSocialShare`
  - `t` from `useI18n()`
  - `useToast()`
- Produces:
  - Computed `vietQRUrl` with template `compact2`
  - `copyQRImage()`: copies blob to clipboard with fallback
  - `handleNativeShare()`: attaches PNG file via `navigator.share` when supported
  - Reactive QR preview card with loading state, error state, and copy button

- [ ] **Step 1: Implement VietQR logic and copy / share handlers in `SocialShareModal.vue`**

In `<script setup lang="ts">`:
1. Import `generateVietQRUrl` from `~/utils/vietqr`.
2. Add reactive state:
   - `qrCopied = ref(false)`
   - `qrLoading = ref(true)`
   - `qrError = ref(false)`
3. Compute `vietQRUrl`:
   ```typescript
   const vietQRUrl = computed(() => {
     if (props.session?.paymentQR) {
       return props.session.paymentQR;
     }
     const bankInfo = props.session?.bankInfo;
     if (!bankInfo?.accountNumber || (!bankInfo?.bankName && !bankInfo?.bankCode)) {
       return '';
     }
     const feePerPerson = props.financials?.calculatedFeePerPerson || 0;
     const memoDate = props.session?.date ? props.session.date.replace(/-/g, '') : '';
     return generateVietQRUrl({
       bankId: bankInfo.bankCode || bankInfo.bankName,
       accountNumber: bankInfo.accountNumber,
       accountName: bankInfo.accountName,
       amount: feePerPerson > 0 ? feePerPerson : undefined,
       memo: `BDM ${memoDate}`.trim(),
       template: 'compact2',
     });
   });
   ```
4. Implement `fetchQRBlob()`:
   ```typescript
   const fetchQRBlob = async (): Promise<Blob | null> => {
     if (!vietQRUrl.value) return null;
     try {
       const response = await fetch(vietQRUrl.value);
       if (!response.ok) throw new Error('Fetch image failed');
       return await response.blob();
     } catch (err) {
       console.error('Failed to fetch QR blob:', err);
       return null;
     }
   };
   ```
5. Implement `copyQRImage()`:
   ```typescript
   const copyQRImage = async () => {
     if (!vietQRUrl.value) return;
     try {
       const blob = await fetchQRBlob();
       if (!blob) throw new Error('Could not get image blob');
       
       // ClipboardItem requires image/png
       const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
       await navigator.clipboard.write([
         new ClipboardItem({ 'image/png': pngBlob }),
       ]);

       qrCopied.value = true;
       setTimeout(() => {
         qrCopied.value = false;
       }, 2500);

       toast.add({
         severity: 'success',
         summary: t('common.copied'),
         detail: t('socialShare.toastQRCopied'),
         life: 3000,
       });
     } catch (err) {
       console.error('Failed to copy QR image:', err);
       toast.add({
         severity: 'warn',
         summary: t('common.notice'),
         detail: t('socialShare.copyQRFailed'),
         life: 4000,
       });
     }
   };
   ```
6. Upgrade `handleNativeShare()`:
   ```typescript
   const handleNativeShare = async () => {
     if (typeof navigator === 'undefined' || !navigator.share) {
       copyContent();
       return;
     }

     try {
       if (activeTab.value === 'settlement' && vietQRUrl.value && navigator.canShare) {
         const blob = await fetchQRBlob();
         if (blob) {
           const file = new File([blob], 'vietqr.png', { type: blob.type || 'image/png' });
           if (navigator.canShare({ files: [file] })) {
             await navigator.share({
               title: `Badminton - ${props.session?.date}`,
               text: currentText.value,
               files: [file],
             });
             return;
           }
         }
       }

       // Fallback text + url share
       await navigator.share({
         title: `Badminton - ${props.session?.date}`,
         text: currentText.value,
         url: sessionUrl.value,
       });
     } catch (e) {
       // User cancelled or share aborted
     }
   };
   ```

- [ ] **Step 2: Add VietQR preview card to the template in `SocialShareModal.vue`**

On the Settlement tab (`activeTab === 'settlement' && vietQRUrl`), render the preview card:
```vue
      <!-- VietQR Image Preview Card (Settlement Tab) -->
      <div
        v-if="activeTab === 'settlement' && vietQRUrl"
        class="overflow-hidden rounded-2xl border border-brand-line bg-gradient-to-b from-white/95 to-brand-sand/50 p-3 shadow-sm transition-all"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-black uppercase tracking-wider text-brand-court">
            {{ t('socialShare.qrPaymentCard') }}
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-brand-line bg-white px-2.5 py-1 text-xs font-bold text-brand-ink shadow-sm transition-all hover:border-brand-court hover:bg-brand-sand active:scale-95"
            @click="copyQRImage"
          >
            <Check v-if="qrCopied" :size="13" class="text-emerald-600" />
            <Copy v-else :size="13" class="text-brand-slate" />
            <span :class="{ 'text-emerald-600': qrCopied }">
              {{ qrCopied ? t('socialShare.copiedQRImage') : t('socialShare.copyQRImage') }}
            </span>
          </button>
        </div>

        <div class="relative flex min-h-[160px] items-center justify-center rounded-xl bg-white p-2">
          <div
            v-if="qrLoading && !qrError"
            class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs"
          >
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand-court border-t-transparent" />
          </div>
          <img
            :src="vietQRUrl"
            alt="VietQR Payment Card"
            class="max-h-72 w-full object-contain rounded-lg transition-opacity duration-300"
            :class="qrLoading ? 'opacity-0' : 'opacity-100'"
            @load="qrLoading = false"
            @error="qrError = true; qrLoading = false"
          />
          <div v-if="qrError" class="p-4 text-center text-xs font-medium text-amber-700">
            {{ t('socialShare.copyQRFailed') }}
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Run `npm run build` to verify type safety and template correctness**

Run: `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add app/components/session/SocialShareModal.vue
git commit -m "feat(social-share): add VietQR card preview, 1-tap image copy, and native file sharing"
```

---

### Task 4: End-to-End Build & Automated Test Suite Verification

**Files:**
- Test: `tests/sessionSocialShare.test.mjs`
- Test: `tests/i18n.test.mjs`
- Test: `npm run build`

- [ ] **Step 1: Run all unit tests**

Run: `node --test tests/*.test.mjs`
Expected: All tests pass.

- [ ] **Step 2: Run production build verification**

Run: `npm run build`
Expected: Nitro and Vite build finishes with exit code 0.

- [ ] **Step 3: Commit all changes & finalize**

```bash
git status
git commit -m "chore: complete settlement text simplification and VietQR image sharing"
```
