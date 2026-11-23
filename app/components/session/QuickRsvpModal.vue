<script setup lang="ts">
import { ArrowRight, Calendar, Clock3, MapPin, User, Users } from 'lucide-vue-next';
import { normalizeGuestCount } from '~/utils/sessionRsvp';

interface QuickSessionSummary {
  id: string;
  date: string;
  time: string;
  location: string;
  maxPlayers?: number;
  status: string;
}

const props = defineProps<{
  modelValue: boolean;
  session: QuickSessionSummary | null;
  mode: 'first-time' | 'edit';
  displayName?: string | null;
  suggestedName?: string | null;
  initialIsJoining: boolean;
  initialGuestCount: number;
  joinedSlots: number;
  maxCapacity: number;
  isUserAlreadyJoining: boolean;
  submitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', payload: { name?: string; isJoining: boolean; guestCount: number }): void;
}>();

const { t } = useI18n();

const localName = ref('');
const localIsJoining = ref(true);
const localGuestCount = ref<number | string>(0);
const nameError = ref('');

const isSessionFullForNewJoin = computed(
  () => props.joinedSlots >= props.maxCapacity && !props.isUserAlreadyJoining,
);

const syncForm = () => {
  localName.value = props.suggestedName || '';
  localIsJoining.value = props.mode === 'first-time' ? true : props.initialIsJoining;
  localGuestCount.value = normalizeGuestCount(props.initialGuestCount);
  nameError.value = '';
};

watch(
  [() => props.modelValue, () => props.session?.id],
  ([isOpen]) => {
    if (isOpen) {
      syncForm();
    }
  },
  { immediate: true },
);

watch(localName, (val) => {
  if (nameError.value && val.trim().length >= 2) {
    nameError.value = '';
  }
});

const closeModal = () => {
  if (!props.submitting) {
    emit('update:modelValue', false);
  }
};

const handleSubmit = () => {
  if (props.submitting || !props.session) return;

  if (props.mode === 'first-time') {
    const trimmed = localName.value.trim();
    if (!trimmed) {
      nameError.value = t('sessionDetail.missingNameDetail');
      return;
    }
    if (trimmed.length < 2) {
      nameError.value = t('profileModal.errorTooShort');
      return;
    }

    emit('submit', {
      name: trimmed,
      isJoining: true,
      guestCount: normalizeGuestCount(localGuestCount.value),
    });
    return;
  }

  emit('submit', {
    isJoining: localIsJoining.value,
    guestCount: localIsJoining.value ? normalizeGuestCount(localGuestCount.value) : 0,
  });
};
</script>

<template>
  <UIGlassModal
    :model-value="modelValue"
    :persistent="submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="space-y-3 pr-8">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">
            {{ t('home.quickRsvpTitle') }}
          </h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            {{ mode === 'first-time' ? t('home.quickRsvpFirstTimeDesc') : t('home.quickRsvpEditDesc') }}
          </p>
        </div>

        <div
          v-if="session"
          class="rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-xs font-semibold text-brand-ink space-y-1.5"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 font-black">
              <Calendar :size="13" class="text-brand-court" />
              {{ formatDisplayDate(session.date) }}
            </span>
            <span class="inline-flex items-center gap-1 text-brand-court font-bold tabular-nums">
              <Users :size="13" />
              {{ t('home.capacityJoined', { count: joinedSlots, max: maxCapacity }) }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-brand-slate">
            <span class="inline-flex items-center gap-1">
              <Clock3 :size="12" class="text-brand-court shrink-0" />
              {{ session.time }}
            </span>
            <span class="inline-flex items-center gap-1 truncate">
              <MapPin :size="12" class="text-brand-blue shrink-0" />
              <span class="truncate">{{ session.location }}</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <form v-if="session" class="space-y-4 pb-4" @submit.prevent="handleSubmit">
      <template v-if="mode === 'first-time'">
        <div class="space-y-1.5">
          <UIGlassInput
            v-model="localName"
            :label="t('sessionDetail.yourName')"
            :placeholder="t('sessionDetail.enterYourName')"
            :disabled="submitting"
            required
            maxlength="255"
          >
            <template #icon><User :size="16" /></template>
          </UIGlassInput>
          <p v-if="nameError" class="px-1 text-xs font-semibold text-red-600">
            {{ nameError }}
          </p>
        </div>

        <UIGlassInput
          v-model.number="localGuestCount"
          type="number"
          min="0"
          :label="t('sessionDetail.guests')"
          :disabled="submitting"
          placeholder="0"
        >
          <template #icon><Users :size="16" /></template>
        </UIGlassInput>
      </template>

      <template v-else>
        <div class="rounded-2xl border border-brand-line bg-brand-sand px-4 py-3">
          <p class="text-xs font-medium text-brand-slate">{{ t('sessionDetail.playingAs') }}</p>
          <p class="mt-0.5 text-base font-black text-brand-ink">{{ displayName }}</p>
        </div>

        <div
          v-if="isSessionFullForNewJoin"
          class="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs font-bold text-amber-900"
        >
          {{ t('sessionDetail.sessionFullNotice', { max: maxCapacity }) }}
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label
            class="cursor-pointer"
            :class="{ 'opacity-50 cursor-not-allowed': isSessionFullForNewJoin }"
          >
            <input
              v-model="localIsJoining"
              type="radio"
              :value="true"
              :disabled="isSessionFullForNewJoin || submitting"
              class="peer hidden"
            />
            <div
              class="rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-center text-sm font-bold transition-all peer-checked:border-brand-court peer-checked:bg-emerald-50"
            >
              {{ isSessionFullForNewJoin ? t('sessionDetail.sessionFull') : t('sessionDetail.imJoining') }}
            </div>
          </label>
          <label class="cursor-pointer">
            <input
              v-model="localIsJoining"
              type="radio"
              :value="false"
              :disabled="submitting"
              class="peer hidden"
            />
            <div
              class="rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-center text-sm font-bold transition-all peer-checked:border-red-200 peer-checked:bg-red-50"
            >
              {{ t('sessionDetail.cantMakeIt') }}
            </div>
          </label>
        </div>

        <UIGlassInput
          v-if="localIsJoining"
          v-model.number="localGuestCount"
          type="number"
          min="0"
          :label="t('sessionDetail.guests')"
          :disabled="submitting"
          placeholder="0"
        >
          <template #icon><Users :size="16" /></template>
        </UIGlassInput>
      </template>

      <div class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-lg border border-brand-line px-4 py-2.5 text-sm font-bold text-brand-slate transition-colors hover:bg-brand-sand hover:text-brand-ink disabled:opacity-50"
            :disabled="submitting"
            @click="closeModal"
          >
            {{ t('common.cancel') }}
          </button>
          <UIGlassButton
            type="submit"
            :loading="submitting"
            class="sm:min-w-[160px] !py-2.5"
          >
            {{ mode === 'first-time' ? t('home.confirmJoin') : t('sessionDetail.update') }}
          </UIGlassButton>
        </div>

        <div class="border-t border-brand-line/70 pt-3 text-center">
          <NuxtLink
            :to="`/session/${session.id}`"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-brand-slate transition-colors hover:text-brand-court"
            @click="emit('update:modelValue', false)"
          >
            <span>{{ t('home.viewMatch') }}</span>
            <ArrowRight :size="13" />
          </NuxtLink>
        </div>
      </div>
    </form>
  </UIGlassModal>
</template>
