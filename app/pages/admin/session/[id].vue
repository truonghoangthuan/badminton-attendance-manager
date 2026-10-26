<script setup lang="ts">
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCheck,
  CircleDollarSign,
  Clock3,
  Download,
  Edit2,
  Feather,
  Grid2x2,
  Info,
  Lock,
  MapPin,
  MessageSquareShare,
  Minus,
  Plus,
  ReceiptText,
  Share2,
  ShieldCheck,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-vue-next';
import { doc, onSnapshot, collection, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { calculateFeePerPerson, getSessionFinancialBreakdown } from '~/utils/sessionFinancials';
import { formatDisplayDate } from '~/utils/dateFormat';
import { exportSessionToCSV } from '~/utils/sessionExport';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const route = useRoute();
const sessionId = route.params.id as string;
const { db } = useFirebase();
const confirm = useUIConfirm();
const toast = useToast();
const { t } = useI18n();

const session = ref<any>(null);
const attendances = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const statusUpdating = ref(false);
const showEditModal = ref(false);
const savingEdits = ref(false);
const showSocialModal = ref(false);
const socialShareTab = ref<'invite' | 'settlement'>('invite');
const rosterFilter = ref<'all' | 'joining' | 'unpaid'>('all');

const financeDraft = ref({
  courtCost: 0,
  shuttlecocksUsed: 0,
  shuttlecockPackPrice: 0,
  additionalShuttlecocksUsed: 0,
  additionalShuttlecockPrice: 0,
});
const financeEditing = ref(false);

const openSocialShare = (tab: 'invite' | 'settlement' = 'invite') => {
  socialShareTab.value = tab;
  showSocialModal.value = true;
};

const handleExportCSV = () => {
  if (!session.value) return;
  exportSessionToCSV(session.value, attendances.value, financialBreakdown.value);
  toast.add({
    severity: 'success',
    summary: t('admin.detail.exportCsvSuccess'),
    detail: t('admin.detail.exportCsvDetail'),
    life: 3000,
  });
};

const showManualAddModal = ref(false);
const manualPlayer = ref({
  name: '',
  guestCount: 0,
  actualAttended: true,
  hasPaid: false,
});
const addingManualPlayer = ref(false);

const editForm = ref({
  date: '',
  time: '',
  location: '',
  maxPlayers: 8,
  courtNumber: '',
  shuttlecockType: '',
  level: '',
});

onMounted(() => {
  const sessionRef = doc(db, 'sessions', sessionId);
  const unsubSession = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      error.value = t('admin.detail.sessionNotFound');
      loading.value = false;
      return;
    }

    session.value = { id: snap.id, ...snap.data() };
    if (!financeEditing.value && session.value?.financials) {
      financeDraft.value = {
        courtCost: session.value.financials.courtCost || 0,
        shuttlecocksUsed: session.value.financials.shuttlecocksUsed || 0,
        shuttlecockPackPrice: session.value.financials.shuttlecockPackPrice || 0,
        additionalShuttlecocksUsed: session.value.financials.additionalShuttlecocksUsed || 0,
        additionalShuttlecockPrice: session.value.financials.additionalShuttlecockPrice || 0,
      };
    }
  });

  const attendancesRef = collection(db, `sessions/${sessionId}/attendances`);
  const q = query(attendancesRef, orderBy('name', 'asc'));
  const unsubAttendances = onSnapshot(q, (snap) => {
    attendances.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    loading.value = false;
  });

  onUnmounted(() => {
    unsubSession();
    unsubAttendances();
  });
});

const totalJoinedPlayers = computed(() => attendances.value.filter((a) => a.isJoining).length);

const totalGuestCount = computed(() =>
  attendances.value.reduce((acc, curr) => (curr.isJoining ? acc + (curr.guestCount || 0) : acc), 0)
);

const totalExpectedPlayers = computed(() => totalJoinedPlayers.value + totalGuestCount.value);

const totalActualPlayers = computed(() =>
  attendances.value.reduce((acc, curr) => (curr.actualAttended ? acc + 1 + (curr.guestCount || 0) : acc), 0)
);

const unpaidPlayers = computed(() =>
  attendances.value.filter((a) => a.actualAttended && !a.hasPaid).length
);

const unpaidSlots = computed(() =>
  attendances.value
    .filter((a) => a.actualAttended && !a.hasPaid)
    .reduce((acc, a) => acc + 1 + (a.guestCount || 0), 0)
);

