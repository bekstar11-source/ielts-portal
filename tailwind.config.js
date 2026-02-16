/** @type {import('tailwindcss').Config} */
export default {
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
          bg: '#050505',
          card: '#0F0F0F',
          border: '#1F1F1F',
          orange: '#FF5520',
          orangeGlow: '#FF7A50',
          text: '#FFFFFF',
          textMuted: '#9CA3AF',
          blue: '#3B82F6',
        }
      },
      // 2. SHRIFT (Default fontni Inter qilamiz)
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      // 3. O'LCHAMLAR (Agar kerak bo'lsa)
      height: {
        'footer': '50px', // h-footer deb ishlatish uchun
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'breathe-glow': 'breatheGlow 10s ease-in-out infinite alternate',
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
        }
      }
    },
  },
  plugins: [],
}