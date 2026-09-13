<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { ArrowLeft, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-vue-next'

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap' }
  ]
})

const { auth } = useFirebase()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isMobileMenuOpen = ref(false)

watch(() => route.path, () => {
  if (isMobileMenuOpen.value) isMobileMenuOpen.value = false
})

const handleLogout = async () => {
  try {
    await signOut(auth)
    router.push('/admin/login')
  } catch (e) {
    console.error('Logout failed', e)
  }
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center bg-[#F5F0E8] text-[#191919] font-['Inter',sans-serif]">
    <!-- Top Nav -->
    <nav class="w-full max-w-[1200px] flex items-center justify-between py-6 px-4 md:px-0 border-b border-[#E8E3DA] mb-12">
      <!-- Logo -->
      <NuxtLink to="/admin" class="font-['Newsreader',serif] text-[22px] font-medium text-[#191919] tracking-[-0.02em] no-underline">
        AdminPanel.
      </NuxtLink>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-6">
        <NuxtLink to="/admin" class="text-sm font-medium transition-colors" :class="$route.path === '/admin' ? 'text-[#CC785C]' : 'text-[#666666] hover:text-[#191919]'">
          {{ t('nav.dashboard') }}
        </NuxtLink>
        <NuxtLink to="/" class="text-sm font-medium text-[#666666] hover:text-[#191919] transition-colors">
          {{ t('nav.backToSite') }}
        </NuxtLink>
        <UILanguageSwitcher class="scale-90" />
        <button @click="handleLogout" class="text-sm font-medium text-[#666666] hover:text-[#191919] transition-colors" :title="t('nav.logout')">
          {{ t('nav.logout') }}
        </button>
      </div>

      <!-- Mobile Menu Toggle -->
      <button class="md:hidden p-2 text-[#666666]" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <Menu v-if="!isMobileMenuOpen" :size="24" />
        <X v-else :size="24" />
      </button>
    </nav>

    <!-- Mobile Dropdown -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 top-[76px] z-40 bg-[#F5F0E8] p-4 md:hidden border-t border-[#E8E3DA]">
      <div class="flex flex-col gap-4 max-w-sm mx-auto mt-4">
        <nav class="flex flex-col gap-3">
          <NuxtLink to="/admin" class="px-4 py-3 text-sm font-medium transition-colors rounded-lg" :class="$route.path === '/admin' ? 'text-[#CC785C] bg-[#F7EBE8]' : 'text-[#666666] hover:text-[#191919]'">
            {{ t('nav.dashboard') }}
          </NuxtLink>
          <NuxtLink to="/" class="px-4 py-3 text-sm font-medium text-[#666666] hover:text-[#191919] transition-colors">
            {{ t('nav.backToSite') }}
          </NuxtLink>
          <button @click="handleLogout" class="text-left px-4 py-3 text-sm font-medium text-[#666666] hover:text-[#191919] transition-colors">
            {{ t('nav.logout') }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Main Content -->
    <main class="w-full max-w-[1200px] px-4 md:px-0 pb-16 flex-1">
      <slot />
    </main>
  </div>

  <UIConfirmDialog />
  <Toast />
</template>
