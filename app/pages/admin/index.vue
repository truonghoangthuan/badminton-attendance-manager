<script setup lang="ts">
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { Calendar, ChevronDown, Clock3, Copy, Feather, Grid2x2, Loader2, MapPin, Plus, RefreshCcw, Trophy, Users as UsersIcon, X } from 'lucide-vue-next';
import { useToast } from 'primevue/usetoast';
import { SKILL_LEVEL_OPTIONS } from '~/types/session';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { db } = useFirebase();
const { isAdmin, adminUser } = useAdminAccess();
const confirm = useUIConfirm();
const toast = useToast();
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
        const attSnap = await getDocs(collection(db, `sessions/${session.id}/attendances`));
        await Promise.all(attSnap.docs.map((d) => deleteDoc(d.ref)));
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
</script>

<template>
  <div>
    <header class="text-center mb-12">
      <h1 class="font-newsreader text-[40px] font-normal mb-4 tracking-[-0.02em] text-[#191919]">
        {{ t('admin.sessionsTitle') }}
      </h1>
      <div class="mt-6">
        <UIGlassButton @click="openCreateModal">
          <template #icon-left><Plus :size="16" /></template>
          {{ t('admin.newSessionBtn') }}
        </UIGlassButton>
      </div>
    </header>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="h-64 rounded-xl bg-black/5 animate-pulse"></div>
    </div>

    <div v-else-if="error" class="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-medium">
      {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UIGlassCard v-for="session in sessions" :key="session.id" hoverable class="relative flex flex-col justify-between">
        <div>
          <!-- Status Badge -->
          <div
            class="absolute top-6 right-6 text-[11px] uppercase tracking-[0.05em] font-semibold py-1 px-2.5 rounded-full border"
            :class="
              session.status === 'open'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : session.status === 'locked'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            "
          >
            {{ session.status }}
          </div>

          <div class="font-newsreader text-[28px] font-medium mb-1 text-[#191919]">
            {{ formatDisplayDate(session.date) }}
          </div>
          <div class="text-[14px] text-emerald-700 font-medium mb-6">
            {{ session.time }}
          </div>

          <div class="flex flex-col gap-2 mb-6 text-[14px] text-brand-slate">
            <div>{{ t('admin.locationLabel') }}: <span class="font-semibold text-brand-ink">{{ session.location }}</span></div>
            <div>{{ t('admin.capacityLabel') }}: <span class="font-semibold text-brand-ink">{{ session.maxPlayers || 8 }} {{ t('admin.players') }}</span></div>
            <div v-if="session.level">{{ t('admin.skillLevelLabel') }}: <span class="font-semibold text-brand-ink">{{ session.level }}</span></div>
            <div v-if="session.courtNumber">{{ t('admin.courtNumberLabel') }}: <span class="font-semibold text-brand-ink">{{ session.courtNumber }}</span></div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-4 border-t border-brand-line">
          <NuxtLink :to="`/admin/session/${session.id}`" class="flex-1">
            <UIGlassButton variant="secondary" class="w-full text-[13px] py-1.5">
              {{ t('admin.openDetails') }}
            </UIGlassButton>
          </NuxtLink>
          <UIGlassButton variant="secondary" @click="openEditModal(session)" class="flex-1 text-[13px] py-1.5">
            Edit
          </UIGlassButton>
          <UIGlassButton variant="secondary" @click="toggleStatus(session)" class="!p-2 text-[13px]" :title="t('admin.toggleStatus')">
            <RefreshCcw :size="14" />
          </UIGlassButton>
          <UIGlassButton variant="secondary" @click="copySessionLink(session.id)" class="!p-2 text-[13px]" :title="t('admin.copyLink')">
            <Copy :size="14" />
          </UIGlassButton>
          <UIGlassButton
            variant="ghost"
            @click="deleteSession(session)"
            :disabled="deletingSessionId === session.id"
            :loading="deletingSessionId === session.id"
            class="!p-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <X :size="14" />
          </UIGlassButton>
        </div>
      </UIGlassCard>
    </div>

    <!-- Modal replacement -->
    <UIGlassModal v-model="showCreateForm">
      <template #header>
        <div class="flex flex-col gap-2 text-center">
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">
            {{ isEditing ? t('admin.editModalTitle') : t('admin.createModalTitle') }}
          </h2>
        </div>
      </template>

      <form @submit.prevent="createSession" class="flex flex-col gap-4">
        <div class="flex w-full flex-col gap-2">
          <label class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate px-1">
            {{ t('admin.dateLabel') }}
          </label>
          <div class="relative">
            <div class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate z-10">
              <Calendar :size="18" />
            </div>
            <UIGlassInput v-model="newSession.date" type="date" required class="!pl-12" />
          </div>
        </div>

        <div class="flex w-full flex-col gap-2">
          <label class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate px-1">
            {{ t('admin.timeLabel') }}
          </label>
          <div class="relative group">
            <div class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate z-10">
              <Clock3 :size="18" />
            </div>
            <select
              v-model="newSession.time"
              required
              class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-12 pr-4 text-sm text-brand-ink focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
            >
              <option v-for="time in timeOptions" :key="time" :value="time">{{ time }}</option>
            </select>
          </div>
        </div>

        <UIGlassInput v-model="newSession.location" type="text" :label="t('admin.locationLabel')" required>
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
          <label class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate px-1">
            {{ t('admin.skillLevelLabel') }}
          </label>
          <div class="relative group">
            <div class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate z-10">
              <Trophy :size="18" />
            </div>
            <select
              v-model="newSession.level"
              class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-12 pr-4 text-sm text-brand-ink focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
            >
              <option value="">{{ t('admin.allSkillLevels') }}</option>
              <option v-for="lvl in SKILL_LEVEL_OPTIONS" :key="lvl" :value="lvl">{{ lvl }}</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UIGlassButton type="button" variant="secondary" @click="showCreateForm = false">
            Cancel
          </UIGlassButton>
          <UIGlassButton type="submit" :loading="adding">
            {{ isEditing ? t('admin.saveChangesBtn') : t('admin.createBtn') }}
          </UIGlassButton>
        </div>
      </form>
    </UIGlassModal>
  </div>
</template>
