# Leaderboard Ranking Transparency and Time Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide full ranking transparency with a dedicated ranking rules modal and add responsive timeframe filters (`All time`, `This month`, `Time range`) to `/leaderboard` that reactively recalculate club stats, top 3 podium, and member directory.

**Architecture:** Fetch sessions and attendances once on page mount into an in-memory reactive store; compute filtered sessions, recalculated club stats, and sorted player rankings on the client for instantaneous zero-latency filter switches without additional Firestore reads.

**Tech Stack:** Nuxt 4, Vue 3 (Composition API), TypeScript, Tailwind CSS, Lucide icons, PrimeVue / glass-style UI primitives (`app/components/UI`).

## Global Constraints

- Never alter existing Firestore document schemas or field names.
- Keep client-side data reactive using Vue 3 `computed` without unnecessary network refetches.
- Preserve existing glassmorphism aesthetic (`UIGlassCard`, `UIGlassButton`, `UIGlassModal`, `UIGlassInput`).
- Maintain full bilingual support across `app/locales/vi.ts` and `app/locales/en.ts`.
- Ensure all builds pass cleanly (`npm run build`).

---

### Task 1: Add i18n Localization Keys for Ranking Rules and Filters

**Files:**
- Modify: `app/locales/vi.ts:212-250`
- Modify: `app/locales/en.ts:212-250`

**Interfaces:**
- Consumes: Existing `leaderboard` key structure in `app/locales/vi.ts` and `app/locales/en.ts`.
- Produces: New translation keys for ranking modal and timeframe filters:
  - `rulesButton`, `rulesTitle`, `rulesKicker`, `rulesPrimaryTitle`, `rulesPrimaryDesc`, `rulesSecondaryTitle`, `rulesSecondaryDesc`, `rulesBadgesTitle`, `rulesClose`
  - `filterAll`, `filterThisMonth`, `filterCustom`, `fromDate`, `toDate`, `sessionsInPeriod`, `noActivityInPeriod`

- [ ] **Step 1: Add keys to `app/locales/vi.ts`**

Insert the following keys under the `leaderboard` section in `app/locales/vi.ts`:
```ts
    rulesButton: 'Cách tính hạng',
    rulesTitle: 'Cách xếp hạng bảng vàng',
    rulesKicker: 'Quy định minh bạch',
    rulesPrimaryTitle: '1. Tiêu chí chính: Số buổi tham gia',
    rulesPrimaryDesc: 'Mỗi buổi cầu bạn có mặt thực tế và được điểm danh trên sân (Check-in) sẽ được tính 1 điểm tích lũy.',
    rulesSecondaryTitle: '2. Tiêu chí phụ: Điểm uy tín (Reliability)',
    rulesSecondaryDesc: 'Tỉ lệ % số buổi thực tế trên số lần đăng ký (RSVP). Giúp phân định thứ hạng khi hai người chơi có cùng số buổi tham gia.',
    rulesBadgesTitle: '3. Hệ thống danh hiệu vinh danh',
    rulesClose: 'Đã hiểu',
    filterAll: 'Tất cả',
    filterThisMonth: 'Tháng này',
    filterCustom: 'Khoảng thời gian',
    fromDate: 'Từ ngày',
    toDate: 'Đến ngày',
    sessionsInPeriod: '{count} buổi trong giai đoạn này',
    noActivityInPeriod: 'Không có hoạt động điểm danh nào trong khoảng thời gian này.',
```

- [ ] **Step 2: Add keys to `app/locales/en.ts`**

Insert the corresponding English keys under `leaderboard` in `app/locales/en.ts`:
```ts
    rulesButton: 'How Ranking Works',
    rulesTitle: 'Badminton Hall of Fame Rules',
    rulesKicker: 'Transparent Guidelines',
    rulesPrimaryTitle: '1. Primary Metric: Matches Attended',
    rulesPrimaryDesc: 'Every session where you are physically checked in on court by organizers counts as 1 match attended.',
    rulesSecondaryTitle: '2. Tiebreaker: Attendance Reliability',
    rulesSecondaryDesc: 'Percentage of actual attendance vs total RSVPs. Used to break ties when two players have the same match count.',
    rulesBadgesTitle: '3. Title Badges & Tiers',
    rulesClose: 'Got It',
    filterAll: 'All Time',
    filterThisMonth: 'This Month',
    filterCustom: 'Time Range',
    fromDate: 'From',
    toDate: 'To',
    sessionsInPeriod: '{count} sessions in this period',
    noActivityInPeriod: 'No check-in activity recorded in this selected period.',
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build passes with no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add app/locales/vi.ts app/locales/en.ts
git commit -m "feat(i18n): add leaderboard ranking rules and filter translations"
```

---

### Task 2: Build the Ranking Rules Transparency Modal Component

