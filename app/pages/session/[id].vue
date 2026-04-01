<script setup lang="ts">
import { doc, getDoc, collection, query, where, getDocs, setDoc, addDoc, orderBy, onSnapshot } from 'firebase/firestore'
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, User, Users as UsersIcon, Loader2, Check, Minus } from 'lucide-vue-next'

const route = useRoute()
const sessionId = route.params.id as string
const { db } = useFirebase()

const session = ref<any>(null)
const roster = ref<any[]>([])
const attendanceList = ref<any[]>([])
const loading = ref(true)
const submitting = ref(false)
const message = ref({ text: '', type: '' })

// Form State
const isNewPlayer = ref(false)
const newPlayerName = ref('')
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
    const qRoster = query(collection(db, 'roster'), where('isActive', '==', true), orderBy('name'))
    const rosterSnap = await getDocs(qRoster)
    roster.value = rosterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // 3. Setup real-time attendance listener
    const attendancesRef = collection(db, `sessions/${sessionId}/attendances`)
    const qAttendance = query(attendancesRef, orderBy('updatedAt', 'desc'))
    const unsubscribe = onSnapshot(qAttendance, (snapshot) => {
      attendanceList.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    })

    // 4. Device Tracking: Load from LocalStorage
    const savedUserId = localStorage.getItem(STORAGE_KEY)
    if (savedUserId) {
      vote.value.rosterId = savedUserId
      await fetchUserVote(savedUserId)
    }

    onUnmounted(unsubscribe)
  } catch (e: any) {
    console.error('Error loading session:', e)
    message.value = { text: 'Error loading session data.', type: 'error' }
  } finally {
    loading.value = false
  }
})

const handleSelectionChange = async () => {
  if (vote.value.rosterId === 'new') {
    isNewPlayer.value = true
    return
  }
  
  isNewPlayer.value = false
  if (vote.value.rosterId) {
    await fetchUserVote(vote.value.rosterId)
  }
}

