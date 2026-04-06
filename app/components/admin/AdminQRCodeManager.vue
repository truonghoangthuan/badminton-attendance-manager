<script setup lang="ts">
import { QrCode, Upload, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-vue-next';

const { profile, uploadQRCode, deleteQRCode } = useUserProfile();
const toast = useToast();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const previewUrl = ref<string | null>(null);

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
    await uploadQRCode(selectedFile.value);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Payment QR code updated.',
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

const removeProfileQR = async () => {
  try {
    await deleteQRCode();
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Payment QR code removed.',
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
          Upload your banking QR code so attendees can pay you directly.
        </p>
      </div>
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sand text-brand-court">
        <QrCode :size="22" />
      </div>
    </div>

    <div v-if="!profile?.paymentQR && !previewUrl" class="group relative">
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
        <img :src="profile.paymentQR" alt="Payment QR" class="aspect-square w-full object-contain p-2" />
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
            Attendees will see this on the checkout screen.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <UIGlassButton variant="secondary" class="!px-4 !py-2.5 !text-sm" @click="triggerFileInput">
            <template #icon-left><ImageIcon :size="14" /></template>
            Update QR
          </UIGlassButton>
          <UIGlassButton variant="ghost" class="!px-4 !py-2.5 !text-sm text-red-600 hover:bg-red-50" @click="removeProfileQR">
            <template #icon-left><Trash2 :size="14" /></template>
            Remove
          </UIGlassButton>
        </div>
      </div>
    </div>
  </UIGlassCard>
</template>
