// functions/groupMembership.js
//
// Guruhga o'quvchi qo'shish / chiqarishning SERVER tomondagi yagona yo'li.
//
// ─── NEGA CALLABLE KERAK BO'LDI ─────────────────────────────────────────────
//
// Ilgari o'quvchi klientdan to'g'ridan-to'g'ri qo'shilardi
// (`updateDoc(groups/{id}, { studentIds: arrayUnion(...) })`), tarif limiti esa
// faqat brauzerda tekshirilardi (`src/utils/groupMembership.js`). Qoidalar
// tomonida esa `allow write: if isAdmin() || isTeacher()` turardi — ya'ni:
//
//   • istalgan o'qituvchi BOSHQA o'qituvchining guruhini tahrirlay olardi;
//   • konsoldan bitta `arrayUnion` bilan tarif limitini butunlay chetlab
//     o'tsa bo'lardi;
//   • obunasi tugagan o'qituvchi ham o'quvchi qo'shaverardi.
//
// Firestore qoidalari guruhlar BO'YLAB sanay olmaydi (limit — o'qituvchining
// hamma guruhlaridagi unique o'quvchilar soni), shuning uchun limitni faqat
// server tekshira oladi. Endi `firestore.rules` da `studentIds` ga klientdan
// tegib bo'lmaydi va a'zolik faqat shu funksiya orqali o'zgaradi.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { hasActiveTeacherSubscription, getTeacherSubscriptionEnd } = require("./subscription");

/**
 * O'quvchining `groupPro` maydonini uning guruhlari bo'yicha qayta hisoblaydi.
 *
 * `groupPro` — o'qituvchi obunasidan kelib chiqadigan Pro huquqining o'quvchi
 * hujjatidagi nusxasi (nega kerakligi `functions/subscription.js` da yozilgan).
 * O'quvchi bir nechta guruhda bo'lsa — eng UZOQ muddat yutadi.
 *
 * @returns {Promise<Date|null>} yangi muddat (huquq yo'q bo'lsa `null`)
 */
async function syncStudentGroupPro(db, studentId) {
  const groupsSnap = await db.collection("groups").where("studentIds", "array-contains", studentId).get();

  const teacherIds = new Set();
  groupsSnap.forEach((g) => {
    const teacherId = g.data().teacherId;
    if (teacherId) teacherIds.add(teacherId);
  });

  let best = null;
  for (const teacherId of teacherIds) {
    const teacherSnap = await db.collection("users").doc(teacherId).get();
    if (!teacherSnap.exists) continue;
    const teacherData = teacherSnap.data();
    if (!hasActiveTeacherSubscription(teacherData)) continue;
    const end = getTeacherSubscriptionEnd(teacherData);
    if (end && (!best || end.getTime() > best.end.getTime())) {
      best = { end, teacherId };
    }
  }

  await writeGroupPro(db, studentId, best);
  return best ? best.end : null;
}

/**
 * `groupPro` ni yozadi/o'chiradi — qiymat O'ZGARGAN bo'lsagina.
 *
 * Kunlik supurgi hamma o'quvchini aylanib chiqadi; har safar qayta yozish
 * minglab keraksiz yozuv degani bo'lardi.
 */
