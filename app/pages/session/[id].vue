<script setup lang="ts">
import { doc, getDoc, collection, query, where, getDocs, setDoc, onSnapshot, orderBy } from 'firebase/firestore'

const route = useRoute()
const sessionId = route.params.id as string
const { db } = useFirebase()

const session = ref<any>(null)
const roster = ref<any[]>([])
const loading = ref(true)
const submitting = ref(false)
const message = ref({ text: '', type: '' })

// Form State
const vote = ref({
  rosterId: '',
  isJoining: true,
  guestCount: 0
})

const STORAGE_KEY = 'badminton_user_id'

onMounted(async () => {
  try {
    // 1. Fetch Session
    const sessionDoc = await getDoc(doc(db, 'sessions', sessionId))
    if (!sessionDoc.exists()) {
      message.value = { text: 'Session not found.', type: 'error' }
      loading.value = false
      return
    }
    session.value = { id: sessionDoc.id, ...sessionDoc.data() }

    // 2. Fetch Active Roster
    const q = query(collection(db, 'roster'), where('isActive', '==', true), orderBy('name'))
    const rosterSnap = await getDocs(q)
    roster.value = rosterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // 3. Device Tracking: Load from LocalStorage
    const savedUserId = localStorage.getItem(STORAGE_KEY)
    if (savedUserId) {
      vote.value.rosterId = savedUserId
      // Fetch existing vote if any
      await fetchUserVote(savedUserId)
    }
  } catch (e) {
    console.error('Error loading session:', e)
    message.value = { text: 'Error loading data.', type: 'error' }
  } finally {
    loading.value = false
  }
})

const fetchUserVote = async (rosterId: string) => {
  if (!rosterId) return
  const attendanceDoc = await getDoc(doc(db, `sessions/${sessionId}/attendances`, rosterId))
  if (attendanceDoc.exists()) {
    const data = attendanceDoc.data()
    vote.value.isJoining = data.isJoining
    vote.value.guestCount = data.guestCount || 0
  }
}

const submitVote = async () => {
  if (!vote.value.rosterId) {
    message.value = { text: 'Please select your name.', type: 'error' }
    return
  }

  submitting.value = true
  try {
    const selectedUser = roster.value.find(u => u.id === vote.value.rosterId)
    const rosterId = vote.value.rosterId
    
    // Save to LocalStorage
    localStorage.setItem(STORAGE_KEY, rosterId)

    // Save to Firestore
    const attendanceRef = doc(db, `sessions/${sessionId}/attendances`, rosterId)
    await setDoc(attendanceRef, {
      rosterId,
      name: selectedUser.name,
      isJoining: vote.value.isJoining,
      guestCount: vote.value.guestCount,
      actualAttended: vote.value.isJoining, // Default true if joining
      hasPaid: false,
      updatedAt: new Date().toISOString()
    })

    message.value = { text: 'Vote submitted successfully! 🏸', type: 'success' }
  } catch (e) {
    console.error('Error submitting vote:', e)
    message.value = { text: 'Failed to submit vote.', type: 'error' }
  } finally {
    submitting.value = false
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open': return 'bg-green-500/20 text-green-700'
    case 'locked': return 'bg-amber-500/20 text-amber-700'
    case 'completed': return 'bg-blue-500/20 text-blue-700'
    default: return 'bg-slate-500/20 text-slate-700'
  }
}
</script>

