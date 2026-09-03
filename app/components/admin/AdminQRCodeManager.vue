<script setup lang="ts">
import { doc, updateDoc } from 'firebase/firestore';
import { QrCode, Upload, X, Image as ImageIcon, Trash2, Building2, CreditCard, UserCheck, Save } from 'lucide-vue-next';

const props = defineProps<{
  sessionId: string;
  qrUrl?: string | null;
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  } | null;
}>();

const { db } = useFirebase();
const supabaseQR = useSupabaseQRCode();
const toast = useToast();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const previewUrl = ref<string | null>(null);

const bankForm = ref({
  bankName: '',
  accountNumber: '',
  accountName: '',
});

watch(
  () => props.bankInfo,
  (newVal) => {
    bankForm.value = {
      bankName: newVal?.bankName || '',
      accountNumber: newVal?.accountNumber || '',
      accountName: newVal?.accountName || '',
    };
  },
  { immediate: true, deep: true }
);

const savingBank = ref(false);

const saveBankDetails = async () => {
  savingBank.value = true;
  try {
    await updateDoc(doc(db, 'sessions', props.sessionId), {
      bankInfo: {
        bankName: bankForm.value.bankName.trim(),
        accountNumber: bankForm.value.accountNumber.trim(),
        accountName: bankForm.value.accountName.trim(),
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Banking details updated for this session.',
      life: 3000,
    });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Failed to save',
      detail: 'Could not update banking details.',
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
      summary: 'Invalid file',
      detail: 'Please select an image file (PNG, JPG).',
      life: 3000,
    });
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      severity: 'error',
      summary: 'File too large',
      detail: 'Image size should be less than 2MB.',
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
      summary: 'Success',
      detail: 'Session payment QR code updated.',
      life: 3000,
    });
    previewUrl.value = null;
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Upload failed',
      detail: 'Could not upload QR code. Please try again.',
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
      summary: 'Deleted',
      detail: 'Session payment QR code removed.',
      life: 3000,
    });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: 'Could not remove QR code.',
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
        <p class="section-kicker">Payment Setup</p>
        <h2 class="mt-2 text-2xl font-black tracking-tight">Payment QR Code</h2>
        <p class="mt-1 text-sm font-medium text-brand-slate">
          Upload the QR code for this session so attendees pay the exact fee for this date.
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
        <p class="text-center font-black text-brand-ink">Click to upload QR code</p>
        <p class="mt-1 text-center text-sm font-medium text-brand-slate">PNG, JPG up to 2MB</p>
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
          Confirm & Upload
        </UIGlassButton>
        <UIGlassButton variant="secondary" @click="cancelPreview">
          Cancel
        </UIGlassButton>
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div class="relative shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg sm:w-48">
        <img :src="qrUrl || undefined" alt="Payment QR" class="aspect-square w-full object-contain p-2" />
        <div class="absolute inset-0 flex items-center justify-center bg-brand-ink/40 opacity-0 transition-opacity hover:opacity-100">
           <UIGlassButton variant="primary" class="scale-90" @click="triggerFileInput">
             Replace
           </UIGlassButton>
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-4">
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p class="text-sm font-bold text-emerald-700">QR Code active</p>
          <p class="mt-1 text-xs font-medium text-emerald-600/80">
            Attendees on this session will see this QR code on the payment section.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <UIGlassButton variant="secondary" class="!px-4 !py-2.5 !text-sm" @click="triggerFileInput">
            <template #icon-left><ImageIcon :size="14" /></template>
            Update QR
          </UIGlassButton>
          <UIGlassButton variant="ghost" class="!px-4 !py-2.5 !text-sm text-red-600 hover:bg-red-50" @click="removeSessionQR">
            <template #icon-left><Trash2 :size="14" /></template>
            Remove
          </UIGlassButton>
        </div>
      </div>
    </div>

    <!-- Direct Banking Details Form -->
    <div class="border-t border-brand-line pt-6 space-y-4">
      <div>
        <p class="section-kicker">Mobile Banking</p>
        <h3 class="mt-1 text-lg font-black tracking-tight text-brand-ink">
          Bank Transfer Info (1-Tap Copy)
        </h3>
        <p class="mt-0.5 text-xs font-medium text-brand-slate">
          Attendees can 1-tap copy these details on mobile when paying via banking apps.
        </p>
      </div>

      <form @submit.prevent="saveBankDetails" class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <UIGlassInput
            v-model="bankForm.bankName"
            type="text"
            label="Bank Name"
            placeholder="e.g. MB Bank, Vietcombank"
          >
            <template #icon><Building2 :size="16" /></template>
          </UIGlassInput>

          <UIGlassInput
            v-model="bankForm.accountNumber"
            type="text"
            label="Account Number"
            placeholder="e.g. 0987654321"
          >
            <template #icon><CreditCard :size="16" /></template>
          </UIGlassInput>

          <UIGlassInput
            v-model="bankForm.accountName"
            type="text"
            label="Account Holder Name"
            placeholder="e.g. NGUYEN VAN A"
          >
            <template #icon><UserCheck :size="16" /></template>
          </UIGlassInput>
        </div>

        <div class="flex justify-end">
          <UIGlassButton type="submit" :loading="savingBank" class="!px-4 !py-2 !text-xs">
            <template #icon-left><Save :size="14" /></template>
            Save Bank Details
          </UIGlassButton>
        </div>
      </form>
    </div>
  </UIGlassCard>
</template>
