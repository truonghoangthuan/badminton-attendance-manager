<template>
  <button
    :type="type"
    class="btn-glow relative group flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      variant === 'primary' ? 'bg-gradient-to-br from-brand-indigo to-brand-purple text-white shadow-lg shadow-brand-indigo/30' : 
      variant === 'secondary' ? 'bg-white/10 text-white border border-white/20 backdrop-blur-md' :
      'bg-transparent text-white/70 hover:text-white'
    ]"
  >
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
    
    <!-- Hover Shine Effect -->
    <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost'
}>(), {
  type: 'button',
  variant: 'primary'
})
</script>
