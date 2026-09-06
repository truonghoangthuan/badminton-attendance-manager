<script setup lang="ts">
import { Check, ChevronDown, Globe } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const { locale, setLocale, locales, t } = useI18n()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleSelect = (code: 'en' | 'vi') => {
  setLocale(code)
  closeDropdown()
}

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeDropdown()
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <div ref="containerRef" class="relative inline-block text-left">
    <!-- Trigger Button (Compact Globe Pill) -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-2xl border border-brand-line bg-white/90 px-3 py-2 text-xs font-black text-brand-ink shadow-sm backdrop-blur-sm transition-all hover:border-brand-court hover:bg-brand-sand focus:outline-none"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-label="t('language.chooseLanguage')"
      @click="toggleDropdown"
    >
      <Globe :size="16" class="text-brand-court shrink-0" />
      <span class="font-black uppercase tracking-wider">{{ locale.toUpperCase() }}</span>
      <ChevronDown
        :size="14"
        class="text-brand-slate transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Glass Popover Card -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-brand-line bg-white/95 p-1.5 shadow-[0_20px_40px_-10px_rgba(18,55,42,0.18),0_0_0_1px_rgba(219,230,221,0.8)] backdrop-blur-xl"
        role="menu"
        aria-orientation="vertical"
      >
        <div class="border-b border-brand-line/60 px-3 py-2">
          <p class="text-[9px] font-black uppercase tracking-[0.2em] text-brand-slate">
            {{ t('language.chooseLanguage') }}
          </p>
        </div>

        <div class="p-1 space-y-1">
          <button
            v-for="item in locales"
            :key="item.code"
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-bold transition-colors"
            :class="
              locale === item.code
                ? 'bg-brand-court/10 text-brand-court'
                : 'text-brand-ink hover:bg-brand-sand'
            "
            role="menuitem"
            @click="handleSelect(item.code)"
          >
            <div class="flex items-center gap-2">
              <span class="text-base">{{ item.flag }}</span>
              <div>
                <p class="font-black leading-tight">{{ item.nativeName }}</p>
                <p class="text-[10px] text-brand-slate font-medium mt-0.5">{{ item.region }}</p>
              </div>
            </div>
            <Check v-if="locale === item.code" :size="16" class="text-brand-court" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
