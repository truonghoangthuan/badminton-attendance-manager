# Admin Panel Simplification & UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate ~250 lines of duplicated/dead code across the `/admin` routes while fixing court-side UX gaps (inline guest count editing, bulk check-in, roster filtering, sticky sidebar overflow, financial input race condition, smart session defaults, UTC date bug, and layout/i18n consistency).

**Architecture:** Extract the duplicated session setup modal into `app/components/admin/AdminSessionFormModal.vue`, add a timezone-safe `getLocalTodayDate` helper in `app/utils/dateFormat.ts`, unify the mobile/desktop attendance lists in `app/pages/admin/session/[id].vue` into one responsive list with inline guest steppers and bulk check-in, decouple financial inputs from live `onSnapshot` overwrites, and align `app/layouts/admin.vue` + `app/pages/admin/index.vue` with the app's `brand-*` glass design and full `en`/`vi` i18n parity.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Firebase Firestore, PrimeVue (`InputNumber`, `Toast`), Node.js built-in test runner (`node --test`).

## Global Constraints

- Preserve all product invariants in `AGENTS.md` (Firestore field names, `app/utils/sessionFinancials.ts` math, cascade session deletion, admin auth middleware).
- Maintain 100% key parity between `app/locales/en.ts` and `app/locales/vi.ts` (`tests/i18n.test.mjs`).
- Prefer native inputs (`<UIGlassInput type="time">`) and deletion over custom abstractions (Ponytail rules).
- Both `npm test` and `npm run build` must pass.

---

### Task 1: Local Date Helper & i18n Keys

**Files:**
- Modify: `app/utils/dateFormat.ts`
- Modify: `app/locales/en.ts`
- Modify: `app/locales/vi.ts`
- Modify: `tests/dateFormat.test.mjs`

**Interfaces:**
- Produces: `getLocalTodayDate(now?: Date): string` in `app/utils/dateFormat.ts` returning `YYYY-MM-DD` in local timezone, plus new admin translation keys in `app/locales/en.ts` and `app/locales/vi.ts`.

- [ ] **Step 1: Write the failing test in `tests/dateFormat.test.mjs`**

Read `tests/dateFormat.test.mjs` first, then append a test verifying `getLocalTodayDate` returns local `YYYY-MM-DD` instead of UTC date:

```js
test('getLocalTodayDate returns YYYY-MM-DD in local timezone', () => {
  const sample = new Date(2026, 9, 26, 1, 30, 0); // Oct 26, 2026 01:30 local
  assert.equal(getLocalTodayDate(sample), '2026-10-26');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/dateFormat.test.mjs`
Expected: FAIL with `getLocalTodayDate is not exported` or `is not a function`.

- [ ] **Step 3: Implement `getLocalTodayDate` in `app/utils/dateFormat.ts` and add i18n keys to `app/locales/en.ts` and `app/locales/vi.ts`**

In `app/utils/dateFormat.ts`, add:

```ts
export const getLocalTodayDate = (now: Date = new Date()): string => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

In `app/locales/en.ts` under `admin`:
```ts
    filterAll: 'All',
    filterActive: 'Upcoming & Active',
    filterCompleted: 'Completed',
    lockConfirmHeader: 'Lock Session RSVPs',
    lockConfirmMessage: 'Lock RSVPs for this session? Players will no longer be able to edit their RSVP.',
    lock: 'Lock',
    saveError: 'Failed to save changes. Please try again.',
    inheritedDefaultsHint: 'Pre-filled Court, Cost & Bank settings from your latest session.',
```
And under `admin.detail`:
```ts
      filterAll: 'All ({count})',
      filterJoining: 'Joining ({count})',
      filterUnpaid: 'Unpaid ({count})',
      checkInAllBtn: 'Check in all RSVPs ({count})',
      adjustGuestsAria: 'Adjust guest count',
```

In `app/locales/vi.ts` under `admin`:
```ts
    filterAll: 'Tất cả',
    filterActive: 'Đang mở & Sắp tới',
    filterCompleted: 'Đã kết thúc',
    lockConfirmHeader: 'Khóa đăng ký phiên đấu',
    lockConfirmMessage: 'Khóa danh sách đăng ký cho phiên này? Người chơi sẽ không thể tự sửa trạng thái nữa.',
    lock: 'Khóa sổ',
    saveError: 'Không thể lưu thay đổi. Vui lòng thử lại.',
    inheritedDefaultsHint: 'Đã tự động điền giá sân, cầu và ngân hàng từ phiên gần nhất.',
