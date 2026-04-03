<script setup lang="ts">
import { doc, getDoc, collection, setDoc, orderBy, onSnapshot, query } from 'firebase/firestore'
import { Check, Clock3, Loader2, MapPin, User, Users as UsersIcon, XCircle } from 'lucide-vue-next'

const route = useRoute()
const sessionId = route.params.id as string
const { user, profile, loading: authLoading, setProfile } = useUserProfile()
const { db } = useFirebase()

const session = ref<any>(null)
const attendanceList = ref<any[]>([])
const loading = ref(true)
const submitting = ref(false)
const message = ref({ text: '', type: '' })
const newName = ref('')
const vote = ref({
  isJoining: true,
  guestCount: 0
})

onMounted(async () => {
  try {
    const sessionDoc = await getDoc(doc(db, 'sessions', sessionId))
    if (!sessionDoc.exists()) {
      message.value = { text: 'Session not found.', type: 'error' }
      loading.value = false
      return
    }

    session.value = { id: sessionDoc.id, ...sessionDoc.data() }

    const attendancesRef = collection(db, `sessions/${sessionId}/attendances`)
    const qAttendance = query(attendancesRef, orderBy('updatedAt', 'desc'))
    const unsubscribeSnapshot = onSnapshot(qAttendance, snapshot => {
      attendanceList.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    })

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
  } catch (e) {
    console.error('Error loading session:', e)
    message.value = { text: 'Error loading session data.', type: 'error' }
  } finally {
    loading.value = false
  }
})

const submitVote = async () => {
  if (!user.value) {
    message.value = { text: 'Please wait a moment.', type: 'error' }
    return
  }

  if (!profile.value?.displayName) {
    if (!newName.value.trim()) {
      message.value = { text: 'Please enter your name.', type: 'error' }
      return
    }

    const success = await setProfile(newName.value.trim())
    if (!success) {
      message.value = { text: 'Could not save your name.', type: 'error' }
      return
    }
  }

  submitting.value = true
  try {
    const uid = user.value.uid
    const displayName = profile.value?.displayName || newName.value.trim()
    const attendanceRef = doc(db, `sessions/${sessionId}/attendances`, uid)

    await setDoc(attendanceRef, {
      uid,
      name: displayName,
      isJoining: vote.value.isJoining,
      guestCount: vote.value.guestCount,
      actualAttended: vote.value.isJoining,
      hasPaid: false,
      updatedAt: new Date().toISOString()
    })

    message.value = {
      text: vote.value.isJoining ? 'You are in.' : 'You are marked unavailable.',
      type: 'success'
    }

    setTimeout(() => {
      message.value = { text: '', type: '' }
    }, 3000)
  } catch (e) {
    console.error('Error submitting vote:', e)
    message.value = { text: 'Failed to save your RSVP.', type: 'error' }
  } finally {
    submitting.value = false
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'locked':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'completed':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-white text-brand-slate border-brand-line'
  }
}
</script>

<template>
  <div class="space-y-8 pb-14">
    <section v-if="loading" class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <UIGlassCard class="animate-pulse space-y-4">
        <div class="h-8 w-40 rounded bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
      </UIGlassCard>
      <UIGlassCard class="animate-pulse space-y-4">
        <div class="h-12 rounded-2xl bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
        <div class="h-12 rounded-2xl bg-brand-sand" />
      </UIGlassCard>
    </section>

    <template v-else-if="session">
      <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <UIGlassCard class="space-y-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="section-kicker">Session</p>
              <h1 class="mt-2 text-3xl font-black tracking-tight">{{ session.date }}</h1>
            </div>
            <span :class="getStatusColor(session.status)" class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
              {{ session.status }}
            </span>
          </div>

          <div class="space-y-3">
            <div class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-sm font-medium">
              <Clock3 :size="16" class="text-brand-court" />
              {{ session.time }}
            </div>
            <div class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-sm font-medium">
              <MapPin :size="16" class="text-brand-blue" />
              {{ session.location }}
            </div>
          </div>

          <div class="rounded-[24px] border border-brand-line bg-brand-sand px-4 py-4">
            <p class="text-sm font-medium text-brand-slate">{{ attendanceList.length }} responses so far</p>
          </div>
        </UIGlassCard>

        <UIGlassCard v-if="session.status === 'open'" class="space-y-5">
          <div>
            <p class="section-kicker">RSVP</p>
            <h2 class="mt-2 text-2xl font-black tracking-tight">Let everyone know if you can make it</h2>
          </div>

          <div
            v-if="message.text"
            :class="message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'"
            class="rounded-[22px] border px-4 py-4 text-sm font-bold"
          >
            {{ message.text }}
          </div>

          <form @submit.prevent="submitVote" class="space-y-4">
            <div v-if="authLoading" class="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-sand px-4 py-4 text-sm font-medium text-brand-slate">
              <Loader2 class="animate-spin text-brand-court" :size="18" />
              Loading your profile...
            </div>

            <UIGlassInput
              v-else-if="!profile?.displayName"
              v-model="newName"
              label="Your Name"
              placeholder="Enter your name"
              required
            >
              <template #icon><User :size="18" /></template>
            </UIGlassInput>

            <div v-else class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4">
              <p class="text-sm font-medium text-brand-slate">Playing as</p>
              <p class="mt-1 text-lg font-black">{{ profile.displayName }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="cursor-pointer">
                <input type="radio" v-model="vote.isJoining" :value="true" class="peer hidden" />
                <div class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4 text-center font-bold transition-all peer-checked:border-brand-court peer-checked:bg-emerald-50">
                  I’m joining
                </div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" v-model="vote.isJoining" :value="false" class="peer hidden" />
                <div class="rounded-[22px] border border-brand-line bg-brand-sand px-4 py-4 text-center font-bold transition-all peer-checked:border-red-200 peer-checked:bg-red-50">
                  Can’t make it
                </div>
              </label>
            </div>

            <UIGlassInput
              v-if="vote.isJoining"
              v-model.number="vote.guestCount"
              label="Guests"
              type="number"
              min="0"
              placeholder="0"
            >
              <template #icon><UsersIcon :size="18" /></template>
            </UIGlassInput>

            <UIGlassButton type="submit" :disabled="submitting" class="w-full">
              <Loader2 v-if="submitting" class="animate-spin" :size="18" />
              <span v-else>Save RSVP</span>
            </UIGlassButton>
          </form>
        </UIGlassCard>

        <UIGlassCard v-else class="space-y-3">
          <p class="section-kicker">RSVP</p>
          <h2 class="text-2xl font-black tracking-tight">This session is closed</h2>
        </UIGlassCard>
      </section>

      <section class="space-y-4">
        <div class="court-divider"><span>Players</span></div>

        <UIGlassCard v-if="attendanceList.length" class="!p-0 overflow-hidden">
          <div class="divide-y divide-brand-line">
            <div v-for="att in attendanceList" :key="att.id" class="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p class="font-black text-brand-ink">{{ att.name }}</p>
                <p class="text-sm font-medium text-brand-slate">
                  {{ att.isJoining ? `Joining${att.guestCount ? ` with ${att.guestCount} guest${att.guestCount > 1 ? 's' : ''}` : ''}` : 'Unavailable' }}
                </p>
              </div>
              <div>
                <Check v-if="att.hasPaid" :size="18" class="text-brand-court" />
                <XCircle v-else :size="18" class="text-brand-slate" />
              </div>
            </div>
          </div>
        </UIGlassCard>
      </section>
    </template>
  </div>
</template>
