import { useAdminAccess } from '../composables/useAdminAccess'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  
  // Skip if we're already on the login page to avoid infinite redirect
  if (to.path === '/admin/login') {
    return
  }

  const { refreshAdminClaims, isAdmin } = useAdminAccess()
  
  // Force a refresh of the admin claims to ensure we have the most up-to-date status
  const allowed = await refreshAdminClaims()

  if (!allowed || !isAdmin.value) {
    return navigateTo('/admin/login')
  }
})
