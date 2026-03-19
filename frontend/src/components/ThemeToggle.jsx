import { Sun, Moon, Eye } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const NEXT_LABEL = {
  light: 'Тёмная тема',
  dark: 'Высокий контраст',
  'high-contrast': 'Светлая тема',
}

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const label = NEXT_LABEL[theme] ?? 'Переключить тему'
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle text-zharyq-gray hover:text-zharyq-dark transition-colors ${className}`}
      title={label}
      aria-label={label}
    >
      <span className="icon-sun"><Sun size={18} /></span>
      <span className="icon-moon"><Moon size={18} /></span>
      <span className="icon-contrast"><Eye size={18} /></span>
    </button>
  )
}
