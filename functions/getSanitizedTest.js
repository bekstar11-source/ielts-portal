// functions/getSanitizedTest.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { checkEntitlement } = require("./subscription");

/**
 * Recursively removes all answer keys from the test structure.
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip/delete correct answers keys
            if (['answer', 'correct_answer', 'correctAnswer', 'correct_answer_value', 'correct_answers'].includes(key)) {
                continue;
            }
            newObj[key] = sanitizeObject(obj[key]);
        }
    }
    return newObj;
}

/**
 * HTTPS Callable Cloud Function to retrieve a sanitized test (without answers).
 */
async function getSanitizedTest(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const { testId, partNumber = null } = data;
    if (!testId || typeof testId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Test identifikatori kiritilishi shart.');
    }

    // Listening da part — bitta hujjatning bo'lagi, shuning uchun qaysi part
    // so'ralayotganini faqat klient aytadi.
    //
    // ⚠️ MA'LUM CHEKLOV: bu qiymatga ishonamiz. Reading uchun muammo yo'q —
    // u yerda full test ALOHIDA hujjat, ya'ni `partNumber` yozib yuborish
    // yordam bermaydi. Listening da esa Standard foydalanuvchi `partNumber`
    // ni qo'lda yuborib butun hujjatni ola oladi. Buni to'liq yopish uchun
    // javob tarkibini so'ralgan part bilan cheklash (payload trimming) kerak.
    const parsedPart = Number(partNumber);
    const cleanPartNumber = Number.isFinite(parsedPart) && parsedPart > 0 ? parsedPart : null;

    try {
        const db = admin.firestore();
        const uid = context.auth.uid;
        const cleanId = testId.split('_part_')[0];

        const testSnap = await db.collection("tests").doc(cleanId).get();

        if (!testSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Kiritilgan test topilmadi.');
        }

        const rawData = { id: testSnap.id, ...testSnap.data() };

        const userSnap = await db.collection("users").doc(uid).get();
        const userData = userSnap.exists ? userSnap.data() : {};

        const entitled = await checkEntitlement(db, uid, userData, rawData, cleanId, cleanPartNumber);
        if (!entitled) {
            throw new functions.https.HttpsError('permission-denied', 'Bu testni ishlash uchun obuna talab qilinadi.');
        }

        // Recursively remove answers
        const sanitizedData = sanitizeObject(rawData);

        return sanitizedData;
    } catch (error) {
        console.error("getSanitizedTest Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Testni yuklashda xatolik yuz berdi.');
    }
}

// `sanitizeObject` trial oqimida ham ishlatiladi (functions/trial.js) — javob
// kalitlarini olib tashlash mantig'i IKKI joyda yozilmasligi uchun eksport
// qilinadi. Bu funksiyaning nusxasi paydo bo'lsa, biri yangilanib ikkinchisi
// eskirib qolishi mumkin edi — ya'ni jimgina javob sizib chiqishi.
module.exports = { getSanitizedTest, sanitizeObject };
