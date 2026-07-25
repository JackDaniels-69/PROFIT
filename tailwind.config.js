/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0b0d',
          900: '#101216',
          850: '#14161b',
          800: '#1a1d23',
          750: '#20242c',
          700: '#272c35',
          600: '#3a414e',
          500: '#5b6473',
          400: '#8a93a3',
          300: '#b8bfca',
          200: '#d6dbe2',
          100: '#eef1f4',
        },
        neon: {
          DEFAULT: '#22e07a',
          50: '#e8fff2',
          100: '#c6ffdf',
          200: '#84fbb6',
          300: '#4ff598',
          400: '#22e07a',
          500: '#12c463',
          600: '#0a9c4e',
          700: '#0a7540',
          800: '#0c5a35',
          900: '#0c472c',
        },
        accent: {
          DEFAULT: '#38e0ff',
          400: '#5ce8ff',
          500: '#38e0ff',
          600: '#1bb8e0',
        },
        success: '#22e07a',
        warning: '#f5b042',
        danger: '#ff5d5d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,224,122,0.25), 0 8px 30px -8px rgba(34,224,122,0.35)',
        'glow-accent': '0 0 0 1px rgba(56,224,255,0.25), 0 8px 30px -8px rgba(56,224,255,0.35)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(34,224,122,0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgba(34,224,122,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(34,224,122,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out both',
        'pulse-ring': 'pulse-ring 1.8s infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
