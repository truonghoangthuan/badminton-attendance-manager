<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          class="absolute inset-0 bg-brand-ink/25 backdrop-blur-sm" 
          @click="persistent ? null : $emit('update:modelValue', false)"
        />
        
        <Transition name="modal-scale" appear>
          <div 
            v-if="modelValue"
            class="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-brand-line bg-white shadow-[0_30px_80px_rgba(29,42,34,0.16)]"
            role="dialog"
            aria-modal="true"
          >
            <div v-if="$slots.header" class="px-8 pt-8 pb-4">
              <slot name="header" />
            </div>

            <button 
              v-if="!persistent"
              @click="$emit('update:modelValue', false)"
              class="absolute top-6 right-6 rounded-full border border-brand-line p-2 text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink"
            >
              <X :size="20" />
            </button>

            <div class="px-8 py-4">
              <slot />
            </div>

            <div v-if="$slots.footer" class="px-8 py-8">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  modelValue: boolean
  persistent?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
