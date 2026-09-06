<script setup lang="ts">
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  ArrowLeft,
  Award,
  Calendar,
  Flame,
  Medal,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-vue-next';

interface PlayerStats {
  name: string;
  matchesPlayed: number;
  reliabilityRate: number;
  lastPlayedDate: string;
}

const { db } = useFirebase();
const { t } = useI18n();
const loading = ref(true);
const searchQuery = ref('');

const allPlayers = ref<PlayerStats[]>([]);
const totalSessionsCount = ref(0);
const totalShuttlecocksUsed = ref(0);
const totalPlayerCheckIns = ref(0);

onMounted(async () => {
  try {
    const sessionsSnap = await getDocs(query(collection(db, 'sessions'), orderBy('date', 'desc')));
    totalSessionsCount.value = sessionsSnap.docs.length;

    const statsMap: Record<string, { matches: number; rsvps: number; lastDate: string }> = {};

    let totalShuttles = 0;
    let totalCheckIns = 0;

    // Fetch attendances across sessions in parallel batches
    await Promise.all(
      sessionsSnap.docs.map(async (sessionDoc) => {
        const sessionData = sessionDoc.data();
        const sessionDate = sessionData.date || '';
        totalShuttles += sessionData.financials?.shuttlecocksUsed || 0;

        const attendancesSnap = await getDocs(
          collection(db, `sessions/${sessionDoc.id}/attendances`)
        );

        attendancesSnap.docs.forEach((attDoc) => {
          const att = attDoc.data();
          const rawName = (att.name || '').trim();
          if (!rawName) return;

          // Normalize player key by lowercase name for consistent tracking
          const key = rawName;

          if (!statsMap[key]) {
            statsMap[key] = { matches: 0, rsvps: 0, lastDate: sessionDate };
          }

          if (att.isJoining) {
            statsMap[key].rsvps += 1;
          }

          if (att.actualAttended) {
            statsMap[key].matches += 1;
            totalCheckIns += 1 + (att.guestCount || 0);
            if (!statsMap[key].lastDate || sessionDate > statsMap[key].lastDate) {
              statsMap[key].lastDate = sessionDate;
            }
          }
        });
      })
    );

    totalShuttlecocksUsed.value = totalShuttles;
    totalPlayerCheckIns.value = totalCheckIns;

    allPlayers.value = Object.entries(statsMap)
      .map(([name, stat]) => {
        const reliability = stat.rsvps > 0 ? Math.round((stat.matches / stat.rsvps) * 100) : 100;
        return {
          name,
          matchesPlayed: stat.matches,
          reliabilityRate: Math.min(100, reliability),
          lastPlayedDate: stat.lastDate,
        };
      })
      .sort((a, b) => {
        if (b.matchesPlayed !== a.matchesPlayed) {
          return b.matchesPlayed - a.matchesPlayed;
        }
        return b.reliabilityRate - a.reliabilityRate;
      });
  } catch (e) {
    console.error('Error fetching leaderboard data:', e);
  } finally {
    loading.value = false;
  }
});

const filteredPlayers = computed(() => {
  if (!searchQuery.value.trim()) return allPlayers.value;
  const q = searchQuery.value.toLowerCase().trim();
  return allPlayers.value.filter((p) => p.name.toLowerCase().includes(q));
});

const topThree = computed(() => allPlayers.value.slice(0, 3));