async function writeGroupPro(db, studentId, best) {
  const userRef = db.collection("users").doc(studentId);
  const snap = await userRef.get();
  if (!snap.exists) return false;

  const current = snap.data().groupPro || null;
  const currentMs = current && current.validUntil && typeof current.validUntil.toMillis === "function"
    ? current.validUntil.toMillis()
    : null;

  if (!best) {
    if (!current) return false;
    await userRef.set({ groupPro: admin.firestore.FieldValue.delete() }, { merge: true });
    return true;
  }

  if (currentMs === best.end.getTime() && current.teacherId === best.teacherId) return false;

  await userRef.set({
    groupPro: {
      teacherId: best.teacherId,
      validUntil: admin.firestore.Timestamp.fromDate(best.end),
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });
  return true;
}

/**
 * BARCHA guruhlar bo'yicha `groupPro` ni qayta hisoblaydi (kunlik supurgi).
 *
 * NEGA KERAK: `groupPro` faqat to'lov tasdiqlanganda va a'zolik o'zgarganda
 * yoziladi. Bu ikkalasidan tashqarida ham holat o'zgaradi — obuna muddati
 * tugaydi, admin uni qo'lda uzaytiradi, guruh boshqa o'qituvchiga o'tadi.
 * Bu funksiya shu bo'shliqni yopadi va bu tizim yoqilgunga qadar mavjud
 * bo'lgan guruhlarga huquqni birinchi yurishida BERADI (migratsiya).
 *
 * Guruhlar kolleksiyasi kichik, shuning uchun bir yurishda hammasini o'qib,
 * o'qituvchilarni keshlaymiz — o'quvchi boshiga alohida so'rov yubormaymiz.
 */
async function syncAllGroupPro(db) {
  const groupsSnap = await db.collection("groups").get();

  const teacherCache = new Map();
  const getTeacherEnd = async (teacherId) => {
    if (teacherCache.has(teacherId)) return teacherCache.get(teacherId);
    const snap = await db.collection("users").doc(teacherId).get();
    const data = snap.exists ? snap.data() : null;
    const end = hasActiveTeacherSubscription(data) ? getTeacherSubscriptionEnd(data) : null;
    teacherCache.set(teacherId, end);
    return end;
  };

  // O'quvchi bir nechta guruhda bo'lsa — eng uzoq muddat yutadi.
  const best = new Map();
  for (const groupDoc of groupsSnap.docs) {
    const group = groupDoc.data();
    if (!group.teacherId) continue;
    const end = await getTeacherEnd(group.teacherId);
    for (const studentId of group.studentIds || []) {
      if (!best.has(studentId)) best.set(studentId, null);
      if (!end) continue;
      const prev = best.get(studentId);
      if (!prev || end.getTime() > prev.end.getTime()) {
        best.set(studentId, { end, teacherId: group.teacherId });
      }
    }
  }

  let changed = 0;
  for (const [studentId, value] of best) {
    if (await writeGroupPro(db, studentId, value)) changed++;
  }

  console.log(`syncAllGroupPro: ${best.size} ta o'quvchi tekshirildi, ${changed} ta yangilandi.`);
  return { checked: best.size, changed };
}

/**
 * O'qituvchining BARCHA o'quvchilarida `groupPro` ni yangilaydi.
 * To'lov tasdiqlangan zahoti chaqiriladi — aks holda o'quvchilar Pro'ni
 * faqat keyingi kunlik supurgidan keyin ko'rardi.
 *
 * @returns {Promise<number>} yangilangan o'quvchilar soni
 */
async function syncTeacherGroupPro(db, teacherId) {
  const groupsSnap = await db.collection("groups").where("teacherId", "==", teacherId).get();
  const studentIds = new Set();
  groupsSnap.forEach((g) => (g.data().studentIds || []).forEach((id) => studentIds.add(id)));

  for (const studentId of studentIds) {
    await syncStudentGroupPro(db, studentId);
  }
  return studentIds.size;
}

/** O'qituvchining hamma guruhlaridagi UNIQUE o'quvchilar (band joylar). */
async function countTeacherSeats(db, teacherId, excludeGroupId = null) {
  const groupsSnap = await db.collection("groups").where("teacherId", "==", teacherId).get();
  const seats = new Set();
  groupsSnap.forEach((g) => {
    if (excludeGroupId && g.id === excludeGroupId) return;
    (g.data().studentIds || []).forEach((id) => seats.add(id));
  });
  return seats;
}

/**
 * Guruh a'zoligini o'zgartiradi.
 *
 * @param {{action: 'add'|'remove', groupId: string, studentId: string}} data
 * @returns {{ok: true, seatsUsed: number, maxStudents: number}}
 */
async function manageGroupStudent(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
  }

  const action = String((data && data.action) || "").trim();
  const groupId = String((data && data.groupId) || "").trim();
  const studentId = String((data && data.studentId) || "").trim();

  if (action !== "add" && action !== "remove") {
    throw new functions.https.HttpsError("invalid-argument", "Noma'lum amal.");
  }
  if (!groupId || !studentId) {
    throw new functions.https.HttpsError("invalid-argument", "Guruh va o'quvchi ko'rsatilishi shart.");
  }

  const db = admin.firestore();
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  const caller = callerSnap.exists ? callerSnap.data() : null;
  const isAdmin = caller && caller.role === "admin";
  const isTeacher = caller && caller.role === "teacher";

  if (!isAdmin && !isTeacher) {
    throw new functions.https.HttpsError("permission-denied", "Faqat o'qituvchi yoki admin uchun.");
  }

  const groupRef = db.collection("groups").doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Guruh topilmadi.");
  }
  const group = groupSnap.data();

  // Egalik: o'qituvchi faqat O'Z guruhini boshqaradi (admin — hammasini).
  const teacherId = group.teacherId;
  if (!isAdmin && teacherId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Bu guruh sizga tegishli emas.");
  }

  const studentRef = db.collection("users").doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "O'quvchi topilmadi.");
  }

  let maxStudents = 0;
  let seats = await countTeacherSeats(db, teacherId);

  if (action === "add") {
    // Obuna va limit tekshiruvi guruh EGASI bo'yicha — admin boshqa
    // o'qituvchining guruhiga qo'shsa ham, limit o'sha o'qituvchinikidir.
    const teacherSnap = teacherId ? await db.collection("users").doc(teacherId).get() : null;
    const teacherData = teacherSnap && teacherSnap.exists ? teacherSnap.data() : null;

    if (!hasActiveTeacherSubscription(teacherData)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Faol guruh obunasi yo'q. O'quvchi qo'shish uchun avval obuna xarid qiling."
      );
    }

    maxStudents = Number(teacherData.teacherSubscription.maxStudents) || 0;
    if (maxStudents <= 0) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Tarifda o'quvchilar limiti belgilanmagan. Admin bilan bog'laning."
      );
    }

    // Allaqachon a'zo bo'lsa joy band qilinmaydi — takroriy bosishda
    // "limit to'ldi" chiqmasligi uchun avval shuni tekshiramiz.
    if (!seats.has(studentId) && seats.size >= maxStudents) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Tarif limiti to'ldi (${seats.size}/${maxStudents}). Kattaroq tarifga o'ting.`
      );
    }

    await groupRef.update({ studentIds: admin.firestore.FieldValue.arrayUnion(studentId) });
    // `groupId` — himoyalangan maydon, uni faqat shu yerdan (Admin SDK) yozib
    // bo'ladi. Ilgari o'qituvchi qo'shgan o'quvchida u bo'sh qolar va o'quvchi
    // guruh rejimidagi imkoniyatlarga (podcast topshiriqlari) tushmasdi.
    await studentRef.set({ groupId, studentType: "group" }, { merge: true });
    seats.add(studentId);
  } else {
    await groupRef.update({ studentIds: admin.firestore.FieldValue.arrayRemove(studentId) });

    // `groupId` faqat AYNAN shu guruhga ishora qilsa tozalanadi.
    if (studentSnap.data().groupId === groupId) {
      // "public" — loyihadagi guruhsiz o'quvchining belgisi (`GroupsTab` da
      // guruh o'chirilganda ham shu qiymat yoziladi).
      await studentRef.set({ groupId: "none", studentType: "public" }, { merge: true });
    }
    seats.delete(studentId);
  }

  // Pro huquqi a'zolik bilan birga keladi va u bilan birga ketadi.
  await syncStudentGroupPro(db, studentId);

  return { ok: true, seatsUsed: seats.size, maxStudents };
}

/**
 * Qayta hisobni QO'LDA ishga tushirish (faqat admin).
 *
 * Kunlik supurgi 00:10 da yuradi; tizim yoqilgan kuni yoki obuna qo'lda
 * o'zgartirilgandan keyin uni kutib o'tirmaslik uchun shu callable bor.
 */
async function syncGroupProCallable(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
  }
  const db = admin.firestore();
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Faqat admin uchun.");
  }
  return syncAllGroupPro(db);
}

module.exports = {
  manageGroupStudent,
  syncStudentGroupPro,
  syncAllGroupPro,
  syncGroupProCallable,
  syncTeacherGroupPro,
  countTeacherSeats,
};
