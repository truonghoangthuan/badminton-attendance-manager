<script setup lang="ts">
import { signOut } from 'firebase/auth';
import { Home, LayoutDashboard, LogOut, Menu, X } from 'lucide-vue-next';

const { auth } = useFirebase();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const isMobileMenuOpen = ref(false);

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);

const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push('/admin/login');
  } catch (e) {
    console.error('Logout failed', e);
  }
};
</script>

<template>
  <div class="relative min-h-screen">
    <div class="bg-mesh" />
    <nav class="sticky top-0 z-50 w-full px-4 py-4 md:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="glass-shell flex items-center justify-between gap-3 px-4 py-3.5 md:px-6">
          <NuxtLink to="/admin" class="group flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-line bg-brand-court transition-transform group-hover:scale-105">
              <img src="/favicon.svg" alt="Gravity Badminton" class="h-6 w-6" />
            </div>
            <div>
              <p class="section-kicker">{{ t('admin.kicker') }}</p>
              <span class="text-lg font-black tracking-tight text-brand-ink">
                {{ t('admin.panelTitle') }}
              </span>
            </div>
          </NuxtLink>

          <div class="hidden items-center gap-3 md:flex">
            <NuxtLink
              to="/admin"
              class="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold transition-colors"
              :class="route.path === '/admin' ? 'bg-brand-sand text-brand-ink' : 'text-brand-slate hover:bg-brand-sand hover:text-brand-ink'"
            >
              <LayoutDashboard :size="16" />
              {{ t('nav.dashboard') }}
            </NuxtLink>
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink"
            >
              <Home :size="16" />
              {{ t('nav.backToSite') }}
            </NuxtLink>
            <UILanguageSwitcher />
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-2xl border border-brand-line bg-white/80 px-3.5 py-2 text-sm font-bold text-brand-slate transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              @click="handleLogout"
            >
              <LogOut :size="16" />
              {{ t('nav.logout') }}
            </button>
          </div>

          <div class="flex items-center gap-2 md:hidden">
            <UILanguageSwitcher />
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-line bg-white/80 text-brand-slate"
              @click="isMobileMenuOpen = !isMobileMenuOpen"
            >
              <Menu v-if="!isMobileMenuOpen" :size="20" />
              <X v-else :size="20" />
            </button>
          </div>
        </div>

        <div v-if="isMobileMenuOpen" class="mt-2 rounded-2xl border border-brand-line bg-white p-3 shadow-lg md:hidden">
          <nav class="flex flex-col gap-1">
            <NuxtLink
              to="/admin"
              class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold"
              :class="route.path === '/admin' ? 'bg-brand-sand text-brand-ink' : 'text-brand-slate'"
            >
              <LayoutDashboard :size="16" />
              {{ t('nav.dashboard') }}
            </NuxtLink>
            <NuxtLink to="/" class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-brand-slate">
              <Home :size="16" />
              {{ t('nav.backToSite') }}
            </NuxtLink>
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
              @click="handleLogout"
            >
              <LogOut :size="16" />
              {{ t('nav.logout') }}
            </button>
          </nav>
        </div>
      </div>
    </nav>

    <main class="relative z-10 mx-auto max-w-7xl px-4 py-6 pb-16 md:px-6 md:py-8">
      <slot />
    </main>
  </div>

  <UIConfirmDialog />
  <Toast />
</template>
