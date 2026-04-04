<script setup lang="ts">
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Calendar, Clock3, Copy, Loader2, MapPin, Plus, RefreshCcw, Users as UsersIcon, X } from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { db } = useFirebase();
const sessionsRef = collection(db, 'sessions');
const sessions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showCreateForm = ref(false);
const adding = ref(false);
const deletingSessionId = ref<string | null>(null);
const newSession = ref({
  date: new Date().toISOString().split('T')[0],
  time: '18:00',
  location: 'Badminton Court A',
});

onMounted(() => {
  const q = query(sessionsRef, orderBy('date', 'desc'));
  const unsubscribe = onSnapshot(
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
      error.value = 'Failed to fetch sessions.';
      loading.value = false;
    },
  );

  onUnmounted(unsubscribe);
});

const createSession = async () => {
  adding.value = true;
  try {
    await addDoc(sessionsRef, {
      ...newSession.value,
      status: 'open',
      financials: {
        courtCost: 0,
        shuttlecocksUsed: 0,
        shuttlecockPrice: 0,
        calculatedFeePerPerson: 0,
      },
      createdAt: new Date().toISOString(),
    });

    showCreateForm.value = false;
    newSession.value = {
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      location: 'Badminton Court A',
    };
  } catch (e) {
    console.error('Error creating session:', e);
  } finally {
    adding.value = false;
  }
};

const toggleStatus = async (session: any) => {
  const statusOrder: ('open' | 'locked' | 'completed')[] = ['open', 'locked', 'completed'];
  const currentIndex = statusOrder.indexOf(session.status);
  const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

  if (nextStatus === 'completed' && !window.confirm('Mark this session as completed?')) {
    return;
  }

  try {
    const docRef = doc(db, 'sessions', session.id);
    await updateDoc(docRef, { status: nextStatus });
  } catch (e) {
    console.error('Error updating status:', e);
  }
};

const deleteSession = async (session: any) => {
  if (deletingSessionId.value) {
    return;
  }

  const confirmed = window.confirm(
    `Delete the session on ${session.date} at ${session.time}? This removes it from the admin and public session lists.`,
  );

  if (!confirmed) {
    return;
  }

  deletingSessionId.value = session.id;

  try {
    await deleteDoc(doc(db, 'sessions', session.id));
  } catch (e) {
    console.error('Error deleting session:', e);
    error.value = 'Failed to delete session.';
  } finally {
    deletingSessionId.value = null;
  }
};

const copySessionLink = (id: string) => {
  const url = `${window.location.origin}/session/${id}`;
  navigator.clipboard.writeText(url);
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
</script>

<template>
  <div class="space-y-8 pb-16 md:flex md:h-screen md:flex-col md:gap-8 md:space-y-0 md:overflow-hidden md:pb-0">
    <section class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="section-kicker">Admin</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">Sessions</h1>
      </div>

      <UIGlassButton @click="showCreateForm = !showCreateForm">
        <template #icon-left>
          <X v-if="showCreateForm" :size="18" />
          <Plus v-else :size="18" />
        </template>
        {{ showCreateForm ? 'Cancel' : 'New Session' }}
      </UIGlassButton>
    </section>

    <transition name="fade">
      <UIGlassCard v-if="showCreateForm" class="!p-8">
        <form @submit.prevent="createSession" class="grid grid-cols-1 gap-5 md:grid-cols-3">
          <UIGlassInput v-model="newSession.date" type="date" label="Date" required>
            <template #icon><Calendar :size="18" /></template>
          </UIGlassInput>
          <UIGlassInput v-model="newSession.time" type="time" label="Time" required>
            <template #icon><Clock3 :size="18" /></template>
          </UIGlassInput>
          <UIGlassInput
            v-model="newSession.location"
            type="text"
            label="Location"
            placeholder="Badminton Court A"
            required
          >
            <template #icon><MapPin :size="18" /></template>
          </UIGlassInput>

          <div class="md:col-span-3 flex justify-end">
            <UIGlassButton type="submit" :disabled="adding">
              <Loader2 v-if="adding" class="animate-spin" :size="18" />
              <span v-else>Create</span>
            </UIGlassButton>
          </div>
        </form>
      </UIGlassCard>
    </transition>

    <div class="md:min-h-0 md:flex-1 md:overflow-hidden">
      <section v-if="loading" class="space-y-4 md:h-full md:overflow-y-auto md:pr-4">
        <UIGlassCard v-for="i in 3" :key="i" class="animate-pulse">
          <div class="h-10 rounded-2xl bg-brand-sand" />
        </UIGlassCard>
      </section>

      <div v-else-if="error" class="md:h-full md:overflow-y-auto md:pr-4">
        <UIGlassCard class="border-red-200 bg-red-50 text-red-700">
          {{ error }}
        </UIGlassCard>
      </div>

      <section v-else class="md:h-full md:overflow-y-auto md:pr-4">
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <UIGlassCard v-for="session in sessions" :key="session.id" class="relative space-y-5">
            <div class="flex flex-col gap-4">
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
                    <Calendar :size="20" />
                  </div>
                  <div>
                    <p class="text-2xl font-black">{{ session.date }}</p>
                    <p class="text-sm font-medium text-brand-slate">{{ session.time }} · {{ session.location }}</p>
                  </div>

                  <button
                    type="button"
                    class="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="deletingSessionId === session.id"
                    aria-label="Delete session"
                    @click="deleteSession(session)"
                  >
                    <Loader2 v-if="deletingSessionId === session.id" class="animate-spin" :size="14" />
                    <X v-else :size="16" stroke-width="2.5" />
                  </button>
                </div>
                <span
                  :class="getStatusColor(session.status)"
                  class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                >
                  {{ session.status }}
                </span>
              </div>

              <div class="flex flex-wrap gap-3">
                <UIGlassButton variant="secondary" class="!px-4 !py-2 !text-sm" @click="copySessionLink(session.id)">
                  <template #icon-left><Copy :size="14" /></template>
                  Copy Link
                </UIGlassButton>
                <NuxtLink :to="`/admin/session/${session.id}`">
                  <UIGlassButton variant="secondary" class="!px-4 !py-2 !text-sm">
                    <template #icon-left><UsersIcon :size="14" /></template>
                    Open
                  </UIGlassButton>
                </NuxtLink>
                <UIGlassButton variant="ghost" class="!px-4 !py-2 !text-sm" @click="toggleStatus(session)">
                  <template #icon-left><RefreshCcw :size="14" /></template>
                  Status
                </UIGlassButton>
              </div>
            </div>
          </UIGlassCard>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
