import { createContext, useContext, useState, type ReactNode } from 'react'
import { es, en } from '../i18n/translations'

export type Language = 'es' | 'en'

const STORAGE_KEY = 'raiz_language'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof es
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'es'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en' ? 'en' : 'es'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage)

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    window.localStorage.setItem(STORAGE_KEY, lang)
  }

  const t = language === 'en' ? en : es

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage debe usarse dentro de <LanguageProvider>')
  return ctx
}
