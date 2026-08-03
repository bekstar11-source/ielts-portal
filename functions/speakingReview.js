// functions/speakingReview.js
// Jonli o'qituvchi tekshiruvi — Speaking sessiyasi uchun pullik xizmat.
//
// AI bahosi bepul va darhol keladi. O'quvchi shu bahoga qo'shimcha ravishda
// jonli o'qituvchining fikrini xohlasa, alohida to'lov qiladi: o'qituvchi
// javoblarni o'zi eshitadi, band ballarni tasdiqlaydi yoki tuzatadi va
// izoh yozadi.
//
// To'lov oqimi platformadagi mavjud tartib bilan bir xil: Telegram bot →
// karta → chek skrinshoti → admin tasdiqlashi. Shuning uchun bu yerda
// "buyurtma" (order) hujjati yaratiladi, botdagi tasdiqlash tugmasi esa
// `markSpeakingReviewPaid` ni chaqiradi.
//
// ⚠️ Narx, holat va band ballar FAQAT shu yerdan yoziladi — firestore.rules
// da `speakingSessions` klientga yopiq.

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { CRITERIA, roundBand } = require("./speakingRubric");

/** Bitta sessiyani jonli tekshirish narxi (so'm). */
const REVIEW_PRICE = Number(process.env.SPEAKING_REVIEW_PRICE || 15000);

/** Telegram bot foydalanuvchi nomi — to'lov deep-link uchun. */
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "ielts_portal_auth_bot";

const ORDERS = "speakingReviewOrders";

/** Tekshiruv holatlari. */
const STATUS = {
    NONE: "none",
    AWAITING_PAYMENT: "awaiting_payment",
    PAID: "paid",
    DONE: "done",
};

function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Avtorizatsiyadan o'tish kerak."
        );
    }
    return context.auth.uid;
}

async function requireTeacher(db, uid) {
    const snap = await db.collection("users").doc(uid).get();
    const role = snap.exists ? snap.data().role : null;
    if (role !== "teacher" && role !== "admin") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Bu amal faqat o'qituvchi uchun."
        );
    }
    return snap.data();
}

/**
 * O'quvchi jonli tekshiruv so'raydi.
 * To'lovni yaratmaydi — buyurtma ochadi va Telegram havolasini qaytaradi.
 */
async function requestSpeakingReview(data, context) {
    const uid = requireAuth(context);
    const db = admin.firestore();
    const { sessionId } = data || {};

    if (!sessionId) {
        throw new functions.https.HttpsError("invalid-argument", "sessionId talab qilinadi.");
    }

    const sessionRef = db.collection("speakingSessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Sessiya topilmadi.");
    }

    const session = sessionSnap.data();
    if (session.uid !== uid) {
        throw new functions.https.HttpsError("permission-denied", "Bu sessiya sizniki emas.");
    }
    if (!session.answeredCount) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Tekshirish uchun avval kamida bitta javob bering."
        );
    }

    const current = session.teacherReview || {};
    // Allaqachon to'langan yoki tekshirilgan bo'lsa — takror buyurtma yo'q.
    if (current.status === STATUS.PAID || current.status === STATUS.DONE) {
        return { alreadyOrdered: true, status: current.status, price: current.price || REVIEW_PRICE };
    }
    // Kutayotgan buyurtma bo'lsa — o'shanga qaytaramiz, yangisini ochmaymiz.
    if (current.status === STATUS.AWAITING_PAYMENT && current.orderId) {
        return {
            orderId: current.orderId,
            status: current.status,
            price: current.price || REVIEW_PRICE,
            payUrl: `https://t.me/${BOT_USERNAME}?start=${uid}_spk_${current.orderId}`,
        };
    }

    // O'quvchining guruhi bo'lsa — tekshiruv o'sha guruh o'qituvchisiga tushadi.
    let teacherId = null;
    try {
        const groups = await db
            .collection("groups")
            .where("studentIds", "array-contains", uid)
            .limit(1)
            .get();
        if (!groups.empty) teacherId = groups.docs[0].data().teacherId || null;
    } catch (error) {
        console.error("requestSpeakingReview group lookup:", error);
    }

    const orderRef = db.collection(ORDERS).doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await orderRef.set({
        uid,
        sessionId,
        teacherId,
        price: REVIEW_PRICE,
        status: "pending",
        studentName: session.studentName || null,
        topicTitle: session.topicTitle || null,
        createdAt: now,
    });

    await sessionRef.set(
        {
            teacherReview: {
                status: STATUS.AWAITING_PAYMENT,
                orderId: orderRef.id,
                price: REVIEW_PRICE,
                teacherId,
                requestedAt: new Date().toISOString(),
            },
            updatedAt: now,
        },
        { merge: true }
    );

    return {
        orderId: orderRef.id,
        status: STATUS.AWAITING_PAYMENT,
        price: REVIEW_PRICE,
        // Deep-link payload: `{uid}_spk_{orderId}` — botdagi mavjud
        // `USERID_PLANID_BILLING` tartibiga mos tushadi.
        payUrl: `https://t.me/${BOT_USERNAME}?start=${uid}_spk_${orderRef.id}`,
    };
}

