<script setup lang="ts">
import { doc, collection, setDoc, orderBy, onSnapshot, query } from 'firebase/firestore';
import { BadgeDollarSign, Clock3, Loader2, MapPin, User, Users as UsersIcon } from 'lucide-vue-next';
import { calculateFeePerPerson, getSessionFinancialBreakdown } from '~/utils/sessionFinancials';

const route = useRoute();
const sessionId = route.params.id as string;
const { user, profile, loading: authLoading, setProfile } = useUserProfile();
const { db } = useFirebase();
const toast = useToast();

const session = ref<any>(null);
const attendanceList = ref<any[]>([]);
const loading = ref(true);
const submitting = ref(false);
const message = ref({ text: '', type: '' });
const newName = ref('');
const vote = ref({
  isJoining: true,
  guestCount: 0,
});
const hasExistingVote = computed(() => {
  if (!user.value) {
    return false;
  }

  return attendanceList.value.some((attendance) => attendance.id === user.value?.uid);
});

const maxCapacity = computed(() => session.value?.maxPlayers || 8);
const totalJoinedSlots = computed(() =>
  attendanceList.value.reduce((acc, curr) => {
    if (curr.isJoining) return acc + 1 + (curr.guestCount || 0);
    return acc;
  }, 0)
);
const isSessionFull = computed(() => totalJoinedSlots.value >= maxCapacity.value);

const myAttendanceRecord = computed(() => {
  if (!user.value) return null;
  return attendanceList.value.find((a: any) => a.id === user.value?.uid) || null;
});
const isUserAlreadyJoining = computed(() => myAttendanceRecord.value?.isJoining === true);

const totalActualPlayers = computed(() => {
  return attendanceList.value.reduce((acc, curr) => {
    if (curr.actualAttended) {
      return acc + 1 + (curr.guestCount || 0);
    }

    return acc;
  }, 0);
});

const financialBreakdown = computed(() =>
  getSessionFinancialBreakdown(session.value?.financials, totalActualPlayers.value),
);

const totalSessionCost = computed(() => financialBreakdown.value.totalSessionCost);

const calculatedFeePerPerson = computed(() => {
  return calculateFeePerPerson(totalSessionCost.value, totalActualPlayers.value);
});

onMounted(async () => {
  try {
    const unsubscribeSession = onSnapshot(doc(db, 'sessions', sessionId), (sessionDoc) => {
      if (!sessionDoc.exists()) {
        message.value = { text: 'Session not found.', type: 'error' };
        loading.value = false;
        return;
      }

      session.value = { id: sessionDoc.id, ...sessionDoc.data() };
    });

    const attendancesRef = collection(db, `sessions/${sessionId}/attendances`);
    const qAttendance = query(attendancesRef, orderBy('updatedAt', 'desc'));
    const unsubscribeSnapshot = onSnapshot(qAttendance, (snapshot) => {
      attendanceList.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      loading.value = false;
    });

    watchEffect(() => {
      if (user.value && attendanceList.value.length) {
        const myVote = attendanceList.value.find((a) => a.id === user.value?.uid);
        if (myVote) {
          vote.value.isJoining = myVote.isJoining;
          vote.value.guestCount = myVote.guestCount || 0;
        } else if (isSessionFull.value) {
          vote.value.isJoining = false;
        }
      } else if (isSessionFull.value && !isUserAlreadyJoining.value) {
        vote.value.isJoining = false;
      }
    });

    onUnmounted(() => {
      unsubscribeSession();
      unsubscribeSnapshot();
    });
  } catch (e) {
    console.error('Error loading session:', e);
    message.value = { text: 'Error loading session data.', type: 'error' };
  } finally {
    if (message.value.type === 'error') {
      loading.value = false;
    }
  }
});

