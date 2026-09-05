<script setup lang="ts">
import {
  ArrowLeft,
  BadgeDollarSign,
  Calendar,
  CheckCheck,
  ChevronDown,
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
import { SKILL_LEVEL_OPTIONS } from '~/types/session';
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
    editForm.value = {
      date: session.value.date || '',
      time: session.value.time || '',
      location: session.value.location || '',
      maxPlayers: session.value.maxPlayers || 8,
      courtNumber: session.value.courtNumber || '',
      shuttlecockType: session.value.shuttlecockType || '',
      level: session.value.level || '',
    };
  });

  const attendancesRef = collection(db, `sessions/${sessionId}/attendances`);
  const q = query(attendancesRef, orderBy('name', 'asc'));
  const unsubAttendances = onSnapshot(q, (snap) => {
    attendances.value = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    loading.value = false;
  });

  onUnmounted(() => {
    unsubSession();
    unsubAttendances();
  });
});

const totalJoinedPlayers = computed(() => attendances.value.filter((attendance) => attendance.isJoining).length);

const totalGuestCount = computed(() => {
  return attendances.value.reduce((acc, curr) => {
    if (!curr.isJoining) {
      return acc;
    }

    return acc + (curr.guestCount || 0);
  }, 0);
});

const totalExpectedPlayers = computed(() => totalJoinedPlayers.value + totalGuestCount.value);

const totalActualPlayers = computed(() => {
  return attendances.value.reduce((acc, curr) => {
    if (curr.actualAttended) {
      return acc + 1 + (curr.guestCount || 0);
    }
    return acc;
  }, 0);
});

const unpaidPlayers = computed(() => {
  return attendances.value.filter((attendance) => attendance.actualAttended && !attendance.hasPaid).length;
});

const unpaidSlots = computed(() =>
  attendances.value
    .filter((a) => a.actualAttended && !a.hasPaid)
    .reduce((acc, a) => acc + 1 + (a.guestCount || 0), 0)
);

const financialBreakdown = computed(() => getSessionFinancialBreakdown(session.value?.financials, totalActualPlayers.value));

const totalSessionCost = computed(() => financialBreakdown.value.totalSessionCost);

const calculatedFeePerPerson = computed(() => {
  return calculateFeePerPerson(totalSessionCost.value, totalActualPlayers.value);
});

const unpaidTotalRevenue = computed(() => unpaidSlots.value * calculatedFeePerPerson.value);

const sessionMeta = computed(() => {
  if (!session.value) {
    return [];
  }

  const items = [
    {
      icon: Clock3,
      label: t('admin.detail.time'),
      value: session.value.time || t('admin.detail.tbd'),
    },
    {
      icon: MapPin,
      label: t('admin.detail.location'),
      value: session.value.location || t('admin.detail.tbd'),
    },
    {
      icon: Users,
      label: t('admin.detail.capacity'),
      value: `${session.value.maxPlayers || 8} ${t('admin.detail.playersUnit')}`,
    },
  ];

  if (session.value.courtNumber) {
    items.push({
      icon: Grid2x2,
      label: t('admin.detail.court'),
      value: session.value.courtNumber,
    });
  }

  if (session.value.shuttlecockType) {
    items.push({
      icon: Feather,
      label: t('admin.detail.shuttle'),
      value: session.value.shuttlecockType,
    });
  }

  if (session.value.level) {
    items.push({
      icon: Trophy,
      label: t('admin.detail.level'),
      value: session.value.level,
    });
  }

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
    hint: unpaidSlots.value > 0
      ? `${unpaidSlots.value} ${unpaidSlots.value === 1 ? t('admin.detail.slotUnit') : t('admin.detail.slotsUnit')} (${formatCurrency(unpaidTotalRevenue.value)})`
      : t('admin.detail.allPaidUp'),
    accent: unpaidPlayers.value > 0 ? 'from-brand-shuttle/22 to-brand-shuttle/8 text-amber-700' : 'from-emerald-500/14 to-emerald-500/5 text-emerald-600',
  },
]);

const updateSessionStatus = async (nextStatus: 'open' | 'locked' | 'completed') => {
  if (!session.value || statusUpdating.value || session.value.status === nextStatus) {
    return;
  }

  const performStatusUpdate = async () => {
    statusUpdating.value = true;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { status: nextStatus });
    } catch (e) {
      console.error('Error updating status:', e);
    } finally {
      statusUpdating.value = false;
    }
  };

  if (nextStatus === 'completed') {
    confirm.require({
      message: t('admin.completeConfirmMessage'),
      header: t('admin.completeConfirmHeader'),
      rejectLabel: t('admin.cancel'),
      acceptLabel: t('admin.complete'),
      accept: performStatusUpdate,
    });
    return;
  }

  await performStatusUpdate();
};

