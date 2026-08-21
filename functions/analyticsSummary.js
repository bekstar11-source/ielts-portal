// functions/analyticsSummary.js
//
// Migratsiya va ta'mirlash uchun yagona kirish nuqtasi.
//
// Odatiy yo'lda klient `analyticsSummaries/{uid}` ni TO'G'RIDAN-TO'G'RI o'qiydi —
// bu bitta Firestore o'qishi va u React Query keshiga tushadi. Bu callable faqat
// ikki holatda chaqiriladi:
//
//   1. Summary hali yo'q — funksiya joriy qilinishidan oldin test topshirgan
//      o'quvchi. Tarix `results` va `mistakeSessions` da turibdi, jamlanma esa yo'q.
//   2. `version` eskirgan — sxema o'zgargan va eski hujjatni o'qib bo'lmaydi.
//
// NEGA KLIENT O'ZI HISOBLAMAYDI: `analyticsSummaries` ga yozish faqat Admin SDK
// ga ochiq. Aks holda o'quvchi konsoldan istalgan statistikani yozib qo'ya olardi
// va ustozga ko'rsatiladigan tahlil ishonchsiz bo'lardi.

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { COLLECTION, SUMMARY_VERSION, rebuildSummary } = require("./analyticsRollup");

/**
 * Ketma-ket qayta qurishlar orasidagi eng qisqa oraliq.
 *
 * Qayta qurish ~100–300 ta o'qish qiladi. Chaqiruvni klient boshqargani uchun
 * uni cheklash shart: aks holda sahifani qayta-qayta yangilash bazani o'sha
 * miqdorda o'qishga majburlardi. Bir soat — migratsiya bir marta ishlashi uchun
 * yetarli, suiiste'mol uchun esa foydasiz.
 */
const REBUILD_COOLDOWN_MS = 60 * 60 * 1000;

function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Summary'ni qaytaradi; kerak bo'lsa tarixdan qayta quradi.
 *
 * @returns {Promise<{summary: object, rebuilt: boolean}>}
 */
async function rebuildAnalyticsSummary(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    const ref = db.collection(COLLECTION).doc(uid);

    const snap = await ref.get();
    const current = snap.exists ? snap.data() : null;

    // Jamlanma dolzarb — klient bekorga chaqirgan. Qayta qurish o'rniga borini qaytaramiz.
    if (current && current.version === SUMMARY_VERSION) {
        return { summary: current, rebuilt: false };
    }

    // Yaqinda qayta qurilgan, lekin baribir versiya mos kelmayapti: sxemada nosozlik
    // bor. Cheksiz qayta qurish siklini boshlamaymiz — logga yozib, borini qaytaramiz.
    const since = Date.now() - toMillis(current?.rebuiltAt);
    if (current && since < REBUILD_COOLDOWN_MS) {
        functions.logger.warn(
            `[analyticsSummary] uid=${uid} yaqinda qayta qurilgan (${Math.round(since / 1000)}s), ` +
            `lekin versiya hali ham ${current.version} (kutilgan ${SUMMARY_VERSION}).`
        );
        return { summary: current, rebuilt: false };
    }

    const summary = await rebuildSummary(db, uid);
    functions.logger.info(`[analyticsSummary] uid=${uid} jamlanma qayta qurildi.`);

    // `rebuildSummary` serverTimestamp sentinellarini yozadi — ular hujjatda
    // hal bo'ladi, lekin qaytarilayotgan obyektda sentinel ko'rinishida qoladi.
    // Klientga yaroqli qiymat ketishi uchun ularni almashtiramiz.
    const now = new Date().toISOString();
    return { summary: { ...summary, updatedAt: now, rebuiltAt: now }, rebuilt: true };
}

/**
 * Ustoz uchun o'quvchi jamlanmasi.
 *
 * NEGA CALLABLE, TO'G'RIDAN-TO'G'RI O'QISH EMAS
 * ────────────────────────────────────────────
 * Firestore qoidalari KOLLEKSIYAGA SO'ROV YUBORA OLMAYDI — faqat ma'lum
 * yo'ldagi hujjatni `get()` qilishi mumkin. "Shu ustozning guruhlaridan birida
 * shu o'quvchi bormi?" degan savol esa aynan so'rovni talab qiladi
 * (`groups where teacherId == X and studentIds array-contains Y`).
 *
 * Shu sababdan qoida darajasida ikkita yo'l bor edi: yo HAR QANDAY ustozga
 * HAR QANDAY o'quvchini ochish, yo tekshiruvni serverga ko'chirish. Birinchisi
 * ilgari shunday edi va u haddan tashqari keng. Endi `analyticsSummaries` faqat
 * egasi va adminga ochiq, ustoz esa shu funksiya orqali keladi.
 *
 * O'quvchi ismi va maqsad bandi ham shu yerda qaytariladi — aks holda klient
 * `users/{uid}` ni alohida o'qishi kerak bo'lardi.
 */
async function getStudentAnalytics(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
    }

    const studentId = String(data?.studentId || "").trim();
    if (!studentId) {
        throw new functions.https.HttpsError("invalid-argument", "O'quvchi identifikatori kerak.");
    }

    const db = admin.firestore();
    const callerId = context.auth.uid;

    const callerSnap = await db.collection("users").doc(callerId).get();
    const role = callerSnap.exists ? (callerSnap.data()?.role || "student") : "student";

    // O'quvchining o'zi ham shu yo'ldan kelishi mumkin — bu zarar qilmaydi.
    if (callerId !== studentId && role !== "admin") {
        if (role !== "teacher") {
            throw new functions.https.HttpsError("permission-denied", "Ruxsat yo'q.");
        }

        // Ustoz faqat O'Z guruhidagi o'quvchini ko'ra oladi.
        const groups = await db.collection("groups")
            .where("teacherId", "==", callerId)
            .where("studentIds", "array-contains", studentId)
            .limit(1)
            .get();

        if (groups.empty) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Bu o'quvchi sizning guruhlaringizda emas."
            );
        }
    }

    const [summarySnap, studentSnap] = await Promise.all([
        db.collection(COLLECTION).doc(studentId).get(),
        db.collection("users").doc(studentId).get()
    ]);

    const student = studentSnap.exists ? studentSnap.data() : null;

    return {
        summary: summarySnap.exists ? summarySnap.data() : null,
        student: {
            fullName: student?.fullName || null,
            targetBand: Number(student?.targetBand) || null
        }
    };
}

module.exports = { rebuildAnalyticsSummary, getStudentAnalytics };
