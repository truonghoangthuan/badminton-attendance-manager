<script setup lang="ts">
import { doc, updateDoc } from 'firebase/firestore';
import { QrCode, Building2, CreditCard, UserCheck, Save, ChevronDown } from 'lucide-vue-next';
import { COMMON_VIETNAMESE_BANKS, generateVietQRUrl, resolveBankCode } from '~/utils/vietqr';

const props = defineProps<{
  sessionId: string;
  bankInfo?: {
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  } | null;
}>();

const { db } = useFirebase();
const toast = useToast();
const { t } = useI18n();

const bankForm = ref({
  bankName: '',
  bankCode: '',
  accountNumber: '',
  accountName: '',
});

const previewError = ref(false);

watch(
  () => props.bankInfo,
  (newVal) => {
    const resolved = newVal?.bankCode || resolveBankCode(newVal?.bankName) || '';
    bankForm.value = {
      bankName: newVal?.bankName || '',
      bankCode: resolved,
      accountNumber: newVal?.accountNumber || '',
      accountName: newVal?.accountName || '',
    };
  },
  { immediate: true, deep: true }
);

const onBankSelect = (event: Event) => {
  const code = (event.target as HTMLSelectElement).value;
  if (!code) {
    bankForm.value.bankCode = '';
    return;
  }
  const bank = COMMON_VIETNAMESE_BANKS.find((b) => b.code === code);
  if (bank) {
    bankForm.value.bankCode = bank.code;
    bankForm.value.bankName = bank.name;
  }
};

const liveVietQRPreviewUrl = computed(() => {
  if (!bankForm.value.accountNumber || (!bankForm.value.bankCode && !bankForm.value.bankName)) {
    return '';
  }
  return generateVietQRUrl({
    bankId: bankForm.value.bankCode || bankForm.value.bankName,
    accountNumber: bankForm.value.accountNumber,
    accountName: bankForm.value.accountName,
    template: 'qr_only',
  });
});

watch(liveVietQRPreviewUrl, () => {
  previewError.value = false;
});

const savingBank = ref(false);

const saveBankDetails = async () => {
  savingBank.value = true;
  try {
    const resolvedCode = resolveBankCode(bankForm.value.bankCode || bankForm.value.bankName);
    await updateDoc(doc(db, 'sessions', props.sessionId), {
      bankInfo: {
        bankName: bankForm.value.bankName.trim(),
        bankCode: resolvedCode,
        accountNumber: bankForm.value.accountNumber.trim(),
        accountName: bankForm.value.accountName.trim(),
      },
    });
    bankForm.value.bankCode = resolvedCode;
    toast.add({
      severity: 'success',
      summary: t('admin.qr.savedSuccess'),
      detail: t('admin.qr.savedDetail'),
      life: 3000,
    });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('admin.qr.failedSave'),
      detail: t('admin.qr.failedSaveDetail'),
      life: 3000,
    });
  } finally {
    savingBank.value = false;
  }
};
</script>

<template>
  <UIGlassCard class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="section-kicker">{{ t('admin.qr.kicker') }}</p>
        <h2 class="mt-2 text-2xl font-black tracking-tight">{{ t('admin.qr.title') }}</h2>
        <p class="mt-1 text-sm font-medium text-brand-slate">
          {{ t('admin.qr.subtitle') }}
        </p>
      </div>
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
        <QrCode :size="22" />
      </div>
    </div>

    <!-- Direct Banking Details Form -->
    <div class="space-y-4">
      <form @submit.prevent="saveBankDetails" class="space-y-4">
        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <!-- Full-width Standard Bank Selector -->
          <div class="flex w-full flex-col gap-2 sm:col-span-2">
            <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
              {{ t('admin.qr.selectBankLabel') }}
            </label>
            <div class="group relative">
              <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
                <Building2 :size="16" />
              </div>
              <div class="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                <ChevronDown :size="16" />
              </div>
              <select
                :value="bankForm.bankCode"
                @change="onBankSelect"
                class="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-brand-ink outline-none transition-all hover:border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{{ t('admin.qr.chooseStandardBank') }}</option>
                <option v-for="bank in COMMON_VIETNAMESE_BANKS" :key="bank.code" :value="bank.code">
                  {{ bank.code }} - {{ bank.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Bank Name & Account Number side-by-side -->
          <UIGlassInput
            v-model="bankForm.bankName"
            type="text"
            :label="t('admin.qr.bankNameLabel')"
            :placeholder="t('admin.qr.bankNamePlaceholder')"
          >
            <template #icon><Building2 :size="16" /></template>
          </UIGlassInput>

          <UIGlassInput
            v-model="bankForm.accountNumber"
            type="text"
            :label="t('admin.qr.accountNumberLabel')"
            :placeholder="t('admin.qr.accountNumberPlaceholder')"
            required
          >
            <template #icon><CreditCard :size="16" /></template>
          </UIGlassInput>

          <!-- Full-width Account Holder Name -->
          <div class="sm:col-span-2">
            <UIGlassInput
              v-model="bankForm.accountName"
              type="text"
              :label="t('admin.qr.accountNameLabel')"
              :placeholder="t('admin.qr.accountNamePlaceholder')"
            >
              <template #icon><UserCheck :size="16" /></template>
            </UIGlassInput>
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-1">
          <p class="text-xs leading-relaxed text-brand-slate">
            {{ t('admin.qr.vietQrHint') }}
          </p>
          <UIGlassButton type="submit" :loading="savingBank" class="w-full justify-center !py-2.5 !text-xs font-bold">
            <template #icon-left><Save :size="14" /></template>
            {{ t('admin.qr.saveBankBtn') }}
          </UIGlassButton>
        </div>
      </form>

      <!-- Dynamic VietQR Live Preview -->
      <div
        v-if="liveVietQRPreviewUrl"
        class="mt-4 flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row"
      >
        <div class="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm flex items-center justify-center">
          <img
            v-if="!previewError"
            :src="liveVietQRPreviewUrl"
            alt="VietQR Dynamic Preview"
            class="h-28 w-28 object-contain"
            @error="previewError = true"
            @load="previewError = false"
          />
          <div v-else class="flex h-28 w-28 flex-col items-center justify-center p-2 text-center text-slate-500">
            <QrCode :size="24" class="opacity-40" />
            <p class="mt-1 text-[10px] font-bold text-amber-600">{{ t('sessionDetail.qrLoadError') }}</p>
          </div>
        </div>
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-1.5 rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <QrCode :size="10" />
            {{ t('admin.qr.dynamicVietQrActive') }}
          </div>
          <p class="text-sm font-bold text-brand-ink">{{ t('admin.qr.dynamicVietQrReady') }}</p>
          <p class="text-xs font-medium text-slate-600 leading-relaxed">
            {{ t('admin.qr.dynamicVietQrDesc') }}
          </p>
        </div>
      </div>
    </div>
  </UIGlassCard>
</template>
