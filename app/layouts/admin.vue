<script setup lang="ts">
import { signOut } from 'firebase/auth'

const { auth } = useFirebase()
const router = useRouter()

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
  <div class="min-h-screen bg-gradient-app flex flex-col md:flex-row">
    <!-- Navigation (Mobile Top Bar / Desktop Sidebar) -->
    <nav class="nav-glass md:w-64 md:h-screen md:sticky md:top-0 md:flex-col flex items-center md:items-start justify-between md:justify-start gap-8 p-6 md:p-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 indigo-purple-badge flex items-center justify-center font-black">BM</div>
        <h2 class="text-xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent md:block hidden">
          Admin Panel
        </h2>
      </div>

      <div class="flex md:flex-col grow items-center md:items-start gap-4">
        <NuxtLink 
          to="/admin" 
          class="btn-glass w-full justify-start gap-3 px-4 py-3"
          active-class="indigo-purple-badge"
        >
          <span class="opacity-70">📊</span>
          <span class="md:inline hidden">Dashboard</span>
        </NuxtLink>
        <NuxtLink 
          to="/admin/roster" 
          class="btn-glass w-full justify-start gap-3 px-4 py-3"
          active-class="indigo-purple-badge"
        >
          <span class="opacity-70">👥</span>
          <span class="md:inline hidden">Team Roster</span>
        </NuxtLink>
      </div>

      <div class="mt-auto w-full">
        <button 
          @click="handleLogout" 
          class="btn-glass w-full justify-start gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 border-red-500/20"
        >
          <span class="opacity-70">🚪</span>
          <span class="md:inline hidden">Logout</span>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 p-4 md:p-10 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.indigo-purple-badge {
  background: linear-gradient(to right, var(--color-indigo-600), var(--color-purple-600));
}

a.indigo-purple-badge {
  color: white !important;
  border: none;
}
</style>