/**
 * To'lov tasdiqlangach chaqiriladi (Telegram bot, admin tugmasi).
 * @returns {Promise<{ sessionId: string, uid: string, price: number }>}
 */
async function markSpeakingReviewPaid(orderId) {
    const db = admin.firestore();
    const orderRef = db.collection(ORDERS).doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new Error(`Buyurtma topilmadi: ${orderId}`);

    const order = orderSnap.data();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await orderRef.set({ status: "paid", paidAt: now }, { merge: true });

    await db.collection("speakingSessions").doc(order.sessionId).set(
        {
            teacherReview: {
                status: STATUS.PAID,
                orderId,
                price: order.price,
                teacherId: order.teacherId || null,
                paidAt: new Date().toISOString(),
            },
            updatedAt: now,
        },
        { merge: true }
    );

    return { sessionId: order.sessionId, uid: order.uid, price: order.price };
}

/**
 * O'qituvchi tekshiruvni yakunlaydi.
 *
 * @param {{ sessionId: string, comment: string, bands?: object,
 *           answers?: Array<{ questionId: string, bands?: object, comment?: string }> }} data
 */
async function submitSpeakingReview(data, context) {
    const uid = requireAuth(context);
    const db = admin.firestore();
    const teacher = await requireTeacher(db, uid);

    const { sessionId, comment, bands, answers } = data || {};
    if (!sessionId) {
        throw new functions.https.HttpsError("invalid-argument", "sessionId talab qilinadi.");
    }
    const cleanComment = String(comment || "").trim();
    if (cleanComment.length < 10) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Izoh juda qisqa — o'quvchi buning uchun to'lagan."
        );
    }

    const sessionRef = db.collection("speakingSessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Sessiya topilmadi.");
    }

    const session = sessionSnap.data();
    const review = session.teacherReview || {};
    if (review.status !== STATUS.PAID && review.status !== STATUS.DONE) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Bu sessiya uchun tekshiruv to'lanmagan."
        );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Har bir javob uchun o'qituvchi tuzatishi (ixtiyoriy).
    for (const item of Array.isArray(answers) ? answers : []) {
        if (!item?.questionId) continue;
        const patch = {
            teacherComment: String(item.comment || "").trim() || null,
            teacherId: uid,
            teacherReviewedAt: now,
        };
        if (item.bands) {
            const cleaned = {};
            for (const key of CRITERIA) {
                const band = roundBand(item.bands[key]);
                if (band !== null) cleaned[key] = band;
            }
            if (Object.keys(cleaned).length === CRITERIA.length) {
                cleaned.overall = roundBand(
                    CRITERIA.reduce((sum, key) => sum + cleaned[key], 0) / CRITERIA.length
                );
                patch.teacherBands = cleaned;
            }
        }
        batch.set(sessionRef.collection("answers").doc(String(item.questionId)), patch, {
            merge: true,
        });
    }

    // Sessiya darajasidagi yakuniy ball — berilmasa AI bahosi qoladi.
    let finalBands = null;
    if (bands) {
        const cleaned = {};
        for (const key of CRITERIA) {
            const band = roundBand(bands[key]);
            if (band !== null) cleaned[key] = band;
        }
        if (Object.keys(cleaned).length === CRITERIA.length) {
            cleaned.overall = roundBand(
                CRITERIA.reduce((sum, key) => sum + cleaned[key], 0) / CRITERIA.length
            );
            finalBands = cleaned;
        }
    }

    batch.set(
        sessionRef,
        {
            teacherReview: {
                ...review,
                status: STATUS.DONE,
                teacherId: uid,
                teacherName: teacher.name || teacher.displayName || null,
                comment: cleanComment,
                bands: finalBands,
                reviewedAt: new Date().toISOString(),
            },
            updatedAt: now,
        },
        { merge: true }
    );

    if (review.orderId) {
        batch.set(
            db.collection(ORDERS).doc(review.orderId),
            { status: "done", teacherId: uid, doneAt: now },
            { merge: true }
        );
    }

    await batch.commit();
    return { success: true };
}

module.exports = {
    REVIEW_PRICE,
    STATUS,
    requestSpeakingReview,
    submitSpeakingReview,
    markSpeakingReviewPaid,
};
