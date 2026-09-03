<script setup lang="ts">
import { Maximize2, QrCode, X } from 'lucide-vue-next';

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
}>();

const showExpand = ref(false);

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
    v-if="!qrUrl"
    class="rounded-[32px] border border-dashed border-brand-line bg-brand-sand px-6 py-8 text-center text-brand-slate"
  >
    <QrCode :size="32" class="mx-auto opacity-40" />
    <p class="mt-4 font-black text-brand-ink">No payment QR uploaded</p>
    <p class="mt-1 text-sm font-medium">Please pay directly at the court.</p>
  </div>

  <UIGlassCard v-else class="relative overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center">
      <!-- QR Image -->
      <div
        class="group relative aspect-square w-full shrink-0 border-b border-brand-line bg-white p-6 sm:w-48 sm:border-b-0 sm:border-r"
      >
        <img :src="qrUrl || undefined" alt="Scan to pay" class="h-full w-full object-contain" />
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
            <img :src="qrUrl || undefined" alt="Payment QR" class="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </Teleport>
  </UIGlassCard>
</template>
