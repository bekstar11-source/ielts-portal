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
      },
      // 2. SHRIFT (Default fontni Inter qilamiz)
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // 3. O'LCHAMLAR (Agar kerak bo'lsa)
      height: {
        'footer': '50px', // h-footer deb ishlatish uchun
      }
    },
  },
  plugins: [],
}