```
And under `admin.detail`:
```ts
      filterAll: 'Tất cả ({count})',
      filterJoining: 'Tham gia ({count})',
      filterUnpaid: 'Chưa đóng ({count})',
      checkInAllBtn: 'Điểm danh tất cả ({count})',
      adjustGuestsAria: 'Chỉnh số khách đi kèm',
```

- [ ] **Step 4: Run tests to verify `dateFormat` and `i18n` pass**

Run: `node --test tests/dateFormat.test.mjs tests/i18n.test.mjs`
Expected: PASS

---

### Task 2: Extract Shared `AdminSessionFormModal.vue` & Clean Up Minor Bloat

**Files:**
- Create: `app/components/admin/AdminSessionFormModal.vue`
- Modify: `app/pages/admin/login.vue:189-203`
- Modify: `app/components/admin/AdminQRCodeManager.vue:399`

**Interfaces:**
- Produces: `<AdminSessionFormModal v-model="open" v-model:form="formState" :is-editing="bool" :loading="bool" :hint="string" @submit="fn" />`

- [ ] **Step 1: Create `app/components/admin/AdminSessionFormModal.vue`**

```vue
<script setup lang="ts">
import { Calendar, ChevronDown, Clock3, Feather, Grid2x2, MapPin, Trophy, Users } from 'lucide-vue-next';
import { SKILL_LEVEL_OPTIONS } from '~/types/session';

export interface SessionFormState {
  date: string;
  time: string;
  location: string;
  maxPlayers: number;
  courtNumber: string;
  shuttlecockType: string;
  level: string;
}