const submitVote = async () => {
  if (!user.value) {
    toast.add({
      severity: 'error',
      summary: 'Unable to save RSVP',
      detail: 'Please wait a moment.',
      life: 3000,
    });
    return;
  }

  if (!profile.value?.displayName) {
    if (!newName.value.trim()) {
      toast.add({
        severity: 'error',
        summary: 'Missing name',
        detail: 'Please enter your name.',
        life: 3000,
      });
      return;
    }

    const success = await setProfile(newName.value.trim());
    if (!success) {
      toast.add({
        severity: 'error',
        summary: 'Profile update failed',
        detail: 'Could not save your name.',
        life: 3000,
      });
      return;
    }
  }

  if (vote.value.isJoining) {
    const previousSlots = isUserAlreadyJoining.value ? 1 + (myAttendanceRecord.value?.guestCount || 0) : 0;
    const requestedSlots = 1 + (vote.value.guestCount || 0);
    const availableSlots = Math.max(0, maxCapacity.value - (totalJoinedSlots.value - previousSlots));

    if (requestedSlots > availableSlots) {
      toast.add({
        severity: 'warn',
        summary: availableSlots === 0 ? 'Session Full' : 'Capacity Exceeded',
        detail: availableSlots === 0
          ? 'This session is full and cannot accept new players.'
          : `Only ${availableSlots} slot(s) remaining.`,
        life: 3500,
      });
      return;
    }
  }

  submitting.value = true;
  try {
    const uid = user.value.uid;
    const displayName = profile.value?.displayName || newName.value.trim();
    const attendanceRef = doc(db, `sessions/${sessionId}/attendances`, uid);
    const existingRecord = attendanceList.value.find((a: any) => a.id === uid);
    const actualAttended = vote.value.isJoining ? (existingRecord?.actualAttended ?? false) : false;

    await setDoc(attendanceRef, {
      uid,
      name: displayName,
      isJoining: vote.value.isJoining,
      guestCount: vote.value.guestCount || 0,
      actualAttended,
      hasPaid: existingRecord?.hasPaid ?? false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    toast.add({
      severity: 'success',
      summary: vote.value.isJoining ? 'RSVP confirmed' : 'RSVP updated',
      detail: vote.value.isJoining ? 'You are in.' : 'You are marked unavailable.',
      life: 3000,
    });
  } catch (e) {
    console.error('Error submitting vote:', e);
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: 'Failed to save your RSVP.',
      life: 3000,
    });
  } finally {
    submitting.value = false;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'locked':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'completed':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-white text-brand-slate border-brand-line';
  }
};

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

const isSessionCompleted = computed(() => session.value?.status === 'completed');
const isMatchOrSettling = computed(
  () => session.value?.status === 'locked' || session.value?.status === 'completed',
);

const getAttendanceStatusClass = (isJoining: boolean) => {
  return isJoining ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600';
};

const getCompletionStatusClass = (value: boolean) => {
  return value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600';
};

const getPresentLabel = (attendance: any) => {
  if (!attendance.isJoining || !isMatchOrSettling.value) {
    return '-';
  }

  return attendance.actualAttended ? 'Present' : 'Absent';
};

const getPaidLabel = (attendance: any) => {
  if (!attendance.isJoining || !isMatchOrSettling.value) {
    return '-';
  }

  return attendance.hasPaid ? 'Paid' : 'Unpaid';
};

const getGuestLabel = (guestCount: number) => {
  return guestCount > 0 ? `+${guestCount}` : '-';
};
</script>

