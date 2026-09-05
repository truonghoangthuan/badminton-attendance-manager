import { en } from '../locales/en'
import { vi } from '../locales/vi'

export type Locale = 'en' | 'vi'

export interface LocaleOption {
  code: Locale
  name: string
  nativeName: string
  flag: string
  region: string
}

export const AVAILABLE_LOCALES: LocaleOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    region: 'United States / Global',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    region: 'Việt Nam (Bản địa)',
  },
]

const dictionaries = { en, vi }

export function useI18n() {
  const cookieLocale = useCookie<Locale>('gravity_locale', {
    default: () => 'vi',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const locale = useState<Locale>('current_locale', () => cookieLocale.value || 'vi')

  // Synchronize on client with localStorage
  if (import.meta.client) {
    const stored = localStorage.getItem('gravity_locale') as Locale | null
    if (stored && (stored === 'en' || stored === 'vi') && stored !== locale.value) {
      locale.value = stored
      cookieLocale.value = stored
    }
  }

  const setLocale = (newLocale: Locale) => {
    if (newLocale !== 'en' && newLocale !== 'vi') return
    locale.value = newLocale
    cookieLocale.value = newLocale
    if (import.meta.client) {
      localStorage.setItem('gravity_locale', newLocale)
      document.documentElement.setAttribute('lang', newLocale)
    }
  }

  const t = (path: string, params?: Record<string, string | number>): string => {
    const dict = dictionaries[locale.value] || dictionaries.vi
    const parts = path.split('.')
    let cur: any = dict

    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part]
      } else {
        // Fallback to English if missing
        let fallback: any = dictionaries.en
        for (const fPart of parts) {
          if (fallback && typeof fallback === 'object' && fPart in fallback) {
            fallback = fallback[fPart]
          } else {
            fallback = undefined
            break
          }
        }
        cur = fallback !== undefined ? fallback : path
        break
      }
    }

    if (typeof cur !== 'string') {
      return path
    }

    if (!params) {
      return cur
    }

    return cur.replace(/\{(\w+)\}/g, (_, key) => {
      return params[key] !== undefined ? String(params[key]) : `{${key}}`
    })
  }

  return {
    locale,
    setLocale,
    t,
    locales: AVAILABLE_LOCALES,
  }
}
