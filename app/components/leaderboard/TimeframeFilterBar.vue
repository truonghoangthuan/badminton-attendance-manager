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
        <span>{{ t('leaderboard.filterReset') }}</span>
      </button>
    </div>

    <!-- Summary Pill -->
    <div class="flex items-center justify-between text-[11px] font-bold text-brand-slate px-1">
      <span>{{ t('leaderboard.sessionsInPeriod', { count: sessionCount }) }}</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
</style>
