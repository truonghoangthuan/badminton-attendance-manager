import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export const useUserProfile = () => {
  const { auth, db } = useFirebase()
  const user = ref<User | null>(null)
  const profile = ref<any>(null)
  const loading = ref(true)

  // Initialize Auth
  onMounted(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          await signInAnonymously(auth)
        } catch (e) {
          console.error('Error signing in anonymously:', e)
        }
      } else {
        user.value = currentUser
        await fetchProfile(currentUser.uid)
      }
      loading.value = false
    })

    onUnmounted(unsubscribe)
  })

  // Fetch Profile from Firestore
  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'profiles', uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        profile.value = docSnap.data()
      } else {
        profile.value = null
      }
    } catch (e) {
      console.error('Error fetching profile:', e)
    }
  }

  // Create or Update Profile
  const setProfile = async (displayName: string) => {
    if (!user.value) return
    
    try {
      const docRef = doc(db, 'profiles', user.value.uid)
      const data = {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
        isAnonymous: user.value.isAnonymous
      }
      
      // If profile doesn't exist, add createdAt
      if (!profile.value) {
        Object.assign(data, { createdAt: serverTimestamp() })
      }

      await setDoc(docRef, data, { merge: true })
      profile.value = { ...profile.value, ...data }
      return true
    } catch (e) {
      console.error('Error setting profile:', e)
      return false
    }
  }

  return {
    user,
    profile,
    loading,
    setProfile,
    fetchProfile
  }
}
