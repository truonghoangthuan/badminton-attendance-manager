<template>
  <div 
    class="glass-shell p-6 rounded-3xl"
    :class="[
      hoverable ? 'glass-card-hover cursor-default' : '',
      interactive ? 'active:scale-[0.98] transition-transform' : ''
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
