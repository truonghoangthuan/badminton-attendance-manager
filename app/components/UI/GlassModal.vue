<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @keydown.esc="handleEsc"
        tabindex="-1"
      >
        <div 
          class="absolute inset-0 bg-brand-ink/25 backdrop-blur-sm" 
          @click="persistent ? null : close()"
        />
        
        <Transition name="modal-scale" appear>
          <div 
            v-if="modelValue"
            ref="modalContent"
            class="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-brand-line bg-white shadow-[0_30px_80px_rgba(29,42,34,0.16)] focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabindex="0"
          >
            <div v-if="$slots.header" class="px-8 pt-8 pb-4" id="modal-title">
              <slot name="header" />
            </div>

            <button 
              v-if="showClose && !persistent"
              @click="close"
              class="absolute top-6 right-6 rounded-full border border-brand-line p-2 text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink"
              aria-label="Close modal"
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: boolean
  persistent?: boolean
  showClose?: boolean
}>(), {
  persistent: false,
  showClose: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const modalContent = ref<HTMLElement | null>(null)

const close = () => {
  emit('update:modelValue', false)
}

const handleEsc = () => {
  if (!props.persistent) {
    close()
  }
}

// Focus Trap Logic
const focusableElementsSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleEsc()
  }

  if (e.key === 'Tab' && modalContent.value) {
    const focusableElements = modalContent.value.querySelectorAll(focusableElementsSelector) as NodeListOf<HTMLElement>
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (!firstElement || !lastElement) return

    if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else { // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', handleKeydown)
    // Small delay to allow transition before focusing
    setTimeout(() => {
      modalContent.value?.focus()
    }, 50)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
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
