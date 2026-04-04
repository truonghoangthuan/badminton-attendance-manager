<script setup lang="ts">
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowRight, Calendar, Clock3, MapPin, Trophy } from 'lucide-vue-next';

const { db } = useFirebase();
const sessions = ref<any[]>([]);
const loading = ref(true);
const userName = ref<string | null>(null);
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

const featuredSession = computed(
  () => sessions.value.find((session) => session.status !== 'completed') || sessions.value[0] || null,
);
const otherSessions = computed(() =>
  sessions.value.filter((session) => session.id !== featuredSession.value?.id).slice(0, 4),
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
    <section>
      <UIGlassCard class="space-y-6">
        <div class="space-y-2">
          <p class="section-kicker">Community Dashboard</p>
          <h1 class="text-3xl font-black tracking-tight md:text-4xl">
            {{ userName ? `Hi ${userName}, ready to play?` : 'Ready for the next badminton session?' }}
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
          </UIGlassCard>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
