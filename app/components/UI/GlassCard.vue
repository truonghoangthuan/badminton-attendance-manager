<template>
  <div 
    class="bg-white border border-brand-line shadow-sm rounded-xl p-6 transition-all duration-200"
    :class="[
      hoverable ? 'hover:-translate-y-0.5 hover:shadow-md cursor-default' : '',
      interactive ? 'active:scale-[0.99] active:ring-1 active:ring-emerald-400 active:shadow-[0_0_10px_rgba(52,211,153,0.3)]' : ''
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hoverable?: boolean
  interactive?: boolean
}>()
</script>
