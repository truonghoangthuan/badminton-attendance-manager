<script setup lang="ts">
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'

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

// Financials State (Temporary for calculation)
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
      error.value = 'Failed to fetch sessions. Please check permissions.'
      loading.value = false
    }
  )

  onUnmounted(unsubscribe)
})

const createSession = async () => {
  adding.value = true
  try {
    const docRef = await addDoc(sessionsRef, {
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
    // Reset form
    newSession.value = {
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      location: 'Badminton Court A',
    }
    alert(`Session created! URL: /session/${docRef.id}`)
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
  alert('Link copied to clipboard!')
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-green-500/20 text-green-700'
    case 'locked': return 'bg-amber-500/20 text-amber-700'
    case 'completed': return 'bg-blue-500/20 text-blue-700'
    default: return 'bg-slate-500/20 text-slate-700'
  }
}
</script>

<template>
  <div class="space-y-8 max-w-6xl mx-auto py-10 px-4">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-2">
          Sessions
        </h1>
        <p class="text-slate-900 opacity-70">Create and manage your badminton sessions</p>
      </div>
      <button 
        @click="showCreateForm = !showCreateForm"
        class="indigo-purple-badge px-6 py-3 font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
      >
        <span>{{ showCreateForm ? '✕ Close' : '＋ New Session' }}</span>
      </button>
    </div>

    <!-- Create Session Form -->
    <div v-if="showCreateForm" class="glass-card p-6 animate-fade-in">
      <h2 class="text-xl font-bold mb-6">Create New Session</h2>
      <form @submit.prevent="createSession" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="space-y-2">
          <label class="text-sm font-bold opacity-70">Date</label>
          <input v-model="newSession.date" type="date" required class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold opacity-70">Time</label>
          <input v-model="newSession.time" type="time" required class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold opacity-70">Location</label>
          <input v-model="newSession.location" type="text" placeholder="Location..." required class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none" />
        </div>
        <div class="md:col-span-3 flex justify-end">
          <button :disabled="adding" type="submit" class="indigo-purple-badge px-8 py-3 font-bold">
            {{ adding ? 'Creating...' : 'Create Session' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Sessions List -->
    <div v-if="loading" class="text-center py-20 opacity-50">
      <div class="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      Loading sessions...
    </div>

    <div v-else-if="sessions.length === 0" class="glass-card p-20 text-center opacity-50">
      No sessions found. Create your first one above!
    </div>

    <div v-else class="grid grid-cols-1 gap-6">
      <div v-for="session in sessions" :key="session.id" class="glass-card p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <!-- Session Info -->
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📅</span>
            <span class="text-xl font-bold">{{ session.date }} @ {{ session.time }}</span>
            <span :class="getStatusColor(session.status)" class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              {{ session.status }}
            </span>
          </div>
          <p class="opacity-70 flex items-center gap-2">
            <span>📍</span> {{ session.location }}
          </p>
          <div class="flex gap-2">
            <button @click="copySessionLink(session.id)" class="text-xs bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-all">
              🔗 Copy Link
            </button>
            <button @click="toggleStatus(session)" class="text-xs bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-500/20 transition-all font-bold">
              🔄 Next Status
            </button>
          </div>
        </div>

        <!-- Financial Dashboard (Visible when completed) -->
        <div v-if="session.status === 'completed'" class="w-full md:w-auto bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4 min-w-[300px]">
          <h3 class="font-bold text-sm uppercase opacity-50 mb-2">Financials</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-bold opacity-50">Court Cost</label>
              <input 
                v-model.number="session.financials.courtCost" 
                @change="updateFinancials(session)"
                type="number" 
                class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold opacity-50"># Shuttles</label>
              <input 
                v-model.number="session.financials.shuttlecocksUsed" 
                @change="updateFinancials(session)"
                type="number" 
                class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold opacity-50">Shuttle Price</label>
              <input 
                v-model.number="session.financials.shuttlecockPrice" 
                @change="updateFinancials(session)"
                type="number" 
                class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold opacity-50">Actual Players</label>
              <input 
                v-model.number="playerCounts[session.id]" 
                @input="updateFinancials(session)"
                type="number" 
                placeholder="Ex: 10"
                class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
              />
            </div>
          </div>
          <div class="pt-2 border-t border-white/10 flex justify-between items-center">
            <span class="font-bold text-indigo-500">Fee Per Person:</span>
            <span class="text-xl font-black">${{ calculateFee(session) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(0.5);
}
</style>