**Files:**
- Create: `app/components/leaderboard/RankingRulesModal.vue`

**Interfaces:**
- Consumes:
  - `UIGlassModal` (auto-imported from `app/components/UI/GlassModal.vue`)
  - `UIGlassButton` (auto-imported from `app/components/UI/GlassButton.vue`)
  - Lucide icons (`Award`, `CheckCircle2`, `HelpCircle`, `ShieldCheck`, `Sparkles`, `Trophy`)
  - `useI18n`
- Produces: `<LeaderboardRankingRulesModal v-model="isOpen" />`

- [ ] **Step 1: Create `app/components/leaderboard/RankingRulesModal.vue`**

Write component with:
1. `defineProps<{ modelValue: boolean }>()` and `defineEmits<{ 'update:modelValue': [value: boolean] }>()`
2. Glass modal presenting:
   - Header with `Sparkles` icon, `rulesKicker`, and `rulesTitle`.
   - Card 1 (Primary Metric): Highlights physical presence requirement (`actualAttended = true`).
   - Card 2 (Tiebreaker): Highlights reliability formula: $\frac{\text{Matches}}{\text{RSVPs}} \times 100\%$ and latest active match.
   - Card 3 (Badges & Tiers): Visual breakdown of 🥇 Quán quân (Club Legend), 🥈 Á quân (Top Contender), 🥉 Hạng ba (Star Player), 🟢 Regular (Top 4–10), and ⚪ Member (Top 11+).
   - Footer with close button (`UIGlassButton`).

```vue
<script setup lang="ts">
import { Award, CheckCircle2, ShieldCheck, Sparkles, Trophy } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});
</script>

<template>
  <UIGlassModal
    v-model="isOpen"
    :title="t('leaderboard.rulesTitle')"
    max-width="max-w-2xl"
  >
    <div class="space-y-4 text-left">
      <!-- Kicker -->
      <div class="inline-flex items-center gap-1.5 rounded-full bg-brand-court/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-court">
        <Sparkles :size="14" />
        <span>{{ t('leaderboard.rulesKicker') }}</span>
      </div>

      <!-- Rule 1: Primary Metric -->
      <div class="rounded-2xl border border-brand-line bg-white/60 p-4 transition-all hover:bg-white/80">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-court/10 text-brand-court font-black">
            <Trophy :size="18" />
          </div>
          <div>
            <h4 class="font-black text-brand-ink text-sm sm:text-base">
              {{ t('leaderboard.rulesPrimaryTitle') }}
            </h4>
            <p class="mt-1 text-xs sm:text-sm text-brand-slate leading-relaxed">
              {{ t('leaderboard.rulesPrimaryDesc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Rule 2: Reliability Tiebreaker -->
      <div class="rounded-2xl border border-brand-line bg-white/60 p-4 transition-all hover:bg-white/80">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 font-black">
            <ShieldCheck :size="18" />
          </div>
          <div>
            <h4 class="font-black text-brand-ink text-sm sm:text-base">
              {{ t('leaderboard.rulesSecondaryTitle') }}
            </h4>
            <p class="mt-1 text-xs sm:text-sm text-brand-slate leading-relaxed">
              {{ t('leaderboard.rulesSecondaryDesc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Rule 3: Badge Tiers -->
      <div class="rounded-2xl border border-brand-line bg-white/60 p-4 transition-all hover:bg-white/80">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-black">
            <Award :size="18" />
          </div>
          <div class="w-full">
            <h4 class="font-black text-brand-ink text-sm sm:text-base">
              {{ t('leaderboard.rulesBadgesTitle') }}
            </h4>
            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div class="flex items-center gap-2 p-2 rounded-xl bg-amber-50/80 border border-amber-200">
                <span class="text-base">🥇</span>
                <div>
                  <p class="font-black text-amber-900">Top 1: {{ t('leaderboard.legendBadge') }}</p>
                  <p class="text-[11px] text-amber-700">{{ t('leaderboard.goldTitle') }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 border border-slate-200">
                <span class="text-base">🥈</span>
                <div>
                  <p class="font-black text-slate-800">Top 2: {{ t('leaderboard.contenderBadge') }}</p>
                  <p class="text-[11px] text-slate-600">{{ t('leaderboard.silverTitle') }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-2 rounded-xl bg-orange-50/80 border border-orange-200">
                <span class="text-base">🥉</span>
                <div>
                  <p class="font-black text-orange-900">Top 3: {{ t('leaderboard.starBadge') }}</p>
                  <p class="text-[11px] text-orange-700">{{ t('leaderboard.bronzeTitle') }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 font-black text-[10px]">#</span>
                <div>
                  <p class="font-black text-emerald-900">Top 4 - 10: {{ t('leaderboard.regularBadge') }}</p>
                  <p class="text-[11px] text-emerald-700">Chuyên cần thường xuyên</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <UIGlassButton variant="primary" @click="isOpen = false">
          {{ t('leaderboard.rulesClose') }}
        </UIGlassButton>
      </div>
    </template>
  </UIGlassModal>
</template>
```