const fetchUserVote = async (rosterId: string) => {
  if (!rosterId || rosterId === 'new') return
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

  if (vote.value.rosterId === 'new' && !newPlayerName.value.trim()) {
    message.value = { text: 'Please enter your name.', type: 'error' }
    return
  }

  submitting.value = true
  try {
    let rosterId = vote.value.rosterId
    let displayName = ''

    // 1. Handle New Player Creation
    if (rosterId === 'new') {
      const rosterRef = collection(db, 'roster')
      const newDoc = await addDoc(rosterRef, {
        name: newPlayerName.value.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      })
      rosterId = newDoc.id
      displayName = newPlayerName.value.trim()
    } else {
      const selectedUser = roster.value.find(u => u.id === rosterId)
      displayName = selectedUser?.name || 'Unknown Player'
    }
    
    // Save to LocalStorage
    localStorage.setItem(STORAGE_KEY, rosterId)

    // Save to Firestore
    const attendanceRef = doc(db, `sessions/${sessionId}/attendances`, rosterId)
    await setDoc(attendanceRef, {
      rosterId,
      name: displayName,
      isJoining: vote.value.isJoining,
      guestCount: vote.value.guestCount,
      actualAttended: vote.value.isJoining, 
      hasPaid: false,
      updatedAt: new Date().toISOString()
    })

    message.value = { text: 'Successfully RSVP\'d! See you there! 🏸', type: 'success' }
    
    // Update local state to reflect the new ID
    vote.value.rosterId = rosterId
    isNewPlayer.value = false

    // Reset message after 3 seconds
    setTimeout(() => {
      message.value = { text: '', type: '' }
    }, 3000)
  } catch (e) {
    console.error('Error submitting vote:', e)
    message.value = { text: 'Failed to submit RSVP.', type: 'error' }
  } finally {
    submitting.value = false
  }
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
  <div class="min-h-[80vh] flex flex-col items-center justify-center max-w-2xl mx-auto py-12 px-4">
    <!-- Header -->
    <div class="mb-12 text-center space-y-2">
      <h1 class="text-5xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
        Session RSVP
      </h1>
      <p class="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]">Badminton Attendance Manager</p>
    </div>

    <!-- Loading Skeleton -->
    <UIGlassCard v-if="loading" class="w-full relative overflow-hidden animate-pulse min-h-[300px]">
      <div class="flex items-center gap-4 mb-10">
        <div class="w-16 h-16 rounded-2xl bg-white/5" />
        <div class="space-y-3">
          <div class="w-48 h-8 bg-white/10 rounded-lg" />
          <div class="w-32 h-4 bg-white/5 rounded-lg" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-10">
        <div class="h-14 bg-white/5 rounded-2xl" />
        <div class="h-14 bg-white/5 rounded-2xl" />
      </div>
      <div class="space-y-4">
        <div class="w-24 h-4 bg-white/5 rounded-lg" />
        <div class="h-14 bg-white/5 rounded-2xl" />
      </div>
    </UIGlassCard>
    
    <div v-if="loading" class="w-full mt-6 space-y-4 animate-pulse">
        <div class="w-32 h-6 bg-white/5 rounded-lg mx-auto" />
    </div>

    <!-- Content -->
    <div v-else-if="session" class="w-full space-y-6">
      <!-- Session Details Card -->
      <UIGlassCard class="relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 flex items-center gap-2">
           <div v-if="session.status?.toLowerCase() === 'open'" class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
           </div>
           <span :class="getStatusColor(session.status)" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
            {{ session.status }}
          </span>
        </div>
        
        <div class="space-y-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo shadow-inner border border-white/5">
              <Calendar :size="32" />
            </div>
            <div>
              <h2 class="text-3xl font-black tracking-tight">{{ session.date }}</h2>
              <p class="text-white/70 font-bold text-sm tracking-wide">Weekly Badminton Match</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex items-center gap-3 text-white/60 font-medium bg-white/5 p-4 rounded-2xl border border-white/5">
              <Clock :size="20" class="text-brand-purple" />
              <span>{{ session.time }}</span>
            </div>
            <div class="flex items-center gap-3 text-white/60 font-medium bg-white/5 p-4 rounded-2xl border border-white/5">
              <MapPin :size="20" class="text-brand-blue" />
              <span class="truncate">{{ session.location }}</span>
            </div>
          </div>
        </div>
      </UIGlassCard>

      <!-- RSVP Form -->
      <UIGlassCard v-if="session.status === 'open'" class="!p-8 space-y-8">
        <!-- Message -->
        <div v-if="message.text" 
          :class="message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'" 
          class="p-4 rounded-2xl border text-sm font-bold text-center animate-fade-in"
        >
          {{ message.text }}
        </div>

        <form @submit.prevent="submitVote" class="space-y-8">
          <!-- Member Selection -->
          <div class="space-y-3">
             <label class="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] px-1">Identity Verification</label>
             <div class="relative group">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-indigo transition-colors z-10">
                  <User :size="20" />
                </div>
                <select 
                  v-model="vote.rosterId" 
                  @change="handleSelectionChange"
                  required 
                  class="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-indigo/10 focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer font-bold text-white"
                >
                  <option value="" disabled class="bg-slate-900">Choose your name...</option>
                  <option v-for="member in roster" :key="member.id" :value="member.id" class="bg-slate-900">
                    {{ member.name }}
                  </option>
                  <option value="new" class="bg-slate-900 font-black text-brand-indigo">+ I'M NOT ON THE LIST / ADD ME</option>
                </select>
             </div>

             <!-- New Member Name Input -->
             <div v-if="isNewPlayer" class="animate-fade-in pt-2">
                <UIGlassInput 
                  v-model="newPlayerName" 
                  placeholder="Enter your full name" 
                  label="Your Full Name"
                  required
                >
                  <template #icon><User :size="20" /></template>
                </UIGlassInput>
             </div>
          </div>

          <!-- RSVP Action -->
          <div class="space-y-3">
            <label class="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] px-1">Court Attendance</label>
            <div class="grid grid-cols-2 gap-4">
              <label class="cursor-pointer group">
                <input type="radio" v-model="vote.isJoining" :value="true" class="hidden peer" />
                <div class="w-full flex items-center justify-center gap-3 py-4 border border-white/10 rounded-2xl font-bold bg-white/5 peer-checked:border-green-500 peer-checked:bg-green-500/10 peer-checked:text-green-400 transition-all group-hover:bg-white/10">
                  <CheckCircle2 :size="20" v-if="vote.isJoining" />
                  Joining
                </div>
              </label>
              <label class="cursor-pointer group">
                <input type="radio" v-model="vote.isJoining" :value="false" class="hidden peer" />
                <div class="w-full flex items-center justify-center gap-3 py-4 border border-white/10 rounded-2xl font-bold bg-white/5 peer-checked:border-red-500 peer-checked:bg-red-500/10 peer-checked:text-red-400 transition-all group-hover:bg-white/10">
                  <XCircle :size="20" v-if="!vote.isJoining" />
                  Not Available
                </div>
              </label>
            </div>
          </div>

          <!-- Guest Settings -->
          <div v-if="vote.isJoining" class="space-y-3 animate-fade-in">
             <UIGlassInput 
               v-model.number="vote.guestCount" 
               label="Extra Guest Count"
               type="number"
               min="0"
               placeholder="How many friends?"
             >
               <template #icon><UsersIcon :size="20" /></template>
             </UIGlassInput>
          </div>

          <!-- Submit Action -->
          <UIGlassButton 
            type="submit" 
            :disabled="submitting"
            class="w-full !py-6 !text-xl"
          >
            <Loader2 v-if="submitting" class="animate-spin" :size="24" />
            <span v-else>Confirm My Spot 🏸</span>
          </UIGlassButton>
        </form>
      </UIGlassCard>

      <!-- Closed Message (Alternative) -->
      <UIGlassCard v-if="session.status !== 'open' && attendanceList.length === 0" class="!py-20 text-center space-y-6">
        <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
          <XCircle class="text-white/20" :size="40" />
        </div>
        <div>
          <h3 class="text-2xl font-black">Gate is Closed</h3>
          <p class="text-white/40 font-medium">This session is no longer accepting RSVPs.</p>
        </div>
        <NuxtLink to="/">
          <UIGlassButton variant="secondary">Back to Home</UIGlassButton>
        </NuxtLink>
      </UIGlassCard>

      <!-- Public Registration List -->
      <UIGlassCard v-if="attendanceList.length > 0" class="!p-8 space-y-8 animate-fade-in">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-black">Registered Players</h3>
            <p class="text-white/40 text-sm font-medium">Real-time attendance & payment status</p>
          </div>
          <div class="flex items-center gap-2 bg-brand-indigo/10 px-4 py-2 rounded-xl border border-brand-indigo/20">
            <UsersIcon class="text-brand-indigo" :size="18" />
            <span class="text-sm font-black text-brand-indigo">
              {{ attendanceList.filter(a => a.isJoining).reduce((acc, a) => acc + 1 + (a.guestCount || 0), 0) }} Players
            </span>
          </div>
        </div>

        <div class="overflow-x-auto -mx-8 sm:mx-0">
          <table class="w-full text-left">
            <thead>
              <tr class="text-[10px] font-black uppercase tracking-widest text-white/60 border-b border-white/5">
                <th class="px-4 py-4">Player</th>
                <th class="px-4 py-4 text-center">Status</th>
                <th class="px-4 py-4 text-center">Guests</th>
                <th class="px-4 py-4 text-right">Payment</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="att in attendanceList" :key="att.id" class="group hover:bg-white/5 transition-colors">
                <td class="px-4 py-4">
                  <span class="font-bold text-white/80 group-hover:text-white transition-colors">{{ att.name }}</span>
                </td>
                <td class="px-4 py-4 text-center">
                  <div class="flex justify-center">
                    <span v-if="att.isJoining" class="px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-black uppercase border border-green-500/10">JOINING</span>
                    <span v-else class="px-2 py-1 rounded-md bg-white/5 text-white/20 text-[10px] font-black uppercase border border-white/5">AWAY</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-center">
                  <span class="font-mono text-sm text-white/40">{{ att.guestCount || 0 }}</span>
                </td>
                <td class="px-4 py-4 text-right">
                  <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md" :class="att.hasPaid ? 'bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/10' : 'bg-amber-500/5 text-amber-500/40 border border-amber-500/5'">
                    <Check v-if="att.hasPaid" :size="10" stroke-width="4" />
                    <Minus v-else :size="10" stroke-width="4" />
                    <span class="text-[9px] font-black uppercase tracking-wider">{{ att.hasPaid ? 'PAID' : 'UNPAID' }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UIGlassCard>
    </div>
  </div>
</template>

<style scoped>
/* Standard Select Arrow Customization */
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.2)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.5em;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}
</style>
