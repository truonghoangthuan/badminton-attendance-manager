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