- [ ] **Step 2: Verify component build**

Run: `npm run build`
Expected: Passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/leaderboard/RankingRulesModal.vue
git commit -m "feat(leaderboard): add ranking rules transparency modal component"
```

---

### Task 3: Build the Timeframe Filter Bar Component

**Files:**
- Create: `app/components/leaderboard/TimeframeFilterBar.vue`

**Interfaces:**
- Consumes:
  - `useI18n`
  - Lucide icons (`Calendar`, `CalendarDays`, `Clock`, `RotateCcw`, `Sparkles`)
- Produces: `<LeaderboardTimeframeFilterBar ... />`
  - Props:
    - `filterMode: 'all' | 'this_month' | 'custom'`
    - `startDate: string`
    - `endDate: string`
    - `sessionCount: number`
  - Emits:
    - `update:filterMode: [val: 'all' | 'this_month' | 'custom']`
    - `update:startDate: [val: string]`
    - `update:endDate: [val: string]`
    - `openRules: []`

- [ ] **Step 1: Create `app/components/leaderboard/TimeframeFilterBar.vue`**

Implement component with:
1. Segmented pill buttons: `All time`, `This month`, `Time range`.
2. Right-side "How ranking works" button emitting `openRules`.
3. An expandable custom date range section when `filterMode === 'custom'`:
   - Start Date `<input type="date">`
   - End Date `<input type="date">`
   - Reset button to quickly return to `all`
4. Active timeframe summary indicator showing current session count.

```vue
<script setup lang="ts">
import { Calendar, CalendarDays, HelpCircle, RotateCcw } from 'lucide-vue-next';

const props = defineProps<{
  filterMode: 'all' | 'this_month' | 'custom';
  startDate: string;
  endDate: string;
  sessionCount: number;
}>();

const emit = defineEmits<{
  'update:filterMode': [val: 'all' | 'this_month' | 'custom'];
  'update:startDate': [val: string];
  'update:endDate': [val: string];
  'openRules': [];
}>();

const { t } = useI18n();

const setMode = (mode: 'all' | 'this_month' | 'custom') => {
  emit('update:filterMode', mode);
};

const handleStartChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:startDate', target.value);
};

const handleEndChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:endDate', target.value);
};

