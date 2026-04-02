<script setup lang="ts">
import { doc, getDoc, collection, query, where, getDocs, setDoc, addDoc, orderBy, onSnapshot } from 'firebase/firestore'
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, User, Users as UsersIcon, Loader2, Check, Minus } from 'lucide-vue-next'

const route = useRoute()
const sessionId = route.params.id as string
const { user, profile, loading: authLoading, setProfile } = useUserProfile()
const { db } = useFirebase()

const session = ref<any>(null)
const attendanceList = ref<any[]>([])
const loading = ref(true)
const submitting = ref(false)
const message = ref({ text: '', type: '' })

// Form State
const newName = ref('')
const vote = ref({
  isJoining: true,
  guestCount: 0
})

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

    // 2. Setup real-time attendance listener
    const attendancesRef = collection(db, `sessions/${sessionId}/attendances`)
    const qAttendance = query(attendancesRef, orderBy('updatedAt', 'desc'))
    const unsubscribeSnapshot = onSnapshot(qAttendance, (snapshot) => {
      attendanceList.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    })

    // 3. Initial check for existing vote (if profile is already loaded)
    watchEffect(() => {
      if (user.value && attendanceList.value.length) {
        const myVote = attendanceList.value.find(a => a.id === user.value?.uid)
        if (myVote) {
          vote.value.isJoining = myVote.isJoining
          vote.value.guestCount = myVote.guestCount || 0
        }
      }
    })

    onUnmounted(unsubscribeSnapshot)
  } catch (e: any) {
    console.error('Error loading session:', e)
    message.value = { text: 'Error loading session data.', type: 'error' }
  } finally {
    loading.value = false
  }
})

