<script setup lang="ts">
import { Maximize2, QrCode, X, Copy, Check, Sparkles, Image as ImageIcon } from 'lucide-vue-next';
import { generateVietQRUrl } from '~/utils/vietqr';

const props = defineProps<{
  qrUrl?: string | null;
  showFeeBreakdown?: boolean;
  shuttlecockPackPrice?: number;
  shuttlecockPrice?: number;
  shuttlecocksUsed?: number;
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
  sessionDate?: string;
  userName?: string;
}>();

const showExpand = ref(false);
const toast = useToast();
const copiedField = ref<string | null>(null);

const transferMemo = computed(() => {
  const dateFormatted = props.sessionDate ? props.sessionDate.replace(/-/g, '') : '';
  const name = (props.userName || '').trim().replace(/\s+/g, ' ');
  return `BDM ${dateFormatted} ${name}`.trim();
});

const dynamicVietQRUrl = computed(() => {
  if (!props.bankInfo?.accountNumber || (!props.bankInfo?.bankName && !props.bankInfo?.bankCode)) {
    return '';
  }
  return generateVietQRUrl({
    bankId: props.bankInfo.bankCode || props.bankInfo.bankName,
    accountNumber: props.bankInfo.accountNumber,
    accountName: props.bankInfo.accountName,
    amount: props.personalAmount && props.personalAmount > 0 ? props.personalAmount : undefined,
    memo: transferMemo.value,
    template: 'compact2',
  });
});

const hasCustomQR = computed(() => !!props.qrUrl);
const hasDynamicQR = computed(() => !!dynamicVietQRUrl.value);
const selectedQRType = ref<'dynamic' | 'custom'>('dynamic');

watchEffect(() => {
  if (!hasDynamicQR.value && hasCustomQR.value) {
    selectedQRType.value = 'custom';
  } else if (hasDynamicQR.value && !hasCustomQR.value) {
    selectedQRType.value = 'dynamic';
  }
});

const currentDisplayQR = computed(() => {
  if (selectedQRType.value === 'custom' && hasCustomQR.value) {
    return props.qrUrl!;
  }
  return dynamicVietQRUrl.value || props.qrUrl || '';
});

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
      summary: 'Copied!',
      detail: `Copied ${label}`,
      life: 2500,
    });
  } catch (e) {
    console.error('Copy failed', e);
  }
};

const formatCurrency = (value: number | undefined) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};
</script>

