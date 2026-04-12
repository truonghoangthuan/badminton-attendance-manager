<script setup lang="ts">
import { Maximize2, QrCode, X } from 'lucide-vue-next';
import { buildVietQrUrl } from '~/utils/vietqr';

const props = defineProps<{
  amount: number;
  sessionDate?: string;
  createdBy?: string;
}>();

const showExpand = ref(false);
const qrAmount = computed(() => Math.max(0, Math.round(props.amount || 0)));
const qrCodeUrl = computed(() => buildVietQrUrl(qrAmount.value, props.sessionDate));
</script>

<template>
  <div
    v-if="qrAmount === 0"
    class="rounded-[32px] border border-dashed border-brand-line bg-brand-sand px-6 py-8 text-center text-brand-slate"
  >
    <QrCode :size="32" class="mx-auto opacity-40" />
  </div>

  <UIGlassCard v-else class="bg-white !p-6">
    <div class="group relative mx-auto w-full max-w-sm">
      <img :src="qrCodeUrl" alt="Payment QR" class="aspect-square w-full object-contain" />
      <button
        type="button"
        class="absolute inset-0 flex items-center justify-center bg-brand-ink/40 opacity-0 transition-opacity group-hover:opacity-100"
        @click="showExpand = true"
      >
        <div class="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-ink shadow-lg transition-transform hover:scale-110">
          <Maximize2 :size="18" />
        </div>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showExpand"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/80 p-6 backdrop-blur-xl"
        @click="showExpand = false"
      >
        <div class="relative w-full max-w-xl rounded-[40px] bg-white p-6 shadow-2xl" @click.stop>
          <button
            type="button"
            class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-sand text-brand-ink hover:bg-brand-line"
            @click="showExpand = false"
          >
            <X :size="20" />
          </button>

          <img :src="qrCodeUrl" alt="Expanded payment QR" class="aspect-square w-full object-contain" />
        </div>
      </div>
    </Teleport>
  </UIGlassCard>
</template>