const submitVote = async () => {
  if (!user.value) {
    message.value = { text: 'Identifying you... please wait.', type: 'error' }
    return
  }

  // Handle first-time name registration
  if (!profile.value?.displayName) {
    if (!newName.value.trim()) {
      message.value = { text: 'Please enter your name first.', type: 'error' }
      return
    }
    const success = await setProfile(newName.value.trim())
    if (!success) {
      message.value = { text: 'Failed to save your profile.', type: 'error' }
      return
    }
  }

  submitting.value = true
  try {
    const displayName = profile.value.displayName
    const uid = user.value.uid

    // Save to Firestore - using UID as the document ID for attendance
    const attendanceRef = doc(db, `sessions/${sessionId}/attendances`, uid)
    await setDoc(attendanceRef, {
      uid, // Store UID as well
      name: displayName,
      isJoining: vote.value.isJoining,
      guestCount: vote.value.guestCount,
      actualAttended: vote.value.isJoining, 
      hasPaid: false,
      updatedAt: new Date().toISOString()
    })

    message.value = { text: 'Successfully RSVP\'d! See you there! 🏸', type: 'success' }
    
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
  <div class="min-h-screen lg:min-h-[100dvh] flex flex-col max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
    <!-- Header (Condensed for 100vh) -->
    <div class="mb-6 lg:mb-10 text-center lg:text-left space-y-1 shrink-0">
      <h1 class="text-3xl lg:text-5xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
        Session RSVP
      </h1>
      <p class="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]">Badminton Attendance Manager</p>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="lg:grid lg:grid-cols-12 gap-8">
      <div class="lg:col-span-12">
        <UIGlassCard class="w-full relative overflow-hidden animate-pulse min-h-[400px]">
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
      </div>
    </div>
    
    <!-- Content -->
    <div v-else-if="session" class="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-stretch h-full">
      <!-- Left Column: Session Info & RSVP Form (Scrollable) -->
      <div class="lg:col-span-5 flex flex-col gap-6 pb-10">
        <!-- Session Details Card -->
        <UIGlassCard class="relative overflow-hidden group shrink-0">
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
              <div class="w-14 h-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo shadow-inner border border-white/5">
                <Calendar :size="28" />
              </div>
              <div>
                <h2 class="text-2xl font-black tracking-tight">{{ session.date }}</h2>
                <p class="text-white/70 font-bold text-xs tracking-wide">Weekly Badminton Match</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex items-center gap-3 text-white/60 font-medium bg-white/5 p-3 rounded-2xl border border-white/5">
                <Clock :size="18" class="text-brand-purple" />
                <span class="text-sm">{{ session.time }}</span>
              </div>
              <div class="flex items-center gap-3 text-white/60 font-medium bg-white/5 p-3 rounded-2xl border border-white/5">
                <MapPin :size="18" class="text-brand-blue" />
                <span class="truncate text-sm">{{ session.location }}</span>
              </div>
            </div>
          </div>
        </UIGlassCard>

        <!-- RSVP Form -->
        <UIGlassCard v-if="session.status === 'open'" class="!p-8 space-y-8 shrink-0">
          <!-- Message -->
          <div v-if="message.text" 
            :class="message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'" 
            class="p-4 rounded-2xl border text-sm font-bold text-center animate-fade-in"
          >
            {{ message.text }}
          </div>

          <form @submit.prevent="submitVote" class="space-y-8">
            <!-- Identity Verification -->
            <div class="space-y-4">
               <label class="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] px-1">Identity Verification</label>
               
               <!-- Loading State -->
               <div v-if="authLoading" class="flex items-center gap-3 py-4 px-6 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
                  <Loader2 class="animate-spin text-white/20" :size="20" />
                  <span class="text-white/40 font-bold text-sm">Identifying secure session...</span>
               </div>

               <!-- Name Registration (For New Users) -->
               <div v-else-if="!profile?.displayName" class="animate-fade-in group">
                  <UIGlassInput 
                    v-model="newName" 
                    placeholder="Enter your full name" 
                    label="Your Full Name"
                    required
                  >
                    <template #icon><User :size="20" /></template>
                  </UIGlassInput>
                  <p class="mt-2 text-[10px] text-white/40 px-1 italic">This name will be saved for all future sessions on this device.</p>
               </div>

               <!-- Recognized Profile (For Returning Users) -->
               <div v-else class="flex items-center justify-between p-5 bg-brand-indigo/10 border border-brand-indigo/20 rounded-2xl animate-fade-in">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-brand-indigo/20 flex items-center justify-center text-brand-indigo shadow-inner border border-white/5">
                      <User :size="20" />
                    </div>
                    <div>
                      <p class="text-[10px] font-black text-brand-indigo/60 uppercase tracking-widest">Registering as</p>
                      <h4 class="text-lg font-black text-white">{{ profile.displayName }}</h4>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    @click="profile.displayName = ''"
                    class="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white/80 transition-all"
                    title="Change Name"
                  >
                    <User :size="16" />
                  </button>
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
              <span v-else>Confirm My Spot</span>
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
      </div>

      <!-- Right Column: Registered Player List (Height matches left) -->
      <div class="lg:col-span-7 flex flex-col pb-10">
        <UIGlassCard v-if="attendanceList.length > 0" class="!p-8 h-full flex flex-col animate-fade-in min-h-[400px]">
          <div class="flex items-center justify-between mb-8 shrink-0">
            <div>
              <h3 class="text-2xl lg:text-3xl font-black">Registered Players</h3>
              <p class="text-white/40 text-sm font-medium">Real-time attendance & payment status</p>
            </div>
            <div class="flex items-center gap-2 bg-brand-indigo/10 px-4 py-2 rounded-xl border border-brand-indigo/20">
              <UsersIcon class="text-brand-indigo" :size="18" />
              <span class="text-sm font-black text-brand-indigo">
                {{ attendanceList.filter(a => a.isJoining).reduce((acc, a) => acc + 1 + (a.guestCount || 0), 0) }} Players
              </span>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 lg:max-h-[min(70vh,800px)]">
            <table class="w-full text-left">
              <thead class="sticky top-0 bg-slate-900/0 backdrop-blur-sm z-10 shadow-sm shadow-white/5">
                <tr class="text-[10px] font-black uppercase tracking-widest text-white/60 border-b border-white/5">
                  <th class="px-4 py-4 backdrop-blur-md">Player</th>
                  <th class="px-4 py-4 text-center backdrop-blur-md">Status</th>
                  <th class="px-4 py-4 text-center backdrop-blur-md">Guests</th>
                  <th class="px-4 py-4 text-right backdrop-blur-md">Payment</th>
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
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
