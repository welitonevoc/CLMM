import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#07080c',
        'bg-secondary': '#0a0d14',
        surface: '#0d1119',
        elevated: '#111620',
        card: '#0d1119',
        border: 'rgba(255,255,255,0.06)',
        'row-hover': 'rgba(255,255,255,0.03)',
        accent: '#3b82f6',
        'accent-glow': 'rgba(59,130,246,0.3)',
        bull: '#10b981',
        bear: '#ef4444',
        warn: '#f59e0b',
        sol: '#8b5cf6',
        zinc: {
          900: '#0d1119',
          800: '#111620',
          700: '#1a2030',
          600: '#2a3045',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.4)',
        glow: '0 0 20px -4px rgba(59,130,246,0.15)',
        'glow-lg': '0 0 40px -8px rgba(59,130,246,0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