const resetFilter = () => {
  emit('update:filterMode', 'all');
  emit('update:startDate', '');
  emit('update:endDate', '');
};
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Filter Segmented Tabs -->
      <div class="inline-flex rounded-2xl border border-brand-line bg-white/70 p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
          :class="filterMode === 'all' ? 'bg-brand-ink text-white shadow' : 'text-brand-slate hover:text-brand-ink'"
          @click="setMode('all')"
        >
          <span>{{ t('leaderboard.filterAll') }}</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
          :class="filterMode === 'this_month' ? 'bg-brand-ink text-white shadow' : 'text-brand-slate hover:text-brand-ink'"
          @click="setMode('this_month')"
        >
          <Calendar :size="13" />
          <span>{{ t('leaderboard.filterThisMonth') }}</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
          :class="filterMode === 'custom' ? 'bg-brand-ink text-white shadow' : 'text-brand-slate hover:text-brand-ink'"
          @click="setMode('custom')"
        >
          <CalendarDays :size="13" />
          <span>{{ t('leaderboard.filterCustom') }}</span>
        </button>
      </div>

      <!-- Ranking Rules Trigger Button -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-2xl border border-brand-line bg-white/70 px-3.5 py-1.5 text-xs font-black text-brand-slate shadow-sm backdrop-blur-sm transition-colors hover:border-brand-court/50 hover:text-brand-court"
        @click="emit('openRules')"
      >
        <HelpCircle :size="14" class="text-brand-court" />
        <span>{{ t('leaderboard.rulesButton') }}</span>
      </button>
    </div>

    <!-- Custom Date Range Expandable Panel -->
    <div
      v-if="filterMode === 'custom'"
      class="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-line bg-white/60 p-3 text-xs shadow-sm backdrop-blur-sm animate-fadeIn"
    >
      <div class="flex items-center gap-2">
        <span class="font-bold text-brand-slate">{{ t('leaderboard.fromDate') }}:</span>
        <input
          type="date"
          :value="startDate"
          class="rounded-xl border border-brand-line bg-white px-3 py-1.5 text-xs font-bold text-brand-ink focus:border-brand-court focus:outline-none"
          @input="handleStartChange"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="font-bold text-brand-slate">{{ t('leaderboard.toDate') }}:</span>
        <input
          type="date"
          :value="endDate"
          class="rounded-xl border border-brand-line bg-white px-3 py-1.5 text-xs font-bold text-brand-ink focus:border-brand-court focus:outline-none"
          @input="handleEndChange"
        />
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-bold text-brand-slate hover:text-brand-court transition-colors ml-auto"
        @click="resetFilter"
      >
        <RotateCcw :size="12" />
        <span>Reset</span>
      </button>
    </div>

    <!-- Summary Pill -->
    <div class="flex items-center justify-between text-[11px] font-bold text-brand-slate px-1">
      <span>{{ t('leaderboard.sessionsInPeriod', { count: sessionCount }) }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify component build**

Run: `npm run build`
Expected: Passes cleanly.

- [ ] **Step 3: Commit**

```bash
git add app/components/leaderboard/TimeframeFilterBar.vue
git commit -m "feat(leaderboard): add timeframe filter bar component"
```

---

### Task 4: Refactor `app/pages/leaderboard.vue` for In-Memory Reactive Filtering

**Files:**
- Modify: `app/pages/leaderboard.vue`

**Interfaces:**
- Consumes:
  - `LeaderboardTimeframeFilterBar`
  - `LeaderboardRankingRulesModal`
  - Firebase Firestore queries for sessions and attendances
- Produces:
  - Filtered sessions reactive state
  - Filtered stats cards (`totalSessionsCount`, `totalPlayerCheckIns`, `totalShuttlecocksUsed`, `activeMembersCount`)
  - Filtered players roster (`allPlayers`, `topThree`, `filteredPlayers`)

- [ ] **Step 1: Update Script Setup in `app/pages/leaderboard.vue`**

1. Define raw data models:
```ts
interface RawAttendance {
  name: string;
  isJoining: boolean;
  actualAttended: boolean;
  guestCount?: number;
}

interface RawSessionItem {
  id: string;
  date: string;
  shuttlecocksUsed: number;
  attendances: RawAttendance[];
}
```
2. Store `rawSessions = ref<RawSessionItem[]>([])`.
3. Add filter state:
```ts
const filterMode = ref<'all' | 'this_month' | 'custom'>('all');
const customStartDate = ref('');
const customEndDate = ref('');
const showRulesModal = ref(false);
```
4. Define computed `effectiveDateRange`:
   - `'this_month'`: Computes local first day `YYYY-MM-01` and last day `YYYY-MM-DD`.
   - `'custom'`: Returns `customStartDate.value` and `customEndDate.value`.
   - `'all'`: Returns undefined boundaries.
5. Define computed `filteredSessions`:
   - Filters `rawSessions.value` where session `date` is between `start` and `end`.
6. Define computed dynamic stats:
   - `totalSessionsCount`: `filteredSessions.value.length`
   - `totalShuttlecocksUsed`: sum of `s.shuttlecocksUsed`
   - `totalPlayerCheckIns`: sum of `1 + (att.guestCount || 0)` for `att.actualAttended`
7. Define computed `allPlayers`:
   - Aggregates attendances across `filteredSessions.value`.
   - Only includes players with `matchesPlayed > 0`.
   - Sorts by matches played desc, then reliability desc, then last date desc.
8. Retain `filteredPlayers` (searches `allPlayers` by `searchQuery`) and `topThree` (`allPlayers.slice(0, 3)`).

- [ ] **Step 2: Update Template in `app/pages/leaderboard.vue`**

1. Insert `<LeaderboardTimeframeFilterBar>` above the bento grid:
```vue
<LeaderboardTimeframeFilterBar
  v-model:filter-mode="filterMode"
  v-model:start-date="customStartDate"
  v-model:end-date="customEndDate"
  :session-count="totalSessionsCount"
  @open-rules="showRulesModal = true"
/>
```
2. Render `<LeaderboardRankingRulesModal v-model="showRulesModal" />` at the bottom.
3. Update empty states when `filteredSessions.length === 0` or `allPlayers.length === 0` to show `t('leaderboard.noActivityInPeriod')`.

- [ ] **Step 3: Run `npm run build`**

Run: `npm run build`
Expected: Successful build with zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/pages/leaderboard.vue
git commit -m "feat(leaderboard): integrate timeframe filtering and ranking rules modal"
```

---

### Task 5: Comprehensive Verification

- [ ] **Step 1: Execute production build**

Run: `npm run build`
Verify output bundle generated without errors or warnings.

- [ ] **Step 2: Manual code path validation**
  - Verify switching between "All time" and "This month" updates all 4 stats cards, top 3 podium, and member directory without reload.
  - Verify selecting custom date range updates list when valid dates are inputted.
  - Verify "How Ranking Works" button opens modal and displays all tiers and tie-breaker rules.
  - Verify search query functions accurately over filtered player list.
