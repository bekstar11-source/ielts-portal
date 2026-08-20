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

module.exports = { rebuildAnalyticsSummary };
