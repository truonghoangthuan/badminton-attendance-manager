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
  <div class="space-y-8 pb-16 md:space-y-8 md:pb-8">
    <section class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="section-kicker">{{ t('admin.kicker') }}</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">{{ t('admin.sessionsTitle') }}</h1>
      </div>

      <UIGlassButton @click="openCreateModal">
        <template #icon-left>
          <Plus :size="18" />
        </template>
        {{ t('admin.newSessionBtn') }}
      </UIGlassButton>
    </section>

    <div class="md:min-h-0 md:flex-1">
      <section v-if="loading" class="space-y-3">
        <UIGlassCard v-for="i in 5" :key="i" class="animate-pulse !p-3">
          <div class="h-12 w-full rounded bg-slate-100" />
        </UIGlassCard>
      </section>

      <div v-else-if="error">
        <UIGlassCard class="border-red-200 bg-red-50 text-red-700">
          {{ error }}
        </UIGlassCard>
      </div>

      <section v-else>
        <div class="flex flex-col gap-3">
          <UIGlassCard
            v-for="session in sessions"
            :key="session.id"
            hoverable
            class="group !p-3 transition-all duration-200"
          >
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <!-- Info Left Side -->
              <div class="flex flex-1 items-start md:items-center gap-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors border border-slate-100">
                  <Calendar :size="18" />
                </div>
                
                <div class="flex flex-col">
                  <div class="flex items-center gap-2.5">
                    <h3 class="text-base font-bold text-brand-ink leading-none">{{ formatDisplayDate(session.date) }}</h3>
                    <!-- Small indicator dot -->
                    <div class="relative flex h-2 w-2" :title="session.status">
                      <span v-if="session.status === 'open'" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex h-2 w-2 rounded-full" :class="session.status === 'open' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : session.status === 'locked' ? 'bg-amber-500' : 'bg-slate-300'"></span>
                    </div>
                  </div>
                  
                  <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 mt-1.5">
                    <div class="flex items-center gap-1">
                      <Clock3 :size="12" />
                      <span>{{ session.time }}</span>
                    </div>
                    <div class="h-1 w-1 rounded-full bg-slate-300" />
                    <div class="flex items-center gap-1">
                      <MapPin :size="12" />
                      <span class="line-clamp-1 truncate max-w-[140px]">{{ session.location }}</span>
                    </div>
                    <div class="h-1 w-1 rounded-full bg-slate-300" />
                    <div class="flex items-center gap-1">
                      <UsersIcon :size="12" />
                      <span>{{ session.maxPlayers || 8 }}</span>
                    </div>
                  </div>

                  <div
                    v-if="session.courtNumber || session.shuttlecockType || session.level"
                    class="flex flex-wrap items-center gap-1.5 mt-2"
                  >
                    <span v-if="session.courtNumber" class="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      <Grid2x2 :size="10" /> {{ session.courtNumber }}
                    </span>
                    <span v-if="session.shuttlecockType" class="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      <Feather :size="10" /> {{ session.shuttlecockType }}
                    </span>
                    <span v-if="session.level" class="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      <Trophy :size="10" /> {{ session.level }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Actions Right Side -->
              <div class="flex items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4">
                <NuxtLink :to="`/admin/session/${session.id}`">
                  <UIGlassButton class="!px-3 !py-1.5 !text-xs !h-8" variant="secondary">
                    {{ t('admin.openDetails') }}
                  </UIGlassButton>
                </NuxtLink>

                <UIGlassButton
                  variant="ghost"
                  :title="t('admin.copyLink')"
                  class="!h-8 !w-8 !p-0 !min-w-[32px] text-slate-400 hover:text-brand-ink"
                  @click="copySessionLink(session.id)"
                >
                  <Copy :size="14" />
                </UIGlassButton>

                <UIGlassButton
                  variant="ghost"
                  :title="t('admin.editSession')"
                  class="!h-8 !w-8 !p-0 !min-w-[32px] text-slate-400 hover:text-brand-ink"
                  @click="openEditModal(session)"
                >
                  <Clock3 :size="14" />
                </UIGlassButton>

                <UIGlassButton
                  variant="ghost"
                  :title="t('admin.toggleStatus')"
                  class="!h-8 !w-8 !p-0 !min-w-[32px] text-slate-400 hover:text-brand-ink"
                  @click="toggleStatus(session)"
                >
                  <RefreshCcw :size="14" />
                </UIGlassButton>
                
                <button
                  type="button"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 ml-1"
                  :disabled="deletingSessionId === session.id"
                  :aria-label="t('admin.deleteSessionLabel')"
                  @click="deleteSession(session)"
                >
                  <Loader2 v-if="deletingSessionId === session.id" class="animate-spin" :size="14" />
                  <X v-else :size="16" stroke-width="2" />
                </button>
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
