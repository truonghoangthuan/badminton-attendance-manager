<script setup lang="ts">
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Calendar, Clock, MapPin, Plus, X, Copy, BarChart2, RefreshCcw, DollarSign, Users as UsersIcon, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { db } = useFirebase()
const sessionsRef = collection(db, 'sessions')
const sessions = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Create Session Form State
const showCreateForm = ref(false)
const newSession = ref({
  date: new Date().toISOString().split('T')[0],
  time: '18:00',
  location: 'Badminton Court A',
})
const adding = ref(false)

// Financials State
const playerCounts = ref<Record<string, number>>({})

// Fetch sessions in real-time
onMounted(() => {
  const q = query(sessionsRef, orderBy('date', 'desc'))
  const unsubscribe = onSnapshot(q, 
    (snapshot) => {
      sessions.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      loading.value = false
    },
    (err) => {
      console.error('Firestore Error:', err)
      error.value = 'Failed to fetch sessions.'
      loading.value = false
    }
  )

  onUnmounted(unsubscribe)
})

const createSession = async () => {
  adding.value = true
  try {
    await addDoc(sessionsRef, {
      ...newSession.value,
      status: 'open',
      financials: {
        courtCost: 0,
        shuttlecocksUsed: 0,
        shuttlecockPrice: 0,
        calculatedFeePerPerson: 0
      },
      createdAt: new Date().toISOString()
    })
    showCreateForm.value = false
    newSession.value = {
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      location: 'Badminton Court A',
    }
  } catch (e) {
    console.error('Error creating session:', e)
  } finally {
    adding.value = false
  }
}

const toggleStatus = async (session: any) => {
  const statusOrder: ('open' | 'locked' | 'completed')[] = ['open', 'locked', 'completed']
  const currentIndex = statusOrder.indexOf(session.status)
  const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
  
  try {
    const docRef = doc(db, 'sessions', session.id)
    await updateDoc(docRef, { status: nextStatus })
  } catch (e) {
    console.error('Error updating status:', e)
  }
}

const updateFinancials = async (session: any) => {
  const fee = calculateFee(session)
  try {
    const docRef = doc(db, 'sessions', session.id)
    await updateDoc(docRef, {
      'financials.courtCost': session.financials.courtCost,
      'financials.shuttlecocksUsed': session.financials.shuttlecocksUsed,
      'financials.shuttlecockPrice': session.financials.shuttlecockPrice,
      'financials.calculatedFeePerPerson': fee
    })
  } catch (e) {
    console.error('Error updating financials:', e)
  }
}

const calculateFee = (session: any) => {
  const totalPlayers = playerCounts.value[session.id] || 1
  const courtCost = session.financials.courtCost || 0
  const shuttleUsage = session.financials.shuttlecocksUsed || 0
  const shuttlePrice = session.financials.shuttlecockPrice || 0
  return Number(((courtCost + (shuttleUsage * shuttlePrice)) / totalPlayers).toFixed(2))
}

const copySessionLink = (id: string) => {
  const url = `${window.location.origin}/session/${id}`
  navigator.clipboard.writeText(url)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'text-green-400 bg-green-400/10'
    case 'locked': return 'text-amber-400 bg-amber-400/10'
    case 'completed': return 'text-blue-400 bg-blue-400/10'
    default: return 'text-slate-400 bg-slate-400/10'
  }
}
</script>

