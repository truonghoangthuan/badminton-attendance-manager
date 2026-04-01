<script setup lang="ts">
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'

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
      name: newMemberName.value,
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
      name: editName.value
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

<template>
  <div class="space-y-8 max-w-4xl">
    <div>
      <h1 class="text-4xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-2">
        Team Roster
      </h1>
      <p class="text-slate-900 opacity-70">Manage your player list and availability</p>
    </div>

    <!-- Quick Add Form -->
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
        <span class="opacity-70">➕</span> Add New Member
      </h2>
      <form @submit.prevent="addMember" class="flex flex-col sm:flex-row gap-3">
        <input 
          v-model="newMemberName" 
          type="text" 
          placeholder="Enter player name..." 
          required
          class="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
        <button 
          type="submit" 
          :disabled="adding" 
          class="indigo-purple-badge px-6 py-3 font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span v-if="adding" class="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
          {{ adding ? 'Adding...' : 'Add Player' }}
        </button>
      </form>
    </div>

    <!-- Member List -->
    <div class="glass-card overflow-hidden">
      <div v-if="loading" class="p-12 text-center opacity-70 animate-pulse">
        <span class="text-2xl">🏸</span> Loading roster...
      </div>
      
      <div v-else-if="error" class="p-8 text-center text-red-500 bg-red-500/10 border border-red-500/20 m-6 rounded-xl">
        <span class="text-2xl block mb-2">⚠️</span>
        {{ error }}
      </div>
      
      <div v-else-if="members.length === 0" class="p-12 text-center opacity-70">
        No members found. Add one above!
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-white/5 border-b border-white/10">
              <th class="px-6 py-4 font-bold text-sm uppercase tracking-wider">Member Name</th>
              <th class="px-6 py-4 font-bold text-sm uppercase tracking-wider text-center">Status</th>
              <th class="px-6 py-4 font-bold text-sm uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="member in members" :key="member.id" class="hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div v-if="editingId === member.id" class="flex gap-2">
                  <input 
                    v-model="editName" 
                    class="px-2 py-1 bg-white/10 border border-white/20 rounded-lg outline-none w-full"
                    @keyup.enter="saveEdit(member.id)"
                  />
                  <button @click="saveEdit(member.id)" class="text-green-500">✅</button>
                  <button @click="cancelEdit" class="text-red-500">❌</button>
                </div>
                <span v-else :class="{ 'opacity-40 line-through': !member.isActive }" class="font-medium">
                  {{ member.name }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <button 
                  @click="toggleStatus(member)"
                  class="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  :class="member.isActive ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'"
                >
                  {{ member.isActive ? 'ACTIVE' : 'INACTIVE' }}
                </button>
              </td>
              <td class="px-6 py-4 text-right flex justify-end gap-3">
                <button 
                  @click="startEdit(member)" 
                  class="opacity-60 hover:opacity-100 transition-all text-sm"
                  title="Edit Name"
                >
                  ✏️ Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.indigo-purple-badge {
  background: linear-gradient(to right, var(--color-indigo-600), var(--color-purple-600));
  color: white;
  border: none;
}

.animate-spin {
  border-top-color: transparent;
}
</style>