<template>
  <div
    v-if="!currentDisplayQR && !bankInfo?.accountNumber"
    class="rounded-[32px] border border-dashed border-brand-line bg-brand-sand px-6 py-8 text-center text-brand-slate"
  >
    <QrCode :size="32" class="mx-auto opacity-40" />
    <p class="mt-4 font-black text-brand-ink">No payment details uploaded</p>
    <p class="mt-1 text-sm font-medium">Please pay directly at the court.</p>
  </div>

  <UIGlassCard v-else class="relative overflow-hidden space-y-4">
    <!-- QR Mode Switcher if both dynamic VietQR and uploaded custom QR exist -->
    <div v-if="hasDynamicQR && hasCustomQR" class="flex items-center justify-between pb-2 border-b border-brand-line/60">
      <p class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-slate">Payment QR Option</p>
      <div class="flex items-center gap-1 rounded-xl bg-brand-sand/80 p-1 border border-brand-line">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
          :class="selectedQRType === 'dynamic' ? 'bg-white text-brand-court shadow-sm' : 'text-brand-slate hover:text-brand-ink'"
          @click="selectedQRType = 'dynamic'"
        >
          <Sparkles :size="12" />
          Dynamic VietQR
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
          :class="selectedQRType === 'custom' ? 'bg-white text-brand-court shadow-sm' : 'text-brand-slate hover:text-brand-ink'"
          @click="selectedQRType = 'custom'"
        >
          <ImageIcon :size="12" />
          Custom QR
        </button>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center">
      <!-- QR Image if present -->
      <div
        v-if="currentDisplayQR"
        class="group relative aspect-square w-full shrink-0 border-b border-brand-line bg-white p-6 sm:w-52 sm:border-b-0 sm:border-r flex flex-col items-center justify-center"
      >
        <img :src="currentDisplayQR" alt="Scan to pay" class="h-full w-full object-contain" />
        <button
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
          v-if="selectedQRType === 'dynamic'"
          class="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 rounded-md bg-emerald-600/90 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm"
        >
          <Sparkles :size="10" />
          <span v-if="personalAmount && personalAmount > 0">Pre-filled: {{ formatCurrency(personalAmount) }}</span>
          <span v-else>Smart VietQR</span>
        </div>
      </div>

      <!-- Fee Breakdown -->
      <div class="flex-1 space-y-4 p-6 sm:py-0">
        <div v-if="showFeeBreakdown">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-court">Fee formula</p>
          <h3 class="mt-1 text-xl font-black tracking-tight text-brand-ink">How this fee is calculated</h3>
        </div>

        <div v-if="showFeeBreakdown" class="space-y-1 text-sm font-medium text-brand-slate">
          <p>
            Shuttlecock price = {{ formatCurrency(shuttlecockPackPrice) }} / 12 =
            {{ formatCurrency(shuttlecockPrice) }}
          </p>
          <p>
            Shuttlecock cost = {{ shuttlecocksUsed || 0 }} × {{ formatCurrency(shuttlecockPrice) }} =
            {{ formatCurrency(shuttlecockCost) }}
          </p>
          <p>Court cost = {{ formatCurrency(courtCost) }}</p>
          <p>
            Total session cost = {{ formatCurrency(courtCost) }} + {{ formatCurrency(shuttlecockCost) }} =
            {{ formatCurrency(totalSessionCost) }}
          </p>
          <p class="text-brand-court font-black">
            <template v-if="(totalActualPlayers || 0) > 0">
              Fee per person = {{ formatCurrency(totalSessionCost) }} / {{ totalActualPlayers }} player{{
                totalActualPlayers === 1 ? '' : 's'
              }}
              =
              {{ formatCurrency(calculatedFeePerPerson) }}
            </template>
            <template v-else>
              Fee per person = waiting for checked-in players before the split can be calculated.
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
          Mobile Banking Details
        </p>
        <span class="rounded-full bg-brand-court/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-court">
          1-Tap Copy
        </span>
      </div>

      <div class="grid gap-2.5 sm:grid-cols-2">
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
            @click="copyText(bankInfo.accountNumber, 'account', 'account number')"
          >
            <Check v-if="copiedField === 'account'" :size="16" class="text-emerald-600" />
            <Copy v-else :size="16" />
          </button>
        </div>

        <!-- Transfer Memo / Content -->
        <div class="flex items-center justify-between rounded-2xl border border-brand-line bg-brand-sand/70 p-3.5">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-brand-slate">
              Transfer Note / Memo
            </p>
            <p class="mt-0.5 truncate font-mono text-sm font-bold text-brand-ink">
              {{ transferMemo }}
            </p>
            <p class="text-[11px] font-medium text-brand-slate">Include in transfer message</p>
          </div>
          <button
            type="button"
            class="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-line bg-white text-brand-ink transition-all hover:border-brand-court hover:bg-brand-sand active:scale-95"
            :title="'Copy ' + transferMemo"
            @click="copyText(transferMemo, 'memo', 'transfer memo')"
          >
            <Check v-if="copiedField === 'memo'" :size="16" class="text-emerald-600" />
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
          class="relative w-full max-w-md overflow-hidden rounded-[40px] bg-white p-8 shadow-2xl transition-all"
          @click.stop
        >
          <button
            class="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-brand-sand text-brand-ink hover:bg-brand-line"
            @click="showExpand = false"
          >
            <X :size="20" />
          </button>

          <div class="mt-8 text-center">
            <h2 class="text-3xl font-black tracking-tighter text-brand-ink">Scan & Pay</h2>
            <p class="mt-2 text-sm font-medium text-brand-slate">
              Scan this code with your banking app to settle the session fee.
            </p>
          </div>

          <div class="my-8 aspect-square w-full rounded-[32px] border-8 border-brand-sand bg-white p-4 shadow-inner">
            <img :src="currentDisplayQR || undefined" alt="Payment QR" class="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </Teleport>
  </UIGlassCard>
</template>
