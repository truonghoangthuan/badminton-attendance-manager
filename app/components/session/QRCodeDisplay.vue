<script setup lang="ts">
import { Download, Maximize2, QrCode, X, Copy, Check } from 'lucide-vue-next';
import { doc, getDoc } from 'firebase/firestore';

const props = defineProps<{
  createdBy: string;
}>();

const { db } = useFirebase();
const creatorProfile = ref<any>(null);
const loading = ref(true);
const showExpand = ref(false);
const copied = ref(false);

onMounted(async () => {
  if (!props.createdBy) {
    loading.value = false;
    return;
  }

  try {
    const docRef = doc(db, 'profiles', props.createdBy);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      creatorProfile.value = docSnap.data();
    }
  } catch (e) {
    console.error('Error fetching creator profile:', e);
  } finally {
    loading.value = false;
  }
});

const downloadQR = () => {
  if (!creatorProfile.value?.paymentQR) return;
  const link = document.createElement('a');
  link.href = creatorProfile.value.paymentQR;
  link.download = `payment_qr_${props.createdBy}.png`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const copyPaymentInfo = () => {
  if (!creatorProfile.value?.displayName) return;
  navigator.clipboard.writeText(creatorProfile.value.displayName);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};
</script>

<template>
  <div v-if="loading" class="flex flex-col items-center justify-center space-y-4 rounded-[32px] border border-brand-line bg-brand-sand/50 p-8">
     <div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-court border-t-transparent" />
     <p class="text-xs font-bold uppercase tracking-widest text-brand-slate">Loading payment info...</p>
  </div>

  <div v-else-if="!creatorProfile?.paymentQR" class="rounded-[32px] border border-dashed border-brand-line bg-brand-sand px-6 py-8 text-center">
    <QrCode :size="32" class="mx-auto text-brand-slate/40" />
    <p class="mt-4 font-black text-brand-ink">No payment QR uploaded</p>
    <p class="mt-1 text-sm font-medium text-brand-slate">Please pay directly at the court.</p>
  </div>

  <UIGlassCard v-else class="relative overflow-hidden !p-0">
    <div class="flex flex-col sm:flex-row sm:items-center">
      <!-- QR Image -->
      <div class="group relative aspect-square w-full shrink-0 border-b border-brand-line bg-white p-6 sm:w-48 sm:border-b-0 sm:border-r">
        <img :src="creatorProfile.paymentQR" alt="Scan to pay" class="h-full w-full object-contain" />
        <button
          class="absolute inset-0 flex items-center justify-center bg-brand-ink/40 opacity-0 transition-opacity hover:opacity-100"
          @click="showExpand = true"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-ink shadow-lg transition-transform hover:scale-110">
            <Maximize2 :size="18" />
          </div>
        </button>
      </div>

      <!-- Info & Actions -->
      <div class="flex-1 space-y-4 p-6 sm:py-0">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-court">Settlement</p>
          <h3 class="mt-1 text-xl font-black tracking-tight text-brand-ink">Scan to Settle Fee</h3>
          <p class="mt-1 text-sm font-medium text-brand-slate">
            Managed by <span class="text-brand-ink font-bold">{{ creatorProfile.displayName || 'Admin' }}</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UIGlassButton class="!px-4 !py-2.5 !text-sm" @click="downloadQR">
            <template #icon-left><Download :size="14" /></template>
            Download QR
          </UIGlassButton>
          <UIGlassButton variant="secondary" class="!h-10 !w-10 !p-0" @click="showExpand = true">
            <Maximize2 :size="16" />
          </UIGlassButton>
        </div>
      </div>
    </div>

    <!-- Expansion Backdrop -->
    <Teleport to="body">
      <div v-if="showExpand" class="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/80 p-6 backdrop-blur-xl" @click="showExpand = false">
        <div class="relative w-full max-w-md overflow-hidden rounded-[40px] bg-white p-8 shadow-2xl transition-all" @click.stop>
          <button class="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-brand-sand text-brand-ink hover:bg-brand-line" @click="showExpand = false">
            <X :size="20" />
          </button>
          
          <div class="mt-8 text-center">
            <h2 class="text-3xl font-black tracking-tighter text-brand-ink">Scan & Pay</h2>
            <p class="mt-2 text-sm font-medium text-brand-slate">Scan this code with your banking app to settle the session fee.</p>
          </div>

          <div class="my-8 aspect-square w-full rounded-[32px] border-8 border-brand-sand bg-white p-4 shadow-inner">
            <img :src="creatorProfile.paymentQR" alt="Payment QR" class="h-full w-full object-contain" />
          </div>

          <UIGlassButton class="w-full" @click="downloadQR">
            <template #icon-left><Download :size="18" /></template>
            Download Code
          </UIGlassButton>
        </div>
      </div>
    </Teleport>
  </UIGlassCard>
</template>
