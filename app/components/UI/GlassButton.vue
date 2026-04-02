<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="btn-glow relative group flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      variant === 'primary' ? 'bg-gradient-to-br from-brand-indigo to-brand-purple text-white shadow-lg shadow-brand-indigo/30' : 
      variant === 'secondary' ? 'bg-white/10 text-white border border-white/20 backdrop-blur-md' :
      'bg-transparent text-white/70 hover:text-white'
    ]"
  >
    <Loader2 v-if="loading" class="animate-spin" :size="18" />
    <slot v-else name="icon-left" />
    <slot />
    <slot v-if="!loading" name="icon-right" />
    
    <!-- Hover Shine Effect -->
    <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
  </button>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
  disabled?: boolean
}>(), {
  type: 'button',
  variant: 'primary',
  loading: false,
  disabled: false
})
</script>
