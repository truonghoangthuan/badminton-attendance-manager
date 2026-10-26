<script setup lang="ts">
import { collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { Copy, Plus, RefreshCcw, X, Edit2, ExternalLink, Calendar, MapPin, Users, Trophy, Feather, Grid2x2, CheckCircle2, CircleDollarSign, ReceiptText } from 'lucide-vue-next';
import { useToast } from 'primevue/usetoast';
import { formatDisplayDate, getLocalTodayDate } from '~/utils/dateFormat';
import { calculateUnpaidSummary } from '~/utils/sessionFinancials';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { db } = useFirebase();
const { adminUser } = useAdminAccess();
const confirm = useUIConfirm();
const toast = useToast();
const { t } = useI18n();

const sessionsRef = collection(db, 'sessions');
const sessions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const activeFilter = ref<'all' | 'active' | 'completed' | 'unpaid'>('all');
const showCreateForm = ref(false);
const adding = ref(false);
const deletingSessionId = ref<string | null>(null);
const isEditing = ref(false);
const editingSessionId = ref<string | null>(null);
const attendancesBySession = ref<Record<string, any[]>>({});
const markingPaidId = ref<string | null>(null);

const createDefaultSession = () => ({
  date: getLocalTodayDate(),
  time: '19:00',
  location: 'Sân cầu lông Quang Sport',
  maxPlayers: 8,
  courtNumber: '',
  shuttlecockType: '',
  level: '',
});

const sessionForm = ref(createDefaultSession());

const loadAttendancesFallback = async () => {
  const map: Record<string, any[]> = {};
  await Promise.all(
    sessions.value.map(async (s) => {
      try {
        const snap = await getDocs(collection(db, `sessions/${s.id}/attendances`));
        map[s.id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error('Fallback attendance read error:', err);
      }
    }),
  );
  attendancesBySession.value = map;
};

onMounted(() => {
  const q = query(sessionsRef, orderBy('date', 'desc'));
  const unsubscribeSessions = onSnapshot(
    q,
    (snapshot) => {
      sessions.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      loading.value = false;
    },
    (err) => {
      console.error('Firestore Error:', err);
      error.value = t('admin.fetchError');
      loading.value = false;
    },
  );

  let unsubscribeAttendances: (() => void) | null = null;
  try {
    const attQuery = collectionGroup(db, 'attendances');
    unsubscribeAttendances = onSnapshot(
      attQuery,
      (snapshot) => {
        const map: Record<string, any[]> = {};
        for (const attDoc of snapshot.docs) {
          const sessionId = attDoc.ref.parent?.parent?.id;
          if (!sessionId) continue;
          if (!map[sessionId]) map[sessionId] = [];
          map[sessionId].push({ id: attDoc.id, ...attDoc.data() });
        }
        attendancesBySession.value = map;
      },
      async (err) => {
        console.warn('collectionGroup(attendances) error, using fallback:', err);
        await loadAttendancesFallback();
      },
    );
  } catch (err) {
    console.warn('collectionGroup error, using fallback:', err);
    loadAttendancesFallback();
  }

  onUnmounted(() => {
    unsubscribeSessions();
    if (unsubscribeAttendances) {
      unsubscribeAttendances();
    }
  });
});

const latestSession = computed(() => (sessions.value.length ? sessions.value[0] : null));

const unpaidSummary = computed(() =>
  calculateUnpaidSummary(sessions.value, attendancesBySession.value),
);

const totalUnpaidAmount = computed(() =>
  unpaidSummary.value.reduce((sum, p) => sum + p.totalOwed, 0),
);

const totalUnpaidSlots = computed(() =>
  unpaidSummary.value.reduce((sum, p) => sum + p.totalSlots, 0),
);

const markSessionAttendancePaid = async (
  sessionId: string,
  attendanceId: string,
  playerName: string,
) => {
  markingPaidId.value = `${sessionId}_${attendanceId}`;
  try {
    const attRef = doc(db, `sessions/${sessionId}/attendances`, attendanceId);
    await updateDoc(attRef, { hasPaid: true });
    const list = attendancesBySession.value[sessionId];
    if (list) {
      const item = list.find((a) => a.id === attendanceId);
      if (item) item.hasPaid = true;
    }
    toast.add({
      severity: 'success',
      summary: t('profileModal.toastSuccessTitle'),
      detail: t('admin.markedPaidSuccess', { name: playerName }),
      life: 2500,
    });
  } catch (e) {
    console.error('Error marking paid:', e);
    toast.add({
      severity: 'error',
      summary: t('admin.saveError'),
      life: 3000,
    });
  } finally {
    markingPaidId.value = null;
  }
};

const filteredSessions = computed(() => {
  if (activeFilter.value === 'active') {
    return sessions.value.filter((s) => s.status === 'open' || s.status === 'locked');
  }
  if (activeFilter.value === 'completed') {
    return sessions.value.filter((s) => s.status === 'completed');
  }
  return sessions.value;
});

const resetForm = () => {
  isEditing.value = false;
  editingSessionId.value = null;
  sessionForm.value = createDefaultSession();
};

const openCreateModal = () => {
  resetForm();
  if (latestSession.value) {
    sessionForm.value = {
      date: getLocalTodayDate(),
      time: latestSession.value.time || '19:00',
      location: latestSession.value.location || 'Sân cầu lông Quang Sport',
      maxPlayers: latestSession.value.maxPlayers || 8,
      courtNumber: latestSession.value.courtNumber || '',
      shuttlecockType: latestSession.value.shuttlecockType || '',
      level: latestSession.value.level || '',
    };
  }
  showCreateForm.value = true;
};

const openEditModal = (session: any) => {
  isEditing.value = true;
  editingSessionId.value = session.id;
  sessionForm.value = {
    date: session.date,
    time: session.time,
    location: session.location,
    maxPlayers: session.maxPlayers || 8,
    courtNumber: session.courtNumber || '',
    shuttlecockType: session.shuttlecockType || '',
    level: session.level || '',
  };
  showCreateForm.value = true;
};

const handleSaveSession = async () => {
  adding.value = true;
  try {
    const sessionPayload = {
      ...sessionForm.value,
      maxPlayers: Number(sessionForm.value.maxPlayers) || 8,
    };

    if (isEditing.value && editingSessionId.value) {
      const docRef = doc(db, 'sessions', editingSessionId.value);
      await updateDoc(docRef, sessionPayload);
      toast.add({
        severity: 'success',
        summary: t('profileModal.toastSuccessTitle'),
        detail: t('admin.saveChangesBtn'),
        life: 2500,
      });
    } else {
      const inherit = latestSession.value;
      await addDoc(sessionsRef, {
        ...sessionPayload,
        status: 'open',
        financials: {
          courtCost: inherit?.financials?.courtCost || 0,
          shuttlecocksUsed: 0,
          shuttlecockPackPrice: inherit?.financials?.shuttlecockPackPrice || 0,
          shuttlecockPrice: inherit?.financials?.shuttlecockPrice || 0,
          additionalShuttlecocksUsed: 0,
          additionalShuttlecockPrice: inherit?.financials?.additionalShuttlecockPrice || 0,
          calculatedFeePerPerson: 0,
        },
        bankInfo: inherit?.bankInfo || null,
        paymentQR: inherit?.paymentQR || null,
        createdBy: adminUser.value?.uid || null,
        createdAt: new Date().toISOString(),
      });
      toast.add({
        severity: 'success',
        summary: t('profileModal.toastSuccessTitle'),
        detail: t('admin.createModalTitle'),
        life: 2500,
      });
    }

    showCreateForm.value = false;
    resetForm();
  } catch (e) {
    console.error('Error saving session:', e);
    toast.add({
      severity: 'error',
      summary: t('admin.saveError'),
      detail: String(e),
      life: 3000,
    });
  } finally {
    adding.value = false;
  }
};

const toggleStatus = async (session: any) => {
  const statusOrder: ('open' | 'locked' | 'completed')[] = ['open', 'locked', 'completed'];
  const currentIndex = statusOrder.indexOf(session.status);
  const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

  const updateStatus = async () => {
    try {
      const docRef = doc(db, 'sessions', session.id);
      await updateDoc(docRef, { status: nextStatus });
    } catch (e) {
      console.error('Error updating status:', e);
      toast.add({
        severity: 'error',
        summary: t('admin.saveError'),
        life: 3000,
      });
    }
  };

  if (session.status === 'open' && nextStatus === 'locked') {
    confirm.require({
      message: t('admin.lockConfirmMessage'),
      header: t('admin.lockConfirmHeader'),
      rejectLabel: t('common.cancel'),
      acceptLabel: t('admin.lock'),
      accept: updateStatus,
    });
    return;
  }

  if (session.status === 'completed') {
    confirm.require({
      message: t('admin.reopenConfirmMessage', { status: nextStatus }),
      header: t('admin.reopenConfirmHeader'),
      rejectLabel: t('common.cancel'),
      acceptLabel: t('admin.reopen'),
      accept: updateStatus,
    });
    return;
  }

  if (nextStatus === 'completed') {
    confirm.require({
      message: t('admin.completeConfirmMessage'),
      header: t('admin.completeConfirmHeader'),
      rejectLabel: t('common.cancel'),
      acceptLabel: t('admin.complete'),
      accept: updateStatus,
    });
    return;
  }

  await updateStatus();
};

const deleteSession = async (session: any) => {
  if (deletingSessionId.value) {
    return;
  }

  confirm.require({
    message: t('admin.deleteConfirmMsg', { date: formatDisplayDate(session.date), time: session.time }),
    header: t('admin.deleteConfirmTitle'),
    severity: 'danger',
    rejectLabel: t('common.cancel'),
    acceptLabel: t('admin.delete'),
    accept: async () => {
      deletingSessionId.value = session.id;

      try {
        const attSnap = await getDocs(collection(db, `sessions/${session.id}/attendances`));
        await Promise.all(attSnap.docs.map((d) => deleteDoc(d.ref)));
        await deleteDoc(doc(db, 'sessions', session.id));
        toast.add({
          severity: 'success',
          summary: t('common.copied'),
          detail: t('admin.deleteConfirmTitle'),
          life: 2000,
        });
      } catch (e) {
        console.error('Error deleting session:', e);
        error.value = t('admin.deleteError');
        toast.add({
          severity: 'error',
          summary: t('admin.deleteError'),
          life: 3000,
        });
      } finally {
        deletingSessionId.value = null;
      }
    },
  });
};

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

const formatCurrency = (val?: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0);
};
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="section-kicker">{{ t('admin.kicker') }}</p>
        <h1 class="text-3xl font-black tracking-tight text-brand-ink sm:text-4xl">
          {{ t('admin.sessionsTitle') }}
        </h1>
        <p class="mt-1 text-sm font-medium text-brand-slate">
          {{ t('admin.workflowDesc') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UIGlassButton @click="openCreateModal">
          <template #icon-left><Plus :size="16" /></template>
          {{ t('admin.newSessionBtn') }}
        </UIGlassButton>
      </div>
    </header>

    <!-- Filter Tabs -->
    <div class="flex items-center gap-2 border-b border-brand-line pb-3 overflow-x-auto">
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shrink-0"
        :class="activeFilter === 'all' ? 'bg-brand-court text-white shadow-sm' : 'bg-white/70 text-brand-slate hover:bg-white hover:text-brand-ink'"
        @click="activeFilter = 'all'"
      >
        {{ t('admin.filterAll') }} ({{ sessions.length }})
      </button>
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shrink-0"
        :class="activeFilter === 'active' ? 'bg-brand-court text-white shadow-sm' : 'bg-white/70 text-brand-slate hover:bg-white hover:text-brand-ink'"
        @click="activeFilter = 'active'"
      >
        {{ t('admin.filterActive') }} ({{ sessions.filter((s) => s.status === 'open' || s.status === 'locked').length }})
      </button>
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shrink-0"
        :class="activeFilter === 'completed' ? 'bg-brand-court text-white shadow-sm' : 'bg-white/70 text-brand-slate hover:bg-white hover:text-brand-ink'"
        @click="activeFilter = 'completed'"
      >
        {{ t('admin.filterCompleted') }} ({{ sessions.filter((s) => s.status === 'completed').length }})
      </button>
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shrink-0 inline-flex items-center gap-1.5"
        :class="
          activeFilter === 'unpaid'
            ? 'bg-amber-600 text-white shadow-sm'
            : unpaidSummary.length > 0
            ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            : 'bg-white/70 text-brand-slate hover:bg-white hover:text-brand-ink'
        "
        @click="activeFilter = 'unpaid'"
      >
        <CircleDollarSign :size="13" />
        <span>{{ t('admin.filterUnpaid') }} ({{ unpaidSummary.length }})</span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-64 rounded-2xl bg-black/5 animate-pulse" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 font-medium">
      {{ error }}
    </div>

    <!-- Unpaid Summary Section -->
    <div v-else-if="activeFilter === 'unpaid'" class="space-y-6">
      <div v-if="unpaidSummary.length === 0" class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-12 text-center">
        <CheckCircle2 :size="36" class="mx-auto text-emerald-600" />
        <h3 class="mt-4 text-lg font-black text-brand-ink">{{ t('admin.allSessionsPaidTitle') }}</h3>
        <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('admin.allSessionsPaidDesc') }}</p>
      </div>

      <div v-else class="space-y-6">
        <!-- KPI Strip -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UIGlassCard class="!p-4 border-amber-200/60 bg-amber-50/40">
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">{{ t('admin.unpaidPlayersCount') }}</p>
            <p class="mt-1 text-2xl font-black text-amber-700">{{ unpaidSummary.length }}</p>
          </UIGlassCard>

          <UIGlassCard class="!p-4 border-amber-200/60 bg-amber-50/40">
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">{{ t('admin.detail.activePlayers') }}</p>
            <p class="mt-1 text-2xl font-black text-brand-ink">{{ t('admin.unpaidTotalSlots', { count: totalUnpaidSlots }) }}</p>
          </UIGlassCard>

          <UIGlassCard class="!p-4 border-amber-200/60 bg-amber-50/40">
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">{{ t('admin.unpaidTotalAmount') }}</p>
            <p class="mt-1 text-2xl font-black text-brand-court">{{ formatCurrency(totalUnpaidAmount) }}</p>
          </UIGlassCard>
        </div>

        <!-- Player Debt Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <UIGlassCard
            v-for="player in unpaidSummary"
            :key="player.name"
            class="flex flex-col justify-between space-y-4 border-amber-200/80 bg-white shadow-sm"
          >
            <div>
              <div class="flex items-start justify-between gap-3 border-b border-brand-line pb-3">
                <div>
                  <h3 class="text-lg font-black tracking-tight text-brand-ink">{{ player.name }}</h3>
                  <p class="text-xs font-semibold text-slate-500 mt-0.5">
                    {{ t('admin.unpaidSessionsCount', { count: player.sessions.length }) }}
                  </p>
                </div>
                <div class="text-right">
                  <span class="text-base font-black text-amber-700">{{ formatCurrency(player.totalOwed) }}</span>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {{ player.totalSlots }} {{ player.totalSlots === 1 ? t('admin.detail.slotUnit') : t('admin.detail.slotsUnit') }}
                  </p>
                </div>
              </div>

              <!-- List of unpaid sessions for this player -->
              <div class="divide-y divide-slate-100 mt-2">
                <div
                  v-for="s in player.sessions"
                  :key="s.sessionId + '_' + s.attendanceId"
                  class="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div class="min-w-0 flex-1">
                    <NuxtLink
                      :to="'/admin/session/' + s.sessionId"
                      class="font-bold text-brand-ink hover:text-brand-court flex items-center gap-1 group truncate"
                      :title="s.location"
                    >
                      <span>{{ formatDisplayDate(s.date) }}</span>
                      <span class="text-brand-slate font-medium">({{ s.time }})</span>
                      <ExternalLink :size="11" class="text-slate-400 group-hover:text-brand-court shrink-0" />
                    </NuxtLink>
                    <p class="text-[11px] text-slate-500 mt-0.5 truncate">
                      <span>{{ formatCurrency(s.feePerPerson) }} / {{ t('admin.detail.slotUnit') }}</span>
                      <span v-if="s.guestCount > 0" class="ml-1.5 font-bold text-amber-700">
                        (+{{ s.guestCount }} {{ t('admin.detail.guestUnit') }})
                      </span>
                    </p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-black text-brand-ink">{{ formatCurrency(s.amountOwed) }}</span>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
                      :disabled="markingPaidId === s.sessionId + '_' + s.attendanceId"
                      @click="markSessionAttendancePaid(s.sessionId, s.attendanceId, player.name)"
                    >
                      <ReceiptText :size="12" />
                      <span>{{ t('admin.markPaidQuickBtn') }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </UIGlassCard>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredSessions.length === 0"
      class="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center"
    >
      <Calendar :size="32" class="mx-auto text-brand-slate" />
      <h3 class="mt-4 text-lg font-black text-brand-ink">{{ t('admin.noSessions') }}</h3>
      <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('home.noUpcomingDesc') }}</p>
      <div class="mt-6">
        <UIGlassButton @click="openCreateModal">
          <template #icon-left><Plus :size="16" /></template>
          {{ t('admin.newSessionBtn') }}
        </UIGlassButton>
      </div>
    </div>

    <!-- Sessions Grid -->
    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <UIGlassCard
        v-for="session in filteredSessions"
        :key="session.id"
        hoverable
        class="relative flex flex-col justify-between"
      >
        <div>
          <!-- Header Date & Status -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="text-2xl font-black tracking-tight text-brand-ink">
                {{ formatDisplayDate(session.date) }}
              </div>
              <div class="text-sm font-bold text-brand-court mt-0.5">
                {{ session.time }}
              </div>
            </div>

            <!-- Status Badge -->
            <span
              class="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider"
              :class="
                session.status === 'open'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : session.status === 'locked'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600'
              "
            >
              {{ t(`sessionStatus.${session.status}`) }}
            </span>
          </div>

          <!-- Metadata Chips -->
          <div class="space-y-2 mb-6 text-sm text-brand-slate">
            <div class="flex items-center gap-2">
              <MapPin :size="15" class="shrink-0 text-brand-slate/70" />
              <span class="truncate font-semibold text-brand-ink">{{ session.location }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Users :size="15" class="shrink-0 text-brand-slate/70" />
              <span>{{ session.maxPlayers || 8 }} {{ t('admin.players') }}</span>
              <span v-if="session.courtNumber" class="text-brand-slate/40">•</span>
              <span v-if="session.courtNumber" class="font-medium text-brand-ink">{{ session.courtNumber }}</span>
            </div>
            <div v-if="session.shuttlecockType || session.level" class="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                v-if="session.shuttlecockType"
                class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
              >
                <Feather :size="11" />
                {{ session.shuttlecockType }}
              </span>
              <span
                v-if="session.level"
                class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
              >
                <Trophy :size="11" />
                {{ session.level }}
              </span>
            </div>
          </div>

          <!-- Financial Snapshot if available -->
          <div
            v-if="session.financials?.calculatedFeePerPerson"
            class="mb-4 flex items-center justify-between rounded-xl border border-brand-court/15 bg-brand-court/5 px-3 py-2 text-xs"
          >
            <span class="font-medium text-brand-slate">{{ t('admin.detail.feePerPerson') }}:</span>
            <span class="font-black text-brand-court">{{ formatCurrency(session.financials.calculatedFeePerPerson) }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 border-t border-brand-line pt-4">
          <NuxtLink :to="`/admin/session/${session.id}`" class="flex-1">
            <UIGlassButton variant="secondary" class="w-full !py-2 !text-xs font-bold">
              {{ t('admin.openDetails') }}
            </UIGlassButton>
          </NuxtLink>

          <UIGlassButton
            variant="secondary"
            class="!p-2 text-xs"
            :title="t('admin.editSession')"
            @click="openEditModal(session)"
          >
            <Edit2 :size="14" />
          </UIGlassButton>

          <UIGlassButton
            variant="secondary"
            class="!p-2 text-xs"
            :title="t('admin.toggleStatus')"
            @click="toggleStatus(session)"
          >
            <RefreshCcw :size="14" />
          </UIGlassButton>

          <UIGlassButton
            variant="secondary"
            class="!p-2 text-xs"
            :title="t('admin.copyLink')"
            @click="copySessionLink(session.id)"
          >
            <Copy :size="14" />
          </UIGlassButton>

          <UIGlassButton
            variant="ghost"
            class="!p-2 text-rose-600 hover:bg-rose-50"
            :title="t('common.delete')"
            :disabled="deletingSessionId === session.id"
            :loading="deletingSessionId === session.id"
            @click="deleteSession(session)"
          >
            <X :size="14" />
          </UIGlassButton>
        </div>
      </UIGlassCard>
    </div>

    <!-- Reusable Modal Form -->
    <AdminSessionFormModal
      v-model="showCreateForm"
      :form="sessionForm"
      :is-editing="isEditing"
      :loading="adding"
      :hint="!isEditing && latestSession ? t('admin.inheritedDefaultsHint') : undefined"
      @submit="handleSaveSession"
    />
  </div>
</template>
