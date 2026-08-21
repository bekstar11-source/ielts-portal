// src/hooks/useAddToWordBank.js
//
// Takrorlanuvchi xatoni so'z bankiga ko'chirish.
//
// "government" ni uch marta noto'g'ri yozgan o'quvchi uchun tabiiy keyingi qadam —
// uni lug'atga qo'shish. Ilgari buni qo'lda qilish kerak edi: xatoni tahlilda
// ko'rish, `/word-bank` ga o'tish, so'zni qaytadan yozish. Uch qadamdan ikkitasi
// keraksiz.
//
// NEGA `useWordBank` EMAS: o'sha hook butun lug'atni yuklaydi, AI kontekst
// generatsiyasini boshqaradi va sahifa holatini ushlab turadi — analitika
// sahifasida bularning hech biri kerak emas. Bu yerda faqat bitta yozuv.

import { useCallback, useState } from 'react';
import { collection, addDoc, query, where, limit, getDocs } from 'firebase/firestore';

import { db } from '../firebase/firebase';

/**
 * @param {object} user Firebase auth foydalanuvchisi
 * @returns {{addWord: Function, added: Set<string>, pending: string|null, error: string|null}}
 */
export function useAddToWordBank(user) {
  // Qo'shilganlar shu sessiyada eslab qolinadi — tugma "qo'shildi" holatiga
  // o'tadi va o'quvchi bir so'zni ikki marta bosmaydi.
  const [added, setAdded] = useState(() => new Set());
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  const addWord = useCallback(async (word) => {
    const clean = String(word || '').trim();
    if (!user?.uid || !clean || added.has(clean)) return false;

    setPending(clean);
    setError(null);

    try {
      const vocabularyRef = collection(db, 'users', user.uid, 'vocabulary');

      // Takroriy yozuvni oldini olamiz: o'quvchi so'zni ilgari qo'lda yoki
      // matndan belgilab qo'shgan bo'lishi mumkin.
      const existing = await getDocs(query(vocabularyRef, where('word', '==', clean), limit(1)));

      if (existing.empty) {
        await addDoc(vocabularyRef, {
          word: clean,
          translation: null,
          definition: null,
          example: null,
          phonetics: null,
          partOfSpeech: null,
          synonyms: [],
          antonyms: [],
          collocations: [],
          learningStatus: 'learning',
          addedAt: new Date(),
          // Manba ochiq yoziladi — lug'atda "bu so'z qayerdan keldi" degan
          // savolga javob bo'ladi va takrorlash ro'yxatida tanib olinadi.
          sectionTitle: 'Xatolar tahlili',
          testTitle: 'Takrorlangan xatolar',
          easeFactor: 2.5,
          interval: 0,
          nextReviewDate: new Date(),
          hasAI: false
        });
      }

      setAdded((prev) => new Set(prev).add(clean));
      return true;
    } catch (err) {
      console.error('So\'z bankiga qo\'shilmadi:', err);
      setError(err?.message || 'error');
      return false;
    } finally {
      setPending(null);
    }
  }, [user?.uid, added]);

  return { addWord, added, pending, error };
}

export default useAddToWordBank;
