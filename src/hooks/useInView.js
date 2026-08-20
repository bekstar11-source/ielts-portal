// src/hooks/useInView.js
//
// Element ekranga yaqinlashganda bir marta ishga tushadigan kuzatuvchi.
//
// Analitika sahifasida "Xatolar jurnali" eng pastdagi og'ir bo'lim: uni chizish
// uchun Firestore'dan qo'shimcha hujjatlar o'qish kerak. Foydalanuvchilarning
// katta qismi u yergacha aylantirmaydi — shuning uchun so'rov element ko'rinishga
// yaqinlashgandagina yuboriladi.
//
// `rootMargin` ataylab kattaroq: so'rov foydalanuvchi bo'limga yetib kelgunga
// qadar boshlanishi kerak, aks holda u bo'sh joyni ko'rib turadi.

import { useEffect, useRef, useState } from 'react';

/**
 * @param {object} [options]
 * @param {string} [options.rootMargin='300px'] Qancha oldin ishga tushsin.
 * @returns {[React.RefObject, boolean]} `[ref, inView]` — `inView` bir marta
 *          `true` bo'ladi va shundayligicha qoladi.
 */
export function useInView({ rootMargin = '300px' } = {}) {
  const ref = useRef(null);

  // Eski brauzerda kuzatuvchi bo'lmasa — bo'lim darhol yoqilgan holda boshlanadi.
  // Bu yerdagi maqsad tejash, funksiyani cheklash emas. Tekshiruv boshlang'ich
  // qiymatda: effekt ichidagi `setState` keraksiz qayta chizishga olib kelardi.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (inView) return undefined;

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}

export default useInView;
