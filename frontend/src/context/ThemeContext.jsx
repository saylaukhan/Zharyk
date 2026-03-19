import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const THEMES = ['light', 'dark', 'high-contrast']

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored && THEMES.includes(stored)) return stored
    const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches
    if (prefersHighContrast) return 'high-contrast'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'high-contrast')
    if (theme === 'dark') html.classList.add('dark')
    else if (theme === 'high-contrast') html.classList.add('dark', 'high-contrast')
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    html.classList.add('theme-transitioning')
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    localStorage.setItem('theme', next)
    setTimeout(() => html.classList.remove('theme-transitioning'), 380)
  }

  const isDark = theme === 'dark' // backwards compat

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
