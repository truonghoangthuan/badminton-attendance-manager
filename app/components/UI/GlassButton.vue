<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="btn-glow relative group inline-flex items-center justify-center gap-2 rounded-2xl border px-6 py-3 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      variant === 'primary' ? 'border-brand-court bg-brand-court text-white shadow-[0_10px_20px_rgba(47,122,83,0.18)] hover:bg-brand-purple hover:border-brand-purple' : 
      variant === 'secondary' ? 'border-brand-line bg-white text-brand-ink hover:border-brand-court hover:text-brand-court' :
      'border-transparent bg-transparent text-brand-slate hover:border-brand-line hover:bg-white hover:text-brand-ink'
    ]"
  >
    <Loader2 v-if="loading" class="animate-spin" :size="18" />
    <slot v-else name="icon-left" />
    <slot />
    <slot v-if="!loading" name="icon-right" />
    
    <!-- Hover Shine Effect -->
    <div class="absolute inset-0 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 bg-gradient-to-r from-white/0 via-white/15 to-white/0" />
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
