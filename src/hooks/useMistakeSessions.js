// src/hooks/useMistakeSessions.js
//
// `users/{uid}/mistakeSessions` — xatolarning O'ZI (qaysi savol, nima yozgan,
// to'g'ri javob nima).
//
// Ikki joydan o'qiladi: analitika sahifasidagi "Xatolar jurnali" va "Xatolar
// ustida mashq" sahifasi. Ikkalasi ham AYNAN shu `queryKey` ni ishlatgani uchun
// kesh bo'linadi — tahlilni ko'rib, so'ng mashqqa o'tgan o'quvchi bir xil
// hujjatlarni ikkinchi marta o'qimaydi.
//
// So'rov kechiktirilgan (`enabled`): foydalanuvchilarning katta qismi xatolar
// jurnaligacha aylantirmaydi va ular uchun sahifa narxi bitta o'qish bo'lib
// qoladi.

import { useInfiniteQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

import { db } from '../firebase/firebase';

/**
 * Bir "sahifa"da nechta sessiya o'qiladi.
 *
 * Har bir sessiya — bitta hujjat, ya'ni bitta o'qish. Bitta sessiyada odatda
 * 5–15 ta xato bo'ladi, demak 8 ta sessiya ~40–120 ta xatoni beradi.
 */
export const SESSION_PAGE = 8;

/** Xatolar tarixi faqat test topshirilganda o'zgaradi — uzun kesh oynasi. */
const STALE_MS = 1000 * 60 * 30;
const GC_MS = 1000 * 60 * 60;

/**
 * @param {string} uid
 * @param {boolean} enabled So'rov yuborilsinmi
 *
 * DIQQAT: bitta omborda `date` ikki xil turda yotadi — `submitTestAnswers` ISO
 * SATR yozadi, `evaluateSpeaking` esa Timestamp. Firestore turlarni tartiblaganda
 * satrlarni Timestamp'dan keyinga qo'yadi, ya'ni DESC saralashda satrli (reading/
 * listening) yozuvlar birinchi keladi — bizga aynan shular kerak. Shu sabab
 * `limit` speaking yozuvlari tufayli "yeb ketilmaydi". Agar kelajakda submit
 * tomoni Timestamp'ga o'tkazilsa, bu yerga `where('skill','!=','speaking')`
 * (yoki alohida so'rov) qo'shish kerak bo'ladi.
 */
export function useMistakeSessions(uid, enabled) {
  return useInfiniteQuery({
    queryKey: ['mistakeSessions', uid],
    enabled: !!uid && enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const constraints = [orderBy('date', 'desc')];
      if (pageParam) constraints.push(startAfter(pageParam));
      constraints.push(limit(SESSION_PAGE));

      const snap = await getDocs(
        query(collection(db, 'users', uid, 'mistakeSessions'), ...constraints)
      );

      return {
        sessions: snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.skill !== 'speaking'),
        // Kursor — keyingi sahifa shu hujjatdan keyin boshlanadi.
        cursor: snap.docs.length === SESSION_PAGE ? snap.docs[snap.docs.length - 1] : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.cursor
  });
}

/** Sahifalangan natijadan tekis sessiyalar ro'yxatini yig'adi. */
export function flattenSessions(data) {
  return (data?.pages || []).flatMap((page) => page.sessions || []);
}

export default useMistakeSessions;
