<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { ArrowLeft, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-vue-next'

const { auth } = useFirebase()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isMobileMenuOpen = ref(false)

// Close menu on navigation (mobile)
watch(() => route.path, () => {
  if (isMobileMenuOpen.value) isMobileMenuOpen.value = false
})

const handleLogout = async () => {
  try {
    await signOut(auth)
    router.push('/admin/login')
  } catch (e) {
    console.error('Logout failed', e)
  }
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50/50 to-white">
    <!-- Floating Top Nav -->
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 w-full max-w-5xl px-4 z-50">
      <nav class="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl px-4 md:px-6 py-3 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
            <ShieldCheck class="text-white" :size="20" stroke-width="2.5" />
          </div>
          <div class="flex flex-col hidden sm:flex">
            <span class="text-lg font-extrabold leading-none tracking-tight text-slate-800">
              Admin<span class="text-emerald-500">Panel</span>
            </span>
          </div>
        </div>

        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center gap-6">
          <NuxtLink to="/admin" class="text-sm font-bold transition-colors" :class="$route.path === '/admin' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'">
            {{ t('nav.dashboard') }}
          </NuxtLink>
          <NuxtLink to="/" class="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            {{ t('nav.backToSite') }}
          </NuxtLink>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 md:gap-4">
          <UILanguageSwitcher class="scale-90" />
          <div class="w-px h-4 bg-slate-200 hidden md:block"></div>
          <button @click="handleLogout" class="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors hidden md:block" :title="t('nav.logout')">
            {{ t('nav.logout') }}
          </button>
          
          <!-- Mobile Menu Toggle -->
          <UIGlassButton variant="ghost" class="!p-2 md:hidden" @click="isMobileMenuOpen = !isMobileMenuOpen">
            <Menu v-if="!isMobileMenuOpen" :size="24" class="text-slate-800" />
            <X v-else :size="24" class="text-slate-800" />
          </UIGlassButton>
        </div>
      </nav>
    </div>

    <!-- Mobile Dropdown -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 top-[76px] z-40 animate-fade-in bg-white/95 p-4 backdrop-blur-xl md:hidden">
      <div class="flex flex-col gap-4 max-w-sm mx-auto mt-4">
        <nav class="flex flex-col gap-3">
          <NuxtLink to="/admin">
            <UIGlassButton variant="secondary" class="w-full !justify-start !px-4 !py-3 !rounded-xl transition-all" :class="{ '!bg-emerald-500 !text-white !border-emerald-400': $route.path === '/admin' }">
              <template #icon-left><LayoutDashboard :size="20" /></template>
              <span class="font-bold">{{ t('nav.dashboard') }}</span>
            </UIGlassButton>
          </NuxtLink>
          <NuxtLink to="/">
             <UIGlassButton variant="ghost" class="w-full !justify-start !px-4 !py-3 !rounded-xl">
                <template #icon-left><ArrowLeft :size="20" /></template>
                <span class="font-bold">{{ t('nav.backToSite') }}</span>
             </UIGlassButton>
          </NuxtLink>
        </nav>
        
        <div class="flex w-full flex-col gap-3 border-t border-slate-100 pt-5">
          <UIGlassButton variant="ghost" @click="handleLogout" class="w-full !justify-start !text-rose-500 hover:!bg-rose-50 !rounded-xl !px-4 !py-3">
            <template #icon-left><LogOut :size="20" /></template>
            <span class="font-bold">{{ t('nav.logout') }}</span>
          </UIGlassButton>
        </div>
      </div>
    </div>

    <main class="relative z-10 w-full flex-1 pt-32 pb-12 px-4 md:px-6 max-w-7xl mx-auto">
      <slot />
    </main>
  </div>

  <UIConfirmDialog />
  <Toast />
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}
</style>
