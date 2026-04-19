/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. RANGLAR (ReadingStyles.js dan olindi)
      colors: {
        'ielts-blue': '#2563eb',       // Asosiy ko'k
        'ielts-bg': '#f3f4f6',         // Orqa fon kulrang
        'text-primary': '#000000',     // Asosiy matn
        'text-secondary': '#374151',   // Ikkinchi darajali matn
        'border-color': '#e5e7eb',     // Chiziqlar rangi
        'highlight-yellow': '#fef08a', // Sariq highlight
        'highlight-green': '#86efac',  // Yashil (Evidence uchun)
        vetra: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E4E2E3',
          orange: '#F44A22',
          orangeGlow: '#FF6B47',
          text: '#161616',
          textMuted: '#A8AAAC',
          blue: '#F44A22',
          silver: '#FEF8E8',
          grey: '#E4E2E3',
          midnight: '#161616',
          stone: '#A8AAAC',
        }
      },
      // 2. SHRIFT (Default fontni Inter qilamiz)
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Abel', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-.075em',
        tighter: '-.05em',
        tight: '-.025em',
        normal: '0',
        wide: '.025em',
        wider: '.05em',
        widest: '.1em',
        'super-tight': '-0.02em',
      },
      lineHeight: {
        'extra-loose': '2.5',
        'premium': '1.15',
      },
      // 3. O'LCHAMLAR (Agar kerak bo'lsa)
      height: {
        'footer': '50px', // h-footer deb ishlatish uchun
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'breathe-glow': 'breatheGlow 10s ease-in-out infinite alternate',
        'meteor-effect': 'meteor 5s linear infinite',
        'shine': 'shine var(--duration) infinite linear',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breatheGlow: {
          '0%': { opacity: '0.5', transform: 'scale(1)' },
          '100%': { opacity: '0.8', transform: 'scale(1.1)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-400px) scale(0)', opacity: '0' },
        },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' },
        },
        shine: {
          '0%': { 'background-position': '0% 0%' },
          '50%': { 'background-position': '100% 100%' },
          'to': { 'background-position': '0% 0%' },
        },
      }
    },
  },
  plugins: [],
}