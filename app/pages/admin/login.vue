<script setup lang="ts">
import { signInWithEmailAndPassword } from 'firebase/auth'

const { auth } = useFirebase()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/admin/roster')
  } catch (e: any) {
    error.value = e.message || 'Failed to login'
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: false
})
</script>

<template>
  <div class="min-h-screen bg-gradient-app flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-md p-8 animate-fade-in shadow-2xl">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-2">
          Admin Access
        </h1>
        <p class="text-slate-900 opacity-70">Enter credentials to manage the roster</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div v-if="error" class="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-700 text-sm">
          {{ error }}
        </div>

        <div class="flex flex-col gap-2">
          <label for="email" class="text-sm font-medium">Email Address</label>
          <input 
            v-model="email" 
            id="email" 
            type="email" 
            required 
            placeholder="admin@example.com"
            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:opacity-30"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="password" class="text-sm font-medium">Password</label>
          <input 
            v-model="password" 
            id="password" 
            type="password" 
            required 
            placeholder="••••••••"
            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:opacity-30"
          />
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-4 gradient-indigo-purple text-white font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
          {{ loading ? 'Authenticating...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

input:focus {
  background-color: rgba(255, 255, 255, 0.1);
}

.animate-spin {
  border-top-color: transparent;
}
</style>