const sessionActions = computed(() => {
  if (!session.value) {
    return [];
  }

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
    date: session.value.date,
    time: session.value.time,
    location: session.value.location,
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
  } catch (e) {
    console.error('Error saving session edits:', e);
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
  } catch (e) {
    console.error('Failed to add manual player:', e);
  } finally {
    addingManualPlayer.value = false;
  }
};

const deleteAttendee = async (attendance: any) => {
  confirm.require({
    message: t('admin.detail.removeAttendeeConfirm', { name: attendance.name }),
    header: t('admin.detail.removeAttendeeTitle'),
    severity: 'danger',
    rejectLabel: t('admin.cancel'),
    acceptLabel: t('admin.detail.removeBtn'),
    accept: async () => {
      try {
        const docRef = doc(db, `sessions/${sessionId}/attendances`, attendance.id);
        await deleteDoc(docRef);
      } catch (e) {
        console.error('Error deleting attendee:', e);
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
  }
};

const updateFinancials = async () => {
  if (!session.value) {
    return;
  }

  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      'financials.courtCost': session.value.financials.courtCost,
      'financials.shuttlecocksUsed': session.value.financials.shuttlecocksUsed,
      'financials.shuttlecockPackPrice': session.value.financials.shuttlecockPackPrice || 0,
      'financials.shuttlecockPrice': financialBreakdown.value.shuttlecockPrice,
      'financials.calculatedFeePerPerson': calculatedFeePerPerson.value,
    });
  } catch (e) {
    console.error('Error updating financials:', e);
  }
};

