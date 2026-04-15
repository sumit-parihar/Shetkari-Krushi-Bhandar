/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        earth: {
          50: '#faf6f0',
          100: '#f2e8d9',
          200: '#e5cfb0',
          300: '#d4af80',
          400: '#c48e52',
          500: '#b87333',
          600: '#9e5f26',
          700: '#7d4920',
          800: '#663c1e',
          900: '#54321c',
        },
        leaf: {
          50: '#f3f9f0',
          100: '#e1f0d8',
          200: '#c3e2b2',
          300: '#96cc80',
          400: '#6ab254',
          500: '#4a9635',
          600: '#387929',
          700: '#2d6022',
          800: '#274e1e',
          900: '#22421b',
        },
        soil: {
          50: '#fdf8f2',
          100: '#faeee0',
          200: '#f3d8bc',
          300: '#eabc8e',
          400: '#de975c',
          500: '#d67c3a',
          600: '#c7652e',
          700: '#a55127',
          800: '#844226',
          900: '#6b3822',
        },
        cream: '#fdfaf5',
        bark: '#2c1810',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: 0, transform: 'translateX(20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'warm': '0 4px 24px rgba(180, 120, 60, 0.15)',
        'warm-lg': '0 8px 40px rgba(180, 120, 60, 0.2)',
        'leaf': '0 4px 24px rgba(74, 150, 53, 0.15)',
      },
    },
  },
  plugins: [],
}
