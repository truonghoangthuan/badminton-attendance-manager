<script setup lang="ts">
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Calendar, ChevronDown, Clock3, Copy, Feather, Grid2x2, Loader2, MapPin, Plus, RefreshCcw, Trophy, Users as UsersIcon, X } from 'lucide-vue-next';
import { SKILL_LEVEL_OPTIONS } from '~/types/session';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { db } = useFirebase();
const { isAdmin, adminUser } = useAdminAccess();
const confirm = useUIConfirm();
const { t } = useI18n();
const sessionsRef = collection(db, 'sessions');
const sessions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showCreateForm = ref(false);
const adding = ref(false);
const deletingSessionId = ref<string | null>(null);
const isEditing = ref(false);
const editingSessionId = ref<string | null>(null);
const dateInputRef = ref<HTMLInputElement | null>(null);
const newSession = ref({
  date: new Date().toISOString().split('T')[0],
  time: '19:00',
  location: 'Sân cầu lông Quang Sport',
  maxPlayers: 8,
  courtNumber: '',
  shuttlecockType: '',
  level: '',
});
const timeOptions = Array.from({ length: 24 * 12 }, (_, index) => {
  const hours = `${Math.floor(index / 12)}`.padStart(2, '0');
  const minutes = `${(index % 12) * 5}`.padStart(2, '0');

  return `${hours}:${minutes}`;
});

const openDatePicker = () => {
  const input = dateInputRef.value;

  if (!input) {
    return;
  }

  input.focus();

  if (typeof input.showPicker === 'function') {
    input.showPicker();
  }
};

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
      error.value = t('admin.fetchError');
      loading.value = false;
    },
  );

  onUnmounted(unsubscribe);
});

