import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export const useUserProfile = () => {
  const { auth, db } = useFirebase()
  const user = useState<User | null>('auth-user', () => null)
  const profile = useState<any>('user-profile', () => null)
  const loading = useState('auth-loading', () => true)

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

  // Initialize Auth (only once)
  if (import.meta.client && loading.value) {
    onMounted(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          // No user, sign in anonymously for the public flow
          try {
            await signInAnonymously(auth)
          } catch (e) {
            console.error('Error signing in anonymously:', e)
            loading.value = false
          }
          return
        }

        // We have a user (anonymous or email/password)
        user.value = currentUser
        await fetchProfile(currentUser.uid)
        loading.value = false
      })

      onUnmounted(unsubscribe)
    })
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
      const isNew = !profile.value
      const finalData = isNew 
        ? { ...data, createdAt: serverTimestamp() }
        : data

      await setDoc(docRef, finalData, { merge: true })
      
      // Update local state
      profile.value = { ...profile.value, ...finalData }
      return true
    } catch (e) {
      console.error('Error setting profile:', e)
      return false
    }
  }

  const hasUsername = computed(() => !!profile.value?.displayName)

  return {
    user,
    profile,
    loading,
    hasUsername,
    setProfile,
    fetchProfile
  }
}
