<script setup lang="ts">
import { Maximize2, QrCode, X, Copy, Check, AlertCircle } from 'lucide-vue-next';
import { generateVietQRUrl } from '~/utils/vietqr';

const props = defineProps<{
  showFeeBreakdown?: boolean;
  shuttlecockPackPrice?: number;
  shuttlecockPrice?: number;
  shuttlecocksUsed?: number;
  packShuttlecockCost?: number;
  additionalShuttlecocksUsed?: number;
  additionalShuttlecockPrice?: number;
  additionalShuttlecockCost?: number;
  shuttlecockCost?: number;
  courtCost?: number;
  totalSessionCost?: number;
  totalActualPlayers?: number;
  calculatedFeePerPerson?: number;
  personalAmount?: number;
  bankInfo?: {
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  } | null;
}>();

const { t } = useI18n();
const showExpand = ref(false);
const toast = useToast();
const copiedField = ref<string | null>(null);
const qrImageError = ref(false);

const dynamicVietQRUrl = computed(() => {
  if (!props.bankInfo?.accountNumber || (!props.bankInfo?.bankName && !props.bankInfo?.bankCode)) {
    return '';
  }
  return generateVietQRUrl({
    bankId: props.bankInfo.bankCode || props.bankInfo.bankName,
    accountNumber: props.bankInfo.accountNumber,
    accountName: props.bankInfo.accountName,
    amount: props.personalAmount && props.personalAmount > 0 ? props.personalAmount : undefined,
    template: 'qr_only',
  });
});

watch(dynamicVietQRUrl, () => {
  qrImageError.value = false;
});

const onImageError = () => {
  qrImageError.value = true;
};

const onImageLoad = () => {
  qrImageError.value = false;
};

const copyText = async (text: string, fieldId: string, label: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = fieldId;
    setTimeout(() => {
      if (copiedField.value === fieldId) copiedField.value = null;
    }, 2000);
    toast.add({
      severity: 'success',
      summary: t('common.copied'),
      detail: `${t('common.copied')} ${label}`,
      life: 2500,
    });
  } catch (e) {
    console.error('Copy failed', e);
  }
};
</script>

