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
        }
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

  submitting.value = true;
  try {
    const uid = user.value.uid;
    const displayName = profile.value?.displayName || newName.value.trim();
    const attendanceRef = doc(db, `sessions/${sessionId}/attendances`, uid);

    await setDoc(attendanceRef, {
      uid,
      name: displayName,
      isJoining: vote.value.isJoining,
      guestCount: vote.value.guestCount,
      actualAttended: vote.value.isJoining,
      hasPaid: false,
      updatedAt: new Date().toISOString(),
    });

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

const getAttendanceStatusClass = (isJoining: boolean) => {
  return isJoining ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600';
};

const getCompletionStatusClass = (value: boolean) => {
  return value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600';
};

const getPresentLabel = (attendance: any) => {
  if (!attendance.isJoining || !isSessionCompleted.value) {
    return '-';
  }

  return attendance.actualAttended ? 'Present' : 'Absent';
};

const getPaidLabel = (attendance: any) => {
  if (!attendance.isJoining || !isSessionCompleted.value) {
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

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="cursor-pointer">
                  <input type="radio" v-model="vote.isJoining" :value="true" class="peer hidden" />
                  <div
                    class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4 text-center font-bold transition-all peer-checked:border-brand-court peer-checked:bg-emerald-50"
                  >
                    I’m joining
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
                      v-if="att.isJoining && isSessionCompleted"
                      class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
                      :class="getCompletionStatusClass(att.actualAttended)"
                    >
                      {{ getPresentLabel(att) }}
                    </span>
                    <span v-else class="text-sm font-medium text-brand-slate">-</span>
                  </td>
                  <td class="px-5 py-4">
                    <span
                      v-if="att.isJoining && isSessionCompleted"
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