<template>
  <div class="space-y-12 pb-20">
    <!-- Page Header -->
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div class="space-y-1">
        <h1 class="text-4xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Sessions
        </h1>
        <p class="text-white/40 font-bold uppercase tracking-[0.2em] text-xs">Manage weekly matches & financials</p>
      </div>
      
      <UIGlassButton @click="showCreateForm = !showCreateForm" class="!px-8">
        <template #icon-left>
           <X v-if="showCreateForm" :size="20" />
           <Plus v-else :size="20" />
        </template>
        {{ showCreateForm ? 'Cancel Creation' : 'New Session' }}
      </UIGlassButton>
    </header>

    <!-- Create Session Form -->
    <transition name="fade">
      <UIGlassCard v-if="showCreateForm" class="!p-8">
        <div class="mb-8">
          <h2 class="text-2xl font-black">Plan Next Match</h2>
          <p class="text-white/40 text-sm font-medium">Coordinate venue and schedule</p>
        </div>
        
        <form @submit.prevent="createSession" class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <UIGlassInput v-model="newSession.date" type="date" label="Court Date" required>
            <template #icon><Calendar :size="20" /></template>
          </UIGlassInput>
          <UIGlassInput v-model="newSession.time" type="time" label="Match Time" required>
            <template #icon><Clock :size="20" /></template>
          </UIGlassInput>
          <UIGlassInput v-model="newSession.location" type="text" label="Venue Location" placeholder="e.g., Badminton Court A" required>
            <template #icon><MapPin :size="20" /></template>
          </UIGlassInput>
          
          <div class="md:col-span-3 flex justify-end pt-4">
            <UIGlassButton type="submit" :disabled="adding" class="!px-12">
              <Loader2 v-if="adding" class="animate-spin" :size="20" />
              <span v-else>Confirm & Create</span>
            </UIGlassButton>
          </div>
        </form>
      </UIGlassCard>
    </transition>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 flex flex-col items-center gap-4">
      <Loader2 class="animate-spin text-brand-indigo" :size="48" />
      <p class="text-white/20 font-black uppercase tracking-widest text-sm">Fetching Court Data...</p>
    </div>

    <!-- Empty State -->
    <UIGlassCard v-else-if="sessions.length === 0" class="!py-32 text-center">
      <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
        <Calendar class="text-white/20" :size="40" />
      </div>
      <h3 class="text-2xl font-black">No sessions scheduled</h3>
      <p class="text-white/40 font-medium mb-8">Start your first match management by clicking "New Session"</p>
    </UIGlassCard>

    <!-- Sessions List -->
    <div v-else class="grid grid-cols-1 gap-6">
      <UIGlassCard v-for="session in sessions" :key="session.id" class="relative group !p-8 flex flex-col lg:flex-row gap-10">
        <!-- Floating Badge -->
        <div class="absolute top-6 right-6">
           <span :class="getStatusColor(session.status)" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
              {{ session.status }}
           </span>
        </div>

        <!-- Left: Core Info -->
        <div class="flex-1 space-y-8">
           <div class="space-y-4">
              <div class="flex items-center gap-4">
                 <div class="w-14 h-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo">
                    <Calendar :size="28" />
                 </div>
                 <div>
                    <h3 class="text-2xl font-black tracking-tight">{{ session.date }}</h3>
                    <div class="flex items-center gap-4 text-white/40 font-bold text-xs uppercase tracking-widest">
                       <span class="flex items-center gap-1"><Clock :size="12" /> {{ session.time }}</span>
                       <span class="flex items-center gap-1 truncate max-w-[200px]"><MapPin :size="12" /> {{ session.location }}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div class="flex flex-wrap gap-2">
              <UIGlassButton variant="secondary" @click="copySessionLink(session.id)" class="!px-4 !py-2 !text-xs">
                 <template #icon-left><Copy :size="14" /></template>
                 Copy Link
              </UIGlassButton>
              <NuxtLink :to="'/admin/session/' + session.id">
                 <UIGlassButton variant="secondary" class="!px-4 !py-2 !text-xs">
                    <template #icon-left><UsersIcon :size="14" /></template>
                    RSVP List
                 </UIGlassButton>
              </NuxtLink>
              <UIGlassButton variant="ghost" @click="toggleStatus(session)" class="!px-4 !py-2 !text-xs !bg-white/5">
                 <template #icon-left><RefreshCcw :size="14" /></template>
                 Update Status
              </UIGlassButton>
           </div>
        </div>

        <!-- Right: Financial Dashboard (Visible when processing or completed) -->
        <div v-if="session.status !== 'open'" class="w-full lg:w-[400px] bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6 animate-fade-in">
           <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase tracking-[0.2em] text-white/40">Financial Controller</h4>
              <BarChart2 class="text-brand-purple" :size="16" />
           </div>

           <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                 <label class="text-[10px] font-black uppercase text-white/20 px-1">Court Cost</label>
                 <div class="relative">
                    <DollarSign class="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" :size="12" />
                    <input v-model.number="session.financials.courtCost" @change="updateFinancials(session)" type="number" class="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-brand-purple/50" />
                 </div>
              </div>
              <div class="space-y-2">
                 <label class="text-[10px] font-black uppercase text-white/20 px-1">Actual Players</label>
                 <div class="relative">
                    <UsersIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" :size="12" />
                    <input v-model.number="playerCounts[session.id]" @input="updateFinancials(session)" type="number" class="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-brand-purple/50" />
                 </div>
              </div>
              <div class="space-y-2">
                 <label class="text-[10px] font-black uppercase text-white/20 px-1">Shuttle Count</label>
                 <input v-model.number="session.financials.shuttlecocksUsed" @change="updateFinancials(session)" type="number" class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-brand-purple/50" />
              </div>
              <div class="space-y-2">
                 <label class="text-[10px] font-black uppercase text-white/20 px-1">Price/Shuttle</label>
                 <input v-model.number="session.financials.shuttlecockPrice" @change="updateFinancials(session)" type="number" class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-brand-purple/50" />
              </div>
           </div>

           <div class="pt-4 border-t border-white/10 flex justify-between items-end">
              <span class="text-xs font-bold text-white/40">Suggested Fee:</span>
              <div class="flex items-baseline gap-1">
                 <span class="text-3xl font-black text-white">${{ calculateFee(session) }}</span>
                 <span class="text-[10px] font-black uppercase text-white/30">/ person</span>
              </div>
           </div>
        </div>
        
        <!-- Hover Glow -->
        <div class="absolute inset-0 bg-brand-indigo/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-3xl" />
      </UIGlassCard>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.98);
}

.animate-fade-in {
  animation: slideUp 0.6s ease-out forwards;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.2;
}
</style>