const financialBreakdown = computed(() =>
  getSessionFinancialBreakdown(financeDraft.value, totalActualPlayers.value)
);

const totalSessionCost = computed(() => financialBreakdown.value.totalSessionCost);

const calculatedFeePerPerson = computed(() =>
  calculateFeePerPerson(totalSessionCost.value, totalActualPlayers.value)
);

const unpaidTotalRevenue = computed(() => unpaidSlots.value * calculatedFeePerPerson.value);

const uncheckedJoiningAttendees = computed(() =>
  attendances.value.filter((a) => a.isJoining && !a.actualAttended)
);

const sortedAttendances = computed(() => {
  return [...attendances.value].sort((a, b) => {
    if (a.isJoining !== b.isJoining) return a.isJoining ? -1 : 1;
    if (a.actualAttended !== b.actualAttended) return a.actualAttended ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
});

const filteredAttendances = computed(() => {
  if (rosterFilter.value === 'joining') {
    return sortedAttendances.value.filter((a) => a.isJoining);
  }
  if (rosterFilter.value === 'unpaid') {
    return sortedAttendances.value.filter((a) => a.actualAttended && !a.hasPaid);
  }
  return sortedAttendances.value;
});

const sessionMeta = computed(() => {
  if (!session.value) return [];
  const items = [
    { icon: Clock3, label: t('admin.detail.time'), value: session.value.time || t('admin.detail.tbd') },
    { icon: MapPin, label: t('admin.detail.location'), value: session.value.location || t('admin.detail.tbd') },
    { icon: Users, label: t('admin.detail.capacity'), value: `${session.value.maxPlayers || 8} ${t('admin.detail.playersUnit')}` },
  ];
  if (session.value.courtNumber) items.push({ icon: Grid2x2, label: t('admin.detail.court'), value: session.value.courtNumber });
  if (session.value.shuttlecockType) items.push({ icon: Feather, label: t('admin.detail.shuttle'), value: session.value.shuttlecockType });
  if (session.value.level) items.push({ icon: Trophy, label: t('admin.detail.level'), value: session.value.level });
  return items;
});

const summaryStats = computed(() => [
  {
    icon: UserPlus,
    label: t('admin.detail.rsvpYes'),
    value: totalJoinedPlayers.value,
    hint: `${totalGuestCount.value} ${totalGuestCount.value === 1 ? t('admin.detail.guestUnit') : t('admin.detail.guestsUnit')}`,
    accent: 'from-brand-court/14 to-brand-court/5 text-brand-court',
  },
  {
    icon: UserCheck,
    label: t('admin.detail.checkedIn'),
    value: totalActualPlayers.value,
    hint: t('admin.detail.expectedHint', { count: totalExpectedPlayers.value }),
    accent: 'from-brand-purple/14 to-brand-purple/5 text-brand-purple',
  },
  {
    icon: CircleDollarSign,
    label: t('admin.detail.pendingPayment'),
    value: unpaidPlayers.value,
    hint:
      unpaidSlots.value > 0
        ? `${unpaidSlots.value} ${unpaidSlots.value === 1 ? t('admin.detail.slotUnit') : t('admin.detail.slotsUnit')} (${formatCurrency(unpaidTotalRevenue.value)})`
        : t('admin.detail.allPaidUp'),
    accent: unpaidPlayers.value > 0 ? 'from-brand-shuttle/22 to-brand-shuttle/8 text-amber-700' : 'from-emerald-500/14 to-emerald-500/5 text-emerald-600',
  },
]);

const updateSessionStatus = async (nextStatus: 'open' | 'locked' | 'completed') => {
  if (!session.value || statusUpdating.value || session.value.status === nextStatus) return;

  const performStatusUpdate = async () => {
    statusUpdating.value = true;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { status: nextStatus });
    } catch (e) {
      console.error('Error updating status:', e);
      toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
    } finally {
      statusUpdating.value = false;
    }
  };

  if (session.value.status === 'open' && nextStatus === 'locked') {
    confirm.require({
      message: t('admin.lockConfirmMessage'),
      header: t('admin.lockConfirmHeader'),
      rejectLabel: t('common.cancel'),
      acceptLabel: t('admin.lock'),
      accept: performStatusUpdate,
    });
    return;
  }

  if (nextStatus === 'completed') {
    confirm.require({
      message: t('admin.completeConfirmMessage'),
      header: t('admin.completeConfirmHeader'),
      rejectLabel: t('common.cancel'),
      acceptLabel: t('admin.complete'),
      accept: performStatusUpdate,
    });
    return;
  }

  await performStatusUpdate();
};

