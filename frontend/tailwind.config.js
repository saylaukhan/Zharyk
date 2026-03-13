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
    },
  },
  plugins: [],
}
