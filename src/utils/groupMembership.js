/**
 * Guruhga o'quvchi qo'shish / chiqarish uchun YAGONA manba.
 *
 * Ilgari bu ikki sahifada ikki xil bajarilardi:
 *   • TeacherStudents  — faqat `groups.studentIds` ni yangilardi, tarif
 *     limitini umuman tekshirmasdi;
 *   • TeacherGroupStats — limitni tekshirardi, lekin `users.groupId` ni ham
 *     yozardi. `groupId` esa `firestore.rules` da HIMOYALANGAN maydon
 *     (faqat Admin SDK yozadi), shuning uchun o'qituvchi uchun bu chaqiruv
 *     doim "Missing or insufficient permissions" bilan yiqilardi — ya'ni
 *     Guruh statistikasi sahifasidagi "Qo'shish" tugmasi ishlamas edi.
 *
 * A'zolikning yagona haqiqiy manbasi — `groups.studentIds`. Server tarafdagi
 * `checkEntitlement` ham aynan shu maydonni tekshiradi
 * (`where('studentIds','array-contains', uid)`), shuning uchun `users.groupId`
 * ga umuman tegmaymiz.
 */

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { hasActiveTeacherSubscription } from './subscription';

/**
 * O'qituvchi yana bitta o'quvchi qo'sha oladimi.
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

  const currentCount = new Set((groups || []).flatMap(g => g.studentIds || [])).size;
  if (currentCount >= maxStudents) {
    return { ok: false, reason: `Tarif limiti to'ldi (${currentCount}/${maxStudents}). Kattaroq tarifga o'ting.` };
  }

  return { ok: true };
}

/** O'quvchini guruhga qo'shadi. */
export async function addStudentToGroup(groupId, studentId) {
  await updateDoc(doc(db, 'groups', groupId), {
    studentIds: arrayUnion(studentId),
  });
}

/** O'quvchini guruhdan chiqaradi. */
export async function removeStudentFromGroup(groupId, studentId) {
  await updateDoc(doc(db, 'groups', groupId), {
    studentIds: arrayRemove(studentId),
  });
}