const sessionActions = computed(() => {
  if (!session.value) return [];
  if (session.value.status === 'open') {
    return [
      {
        label: t('admin.detail.lockRsvp'),
        description: t('admin.detail.lockRsvpDesc'),
        icon: Lock,
        variant: 'primary' as const,
        action: () => updateSessionStatus('locked'),
      },
    ];
  }
  if (session.value.status === 'locked') {
    return [
      {
        label: t('admin.detail.markCompleted'),
        description: t('admin.detail.markCompletedDesc'),
        icon: CheckCheck,
        variant: 'primary' as const,
        action: () => updateSessionStatus('completed'),
      },
      {
        label: t('admin.detail.reopenRsvp'),
        description: t('admin.detail.reopenRsvpDesc'),
        icon: ShieldCheck,
        variant: 'secondary' as const,
        action: () => updateSessionStatus('open'),
      },
    ];
  }
  return [
    {
      label: t('admin.detail.reopenSession'),
      description: t('admin.detail.reopenSessionDesc'),
      icon: ShieldCheck,
      variant: 'secondary' as const,
      action: () => updateSessionStatus('locked'),
    },
  ];
});

const openEditModal = () => {
  if (!session.value) return;
  editForm.value = {
    date: session.value.date || '',
    time: session.value.time || '',
    location: session.value.location || '',
    maxPlayers: session.value.maxPlayers || 8,
    courtNumber: session.value.courtNumber || '',
    shuttlecockType: session.value.shuttlecockType || '',
    level: session.value.level || '',
  };
  showEditModal.value = true;
};

const saveSessionEdits = async () => {
  if (!session.value || savingEdits.value) return;
  savingEdits.value = true;
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      ...editForm.value,
      maxPlayers: Number(editForm.value.maxPlayers) || 8,
    });
    showEditModal.value = false;
    toast.add({
      severity: 'success',
      summary: t('profileModal.toastSuccessTitle'),
      detail: t('admin.saveChangesBtn'),
      life: 2500,
    });
  } catch (e) {
    console.error('Error saving session edits:', e);
    toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
  } finally {
    savingEdits.value = false;
  }
};

const saveManualPlayer = async () => {
  if (!manualPlayer.value.name.trim() || addingManualPlayer.value) return;
  addingManualPlayer.value = true;
  try {
    const customId = `walkin_${Date.now()}`;
    const docRef = doc(db, `sessions/${sessionId}/attendances`, customId);
    await setDoc(docRef, {
      uid: customId,
      name: manualPlayer.value.name.trim(),
      isJoining: true,
      guestCount: Number(manualPlayer.value.guestCount) || 0,
      actualAttended: manualPlayer.value.actualAttended,
      hasPaid: manualPlayer.value.hasPaid,
      isManual: true,
      updatedAt: new Date().toISOString(),
    });
    showManualAddModal.value = false;
    manualPlayer.value = { name: '', guestCount: 0, actualAttended: true, hasPaid: false };
    toast.add({
      severity: 'success',
      summary: t('profileModal.toastSuccessTitle'),
      detail: t('admin.detail.addWalkInTitle'),
      life: 2500,
    });
  } catch (e) {
    console.error('Failed to add manual player:', e);
    toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
  } finally {
    addingManualPlayer.value = false;
  }
};

const deleteAttendee = async (attendance: any) => {
  confirm.require({
    message: t('admin.detail.removeAttendeeConfirm', { name: attendance.name }),
    header: t('admin.detail.removeAttendeeTitle'),
    severity: 'danger',
    rejectLabel: t('common.cancel'),
    acceptLabel: t('admin.detail.removeBtn'),
    accept: async () => {
      try {
        const docRef = doc(db, `sessions/${sessionId}/attendances`, attendance.id);
        await deleteDoc(docRef);
      } catch (e) {
        console.error('Error deleting attendee:', e);
        toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
      }
    },
  });
};

const toggleAttendanceAttr = async (attendanceId: string, field: string, value: boolean) => {
  try {
    const docRef = doc(db, `sessions/${sessionId}/attendances`, attendanceId);
    await updateDoc(docRef, { [field]: value });
  } catch (e) {
    console.error(`Error updating ${field}:`, e);
    toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
  }
};

