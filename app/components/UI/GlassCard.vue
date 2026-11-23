<template>
  <div 
    class="bg-white border border-brand-line shadow-sm rounded-2xl p-6 transition-all duration-200"
    :class="[
      hoverable ? 'hover:-translate-y-0.5 hover:shadow-md' : '',
      interactive ? 'active:scale-[0.99] active:ring-1 active:ring-brand-court/50 active:shadow-[0_0_10px_rgba(47,122,83,0.2)]' : ''
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