watch(calculatedFeePerPerson, (newVal) => {
  if (session.value && session.value.financials.calculatedFeePerPerson !== newVal) {
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
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-brand-line bg-white text-brand-slate';
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
        <div
          class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-court border-t-transparent"
        />
        <p class="text-sm font-bold text-brand-slate">{{ t('admin.detail.loadingDetails') }}</p>
      </div>

      <UIGlassCard v-else-if="error" class="border-red-200 bg-red-50 text-center text-red-700">
        {{ error }}
      </UIGlassCard>

      <div v-else-if="session" class="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
        <div class="space-y-6">
          <UIGlassCard class="overflow-hidden !p-0">
            <div class="hero-panel relative overflow-hidden px-6 py-7 sm:px-8">
              <div
                class="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(244,201,93,0.28),transparent_55%)] lg:block"
              />

              <div class="relative flex flex-col gap-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="space-y-3">
                    <p class="section-kicker">{{ t('admin.detail.sessionControlKicker') }}</p>
                    <div class="space-y-2">
                      <h1 class="text-3xl font-black tracking-tight text-brand-ink sm:text-[2.5rem]">
                        {{ session.date }}
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
                      {{ session.status }}
                    </span>
                  </div>
                </div>

                <div class="grid gap-3 md:grid-cols-3">
                  <div
                    v-for="stat in summaryStats"
                    :key="stat.label"
                    class="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_14px_30px_rgba(18,55,42,0.05)]"
                  >
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
                          {{ stat.label }}
                        </p>
                        <p class="mt-3 text-3xl font-black tracking-tight text-brand-ink">
                          {{ stat.value }}
                        </p>
                        <p class="mt-1 text-sm font-medium text-brand-slate">
                          {{ stat.hint }}
                        </p>
                      </div>
                      <div
                        class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br"
                        :class="stat.accent"
                      >
                        <component :is="stat.icon" :size="22" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UIGlassCard>

          <UIGlassCard class="space-y-6">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="section-kicker">{{ t('admin.detail.attendanceKicker') }}</p>
                <h2 class="mt-2 text-2xl font-black tracking-tight">{{ t('admin.detail.checkinTitle') }}</h2>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  {{ t('admin.detail.checkinSubtitle') }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span class="score-chip">{{ t('admin.detail.responsesCount', { count: attendances.length }) }}</span>
                <span class="score-chip">{{ t('admin.detail.expectedHint', { count: totalExpectedPlayers }) }}</span>
                <span class="score-chip">{{ t('admin.detail.unpaidStatus', { count: unpaidPlayers, slots: unpaidSlots }) }}</span>
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
                <UIGlassButton
                  class="!px-3.5 !py-1.5 !text-xs font-bold"
                  @click="showManualAddModal = true"
                >
                  <template #icon-left><UserPlus :size="14" /></template>
                  {{ t('admin.detail.addWalkIn') }}
                </UIGlassButton>
              </div>
            </div>

            <div
              v-if="totalJoinedPlayers > 0 && totalActualPlayers === 0"
              class="flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50/80 p-4 text-amber-900"
            >
              <Info :size="20" class="mt-0.5 shrink-0 text-amber-600" />
              <div class="text-sm">
                <p class="font-bold">{{ t('admin.detail.checkinRequiredTitle') }}</p>
                <p class="mt-0.5 text-xs font-medium text-amber-800">
                  {{ t('admin.detail.checkinRequiredDesc') }}
                </p>
              </div>
            </div>

            <div
              v-if="attendances.length === 0"
              class="rounded-[24px] border border-dashed border-brand-line bg-brand-sand px-6 py-12 text-center"
            >
              <Users :size="28" class="mx-auto text-brand-slate" />
              <p class="mt-4 text-lg font-black text-brand-ink">{{ t('admin.detail.noAttendanceTitle') }}</p>
              <p class="mt-2 text-sm font-medium text-brand-slate">
                {{ t('admin.detail.noAttendanceDesc') }}
              </p>
              <div class="mt-4">
                <UIGlassButton
                  class="!px-4 !py-2 !text-xs font-bold"
                  @click="showManualAddModal = true"
                >
                  <template #icon-left><UserPlus :size="14" /></template>
                  {{ t('admin.detail.addWalkInPlayer') }}
                </UIGlassButton>
              </div>
            </div>

            <div v-else class="space-y-3 md:hidden">
              <div
                v-for="att in attendances"
                :key="att.id"
                class="rounded-[24px] border p-4 transition-colors"
                :class="att.actualAttended ? 'border-brand-court/25 bg-emerald-50/60' : 'border-brand-line bg-white'"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="text-lg font-black tracking-tight">{{ att.name }}</p>
                      <span
                        v-if="att.isManual"
                        class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-700"
                      >
                        {{ t('admin.detail.walkInBadge') }}
                      </span>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-2">
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
                      <span class="status-chip">
                        {{ att.guestCount ? `+${att.guestCount} ${att.guestCount === 1 ? t('admin.detail.guestUnit') : t('admin.detail.guestsUnit')}` : t('admin.detail.noGuests') }}
                      </span>
                    </div>
                  </div>
                  <span class="text-xs font-bold uppercase tracking-[0.18em] text-brand-slate">
                    {{ att.actualAttended ? t('admin.detail.presentStatus') : t('admin.detail.pendingStatus') }}
                  </span>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
                    @click="deleteAttendee(att)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>

                <div v-if="att.actualAttended" class="mt-3 flex items-center justify-between rounded-xl border border-brand-line/60 bg-brand-sand/50 px-3 py-2 text-xs">
                  <span class="font-medium text-brand-slate">{{ t('admin.detail.calculatedShare') }}</span>
                  <div class="text-right">
                    <span class="font-black text-brand-ink">{{ formatCurrency(calculatedFeePerPerson * (1 + (att.guestCount || 0))) }}</span>
                    <span v-if="att.guestCount" class="text-[10px] font-medium text-brand-slate"> ({{ 1 + att.guestCount }} {{ 1 + att.guestCount === 1 ? t('admin.detail.slotUnit') : t('admin.detail.slotsUnit') }})</span>
                  </div>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    class="action-pill"
                    :class="
                      att.actualAttended
                        ? 'border-brand-court bg-brand-court text-white'
                        : 'border-brand-line bg-brand-sand text-brand-slate'
                    "
                    @click="toggleAttendanceAttr(att.id, 'actualAttended', !att.actualAttended)"
                  >
                    <UserCheck :size="16" />
                    {{ att.actualAttended ? t('admin.detail.checkedInBtn') : t('admin.detail.markPresent') }}
                  </button>

                  <button
                    type="button"
                    class="action-pill"
                    :class="
                      att.hasPaid
                        ? 'border-brand-court bg-brand-court text-white'
                        : 'border-brand-line bg-white text-brand-slate'
                    "
                    @click="toggleAttendanceAttr(att.id, 'hasPaid', !att.hasPaid)"
                  >
                    <ReceiptText :size="16" />
                    {{ att.hasPaid ? t('admin.detail.paidBtn') : t('admin.detail.collectPaymentBtn') }}
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="attendances.length"
              class="hidden overflow-hidden rounded-[24px] border border-brand-line md:block"
            >
              <table class="w-full">
                <thead class="bg-brand-sand/90">
                  <tr class="text-left">
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">{{ t('admin.detail.thPlayer') }}</th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">{{ t('admin.detail.thRsvp') }}</th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">{{ t('admin.detail.thGuests') }}</th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                      {{ t('admin.detail.thCheckIn') }}
                    </th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                      {{ t('admin.detail.thPayment') }}
                    </th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-brand-line bg-white">
                  <tr
                    v-for="att in attendances"
                    :key="att.id"
                    class="transition-colors hover:bg-brand-sand/45"
                    :class="att.actualAttended ? 'bg-emerald-50/45' : ''"
                  >
                    <td class="px-5 py-4">
                      <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                          <span class="font-black text-brand-ink">{{ att.name }}</span>
                          <span
                            v-if="att.isManual"
                            class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-700"
                          >
                            {{ t('admin.detail.walkInBadge') }}
                          </span>
                        </div>
                        <span class="text-sm font-medium text-brand-slate">
                          {{ att.actualAttended ? t('admin.detail.checkedInOnSite') : t('admin.detail.awaitingCheckIn') }}
                        </span>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <span
                        class="status-chip"
                        :class="
                          att.isJoining
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-600'
                        "
                      >
                        {{ att.isJoining ? t('admin.detail.joining') : t('admin.detail.noBadge') }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <span
                        v-if="att.guestCount"
                        class="status-chip border-brand-court/20 bg-brand-court/10 text-brand-court"
                      >
                        +{{ att.guestCount }}
                      </span>
                      <span v-else class="text-sm font-medium text-brand-slate/70">{{ t('admin.detail.none') }}</span>
                    </td>
                    <td class="px-5 py-4">
                      <button
                        type="button"
                        class="action-pill !px-4 !py-2 text-sm"
                        :class="
                          att.actualAttended
                            ? 'border-brand-court bg-brand-court text-white'
                            : 'border-brand-line bg-brand-sand text-brand-slate'
                        "
                        @click="toggleAttendanceAttr(att.id, 'actualAttended', !att.actualAttended)"
                      >
                        <UserCheck :size="16" />
                        {{ att.actualAttended ? t('admin.detail.presentStatus') : t('admin.detail.markPresent') }}
                      </button>
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex flex-col gap-1.5">
                        <button
                          type="button"
                          class="action-pill !px-4 !py-2 text-sm"
                          :class="
                            att.hasPaid
                              ? 'border-brand-court bg-brand-court text-white'
                              : 'border-brand-line bg-white text-brand-slate'
                          "
                          @click="toggleAttendanceAttr(att.id, 'hasPaid', !att.hasPaid)"
                        >
                          <ReceiptText :size="16" />
                          {{ att.hasPaid ? t('admin.detail.paidBtn') : t('admin.detail.unpaidBtn') }}
                        </button>
                        <div v-if="att.actualAttended" class="px-1 text-xs font-semibold text-brand-slate">
                          {{ t('admin.detail.owes') }} <span class="font-black text-brand-ink">{{ formatCurrency(calculatedFeePerPerson * (1 + (att.guestCount || 0))) }}</span>
                          <span v-if="att.guestCount" class="text-[10px] text-brand-slate/70"> ({{ 1 + att.guestCount }} {{ 1 + att.guestCount === 1 ? t('admin.detail.slotUnit') : t('admin.detail.slotsUnit') }})</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <button
                        type="button"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                        @click="deleteAttendee(att)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UIGlassCard>
        </div>

        <div class="space-y-6">
          <UIGlassCard class="sticky top-8 space-y-6">
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
                <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"
                  >{{ t('admin.detail.courtCost') }}</label
                >
                <InputNumber
                  v-model="session.financials.courtCost"
                  :min="0"
                  locale="en-US"
                  :use-grouping="true"
                  :min-fraction-digits="0"
                  :max-fraction-digits="0"
                  fluid
                  input-class="finance-input"
                  @blur="updateFinancials"
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div class="space-y-2">
                  <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"
                    >{{ t('admin.detail.shuttlesUsed') }}</label
                  >
                  <InputNumber
                    v-model="session.financials.shuttlecocksUsed"
                    :min="0"
                    locale="en-US"
                    :use-grouping="true"
                    :min-fraction-digits="0"
                    :max-fraction-digits="0"
                    fluid
                    input-class="finance-input"
                    @blur="updateFinancials"
                  />
                </div>

                <div class="space-y-2">
                  <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"
                    >{{ t('admin.detail.shuttlePackPrice') }}</label
                  >
                  <InputNumber
                    v-model="session.financials.shuttlecockPackPrice"
                    :min="0"
                    locale="en-US"
                    :use-grouping="true"
                    :min-fraction-digits="0"
                    :max-fraction-digits="0"
                    fluid
                    input-class="finance-input"
                    @blur="updateFinancials"
                  />
                </div>
              </div>

              <div class="rounded-[24px] border border-brand-line bg-white/70 px-4 py-4">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">{{ t('admin.detail.derivedShuttlePrice') }}</p>
                <p class="mt-2 text-2xl font-black tracking-tight text-brand-ink">
                  {{ formatCurrency(financialBreakdown.shuttlecockPrice) }}
                </p>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  {{ t('admin.detail.derivedFormulaHint', { packPrice: formatCurrency(financialBreakdown.shuttlecockPackPrice), rawPrice: formatPreciseCurrency(financialBreakdown.rawShuttlecockPrice) }) }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div class="rounded-[24px] border border-brand-line bg-brand-sand px-4 py-4">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">{{ t('admin.detail.activePlayers') }}</p>
                <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">{{ totalActualPlayers }}</p>
                <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('admin.detail.activePlayersHint') }}</p>
              </div>

              <div
                class="rounded-[24px] border border-brand-court/15 bg-[linear-gradient(180deg,rgba(47,122,83,0.12),rgba(255,255,255,0.95))] px-4 py-4"
              >
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">{{ t('admin.detail.feePerPerson') }}</p>
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
                class="rounded-[24px] border border-brand-line bg-brand-sand/70 p-3"
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

            <AdminQRCodeManager
              :session-id="sessionId"
              :qr-url="session?.paymentQR || null"
              :bank-info="session?.bankInfo || null"
            />
          </UIGlassCard>
        </div>
      </div>
    </section>
  </div>

  <UIGlassModal v-model="showEditModal">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">{{ t('admin.setupKicker') }}</p>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">{{ t('admin.detail.editModalTitle') }}</h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">{{ t('admin.detail.editModalDesc') }}</p>
        </div>
      </div>
    </template>

    <form @submit.prevent="saveSessionEdits" class="flex flex-col gap-5">
      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"> {{ t('admin.dateLabel') }} </label>
        <div class="relative">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate">
            <Calendar :size="18" />
          </div>
          <UIGlassInput v-model="editForm.date" type="date" required class="!pl-12" />
        </div>
      </div>
      <UIGlassInput v-model="editForm.time" type="time" :label="t('admin.timeLabel')" required>
        <template #icon><Clock3 :size="18" /></template>
      </UIGlassInput>
      <UIGlassInput v-model="editForm.location" type="text" :label="t('admin.locationLabel')" required>
        <template #icon><MapPin :size="18" /></template>
      </UIGlassInput>
      <UIGlassInput
        v-model.number="editForm.maxPlayers"
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
          v-model="editForm.courtNumber"
          type="text"
          :label="t('admin.courtNumberLabel')"
          :placeholder="t('admin.courtNumberPlaceholder')"
        >
          <template #icon><Grid2x2 :size="18" /></template>
        </UIGlassInput>

        <UIGlassInput
          v-model="editForm.shuttlecockType"
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
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
            <Trophy :size="18" />
          </div>
          <div class="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate/80 transition-colors group-focus-within:text-brand-court">
            <ChevronDown :size="18" />
          </div>
          <select
            v-model="editForm.level"
            class="w-full appearance-none rounded-2xl border border-brand-line bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,240,0.96))] py-4 pl-12 pr-12 text-base font-bold tracking-[0.02em] text-brand-ink shadow-[0_18px_40px_-32px_rgba(35,55,34,0.34)] transition-all outline-none hover:border-brand-court/30 hover:shadow-[0_20px_42px_-30px_rgba(56,126,88,0.26)] focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
          >
            <option value="">{{ t('admin.allSkillLevels') }}</option>
            <option v-for="lvl in SKILL_LEVEL_OPTIONS" :key="lvl" :value="lvl">
              {{ lvl }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <UIGlassButton type="submit" :loading="savingEdits"> {{ t('admin.saveChangesBtn') }} </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>

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

    <form @submit.prevent="saveManualPlayer" class="flex flex-col gap-5">
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
.hero-panel {
  background:
    linear-gradient(135deg, rgba(47, 122, 83, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(252, 249, 241, 0.94));
}

.status-chip {
  @apply inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em];
}

.action-pill {
  @apply inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(18,55,42,0.08)];
}

:deep(.finance-input) {
  @apply w-full rounded-2xl border border-brand-line bg-[#fcfcf9] px-4 py-4 text-brand-ink outline-none transition-all placeholder:text-brand-slate/70 focus:border-brand-court focus:ring-4 focus:ring-brand-court/10;
}
</style>
