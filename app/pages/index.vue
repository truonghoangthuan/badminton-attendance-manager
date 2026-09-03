<script setup lang="ts">
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowRight, Calendar, Clock3, Feather, Grid2x2, MapPin, Trophy } from 'lucide-vue-next';

const { db } = useFirebase();
const sessions = ref<any[]>([]);
const loading = ref(true);
const { profile } = useUserProfile();
const userName = ref<string | null>(null);
const greetingName = computed(() => profile.value?.displayName || userName.value || null);
const STORAGE_KEY = 'badminton_user_id';

onMounted(async () => {
  try {
    const savedUserId = localStorage.getItem(STORAGE_KEY);
    if (savedUserId) {
      const userDoc = await getDoc(doc(db, 'roster', savedUserId));
      if (userDoc.exists()) {
        userName.value = userDoc.data().name;
      }
    }

    const qSessions = query(collection(db, 'sessions'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(qSessions);
    sessions.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (e) {
    console.error('Error loading dashboard:', e);
  } finally {
    loading.value = false;
  }
});

const todayStr = new Date().toISOString().split('T')[0];

const activeSessions = computed(() =>
  sessions.value
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
);

const featuredSession = computed(() => {
  if (activeSessions.value.length > 0) {
    const upcoming = activeSessions.value.find((s) => (s.date || '') >= todayStr);
    return upcoming || activeSessions.value[0];
  }
  return sessions.value[0] || null;
});

const otherSessions = computed(() =>
  sessions.value.filter((session) => session.id !== featuredSession.value?.id).slice(0, 6)
);

const getStatusStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'locked':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'completed':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-white text-brand-slate border-brand-line';
  }
};
</script>

<template>
  <div class="space-y-8 pb-16">
    <div class="bg-shuttlecock" />
    <section>
      <UIGlassCard class="space-y-6">
        <div class="space-y-2">
          <p class="section-kicker">Community Dashboard</p>
          <h1 class="text-3xl font-black tracking-tight md:text-4xl">
            {{ greetingName ? `Hi ${greetingName}, ready to play?` : 'Ready for the next badminton session?' }}
          </h1>
        </div>

        <template v-if="loading">
          <div class="space-y-3 animate-pulse">
            <div class="h-12 rounded-2xl bg-brand-sand" />
            <div class="h-12 rounded-2xl bg-brand-sand" />
            <div class="h-12 rounded-2xl bg-brand-sand" />
          </div>
        </template>

        <template v-else-if="featuredSession">
          <div class="mx-auto rounded-[28px] border border-brand-line bg-brand-sand p-6 md:w-1/2">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-3xl font-black tracking-tight">{{ featuredSession.date }}</p>
                <p class="mt-1 text-sm font-medium text-brand-slate">Next session</p>
              </div>
              <span
                :class="getStatusStyles(featuredSession.status)"
                class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
              >
                {{ featuredSession.status }}
              </span>
            </div>

            <div class="mt-5 grid gap-3 md:grid-cols-2">
              <div
                class="flex items-center gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm font-medium"
              >
                <Clock3 :size="16" class="text-brand-court" />
                {{ featuredSession.time }}
              </div>
              <div
                class="flex items-center gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm font-medium"
              >
                <MapPin :size="16" class="text-brand-blue" />
                {{ featuredSession.location }}
              </div>
            </div>

            <div
              v-if="featuredSession.courtNumber || featuredSession.shuttlecockType || featuredSession.level"
              class="mt-3 flex flex-wrap items-center gap-2"
            >
              <span
                v-if="featuredSession.courtNumber"
                class="inline-flex items-center gap-1 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-2.5 py-1 text-xs font-bold text-emerald-800"
              >
                <Grid2x2 :size="12" class="text-brand-court" />
                {{ featuredSession.courtNumber }}
              </span>
              <span
                v-if="featuredSession.shuttlecockType"
                class="inline-flex items-center gap-1 rounded-xl border border-amber-200/60 bg-amber-50/80 px-2.5 py-1 text-xs font-bold text-amber-800"
              >
                <Feather :size="12" class="text-amber-600" />
                {{ featuredSession.shuttlecockType }}
              </span>
              <span
                v-if="featuredSession.level"
                class="inline-flex items-center gap-1 rounded-xl border border-sky-200/60 bg-sky-50/80 px-2.5 py-1 text-xs font-bold text-sky-800"
              >
                <Trophy :size="12" class="text-sky-600" />
                {{ featuredSession.level }}
              </span>
            </div>

            <NuxtLink :to="`/session/${featuredSession.id}`" class="mt-5 block">
              <UIGlassButton class="w-full !justify-between">
                Join this session
                <template #icon-right><ArrowRight :size="18" /></template>
              </UIGlassButton>
            </NuxtLink>
          </div>
        </template>

        <template v-else>
          <div class="rounded-[28px] border border-dashed border-brand-line bg-brand-sand px-6 py-14 text-center">
            <Trophy :size="28" class="mx-auto text-brand-slate" />
            <h2 class="mt-4 text-2xl font-black">No sessions yet</h2>
          </div>
        </template>
      </UIGlassCard>
    </section>

    <!-- Leaderboard Teaser Card -->
    <section>
      <NuxtLink to="/leaderboard" class="block group">
        <UIGlassCard hoverable interactive class="relative overflow-hidden !p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/30 shadow-sm transition-transform group-hover:scale-105">
                <Trophy :size="26" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-court">Club Analytics & Hall of Fame</p>
                <h3 class="text-xl font-black text-brand-ink">Bảng Xếp Hạng Câu Lạc Bộ</h3>
                <p class="mt-0.5 text-xs font-medium text-brand-slate">
                  Vinh danh những tay vợt chăm chỉ và có tỉ lệ tham gia cao nhất
                </p>
              </div>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/80 px-4 py-2 text-xs font-bold text-brand-ink transition-colors group-hover:border-brand-court group-hover:text-brand-court shrink-0 self-start sm:self-auto">
              <span>Xem bảng xếp hạng</span>
              <ArrowRight :size="14" />
            </div>
          </div>
        </UIGlassCard>
      </NuxtLink>
    </section>

    <section v-if="otherSessions.length" class="space-y-4">
      <div class="court-divider"><span>More Sessions</span></div>
      <div class="grid gap-4 md:grid-cols-2">
        <NuxtLink v-for="session in otherSessions" :key="session.id" :to="`/session/${session.id}`" class="block">
          <UIGlassCard hoverable interactive class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
                  <Calendar :size="20" />
                </div>
                <div>
                  <p class="text-xl font-black">{{ session.date }}</p>
                  <p class="text-sm font-medium text-brand-slate">{{ session.time }}</p>
                </div>
              </div>
              <span
                :class="getStatusStyles(session.status)"
                class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
              >
                {{ session.status }}
              </span>
            </div>

            <div
              class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-sm font-medium"
            >
              <MapPin :size="16" class="text-brand-blue" />
              {{ session.location }}
            </div>

            <div
              v-if="session.courtNumber || session.shuttlecockType || session.level"
              class="flex flex-wrap items-center gap-2 pt-1"
            >
              <span
                v-if="session.courtNumber"
                class="inline-flex items-center gap-1 rounded-lg border border-emerald-200/60 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
              >
                <Grid2x2 :size="11" class="text-brand-court" />
                {{ session.courtNumber }}
              </span>
              <span
                v-if="session.shuttlecockType"
                class="inline-flex items-center gap-1 rounded-lg border border-amber-200/60 bg-amber-50/70 px-2 py-0.5 text-[11px] font-bold text-amber-800"
              >
                <Feather :size="11" class="text-amber-600" />
                {{ session.shuttlecockType }}
              </span>
              <span
                v-if="session.level"
                class="inline-flex items-center gap-1 rounded-lg border border-sky-200/60 bg-sky-50/70 px-2 py-0.5 text-[11px] font-bold text-sky-800"
              >
                <Trophy :size="11" class="text-sky-600" />
                {{ session.level }}
              </span>
            </div>
          </UIGlassCard>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
