/**
 * Guruhga o'quvchi qo'shish / chiqarish uchun YAGONA klient manbasi.
 *
 * ─── NEGA ENDI CALLABLE ─────────────────────────────────────────────────────
 *
 * Ilgari bu yerda `updateDoc(groups/{id}, { studentIds: arrayUnion(...) })`
 * turardi va tarif limiti FAQAT shu fayldagi `canAddStudent` bilan, ya'ni
 * brauzerda tekshirilardi. Firestore qoidalari esa istalgan o'qituvchiga
 * istalgan guruhni yozishga ruxsat berardi — konsolga bitta buyruq yozib
 * limitni ham, obuna talabini ham chetlab o'tsa bo'lardi.
 *
 * Endi a'zolik `manageGroupStudent` Cloud Function orqali o'zgaradi: u guruh
 * egaligini, obuna faolligini va limitni serverda tekshiradi, `users.groupId`
 * va `groupPro` (guruh Pro huquqi) ni ham o'zi yozadi — bu maydonlarga
 * klientdan umuman tegib bo'lmaydi (`firestore.rules` → `protectedUserFields`).
 *
 * ⚠️ `canAddStudent` saqlanib qoldi, lekin u endi faqat UI uchun: tugmani
 * oldindan bloklab, keraksiz tarmoq so'rovini va noaniq xatoni oldini oladi.
 * Haqiqiy qaror — serverda.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';
import { hasActiveTeacherSubscription } from './subscription';

const manageGroupStudent = httpsCallable(functions, 'manageGroupStudent');

/** O'qituvchining barcha guruhlaridagi UNIQUE o'quvchilar soni (band joylar). */
export function countSeatsUsed(groups) {
  return new Set((groups || []).flatMap((g) => g.studentIds || [])).size;
}

/**
 * O'qituvchi yana bitta o'quvchi qo'sha oladimi (UI uchun oldindan tekshiruv).
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canAddStudent(userData, groups) {
  if (!hasActiveTeacherSubscription(userData)) {
    return { ok: false, reason: "Faol guruh obunangiz yo'q. O'quvchi qo'shish uchun avval obuna xarid qiling." };
  }

  const maxStudents = Number(userData?.teacherSubscription?.maxStudents) || 0;
  if (maxStudents <= 0) {
    return { ok: false, reason: "Tarifingizda o'quvchilar limiti belgilanmagan. Admin bilan bog'laning." };
  }

  const currentCount = countSeatsUsed(groups);
  if (currentCount >= maxStudents) {
    return { ok: false, reason: `Tarif limiti to'ldi (${currentCount}/${maxStudents}). Kattaroq tarifga o'ting.` };
  }

  return { ok: true };
}

/**
 * Callable xatosini o'qiladigan matnga aylantiradi.
 * `HttpsError.message` allaqachon o'zbekcha — faqat texnik xatolarni yopamiz.
 */
function toReadableError(error) {
  if (error?.code === 'functions/internal' || !error?.message) {
    return "Server xatosi. Birozdan so'ng qayta urinib ko'ring.";
  }
  return error.message;
}

/** O'quvchini guruhga qo'shadi. Limit/obuna tekshiruvi serverda. */
export async function addStudentToGroup(groupId, studentId) {
  try {
    const res = await manageGroupStudent({ action: 'add', groupId, studentId });
    return res.data;
  } catch (error) {
    throw new Error(toReadableError(error));
  }
}

/** O'quvchini guruhdan chiqaradi (guruh Pro huquqi ham shu zahoti olinadi). */
export async function removeStudentFromGroup(groupId, studentId) {
  try {
    const res = await manageGroupStudent({ action: 'remove', groupId, studentId });
    return res.data;
  } catch (error) {
    throw new Error(toReadableError(error));
  }
}
