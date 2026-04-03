<script setup lang="ts">
import { Home, LayoutDashboard } from 'lucide-vue-next'

const { profile, loading } = useUserProfile()
const welcomeInitial = computed(() => profile.value?.displayName?.trim()?.charAt(0)?.toUpperCase() || '?')
const welcomeMessage = computed(() => {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning. Ready for the next rally?'
  }

  if (hour < 18) {
    return 'Good afternoon. Ready for the next rally?'
  }

  return 'Good evening. Ready for the next rally?'
})
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden">
    <div class="bg-mesh" />
    <div class="mesh-glow top-[-10%] left-[-10%] animate-pulse-slow" />
    <div class="mesh-glow bottom-[-10%] right-[-10%] animate-pulse-slow" style="animation-delay: -4s" />

    <nav class="sticky top-0 z-50 w-full px-4 py-4 md:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="glass-shell flex items-center justify-between px-4 py-4 md:px-6">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line bg-brand-court text-xl text-white transition-transform group-hover:scale-105">
              🏸
            </div>
            <div>
              <p class="section-kicker">Gravity Club</p>
              <span class="text-xl font-black tracking-tight text-brand-ink">Gravity <span class="text-brand-court">Badminton</span></span>
            </div>
          </NuxtLink>
          <div class="flex items-center gap-2 md:gap-3">
            <NuxtLink to="/" class="hidden items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink md:flex">
              <Home :size="18" />
              Home
            </NuxtLink>
            <NuxtLink to="/admin" class="flex items-center">
              <UIGlassButton variant="secondary" class="!px-3 md:!px-4 !py-2 !text-sm">
                <template #icon-left><LayoutDashboard :size="16" /></template>
                <span class="hidden sm:inline">Dashboard</span>
              </UIGlassButton>
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <div class="relative z-20 px-4 pt-2 md:px-6">
      <div class="mx-auto max-w-7xl">
        <div
          v-if="!loading && profile?.displayName"
          class="glass-shell mx-auto w-full overflow-hidden px-3 py-2 md:w-[30%] md:px-4 md:py-2.5"
        >
          <div class="flex items-center gap-2.5 rounded-[20px] border border-white/70 bg-white/65 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm md:gap-3 md:px-3 md:py-3">
            <Avatar
              :label="welcomeInitial"
              shape="circle"
              class="h-9 w-9 shrink-0 border border-brand-court/10 bg-gradient-to-br from-brand-court to-[#5f946f] text-sm font-black text-white shadow-[0_8px_20px_rgba(47,122,83,0.16)] md:h-10 md:w-10"
            />
            <div class="min-w-0">
              <p class="text-[9px] font-black uppercase tracking-[0.24em] text-brand-slate/75">Welcome back</p>
              <p class="truncate text-lg font-black tracking-tight text-brand-ink md:text-xl">
                {{ profile.displayName }}
              </p>
              <p class="truncate text-xs font-medium text-brand-slate/80 md:text-sm">
                {{ welcomeMessage }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UsernamePrompt />

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
