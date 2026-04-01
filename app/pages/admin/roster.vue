<template>
  <div class="space-y-12 pb-20">
    <!-- Page Header -->
    <header class="space-y-1">
      <h1 class="text-4xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
        Team Roster
      </h1>
      <p class="text-white/70 font-bold uppercase tracking-[0.2em] text-xs">Manage player directory & availability</p>
    </header>

    <!-- Quick Add Form -->
    <UIGlassCard class="!p-8">
      <div class="mb-8">
        <h2 class="text-2xl font-black">Add New Member</h2>
        <p class="text-white/70 text-sm font-medium">Register a regular player to the club</p>
      </div>
      
      <form @submit.prevent="addMember" class="flex flex-col sm:flex-row gap-4 items-end">
        <UIGlassInput 
          v-model="newMemberName" 
          placeholder="Enter player name..." 
          label="Player Full Name"
          required
        />
        <UIGlassButton 
          type="submit" 
          :disabled="adding" 
          class="!px-10 h-14"
        >
          <Loader2 v-if="adding" class="animate-spin" :size="20" />
          <span v-else>Add Player</span>
        </UIGlassButton>
      </form>
    </UIGlassCard>

    <!-- Member List -->
    <UIGlassCard class="!p-0 overflow-hidden">
      <div v-if="loading" class="p-20 flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-brand-indigo" :size="40" />
        <p class="text-white/70 font-black uppercase tracking-widest text-xs">Loading Roster...</p>
      </div>
      
      <div v-else-if="error" class="p-8 text-center text-red-400 bg-red-400/5 m-6 rounded-2xl border border-red-400/20">
        <AlertTriangle class="mx-auto mb-3" :size="32" />
        <p class="font-bold">{{ error }}</p>
      </div>
      
      <div v-else-if="members.length === 0" class="p-20 text-center space-y-4">
        <UsersIcon class="mx-auto text-white/20" :size="48" />
        <p class="text-white/70 font-medium">No members found. Add one above!</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-white/5 border-b border-white/10">
              <th class="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/60">Member Name</th>
              <th class="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/60 text-center">Status</th>
              <th class="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="member in members" :key="member.id" class="group hover:bg-white/5 transition-colors">
              <td class="px-8 py-6">
                <div v-if="editingId === member.id" class="flex items-center gap-3">
                  <input 
                    v-model="editName" 
                    class="px-4 py-2 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-brand-indigo/50 text-white w-full max-w-sm"
                    @keyup.enter="saveEdit(member.id)"
                    @focus="($event.target as HTMLInputElement).select()"
                    v-focus
                  />
                  <div class="flex gap-1">
                    <button @click="saveEdit(member.id)" class="p-2 hover:text-green-400 transition-colors" title="Save">
                      <Check :size="18" />
                    </button>
                    <button @click="cancelEdit" class="p-2 hover:text-red-400 transition-colors" title="Cancel">
                      <X :size="18" />
                    </button>
                  </div>
                </div>
                <span v-else :class="{ 'opacity-40 line-through': !member.isActive }" class="font-bold text-lg text-white/80 group-hover:text-white transition-colors">
                  {{ member.name }}
                </span>
              </td>
              <td class="px-8 py-6 text-center">
                <button 
                  @click="toggleStatus(member)"
                  class="px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all border"
                  :class="member.isActive 
                    ? 'bg-green-500/10 text-green-400 border-green-500/10 hover:bg-green-500/20' 
                    : 'bg-red-500/10 text-red-500 border-red-500/10 hover:bg-red-500/20'"
                >
                  {{ member.isActive ? 'ACTIVE' : 'INACTIVE' }}
                </button>
              </td>
              <td class="px-8 py-6 text-right">
                <button 
                  @click="startEdit(member)" 
                  class="text-white/40 hover:text-brand-indigo transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto"
                >
                  <Edit2 :size="14" />
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UIGlassCard>
  </div>
</template>

<script setup lang="ts">
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Users as UsersIcon, Loader2, AlertTriangle, Edit2, Check, X } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { db } = useFirebase()
const rosterRef = collection(db, 'roster')
const members = ref<any[]>([])
const loading = ref(true)

// Add Member Form
const newMemberName = ref('')
const adding = ref(false)

// Edit Member
const editingId = ref<string | null>(null)
const editName = ref('')

const error = ref<string | null>(null)

// Custom directive for auto-focus
const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
}

// Fetch roster in real-time
onMounted(() => {
  const q = query(rosterRef, orderBy('name'))
  const unsubscribe = onSnapshot(q, 
    (snapshot) => {
      members.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      loading.value = false
      error.value = null
    },
    (err) => {
      console.error('Firestore Error:', err)
      error.value = 'Missing permissions to view the roster. Please check your Firestore Security Rules.'
      loading.value = false
    }
  )

  onUnmounted(unsubscribe)
})

const addMember = async () => {
  if (!newMemberName.value.trim()) return
  adding.value = true
  try {
    await addDoc(rosterRef, {
      name: newMemberName.value.trim(),
      isActive: true,
      createdAt: new Date().toISOString()
    })
    newMemberName.value = ''
  } catch (e) {
    console.error('Error adding member', e)
  } finally {
    adding.value = false
  }
}

const toggleStatus = async (member: any) => {
  try {
    const docRef = doc(db, 'roster', member.id)
    await updateDoc(docRef, {
      isActive: !member.isActive
    })
  } catch (e) {
    console.error('Error updating status', e)
  }
}

const startEdit = (member: any) => {
  editingId.value = member.id
  editName.value = member.name
}

const saveEdit = async (id: string) => {
  if (!editName.value.trim()) return
  try {
    const docRef = doc(db, 'roster', id)
    await updateDoc(docRef, {
      name: editName.value.trim()
    })
    editingId.value = null
  } catch (e) {
    console.error('Error updating name', e)
  }
}

const cancelEdit = () => {
  editingId.value = null
}
</script>