<template>
  <div class="min-h-screen py-12 px-4 flex flex-col items-center">
    <!-- Header/Logo -->
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
        Badminton RSVP
      </h1>
      <p class="text-slate-500">Secure your spot on the court</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="glass-card p-12 text-center">
      <div class="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="opacity-70 font-bold">Fetching session details...</p>
    </div>

    <!-- Main Content -->
    <div v-else-if="session" class="w-full max-w-md space-y-6">
      <!-- Session Card -->
      <div class="glass-card p-6 space-y-4">
        <div class="flex justify-between items-start">
          <div class="space-y-1">
            <h2 class="text-xl font-black flex items-center gap-2">
              <span>📅</span> {{ session.date }}
            </h2>
            <p class="text-slate-600 flex items-center gap-2">
              <span>⏰</span> {{ session.time }}
            </p>
            <p class="text-slate-600 flex items-center gap-2">
              <span>📍</span> {{ session.location }}
            </p>
          </div>
          <span :class="getStatusBadge(session.status)" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {{ session.status }}
          </span>
        </div>
      </div>

      <!-- Voting Form -->
      <div v-if="session.status === 'open'" class="glass-card p-8 space-y-8">
        <div v-if="message.text" :class="message.type === 'success' ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'" class="p-4 rounded-xl border text-sm font-bold text-center">
          {{ message.text }}
        </div>

        <form @submit.prevent="submitVote" class="space-y-6">
          <!-- User Dropdown -->
          <div class="space-y-2">
            <label class="text-sm font-black text-slate-500 uppercase tracking-wider">Who are you?</label>
            <select 
              v-model="vote.rosterId" 
              @change="fetchUserVote(vote.rosterId)"
              required 
              class="w-full px-4 py-4 bg-white/40 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-bold"
            >
              <option value="" disabled>Select your name...</option>
              <option v-for="member in roster" :key="member.id" :value="member.id" class="text-slate-900">
                {{ member.name }}
              </option>
            </select>
          </div>

          <!-- RSVP Radio -->
          <div class="space-y-2">
            <label class="text-sm font-black text-slate-500 uppercase tracking-wider">Are you joining?</label>
            <div class="grid grid-cols-2 gap-4">
              <label class="cursor-pointer">
                <input type="radio" v-model="vote.isJoining" :value="true" class="hidden peer" />
                <div class="w-full py-4 text-center border-2 border-white/20 rounded-2xl font-bold bg-white/20 peer-checked:border-indigo-600 peer-checked:bg-indigo-600/10 peer-checked:text-indigo-700 transition-all">
                  Joining
                </div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" v-model="vote.isJoining" :value="false" class="hidden peer" />
                <div class="w-full py-4 text-center border-2 border-white/20 rounded-2xl font-bold bg-white/20 peer-checked:border-red-600 peer-checked:bg-red-600/10 peer-checked:text-red-700 transition-all">
                  No
                </div>
              </label>
            </div>
          </div>

          <!-- Guest Count -->
          <div v-if="vote.isJoining" class="space-y-2">
            <label class="text-sm font-black text-slate-500 uppercase tracking-wider">Guest Count (Optional)</label>
            <input 
              v-model.number="vote.guestCount" 
              type="number" 
              min="0" 
              class="w-full px-4 py-4 bg-white/40 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              placeholder="0"
            />
          </div>

          <!-- Submit -->
          <button 
            type="submit" 
            :disabled="submitting"
            class="w-full indigo-purple-badge py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span v-if="submitting" class="animate-spin h-6 w-6 border-4 border-white/30 border-t-white rounded-full"></span>
            {{ submitting ? 'Submitting...' : 'Confirm RSVP 🏸' }}
          </button>
        </form>
      </div>

      <!-- Closed/Locked Message -->
      <div v-else class="glass-card p-12 text-center space-y-4">
        <span class="text-5xl block">🔒</span>
        <h3 class="text-2xl font-black">Voting Closed</h3>
        <p class="text-slate-500">This session is no longer accepting new RSVPs.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-20 opacity-40 text-[10px] font-black uppercase tracking-[0.2em]">
      Powered by Badminton Manager
    </div>
  </div>
</template>

<style scoped>
/* Standard Select Arrow Customization */
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.5em;
}

.indigo-purple-badge {
  background: linear-gradient(135deg, #4f46e5, #9333ea);
  color: white;
  border: none;
}
</style>
