<script setup lang="ts">
import { signInWithEmailAndPassword } from 'firebase/auth'
import { CalendarDays, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { useAdminAccess } from '../../composables/useAdminAccess'

const { auth } = useFirebase()
const { refreshAdminClaims } = useAdminAccess()
const router = useRouter()
const { t } = useI18n()

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
      error.value = t('admin.login.noAccessError')
      return
    }

    router.push('/admin')
  } catch (e: any) {
    error.value = e.message || t('admin.login.failedError')
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: false
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
    <!-- Language Switcher in Login Page -->
    <div class="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
      <UILanguageSwitcher />
    </div>

    <div class="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
      <div class="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section class="relative hidden min-h-full overflow-hidden bg-slate-50 p-10 lg:flex lg:flex-col lg:justify-between border-r border-slate-200">
          <div class="relative space-y-6">
            <div class="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm">
              <Sparkles :size="14" class="text-emerald-500" />
              {{ t('admin.login.controlRoom') }}
            </div>

            <div class="space-y-4">
              <h1 class="max-w-md text-5xl font-black leading-[1.05] tracking-tight text-brand-ink">
                {{ t('admin.login.heroTitle') }}
              </h1>
              <p class="max-w-lg text-base font-medium leading-7 text-slate-600">
                {{ t('admin.login.heroSubtitle') }}
              </p>
            </div>
          </div>

          <div class="relative grid gap-4 sm:grid-cols-2 mt-12">
            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 inline-flex rounded-lg bg-slate-100 p-2.5 text-slate-600 border border-slate-200">
                <ShieldCheck :size="20" />
              </div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ t('admin.login.secureAccessTitle') }}</p>
              <p class="mt-1.5 text-sm leading-6 text-slate-600">{{ t('admin.login.secureAccessDesc') }}</p>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 inline-flex rounded-lg bg-slate-100 p-2.5 text-slate-600 border border-slate-200">
                <CalendarDays :size="20" />
              </div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ t('admin.login.matchdayReadyTitle') }}</p>
              <p class="mt-1.5 text-sm leading-6 text-slate-600">{{ t('admin.login.matchdayReadyDesc') }}</p>
            </div>
          </div>
        </section>

        <section class="relative flex items-center p-6 sm:p-8 lg:p-12 bg-white">
          <div class="mx-auto w-full max-w-sm">
            <div class="mb-8 space-y-3">
              <div class="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-200">
                <LockKeyhole :size="12" />
                {{ t('admin.login.signInBadge') }}
              </div>

              <div>
                <h2 class="text-3xl font-black tracking-tight text-brand-ink">
                  {{ t('admin.login.welcomeBack') }}
                </h2>
                <p class="mt-1.5 text-sm font-medium leading-6 text-slate-500">
                  {{ t('admin.login.instructions') }}
                </p>
              </div>
            </div>

            <form class="space-y-4" @submit.prevent="handleLogin">
              <div
                v-if="error"
                class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {{ error }}
              </div>

              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-brand-ink">{{ t('admin.login.emailLabel') }}</span>
                <div class="relative">
                  <div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail :size="16" />
                  </div>
                  <input
                    id="email"
                    v-model="email"
                    type="email"
                    required
                    autocomplete="email"
                    :placeholder="t('admin.login.emailPlaceholder')"
                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-sm text-brand-ink outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </label>

              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-brand-ink">{{ t('admin.login.passwordLabel') }}</span>
                <div class="relative">
                  <div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockKeyhole :size="16" />
                  </div>
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    autocomplete="current-password"
                    :placeholder="t('admin.login.passwordPlaceholder')"
                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 pr-10 text-sm text-brand-ink outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-ink"
                    :aria-label="showPassword ? t('admin.login.hidePassword') : t('admin.login.showPassword')"
                    @click="showPassword = !showPassword"
                  >
                    <EyeOff v-if="showPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
              </label>

              <button
                type="submit"
                :disabled="loading"
                class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-emerald-700 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 shadow-sm"
              >
                <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <template v-else>
                  <ShieldCheck :size="16" />
                  {{ t('admin.login.submitBtn') }}
                </template>
                <span v-if="loading">{{ t('admin.login.authenticating') }}</span>
              </button>
            </form>

            <div class="mt-8 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs shadow-sm">
              <div>
                <p class="font-bold text-brand-ink">{{ t('admin.login.privateWorkspace') }}</p>
                <p class="mt-0.5 text-slate-500">{{ t('admin.login.privateWorkspaceDesc') }}</p>
              </div>
              <div class="hidden rounded-lg bg-white p-2 text-emerald-600 border border-slate-200 shadow-sm sm:block">
                <ShieldCheck :size="16" />
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
