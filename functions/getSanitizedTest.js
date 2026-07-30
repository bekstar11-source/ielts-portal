// functions/getSanitizedTest.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getTier, isStaff, meetsTier } = require("./subscription");

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
 * Checks whether a user is entitled to access a given test's content.
 * Mirrors the client-side gating in ReadingFull/ListeningFull/useDailyLimit,
 * but runs server-side so it can't be bypassed by navigating straight to /test/:id.
 */
async function checkEntitlement(db, uid, userData, testData, testId) {
    // Explicitly free tests/collections are always allowed.
    if (testData.isFree || testData.collectionAccessTier === 'free') {
        return true;
    }

    if (isStaff(userData)) return true;

    // ⚠️ `getTier` obuna MUDDATINI ham hisobga oladi. Ilgari bu yerda faqat
    // `accountType`/`isPro` bayroqlari o'qilardi va muddat tugashi faqat
    // klientda (AuthContext) tekshirilardi — ya'ni brauzer o'sha yozuvni
    // bajarmasa, obuna abadiy amal qilaverardi.
    const userTier = getTier(userData);
    const requiredTier = testData.collectionAccessTier;

    if (requiredTier === 'pro' || requiredTier === 'standard') {
        if (meetsTier(userData, requiredTier)) return true;
    } else {
        const type = (testData.type || '').toLowerCase();
        if (type === 'reading' || type === 'listening') {
            if (userTier !== 'free') return true;
        } else {
            // Writing/Speaking are not subscription-gated today.
            return true;
        }
    }

    // Not covered by account tier — check if this specific test was assigned
    // to the user directly, via their group, or unlocked through an access key
    // (single test or as part of an unlocked mock exam).
    const userAssigns = userData.assignedTests || [];
    if (userAssigns.some(a => String(a.id).trim() === testId)) return true;

    const mockTests = userData.mockTests || [];
    const inUnlockedMock = mockTests.some(m => {
        const sub = m.subTests || {};
        return sub.reading === testId || sub.listening === testId || sub.writing === testId;
    });
    if (inUnlockedMock) return true;

    const groupsSnap = await db.collection('groups').where('studentIds', 'array-contains', uid).get();
    for (const groupDoc of groupsSnap.docs) {
        const groupAssigns = groupDoc.data().assignedTests || [];
        if (groupAssigns.some(a => String(a.id).trim() === testId)) return true;
    }

    return false;
}

/**
 * HTTPS Callable Cloud Function to retrieve a sanitized test (without answers).
 */
async function getSanitizedTest(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const { testId } = data;
    if (!testId || typeof testId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Test identifikatori kiritilishi shart.');
    }

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

        const entitled = await checkEntitlement(db, uid, userData, rawData, cleanId);
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

module.exports = { getSanitizedTest };
