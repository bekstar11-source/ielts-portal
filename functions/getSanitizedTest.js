// functions/getSanitizedTest.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

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

    const { testId } = data;
    if (!testId || typeof testId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Test identifikatori kiritilishi shart.');
    }

    try {
        const db = admin.firestore();
        const testSnap = await db.collection("tests").doc(testId).get();

        if (!testSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Kiritilgan test topilmadi.');
        }

        const rawData = { id: testSnap.id, ...testSnap.data() };
        
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