const createSession = async () => {
  adding.value = true;
  try {
    const sessionPayload = {
      ...newSession.value,
      maxPlayers: Number(newSession.value.maxPlayers) || 8,
    };

    if (isEditing.value && editingSessionId.value) {
      const docRef = doc(db, 'sessions', editingSessionId.value);
      await updateDoc(docRef, sessionPayload);
    } else {
      await addDoc(sessionsRef, {
        ...sessionPayload,
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
    time: '19:00',
    location: 'Sân cầu lông Quang Sport',
    maxPlayers: 8,
    courtNumber: '',
    shuttlecockType: '',
    level: '',
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
    maxPlayers: session.maxPlayers || 8,
    courtNumber: session.courtNumber || '',
    shuttlecockType: session.shuttlecockType || '',
    level: session.level || '',
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

  if (session.status === 'completed') {
    confirm.require({
      message: t('admin.reopenConfirmMessage', { status: nextStatus }),
      header: t('admin.reopenConfirmHeader'),
      rejectLabel: t('admin.cancel'),
      acceptLabel: t('admin.reopen'),
      accept: updateStatus,
    });
    return;
  }

  if (nextStatus === 'completed') {
    confirm.require({
      message: t('admin.completeConfirmMessage'),
      header: t('admin.completeConfirmHeader'),
      rejectLabel: t('admin.cancel'),
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
    rejectLabel: t('admin.cancel'),
    acceptLabel: t('admin.delete'),
    accept: async () => {
      deletingSessionId.value = session.id;

      try {
        await deleteDoc(doc(db, 'sessions', session.id));
      } catch (e) {
        console.error('Error deleting session:', e);
        error.value = t('admin.deleteError');
      } finally {
        deletingSessionId.value = null;
      }
    },
  });
};

const copySessionLink = (id: string) => {
  const url = `${window.location.origin}/session/${id}`;
  navigator.clipboard.writeText(url);
};

// Status color is replaced by small indicator dots directly in template
</script>

<template>
  <div class="space-y-10 pb-16 md:pb-8">
    <!-- Header -->
    <section class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-2">{{ t('admin.kicker') }}</p>
        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">{{ t('admin.sessionsTitle') }}</h1>
      </div>

      <button type="button" @click="openCreateModal" class="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0">
        <Plus class="mr-2" :size="20" stroke-width="2.5" />
        {{ t('admin.newSessionBtn') }}
      </button>
    </section>

    <!-- Content -->
    <div class="min-h-0 flex-1">
      <section v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="h-64 rounded-3xl bg-white/40 border border-white/60 animate-pulse"></div>
      </section>

      <div v-else-if="error">
        <div class="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 font-medium shadow-sm">
          {{ error }}
        </div>
      </div>

      <section v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="bg-white/60 backdrop-blur-xl border border-white/80 shadow-sm rounded-3xl p-6 relative group hover:bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col"
          >
            <!-- Status Dot -->
            <div class="absolute top-6 right-6">
              <div class="relative flex h-3 w-3" :title="session.status">
                <span v-if="session.status === 'open'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3" :class="session.status === 'open' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : session.status === 'locked' ? 'bg-amber-500' : 'bg-slate-300'"></span>
              </div>
            </div>

            <!-- Date & Time -->
            <div class="mb-6">
              <div class="text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">
                {{ formatDisplayDate(session.date) }}
              </div>
              <div class="text-emerald-500 font-bold text-lg flex items-center gap-1.5">
                <Clock3 :size="18" stroke-width="2.5" />
                {{ session.time }}
              </div>
            </div>
            
            <!-- Details -->
            <div class="space-y-3 mb-6 flex-1">
              <div class="flex items-start text-slate-600 text-sm font-medium">
                <MapPin class="w-4 h-4 mr-3 mt-0.5 text-slate-400 shrink-0" stroke-width="2.5" />
                <span class="line-clamp-2 leading-tight">{{ session.location }}</span>
              </div>
              <div class="flex items-center text-slate-600 text-sm font-medium">
                <UsersIcon class="w-4 h-4 mr-3 text-slate-400 shrink-0" stroke-width="2.5" />
                <span>{{ session.maxPlayers || 8 }} {{ t('admin.players') }}</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2 mb-6" v-if="session.courtNumber || session.level || session.shuttlecockType">
              <span v-if="session.courtNumber" class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 tracking-wide uppercase flex items-center gap-1">
                <Grid2x2 :size="12" /> {{ session.courtNumber }}
              </span>
              <span v-if="session.shuttlecockType" class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 tracking-wide uppercase flex items-center gap-1">
                <Feather :size="12" /> {{ session.shuttlecockType }}
              </span>
              <span v-if="session.level" class="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700 tracking-wide uppercase flex items-center gap-1">
                <Trophy :size="12" /> {{ session.level }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2 mb-6" v-else>
              <div class="h-7"></div> <!-- Spacer if no tags -->
            </div>

            <!-- Actions Footer -->
            <div class="flex gap-2 pt-4 border-t border-slate-200/60 mt-auto">
              <NuxtLink :to="`/admin/session/${session.id}`" class="flex-1 bg-slate-100/80 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center border border-slate-200/50">
                {{ t('admin.openDetails') }}
              </NuxtLink>
              
              <button type="button" @click="copySessionLink(session.id)" :title="t('admin.copyLink')" :aria-label="t('admin.copyLink')" class="w-[42px] h-[42px] bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center transition-colors shrink-0 border border-slate-200/50">
                <Copy :size="16" stroke-width="2.5" />
              </button>

              <button type="button" @click="openEditModal(session)" :title="t('admin.editSession')" :aria-label="t('admin.editSession')" class="w-[42px] h-[42px] bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center transition-colors shrink-0 border border-slate-200/50">
                <Clock3 :size="16" stroke-width="2.5" />
              </button>

              <button type="button" @click="toggleStatus(session)" :title="t('admin.toggleStatus')" :aria-label="t('admin.toggleStatus')" class="w-[42px] h-[42px] bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center transition-colors shrink-0 border border-slate-200/50">
                <RefreshCcw :size="16" stroke-width="2.5" />
              </button>
              
              <button type="button" @click="deleteSession(session)" :disabled="deletingSessionId === session.id" :title="t('admin.deleteSessionLabel')" :aria-label="t('admin.deleteSessionLabel')" class="w-[42px] h-[42px] bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors shrink-0 border border-rose-100 disabled:opacity-50">
                <Loader2 v-if="deletingSessionId === session.id" class="animate-spin" :size="16" />
                <X v-else :size="18" stroke-width="2.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <UIGlassModal v-model="showCreateForm">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">{{ t('admin.setupKicker') }}</p>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">
            {{ isEditing ? t('admin.editModalTitle') : t('admin.createModalTitle') }}
          </h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            {{
              isEditing
                ? t('admin.editModalDesc')
                : t('admin.createModalDesc')
            }}
          </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="createSession" class="flex flex-col gap-5">
      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"> {{ t('admin.dateLabel') }} </label>
        <div class="group relative" @click="openDatePicker">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
            <Calendar :size="18" />
          </div>
          <div class="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate/80 transition-colors group-focus-within:text-brand-court">
            <ChevronDown :size="18" />
          </div>
          <input
            ref="dateInputRef"
            v-model="newSession.date"
            type="date"
            class="date-input w-full appearance-none rounded-2xl border border-brand-line bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,240,0.96))] py-4 pl-12 pr-12 text-base font-bold tracking-[0.02em] text-brand-ink shadow-[0_18px_40px_-32px_rgba(35,55,34,0.34)] transition-all outline-none hover:border-brand-court/30 hover:shadow-[0_20px_42px_-30px_rgba(56,126,88,0.26)] focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
            required
          />
        </div>
      </div>
      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate"> {{ t('admin.timeLabel') }} </label>
        <div class="group relative">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
            <Clock3 :size="18" />
          </div>
          <div class="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate/80 transition-colors group-focus-within:text-brand-court">
            <ChevronDown :size="18" />
          </div>
          <select
            v-model="newSession.time"
            required
            class="w-full appearance-none rounded-2xl border border-brand-line bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,240,0.96))] py-4 pl-12 pr-12 text-base font-bold tracking-[0.02em] text-brand-ink shadow-[0_18px_40px_-32px_rgba(35,55,34,0.34)] transition-all outline-none hover:border-brand-court/30 hover:shadow-[0_20px_42px_-30px_rgba(56,126,88,0.26)] focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
          >
            <option v-for="time in timeOptions" :key="time" :value="time">
              {{ time }}
            </option>
          </select>
        </div>
      </div>
      <UIGlassInput
        v-model="newSession.location"
        type="text"
        :label="t('admin.locationLabel')"
        :placeholder="t('admin.locationPlaceholder')"
        required
      >
        <template #icon><MapPin :size="18" /></template>
      </UIGlassInput>

      <UIGlassInput
        v-model.number="newSession.maxPlayers"
        type="number"
        min="2"
        max="50"
        :label="t('admin.capacityLabel')"
        placeholder="8"
        required
      >
        <template #icon><UsersIcon :size="18" /></template>
      </UIGlassInput>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UIGlassInput
          v-model="newSession.courtNumber"
          type="text"
          :label="t('admin.courtNumberLabel')"
          :placeholder="t('admin.courtNumberPlaceholder')"
        >
          <template #icon><Grid2x2 :size="18" /></template>
        </UIGlassInput>

        <UIGlassInput
          v-model="newSession.shuttlecockType"
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
            v-model="newSession.level"
            class="w-full appearance-none rounded-2xl border border-brand-line bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,240,0.96))] py-4 pl-12 pr-12 text-base font-bold tracking-[0.02em] text-brand-ink shadow-[0_18px_40px_-32px_rgba(35,55,34,0.34)] transition-all outline-none hover:border-brand-court/30 hover:shadow-[0_20px_42px_-30px_rgba(56,126,88,0.26)] focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
          >
            <option value="">{{ t('admin.allSkillLevels') }}</option>
            <option v-for="lvl in SKILL_LEVEL_OPTIONS" :key="lvl" :value="lvl">
              {{ lvl }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex justify-end md:col-span-3">
        <UIGlassButton type="submit" :disabled="adding">
          <Loader2 v-if="adding" class="animate-spin" :size="18" />
          <span v-else>{{ isEditing ? t('admin.saveChangesBtn') : t('admin.createBtn') }}</span>
        </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>
</template>

<style scoped>
.date-input::-webkit-date-and-time-value {
  text-align: left;
}

.date-input::-webkit-datetime-edit {
  padding-left: 0.25rem;
}

.date-input::-webkit-calendar-picker-indicator {
  opacity: 0;
  cursor: pointer;
}
</style>
