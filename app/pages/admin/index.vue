<script setup lang="ts">
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Calendar, Clock3, Copy, Loader2, MapPin, Plus, RefreshCcw, Users as UsersIcon, X } from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { db } = useFirebase();
const { isAdmin, adminUser } = useAdminAccess();
const confirm = useUIConfirm();
const sessionsRef = collection(db, 'sessions');
const sessions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showCreateForm = ref(false);
const adding = ref(false);
const deletingSessionId = ref<string | null>(null);
const isEditing = ref(false);
const editingSessionId = ref<string | null>(null);
const newSession = ref({
  date: new Date().toISOString().split('T')[0],
  time: '19:00',
  location: 'Sân cầu lông Quang Sport',
});

const formatSessionDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseSessionDate = (value: string) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const selectedSessionDate = computed<Date | null>({
  get: () => parseSessionDate(newSession.value.date),
  set: (value) => {
    newSession.value.date = value ? formatSessionDate(value) : '';
  },
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
    if (isEditing.value && editingSessionId.value) {
      const docRef = doc(db, 'sessions', editingSessionId.value);
      await updateDoc(docRef, { ...newSession.value });
    } else {
      await addDoc(sessionsRef, {
        ...newSession.value,
        status: 'open',
        financials: {
          courtCost: 0,
          shuttlecocksUsed: 0,
          shuttlecockPrice: 0,
          calculatedFeePerPerson: 0,
        },
        createdBy: adminUser.value?.uid,
        createdAt: new Date().toISOString(),
      });
    }

    showCreateForm.value = false;
    resetForm();
  } catch (e) {
    console.error('Error saving session:', e);
  } finally {
    adding.value = false;
  }
};

const resetForm = () => {
  isEditing.value = false;
  editingSessionId.value = null;
  newSession.value = {
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: 'Badminton Court A',
  };
};

const openCreateModal = () => {
  resetForm();
  showCreateForm.value = true;
};

const openEditModal = (session: any) => {
  isEditing.value = true;
  editingSessionId.value = session.id;
  newSession.value = {
    date: session.date,
    time: session.time,
    location: session.location,
  };
  showCreateForm.value = true;
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
    }
  };

  if (nextStatus === 'completed') {
    confirm.require({
      message: 'Mark this session as completed?',
      header: 'Complete Session',
      rejectLabel: 'Cancel',
      acceptLabel: 'Complete',
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
    message: `Delete the session on ${session.date} at ${session.time}? This removes it from the admin and public session lists.`,
    header: 'Delete Session',
    severity: 'danger',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    accept: async () => {
      deletingSessionId.value = session.id;

      try {
        await deleteDoc(doc(db, 'sessions', session.id));
      } catch (e) {
        console.error('Error deleting session:', e);
        error.value = 'Failed to delete session.';
      } finally {
        deletingSessionId.value = null;
      }
    }
  });
};

