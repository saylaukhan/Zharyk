import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle text-zharyq-gray hover:text-zharyq-dark transition-colors ${className}`}
      title="Переключить тему"
      aria-label="Переключить тему"
    >
      <span className="icon-sun"><Sun size={18} /></span>
      <span className="icon-moon"><Moon size={18} /></span>
    </button>
  )
}
