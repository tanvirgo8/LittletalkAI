/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Child-friendly, vibrant but not harsh palette
        primary: {
          50: '#fef9f0',
          100: '#fef0d0',
          200: '#fcd897',
          300: '#f9b84a',
          400: '#f79920',
          500: '#f07b0e',
          600: '#d45908',
          700: '#b03e0a',
          800: '#90300f',
          900: '#762810',
        },
        coral: {
          400: '#ff7b6b',
          500: '#ff5a47',
          600: '#e8412e',
        },
        mint: {
          400: '#4dd9ac',
          500: '#2ec99a',
          600: '#1aab82',
        },
        sky: {
          400: '#42bff5',
          500: '#1aabef',
          600: '#0d90d4',
        },
        lavender: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        sunshine: {
          300: '#fde68a',
          400: '#fcd34d',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        display: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'star-pop': 'star-pop 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'star-pop': {
          '0%': { transform: 'scale(0) rotate(-30deg)', opacity: '0' },
          '70%': { transform: 'scale(1.3) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