const updateGuestCount = async (attendance: any, delta: number) => {
  const newCount = Math.max(0, (attendance.guestCount || 0) + delta);
  if (newCount === attendance.guestCount) return;
  try {
    const docRef = doc(db, `sessions/${sessionId}/attendances`, attendance.id);
    await updateDoc(docRef, { guestCount: newCount });
  } catch (e) {
    console.error('Error updating guest count:', e);
    toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
  }
};

const checkInAllJoining = async () => {
  if (uncheckedJoiningAttendees.value.length === 0) return;
  try {
    await Promise.all(
      uncheckedJoiningAttendees.value.map((att) =>
        updateDoc(doc(db, `sessions/${sessionId}/attendances`, att.id), {
          actualAttended: true,
        })
      )
    );
    toast.add({
      severity: 'success',
      summary: t('admin.detail.checkedIn'),
      detail: t('admin.detail.checkedInOnSite'),
      life: 2500,
    });
  } catch (e) {
    console.error('Error bulk checking in:', e);
    toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
  }
};

const updateFinancials = async () => {
  if (!session.value) return;
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      'financials.courtCost': financeDraft.value.courtCost,
      'financials.shuttlecocksUsed': financeDraft.value.shuttlecocksUsed,
      'financials.shuttlecockPackPrice': financeDraft.value.shuttlecockPackPrice,
      'financials.shuttlecockPrice': financialBreakdown.value.shuttlecockPrice,
      'financials.additionalShuttlecocksUsed': financeDraft.value.additionalShuttlecocksUsed,
      'financials.additionalShuttlecockPrice': financeDraft.value.additionalShuttlecockPrice,
      'financials.calculatedFeePerPerson': calculatedFeePerPerson.value,
    });
  } catch (e) {
    console.error('Error updating financials:', e);
    toast.add({ severity: 'error', summary: t('admin.saveError'), life: 3000 });
  }
};

const onFinanceBlur = () => {
  financeEditing.value = false;
  updateFinancials();
};

watch(calculatedFeePerPerson, (newVal) => {
  if (session.value && session.value.financials?.calculatedFeePerPerson !== newVal && !financeEditing.value) {
    updateFinancials();
  }
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const formatPreciseCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'locked':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'completed':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    default:
      return 'border-slate-200 bg-white text-slate-600';
  }
};
</script>