const getPlayerBadge = (index: number) => {
  if (index === 0) return { label: t('leaderboard.legendBadge'), color: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (index === 1) return { label: t('leaderboard.contenderBadge'), color: 'bg-slate-100 text-slate-800 border-slate-300' };
  if (index === 2) return { label: t('leaderboard.starBadge'), color: 'bg-orange-100 text-orange-800 border-orange-300' };
  if (index < 10) return { label: t('leaderboard.regularBadge'), color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  return { label: t('leaderboard.memberBadge'), color: 'bg-brand-sand text-brand-slate border-brand-line' };
};
</script>

<template>
  <div class="space-y-8 pb-16">
    <div class="bg-shuttlecock" />

    <!-- Navigation & Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-slate transition-colors hover:text-brand-court mb-2"
        >
          <ArrowLeft :size="14" />
          <span>{{ t('leaderboard.backToHome') }}</span>
        </NuxtLink>
        <p class="section-kicker">{{ t('leaderboard.badge') }}</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-brand-ink sm:text-4xl">
          {{ t('leaderboard.title') }}
        </h1>
        <p class="mt-1 text-sm font-medium text-brand-slate">
          {{ t('leaderboard.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Club Lifetime Stats Bento Grid -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <UIGlassCard class="!p-5">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-black uppercase tracking-wider text-brand-slate">{{ t('leaderboard.statsSessions') }}</p>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-court/10 text-brand-court">
            <Calendar :size="18" />
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-brand-ink">
          {{ loading ? '...' : totalSessionsCount }}
        </p>
        <p class="mt-0.5 text-xs text-brand-slate">{{ t('leaderboard.statsSessionsDesc') }}</p>
      </UIGlassCard>

      <UIGlassCard class="!p-5">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-black uppercase tracking-wider text-brand-slate">{{ t('leaderboard.statsMembers') }}</p>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
            <Users :size="18" />
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-brand-ink">
          {{ loading ? '...' : allPlayers.length }}
        </p>
        <p class="mt-0.5 text-xs text-brand-slate">{{ t('leaderboard.statsMembersDesc') }}</p>
      </UIGlassCard>

      <UIGlassCard class="!p-5">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-black uppercase tracking-wider text-brand-slate">{{ t('leaderboard.statsCheckins') }}</p>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
            <Award :size="18" />
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-brand-ink">
          {{ loading ? '...' : totalPlayerCheckIns }}
        </p>
        <p class="mt-0.5 text-xs text-brand-slate">{{ t('leaderboard.statsCheckinsDesc') }}</p>
      </UIGlassCard>

      <UIGlassCard class="!p-5">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-black uppercase tracking-wider text-brand-slate">{{ t('leaderboard.statsShuttles') }}</p>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Flame :size="18" />
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-brand-ink">
          {{ loading ? '...' : totalShuttlecocksUsed }}
        </p>
        <p class="mt-0.5 text-xs text-brand-slate">{{ t('leaderboard.statsShuttlesDesc') }}</p>
      </UIGlassCard>
    </section>

    <!-- Top 3 Podium (when available) -->
    <section v-if="!loading && topThree.length > 0" class="space-y-4">
      <div class="court-divider"><span>🏆 {{ t('leaderboard.topPodiumTitle') }}</span></div>

      <div class="grid gap-4 md:grid-cols-3 items-end">
        <!-- 2nd Place -->
        <UIGlassCard
          v-if="topThree[1]"
          class="relative order-2 md:order-1 overflow-hidden border-slate-200 bg-gradient-to-b from-slate-50/70 to-white text-center !p-6"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xl font-black shadow-inner">
            🥈
          </div>
          <p class="mt-3 text-lg font-black text-brand-ink">{{ topThree[1].name }}</p>
          <span class="inline-block mt-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
            {{ t('leaderboard.silverTitle') }}
          </span>
          <div class="mt-4 pt-3 border-t border-brand-line/60 flex justify-around text-xs">
            <div>
              <p class="text-brand-slate font-bold">{{ t('leaderboard.matches') }}</p>
              <p class="text-lg font-black text-brand-ink">{{ topThree[1].matchesPlayed }}</p>
            </div>
            <div>
              <p class="text-brand-slate font-bold">{{ t('leaderboard.reliability') }}</p>
              <p class="text-lg font-black text-emerald-600">{{ topThree[1].reliabilityRate }}%</p>
            </div>
          </div>
        </UIGlassCard>

        <!-- 1st Place (Gold Champion) -->
        <UIGlassCard
          class="relative order-1 md:order-2 overflow-hidden border-amber-300/80 bg-gradient-to-b from-amber-50/90 to-white text-center !p-8 shadow-xl md:-translate-y-2"
        >
          <div class="absolute top-2 right-3 text-amber-500/30">
            <Sparkles :size="28" />
          </div>
          <div class="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-amber-400 text-white text-3xl shadow-lg ring-4 ring-amber-200">
            🥇
          </div>
          <p class="mt-3 text-2xl font-black text-brand-ink">{{ topThree[0].name }}</p>
          <span class="inline-block mt-1 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900 shadow-sm">
            {{ t('leaderboard.goldTitle') }}
          </span>
          <div class="mt-5 pt-4 border-t border-brand-line/60 flex justify-around text-sm">
            <div>
              <p class="text-brand-slate font-bold text-xs">{{ t('leaderboard.sessionsAttended') }}</p>
              <p class="text-2xl font-black text-brand-court">{{ topThree[0].matchesPlayed }}</p>
            </div>
            <div>
              <p class="text-brand-slate font-bold text-xs">{{ t('leaderboard.reliability') }}</p>
              <p class="text-2xl font-black text-emerald-600">{{ topThree[0].reliabilityRate }}%</p>
            </div>
          </div>
        </UIGlassCard>

        <!-- 3rd Place -->
        <UIGlassCard
          v-if="topThree[2]"
          class="relative order-3 overflow-hidden border-orange-200 bg-gradient-to-b from-orange-50/70 to-white text-center !p-6"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-200 text-orange-800 text-xl font-black shadow-inner">
            🥉
          </div>
          <p class="mt-3 text-lg font-black text-brand-ink">{{ topThree[2].name }}</p>
          <span class="inline-block mt-1 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-800">
            {{ t('leaderboard.bronzeTitle') }}
          </span>
          <div class="mt-4 pt-3 border-t border-brand-line/60 flex justify-around text-xs">
            <div>
              <p class="text-brand-slate font-bold">{{ t('leaderboard.matches') }}</p>
              <p class="text-lg font-black text-brand-ink">{{ topThree[2].matchesPlayed }}</p>
            </div>
            <div>
              <p class="text-brand-slate font-bold">{{ t('leaderboard.reliability') }}</p>
              <p class="text-lg font-black text-emerald-600">{{ topThree[2].reliabilityRate }}%</p>
            </div>
          </div>
        </UIGlassCard>
      </div>
    </section>

    <!-- Full Leaderboard Table -->
    <section class="space-y-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="section-kicker">Member Directory</p>
          <h2 class="mt-1 text-2xl font-black tracking-tight text-brand-ink">
            {{ t('leaderboard.memberDirectory') }}
          </h2>
        </div>

        <div class="w-full sm:w-72">
          <UIGlassInput
            v-model="searchQuery"
            type="text"
            :placeholder="t('leaderboard.searchPlaceholder')"
          >
            <template #icon><Search :size="16" /></template>
          </UIGlassInput>
        </div>
      </div>

      <div v-if="loading" class="space-y-3">
        <UIGlassCard v-for="i in 5" :key="i" class="animate-pulse !py-4">
          <div class="h-6 w-full rounded bg-brand-sand" />
        </UIGlassCard>
      </div>

      <UIGlassCard v-else-if="filteredPlayers.length === 0" class="text-center py-12">
        <Users :size="28" class="mx-auto text-brand-slate" />
        <p class="mt-3 font-black text-brand-ink">{{ t('leaderboard.noPlayersFound') }}</p>
        <p class="mt-1 text-sm text-brand-slate">{{ t('leaderboard.tryDifferentSearch') }}</p>
      </UIGlassCard>

      <UIGlassCard v-else class="!p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-brand-line">
            <thead class="bg-brand-sand/70">
              <tr>
                <th class="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-brand-slate w-16">
                  {{ t('leaderboard.rank') }}
                </th>
                <th class="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-brand-slate">
                  {{ t('leaderboard.player') }}
                </th>
                <th class="px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-brand-slate">
                  {{ t('leaderboard.sessionsAttended') }}
                </th>
                <th class="px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-brand-slate">
                  {{ t('leaderboard.attendanceRate') }}
                </th>
                <th class="px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-brand-slate">
                  {{ t('leaderboard.titleBadge') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-brand-line bg-white/40">
              <tr
                v-for="(player, idx) in filteredPlayers"
                :key="player.name"
                class="transition-colors hover:bg-white/70"
              >
                <!-- Rank -->
                <td class="px-5 py-4 font-black">
                  <span
                    v-if="idx === 0"
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-sm"
                    title="Hạng 1"
                  >
                    🥇
                  </span>
                  <span
                    v-else-if="idx === 1"
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-800 text-sm"
                    title="Hạng 2"
                  >
                    🥈
                  </span>
                  <span
                    v-else-if="idx === 2"
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-800 text-sm"
                    title="Hạng 3"
                  >
                    🥉
                  </span>
                  <span v-else class="text-sm font-bold text-brand-slate pl-2">
                    #{{ idx + 1 }}
                  </span>
                </td>

                <!-- Name -->
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-court/10 font-bold text-brand-court text-sm">
                      {{ player.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-black text-brand-ink text-sm sm:text-base">{{ player.name }}</p>
                      <p v-if="player.lastPlayedDate" class="text-[11px] text-brand-slate">
                        {{ t('leaderboard.latestPlayed', { date: formatDisplayDate(player.lastPlayedDate) }) }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Matches -->
                <td class="px-5 py-4 text-center">
                  <span class="font-black text-brand-ink text-base">{{ player.matchesPlayed }}</span>
                  <span class="text-xs text-brand-slate ml-1">{{ t('leaderboard.matchesCount', { count: '' }).trim() }}</span>
                </td>

                <!-- Reliability Rate -->
                <td class="px-5 py-4 text-center">
                  <div class="inline-flex items-center gap-1 font-bold text-xs" :class="player.reliabilityRate >= 80 ? 'text-emerald-700' : 'text-amber-700'">
                    <span>{{ player.reliabilityRate }}%</span>
                  </div>
                </td>

                <!-- Title Badge -->
                <td class="px-5 py-4 text-right">
                  <span
                    class="inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    :class="getPlayerBadge(idx).color"
                  >
                    {{ getPlayerBadge(idx).label }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UIGlassCard>
    </section>
  </div>
</template>
