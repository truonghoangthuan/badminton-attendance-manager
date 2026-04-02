<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
          @click="persistent ? null : $emit('update:modelValue', false)"
        />
        
        <!-- Modal Content -->
        <Transition name="modal-scale" appear>
          <div 
            v-if="modelValue"
            class="relative w-full max-w-lg glass-shell rounded-[2rem] overflow-hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <!-- Header -->
            <div v-if="$slots.header" class="px-8 pt-8 pb-4">
              <slot name="header" />
            </div>

            <!-- Close Button (if not persistent) -->
            <button 
              v-if="!persistent"
              @click="$emit('update:modelValue', false)"
              class="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <X :size="20" />
            </button>

            <!-- Body -->
            <div class="px-8 py-4">
              <slot />
            </div>

            <!-- Footer -->
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
