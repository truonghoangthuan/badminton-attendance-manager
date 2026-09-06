<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="relative inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
    :class="[
      variant === 'primary' ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:border-emerald-700' : 
      variant === 'secondary' ? 'border-brand-line bg-white text-brand-ink shadow-sm hover:bg-slate-50' :
      'border-transparent bg-transparent text-brand-slate hover:bg-slate-100 hover:text-brand-ink'
    ]"
  >
    <Loader2 v-if="loading" class="animate-spin" :size="16" />
    <slot v-else name="icon-left" />
    <slot />
    <slot v-if="!loading" name="icon-right" />
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