const copySessionLink = (id: string) => {
  const url = `${window.location.origin}/session/${id}`;
  navigator.clipboard.writeText(url);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-4 ring-emerald-500/5';
    case 'locked':
      return 'bg-amber-50 text-amber-700 border-amber-100 ring-4 ring-amber-500/5';
    case 'completed':
      return 'bg-slate-50 text-slate-600 border-slate-100 ring-4 ring-slate-500/5';
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

      <UIGlassButton @click="openCreateModal">
        <template #icon-left>
          <Plus :size="18" />
        </template>
        New Session
      </UIGlassButton>
    </section>

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
          <UIGlassCard v-for="session in sessions" :key="session.id" hoverable class="group transition-all duration-300">
            <div class="flex flex-col gap-6">
              <!-- Card Header -->
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-4">
                  <!-- Date Icon Box -->
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-brand-sand text-brand-court ring-1 ring-brand-line shadow-sm">
                    <Calendar :size="24" />
                  </div>
                  
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h3 class="text-2xl font-black tracking-tight text-brand-ink">{{ session.date }}</h3>
                      <span
                        :class="getStatusColor(session.status)"
                        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      >
                        <span class="h-1 w-1 rounded-full bg-current"></span>
                        {{ session.status }}
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-brand-slate">
                      <div class="flex items-center gap-1.5">
                        <Clock3 :size="14" class="opacity-70" />
                        <span>{{ session.time }}</span>
                      </div>
                      <div class="hidden h-1 w-1 rounded-full bg-brand-line md:block" />
                      <div class="flex items-center gap-1.5">
                        <MapPin :size="14" class="opacity-70" />
                        <span class="line-clamp-1 truncate max-w-[150px]">{{ session.location }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-brand-slate opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="deletingSessionId === session.id"
                  aria-label="Delete session"
                  @click="deleteSession(session)"
                >
                  <Loader2 v-if="deletingSessionId === session.id" class="animate-spin" :size="14" />
                  <X v-else :size="18" stroke-width="2.5" />
                </button>
              </div>

              <!-- Divider -->
              <div class="h-px w-full bg-gradient-to-r from-brand-line/50 via-brand-line to-brand-line/50" />

              <!-- Actions -->
              <div class="flex flex-wrap items-center gap-3">
                <NuxtLink :to="`/admin/session/${session.id}`" class="flex-1">
                  <UIGlassButton class="!w-full !px-4 !py-2.5 !text-sm">
                    <template #icon-left><UsersIcon :size="14" /></template>
                    Open Details
                  </UIGlassButton>
                </NuxtLink>
                
                <div class="flex items-center gap-2">
                  <UIGlassButton 
                    variant="secondary" 
                    title="Copy Link"
                    class="!h-10 !w-10 !p-0 !min-w-[40px]" 
                    @click="copySessionLink(session.id)"
                  >
                    <Copy :size="14" />
                  </UIGlassButton>

                  <UIGlassButton 
                    variant="ghost" 
                    title="Edit Session"
                    class="!h-10 !w-10 !p-0 !min-w-[40px]" 
                    @click="openEditModal(session)"
                  >
                    <Clock3 :size="14" />
                  </UIGlassButton>

                  <UIGlassButton 
                    variant="ghost" 
                    title="Toggle Status"
                    class="!h-10 !w-10 !p-0 !min-w-[40px]" 
                    @click="toggleStatus(session)"
                  >
                    <RefreshCcw :size="14" />
                  </UIGlassButton>
                </div>
              </div>
            </div>
          </UIGlassCard>
        </div>
      </section>
    </div>
  </div>

  <UIGlassModal v-model="showCreateForm">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">Session Setup</p>
        <div>
        <h2 class="text-2xl font-black tracking-tight text-brand-ink">
          {{ isEditing ? 'Edit Session' : 'Create a New Session' }}
        </h2>
        <p class="mt-1 text-sm font-medium text-brand-slate">
          {{ isEditing ? 'Update the session details below.' : 'Add the date, time, and location to open attendance for players.' }}
        </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="createSession" class="flex flex-col gap-5">
      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
          Date
        </label>
        <div class="relative">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate">
            <Calendar :size="18" />
          </div>
          <DatePicker
            v-model="selectedSessionDate"
            dateFormat="yy-mm-dd"
            :manualInput="false"
            class="w-full"
            inputClass="w-full rounded-2xl border border-brand-line bg-[#fcfcf9] py-4 pl-12 pr-4 text-brand-ink placeholder:text-brand-slate/70 focus:border-brand-court focus:ring-4 focus:ring-brand-court/10 transition-all outline-none"
            required
          />
        </div>
      </div>
      <UIGlassInput v-model="newSession.time" type="time" label="Time" required>
        <template #icon><Clock3 :size="18" /></template>
      </UIGlassInput>
      <UIGlassInput v-model="newSession.location" type="text" label="Location" placeholder="Badminton Court A" required>
        <template #icon><MapPin :size="18" /></template>
      </UIGlassInput>

      <div class="flex justify-end md:col-span-3">
        <UIGlassButton type="submit" :disabled="adding">
          <Loader2 v-if="adding" class="animate-spin" :size="18" />
          <span v-else>{{ isEditing ? 'Save Changes' : 'Create' }}</span>
        </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>
</template>
