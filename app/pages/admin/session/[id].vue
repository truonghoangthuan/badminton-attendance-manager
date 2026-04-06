<script setup lang="ts">
import {
  ArrowLeft,
  BadgeDollarSign,
  Calendar,
  CheckCheck,
  CircleDollarSign,
  Clock3,
  Edit2,
  Lock,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-vue-next';
import { doc, onSnapshot, collection, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const route = useRoute();
const sessionId = route.params.id as string;
const { db } = useFirebase();

const session = ref<any>(null);
const attendances = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const statusUpdating = ref(false);
const showEditModal = ref(false);
const savingEdits = ref(false);

const editForm = ref({
  date: '',
  time: '',
  location: '',
});

onMounted(() => {
  const sessionRef = doc(db, 'sessions', sessionId);
  const unsubSession = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      error.value = 'Session not found.';
      loading.value = false;
      return;
    }

    session.value = { id: snap.id, ...snap.data() };
    editForm.value = {
      date: session.value.date || '',
      time: session.value.time || '',
      location: session.value.location || '',
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

const totalSessionCost = computed(() => {
  if (!session.value) {
    return 0;
  }

  const financials = session.value.financials || {};
  return (financials.courtCost || 0) + (financials.shuttlecocksUsed || 0) * (financials.shuttlecockPrice || 0);
});

const calculatedFeePerPerson = computed(() => {
  if (!session.value || totalActualPlayers.value === 0) {
    return 0;
  }

  return Number((totalSessionCost.value / totalActualPlayers.value).toFixed(2));
});

const sessionMeta = computed(() => {
  if (!session.value) {
    return [];
  }

  return [
    {
      icon: Clock3,
      label: 'Time',
      value: session.value.time || 'TBD',
    },
    {
      icon: MapPin,
      label: 'Location',
      value: session.value.location || 'TBD',
    },
  ];
});

const summaryStats = computed(() => [
  {
    icon: UserPlus,
    label: 'RSVP yes',
    value: totalJoinedPlayers.value,
    hint: `${totalGuestCount.value} guests`,
    accent: 'from-brand-court/14 to-brand-court/5 text-brand-court',
  },
  {
    icon: UserCheck,
    label: 'Checked in',
    value: totalActualPlayers.value,
    hint: `${totalExpectedPlayers.value} expected`,
    accent: 'from-brand-purple/14 to-brand-purple/5 text-brand-purple',
  },
  {
    icon: CircleDollarSign,
    label: 'Pending payment',
    value: unpaidPlayers.value,
    hint: `${formatCurrency(totalSessionCost.value)} total cost`,
    accent: 'from-brand-shuttle/22 to-brand-shuttle/8 text-amber-700',
  },
]);

const updateSessionStatus = async (nextStatus: 'open' | 'locked' | 'completed') => {
  if (!session.value || statusUpdating.value || session.value.status === nextStatus) {
    return;
  }

  if (nextStatus === 'completed' && !window.confirm('Mark this session as completed?')) {
    return;
  }

  statusUpdating.value = true;

  try {
    await updateDoc(doc(db, 'sessions', sessionId), { status: nextStatus });
  } catch (e) {
    console.error('Error updating status:', e);
  } finally {
    statusUpdating.value = false;
  }
};

const sessionActions = computed(() => {
  if (!session.value) {
    return [];
  }

  if (session.value.status === 'open') {
    return [
      {
        label: 'Lock RSVP',
        description: 'Freeze responses and finalize the fee split.',
        icon: Lock,
        variant: 'primary' as const,
        action: () => updateSessionStatus('locked'),
      },
    ];
  }

  if (session.value.status === 'locked') {
    return [
      {
        label: 'Mark completed',
        description: 'Close the session after payment collection.',
        icon: CheckCheck,
        variant: 'primary' as const,
        action: () => updateSessionStatus('completed'),
      },
      {
        label: 'Reopen RSVP',
        description: 'Allow edits before the session is closed.',
        icon: ShieldCheck,
        variant: 'secondary' as const,
        action: () => updateSessionStatus('open'),
      },
    ];
  }

  return [
    {
      label: 'Reopen session',
      description: 'Move this session back to locked for follow-up.',
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
  };
  showEditModal.value = true;
};

const saveSessionEdits = async () => {
  if (!session.value || savingEdits.value) return;
  savingEdits.value = true;
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, { ...editForm.value });
    showEditModal.value = false;
  } catch (e) {
    console.error('Error saving session edits:', e);
  } finally {
    savingEdits.value = false;
  }
};

const deleteAttendee = async (attendance: any) => {
  if (!window.confirm(`Are you sure you want to remove ${attendance.name} from this session?`)) {
    return;
  }

  try {
    const docRef = doc(db, `sessions/${sessionId}/attendances`, attendance.id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting attendee:', e);
  }
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
      'financials.shuttlecockPrice': session.value.financials.shuttlecockPrice,
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
        Back to Sessions
      </NuxtLink>

      <div v-if="loading" class="py-16 text-center">
        <div
          class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-court border-t-transparent"
        />
        <p class="text-sm font-bold text-brand-slate">Loading session details...</p>
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
                    <p class="section-kicker">Session Control</p>
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

                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-full border border-brand-line bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-brand-ink transition-colors hover:border-brand-court hover:text-brand-court"
                    @click="openEditModal"
                  >
                    <Edit2 :size="14" class="mr-2" />
                    Edit Session
                  </button>

                  <span
                    :class="getStatusColor(session.status)"
                    class="inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em]"
                  >
                    {{ session.status }}
                  </span>
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
                <p class="section-kicker">Attendance</p>
                <h2 class="mt-2 text-2xl font-black tracking-tight">Player Check-In</h2>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  Confirm who showed up, keep payments moving, and spot gaps fast.
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="score-chip">{{ attendances.length }} responses</span>
                <span class="score-chip">{{ totalExpectedPlayers }} expected</span>
                <span class="score-chip">{{ unpaidPlayers }} unpaid</span>
              </div>
            </div>

            <div
              v-if="attendances.length === 0"
              class="rounded-[24px] border border-dashed border-brand-line bg-brand-sand px-6 py-12 text-center"
            >
              <Users :size="28" class="mx-auto text-brand-slate" />
              <p class="mt-4 text-lg font-black text-brand-ink">No attendance responses yet</p>
              <p class="mt-2 text-sm font-medium text-brand-slate">
                Once players RSVP, this board will show attendance and payment progress.
              </p>
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
                    <p class="text-lg font-black tracking-tight">{{ att.name }}</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <span
                        class="status-chip"
                        :class="
                          att.isJoining
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-600'
                        "
                      >
                        {{ att.isJoining ? 'Joining' : 'Not joining' }}
                      </span>
                      <span class="status-chip">
                        {{ att.guestCount ? `+${att.guestCount} guests` : 'No guests' }}
                      </span>
                    </div>
                  </div>
                  <span class="text-xs font-bold uppercase tracking-[0.18em] text-brand-slate">
                    {{ att.actualAttended ? 'Present' : 'Pending' }}
                  </span>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
                    @click="deleteAttendee(att)"
                  >
                    <Trash2 :size="14" />
                  </button>
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
                    {{ att.actualAttended ? 'Checked in' : 'Mark present' }}
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
                    {{ att.hasPaid ? 'Paid' : 'Collect payment' }}
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="attendances.length > 0"
              class="hidden overflow-hidden rounded-[24px] border border-brand-line md:block"
            >
              <table class="w-full">
                <thead class="bg-brand-sand/90">
                  <tr class="text-left">
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Player</th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">RSVP</th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Guests</th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                      Check-In
                    </th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                      Payment
                    </th>
                    <th class="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
                    </th>
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
                        <span class="font-black text-brand-ink">{{ att.name }}</span>
                        <span class="text-sm font-medium text-brand-slate">
                          {{ att.actualAttended ? 'Checked in on-site' : 'Awaiting check-in' }}
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
                        {{ att.isJoining ? 'Joining' : 'No' }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <span
                        v-if="att.guestCount"
                        class="status-chip border-brand-court/20 bg-brand-court/10 text-brand-court"
                      >
                        +{{ att.guestCount }}
                      </span>
                      <span v-else class="text-sm font-medium text-brand-slate/70">None</span>
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
                        {{ att.actualAttended ? 'Present' : 'Mark present' }}
                      </button>
                    </td>
                    <td class="px-5 py-4">
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
                        {{ att.hasPaid ? 'Paid' : 'Unpaid' }}
                      </button>
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
                <p class="section-kicker">Finance</p>
                <h2 class="mt-2 text-2xl font-black tracking-tight">Settlement Panel</h2>
                <p class="mt-1 text-sm font-medium text-brand-slate">
                  Update costs and the per-person split recalculates automatically.
                </p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
                <BadgeDollarSign :size="22" />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"
                  >Court Cost</label
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
                    >Shuttles Used</label
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
                    >Shuttle Price</label
                  >
                  <InputNumber
                    v-model="session.financials.shuttlecockPrice"
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
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div class="rounded-[24px] border border-brand-line bg-brand-sand px-4 py-4">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Active players</p>
                <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">{{ totalActualPlayers }}</p>
                <p class="mt-1 text-sm font-medium text-brand-slate">Includes guests marked as present.</p>
              </div>

              <div
                class="rounded-[24px] border border-brand-court/15 bg-[linear-gradient(180deg,rgba(47,122,83,0.12),rgba(255,255,255,0.95))] px-4 py-4"
              >
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Fee per person</p>
                <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">
                  {{ formatCurrency(calculatedFeePerPerson) }}
                </p>
                <p class="mt-1 text-sm font-medium text-brand-slate">Live sync from attendance and cost inputs.</p>
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
          </UIGlassCard>
        </div>
      </div>
    </section>
  </div>

  <UIGlassModal v-model="showEditModal">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">Session Setup</p>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">Edit Session Details</h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            Update the date, time, and location of this session.
          </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="saveSessionEdits" class="flex flex-col gap-5">
      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
          Date
        </label>
        <div class="relative">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate">
            <Calendar :size="18" />
          </div>
          <UIGlassInput
            v-model="editForm.date"
            type="date"
            required
            class="!pl-12"
          />
        </div>
      </div>
      <UIGlassInput v-model="editForm.time" type="time" label="Time" required>
        <template #icon><Clock3 :size="18" /></template>
      </UIGlassInput>
      <UIGlassInput v-model="editForm.location" type="text" label="Location" required>
        <template #icon><MapPin :size="18" /></template>
      </UIGlassInput>

      <div class="flex justify-end pt-4">
        <UIGlassButton type="submit" :loading="savingEdits">
          Save Changes
        </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>
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
