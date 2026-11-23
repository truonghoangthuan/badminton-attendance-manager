<script setup lang="ts">
import { collection, doc, getDoc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ArrowRight, Calendar, CheckCircle2, Clock3, Feather, Grid2x2, MapPin, Trophy, Users } from 'lucide-vue-next';
import {
  buildAttendancePayload,
  calculateJoinedSlots,
  getMaxCapacity,
  normalizeGuestCount,
  validateRsvpCapacity,
} from '~/utils/sessionRsvp';

const { db } = useFirebase();
const { t } = useI18n();
const toast = useToast();
const { user, profile, loading: authLoading, setProfile } = useUserProfile();

const sessions = ref<any[]>([]);
const loading = ref(true);
const userName = ref<string | null>(null);
const greetingName = computed(() => profile.value?.displayName || userName.value || null);
const greetingText = computed(() => {
  if (greetingName.value) {
    return t('home.readyToPlayGreeting', { name: greetingName.value });
  }
  return t('home.readyToPlayGeneric');
});
const STORAGE_KEY = 'badminton_user_id';

const todayStr = new Date().toISOString().split('T')[0];

const activeSessions = computed(() =>
  sessions.value
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
);

const featuredSession = computed(() => {
  if (activeSessions.value.length > 0) {
    const upcoming = activeSessions.value.find((s) => (s.date || '') >= todayStr);
    return upcoming || activeSessions.value[0];
  }
  return sessions.value[0] || null;
});

const otherSessions = computed(() =>
  sessions.value.filter((session) => session.id !== featuredSession.value?.id).slice(0, 6),
);

const visibleOpenSessionIds = computed(() => {
  const visible = [featuredSession.value, ...otherSessions.value].filter(
    (s): s is any => Boolean(s && s.id && s.status === 'open'),
  );
  return [...new Set(visible.map((s) => s.id as string))];
});

const attendancesBySession = ref<Record<string, any[]>>({});
const attendanceLoadedBySession = ref<Record<string, boolean>>({});
const attendanceUnsubs = new Map<string, () => void>();
let unsubscribeSessions: (() => void) | null = null;
let stopOpenSessionsWatch: (() => void) | null = null;

