<script setup lang="ts">
// Color mode logic removed as per user's Tailwind/ColorMode removal request
</script>

<template>
  <div class="bg-gradient-app min-h-screen">
    <!-- Navbar -->
    <nav class="nav-glass transition-all">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-4">
        <NuxtLink to="/" class="text-2xl font-bold flex items-center gap-2" style="text-decoration: none; color: inherit;">
          <span class="indigo-purple-badge">🏸</span>
          <span class="sm:inline-block">Badminton Attendance</span>
        </NuxtLink>

        <div class="flex items-center gap-4">
          <!-- Navigation placeholders -->
          <div class="hidden md:flex items-center gap-6 text-sm font-medium">
            <NuxtLink to="/" class="transition-colors" style="text-decoration: none; color: inherit;">Home</NuxtLink>
            <NuxtLink to="/" class="btn-glass" style="background-color: var(--color-indigo-600); color: white; border: none;">Get Started</NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-10">
      <slot />
    </main>

    <!-- Simple Footer -->
    <footer class="p-10 text-center opacity-40 text-sm">
      <p>&copy; 2026 Badminton Attendance Manager. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped>
.router-link-active {
  color: var(--color-indigo-500) !important;
}

/* Hover effect for home link */
a.transition-colors:hover {
  color: var(--color-indigo-500);
}
</style>
