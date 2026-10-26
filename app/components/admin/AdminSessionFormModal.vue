<script setup lang="ts">
import { Calendar, ChevronDown, Clock3, Feather, Grid2x2, MapPin, Trophy, Users } from 'lucide-vue-next';
import { SKILL_LEVEL_OPTIONS } from '~/types/session';

export interface SessionFormState {
  date: string;
  time: string;
  location: string;
  maxPlayers: number;
  courtNumber: string;
  shuttlecockType: string;
  level: string;
}

defineProps<{
  modelValue: boolean;
  form: SessionFormState;
  isEditing?: boolean;
  loading?: boolean;
  hint?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <UIGlassModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <template #header>
      <div class="flex flex-col gap-1.5 text-center">
        <p class="text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">{{ t('admin.setupKicker') }}</p>
        <h2 class="text-2xl font-black tracking-tight text-brand-ink">
          {{ isEditing ? t('admin.editModalTitle') : t('admin.createModalTitle') }}
        </h2>
        <p class="text-sm font-medium text-brand-slate">
          {{ isEditing ? t('admin.editModalDesc') : t('admin.createModalDesc') }}
        </p>
        <p v-if="!isEditing && hint" class="mt-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          {{ hint }}
        </p>
      </div>
    </template>

    <form class="flex flex-col gap-4" @submit.prevent="emit('submit')">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UIGlassInput v-model="form.date" type="date" :label="t('admin.dateLabel')" required>
          <template #icon><Calendar :size="18" /></template>
        </UIGlassInput>

        <UIGlassInput v-model="form.time" type="time" :label="t('admin.timeLabel')" required>
          <template #icon><Clock3 :size="18" /></template>
        </UIGlassInput>
      </div>

      <UIGlassInput
        v-model="form.location"
        type="text"
        :label="t('admin.locationLabel')"
        :placeholder="t('admin.locationPlaceholder')"
        required
      >
        <template #icon><MapPin :size="18" /></template>
      </UIGlassInput>

      <UIGlassInput
        v-model.number="form.maxPlayers"
        type="number"
        min="2"
        max="50"
        :label="t('admin.capacityLabel')"
        placeholder="8"
        required
      >
        <template #icon><Users :size="18" /></template>
      </UIGlassInput>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UIGlassInput
          v-model="form.courtNumber"
          type="text"
          :label="t('admin.courtNumberLabel')"
          :placeholder="t('admin.courtNumberPlaceholder')"
        >
          <template #icon><Grid2x2 :size="18" /></template>
        </UIGlassInput>

        <UIGlassInput
          v-model="form.shuttlecockType"
          type="text"
          :label="t('admin.shuttlecockLabel')"
          :placeholder="t('admin.shuttlecockPlaceholder')"
        >
          <template #icon><Feather :size="18" /></template>
        </UIGlassInput>
      </div>

      <div class="flex w-full flex-col gap-2">
        <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
          {{ t('admin.skillLevelLabel') }}
        </label>
        <div class="group relative">
          <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate">
            <Trophy :size="18" />
          </div>
          <div class="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate/80">
            <ChevronDown :size="18" />
          </div>
          <select
            v-model="form.level"
            class="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-brand-ink outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">{{ t('admin.allSkillLevels') }}</option>
            <option v-for="lvl in SKILL_LEVEL_OPTIONS" :key="lvl" :value="lvl">{{ lvl }}</option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <UIGlassButton type="button" variant="secondary" @click="emit('update:modelValue', false)">
          {{ t('common.cancel') }}
        </UIGlassButton>
        <UIGlassButton type="submit" :loading="loading">
          {{ isEditing ? t('admin.saveChangesBtn') : t('admin.createBtn') }}
        </UIGlassButton>
      </div>
    </form>
  </UIGlassModal>
</template>
