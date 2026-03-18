import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'kk', label: 'Қазақша', short: 'KK' },
  { code: 'en', label: 'English', short: 'EN' },
]

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'ru'
  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        title={t('nav.language')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg)'
        }}
      >
        <Globe size={14} />
        <span>{current.short}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl border shadow-lg overflow-hidden min-w-[130px]"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left"
              style={{
                color: currentLang === lang.code ? 'var(--color-accent)' : 'var(--color-text-primary)',
                background: currentLang === lang.code ? 'var(--color-accent-light)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (currentLang !== lang.code) e.currentTarget.style.background = 'var(--color-bg)'
              }}
              onMouseLeave={e => {
                if (currentLang !== lang.code) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span className="font-mono text-xs font-bold opacity-60">{lang.short}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
