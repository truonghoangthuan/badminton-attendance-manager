<template>
  <div class="flex flex-col gap-2 w-full">
    <label v-if="label" class="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
      {{ label }}
    </label>
    <div class="relative group">
      <!-- Icon Slot -->
      <div v-if="$slots.icon" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-indigo transition-colors">
        <slot name="icon" />
      </div>
      
      <input
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', type === 'number' ? Number(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value)"
        @focus="($event.target as HTMLInputElement).select()"
        class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-brand-indigo/50 focus:ring-4 focus:ring-brand-indigo/10 transition-all outline-none"
        :class="{ 'pl-12': $slots.icon }"
        :placeholder="placeholder"
        :required="required"
        :min="min"
        :max="max"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: any
  label?: string
  placeholder?: string
  type?: string
  required?: boolean
  min?: number | string
  max?: number | string
}>()

defineEmits(['update:modelValue'])
</script>