<template>
  <div
    v-if="!dynamicVietQRUrl && !bankInfo?.accountNumber"
    class="rounded-2xl border border-dashed border-brand-line bg-brand-sand px-6 py-8 text-center text-brand-slate"
  >
    <QrCode :size="32" class="mx-auto opacity-40" />
    <p class="mt-4 font-black text-brand-ink">{{ t('sessionDetail.noPaymentDetails') }}</p>
    <p class="mt-1 text-sm font-medium">{{ t('sessionDetail.payAtCourt') }}</p>
  </div>

  <UIGlassCard v-else class="relative overflow-hidden space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center">
      <!-- QR Image if present -->
      <div
        v-if="dynamicVietQRUrl"
        class="group relative aspect-square w-full shrink-0 border-b border-brand-line bg-white p-6 sm:w-52 sm:border-b-0 sm:border-r flex flex-col items-center justify-center"
      >
        <img
          v-if="!qrImageError"
          :src="dynamicVietQRUrl"
          alt="Scan to pay"
          class="h-full w-full object-contain"
          @error="onImageError"
          @load="onImageLoad"
        />
        <div v-else class="flex flex-col items-center justify-center text-center p-3 text-brand-slate">
          <AlertCircle :size="32" class="text-amber-500 opacity-80" />
          <p class="mt-2 text-xs font-black text-brand-ink">{{ t('sessionDetail.qrLoadError') }}</p>
          <p class="mt-1 text-[11px] leading-tight text-brand-slate">{{ t('sessionDetail.useBankInfoBelow') }}</p>
        </div>

        <button
          v-if="!qrImageError"
          class="absolute inset-0 flex items-center justify-center bg-brand-ink/40 opacity-0 transition-opacity hover:opacity-100"
          @click="showExpand = true"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-ink shadow-lg transition-transform hover:scale-110"
          >
            <Maximize2 :size="18" />
          </div>
        </button>

        <!-- Dynamic indicator badge -->
        <div
          v-if="!qrImageError"
          class="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 rounded-md bg-emerald-600/90 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm tabular-nums"
        >
          <QrCode :size="10" />
          <span v-if="personalAmount && personalAmount > 0">{{ t('sessionDetail.prefilled', { amount: formatVnd(personalAmount) }) }}</span>
          <span v-else>{{ t('sessionDetail.smartVietQr') }}</span>
        </div>
      </div>

      <!-- Fee Breakdown -->
      <div class="flex-1 space-y-4 p-6 sm:py-0">
        <div v-if="showFeeBreakdown">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-court">{{ t('sessionDetail.feeFormulaTitle') }}</p>
          <h3 class="mt-1 text-xl font-black tracking-tight text-brand-ink">{{ t('sessionDetail.feeFormulaHeading') }}</h3>
        </div>

        <div v-if="showFeeBreakdown" class="space-y-1 text-sm font-medium text-brand-slate tabular-nums">
          <p>
            {{
              t('sessionDetail.shuttlePriceLine', {
                packPrice: formatVnd(shuttlecockPackPrice),
                unitPrice: formatVnd(shuttlecockPrice),
              })
            }}
          </p>
          <p>
            {{
              t('sessionDetail.shuttleCostLine', {
                count: shuttlecocksUsed || 0,
                unitPrice: formatVnd(shuttlecockPrice),
                total: formatVnd(packShuttlecockCost ?? shuttlecockCost),
              })
            }}
          </p>
          <p v-if="(additionalShuttlecocksUsed || 0) > 0">
            {{
              t('sessionDetail.additionalShuttleCostLine', {
                count: additionalShuttlecocksUsed,
                price: formatVnd(additionalShuttlecockPrice),
                total: formatVnd(additionalShuttlecockCost),
              })
            }}
          </p>
          <p>{{ t('sessionDetail.courtCostLine', { courtCost: formatVnd(courtCost) }) }}</p>
          <p>
            {{
              t('sessionDetail.totalCostLine', {
                courtCost: formatVnd(courtCost),
                shuttleCost: formatVnd(shuttlecockCost),
                total: formatVnd(totalSessionCost),
              })
            }}
          </p>
          <p class="text-brand-court font-black">
            <template v-if="(totalActualPlayers || 0) > 0">
              {{
                t('sessionDetail.feePerPersonLine', {
                  total: formatVnd(totalSessionCost),
                  count: totalActualPlayers,
                  fee: formatVnd(calculatedFeePerPerson),
                })
              }}
            </template>
            <template v-else>
              {{ t('sessionDetail.waitingForCheckin') }}
            </template>
          </p>
        </div>
      </div>
    </div>

    <!-- 1-Tap Copy Banking Details -->
    <div
      v-if="bankInfo?.accountNumber || bankInfo?.bankName"
      class="border-t border-brand-line/70 pt-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">
          {{ t('sessionDetail.mobileBankingTitle') }}
        </p>
        <span class="rounded-full bg-brand-court/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-court">
          {{ t('sessionDetail.oneTapCopy') }}
        </span>
      </div>

      <div class="grid gap-2.5">
        <!-- Bank & Account Number -->
        <div class="flex items-center justify-between rounded-2xl border border-brand-line bg-brand-sand/70 p-3.5">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-brand-slate">
              {{ bankInfo.bankName || 'Bank Account' }}
            </p>
            <p class="mt-0.5 truncate font-mono text-base font-black tracking-wider text-brand-ink">
              {{ bankInfo.accountNumber }}
            </p>
            <p v-if="bankInfo.accountName" class="text-[11px] font-bold text-brand-slate uppercase truncate">
              {{ bankInfo.accountName }}
            </p>
          </div>
          <button
            v-if="bankInfo.accountNumber"
            type="button"
            class="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-line bg-white text-brand-ink transition-all hover:border-brand-court hover:bg-brand-sand active:scale-95"
            :title="'Copy ' + bankInfo.accountNumber"
            @click="copyText(bankInfo.accountNumber, 'account', bankInfo.accountNumber)"
          >
            <Check v-if="copiedField === 'account'" :size="16" class="text-emerald-600" />
            <Copy v-else :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expansion Backdrop -->
    <Teleport to="body">
      <div
        v-if="showExpand"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/80 p-6 backdrop-blur-xl"
        @click="showExpand = false"
      >
        <div
          class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-2xl transition-all"
          @click.stop
        >
          <button
            class="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-brand-sand text-brand-ink hover:bg-brand-line"
            @click="showExpand = false"
          >
            <X :size="20" />
          </button>

          <div class="mt-8 text-center">
            <h2 class="text-3xl font-black tracking-tighter text-brand-ink">{{ t('sessionDetail.scanAndPay') }}</h2>
            <p class="mt-2 text-sm font-medium text-brand-slate">
              {{ t('sessionDetail.scanToPayDesc') }}
            </p>
          </div>

          <div class="my-8 aspect-square w-full rounded-2xl border-8 border-brand-sand bg-white p-4 shadow-inner">
            <img :src="dynamicVietQRUrl || undefined" alt="Payment QR" class="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </Teleport>
  </UIGlassCard>
</template>
