<script setup lang="ts">
import { useUIConfirm } from '~/composables/useUIConfirm'
import { CircleAlert, Info } from 'lucide-vue-next'

const { state, accept, reject } = useUIConfirm()
</script>

<template>
  <UIGlassModal
    v-model="state.visible"
    :persistent="true"
    :show-close="false"
  >
    <template #header>
      <div v-if="state.options?.header" class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
          <CircleAlert v-if="state.options?.severity === 'danger'" :size="24" class="text-red-500" />
          <Info v-else :size="24" class="text-brand-court" />
        </div>
        <h3 class="text-2xl font-black tracking-tight text-brand-ink">
          {{ state.options?.header }}
        </h3>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-lg font-medium text-brand-slate">
        {{ state.options?.message }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UIGlassButton
          variant="secondary"
          @click="reject"
        >
          {{ state.options?.rejectLabel || 'Cancel' }}
        </UIGlassButton>
        <UIGlassButton
          :variant="state.options?.severity === 'danger' ? 'primary' : 'primary'"
          :class="state.options?.severity === 'danger' ? '!bg-red-500 !border-red-500 hover:!bg-red-600' : ''"
          @click="accept"
        >
          {{ state.options?.acceptLabel || 'Confirm' }}
        </UIGlassButton>
      </div>
    </template>
  </UIGlassModal>
</template>
