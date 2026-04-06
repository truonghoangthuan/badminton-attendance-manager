import { getIdTokenResult, onAuthStateChanged, type User } from 'firebase/auth'

export const useAdminAccess = () => {
  const { auth } = useFirebase()
  const adminUser = useState<User | null>('admin-auth-user', () => null)
  const isAdmin = useState<boolean>('admin-is-admin', () => false)
  const claimsLoading = useState<boolean>('admin-claims-loading', () => true)

  const refreshAdminClaims = async (forceRefresh = false) => {
    const currentUser = auth.currentUser

    if (!currentUser) {
      adminUser.value = null
      isAdmin.value = false
      claimsLoading.value = false
      return false
    }

    const tokenResult = await getIdTokenResult(currentUser, forceRefresh)
    adminUser.value = currentUser
    isAdmin.value = tokenResult.claims.admin === true
    claimsLoading.value = false

    return isAdmin.value
  }

  if (import.meta.client && claimsLoading.value) {
    onMounted(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          adminUser.value = null
          isAdmin.value = false
          claimsLoading.value = false
          return
        }

        claimsLoading.value = true
        await refreshAdminClaims()
      })

      onUnmounted(unsubscribe)
    })
  }

  return {
    adminUser,
    isAdmin,
    claimsLoading,
    refreshAdminClaims,
  }
}
