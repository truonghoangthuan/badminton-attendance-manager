<script setup lang="ts">
import { doc, updateDoc } from 'firebase/firestore';
import { QrCode, Upload, X, Image as ImageIcon, Trash2, Building2, CreditCard, UserCheck, Save, Sparkles, ChevronDown } from 'lucide-vue-next';
import { COMMON_VIETNAMESE_BANKS, generateVietQRUrl, resolveBankCode } from '~/utils/vietqr';

const props = defineProps<{
  sessionId: string;
  qrUrl?: string | null;
  bankInfo?: {
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  } | null;
}>();

const { db } = useFirebase();
const supabaseQR = useSupabaseQRCode();
const toast = useToast();
const { t } = useI18n();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const previewUrl = ref<string | null>(null);

const bankForm = ref({
  bankName: '',
  bankCode: '',
  accountNumber: '',
  accountName: '',
});

watch(
  () => props.bankInfo,
  (newVal) => {
    bankForm.value = {
      bankName: newVal?.bankName || '',
      bankCode: newVal?.bankCode || resolveBankCode(newVal?.bankName) || '',
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
    memo: 'BDM TEST PAYMENT',
    template: 'compact2',
  });
});

const savingBank = ref(false);

const saveBankDetails = async () => {
  savingBank.value = true;
  try {
    await updateDoc(doc(db, 'sessions', props.sessionId), {
      bankInfo: {
        bankName: bankForm.value.bankName.trim(),
        bankCode: bankForm.value.bankCode || resolveBankCode(bankForm.value.bankName),
        accountNumber: bankForm.value.accountNumber.trim(),
        accountName: bankForm.value.accountName.trim(),
      },
    });
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

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  selectedFile.value = file;

  // Validation
  if (!file.type.startsWith('image/')) {
    toast.add({
      severity: 'error',
      summary: t('admin.qr.invalidFile'),
      detail: t('admin.qr.invalidFileDetail'),
      life: 3000,
    });
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      severity: 'error',
      summary: t('admin.qr.fileTooLarge'),
      detail: t('admin.qr.fileTooLargeDetail'),
      life: 3000,
    });
    return;
  }

  // Preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const upload = async () => {
  if (!selectedFile.value) return;

  uploading.value = true;
  try {
    const downloadURL = await supabaseQR.upload(selectedFile.value, `sessions/${props.sessionId}`);
    await updateDoc(doc(db, 'sessions', props.sessionId), {
      paymentQR: downloadURL,
    });

    toast.add({
      severity: 'success',
      summary: t('admin.qr.uploadSuccess'),
      detail: t('admin.qr.uploadSuccessDetail'),
      life: 3000,
    });
    previewUrl.value = null;
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('admin.qr.uploadFailed'),
      detail: t('admin.qr.uploadFailedDetail'),
      life: 3000,
    });
  } finally {
    uploading.value = false;
  }
};

const removeSessionQR = async () => {
  try {
    if (props.qrUrl) {
      await supabaseQR.remove(props.qrUrl);
    }

    await updateDoc(doc(db, 'sessions', props.sessionId), {
      paymentQR: null,
    });

    toast.add({
      severity: 'success',
      summary: t('admin.qr.deletedSuccess'),
      detail: t('admin.qr.deletedSuccessDetail'),
      life: 3000,
    });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('admin.qr.deleteFailed'),
      detail: t('admin.qr.deleteFailedDetail'),
      life: 3000,
    });
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const cancelPreview = () => {
  previewUrl.value = null;
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
};
</script>

