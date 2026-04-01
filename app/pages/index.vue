<script setup lang="ts">
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { Calendar, Clock, MapPin, ArrowRight, Loader2, User, Zap, Trophy, Users, BarChart3, Shield } from 'lucide-vue-next'

const { db } = useFirebase()
const sessions = ref<any[]>([])
const loading = ref(true)
const userName = ref<string | null>(null)
const STORAGE_KEY = 'badminton_user_id'

onMounted(async () => {
  try {
    // 1. Check LocalStorage for returning user
    const savedUserId = localStorage.getItem(STORAGE_KEY)
    if (savedUserId) {
      const userDoc = await getDoc(doc(db, 'roster', savedUserId))
      if (userDoc.exists()) {
        userName.value = userDoc.data().name
      }
    }

    // 2. Fetch Sessions
    const qSessions = query(collection(db, 'sessions'), orderBy('date', 'desc'))
    const querySnapshot = await getDocs(qSessions)
    sessions.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (e) {
    console.error('Error loading dashboard:', e)
  } finally {
    loading.value = false
  }
})

const getStatusStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'open':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'locked':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'completed':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default:
      return 'bg-white/5 text-white/40 border-white/10'
  }
}
</script>

<template>
  <div class="space-y-12 py-8 px-4 max-w-7xl mx-auto">
    <!-- Welcome Section / Hero -->
    <header class="space-y-6 text-center md:text-left">
      <div v-if="userName" class="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo animate-fade-in">
        <User :size="18" class="text-brand-indigo" />
        <span class="font-black text-sm uppercase tracking-widest">Welcome back, {{ userName }}!</span>
      </div>
      
      <div v-else class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest animate-fade-in">
        <Zap :size="14" />
        Badminton Attendance Manager
      </div>

      <div class="space-y-2">
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter leading-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
          Upcoming <span class="text-brand-indigo">Sessions</span>
        </h1>
        <p class="text-lg text-white/40 font-medium max-w-2xl">
          Join your next match, track your progress, and stay connected with the club.
        </p>
      </div>
    </header>

    <!-- Sessions Grid -->
    <section v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UIGlassCard v-for="i in 3" :key="i" class="h-64 flex flex-col items-center justify-center gap-4 animate-pulse">
        <Loader2 class="animate-spin text-white/10" :size="32" />
        <div class="w-32 h-4 bg-white/5 rounded-full" />
      </UIGlassCard>
    </section>

    <section v-else-if="sessions.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
      <NuxtLink 
        v-for="session in sessions" 
        :key="session.id" 
        :to="`/session/${session.id}`"
        class="block group no-underline"
      >
        <UIGlassCard hoverable interactive class="h-full relative overflow-hidden flex flex-col justify-between">
          <!-- Status Badge -->
          <div class="absolute top-4 right-4">
            <span 
              :class="getStatusStyles(session.status)"
              class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
            >
              {{ session.status }}
            </span>
          </div>

          <div class="space-y-6">
            <!-- Session Icon & Date -->
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo border border-brand-indigo/20 group-hover:bg-brand-indigo/20 transition-colors">
                <Calendar :size="28" />
              </div>
              <div>
                <h3 class="text-2xl font-black group-hover:text-brand-indigo transition-colors">{{ session.date }}</h3>
                <p class="text-white/40 text-xs font-bold uppercase tracking-widest">Match Session</p>
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-3">
              <div class="flex items-center gap-3 text-white/60 font-medium bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                <Clock :size="18" class="text-brand-purple" />
                <span class="text-sm">{{ session.time }}</span>
              </div>
              <div class="flex items-center gap-3 text-white/60 font-medium bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                <MapPin :size="18" class="text-brand-blue" />
                <span class="text-sm truncate">{{ session.location }}</span>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <span class="text-[10px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/40 transition-colors">View Details</span>
            <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:translate-x-1 transition-all group-hover:bg-brand-indigo group-hover:text-white">
              <ArrowRight :size="16" />
            </div>
          </div>
        </UIGlassCard>
      </NuxtLink>
    </section>

    <!-- Empty State -->
    <section v-else class="py-24 text-center space-y-6">
      <div class="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 text-white/20">
        <Trophy :size="40" />
      </div>
      <div class="space-y-2">
        <h3 class="text-2xl font-black">No sessions scheduled</h3>
        <p class="text-white/40 font-medium">Check back later for upcoming badminton matches.</p>
      </div>
    </section>

    <!-- Features Section (Simplified footer-like) -->
    <hr class="border-white/5 my-20" />
    
    <section class="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
      <div class="space-y-4">
        <div class="w-10 h-10 rounded-xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo border border-brand-indigo/20">
          <Shield :size="20" />
        </div>
        <h4 class="text-lg font-black tracking-tight">Personalized Expo</h4>
        <p class="text-sm text-white/40 font-medium leading-relaxed">System remembers your preferences for a seamless RSVP experience every time.</p>
      </div>
      <div class="space-y-4">
        <div class="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20">
          <BarChart3 :size="20" />
        </div>
        <h4 class="text-lg font-black tracking-tight">Real-time Updates</h4>
        <p class="text-sm text-white/40 font-medium leading-relaxed">Live attendance tracking and financial breakdowns powered by Firestore.</p>
      </div>
      <div class="space-y-4">
        <div class="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20">
          <Users :size="20" />
        </div>
        <h4 class="text-lg font-black tracking-tight">Community First</h4>
        <p class="text-sm text-white/40 font-medium leading-relaxed">Built for badminton players, by badminton players, to simplify match organization.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out forwards;
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s ease-out forwards;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
