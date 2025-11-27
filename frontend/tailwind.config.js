/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic Theme Colors (mapped to CSS variables)
        theme: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-secondary)',
          'surface-2': 'var(--bg-tertiary)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          border: 'var(--border-primary)',
          accent: 'var(--accent-primary)',
          'accent-hover': 'var(--accent-hover)',
        },
        // Legacy/Static Colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Neon Dark Theme Colors
        neon: {
          cyan: '#00f3ff',
          magenta: '#ff00ff',
          purple: '#bc13fe',
          dark: '#0a0a12',
          surface: '#161622',
        },
        // Beige Light Theme Colors
        beige: {
          50: '#fdfbf7',
          100: '#f7f3e8',
          200: '#efe5d0',
          300: '#e5d5b5',
          400: '#d6c094',
          500: '#c4a772',
          600: '#a88b55',
          700: '#8c7142',
          800: '#735b38',
          900: '#5e4a30',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
