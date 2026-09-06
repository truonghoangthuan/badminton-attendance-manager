<script setup lang="ts">
import { AlertCircle, Check, Copy, MessageSquareShare, QrCode, Share2, Sparkles, X } from 'lucide-vue-next';
import { generateSessionInviteText, generateSessionSettlementText } from '~/utils/sessionSocialShare';
import { generateVietQRUrl } from '~/utils/vietqr';

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
const qrCopied = ref(false);
const qrLoading = ref(true);
const qrError = ref(false);
const toast = useToast();
const { t } = useI18n();

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

const inviteUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }
  return '/';
});

const vietQRUrl = computed(() => {
  if (props.session?.paymentQR) {
    return props.session.paymentQR;
  }
  const bankInfo = props.session?.bankInfo;
  if (!bankInfo?.accountNumber || (!bankInfo?.bankName && !bankInfo?.bankCode)) {
    return '';
  }
  const feePerPerson = props.financials?.calculatedFeePerPerson || 0;
  const memoDate = props.session?.date ? props.session.date.replace(/-/g, '') : '';
  return generateVietQRUrl({
    bankId: bankInfo.bankCode || bankInfo.bankName,
    accountNumber: bankInfo.accountNumber,
    accountName: bankInfo.accountName,
    amount: feePerPerson > 0 ? feePerPerson : undefined,
    memo: `BDM ${memoDate}`.trim(),
    template: 'compact2',
  });
});

watch(vietQRUrl, () => {
  qrLoading.value = true;
  qrError.value = false;
});

const inviteText = computed(() => {
  return generateSessionInviteText(props.session, props.attendances || [], inviteUrl.value);
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
      summary: t('common.copied'),
      detail: t('socialShare.toastCopied'),
      life: 3000,
    });
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

const fetchQRBlob = async (): Promise<Blob | null> => {
  if (!vietQRUrl.value) return null;
  try {
    const response = await fetch(vietQRUrl.value);
    if (!response.ok) throw new Error('Fetch image failed');
    return await response.blob();
  } catch (err) {
    console.error('Failed to fetch QR blob:', err);
    return null;
  }
};

const copyQRImage = async () => {
  if (!vietQRUrl.value) return;
  try {
    const blob = await fetchQRBlob();
    if (!blob) throw new Error('Could not get image blob');

    const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);

    qrCopied.value = true;
    setTimeout(() => {
      qrCopied.value = false;
    }, 2500);

    toast.add({
      severity: 'success',
      summary: t('common.copied'),
      detail: t('socialShare.toastQRCopied'),
      life: 3000,
    });
  } catch (err) {
    console.error('Failed to copy QR image:', err);
    toast.add({
      severity: 'warn',
      summary: t('common.notice'),
      detail: t('socialShare.copyQRFailed'),
      life: 4000,
    });
  }
};

const handleNativeShare = async () => {
  if (typeof navigator === 'undefined' || !navigator.share) {
    copyContent();
    return;
  }

  try {
    if (activeTab.value === 'settlement' && vietQRUrl.value && navigator.canShare) {
      const blob = await fetchQRBlob();
      if (blob) {
        const file = new File([blob], 'vietqr.png', { type: blob.type || 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Badminton - ${props.session?.date || ''}`,
            text: currentText.value,
            files: [file],
          });
          return;
        }
      }
    }

    await navigator.share({
      title: `Badminton - ${props.session?.date || ''}`,
      text: currentText.value,
      url: activeTab.value === 'invite' ? inviteUrl.value : sessionUrl.value,
    });
  } catch (e) {
    // User cancelled or share failed
  }
};
</script>

<template>
  <UIGlassModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <template #header>
      <div class="flex flex-col gap-2 text-center">
        <div class="inline-flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-brand-court">
          <MessageSquareShare :size="16" />
          <span>{{ t('socialShare.socialGenerator') }}</span>
        </div>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-brand-ink">
            {{ t('socialShare.shareZaloMessenger') }}
          </h2>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            {{ t('socialShare.shareModalDesc') }}
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
          <span>{{ t('socialShare.inviteTab') }}</span>
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
          <span>{{ t('socialShare.settlementTab') }}</span>
        </button>
      </div>

      <!-- Preview Text Area -->
      <div class="relative">
        <textarea
          :value="currentText"
          readonly
          :rows="activeTab === 'settlement' ? 7 : 9"
          class="w-full resize-none rounded-2xl border border-brand-line bg-white/90 p-4 font-mono text-xs leading-relaxed text-brand-ink shadow-inner outline-none focus:border-brand-court focus:ring-2 focus:ring-brand-court/10"
        />
        <div class="pointer-events-none absolute bottom-3 right-3 text-[10px] font-bold text-brand-slate/60">
          {{ t('socialShare.autoUpdatesNotice') }}
        </div>
      </div>

      <!-- VietQR Image Preview Card (Settlement Tab) -->
      <div
        v-if="activeTab === 'settlement' && vietQRUrl"
        class="overflow-hidden rounded-2xl border border-brand-line bg-gradient-to-b from-white/95 to-brand-sand/50 p-3 shadow-sm transition-all"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-court">
            <QrCode :size="14" />
            <span>{{ t('socialShare.qrPaymentCard') }}</span>
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-brand-line bg-white px-2.5 py-1 text-xs font-bold text-brand-ink shadow-sm transition-all hover:border-brand-court hover:bg-brand-sand active:scale-95"
            @click="copyQRImage"
          >
            <Check v-if="qrCopied" :size="13" class="text-emerald-600" />
            <Copy v-else :size="13" class="text-brand-slate" />
            <span :class="{ 'text-emerald-600': qrCopied }">
              {{ qrCopied ? t('socialShare.copiedQRImage') : t('socialShare.copyQRImage') }}
            </span>
          </button>
        </div>

        <div class="relative flex min-h-[160px] items-center justify-center rounded-xl bg-white p-2 border border-brand-line/60">
          <div
            v-if="qrLoading && !qrError"
            class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs rounded-xl"
          >
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand-court border-t-transparent" />
          </div>
          <img
            :src="vietQRUrl"
            alt="VietQR Payment Card"
            class="max-h-72 w-full object-contain rounded-lg transition-opacity duration-300"
            :class="qrLoading ? 'opacity-0' : 'opacity-100'"
            @load="qrLoading = false"
            @error="qrError = true; qrLoading = false"
          />
          <div v-if="qrError" class="p-4 text-center text-xs font-medium text-amber-700">
            {{ t('socialShare.copyQRFailed') }}
          </div>
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
          <span>{{ t('socialShare.nativeShare') }}</span>
        </button>

        <UIGlassButton
          class="!w-full sm:!w-auto !px-6 !py-2.5 !text-sm"
          @click="copyContent"
        >
          <template #icon-left>
            <Check v-if="copied" :size="16" class="text-emerald-300" />
            <Copy v-else :size="16" />
          </template>
          <span>{{ copied ? t('socialShare.copiedText') : t('socialShare.copyButton') }}</span>
        </UIGlassButton>
      </div>
    </div>
  </UIGlassModal>
</template>

