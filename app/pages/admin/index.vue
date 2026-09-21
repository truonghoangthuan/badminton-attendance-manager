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
  <div>
    <header class="text-center mb-12">
      <h1 class="font-newsreader text-[40px] font-normal mb-4 tracking-[-0.02em] text-[#191919]">
        {{ t('admin.sessionsTitle') }}
      </h1>
      <div class="mt-6">
        <button type="button" @click="openCreateModal" class="bg-[#CC785C] text-white border-none py-3 px-6 rounded-lg text-[15px] font-medium cursor-pointer transition-transform duration-200 shadow-[0_4px_12px_rgba(204,120,92,0.2)] hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(204,120,92,0.3)]">
          {{ t('admin.newSessionBtn') }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="h-64 rounded-xl bg-black/5 animate-pulse"></div>
    </div>

    <div v-else-if="error" class="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-medium">
      {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="session in sessions" :key="session.id" class="bg-white border border-[#E8E3DA] rounded-xl p-6 transition-all duration-200 relative hover:border-[#D5CFC4] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <!-- Status Badge -->
        <div class="absolute top-6 right-6 text-[11px] uppercase tracking-[0.05em] font-semibold py-1 px-2 rounded" 
             :class="session.status === 'open' ? 'bg-[#E8F5E9] text-[#2E7D32]' : session.status === 'locked' ? 'bg-[#FFF3E0] text-[#EF6C00]' : 'bg-gray-100 text-gray-600'">
          {{ session.status }}
        </div>

        <div class="font-newsreader text-[28px] font-medium mb-1 text-[#191919]">
          {{ formatDisplayDate(session.date) }}
        </div>
        <div class="text-[14px] text-[#CC785C] font-medium mb-6">
          {{ session.time }}
        </div>

        <div class="flex flex-col gap-2 mb-6 text-[14px] text-[#666666]">
          <div>Location: <span class="text-[#191919]">{{ session.location }}</span></div>
          <div>Capacity: <span class="text-[#191919]">{{ session.maxPlayers || 8 }} {{ t('admin.players') }}</span></div>
          <div v-if="session.level">Level: <span class="text-[#191919]">{{ session.level }}</span></div>
          <div v-if="session.courtNumber">Court: <span class="text-[#191919]">{{ session.courtNumber }}</span></div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-4 border-t border-[#E8E3DA]">
          <NuxtLink :to="`/admin/session/${session.id}`" class="flex-1 text-center bg-[#F5F0E8] border border-[#E8E3DA] text-[#191919] py-2 rounded-md text-[13px] font-medium transition-colors hover:bg-[#EBE5DB]">
            {{ t('admin.openDetails') }}
          </NuxtLink>
          <button type="button" @click="openEditModal(session)" class="flex-1 bg-[#F5F0E8] border border-[#E8E3DA] text-[#191919] py-2 rounded-md text-[13px] font-medium transition-colors hover:bg-[#EBE5DB]">
            Edit
          </button>
          <button type="button" @click="toggleStatus(session)" class="w-10 flex items-center justify-center bg-[#F5F0E8] border border-[#E8E3DA] text-[#191919] py-2 rounded-md text-[13px] transition-colors hover:bg-[#EBE5DB]" :title="t('admin.toggleStatus')">
            <RefreshCcw :size="14" />
          </button>
          <button type="button" @click="copySessionLink(session.id)" class="w-10 flex items-center justify-center bg-[#F5F0E8] border border-[#E8E3DA] text-[#191919] py-2 rounded-md text-[13px] transition-colors hover:bg-[#EBE5DB]" :title="t('admin.copyLink')">
            <Copy :size="14" />
          </button>
          <button type="button" @click="deleteSession(session)" :disabled="deletingSessionId === session.id" class="w-10 flex items-center justify-center bg-rose-50 border border-rose-100 text-rose-600 py-2 rounded-md text-[13px] transition-colors hover:bg-rose-100 disabled:opacity-50">
            <Loader2 v-if="deletingSessionId === session.id" class="animate-spin" :size="14" />
            <X v-else :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal replacement -->
    <div v-if="showCreateForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191919]/20 backdrop-blur-sm">
      <div class="bg-[#F5F0E8] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-[#E8E3DA]">
        <div class="p-6 border-b border-[#E8E3DA]">
          <h2 class="font-newsreader text-2xl text-[#191919]">
            {{ isEditing ? t('admin.editModalTitle') : t('admin.createModalTitle') }}
          </h2>
        </div>
        
        <form @submit.prevent="createSession" class="p-6 flex flex-col gap-4 bg-white">
          <div class="flex flex-col gap-1">
            <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.dateLabel') }}</label>
            <input type="date" v-model="newSession.date" required class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]" />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.timeLabel') }}</label>
            <select v-model="newSession.time" required class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]">
              <option v-for="time in timeOptions" :key="time" :value="time">{{ time }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.locationLabel') }}</label>
            <input type="text" v-model="newSession.location" required class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]" />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.capacityLabel') }}</label>
            <input type="number" v-model.number="newSession.maxPlayers" required min="2" class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.courtNumberLabel') }}</label>
              <input type="text" v-model="newSession.courtNumber" class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.shuttlecockLabel') }}</label>
              <input type="text" v-model="newSession.shuttlecockType" class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]" />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-[12px] font-semibold text-[#666666]">{{ t('admin.skillLevelLabel') }}</label>
            <select v-model="newSession.level" class="w-full border border-[#E8E3DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]">
              <option value="">{{ t('admin.allSkillLevels') }}</option>
              <option v-for="lvl in SKILL_LEVEL_OPTIONS" :key="lvl" :value="lvl">{{ lvl }}</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 mt-4">
            <button type="button" @click="showCreateForm = false" class="px-4 py-2 text-sm font-medium text-[#666666] hover:text-[#191919]">
              Cancel
            </button>
            <button type="submit" :disabled="adding" class="bg-[#CC785C] text-white border-none py-2 px-6 rounded-md text-sm font-medium cursor-pointer transition-transform duration-200 hover:bg-[#b8674d] disabled:opacity-50">
              <Loader2 v-if="adding" class="animate-spin" :size="16" />
              <span v-else>{{ isEditing ? t('admin.saveChangesBtn') : t('admin.createBtn') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

