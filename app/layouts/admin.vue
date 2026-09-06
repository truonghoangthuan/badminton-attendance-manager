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
  <div class="relative flex min-h-screen flex-col bg-slate-50">
    <!-- Direction 2 Header -->
    <header class="sticky top-0 z-40 w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,240,0.96))] backdrop-blur-md border-b border-slate-200/80 shadow-sm px-4 py-3 md:px-6">
      <div class="mx-auto flex items-center justify-between">
        
        <!-- Logo Left Side -->
        <div class="flex items-center gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-ink">
            <ShieldCheck class="text-emerald-400" :size="20" />
          </div>
          <div class="flex flex-col">
            <span class="text-lg font-bold leading-none tracking-tight text-brand-ink">
              Admin<span class="text-emerald-500">Panel</span>
            </span>
            <span class="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {{ t('admin.panelSubtitle') || 'Management' }}
            </span>
          </div>
        </div>

        <!-- Desktop Nav Center -->
        <nav class="hidden md:flex items-center gap-2 rounded-lg border border-slate-200/50 bg-slate-100/50 p-1">
          <NuxtLink 
            to="/admin" 
            class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            :class="$route.path === '/admin' ? 'bg-white font-bold text-brand-ink shadow-sm border border-slate-200/50' : 'text-slate-500 hover:bg-slate-200/50 hover:text-brand-ink'"
          >
            <LayoutDashboard :size="16" />
            {{ t('nav.dashboard') }}
          </NuxtLink>
          <NuxtLink 
            to="/" 
            class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-brand-ink"
          >
            <ArrowLeft :size="16" />
            {{ t('nav.backToSite') }}
          </NuxtLink>
        </nav>

        <!-- Desktop Actions Right -->
        <div class="hidden md:flex items-center gap-2">
          <UILanguageSwitcher class="scale-90" />
          <button 
            @click="handleLogout"
            class="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-red-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            :title="t('nav.logout')"
          >
            <LogOut :size="16" />
            <span class="hidden xl:inline">{{ t('nav.logout') }}</span>
          </button>
        </div>

        <!-- Mobile Menu Toggle -->
        <div class="flex items-center gap-2 md:hidden">
          <UIGlassButton 
            variant="ghost" 
            class="!p-2"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <Menu v-if="!isMobileMenuOpen" :size="24" class="text-brand-ink" />
            <X v-else :size="24" class="text-brand-ink" />
          </UIGlassButton>
        </div>
      </div>
    </header>

    <!-- Mobile Dropdown -->
    <div 
      v-if="isMobileMenuOpen" 
      class="fixed inset-0 top-[73px] z-30 animate-fade-in bg-slate-50/95 p-4 backdrop-blur-md md:hidden"
    >
      <div class="flex flex-col gap-4">
        <nav class="flex flex-col gap-2">
          <NuxtLink to="/admin" :title="t('nav.dashboard')">
            <UIGlassButton 
              variant="secondary" 
              class="w-full !justify-start !px-4 !py-3 transition-all"
              :class="{ '!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700': $route.path === '/admin' }"
            >
              <template #icon-left><LayoutDashboard :size="20" /></template>
              <span>{{ t('nav.dashboard') }}</span>
            </UIGlassButton>
          </NuxtLink>
          <NuxtLink to="/" :title="t('nav.backToSite')">
             <UIGlassButton variant="ghost" class="w-full !justify-start">
                <template #icon-left><ArrowLeft :size="18" /></template>
                <span>{{ t('nav.backToSite') }}</span>
             </UIGlassButton>
          </NuxtLink>
        </nav>
        
        <div class="flex w-full flex-col gap-2 border-t border-slate-200 pt-4">
          <div class="flex items-center justify-between px-2">
            <span class="text-sm font-bold text-slate-500">Language</span>
            <UILanguageSwitcher />
          </div>
          <UIGlassButton 
            variant="ghost" 
            @click="handleLogout"
            class="mt-2 w-full !justify-start !text-red-500 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-600"
          >
            <template #icon-left><LogOut :size="20" /></template>
            <span>{{ t('nav.logout') }}</span>
          </UIGlassButton>
        </div>
      </div>
    </div>

    <main class="relative z-10 w-full flex-1 p-4 md:p-8">
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