<template>
  <div class="space-y-8 pb-14">
    <div class="bg-shuttlecock" />
    <Toast position="top-right" />

    <section v-if="loading" class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <UIGlassCard class="animate-pulse space-y-4">
        <div class="h-8 w-40 rounded bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
      </UIGlassCard>
      <UIGlassCard class="animate-pulse space-y-4">
        <div class="h-12 rounded-2xl bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
      </UIGlassCard>
    </section>

    <template v-else-if="session">
      <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <UIGlassCard class="space-y-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="section-kicker">Session</p>
              <h1 class="mt-2 text-3xl font-black tracking-tight">{{ session.date }}</h1>
            </div>
            <span
              :class="getStatusColor(session.status)"
              class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
            >
              {{ session.status }}
            </span>
          </div>

          <div class="space-y-3">
            <div
              class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-sm font-medium"
            >
              <Clock3 :size="16" class="text-brand-court" />
              {{ session.time }}
            </div>
            <div
              class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-sm font-medium"
            >
              <MapPin :size="16" class="text-brand-blue" />
              {{ session.location }}
            </div>
          </div>

          <div class="rounded-[24px] border border-brand-line bg-brand-sand px-4 py-4">
            <p class="text-sm font-medium text-brand-slate">{{ attendanceList.length }} responses so far</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div
              class="rounded-[24px] border border-brand-court/15 bg-[linear-gradient(180deg,rgba(47,122,83,0.12),rgba(255,255,255,0.95))] px-4 py-4"
            >
              <div class="flex items-center gap-2 text-brand-court">
                <BadgeDollarSign :size="18" />
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Fee per person</p>
              </div>
              <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">
                {{ formatCurrency(calculatedFeePerPerson) }}
              </p>
              <p class="mt-1 text-sm font-medium text-brand-slate">Based on actual attendees and session costs.</p>
            </div>

            <div class="rounded-[24px] border border-brand-line bg-brand-sand px-4 py-4">
              <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Players counted</p>
              <p class="mt-2 text-3xl font-black tracking-tight text-brand-ink">{{ totalActualPlayers }}</p>
              <p class="mt-1 text-sm font-medium text-brand-slate">Guests are included in the split.</p>
            </div>
          </div>

          <div class="rounded-[24px] border border-brand-line bg-brand-sand px-4 py-4 space-y-2">
            <div class="flex justify-between items-center text-xs font-black uppercase tracking-wider">
              <span class="text-brand-slate">Court Capacity</span>
              <span :class="isSessionFull ? 'text-amber-700 font-bold' : 'text-brand-court'">
                {{ totalJoinedSlots }} / {{ maxCapacity }} slots
              </span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-brand-line/60 overflow-hidden">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="isSessionFull ? 'bg-amber-500' : 'bg-brand-court'"
                :style="{ width: `${Math.min(100, (totalJoinedSlots / maxCapacity) * 100)}%` }"
              />
            </div>
          </div>

          <div
            v-if="myAttendanceRecord?.isJoining"
            class="rounded-[24px] border border-brand-court/30 bg-emerald-50/80 p-4"
          >
            <div class="flex items-center justify-between">
              <p class="text-[11px] font-black uppercase tracking-wider text-brand-court">Your Calculated Share</p>
              <span
                v-if="myAttendanceRecord.actualAttended"
                class="rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800"
              >
                Checked in
              </span>
            </div>
            <p class="mt-1 text-2xl font-black text-brand-ink">
              {{ formatCurrency(calculatedFeePerPerson * (1 + (myAttendanceRecord.guestCount || 0))) }}
            </p>
            <p v-if="myAttendanceRecord.guestCount" class="mt-0.5 text-xs font-medium text-brand-slate">
              Includes you + {{ myAttendanceRecord.guestCount }} {{ myAttendanceRecord.guestCount === 1 ? 'guest' : 'guests' }} ({{ 1 + myAttendanceRecord.guestCount }} slots)
            </p>
          </div>
        </UIGlassCard>

        <div class="space-y-6">
          <UIGlassCard v-if="session.status === 'open'" class="space-y-5">
            <div>
              <p class="section-kicker">RSVP</p>
              <h2 class="mt-2 text-2xl font-black tracking-tight">Let everyone know if you can make it</h2>
            </div>

            <form @submit.prevent="submitVote" class="space-y-4">
              <div
                v-if="authLoading"
                class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-4 text-sm font-medium text-brand-slate"
              >
                <Loader2 class="animate-spin text-brand-court" :size="18" />
                Loading your profile...
              </div>

              <UIGlassInput
                v-else-if="!profile?.displayName"
                v-model="newName"
                label="Your Name"
                placeholder="Enter your name"
                required
              >
                <template #icon><User :size="18" /></template>
              </UIGlassInput>

              <div v-else class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4">
                <p class="text-sm font-medium text-brand-slate">Playing as</p>
                <p class="mt-1 text-lg font-black">{{ profile.displayName }}</p>
              </div>

              <div
                v-if="isSessionFull && !isUserAlreadyJoining"
                class="rounded-[20px] border border-amber-200 bg-amber-50/80 p-3.5 text-xs font-bold text-amber-900"
              >
                This session has reached full capacity ({{ maxCapacity }} slots). You can only RSVP as unavailable.
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <label
                  class="cursor-pointer"
                  :class="{ 'opacity-50 cursor-not-allowed': isSessionFull && !isUserAlreadyJoining }"
                >
                  <input
                    type="radio"
                    v-model="vote.isJoining"
                    :value="true"
                    :disabled="isSessionFull && !isUserAlreadyJoining"
                    class="peer hidden"
                  />
                  <div
                    class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4 text-center font-bold transition-all peer-checked:border-brand-court peer-checked:bg-emerald-50"
                  >
                    {{ isSessionFull && !isUserAlreadyJoining ? 'Session Full' : 'I’m joining' }}
                  </div>
                </label>
                <label class="cursor-pointer">
                  <input type="radio" v-model="vote.isJoining" :value="false" class="peer hidden" />
                  <div
                    class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4 text-center font-bold transition-all peer-checked:border-red-200 peer-checked:bg-red-50"
                  >
                    Can’t make it
                  </div>
                </label>
              </div>

              <UIGlassInput
                v-if="vote.isJoining"
                v-model.number="vote.guestCount"
                label="Guests"
                type="number"
                min="0"
                placeholder="0"
              >
                <template #icon><UsersIcon :size="18" /></template>
              </UIGlassInput>

              <p
                v-if="hasExistingVote"
                class="rounded-[20px] border border-brand-court/15 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-brand-slate"
              >
                You have already responded. You can update your RSVP while the session is still open.
              </p>

              <UIGlassButton type="submit" :disabled="submitting" class="w-full">
                <Loader2 v-if="submitting" class="animate-spin" :size="18" />
                <span v-else>{{ hasExistingVote ? 'Update' : 'Submit' }}</span>
              </UIGlassButton>
            </form>
          </UIGlassCard>

          <UIGlassCard v-else class="space-y-3">
            <p class="section-kicker">RSVP</p>
            <h2 class="text-2xl font-black tracking-tight">This session is closed</h2>
          </UIGlassCard>

          <SessionQRCodeDisplay
            :qr-url="session.paymentQR || null"
            :show-fee-breakdown="session.status === 'completed'"
            :shuttlecock-pack-price="financialBreakdown.shuttlecockPackPrice"
            :shuttlecock-price="financialBreakdown.shuttlecockPrice"
            :shuttlecocks-used="financialBreakdown.shuttlecocksUsed"
            :shuttlecock-cost="financialBreakdown.shuttlecockCost"
            :court-cost="financialBreakdown.courtCost"
            :total-session-cost="financialBreakdown.totalSessionCost"
            :total-actual-players="financialBreakdown.totalActualPlayers"
            :calculated-fee-per-person="calculatedFeePerPerson"
            :bank-info="session.bankInfo || null"
            :session-date="session.date"
            :user-name="profile?.displayName || ''"
          />
        </div>
      </section>

      <section class="space-y-4">
        <div class="court-divider"><span>Players</span></div>

        <UIGlassCard v-if="attendanceList.length" class="!p-0 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-brand-line">
              <thead class="bg-brand-sand/70">
                <tr>
                  <th class="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-brand-slate">
                    Attendee name
                  </th>
                  <th class="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-brand-slate">
                    Status
                  </th>
                  <th class="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-brand-slate">
                    Present
                  </th>
                  <th class="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-brand-slate">
                    Is paid
                  </th>
                  <th class="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-brand-slate">
                    Guest
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-line bg-white/40">
                <tr v-for="att in attendanceList" :key="att.id" class="align-middle">
                  <td class="px-5 py-4">
                    <p class="font-black text-brand-ink">{{ att.name }}</p>
                  </td>
                  <td class="px-5 py-4">
                    <span
                      class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
                      :class="getAttendanceStatusClass(att.isJoining)"
                    >
                      {{ att.isJoining ? 'Joining' : 'Unavailable' }}
                    </span>
                  </td>
                  <td class="px-5 py-4">
                    <span
                      v-if="att.isJoining && isMatchOrSettling"
                      class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
                      :class="getCompletionStatusClass(att.actualAttended)"
                    >
                      {{ getPresentLabel(att) }}
                    </span>
                    <span v-else class="text-sm font-medium text-brand-slate">-</span>
                  </td>
                  <td class="px-5 py-4">
                    <span
                      v-if="att.isJoining && isMatchOrSettling"
                      class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
                      :class="getCompletionStatusClass(att.hasPaid)"
                    >
                      {{ getPaidLabel(att) }}
                    </span>
                    <span v-else class="text-sm font-medium text-brand-slate">-</span>
                  </td>
                  <td class="px-5 py-4 text-sm font-bold text-brand-ink">
                    {{ getGuestLabel(att.guestCount || 0) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UIGlassCard>
      </section>
    </template>
  </div>
</template>
