<script setup lang="ts">
// Verify Firebase initialization (optional log for debugging)
onMounted(() => {
  try {
    const { app } = useFirebase()
    console.log('Firebase initialized successfully:', app.name)
  } catch (err) {
    console.warn('Firebase was not initialized correctly. Ensure environment variables are set.')
  }
})

// Sample PrimeVue theme verification
const visible = ref(false)
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-12 py-10">
    <!-- Hero Section -->
    <section class="text-center space-y-6 max-w-2xl px-4">
      <h1 class="text-4xl md:text-6xl font-black bg-clip-text text-transparent gradient-indigo-purple">
        Better Badminton, Simplified.
      </h1>
      <p class="text-lg opacity-80 leading-relaxed">
        Manage your attendance, members, and sessions with a modern, glassmorphic interface designed for smooth court management.
      </p>
    </section>

    <!-- Glassmorphic Card Showcase -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      <div class="glass-card p-8 flex flex-col gap-4 group">
        <div class="w-12 h-12 bg-indigo-20/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-all" style="background-color: rgba(99, 102, 241, 0.2);">
          🛡️
        </div>
        <h3 class="text-xl font-bold">Secure Attendance</h3>
        <p class="text-sm opacity-70">
          Track who's on the court with real-time updates and role-based access control powered by Firebase.
        </p>
        <div class="mt-4 flex gap-2">
          <Button label="Learn More" p-button-rounded p-button-outlined class="btn-glass" />
        </div>
      </div>

      <div class="glass-card p-8 flex flex-col gap-4 group">
        <div class="w-12 h-12 bg-purple-20/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-all" style="background-color: rgba(168, 85, 247, 0.2);">
          📊
        </div>
        <h3 class="text-xl font-bold">Smart Insights</h3>
        <p class="text-sm opacity-70">
          Visualize your club's activity with dynamic charts and attendance history logs.
        </p>
        <div class="mt-4 flex gap-2">
          <Button label="Verify UI" @click="visible = true" class="btn-glass" style="background-color: var(--color-purple-600); color: white; border: none;" />
        </div>
      </div>
    </div>

    <!-- PrimeVue Modal for testing -->
    <Dialog v-model:visible="visible" modal header="System Check" :style="{ width: '30rem' }" class="glass-surface">
      <p style="margin-bottom: 1rem;">
        PrimeVue components and Glassmorphism styles are synchronized.
      </p>
      <div class="flex justify-end gap-2">
        <Button type="button" label="Close" severity="secondary" @click="visible = false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.indigo-20\/20 { background-color: rgba(99, 102, 241, 0.2); }
.purple-20\/20 { background-color: rgba(168, 85, 247, 0.2); }
.mt-4 { margin-top: 1rem; }
.justify-end { justify-content: flex-end; }
</style>
