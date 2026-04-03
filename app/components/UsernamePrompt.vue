<template>
  <UIGlassModal :modelValue="show" persistent>
    <template #header>
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-line bg-brand-sand text-3xl animate-bounce-subtle">
          👋
        </div>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">
            Welcome to Gravity
          </h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            Please enter a name to join the session
          </p>
        </div>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="space-y-2">
        <label for="username" class="ml-2 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
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
        <p v-if="error" class="ml-2 text-xs font-medium text-red-500 animate-pulse">
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
      <p class="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-brand-slate">
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
