<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { ArrowLeft, CircleAlert, Info, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-vue-next'

const { auth } = useFirebase()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isSidebarOpen = ref(false)

// Close sidebar on navigation (mobile)
watch(() => route.path, () => {
  if (isSidebarOpen.value) isSidebarOpen.value = false
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
  <div class="relative flex min-h-screen flex-col md:flex-row bg-slate-50">

    <header class="sticky top-0 z-40 flex w-full items-center justify-between border-b border-slate-200 bg-white/95 p-4 backdrop-blur md:hidden">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-court">
          <ShieldCheck class="text-white" :size="16" />
        </div>
        <span class="text-lg font-black tracking-tighter text-brand-ink">Admin<span class="text-brand-court">Panel</span></span>
      </div>
      <div class="flex items-center gap-2">
        <UILanguageSwitcher />
        <UIGlassButton 
          variant="ghost" 
          class="!p-2"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          <Menu v-if="!isSidebarOpen" :size="24" class="text-brand-ink" />
          <X v-else :size="24" class="text-brand-ink" />
        </UIGlassButton>
      </div>
    </header>

    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 z-30 animate-fade-in bg-brand-ink/20 backdrop-blur-sm md:hidden"
      @click="isSidebarOpen = false"
    />
    
    <aside 
      class="fixed inset-y-0 left-0 z-40 h-full w-72 p-4 transition-transform duration-500 ease-in-out md:sticky md:top-0 md:h-screen md:w-20 md:p-3 md:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <UIGlassCard class="flex h-full flex-col gap-6 !p-4 md:!p-3 md:items-center">
        <div class="flex items-center justify-between gap-3 px-1 md:justify-center md:px-0 md:flex-col md:gap-6">
          <div class="flex items-center gap-3 md:gap-0">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-ink shrink-0 md:h-10 md:w-10">
              <ShieldCheck class="text-emerald-400" :size="20" />
            </div>
            <div class="flex flex-col md:hidden">
              <span class="text-xl font-bold tracking-tight text-brand-ink">Admin<span class="text-emerald-500">Panel</span></span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('admin.panelSubtitle') }}</span>
            </div>
          </div>
          <UILanguageSwitcher class="md:scale-90" />
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 md:hidden">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ t('admin.workflowTitle') }}</p>
          <p class="mt-2 text-sm font-medium leading-5 text-slate-600">
            {{ t('admin.workflowDesc') }}
          </p>
        </div>

        <nav class="grow space-y-2 md:w-full">
          <NuxtLink to="/admin" :title="t('nav.dashboard')">
            <UIGlassButton 
              variant="secondary" 
              class="w-full !justify-start md:!justify-center !px-4 !py-3 md:!px-0 transition-all"
              :class="{ '!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700': $route.path === '/admin' }"
            >
              <template #icon-left><LayoutDashboard :size="20" /></template>
              <span class="md:hidden">{{ t('nav.dashboard') }}</span>
            </UIGlassButton>
          </NuxtLink>
        </nav>

        <div class="flex w-full flex-col gap-2 border-t border-slate-200 pt-6">
          <NuxtLink to="/" :title="t('nav.backToSite')">
             <UIGlassButton variant="ghost" class="w-full !justify-start md:!justify-center md:!px-0">
                <template #icon-left><ArrowLeft :size="18" /></template>
                <span class="md:hidden">{{ t('nav.backToSite') }}</span>
             </UIGlassButton>
          </NuxtLink>
          <UIGlassButton 
            variant="ghost" 
            @click="handleLogout"
            :title="t('nav.logout')"
            class="w-full !justify-start md:!justify-center md:!px-0 !text-red-500 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-600"
          >
            <template #icon-left><LogOut :size="20" /></template>
            <span class="md:hidden">{{ t('nav.logout') }}</span>
          </UIGlassButton>
        </div>
      </UIGlassCard>
    </aside>

    <main class="relative z-10 w-full flex-1 p-6 md:p-10">
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
  animation: fade-in 0.3s ease-out forwards;
}
</style>