onMounted(() => {
  void (async () => {
    try {
      const savedUserId = localStorage.getItem(STORAGE_KEY);
      if (savedUserId) {
        const userDoc = await getDoc(doc(db, 'roster', savedUserId));
        if (userDoc.exists()) {
          userName.value = userDoc.data().name;
        }
      }
    } catch (e) {
      console.error('Error loading legacy profile greeting:', e);
    }
  })();

  const qSessions = query(collection(db, 'sessions'), orderBy('date', 'desc'));
  unsubscribeSessions = onSnapshot(
    qSessions,
    (querySnapshot) => {
      sessions.value = querySnapshot.docs.map((sessionDoc) => ({
        id: sessionDoc.id,
        ...sessionDoc.data(),
      }));
      loading.value = false;
    },
    (e) => {
      console.error('Error loading dashboard:', e);
      loading.value = false;
    },
  );

  stopOpenSessionsWatch = watch(
    visibleOpenSessionIds,
    (openIds) => {
      const activeSet = new Set(openIds);

      for (const [id, unsub] of attendanceUnsubs.entries()) {
        if (!activeSet.has(id)) {
          unsub();
          attendanceUnsubs.delete(id);
          delete attendancesBySession.value[id];
          delete attendanceLoadedBySession.value[id];
        }
      }

      for (const id of openIds) {
        if (attendanceUnsubs.has(id)) continue;

        const unsub = onSnapshot(
          collection(db, `sessions/${id}/attendances`),
          (snap) => {
            attendancesBySession.value[id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            attendanceLoadedBySession.value[id] = true;
          },
          (err) => {
            console.error(`Error loading attendances for session ${id}:`, err);
            attendanceLoadedBySession.value[id] = true;
          },
        );
        attendanceUnsubs.set(id, unsub);
      }
    },
    { immediate: true },
  );
});

onUnmounted(() => {
  stopOpenSessionsWatch?.();
  unsubscribeSessions?.();
  attendanceUnsubs.forEach((unsub) => unsub());
  attendanceUnsubs.clear();
});

const isAttendanceLoaded = (sessionId: string): boolean => Boolean(attendanceLoadedBySession.value[sessionId]);
const getSessionMaxCapacity = (session: any): number => getMaxCapacity(session?.maxPlayers);
const getSessionJoinedSlots = (sessionId: string): number =>
  calculateJoinedSlots(attendancesBySession.value[sessionId] || []);
const getSpotsLeft = (session: any): number =>
  Math.max(0, getSessionMaxCapacity(session) - getSessionJoinedSlots(session.id));
const isSessionFull = (session: any): boolean =>
  getSessionJoinedSlots(session.id) >= getSessionMaxCapacity(session);

const getMyAttendance = (sessionId: string) => {
  const uid = user.value?.uid;
  if (!uid) return null;
  return (attendancesBySession.value[sessionId] || []).find((a: any) => a.id === uid) || null;
};

const quickModalOpen = ref(false);
const quickModalSessionId = ref<string | null>(null);
const quickModalMode = ref<'first-time' | 'edit'>('first-time');
const submittingSessionId = ref<string | null>(null);

const quickModalSession = computed(() =>
  sessions.value.find((s) => s.id === quickModalSessionId.value) || null,
);
const quickModalMyAttendance = computed(() =>
  quickModalSession.value ? getMyAttendance(quickModalSession.value.id) : null,
);

watch(quickModalSession, (session) => {
  if (quickModalOpen.value && !session) {
    quickModalOpen.value = false;
  }
});

const saveQuickRsvp = async (
  session: any,
  payload: { name?: string; isJoining: boolean; guestCount: number },
) => {
  const liveSession = sessions.value.find((s) => s.id === session.id) || session;

  if (liveSession.status !== 'open') {
    toast.add({
      severity: 'warn',
      summary: t('sessionDetail.sessionClosed'),
      detail: t('home.sessionNoLongerOpen'),
      life: 3500,
    });
    quickModalOpen.value = false;
    return;
  }

  if (!user.value) {
    toast.add({
      severity: 'error',
      summary: t('sessionDetail.rsvpWaitSummary'),
      detail: t('sessionDetail.rsvpWaitDetail'),
      life: 3000,
    });
    return;
  }

  if (!isAttendanceLoaded(liveSession.id)) {
    return;
  }

  submittingSessionId.value = liveSession.id;
  try {
    if (!profile.value?.displayName) {
      const trimmedName = (payload.name || '').trim();
      if (!trimmedName) {
        toast.add({
          severity: 'error',
          summary: t('sessionDetail.missingNameSummary'),
          detail: t('sessionDetail.missingNameDetail'),
          life: 3000,
        });
        return;
      }
      if (trimmedName.length < 2) {
        toast.add({
          severity: 'error',
          summary: t('sessionDetail.missingNameSummary'),
          detail: t('profileModal.errorTooShort'),
          life: 3000,
        });
        return;
      }

      const profileSaved = await setProfile(trimmedName);
      if (!profileSaved) {
        toast.add({
          severity: 'error',
          summary: t('sessionDetail.profileUpdateFailedSummary'),
          detail: t('sessionDetail.profileUpdateFailedDetail'),
          life: 3000,
        });
        return;
      }
    }

    const attendances = attendancesBySession.value[liveSession.id] || [];
    const capacityCheck = validateRsvpCapacity({
      attendances,
      maxPlayers: liveSession.maxPlayers,
      uid: user.value.uid,
      isJoining: payload.isJoining,
      guestCount: payload.guestCount,
    });

    if (!capacityCheck.ok) {
      toast.add({
        severity: 'warn',
        summary: capacityCheck.reason === 'full' ? t('sessionDetail.sessionFullTitle') : t('sessionDetail.capacityExceededTitle'),
        detail: capacityCheck.reason === 'full'
          ? t('sessionDetail.sessionFullDetail')
          : t('sessionDetail.remainingSlotsDetail', { count: capacityCheck.availableSlots }),
        life: 3500,
      });
      return;
    }

    const uid = user.value.uid;
    const displayName = profile.value?.displayName || (payload.name || '').trim();
    const existingRecord = attendances.find((a: any) => a.id === uid) || null;
    const attendancePayload = buildAttendancePayload({
      uid,
      name: displayName,
      isJoining: payload.isJoining,
      guestCount: payload.guestCount,
      existingRecord,
    });

    await setDoc(doc(db, `sessions/${liveSession.id}/attendances`, uid), attendancePayload, { merge: true });
    quickModalOpen.value = false;

    toast.add({
      severity: 'success',
      summary: payload.isJoining ? t('sessionDetail.rsvpConfirmedSummary') : t('sessionDetail.rsvpUpdatedSummary'),
      detail: payload.isJoining ? t('sessionDetail.rsvpConfirmedDetail') : t('sessionDetail.rsvpUnavailableDetail'),
      life: 3000,
    });
  } catch (e) {
    console.error('Error submitting quick RSVP:', e);
    toast.add({
      severity: 'error',
      summary: t('sessionDetail.saveFailedSummary'),
      detail: t('sessionDetail.saveFailedDetail'),
      life: 3000,
    });
  } finally {
    submittingSessionId.value = null;
  }
};

const handleQuickJoinClick = async (session: any) => {
  if (!isAttendanceLoaded(session.id) || authLoading.value || submittingSessionId.value) return;

  if (!profile.value?.displayName) {
    quickModalSessionId.value = session.id;
    quickModalMode.value = 'first-time';
    quickModalOpen.value = true;
    return;
  }

  await saveQuickRsvp(session, { isJoining: true, guestCount: 0 });
};

const openEditRsvpModal = (session: any) => {
  if (!isAttendanceLoaded(session.id) || authLoading.value || submittingSessionId.value) return;
  quickModalSessionId.value = session.id;
  quickModalMode.value = 'edit';
  quickModalOpen.value = true;
};

const handleQuickModalSubmit = async (payload: { name?: string; isJoining: boolean; guestCount: number }) => {
  if (!quickModalSession.value) return;
  await saveQuickRsvp(quickModalSession.value, payload);
};

const getStatusLabel = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'open') return t('sessionStatus.open');
  if (s === 'locked') return t('sessionStatus.locked');
  return t('sessionStatus.completed');
};

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
        <template v-if="loading">
          <div class="space-y-2">
            <p class="section-kicker">{{ t('home.heroKicker') }}</p>
            <h1 class="text-3xl font-black tracking-tight md:text-4xl">
              {{ greetingText }}
            </h1>
          </div>
          <div class="space-y-3 animate-pulse">
            <div class="h-12 rounded-2xl bg-brand-sand" />
            <div class="h-12 rounded-2xl bg-brand-sand" />
            <div class="h-12 rounded-2xl bg-brand-sand" />
          </div>
        </template>

        <template v-else-if="featuredSession">
          <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div class="space-y-5">
              <div class="space-y-2">
                <p class="section-kicker">{{ t('home.heroKicker') }}</p>
                <h1 class="text-3xl font-black tracking-tight md:text-4xl">
                  {{ greetingText }}
                </h1>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-line pt-5">
                <div>
                  <p class="text-3xl font-black tracking-tight">{{ formatDisplayDate(featuredSession.date) }}</p>
                  <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('home.nextSession') }}</p>
                </div>
                <span
                  :class="getStatusStyles(featuredSession.status)"
                  class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                >
                  {{ getStatusLabel(featuredSession.status) }}
                </span>
              </div>
            </div>

            <div class="rounded-2xl border border-brand-line bg-brand-sand p-5 space-y-4">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div
                  class="flex items-center gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm font-medium"
                >
                  <Clock3 :size="16" class="text-brand-court shrink-0" />
                  {{ featuredSession.time }}
                </div>
                <div
                  class="flex items-center gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm font-medium"
                >
                  <MapPin :size="16" class="text-brand-blue shrink-0" />
                  <span class="truncate">{{ featuredSession.location }}</span>
                </div>
              </div>

              <div
                v-if="featuredSession.courtNumber || featuredSession.shuttlecockType || featuredSession.level"
                class="flex flex-wrap items-center gap-2"
              >
                <span
                  v-if="featuredSession.courtNumber"
                  class="inline-flex items-center gap-1 rounded-lg border border-emerald-200/60 bg-emerald-50/80 px-2.5 py-1 text-xs font-bold text-emerald-800"
                >
                  <Grid2x2 :size="12" class="text-brand-court" />
                  {{ featuredSession.courtNumber }}
                </span>
                <span
                  v-if="featuredSession.shuttlecockType"
                  class="inline-flex items-center gap-1 rounded-lg border border-amber-200/60 bg-amber-50/80 px-2.5 py-1 text-xs font-bold text-amber-800"
                >
                  <Feather :size="12" class="text-amber-600" />
                  {{ featuredSession.shuttlecockType }}
                </span>
                <span
                  v-if="featuredSession.level"
                  class="inline-flex items-center gap-1 rounded-lg border border-sky-200/60 bg-sky-50/80 px-2.5 py-1 text-xs font-bold text-sky-800"
                >
                  <Trophy :size="12" class="text-sky-600" />
                  {{ featuredSession.level }}
                </span>
              </div>

              <template v-if="featuredSession.status === 'open'">
                <div class="rounded-2xl border border-brand-line bg-white px-4 py-3.5 space-y-2.5">
                  <template v-if="!isAttendanceLoaded(featuredSession.id)">
                    <div class="animate-pulse space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <div class="h-4 w-28 rounded bg-brand-sand" />
                        <div class="h-4 w-20 rounded bg-brand-sand" />
                      </div>
                      <div class="h-2 w-full rounded-full bg-brand-sand" />
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span class="inline-flex items-center gap-1.5 text-brand-ink tabular-nums">
                        <Users :size="14" class="text-brand-court shrink-0" />
                        {{
                          t('home.capacityJoined', {
                            count: getSessionJoinedSlots(featuredSession.id),
                            max: getSessionMaxCapacity(featuredSession),
                          })
                        }}
                      </span>
                      <span
                        v-if="isSessionFull(featuredSession)"
                        class="font-black text-amber-700"
                      >
                        {{ t('home.capacityFull') }}
                      </span>
                      <span v-else class="font-bold text-brand-court tabular-nums">
                        {{ t('home.capacitySpotsLeft', { count: getSpotsLeft(featuredSession) }) }}
                      </span>
                    </div>

                    <div class="h-2 w-full overflow-hidden rounded-full bg-brand-line/60">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :class="isSessionFull(featuredSession) ? 'bg-amber-500' : 'bg-brand-court'"
                        :style="{
                          width: `${Math.min(100, (getSessionJoinedSlots(featuredSession.id) / getSessionMaxCapacity(featuredSession)) * 100)}%`,
                        }"
                      />
                    </div>

                    <div
                      v-if="getMyAttendance(featuredSession.id)"
                      class="flex flex-wrap items-center gap-1.5 pt-0.5"
                    >
                      <template v-if="getMyAttendance(featuredSession.id)?.isJoining">
                        <span
                          class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700"
                        >
                          <CheckCircle2 :size="12" />
                          {{ t('home.registeredBadge') }}
                        </span>
                        <span
                          v-if="normalizeGuestCount(getMyAttendance(featuredSession.id)?.guestCount) > 0"
                          class="rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
                        >
                          +{{ normalizeGuestCount(getMyAttendance(featuredSession.id)?.guestCount) }}
                        </span>
                      </template>
                      <span
                        v-else
                        class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600"
                      >
                        {{ t('home.unavailableBadge') }}
                      </span>
                    </div>
                  </template>
                </div>

                <div class="flex flex-col gap-2.5 sm:flex-row">
                  <UIGlassButton
                    v-if="getMyAttendance(featuredSession.id)?.isJoining"
                    variant="secondary"
                    class="flex-1"
                    :disabled="authLoading || !isAttendanceLoaded(featuredSession.id) || Boolean(submittingSessionId)"
                    @click="openEditRsvpModal(featuredSession)"
                  >
                    {{ t('home.updateRsvp') }}
                  </UIGlassButton>
                  <UIGlassButton
                    v-else
                    class="flex-1"
                    :loading="submittingSessionId === featuredSession.id"
                    :disabled="
                      authLoading ||
                      !isAttendanceLoaded(featuredSession.id) ||
                      isSessionFull(featuredSession) ||
                      Boolean(submittingSessionId)
                    "
                    @click="handleQuickJoinClick(featuredSession)"
                  >
                    {{
                      isAttendanceLoaded(featuredSession.id) && isSessionFull(featuredSession)
                        ? t('home.capacityFull')
                        : t('home.quickJoin')
                    }}
                  </UIGlassButton>

                  <NuxtLink
                    :to="`/session/${featuredSession.id}`"
                    class="inline-flex items-center justify-between gap-2 rounded-lg border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-ink shadow-sm transition-all hover:bg-brand-sand active:scale-[0.98] sm:shrink-0"
                  >
                    <span>{{ t('home.viewMatch') }}</span>
                    <ArrowRight :size="16" />
                  </NuxtLink>
                </div>
              </template>

              <NuxtLink
                v-else
                :to="`/session/${featuredSession.id}`"
                class="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-brand-court bg-brand-court px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:border-brand-purple hover:bg-brand-purple active:scale-[0.98]"
              >
                <span>{{ t('home.joinNow') }}</span>
                <ArrowRight :size="18" />
              </NuxtLink>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="space-y-2">
            <p class="section-kicker">{{ t('home.heroKicker') }}</p>
            <h1 class="text-3xl font-black tracking-tight md:text-4xl">
              {{ greetingText }}
            </h1>
          </div>
          <div class="rounded-2xl border border-dashed border-brand-line bg-brand-sand px-6 py-14 text-center">
            <Trophy :size="28" class="mx-auto text-brand-slate" />
            <h2 class="mt-4 text-2xl font-black">{{ t('home.noUpcomingTitle') }}</h2>
            <p class="mt-2 text-sm text-brand-slate">{{ t('home.noUpcomingDesc') }}</p>
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
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/30 shadow-sm transition-transform group-hover:scale-105">
                <Trophy :size="26" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-court">{{ t('home.leaderboardTeaserKicker') }}</p>
                <h3 class="text-xl font-black text-brand-ink">{{ t('home.leaderboardTeaserTitle') }}</h3>
                <p class="mt-0.5 text-xs font-medium text-brand-slate">
                  {{ t('home.leaderboardTeaserDesc') }}
                </p>
              </div>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/80 px-4 py-2 text-xs font-bold text-brand-ink transition-colors group-hover:border-brand-court group-hover:text-brand-court shrink-0 self-start sm:self-auto">
              <span>{{ t('home.viewLeaderboard') }}</span>
              <ArrowRight :size="14" />
            </div>
          </div>
        </UIGlassCard>
      </NuxtLink>
    </section>

    <section v-if="otherSessions.length" class="space-y-4">
      <div class="court-divider"><span>{{ t('home.moreSessions') }}</span></div>
      <div class="grid gap-4 md:grid-cols-2">
        <template v-for="session in otherSessions" :key="session.id">
          <UIGlassCard v-if="session.status === 'open'" hoverable class="flex flex-col justify-between space-y-4">
            <NuxtLink :to="`/session/${session.id}`" class="block space-y-4 group">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-sand text-brand-court transition-transform group-hover:scale-105">
                    <Calendar :size="20" />
                  </div>
                  <div>
                    <p class="text-xl font-black">{{ formatDisplayDate(session.date) }}</p>
                    <p class="text-sm font-medium text-brand-slate">{{ session.time }}</p>
                  </div>
                </div>
                <span
                  :class="getStatusStyles(session.status)"
                  class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                >
                  {{ getStatusLabel(session.status) }}
                </span>
              </div>

              <div
                class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-sm font-medium"
              >
                <MapPin :size="16" class="text-brand-blue shrink-0" />
                <span class="truncate">{{ session.location }}</span>
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
            </NuxtLink>

            <div class="space-y-3 pt-1">
              <div class="rounded-2xl border border-brand-line bg-brand-sand/70 px-3.5 py-2.5 space-y-2">
                <template v-if="!isAttendanceLoaded(session.id)">
                  <div class="animate-pulse space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <div class="h-3.5 w-24 rounded bg-white/80" />
                      <div class="h-3.5 w-16 rounded bg-white/80" />
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-white/80" />
                  </div>
                </template>
                <template v-else>
                  <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <span class="inline-flex items-center gap-1.5 text-brand-ink tabular-nums">
                      <Users :size="13" class="text-brand-court shrink-0" />
                      {{
                        t('home.capacityJoined', {
                          count: getSessionJoinedSlots(session.id),
                          max: getSessionMaxCapacity(session),
                        })
                      }}
                    </span>
                    <span v-if="isSessionFull(session)" class="font-black text-amber-700">
                      {{ t('home.capacityFull') }}
                    </span>
                    <span v-else class="font-bold text-brand-court tabular-nums">
                      {{ t('home.capacitySpotsLeft', { count: getSpotsLeft(session) }) }}
                    </span>
                  </div>

                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-brand-line/60">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="isSessionFull(session) ? 'bg-amber-500' : 'bg-brand-court'"
                      :style="{
                        width: `${Math.min(100, (getSessionJoinedSlots(session.id) / getSessionMaxCapacity(session)) * 100)}%`,
                      }"
                    />
                  </div>

                  <div
                    v-if="getMyAttendance(session.id)"
                    class="flex flex-wrap items-center gap-1.5 pt-0.5"
                  >
                    <template v-if="getMyAttendance(session.id)?.isJoining">
                      <span
                        class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"
                      >
                        <CheckCircle2 :size="11" />
                        {{ t('home.registeredBadge') }}
                      </span>
                      <span
                        v-if="normalizeGuestCount(getMyAttendance(session.id)?.guestCount) > 0"
                        class="rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                      >
                        +{{ normalizeGuestCount(getMyAttendance(session.id)?.guestCount) }}
                      </span>
                    </template>
                    <span
                      v-else
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                    >
                      {{ t('home.unavailableBadge') }}
                    </span>
                  </div>
                </template>
              </div>

              <div class="flex items-center gap-2">
                <UIGlassButton
                  v-if="getMyAttendance(session.id)?.isJoining"
                  variant="secondary"
                  class="flex-1 !py-2.5"
                  :disabled="authLoading || !isAttendanceLoaded(session.id) || Boolean(submittingSessionId)"
                  @click="openEditRsvpModal(session)"
                >
                  {{ t('home.updateRsvp') }}
                </UIGlassButton>
                <UIGlassButton
                  v-else
                  class="flex-1 !py-2.5"
                  :loading="submittingSessionId === session.id"
                  :disabled="
                    authLoading ||
                    !isAttendanceLoaded(session.id) ||
                    isSessionFull(session) ||
                    Boolean(submittingSessionId)
                  "
                  @click="handleQuickJoinClick(session)"
                >
                  {{
                    isAttendanceLoaded(session.id) && isSessionFull(session)
                      ? t('home.capacityFull')
                      : t('home.quickJoin')
                  }}
                </UIGlassButton>

                <NuxtLink
                  :to="`/session/${session.id}`"
                  :title="t('home.viewMatch')"
                  :aria-label="t('home.viewMatch')"
                  class="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-ink shadow-sm transition-all hover:bg-brand-sand active:scale-[0.98]"
                >
                  <ArrowRight :size="16" />
                </NuxtLink>
              </div>
            </div>
          </UIGlassCard>

          <NuxtLink v-else :to="`/session/${session.id}`" class="block">
            <UIGlassCard hoverable interactive class="space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
                    <Calendar :size="20" />
                  </div>
                  <div>
                    <p class="text-xl font-black">{{ formatDisplayDate(session.date) }}</p>
                    <p class="text-sm font-medium text-brand-slate">{{ session.time }}</p>
                  </div>
                </div>
                <span
                  :class="getStatusStyles(session.status)"
                  class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                >
                  {{ getStatusLabel(session.status) }}
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
        </template>
      </div>
    </section>

    <SessionQuickRsvpModal
      v-model="quickModalOpen"
      :session="quickModalSession"
      :mode="quickModalMode"
      :display-name="profile?.displayName"
      :suggested-name="userName"
      :initial-is-joining="quickModalMyAttendance?.isJoining ?? true"
      :initial-guest-count="quickModalMyAttendance?.guestCount ?? 0"
      :joined-slots="quickModalSession ? getSessionJoinedSlots(quickModalSession.id) : 0"
      :max-capacity="quickModalSession ? getSessionMaxCapacity(quickModalSession) : 8"
      :is-user-already-joining="quickModalMyAttendance?.isJoining === true"
      :submitting="Boolean(quickModalSession && submittingSessionId === quickModalSession.id)"
      @submit="handleQuickModalSubmit"
    />
  </div>
</template>
