import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export const useUserProfile = () => {
  const { auth, db, storage } = useFirebase()
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

  const uploadQRCode = async (file: File) => {
    if (!user.value) return null

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `payment_qrs/${user.value.uid}.${fileExt}`
      const qrRef = storageRef(storage, fileName)

      const snapshot = await uploadBytes(qrRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Save URL to profile
      const docRef = doc(db, 'profiles', user.value.uid)
      await setDoc(docRef, { 
        paymentQR: downloadURL,
        updatedAt: serverTimestamp() 
      }, { merge: true })

      // Update local state
      if (profile.value) {
        profile.value.paymentQR = downloadURL
      }
      
      return downloadURL
    } catch (e) {
      console.error('Error uploading QR code:', e)
      throw e
    }
  }

  const deleteQRCode = async () => {
    if (!user.value || !profile.value?.paymentQR) return

    try {
      // Extract file path from URL or just use the standard path
      // Since we use {uid}.{ext}, we need to find it. 
      // Simplified: just update Firestore to null and optionally delete file
      // In a real app, you'd want to delete the file from Storage too.
      
      const docRef = doc(db, 'profiles', user.value.uid)
      await setDoc(docRef, { 
        paymentQR: null,
        updatedAt: serverTimestamp() 
      }, { merge: true })

      if (profile.value) {
        profile.value.paymentQR = null
      }
    } catch (e) {
      console.error('Error deleting QR code:', e)
      throw e
    }
  }

  const hasUsername = computed(() => !!profile.value?.displayName)

  return {
    user,
    profile,
    loading,
    hasUsername,
    setProfile,
    fetchProfile,
    uploadQRCode,
    deleteQRCode
  }
}
