<script setup lang="ts">
import { Check, Copy, MessageSquareShare, Share2, Sparkles, X } from 'lucide-vue-next';
import { generateSessionInviteText, generateSessionSettlementText } from '~/utils/sessionSocialShare';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    session: any;
    attendances: any[];
    financials?: any;
    initialTab?: 'invite' | 'settlement';
  }>(),
  {
    initialTab: 'invite',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const activeTab = ref<'invite' | 'settlement'>(props.initialTab);
const copied = ref(false);
const toast = useToast();

watch(
  () => props.initialTab,
  (val) => {
    if (val) activeTab.value = val;
  }
);

const sessionUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/session/${props.session?.id}`;
  }
  return `/session/${props.session?.id}`;
});

const inviteText = computed(() => {
  return generateSessionInviteText(props.session, props.attendances || [], sessionUrl.value);
});

const settlementText = computed(() => {
  return generateSessionSettlementText(
    props.session,
    props.attendances || [],
    props.financials,
    sessionUrl.value
  );
});

const currentText = computed(() => {
  return activeTab.value === 'invite' ? inviteText.value : settlementText.value;
});

const copyContent = async () => {
  if (!currentText.value) return;
  try {
    await navigator.clipboard.writeText(currentText.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);

    toast.add({
      severity: 'success',
      summary: 'Đã sao chép!',
      detail: activeTab.value === 'invite' ? 'Đã sao chép lời mời vào clipboard.' : 'Đã sao chép tổng kết tiền sân vào clipboard.',
      life: 3000,
    });
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

const handleNativeShare = async () => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Cầu lông - ${props.session?.date}`,
        text: currentText.value,
        url: sessionUrl.value,
      });
    } catch (e) {
      // User cancelled or share failed
    }
  } else {
    copyContent();
  }
};
</script>

<template>
  <UIGlassModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <div class="inline-flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-brand-court">
          <MessageSquareShare :size="16" />
          <span>Social Announcement Generator</span>
        </div>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">
            Chia sẻ nhóm Zalo / Messenger
          </h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            Sao chép nhanh thông báo định dạng sẵn để dán vào nhóm chat.
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Tab Switcher -->
      <div class="grid grid-cols-2 gap-2 rounded-2xl border border-brand-line bg-brand-sand/80 p-1.5">
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all"
          :class="
            activeTab === 'invite'
              ? 'bg-white text-brand-court shadow-sm'
              : 'text-brand-slate hover:text-brand-ink'
          "
          @click="activeTab = 'invite'"
        >
          <span>Lời mời tham gia</span>
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all"
          :class="
            activeTab === 'settlement'
              ? 'bg-white text-brand-court shadow-sm'
              : 'text-brand-slate hover:text-brand-ink'
          "
          @click="activeTab = 'settlement'"
        >
          <span>Tổng kết chi phí</span>
        </button>
      </div>

      <!-- Preview Text Area -->
      <div class="relative">
        <textarea
          :value="currentText"
          readonly
          rows="11"
          class="w-full resize-none rounded-2xl border border-brand-line bg-white/90 p-4 font-mono text-xs leading-relaxed text-brand-ink shadow-inner outline-none focus:border-brand-court focus:ring-2 focus:ring-brand-court/10"
        />
        <div class="pointer-events-none absolute bottom-3 right-3 text-[10px] font-bold text-brand-slate/60">
          Tự động cập nhật theo dữ liệu thực tế
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-sand px-4 py-2.5 text-xs font-bold text-brand-ink transition-all hover:bg-white active:scale-95"
          @click="handleNativeShare"
        >
          <Share2 :size="15" />
          <span>Chia sẻ hệ thống</span>
        </button>

        <UIGlassButton
          class="!w-full sm:!w-auto !px-6 !py-2.5 !text-sm"
          @click="copyContent"
        >
          <template #icon-left>
            <Check v-if="copied" :size="16" class="text-emerald-300" />
            <Copy v-else :size="16" />
          </template>
          <span>{{ copied ? 'Đã sao chép vào bộ nhớ!' : 'Sao chép nội dung' }}</span>
        </UIGlassButton>
      </div>
    </div>
  </UIGlassModal>
</template>
