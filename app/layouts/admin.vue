<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { ArrowLeft, CircleAlert, Info, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-vue-next'

const { auth } = useFirebase()
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
  <div class="relative flex min-h-screen flex-col overflow-x-hidden md:flex-row">
    <div class="bg-mesh" />

    <header class="sticky top-0 z-40 flex w-full items-center justify-between border-b border-brand-line bg-brand-sand/95 p-4 backdrop-blur md:hidden">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-court">
          <ShieldCheck class="text-white" :size="16" />
        </div>
        <span class="text-lg font-black tracking-tighter text-brand-ink">Admin<span class="text-brand-court">Panel</span></span>
      </div>
      <UIGlassButton 
        variant="ghost" 
        class="!p-2"
        @click="isSidebarOpen = !isSidebarOpen"
      >
        <Menu v-if="!isSidebarOpen" :size="24" class="text-brand-ink" />
        <X v-else :size="24" class="text-brand-ink" />
      </UIGlassButton>
    </header>

    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 z-30 animate-fade-in bg-brand-ink/20 backdrop-blur-sm md:hidden"
      @click="isSidebarOpen = false"
    />
    
    <aside 
      class="fixed inset-y-0 left-0 z-40 h-full w-80 p-5 transition-transform duration-500 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <UIGlassCard class="flex h-full flex-col gap-8 bg-white md:!p-8">
        <div class="flex items-center gap-3 px-1">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-court">
            <ShieldCheck class="text-white" :size="24" />
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-black tracking-tighter text-brand-ink">Admin<span class="text-brand-court">Panel</span></span>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-slate">Management Console</span>
          </div>
        </div>

        <div class="rounded-[24px] border border-brand-line bg-brand-sand p-4">
          <p class="section-kicker">Workflow</p>
          <p class="mt-2 text-sm font-medium leading-6 text-brand-slate">
            Review upcoming sessions, then drill into a single match to manage attendance and finance.
          </p>
        </div>

        <nav class="grow space-y-2">
          <NuxtLink to="/admin">
            <UIGlassButton 
              variant="secondary" 
              class="w-full !justify-start !px-4 !py-4 transition-all"
              :class="{ '!border-brand-court !bg-brand-court !text-white': $route.path === '/admin' }"
            >
              <template #icon-left><LayoutDashboard :size="20" /></template>
              Dashboard
            </UIGlassButton>
          </NuxtLink>
        </nav>

        <div class="flex flex-col gap-2 border-t border-brand-line pt-6">
          <NuxtLink to="/">
             <UIGlassButton variant="ghost" class="w-full !justify-start">
                <template #icon-left><ArrowLeft :size="18" /></template>
                Back to Site
             </UIGlassButton>
          </NuxtLink>
          <UIGlassButton 
            variant="ghost" 
            @click="handleLogout"
            class="w-full !justify-start !text-red-500 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-600"
          >
            <template #icon-left><LogOut :size="20" /></template>
            Logout session
          </UIGlassButton>
        </div>
      </UIGlassCard>
    </aside>

    <main class="relative z-10 w-full flex-1 overflow-x-hidden p-6 md:p-10">
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
