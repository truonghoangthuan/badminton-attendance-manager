<script setup lang="ts">
import { Shield, BarChart3, Users, Zap, ArrowRight, Trophy } from 'lucide-vue-next'

onMounted(() => {
  try {
    const { app } = useFirebase()
    console.log('Firebase initialized successfully:', app.name)
  } catch (err) {
    console.warn('Firebase initialization check failed.')
  }
})
</script>

<template>
  <div class="space-y-24 py-12">
    <!-- Hero Section -->
    <section class="relative text-center space-y-8 max-w-4xl mx-auto px-4">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo text-xs font-black uppercase tracking-widest animate-fade-in">
        <Zap :size="14" />
        New: Advanced Analytics
      </div>
      
      <h1 class="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
        Better Badminton.<br />
        <span class="text-brand-indigo">Simplified.</span>
      </h1>
      
      <p class="text-xl text-white/60 leading-relaxed max-w-2xl mx-auto font-medium">
        The ultimate attendance and financial manager for your badminton club. 
        Focus on the game, let us handle the courts.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <NuxtLink to="/admin">
          <UIGlassButton class="!px-8 !py-4 text-lg">
            Manage Sessions
            <template #icon-right><ArrowRight :size="20" /></template>
          </UIGlassButton>
        </NuxtLink>
        <UIGlassButton variant="secondary" class="!px-8 !py-4 text-lg">
          Explore Features
        </UIGlassButton>
      </div>
    </section>

    <!-- Bento Grid Features -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Feature 1: Large -->
      <UIGlassCard hoverable class="md:col-span-2 flex flex-col md:flex-row items-center gap-8 group">
        <div class="flex-1 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-brand-indigo/20 flex items-center justify-center text-brand-indigo">
            <Shield :size="28" />
          </div>
          <h3 class="text-3xl font-black">Smart RSVP System</h3>
          <p class="text-white/60 font-medium leading-relaxed">
            Automatic member recognition, guest tracking, and real-time attendance syncing. 
            No more messy spreadsheets or forgotten payments.
          </p>
          <UIGlassButton variant="ghost" class="!px-0 !justify-start">
            Learn about security
            <template #icon-right><ArrowRight :size="16" /></template>
          </UIGlassButton>
        </div>
        <div class="w-full md:w-1/3 aspect-square glass-shell rounded-2xl bg-brand-indigo/5 flex items-center justify-center relative overflow-hidden">
          <Trophy class="w-32 h-32 text-brand-indigo/20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700" />
          <div class="absolute inset-0 bg-gradient-to-t from-brand-indigo/20 to-transparent" />
        </div>
      </UIGlassCard>

      <!-- Feature 2 -->
      <UIGlassCard hoverable class="space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
          <BarChart3 :size="28" />
        </div>
        <h3 class="text-2xl font-black">Financial Tracking</h3>
        <p class="text-white/60 text-sm font-medium">
          Detailed cost breakdowns and automatic fee calculation for every member.
        </p>
      </UIGlassCard>

      <!-- Feature 3 -->
      <UIGlassCard hoverable class="space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-brand-blue/20 flex items-center justify-center text-brand-blue">
          <Users :size="28" />
        </div>
        <h3 class="text-2xl font-black">Member Portal</h3>
        <p class="text-white/60 text-sm font-medium">
          A dedicated space for members to view their history and upcoming sessions.
        </p>
      </UIGlassCard>

      <!-- Feature 4 -->
      <UIGlassCard hoverable class="md:col-span-2 flex flex-col md:flex-row items-center gap-8">
        <div class="w-full md:w-1/2 flex flex-wrap gap-2">
          <div v-for="i in 8" :key="i" class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
            Member #{{ i }}
          </div>
        </div>
        <div class="flex-1 space-y-4">
          <h3 class="text-2xl font-black">Community Driven</h3>
          <p class="text-white/60 text-sm font-medium uppercase tracking-tighter">
            Join 100+ players managing their weekly matches with our platform.
          </p>
        </div>
      </UIGlassCard>
    </section>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.8s ease-out forwards;
}
</style>
