<template>
  <UIGlassModal :modelValue="show" persistent>
    <template #header>
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center text-3xl shadow-lg shadow-brand-indigo/20 animate-bounce-subtle">
          👋
        </div>
        <div>
          <h2 class="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Welcome to Gravity
          </h2>
          <p class="text-white/50 text-sm mt-1 font-medium">
            Please enter a name to join the session
          </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="space-y-2">
        <label for="username" class="text-xs font-black uppercase tracking-widest text-white/40 ml-2">
          Your Display Name
        </label>
        <UIGlassInput
          id="username"
          v-model="username"
          placeholder="e.g. John Doe"
          :disabled="submitting"
          required
          autofocus
          maxlength="255"
        />
        <p v-if="error" class="text-red-400 text-xs ml-2 font-medium animate-pulse">
          {{ error }}
        </p>
      </div>

      <div class="pt-4">
        <UIGlassButton 
          type="submit" 
          class="w-full !py-4 !text-base"
          :loading="submitting"
          :disabled="!username.trim() || submitting"
        >
          <template #icon-right>
            <ArrowRight :size="18" />
          </template>
          Start Playing
        </UIGlassButton>
      </div>
    </form>

    <template #footer>
      <p class="text-center text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
        Secure Anonymous Authentication
      </p>
    </template>
  </UIGlassModal>
</template>

<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

const { profile, loading, hasUsername, setProfile } = useUserProfile()

const show = computed(() => !loading.value && !hasUsername.value)
const username = ref('')
const submitting = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!username.value.trim()) {
    error.value = 'Please enter a name'
    return
  }

  if (username.value.trim().length < 2) {
    error.value = 'Name is too short'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const success = await setProfile(username.value)
    if (!success) {
      error.value = 'Failed to save name. Please try again.'
    }
  } catch (e) {
    error.value = 'An unexpected error occurred.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.animate-bounce-subtle {
  animation: bounce-subtle 3s ease-in-out infinite;
}
</style>
