import { onAuthStateChanged } from 'firebase/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const { auth } = useFirebase()
  
  // Skip if we're already on the login page to avoid infinite redirect
  if (to.path === '/admin/login') {
    return
  }

  // Define a promise to wait for the auth state to satisfy
  const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe()
          resolve(user)
        },
        reject
      )
    })
  }

  const user = await getCurrentUser()

  if (!user) {
    return navigateTo('/admin/login')
  }
})
