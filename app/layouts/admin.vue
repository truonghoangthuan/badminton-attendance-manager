<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { LayoutDashboard, Users, LogOut, ShieldCheck, Menu, X, ArrowLeft } from 'lucide-vue-next'

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
  <div class="relative min-h-screen overflow-x-hidden flex flex-col md:flex-row bg-slate-950">
    <!-- Animated Mesh Background -->
    <div class="bg-mesh opacity-40" />

    <!-- Mobile Top Bar -->
    <header class="md:hidden sticky top-0 w-full z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center">
          <ShieldCheck class="text-white" :size="16" />
        </div>
        <span class="text-lg font-black tracking-tighter text-white">Admin<span class="text-brand-indigo">Panel</span></span>
      </div>
      <UIGlassButton 
        variant="ghost" 
        class="!p-2"
        @click="isSidebarOpen = !isSidebarOpen"
      >
        <Menu v-if="!isSidebarOpen" :size="24" class="text-white" />
        <X v-else :size="24" class="text-white" />
      </UIGlassButton>
    </header>

    <!-- Sidebar Backdrop (Mobile) -->
    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
      @click="isSidebarOpen = false"
    />
    
    <!-- Sidebar Navigation -->
    <aside 
      class="fixed inset-y-0 left-0 w-80 p-6 h-full md:h-screen md:sticky md:top-0 z-40 transition-transform duration-500 ease-in-out md:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <UIGlassCard class="h-full flex flex-col gap-8 md:!p-8">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-2">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center shadow-lg shadow-brand-indigo/20">
            <ShieldCheck class="text-white" :size="24" />
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-black tracking-tighter text-white">Admin<span class="text-brand-indigo">Panel</span></span>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Management Console</span>
          </div>
        </div>

        <!-- Links -->
        <nav class="flex flex-col gap-2 grow">
          <NuxtLink to="/admin" class="group">
            <UIGlassButton 
              variant="secondary" 
              class="w-full !justify-start !px-4 !py-4 transition-all"
              :class="{ '!bg-brand-indigo !border-brand-indigo/50 !shadow-lg !shadow-brand-indigo/20': $route.path === '/admin' }"
            >
              <template #icon-left><LayoutDashboard :size="20" class="group-hover:rotate-6 transition-transform" /></template>
              Dashboard
            </UIGlassButton>
          </NuxtLink>
          <NuxtLink to="/admin/roster" class="group">
            <UIGlassButton 
              variant="secondary" 
              class="w-full !justify-start !px-4 !py-4 transition-all"
              :class="{ '!bg-brand-indigo !border-brand-indigo/50 !shadow-lg !shadow-brand-indigo/20': $route.path === '/admin/roster' }"
            >
              <template #icon-left><Users :size="20" class="group-hover:rotate-6 transition-transform" /></template>
              Team Roster
            </UIGlassButton>
          </NuxtLink>
        </nav>

        <!-- Footer Actions -->
        <div class="pt-6 border-t border-white/10 flex flex-col gap-2">
          <NuxtLink to="/" class="group">
             <UIGlassButton variant="ghost" class="w-full !justify-start !text-white/40 hover:!text-white">
                <template #icon-left><ArrowLeft :size="18" /></template>
                Back to Site
             </UIGlassButton>
          </NuxtLink>
          <UIGlassButton 
            variant="ghost" 
            @click="handleLogout"
            class="w-full !justify-start !text-red-400/60 hover:!text-red-400 hover:!bg-red-400/10"
          >
            <template #icon-left><LogOut :size="20" /></template>
            Logout session
          </UIGlassButton>
        </div>
      </UIGlassCard>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6 md:p-12 relative z-10 w-full overflow-x-hidden">
      <slot />
    </main>
  </div>
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