<template>
  <div class="space-y-8 pb-16">
    <section class="space-y-5">
      <NuxtLink
        to="/admin"
        class="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-bold text-brand-slate transition-colors hover:border-brand-court hover:text-brand-court"
      >
        <ArrowLeft :size="16" />
        {{ t('admin.detail.backToSessions') }}
      </NuxtLink>

      <div v-if="loading" class="py-16 text-center">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-court border-t-transparent" />
        <p class="text-sm font-bold text-brand-slate">{{ t('admin.detail.loadingDetails') }}</p>
      </div>

      <UIGlassCard v-else-if="error" class="border-red-200 bg-red-50 text-center text-red-700">
        {{ error }}
      </UIGlassCard>

      <div v-else-if="session" class="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
        <!-- Left Column: Session Meta & Attendance -->
        <div class="space-y-6">
          <UIGlassCard class="overflow-hidden !p-0 border-slate-200 shadow-sm">
            <div class="bg-white relative overflow-hidden px-6 py-6 sm:px-8">
              <div class="relative flex flex-col gap-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="space-y-3">
                    <p class="section-kicker">{{ t('admin.detail.sessionControlKicker') }}</p>
                    <div class="space-y-2">
                      <h1 class="text-3xl font-black tracking-tight text-brand-ink sm:text-[2.5rem]">
                        {{ formatDisplayDate(session.date) }}
                      </h1>
                      <div class="flex flex-wrap gap-3">
                        <div
                          v-for="meta in sessionMeta"
                          :key="meta.label"
                          class="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm font-medium text-brand-ink shadow-[0_10px_25px_rgba(18,55,42,0.06)]"
                        >
                          <component :is="meta.icon" :size="16" class="text-brand-court" />
                          <span class="text-brand-slate">{{ meta.label }}</span>
                          <span class="font-bold">{{ meta.value }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-full border border-brand-line bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-brand-ink transition-all hover:border-brand-court hover:text-brand-court active:scale-95"
                      :title="t('admin.detail.shareTitle')"
                      @click="openSocialShare('invite')"
                    >
                      <MessageSquareShare :size="14" class="mr-1.5 text-brand-court" />
                      {{ t('admin.detail.share') }}
                    </button>

                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-full border border-brand-line bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-brand-ink transition-colors hover:border-brand-court hover:text-brand-court"
                      @click="openEditModal"
                    >
                      <Edit2 :size="14" class="mr-2" />
                      {{ t('admin.detail.editSession') }}
                    </button>

                    <span
                      :class="getStatusColor(session.status)"
                      class="inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em]"
                    >
                      {{ t(`sessionStatus.${session.status}`) }}
                    </span>
                  </div>
                </div>

                <div class="grid gap-3 md:grid-cols-3">
                  <div
                    v-for="stat in summaryStats"
                    :key="stat.label"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm flex items-center gap-3"
                  >
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br"
                      :class="stat.accent"
                    >
                      <component :is="stat.icon" :size="20" />
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {{ stat.label }}
                      </p>
                      <div class="flex items-baseline gap-2 leading-none mt-1">
                        <p class="text-xl font-black tracking-tight text-brand-ink">
                          {{ stat.value }}
                        </p>
                        <p class="text-[11px] font-medium text-slate-500">
                          {{ stat.hint }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UIGlassCard>

          <!-- Attendance Section -->
          <UIGlassCard class="space-y-6">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="section-kicker">{{ t('admin.detail.attendanceKicker') }}</p>
                <h2 class="mt-2 text-2xl font-black tracking-tight">{{ t('admin.detail.checkinTitle') }}</h2>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  {{ t('admin.detail.checkinSubtitle') }}
                </p>
              </div>

              <!-- Top Action Bar -->
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-white/80 px-3 py-1.5 text-xs font-bold text-brand-ink shadow-sm transition-all hover:border-brand-court hover:bg-white hover:text-brand-court active:scale-95"
                  :title="t('admin.detail.copyInviteTitle')"
                  @click="openSocialShare('invite')"
                >
                  <Share2 :size="13" />
                  <span>{{ t('admin.detail.copyInvite') }}</span>
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-white/80 px-3 py-1.5 text-xs font-bold text-brand-ink shadow-sm transition-all hover:border-brand-court hover:bg-white hover:text-brand-court active:scale-95"
                  :title="t('admin.detail.copySettlementTitle')"
                  @click="openSocialShare('settlement')"
                >
                  <ReceiptText :size="13" />
                  <span>{{ t('admin.detail.copySettlement') }}</span>
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-white/80 px-3 py-1.5 text-xs font-bold text-brand-ink shadow-sm transition-all hover:border-brand-court hover:bg-white hover:text-brand-court active:scale-95"
                  :title="t('admin.detail.exportCsvTitle')"
                  @click="handleExportCSV"
                >
                  <Download :size="13" />
                  <span>{{ t('admin.detail.exportCsv') }}</span>
                </button>
                <UIGlassButton class="!px-3.5 !py-1.5 !text-xs font-bold" @click="showManualAddModal = true">
                  <template #icon-left><UserPlus :size="14" /></template>
                  {{ t('admin.detail.addWalkIn') }}
                </UIGlassButton>
              </div>
            </div>

            <!-- Attendance Filter Pills & Bulk Check-in -->
            <div class="flex flex-wrap items-center justify-between gap-3 border-y border-brand-line py-3">
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                  :class="rosterFilter === 'all' ? 'bg-brand-court text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  @click="rosterFilter = 'all'"
                >
                  {{ t('admin.detail.filterAll', { count: attendances.length }) }}
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                  :class="rosterFilter === 'joining' ? 'bg-brand-court text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  @click="rosterFilter = 'joining'"
                >
                  {{ t('admin.detail.filterJoining', { count: totalJoinedPlayers }) }}
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                  :class="rosterFilter === 'unpaid' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  @click="rosterFilter = 'unpaid'"
                >
                  {{ t('admin.detail.filterUnpaid', { count: unpaidPlayers }) }}
                </button>
              </div>

              <button
                v-if="uncheckedJoiningAttendees.length > 0"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                @click="checkInAllJoining"
              >
                <CheckCheck :size="14" />
                {{ t('admin.detail.checkInAllBtn', { count: uncheckedJoiningAttendees.length }) }}
              </button>
            </div>

            <!-- Check-in Warning Notice -->
            <div
              v-if="totalJoinedPlayers > 0 && totalActualPlayers === 0"
              class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"
            >
              <Info :size="20" class="mt-0.5 shrink-0 text-amber-600" />
              <div class="text-sm">
                <p class="font-bold">{{ t('admin.detail.checkinRequiredTitle') }}</p>
                <p class="mt-0.5 text-xs font-medium text-amber-800">
                  {{ t('admin.detail.checkinRequiredDesc') }}
                </p>
              </div>
            </div>

            <!-- Empty Attendance -->
            <div
              v-if="attendances.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center"
            >
              <Users :size="28" class="mx-auto text-brand-slate" />
              <p class="mt-4 text-lg font-black text-brand-ink">{{ t('admin.detail.noAttendanceTitle') }}</p>
              <p class="mt-2 text-sm font-medium text-brand-slate">
                {{ t('admin.detail.noAttendanceDesc') }}
              </p>
              <div class="mt-4">
                <UIGlassButton class="!px-4 !py-2 !text-xs font-bold" @click="showManualAddModal = true">
                  <template #icon-left><UserPlus :size="14" /></template>
                  {{ t('admin.detail.addWalkInPlayer') }}
                </UIGlassButton>
              </div>
            </div>

            <!-- Unified Single Responsive Attendance List (Shrunk from 2 separate duplicate blocks) -->
            <div v-else class="space-y-2.5">
              <div
                v-for="att in filteredAttendances"
                :key="att.id"
                class="rounded-xl border p-3 sm:p-4 transition-all"
                :class="att.actualAttended ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <!-- Player Info & Badges -->
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-bold text-brand-ink text-sm sm:text-base">{{ att.name }}</span>
                      <span
                        v-if="att.isManual"
                        class="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700"
                      >
                        {{ t('admin.detail.walkInBadge') }}
                      </span>
                      <span
                        class="status-chip"
                        :class="
                          att.isJoining
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-600'
                        "
                      >
                        {{ att.isJoining ? t('admin.detail.joining') : t('admin.detail.notJoining') }}
                      </span>
                    </div>

                    <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{{ att.actualAttended ? t('admin.detail.checkedInOnSite') : t('admin.detail.awaitingCheckIn') }}</span>
                      <span v-if="att.actualAttended && calculatedFeePerPerson" class="font-semibold text-brand-ink">
                        {{ t('admin.detail.owes') }} {{ formatCurrency(calculatedFeePerPerson * (1 + (att.guestCount || 0))) }}
                      </span>
                    </div>
                  </div>

                  <!-- Inline Guest Stepper & Action Controls -->
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Guest Stepper -->
                    <div
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm"
                      :title="t('admin.detail.adjustGuestsAria')"
                    >
                      <button
                        type="button"
                        class="h-5 w-5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        :disabled="(att.guestCount || 0) <= 0"
                        @click="updateGuestCount(att, -1)"
                      >
                        <Minus :size="12" class="mx-auto" />
                      </button>
                      <span class="min-w-[2.5rem] text-center text-xs font-bold text-brand-ink">
                        +{{ att.guestCount || 0 }} {{ t('admin.detail.guestUnit') }}
                      </span>
                      <button
                        type="button"
                        class="h-5 w-5 rounded text-slate-500 hover:bg-slate-100"
                        @click="updateGuestCount(att, 1)"
                      >
                        <Plus :size="12" class="mx-auto" />
                      </button>
                    </div>

                    <!-- Check-in Button -->
                    <button
                      type="button"
                      class="action-pill"
                      :class="
                        att.actualAttended
                          ? 'border-brand-court bg-brand-court text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      "
                      @click="toggleAttendanceAttr(att.id, 'actualAttended', !att.actualAttended)"
                    >
                      <UserCheck :size="14" />
                      <span>{{ att.actualAttended ? t('admin.detail.presentStatus') : t('admin.detail.markPresent') }}</span>
                    </button>

                    <!-- Paid Button -->
                    <button
                      type="button"
                      class="action-pill"
                      :class="
                        att.hasPaid
                          ? 'border-brand-court bg-brand-court text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      "
                      @click="toggleAttendanceAttr(att.id, 'hasPaid', !att.hasPaid)"
                    >
                      <ReceiptText :size="14" />
                      <span>{{ att.hasPaid ? t('admin.detail.paidBtn') : t('admin.detail.unpaidBtn') }}</span>
                    </button>

                    <!-- Delete Button -->
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                      :title="t('admin.detail.removeBtn')"
                      @click="deleteAttendee(att)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </UIGlassCard>
        </div>

        <!-- Right Column: Settlement Panel & AdminQRCodeManager -->
        <div class="space-y-6 lg:sticky lg:top-24">
          <!-- Settlement Card -->
          <UIGlassCard class="space-y-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="section-kicker">{{ t('admin.detail.financeKicker') }}</p>
                <h2 class="mt-2 text-2xl font-black tracking-tight">{{ t('admin.detail.settlementTitle') }}</h2>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  {{ t('admin.detail.settlementSubtitle') }}
                </p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
                <BadgeDollarSign :size="22" />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
                  {{ t('admin.detail.courtCost') }}
                </label>
                <InputNumber
                  v-model="financeDraft.courtCost"
                  :min="0"
                  locale="en-US"
                  :use-grouping="true"
                  :min-fraction-digits="0"
                  :max-fraction-digits="0"
                  fluid
                  input-class="finance-input"
                  @focus="financeEditing = true"
                  @blur="onFinanceBlur"
                />
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-2">
                  <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
                    {{ t('admin.detail.shuttlesUsed') }}
                  </label>
                  <InputNumber
                    v-model="financeDraft.shuttlecocksUsed"
                    :min="0"
                    locale="en-US"
                    :use-grouping="true"
                    :min-fraction-digits="0"
                    :max-fraction-digits="0"
                    fluid
                    input-class="finance-input"
                    @focus="financeEditing = true"
                    @blur="onFinanceBlur"
                  />
                </div>

                <div class="space-y-2">
                  <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
                    {{ t('admin.detail.shuttlePackPrice') }}
                  </label>
                  <InputNumber
                    v-model="financeDraft.shuttlecockPackPrice"
                    :min="0"
                    locale="en-US"
                    :use-grouping="true"
                    :min-fraction-digits="0"
                    :max-fraction-digits="0"
                    fluid
                    input-class="finance-input"
                    @focus="financeEditing = true"
                    @blur="onFinanceBlur"
                  />
                </div>
              </div>

              <!-- Additional Shuttlecock Inputs -->
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-2">
                  <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
                    {{ t('admin.detail.additionalShuttlesUsed') }}
                  </label>
                  <InputNumber
                    v-model="financeDraft.additionalShuttlecocksUsed"
                    :min="0"
                    locale="en-US"
                    :use-grouping="true"
                    :min-fraction-digits="0"
                    :max-fraction-digits="0"
                    fluid
                    input-class="finance-input"
                    @focus="financeEditing = true"
                    @blur="onFinanceBlur"
                  />
                </div>

                <div class="space-y-2">
                  <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
                    {{ t('admin.detail.additionalShuttlePrice') }}
                  </label>
                  <InputNumber
                    v-model="financeDraft.additionalShuttlecockPrice"
                    :min="0"
                    locale="en-US"
                    :use-grouping="true"
                    :min-fraction-digits="0"
                    :max-fraction-digits="0"
                    fluid
                    input-class="finance-input"
                    @focus="financeEditing = true"
                    @blur="onFinanceBlur"
                  />
                </div>
              </div>

              <div class="rounded-2xl border border-brand-line bg-white/70 px-4 py-4">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                  {{ t('admin.detail.derivedShuttlePrice') }}
                </p>
                <p class="mt-2 text-2xl font-black tracking-tight text-brand-ink">
                  {{ formatCurrency(financialBreakdown.shuttlecockPrice) }}
                </p>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  {{
                    t('admin.detail.derivedFormulaHint', {
                      packPrice: formatCurrency(financialBreakdown.shuttlecockPackPrice),
                      rawPrice: formatPreciseCurrency(financialBreakdown.rawShuttlecockPrice),
                    })
                  }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div class="rounded-2xl border border-brand-line bg-brand-sand px-4 py-4">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                  {{ t('admin.detail.activePlayers') }}
                </p>
                <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">{{ totalActualPlayers }}</p>
                <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('admin.detail.activePlayersHint') }}</p>
              </div>

              <div
                class="rounded-2xl border border-brand-court/15 bg-[linear-gradient(180deg,rgba(47,122,83,0.12),rgba(255,255,255,0.95))] px-4 py-4"
              >
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                  {{ t('admin.detail.feePerPerson') }}
                </p>
                <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">
                  {{ formatCurrency(calculatedFeePerPerson) }}
                </p>
                <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('admin.detail.feePerPersonHint') }}</p>
              </div>
            </div>

            <div class="space-y-3 border-t border-brand-line pt-5">
              <div
                v-for="action in sessionActions"
                :key="action.label"
                class="rounded-2xl border border-brand-line bg-brand-sand/70 p-3"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="pr-2">
                    <p class="font-black text-brand-ink">{{ action.label }}</p>
                    <p class="text-sm font-medium text-brand-slate">{{ action.description }}</p>
                  </div>
                  <UIGlassButton
                    :variant="action.variant"
                    class="sm:shrink-0"
                    :loading="statusUpdating"
                    @click="action.action"
                  >
                    <template #icon-left>
                      <component :is="action.icon" :size="16" />
                    </template>
                    {{ action.label }}
                  </UIGlassButton>
                </div>
              </div>
            </div>
          </UIGlassCard>

          <!-- QR & Banking Management (Separated into its own card instead of nested inside sticky card) -->
          <AdminQRCodeManager
            :session-id="sessionId"
            :qr-url="session?.paymentQR || null"
            :bank-info="session?.bankInfo || null"
          />
        </div>
      </div>
    </section>
  </div>

  <!-- Reusable Session Edit Modal (Replaces 86 duplicate lines) -->
  <AdminSessionFormModal
    v-model="showEditModal"
    :form="editForm"
    is-editing
    :loading="savingEdits"
    @submit="saveSessionEdits"
  />

  <!-- Walk-In Player Modal -->
  <UIGlassModal v-model="showManualAddModal">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">{{ t('admin.detail.playerEntryKicker') }}</p>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">{{ t('admin.detail.addWalkInTitle') }}</h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            {{ t('admin.detail.addWalkInDesc') }}
          </p>
        </div>
      </div>
    </template>

    <form class="flex flex-col gap-5" @submit.prevent="saveManualPlayer">
      <UIGlassInput
        v-model="manualPlayer.name"
        type="text"
        :label="t('admin.detail.playerNameLabel')"
        :placeholder="t('admin.detail.playerNamePlaceholder')"
        required
      >
        <template #icon><UserCheck :size="18" /></template>
      </UIGlassInput>

      <UIGlassInput
        v-model.number="manualPlayer.guestCount"
        type="number"
        min="0"
        max="10"
        :label="t('admin.detail.guestsAccompanyingLabel')"
        placeholder="0"
      >
        <template #icon><Users :size="18" /></template>
      </UIGlassInput>

      <div class="grid grid-cols-2 gap-3 pt-1">
        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand/60 p-4 transition-colors hover:bg-brand-sand">
          <input
            v-model="manualPlayer.actualAttended"
            type="checkbox"
            class="h-5 w-5 rounded border-brand-line text-brand-court focus:ring-brand-court/20"
          />
          <div class="text-xs">
            <p class="font-bold text-brand-ink">{{ t('admin.detail.checkedInOption') }}</p>
            <p class="text-brand-slate">{{ t('admin.detail.presentOnCourt') }}</p>
          </div>
        </label>

        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand/60 p-4 transition-colors hover:bg-brand-sand">
          <input
            v-model="manualPlayer.hasPaid"
            type="checkbox"
            class="h-5 w-5 rounded border-brand-line text-brand-court focus:ring-brand-court/20"
          />
          <div class="text-xs">
            <p class="font-bold text-brand-ink">{{ t('admin.detail.paidOption') }}</p>
            <p class="text-brand-slate">{{ t('admin.detail.feeSettled') }}</p>
          </div>
        </label>
      </div>

      <div class="flex justify-end pt-4">
        <UIGlassButton type="submit" :loading="addingManualPlayer">
          <template #icon-left><UserPlus :size="16" /></template>
          {{ t('admin.detail.addPlayerBtn') }}
        </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>

  <SessionSocialShareModal
    v-if="session"
    v-model="showSocialModal"
    :session="session"
    :attendances="attendances"
    :financials="financialBreakdown"
    :initial-tab="socialShareTab"
  />
</template>

<style scoped>
.status-chip {
  @apply inline-flex items-center rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600;
}

.action-pill {
  @apply inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95;
}

:deep(.finance-input) {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-ink outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500;
}
</style>
