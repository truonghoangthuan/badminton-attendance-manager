<script setup lang="ts">
import { Home, LayoutDashboard, Loader2, PencilLine } from 'lucide-vue-next';
import { useAdminAccess } from '../composables/useAdminAccess';

const { profile, loading, setProfile } = useUserProfile();
const { isAdmin, claimsLoading } = useAdminAccess();
const toast = useToast();
const welcomeInitial = computed(() => profile.value?.displayName?.trim()?.charAt(0)?.toUpperCase() || '?');
const welcomeMessage = computed(() => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning!';
  }

  if (hour < 18) {
    return 'Good afternoon!';
  }

  return 'Good evening!';
});

const isEditNameOpen = ref(false);
const editedName = ref('');
const savingName = ref(false);
const editNameError = ref('');

watch(
  () => profile.value?.displayName,
  (displayName) => {
    if (!isEditNameOpen.value) {
      editedName.value = displayName || '';
    }
  },
  { immediate: true },
);

const openEditNameModal = () => {
  editedName.value = profile.value?.displayName || '';
  editNameError.value = '';
  isEditNameOpen.value = true;
};

const closeEditNameModal = () => {
  if (savingName.value) {
    return;
  }

  isEditNameOpen.value = false;
  editNameError.value = '';
};

const handleNameUpdate = async () => {
  const trimmedName = editedName.value.trim();

  if (!trimmedName) {
    editNameError.value = 'Please enter a name';
    return;
  }

  if (trimmedName.length < 2) {
    editNameError.value = 'Name is too short';
    return;
  }

  if (trimmedName === profile.value?.displayName) {
    closeEditNameModal();
    return;
  }

  savingName.value = true;
  editNameError.value = '';

  try {
    const success = await setProfile(trimmedName);

    if (!success) {
      editNameError.value = 'Failed to save name. Please try again.';
      return;
    }

    isEditNameOpen.value = false;
    editNameError.value = '';
    toast.add({
      severity: 'success',
      summary: 'Name updated',
      detail: 'Your display name was changed successfully.',
      life: 3000,
    });
  } catch {
    editNameError.value = 'An unexpected error occurred.';
  } finally {
    savingName.value = false;
  }
};
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden">
    <Toast position="top-right" />

    <div class="bg-mesh" />
    <div class="mesh-glow top-[-10%] left-[-10%] animate-pulse-slow" />
    <div class="mesh-glow bottom-[-10%] right-[-10%] animate-pulse-slow" style="animation-delay: -4s" />

    <nav class="sticky top-0 z-50 w-full px-4 py-4 md:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="glass-shell flex items-center justify-between gap-3 px-4 py-4 md:px-6">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line bg-brand-court text-xl text-white transition-transform group-hover:scale-105"
            >
              🏸
            </div>
            <div>
              <p class="section-kicker">Gravity Team</p>
              <span class="text-xl font-black tracking-tight text-brand-ink"
                >Gravity <span class="text-brand-court">Badminton</span></span
              >
            </div>
          </NuxtLink>
          <div v-if="!loading && profile?.displayName" class="hidden min-w-0 flex-1 justify-center lg:flex">
            <div
              class="flex min-w-0 max-w-[440px] items-center gap-3 rounded-full border border-white/70 bg-white/65 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-court text-sm font-black text-white"
              >
                {{ welcomeInitial }}
              </div>
              <div class="min-w-0">
                <p class="text-[8px] font-black uppercase tracking-[0.24em] text-brand-slate/70">Welcome back</p>
                <div class="flex min-w-0 items-baseline gap-2">
                  <p class="truncate text-sm font-black tracking-tight text-brand-ink">
                    {{ profile.displayName }}
                  </p>
                  <p class="truncate text-xs font-medium text-brand-slate/80">
                    {{ welcomeMessage }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-line bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-brand-slate transition-colors hover:border-brand-court hover:text-brand-court"
                @click="openEditNameModal"
              >
                <PencilLine :size="14" />
                Edit
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2 md:gap-3">
            <button
              v-if="!loading && profile?.displayName"
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line bg-white/80 text-brand-slate transition-colors hover:border-brand-court hover:text-brand-court lg:hidden"
              aria-label="Change display name"
              @click="openEditNameModal"
            >
              <PencilLine :size="18" />
            </button>
            <NuxtLink
              to="/"
              class="hidden items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink md:flex"
            >
              <Home :size="18" />
              Home
            </NuxtLink>
            <NuxtLink v-if="!claimsLoading && isAdmin" to="/admin" class="flex items-center">
              <UIGlassButton variant="secondary" class="!px-3 md:!px-4 !py-2 !text-sm">
                <template #icon-left><LayoutDashboard :size="16" /></template>
                <span class="hidden sm:inline">Dashboard</span>
              </UIGlassButton>
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <UsernamePrompt />

    <UIGlassModal :modelValue="isEditNameOpen" @update:modelValue="closeEditNameModal">
      <template #header>
        <div class="flex flex-col items-center gap-4 text-center">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-line bg-brand-sand text-3xl"
          >
            {{ welcomeInitial }}
          </div>
          <div>
            <h2 class="text-2xl font-black tracking-tight text-brand-ink">Update your display name</h2>
            <p class="mt-1 text-sm font-medium text-brand-slate">
              This changes how your name appears the next time you join a session.
            </p>
          </div>
        </div>
      </template>

      <form class="space-y-6" @submit.prevent="handleNameUpdate">
        <div class="space-y-2">
          <UIGlassInput
            v-model="editedName"
            label="Display Name"
            placeholder="e.g. John Doe"
            :disabled="savingName"
            required
            autofocus
            maxlength="255"
          />
          <p v-if="editNameError" class="ml-2 text-xs font-medium text-red-500">
            {{ editNameError }}
          </p>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-2xl border border-brand-line px-4 py-3 text-sm font-bold text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink"
            :disabled="savingName"
            @click="closeEditNameModal"
          >
            Cancel
          </button>
          <UIGlassButton
            type="submit"
            class="sm:min-w-[180px] !py-3"
            :loading="savingName"
            :disabled="!editedName.trim() || savingName"
          >
            <template #icon-left>
              <Loader2 v-if="savingName" :size="16" class="animate-spin" />
              <PencilLine v-else :size="16" />
            </template>
            Save Name
          </UIGlassButton>
        </div>
      </form>
    </UIGlassModal>

    <main class="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <slot />
    </main>

    <footer class="relative z-10 mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div class="glass-shell flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center">
        <div>
          <p class="section-kicker">Club Footer</p>
          <p class="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-slate">
            &copy; 2026 Badminton Attendance Manager
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="score-chip">Court Ready</span>
          <span class="score-chip">Player Friendly</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.router-link-active {
  @apply text-brand-ink !important;
}
</style>
