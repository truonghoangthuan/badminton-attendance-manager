<script setup lang="ts">
import { signInWithEmailAndPassword } from 'firebase/auth'
import { CalendarDays, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { useAdminAccess } from '../../composables/useAdminAccess'

const { auth } = useFirebase()
const { refreshAdminClaims } = useAdminAccess()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    const allowed = await refreshAdminClaims(true)

    if (!allowed) {
      await auth.signOut()
      error.value = 'This account does not have admin access.'
      return
    }

    router.push('/admin')
  } catch (e: any) {
    error.value = e.message || 'Failed to login'
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: false
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-brand-sand px-4 py-8 sm:px-6 lg:px-8">
    <div class="bg-mesh" />
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="mesh-glow left-[-12rem] top-[-6rem] opacity-90" />
      <div class="mesh-glow bottom-[-16rem] right-[-10rem] opacity-70" />
      <div class="absolute left-[10%] top-[14%] h-24 w-24 rounded-full border border-brand-court/10 bg-white/40 blur-sm" />
      <div class="absolute bottom-[18%] right-[14%] h-40 w-40 rounded-full border border-brand-shuttle/20 bg-brand-shuttle/10 blur-2xl" />
    </div>

    <div class="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
      <div class="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-[0_30px_80px_rgba(18,55,42,0.14)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section class="relative hidden min-h-full overflow-hidden bg-[linear-gradient(145deg,#16382b_0%,#24553f_50%,#2f7a53_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div class="absolute inset-0 opacity-20">
            <div class="absolute inset-x-10 top-10 h-px bg-white/40" />
            <div class="absolute inset-y-10 right-10 w-px bg-white/15" />
            <div class="absolute bottom-14 left-10 h-40 w-40 rounded-full border border-white/15" />
            <div class="absolute right-20 top-24 h-28 w-28 rounded-full border border-brand-shuttle/30" />
          </div>

          <div class="relative space-y-6">
            <div class="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/80">
              <Sparkles :size="14" />
              Club Control Room
            </div>

            <div class="space-y-4">
              <h1 class="max-w-md text-5xl font-black leading-[1.02] tracking-tight text-white">
                Run every badminton session with less friction.
              </h1>
              <p class="max-w-lg text-base font-medium leading-7 text-white/78">
                Access the admin workspace to manage sessions, keep attendance current, and handle operations from one polished control surface.
              </p>
            </div>
          </div>

          <div class="relative grid gap-4 sm:grid-cols-2">
            <div class="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div class="mb-4 inline-flex rounded-2xl bg-white/14 p-3 text-brand-shuttle">
                <ShieldCheck :size="22" />
              </div>
              <p class="text-sm font-black uppercase tracking-[0.2em] text-white/60">Secure Access</p>
              <p class="mt-2 text-sm leading-6 text-white/78">Restricted sign-in for staff managing players, sessions, and attendance data.</p>
            </div>

            <div class="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div class="mb-4 inline-flex rounded-2xl bg-white/14 p-3 text-brand-shuttle">
                <CalendarDays :size="22" />
              </div>
              <p class="text-sm font-black uppercase tracking-[0.2em] text-white/60">Matchday Ready</p>
              <p class="mt-2 text-sm leading-6 text-white/78">Designed to keep the admin experience focused, fast, and calm before sessions begin.</p>
            </div>
          </div>
        </section>

        <section class="relative flex items-center p-5 sm:p-8 lg:p-10">
          <div class="mx-auto w-full max-w-md">
            <div class="rounded-[28px] border border-brand-line/80 bg-[#fffdf8]/92 p-6 shadow-[0_18px_45px_rgba(18,55,42,0.08)] sm:p-8">
              <div class="mb-8 space-y-4">
                <div class="inline-flex items-center gap-2 rounded-full border border-brand-court/10 bg-brand-court/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-brand-court">
                  <LockKeyhole :size="14" />
                  Admin Sign In
                </div>

                <div>
                  <h2 class="text-3xl font-black tracking-tight text-brand-ink sm:text-[2.2rem]">
                    Welcome back
                  </h2>
                  <p class="mt-2 text-sm font-medium leading-6 text-brand-slate">
                    Use your admin credentials to enter the session management workspace.
                  </p>
                </div>
              </div>

              <form class="space-y-5" @submit.prevent="handleLogin">
                <div
                  v-if="error"
                  class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {{ error }}
                </div>

                <label class="block space-y-2">
                  <span class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">Email Address</span>
                  <div class="group relative">
                    <div class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
                      <Mail :size="18" />
                    </div>
                    <input
                      id="email"
                      v-model="email"
                      type="email"
                      required
                      autocomplete="email"
                      placeholder="admin@example.com"
                      class="w-full rounded-2xl border border-brand-line bg-white px-4 py-4 pl-12 text-brand-ink outline-none transition-all placeholder:text-brand-slate/60 focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
                    />
                  </div>
                </label>

                <label class="block space-y-2">
                  <span class="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-slate">Password</span>
                  <div class="group relative">
                    <div class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate transition-colors group-focus-within:text-brand-court">
                      <LockKeyhole :size="18" />
                    </div>
                    <input
                      id="password"
                      v-model="password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      autocomplete="current-password"
                      placeholder="Enter your password"
                      class="w-full rounded-2xl border border-brand-line bg-white px-4 py-4 pl-12 pr-14 text-brand-ink outline-none transition-all placeholder:text-brand-slate/60 focus:border-brand-court focus:ring-4 focus:ring-brand-court/10"
                    />
                    <button
                      type="button"
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-brand-slate transition-colors hover:text-brand-court"
                      :aria-label="showPassword ? 'Hide password' : 'Show password'"
                      @click="showPassword = !showPassword"
                    >
                      <EyeOff v-if="showPassword" :size="18" />
                      <Eye v-else :size="18" />
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  :disabled="loading"
                  class="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-brand-court bg-brand-court px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:border-brand-purple hover:bg-brand-purple disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span class="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span v-if="loading" class="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  <template v-else>
                    <ShieldCheck :size="16" />
                    Enter Admin Panel
                  </template>
                  <span v-if="loading">Authenticating...</span>
                </button>
              </form>

              <div class="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-brand-line bg-brand-sand/70 px-4 py-3 text-sm">
                <div>
                  <p class="font-black text-brand-ink">Private workspace</p>
                  <p class="mt-1 text-brand-slate">Only authorized club administrators can continue.</p>
                </div>
                <div class="hidden rounded-2xl bg-white px-3 py-2 text-brand-court shadow-sm sm:block">
                  <ShieldCheck :size="18" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: login-spin 0.8s linear infinite;
}

@keyframes login-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
