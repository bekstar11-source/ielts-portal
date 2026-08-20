// src/hooks/useAnalyticsSummary.js
//
// `analyticsSummaries/{uid}` — analitika sahifasining yagona o'qish manbai.
//
// Ilgari sahifa har ochilishida `useStudentData` orqali 50 ta natija hujjatini,
// butun `podcastAttempts` ro'yxatini va 30 ta xato sessiyasini o'qirdi — bitta
// ko'rish ~85–150 Firestore o'qishiga tushardi. Endi jamlanma server tomonda
// topshiriq paytida yig'iladi (`functions/analyticsRollup.js`), sahifa esa
// bitta hujjatni oladi.
//
// MIGRATSIYA: funksiya joriy qilinishidan oldin test topshirgan o'quvchida
// jamlanma yo'q. Bunday holatda `rebuildAnalyticsSummary` callable'i chaqiriladi —
// u tarixdan bir marta qayta quradi. Klient o'zi hisoblab yozolmaydi: bu hujjat
// ustozga ham ko'rsatiladi, shuning uchun unga yozish faqat Admin SDK ga ochiq.

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase/firebase';

/**
 * Server bilan bir xil bo'lishi SHART — `functions/analyticsRollup.js`.
 *
 * Mos kelmasa ikki tomonlama nosozlik chiqadi: past qiymatda eskirgan hujjat
 * dolzarb deb qabul qilinadi, yuqori qiymatda esa har ochilishda qayta qurish
 * chaqiriladi (bu ~100–300 o'qish).
 *
 * v2 — `skills[skill].nearMiss` / `.mistakes` qo'shildi (ball ta'siri hisobi).
 * v3 — T/F/NG xatolari `wrong_option` dan ajratildi (`ng_overclaim`,
 *      `ng_missed`, `tf_flip`). Eski jamlanmalarda ular hamon bitta qatorga
 *      yig'ilgan, shuning uchun qayta qurish shart.
 */
export const SUMMARY_VERSION = 3;

/**
 * Jamlanma faqat test topshirilganda o'zgaradi — soniyalab yangilanadigan
 * ma'lumot emas. Shu sabab global 5 daqiqalik standart o'rniga uzunroq oyna:
 * sahifaga qayta-qayta kirish qo'shimcha o'qish keltirib chiqarmaydi.
 */
const STALE_MS = 1000 * 60 * 30;
const GC_MS = 1000 * 60 * 60 * 2;

/** Bo'sh jamlanma — hujjat hali yo'q bo'lganda UI shu shakl bilan ishlaydi. */
const EMPTY = {
  version: SUMMARY_VERSION,
  testsCounted: 0,
  byType: {},
  byPart: {},
  weeks: {},
  patterns: {},
  repeated: [],
  nearMiss: { count: 0, ofTotal: 0 },
  skills: {}
};

/**
 * @param {string} uid
 * @param {boolean} [enabled=true] Pro bo'lmagan foydalanuvchida bo'limlar
 *        namunaviy ma'lumot bilan qulflanadi — haqiqiy jamlanma kerak emas.
 */
export function useAnalyticsSummary(uid, enabled = true) {
  const query = useQuery({
    queryKey: ['analyticsSummary', uid],
    enabled: !!uid && enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    // Qayta qurish ~100–300 o'qish qiladi; tarmoq uzilishida uni takrorlash
    // qimmatga tushadi va foyda bermaydi.
    retry: 1,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'analyticsSummaries', uid));
      const data = snap.exists() ? snap.data() : null;

      if (data && data.version === SUMMARY_VERSION) return data;

      // Jamlanma yo'q yoki sxemasi eskirgan — bir martalik migratsiya.
      // Serverda "cooldown" bor, ya'ni sahifani qayta yangilash qayta
      // qurishni takrorlamaydi.
      try {
        const rebuild = httpsCallable(functions, 'rebuildAnalyticsSummary');
        const response = await rebuild({});
        return response?.data?.summary || data || EMPTY;
      } catch (error) {
        // Migratsiya ishlamasa ham sahifa ochilishi kerak: bo'sh holatlar
        // "hali ma'lumot yig'ilmagan" deb ko'rsatiladi.
        console.error('rebuildAnalyticsSummary xatolik:', error);
        return data || EMPTY;
      }
    }
  });

  return {
    summary: query.data || EMPTY,
    // Hujjat mavjudmi — bo'sh jamlanma bilan "hali test topshirilmagan"ni ajratish uchun.
    hasSummary: !!query.data,
    loading: query.isLoading,
    error: query.error?.message || null
  };
}

export default useAnalyticsSummary;
