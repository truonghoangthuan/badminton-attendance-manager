<script setup lang="ts">
import { signInWithEmailAndPassword } from 'firebase/auth'
import { CalendarDays, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-vue-next'
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
  <div class="relative min-h-screen overflow-hidden bg-brand-sand px-4 py-8 sm:px-6 lg:px-8">
    <!-- Language Switcher in Login Page -->
    <div class="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
      <UILanguageSwitcher />
    </div>

    <div class="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
      <div class="grid w-full overflow-hidden rounded-2xl border border-brand-line bg-white shadow-glass lg:grid-cols-[1.1fr_0.9fr]">
        <section class="relative hidden min-h-full overflow-hidden bg-brand-sand/70 p-10 lg:flex lg:flex-col lg:justify-between border-r border-brand-line">
          <div class="relative space-y-6">
            <div class="inline-flex w-fit items-center gap-2 rounded-full border border-brand-line bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-brand-slate shadow-sm">
              <ShieldCheck :size="14" class="text-brand-court" />
              {{ t('admin.login.controlRoom') }}
            </div>

            <div class="space-y-4">
              <h1 class="max-w-md text-5xl font-black leading-[1.05] tracking-tight text-brand-ink">
                {{ t('admin.login.heroTitle') }}
              </h1>
              <p class="max-w-lg text-base font-medium leading-7 text-brand-slate">
                {{ t('admin.login.heroSubtitle') }}
              </p>
            </div>
          </div>

          <div class="relative grid gap-4 sm:grid-cols-2 mt-12">
            <div class="rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
              <div class="mb-4 inline-flex rounded-lg bg-brand-sand p-2.5 text-brand-court border border-brand-line">
                <ShieldCheck :size="20" />
              </div>
              <p class="text-xs font-bold uppercase tracking-wider text-brand-slate">{{ t('admin.login.secureAccessTitle') }}</p>
              <p class="mt-1.5 text-sm leading-6 text-brand-slate">{{ t('admin.login.secureAccessDesc') }}</p>
            </div>

            <div class="rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
              <div class="mb-4 inline-flex rounded-lg bg-brand-sand p-2.5 text-brand-court border border-brand-line">
                <CalendarDays :size="20" />
              </div>
              <p class="text-xs font-bold uppercase tracking-wider text-brand-slate">{{ t('admin.login.matchdayReadyTitle') }}</p>
              <p class="mt-1.5 text-sm leading-6 text-brand-slate">{{ t('admin.login.matchdayReadyDesc') }}</p>
            </div>
          </div>
        </section>

        <section class="relative flex items-center p-6 sm:p-8 lg:p-12 bg-white">
          <div class="mx-auto w-full max-w-sm">
            <div class="mb-8 space-y-3">
              <div class="inline-flex items-center gap-1.5 rounded-lg bg-brand-court/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-court border border-brand-court/20">
                <LockKeyhole :size="12" />
                {{ t('admin.login.signInBadge') }}
              </div>

              <div>
                <h2 class="text-3xl font-black tracking-tight text-brand-ink">
                  {{ t('admin.login.welcomeBack') }}
                </h2>
                <p class="mt-1.5 text-sm font-medium leading-6 text-brand-slate">
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
                    class="w-full rounded-lg border border-brand-line bg-white px-3 py-2 pl-9 text-sm text-brand-ink outline-none transition-all placeholder:text-slate-400 focus:border-brand-court focus:ring-1 focus:ring-brand-court"
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
                    class="w-full rounded-lg border border-brand-line bg-white px-3 py-2 pl-9 pr-10 text-sm text-brand-ink outline-none transition-all placeholder:text-slate-400 focus:border-brand-court focus:ring-1 focus:ring-brand-court"
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
                class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-court bg-brand-court px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-brand-purple hover:bg-brand-purple disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-court/40 focus:ring-offset-1 shadow-sm"
              >
                <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <template v-else>
                  <ShieldCheck :size="16" />
                  {{ t('admin.login.submitBtn') }}
                </template>
                <span v-if="loading">{{ t('admin.login.authenticating') }}</span>
              </button>
            </form>

            <div class="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-brand-line bg-brand-sand px-4 py-3 text-xs shadow-sm">
              <div>
                <p class="font-bold text-brand-ink">{{ t('admin.login.privateWorkspace') }}</p>
                <p class="mt-0.5 text-brand-slate">{{ t('admin.login.privateWorkspaceDesc') }}</p>
              </div>
              <div class="hidden rounded-lg bg-white p-2 text-brand-court border border-brand-line shadow-sm sm:block">
                <ShieldCheck :size="16" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
