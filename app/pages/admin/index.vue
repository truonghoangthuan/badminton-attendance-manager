<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const stats = [
  { label: 'Active Members', value: '0', icon: '👤' },
  { label: 'Sessions This Month', value: '0', icon: '📅' },
  { label: 'Total RSVPs', value: '0', icon: '✅' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="mb-8">
      <h1 class="text-4xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-2">
        Admin Dashboard
      </h1>
      <p class="text-slate-900 opacity-70">Welcome back, Administrator</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="stat in stats" :key="stat.label" class="glass-card p-6 flex items-center gap-4">
        <div class="text-3xl bg-white/10 p-3 rounded-xl">{{ stat.icon }}</div>
        <div>
          <p class="text-sm opacity-60">{{ stat.label }}</p>
          <p class="text-2xl font-bold">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <div class="glass-card p-8">
      <h2 class="text-2xl font-bold mb-4">Quick Stats Placeholder</h2>
      <p class="opacity-70 mb-6">
        This area will soon show comprehensive analytics about member attendance, payment status, and session popularity.
      </p>
      <NuxtLink to="/admin/roster" class="btn-glass inline-flex gap-2 indigo-purple-badge px-6 py-3">
        Manage Roster <span>→</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.indigo-purple-badge {
  background: linear-gradient(to right, var(--color-indigo-600), var(--color-purple-600));
  color: white;
  border: none;
}
</style>