<template>
  <UIGlassCard class="space-y-6">
    <!-- Hidden input for file selection -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*"
      @change="handleFileSelect"
    />

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

    <div v-if="!qrUrl && !previewUrl" class="group relative">
      <div
        class="flex cursor-pointer flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-brand-line bg-brand-sand/50 px-6 py-12 transition-all hover:border-brand-court hover:bg-brand-sand"
        @click="triggerFileInput"
      >
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-slate shadow-sm transition-transform group-hover:scale-110">
          <Upload :size="28" />
        </div>
        <p class="text-center font-black text-brand-ink">{{ t('admin.qr.clickToUpload') }}</p>
        <p class="mt-1 text-center text-sm font-medium text-brand-slate">{{ t('admin.qr.fileFormatHint') }}</p>
      </div>
    </div>

    <div v-else-if="previewUrl" class="space-y-4">
      <div class="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[32px] border-4 border-white bg-white shadow-xl">
        <img :src="previewUrl" alt="QR Preview" class="h-full w-full object-contain p-4" />
        <button
          class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-ink/80 text-white backdrop-blur-md transition-colors hover:bg-brand-ink"
          @click="cancelPreview"
        >
          <X :size="20" />
        </button>
      </div>
      
      <div class="flex gap-3">
        <UIGlassButton class="flex-1" :loading="uploading" @click="upload">
          {{ t('admin.qr.confirmUpload') }}
        </UIGlassButton>
        <UIGlassButton variant="secondary" @click="cancelPreview">
          {{ t('admin.qr.cancel') }}
        </UIGlassButton>
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div class="relative shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg sm:w-48">
        <img :src="qrUrl || undefined" alt="Payment QR" class="aspect-square w-full object-contain p-2" />
        <div class="absolute inset-0 flex items-center justify-center bg-brand-ink/40 opacity-0 transition-opacity hover:opacity-100">
           <UIGlassButton variant="primary" class="scale-90" @click="triggerFileInput">
             {{ t('admin.qr.replace') }}
           </UIGlassButton>
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-4">
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p class="text-sm font-bold text-emerald-700">{{ t('admin.qr.qrActiveTitle') }}</p>
          <p class="mt-1 text-xs font-medium text-emerald-600/80">
            {{ t('admin.qr.qrActiveDesc') }}
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <UIGlassButton variant="secondary" class="!px-4 !py-2.5 !text-sm" @click="triggerFileInput">
            <template #icon-left><ImageIcon :size="14" /></template>
            {{ t('admin.qr.updateQr') }}
          </UIGlassButton>
          <UIGlassButton variant="ghost" class="!px-4 !py-2.5 !text-sm text-red-600 hover:bg-red-50" @click="removeSessionQR">
            <template #icon-left><Trash2 :size="14" /></template>
            {{ t('admin.qr.remove') }}
          </UIGlassButton>
        </div>
      </div>
    </div>

    <!-- Direct Banking Details Form -->
    <div class="border-t border-brand-line pt-6 space-y-4">
      <div>
        <p class="section-kicker">{{ t('admin.qr.mobileBankingKicker') }}</p>
        <h3 class="mt-1 text-lg font-black tracking-tight text-brand-ink">
          {{ t('admin.qr.bankInfoTitle') }}
        </h3>
        <p class="mt-0.5 text-xs font-medium text-brand-slate">
          {{ t('admin.qr.bankInfoDesc') }}
        </p>
      </div>

      <form @submit.prevent="saveBankDetails" class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex w-full flex-col gap-2">
            <label class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">
              {{ t('admin.qr.selectBankLabel') }}
            </label>
            <div class="group relative">
              <div class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
                <Building2 :size="16" />
              </div>
              <div class="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-brand-slate/80 transition-colors group-focus-within:text-brand-court">
                <ChevronDown :size="16" />
              </div>
              <select
                :value="bankForm.bankCode"
                @change="onBankSelect"
                class="w-full appearance-none rounded-2xl border border-brand-line bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,240,0.96))] py-3.5 pl-11 pr-10 text-sm font-bold tracking-[0.02em] text-brand-ink shadow-[0_18px_40px_-32px_rgba(35,55,34,0.34)] transition-all outline-none hover:border-brand-court/30 focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
              >
                <option value="">{{ t('admin.qr.chooseStandardBank') }}</option>
                <option v-for="bank in COMMON_VIETNAMESE_BANKS" :key="bank.code" :value="bank.code">
                  {{ bank.code }} - {{ bank.name }}
                </option>
              </select>
            </div>
          </div>

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

          <UIGlassInput
            v-model="bankForm.accountName"
            type="text"
            :label="t('admin.qr.accountNameLabel')"
            :placeholder="t('admin.qr.accountNamePlaceholder')"
          >
            <template #icon><UserCheck :size="16" /></template>
          </UIGlassInput>
        </div>

        <div class="flex items-center justify-between">
          <p class="text-xs text-brand-slate">
            {{ t('admin.qr.vietQrHint') }}
          </p>
          <UIGlassButton type="submit" :loading="savingBank" class="!px-4 !py-2 !text-xs">
            <template #icon-left><Save :size="14" /></template>
            {{ t('admin.qr.saveBankBtn') }}
          </UIGlassButton>
        </div>
      </form>

      <!-- Dynamic VietQR Live Preview -->
      <div
        v-if="liveVietQRPreviewUrl"
        class="mt-4 flex flex-col items-center gap-4 rounded-3xl border border-brand-court/20 bg-emerald-50/60 p-4 sm:flex-row"
      >
        <div class="shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white p-2 shadow-md">
          <img :src="liveVietQRPreviewUrl" alt="VietQR Dynamic Preview" class="h-32 w-32 object-contain" />
        </div>
        <div class="space-y-1">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
            <Sparkles :size="12" />
            {{ t('admin.qr.dynamicVietQrActive') }}
          </div>
          <p class="text-sm font-black text-brand-ink">{{ t('admin.qr.dynamicVietQrReady') }}</p>
          <p class="text-xs font-medium text-brand-slate leading-relaxed">
            {{ t('admin.qr.dynamicVietQrDesc') }}
          </p>
        </div>
      </div>
    </div>
  </UIGlassCard>
</template>
