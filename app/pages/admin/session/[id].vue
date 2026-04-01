<script setup lang="ts">
import { doc, getDoc, onSnapshot, collection, updateDoc, query, orderBy } from 'firebase/firestore'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const route = useRoute()
const sessionId = route.params.id as string
const { db } = useFirebase()

const session = ref<any>(null)
const attendances = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Real-time Fetch Session & Attendances
onMounted(() => {
  // 1. Session Listener
  const sessionRef = doc(db, 'sessions', sessionId)
  const unsubSession = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      error.value = 'Session not found.'
      loading.value = false
      return
    }
    session.value = { id: snap.id, ...snap.data() }
  })

  // 2. Attendances Listener
  const attendancesRef = collection(db, `sessions/${sessionId}/attendances`)
  const q = query(attendancesRef, orderBy('name', 'asc'))
  const unsubAttendances = onSnapshot(q, (snap) => {
    attendances.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    loading.value = false
  })

  onUnmounted(() => {
    unsubSession()
    unsubAttendances()
  })
})

// Financial Calculations Driven by Attendances
const totalActualPlayers = computed(() => {
  return attendances.value.reduce((acc, curr) => {
    if (curr.actualAttended) {
      return acc + 1 + (curr.guestCount || 0)
    }
    return acc
  }, 0)
})

const calculatedFeePerPerson = computed(() => {
  if (!session.value || totalActualPlayers.value === 0) return 0
  const f = session.value.financials
  const totalCost = (f.courtCost || 0) + ((f.shuttlecocksUsed || 0) * (f.shuttlecockPrice || 0))
  return Number((totalCost / totalActualPlayers.value).toFixed(2))
})

const toggleAttendanceAttr = async (attendanceId: string, field: string, value: boolean) => {
  try {
    const docRef = doc(db, `sessions/${sessionId}/attendances`, attendanceId)
    await updateDoc(docRef, { [field]: value })
  } catch (e) {
    console.error(`Error updating ${field}:`, e)
  }
}

const updateFinancials = async () => {
  if (!session.value) return
  try {
    const docRef = doc(db, 'sessions', sessionId)
    await updateDoc(docRef, {
      'financials.courtCost': session.value.financials.courtCost,
      'financials.shuttlecocksUsed': session.value.financials.shuttlecocksUsed,
      'financials.shuttlecockPrice': session.value.financials.shuttlecockPrice,
      'financials.calculatedFeePerPerson': calculatedFeePerPerson.value
    })
  } catch (e) {
    console.error('Error updating financials:', e)
  }
}

// Watch for changes in calculation and sync to session
watch(calculatedFeePerPerson, (newVal) => {
  if (session.value && session.value.financials.calculatedFeePerPerson !== newVal) {
    updateFinancials()
  }
})

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
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <NuxtLink to="/admin" class="text-sm font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mb-2">
          ← Back to Sessions
        </NuxtLink>
        <h1 v-if="session" class="text-4xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Session Detail: {{ session.date }}
        </h1>
      </div>
      <div v-if="session" class="flex items-center gap-3">
        <span :class="getStatusColor(session.status)" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-current shadow-sm">
          {{ session.status }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-20">
      <div class="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      Loading session details...
    </div>

    <div v-else-if="error" class="glass-card p-12 text-center text-red-500 font-bold">
      {{ error }}
    </div>

    <div v-else-if="session" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Attendance Table -->
      <div class="lg:col-span-2 space-y-6">
        <div class="glass-card overflow-hidden">
          <div class="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 class="text-xl font-bold">Player Attendance</h2>
            <div class="flex gap-4 text-xs font-black uppercase opacity-60">
              <span>Total Join: {{ attendances.filter(a => a.isJoining).length }}</span>
              <span>Actual: {{ totalActualPlayers }}</span>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-white/5 border-b border-white/10">
                  <th class="px-6 py-4 font-bold text-sm uppercase">Player</th>
                  <th class="px-6 py-4 font-bold text-sm uppercase text-center">RSVP</th>
                  <th class="px-6 py-4 font-bold text-sm uppercase text-center">Guests</th>
                  <th class="px-6 py-4 font-bold text-sm uppercase text-center">出席 (Present)</th>
                  <th class="px-6 py-4 font-bold text-sm uppercase text-center">Paid</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr v-for="att in attendances" :key="att.id" class="hover:bg-white/5 transition-colors">
                  <td class="px-6 py-4 font-bold">
                    {{ att.name }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span :class="att.isJoining ? 'text-green-500' : 'text-red-500 opacity-50'" class="text-xs font-black uppercase">
                      {{ att.isJoining ? 'Joining' : 'No' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span v-if="att.guestCount" class="bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded-lg font-bold">
                      +{{ att.guestCount }}
                    </span>
                    <span v-else class="opacity-30">-</span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      :checked="att.actualAttended" 
                      @change="toggleAttendanceAttr(att.id, 'actualAttended', ($event.target as HTMLInputElement).checked)"
                      class="h-5 w-5 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button 
                      @click="toggleAttendanceAttr(att.id, 'hasPaid', !att.hasPaid)"
                      :class="att.hasPaid ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-500'"
                      class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      {{ att.hasPaid ? 'Paid' : 'Unpaid' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="attendances.length === 0">
                  <td colspan="5" class="p-12 text-center opacity-30 italic">No votes yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Financial Calculation -->
      <div class="space-y-6">
        <div class="glass-card p-8 sticky top-8">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span>💰</span> Financial Summary
          </h2>

          <div class="space-y-6">
            <!-- Inputs -->
            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-slate-500 uppercase">Court Cost</label>
                <input 
                  v-model.number="session.financials.courtCost" 
                  type="number" 
                  @change="updateFinancials"
                  class="w-full bg-white/40 border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-slate-500 uppercase"># Shuttles Used</label>
                <input 
                  v-model.number="session.financials.shuttlecocksUsed" 
                  type="number" 
                  @change="updateFinancials"
                  class="w-full bg-white/40 border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-slate-500 uppercase">Shuttle Price</label>
                <input 
                  v-model.number="session.financials.shuttlecockPrice" 
                  type="number" 
                  @change="updateFinancials"
                  class="w-full bg-white/40 border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>

            <!-- Calculation Output -->
            <div class="pt-6 border-t border-white/10 space-y-4">
              <div class="flex justify-between items-center text-sm">
                <span class="opacity-60">Total Active Players</span>
                <span class="font-black text-indigo-600">{{ totalActualPlayers }}</span>
              </div>
              <div class="flex justify-between items-center p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <span class="font-black text-indigo-700">Fee Per Person:</span>
                <div class="text-right">
                  <span class="text-3xl font-black text-indigo-800">${{ calculatedFeePerPerson }}</span>
                  <p class="text-[10px] font-bold opacity-40 uppercase">Synced to persistence</p>
                </div>
              </div>
            </div>

            <!-- Quick Status Change (Optional convenience) -->
            <NuxtLink v-if="session.status === 'open'" to="/admin" class="block w-full py-4 text-center bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-xl font-bold text-sm">
              Lock RSVP to finalize math
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-white/60 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-xl shadow-indigo-500/5;
}
</style>
