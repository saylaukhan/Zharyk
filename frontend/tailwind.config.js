/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        zharyq: {
          orange: 'var(--color-accent)',
          'orange-light': 'var(--color-accent-light)',
          'orange-hover': 'var(--color-accent-hover)',
          teal: 'var(--color-teal)',
          'teal-light': 'var(--color-teal-light)',
          dark: 'var(--color-text-primary)',
          gray: 'var(--color-text-secondary)',
          border: 'var(--color-border)',
          bg: 'var(--color-surface)',
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 200ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
