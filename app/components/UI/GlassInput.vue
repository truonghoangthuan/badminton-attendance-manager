<template>
  <div class="flex flex-col gap-2 w-full">
    <label v-if="label" class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate px-1">
      {{ label }}
    </label>
    <div class="relative group">
      <div v-if="$slots.icon" class="absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate group-focus-within:text-brand-court transition-colors">
        <slot name="icon" />
      </div>
      
      <input
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', type === 'number' ? Number(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value)"
        @focus="($event.target as HTMLInputElement).select()"
        class="w-full rounded-2xl border border-brand-line bg-[#fcfcf9] py-4 px-4 text-brand-ink placeholder:text-brand-slate/70 focus:border-brand-court focus:ring-4 focus:ring-brand-court/10 transition-all outline-none"
        :class="{ 'pl-12': $slots.icon }"
        :placeholder="placeholder"
        :required="required"
        :min="min"
        :max="max"
        :maxlength="maxlength"
        :disabled="disabled"
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
  maxlength?: number | string
  disabled?: boolean
}>()

defineEmits(['update:modelValue'])
</script>
