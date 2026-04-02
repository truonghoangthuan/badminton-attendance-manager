<script setup lang="ts">
import { LayoutDashboard, Home, User as UserIcon } from 'lucide-vue-next'

const { profile, loading } = useUserProfile()
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden">
    <!-- Animated Mesh Background -->
    <div class="bg-mesh" />
    <div class="mesh-glow top-[-10%] left-[-10%] animate-pulse-slow" />
    <div class="mesh-glow bottom-[-10%] right-[-10%] animate-pulse-slow" style="animation-delay: -4s" />

    <!-- Navbar -->
    <nav class="sticky top-0 z-50 w-full px-4 py-4">
      <div class="max-w-7xl mx-auto">
        <div class="glass-shell px-6 py-4 rounded-3xl flex items-center justify-between">
          <NuxtLink to="/" class="flex items-center gap-2 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-lg shadow-brand-indigo/20">
              🏸
            </div>
            <span class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
              <span class="xs:inline">Gravity</span><span class="text-brand-indigo"> Badminton</span>
            </span>
          </NuxtLink>
          <div class="flex items-center gap-2 md:gap-4">
            <div v-if="!loading && profile?.displayName" class="flex items-center gap-2 px-3 py-1.5 cursor-default">
              <div class="h-8 flex items-center justify-center text-sm font-black text-white/80 transition-colors">
                {{ profile.displayName }}
              </div>
              <span class="hidden xs:inline text-xs font-black text-white/70 uppercase tracking-wider group-hover:text-white transition-colors">
                {{ profile.displayName }}
              </span>
            </div>
            <NuxtLink to="/" class="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm font-bold text-white/70 hover:text-white">
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

    <!-- Username Prompt Modal -->
    <UsernamePrompt />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8 relative z-10">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="max-w-7xl mx-auto px-4 py-12 text-center relative z-10">
      <div class="glass-shell p-8 rounded-3xl inline-flex flex-col items-center gap-4">
        <p class="text-sm font-bold text-white/70 tracking-widest uppercase">
          &copy; 2026 Badminton Attendance Manager
        </p>
        <div class="flex gap-4 text-white/50">
          <div class="w-1.5 h-1.5 rounded-full bg-current" />
          <div class="w-1.5 h-1.5 rounded-full bg-current" />
          <div class="w-1.5 h-1.5 rounded-full bg-current" />
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.router-link-active {
  @apply text-white !important;
}
</style>