defineProps<{
  modelValue: boolean;
  form: SessionFormState;
  isEditing?: boolean;
  loading?: boolean;
  hint?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <UIGlassModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <template #header>
      <div class="flex flex-col gap-1.5 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">{{ t('admin.setupKicker') }}</p>
        <h2 class="text-2xl font-black tracking-tight text-brand-ink">
          {{ isEditing ? t('admin.editModalTitle') : t('admin.createModalTitle') }}
        </h2>
        <p class="text-sm font-medium text-brand-slate">
          {{ isEditing ? t('admin.editModalDesc') : t('admin.createModalDesc') }}
        </p>
        <p v-if="!isEditing && hint" class="mt-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          {{ hint }}
        </p>
      </div>
    </template>

    <form class="flex flex-col gap-4" @submit.prevent="emit('submit')">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UIGlassInput v-model="form.date" type="date" :label="t('admin.dateLabel')" required>
          <template #icon><Calendar :size="18" /></template>
        </UIGlassInput>

        <UIGlassInput v-model="form.time" type="time" :label="t('admin.timeLabel')" required>
          <template #icon><Clock3 :size="18" /></template>
        </UIGlassInput>
      </div>

      <UIGlassInput
        v-model="form.location"
        type="text"
        :label="t('admin.locationLabel')"
        :placeholder="t('admin.locationPlaceholder')"
        required
      >
        <template #icon><MapPin :size="18" /></template>
      </UIGlassInput>

      <UIGlassInput
        v-model.number="form.maxPlayers"
        type="number"
        min="2"
        max="50"
        :label="t('admin.capacityLabel')"
        placeholder="8"
        required
      >
        <template #icon><Users :size="18" /></template>
      </UIGlassInput>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UIGlassInput
          v-model="form.courtNumber"
          type="text"
          :label="t('admin.courtNumberLabel')"
          :placeholder="t('admin.courtNumberPlaceholder')"
        >
          <template #icon><Grid2x2 :size="18" /></template>
        </UIGlassInput>

        <UIGlassInput
          v-model="form.shuttlecockType"
          type="text"
          :label="t('admin.shuttlecockLabel')"
          :placeholder="t('admin.shuttlecockPlaceholder')"
        >
          <template #icon><Feather :size="18" /></template>
        </UIGlassInput>
      </div>

      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
          {{ t('admin.skillLevelLabel') }}
        </label>
        <div class="group relative">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate">
            <Trophy :size="18" />
          </div>
          <div class="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate/80">
            <ChevronDown :size="18" />
          </div>
          <select
            v-model="form.level"
            class="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-brand-ink outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">{{ t('admin.allSkillLevels') }}</option>
            <option v-for="lvl in SKILL_LEVEL_OPTIONS" :key="lvl" :value="lvl">{{ lvl }}</option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <UIGlassButton type="button" variant="secondary" @click="emit('update:modelValue', false)">
          {{ t('common.cancel') }}
        </UIGlassButton>
        <UIGlassButton type="submit" :loading="loading">
          {{ isEditing ? t('admin.saveChangesBtn') : t('admin.createBtn') }}
        </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>
</template>
```

- [ ] **Step 2: Remove duplicate `@keyframes login-spin` in `app/pages/admin/login.vue` and hardcoded Vietnamese string in `app/components/admin/AdminQRCodeManager.vue`**

In `app/pages/admin/login.vue`, delete lines 189-203 (`<style scoped>...</style>`).
In `app/components/admin/AdminQRCodeManager.vue:399`, replace `Lỗi hiển thị QR` with `{{ t('sessionDetail.qrLoadError') }}`.

---

### Task 3: Unify `app/layouts/admin.vue` & Upgrade `app/pages/admin/index.vue`

**Files:**
- Modify: `app/layouts/admin.vue`
- Modify: `app/pages/admin/index.vue`

**Interfaces:**
- Consumes: `getLocalTodayDate` from `~/utils/dateFormat`, `<AdminSessionFormModal>` from `~/components/admin/AdminSessionFormModal.vue`.

- [ ] **Step 1: Update `app/layouts/admin.vue` to match brand glass aesthetic & mobile `<UILanguageSwitcher />`**

Replace `app/layouts/admin.vue` with the unified brand layout (removing unused Google Fonts `<link>` for Newsreader, unused icon imports, and adding `<UILanguageSwitcher />` on mobile):

```vue
<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { Home, LayoutDashboard, LogOut, Menu, X } from 'lucide-vue-next'

const { auth } = useFirebase()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isMobileMenuOpen = ref(false)

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

const handleLogout = async () => {
  try {
    await signOut(auth)
    router.push('/admin/login')
  } catch (e) {
    console.error('Logout failed', e)
  }
}
</script>

<template>
  <div class="relative min-h-screen">
    <div class="bg-mesh" />
    <nav class="sticky top-0 z-50 w-full px-4 py-4 md:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="glass-shell flex items-center justify-between gap-3 px-4 py-3.5 md:px-6">
          <NuxtLink to="/admin" class="group flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-line bg-brand-court transition-transform group-hover:scale-105">
              <img src="/favicon.svg" alt="Gravity Badminton" class="h-6 w-6" />
            </div>
            <div>
              <p class="section-kicker">{{ t('admin.kicker') }}</p>
              <span class="text-lg font-black tracking-tight text-brand-ink">
                {{ t('admin.panelTitle') }}
              </span>
            </div>
          </NuxtLink>

          <div class="hidden items-center gap-3 md:flex">
            <NuxtLink
              to="/admin"
              class="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold transition-colors"
              :class="route.path === '/admin' ? 'bg-brand-sand text-brand-ink' : 'text-brand-slate hover:bg-brand-sand hover:text-brand-ink'"
            >
              <LayoutDashboard :size="16" />
              {{ t('nav.dashboard') }}
            </NuxtLink>
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink"
            >
              <Home :size="16" />
              {{ t('nav.backToSite') }}
            </NuxtLink>
            <UILanguageSwitcher />
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-2xl border border-brand-line bg-white/80 px-3.5 py-2 text-sm font-bold text-brand-slate transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              @click="handleLogout"
            >
              <LogOut :size="16" />
              {{ t('nav.logout') }}
            </button>
          </div>

          <div class="flex items-center gap-2 md:hidden">
            <UILanguageSwitcher />
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-line bg-white/80 text-brand-slate"
              @click="isMobileMenuOpen = !isMobileMenuOpen"
            >
              <Menu v-if="!isMobileMenuOpen" :size="20" />
              <X v-else :size="20" />
            </button>
          </div>
        </div>

        <div v-if="isMobileMenuOpen" class="mt-2 rounded-2xl border border-brand-line bg-white p-3 shadow-lg md:hidden">
          <nav class="flex flex-col gap-1">
            <NuxtLink
              to="/admin"
              class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold"
              :class="route.path === '/admin' ? 'bg-brand-sand text-brand-ink' : 'text-brand-slate'"
            >
              <LayoutDashboard :size="16" />
              {{ t('nav.dashboard') }}
            </NuxtLink>
            <NuxtLink to="/" class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-brand-slate">
              <Home :size="16" />
              {{ t('nav.backToSite') }}
            </NuxtLink>
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
              @click="handleLogout"
            >
              <LogOut :size="16" />
              {{ t('nav.logout') }}
            </button>
          </nav>
        </div>
      </div>
    </nav>

    <main class="relative z-10 mx-auto max-w-7xl px-4 py-6 pb-16 md:px-6 md:py-8">
      <slot />
    </main>
  </div>

  <UIConfirmDialog />
  <Toast />
</template>
```

- [ ] **Step 2: Refactor `app/pages/admin/index.vue` with smart defaults, status filter tabs, confirmation on lock, and `<AdminSessionFormModal>`**

Update `app/pages/admin/index.vue` to:
1. Use `getLocalTodayDate()` instead of `new Date().toISOString().split('T')[0]`.
2. Pre-fill `newSession` from `sessions.value[0]` (latest session) when creating a session, and copy `financials.courtCost`, `financials.shuttlecockPackPrice`, `financials.shuttlecockPrice`, `bankInfo`, and `paymentQR` into the new session document so the organizer doesn't re-enter court/shuttle prices or bank details every week.
3. Add status filter tabs (`all`, `active`, `completed`) and an empty state card.
4. Show localized status badge (`t(\`sessionStatus.\${session.status}\`)`), court/shuttle/level chips, and require confirmation when locking an `open` session as well as completing/reopening.
5. Replace the 103-line inline modal with `<AdminSessionFormModal>`.

---

### Task 4: Overhaul `app/pages/admin/session/[id].vue`

**Files:**
- Modify: `app/pages/admin/session/[id].vue`

**Interfaces:**
- Consumes: `<AdminSessionFormModal>` from `~/components/admin/AdminSessionFormModal.vue`.

- [ ] **Step 1: Unify mobile/desktop attendance lists, add inline guest count `- / +` stepper, bulk check-in, and filter pills**

In `app/pages/admin/session/[id].vue`:
1. Add `rosterFilter = ref<'all' | 'joining' | 'unpaid'>('all')`.
2. Add `filteredAttendances = computed(...)` sorting by `isJoining` desc, `actualAttended` desc, `name` asc, and filtering by `rosterFilter`.
3. Add `uncheckedJoiningAttendees = computed(() => attendances.value.filter(a => a.isJoining && !a.actualAttended))` and `checkInAllJoining()` using `Promise.all` to mark all joining RSVPs present in one click.
4. Add `updateGuestCount(att, delta)` clamping `Math.max(0, (att.guestCount || 0) + delta)` and calling `updateDoc`.
5. Replace the separate 85-line `md:hidden` block and 111-line `hidden md:block` `<table>` with a single responsive list where each attendee row shows name, badges, inline guest `- / +` stepper, check-in button, payment toggle + calculated debt, and delete button.

- [ ] **Step 2: Fix financial input race condition, un-nest `<AdminQRCodeManager>`, and use `<AdminSessionFormModal>`**

In `app/pages/admin/session/[id].vue`:
1. Maintain `financeDraft = ref({ courtCost: 0, shuttlecocksUsed: 0, shuttlecockPackPrice: 0 })` and `financeEditing = ref(false)`. Sync `financeDraft` from `onSnapshot` only when `!financeEditing.value`.
2. Compute `financialBreakdown` from `financeDraft.value` + `totalActualPlayers.value`.
3. Render the 3 financial `InputNumber` fields with a `v-for` over `(['courtCost', 'shuttlecocksUsed', 'shuttlecockPackPrice'] as const)` with `@focus="financeEditing = true"` and `@blur="financeEditing = false; updateFinancials()"`.
4. Move `<AdminQRCodeManager>` out of the `sticky top-8` settlement `<UIGlassCard>` into its own sibling card in the right column (`<div class="space-y-6 lg:sticky lg:top-24">`).
5. Replace the 86-line edit modal with `<AdminSessionFormModal v-model="showEditModal" :form="editForm" is-editing :loading="savingEdits" @submit="saveSessionEdits" />`.
6. Add `toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 })` on Firestore mutation errors.

---

### Task 5: Verification

**Files:**
- Test: `tests/*.test.mjs`

- [ ] **Step 1: Run full unit test suite**

Run: `npm test`
Expected: All tests in `tests/*.test.mjs` PASS (including `i18n.test.mjs` and `dateFormat.test.mjs`).

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Nuxt client + server build succeeds with 0 TypeScript or bundle errors.
