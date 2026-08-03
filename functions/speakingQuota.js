// functions/speakingQuota.js
// Speaking AI baholashining kunlik limiti.
//
// Nega kerak: bitta javobni baholash Gemini ga audio yuborish (eng qimmat
// input turi) va ustiga TTS sintezi demakdir. Limitsiz callable — bu
// ochiq hisob: bitta akkaunt tunda minglab so'rov yuborsa, hisobni
// hech kim to'xtata olmaydi.
//
// Hisoblagich `users/{uid}/usage/speaking` hujjatida, tranzaksiya ichida
// oshiriladi. Baholash muvaffaqiyatsiz tugasa — qaytariladi, ya'ni o'quvchi
// server xatosi uchun kunlik limitidan ayrilmaydi.

const admin = require("firebase-admin");
const { getTier, isStaff } = require("./subscription");

/** Tarif bo'yicha kunlik javob soni. */
const DAILY_LIMITS = {
    free: 5,
    standard: 20,
    pro: 50,
};

/** Xodimlar uchun ham cheksiz emas — noto'g'ri sikl hisobni yoqib yubormasin. */
const STAFF_DAILY_LIMIT = 200;

/** Toshkent vaqti bo'yicha kun kaliti — limit yarim tunda yangilanadi. */
function todayKey(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);
}

/** @returns {number} shu foydalanuvchi uchun kunlik limit */
function dailyLimit(userData) {
    if (isStaff(userData)) return STAFF_DAILY_LIMIT;
    return DAILY_LIMITS[getTier(userData)] ?? DAILY_LIMITS.free;
}

function usageRef(db, uid) {
    return db.collection("users").doc(uid).collection("usage").doc("speaking");
}

/**
 * Limitdan bitta o'rin band qiladi.
 *
 * Band qilish AI chaqiruvidan OLDIN bo'lishi shart: keyin qilinsa, parallel
 * yuborilgan o'nlab so'rov tekshiruvdan birvarakayiga o'tib ketardi.
 *
 * @throws {Error & { code: 'quota-exceeded' }}
 * @returns {Promise<{ used: number, limit: number, day: string }>}
 */
async function reserveSpeakingSlot(db, uid, userData) {
    const limit = dailyLimit(userData);
    const day = todayKey();
    const ref = usageRef(db, uid);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : {};
        // Kun almashgan bo'lsa hisoblagich noldan boshlanadi.
        const used = data.day === day ? Number(data.count) || 0 : 0;

        if (used >= limit) {
            const error = new Error(`Kunlik limit tugadi (${limit}).`);
            error.code = "quota-exceeded";
            error.limit = limit;
            error.used = used;
            throw error;
        }

        tx.set(
            ref,
            {
                day,
                count: used + 1,
                total: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return { used: used + 1, limit, day };
    });
}

/**
 * Band qilingan o'rinni qaytaradi — baholash yakunlanmagan holat uchun.
 * Xatoni yutadi: qaytarib bo'lmasa ham asosiy javob buzilmasligi kerak.
 */
async function releaseSpeakingSlot(db, uid, day) {
    try {
        await db.runTransaction(async (tx) => {
            const ref = usageRef(db, uid);
            const snap = await tx.get(ref);
            if (!snap.exists) return;
            const data = snap.data();
            // Kun almashib ketgan bo'lsa qaytaradigan narsa yo'q.
            if (data.day !== day) return;
            const count = Number(data.count) || 0;
            if (count <= 0) return;
            tx.update(ref, { count: count - 1 });
        });
    } catch (error) {
        console.error("releaseSpeakingSlot error:", error);
    }
}

module.exports = {
    DAILY_LIMITS,
    STAFF_DAILY_LIMIT,
    todayKey,
    dailyLimit,
    reserveSpeakingSlot,
    releaseSpeakingSlot,
};
