// functions/verifyAccessKey.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Cloud Function to securely verify access keys and assign exams atomically.
 * Prevents client-side access keys leaks and double-spending.
 */
async function verifyAccessKey(data, context) {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const { key } = data;
    if (!key || typeof key !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Kalit kiritilishi shart.');
    }

    const cleanKey = key.trim().toUpperCase();
    const userId = context.auth.uid;
    const db = admin.firestore();

    try {
        // 2. Query key securely (running with Admin SDK privileges, invisible to normal rules)
        const querySnapshot = await db.collection("accessKeys")
            .where("key", "==", cleanKey)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Kiritilgan kalit noto\'g\'ri yoki tizimda mavjud emas.');
        }

        const keyDocSnapshot = querySnapshot.docs[0];
        const keyData = keyDocSnapshot.data();

        if (keyData.isUsed) {
            throw new functions.https.HttpsError('failed-precondition', 'Ushbu kalit allaqachon ishlatilgan.');
        }

        const userRef = db.collection("users").doc(userId);
        const keyRef = db.collection("accessKeys").doc(keyDocSnapshot.id);

        // 3. Atomically update both user profile and key document using a Firestore Transaction
        const transactionResult = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const freshKeyDoc = await transaction.get(keyRef);

            if (!userDoc.exists) {
                throw new Error("Foydalanuvchi profili topilmadi.");
            }

            const freshKeyData = freshKeyDoc.data();
            if (freshKeyData.isUsed) {
                throw new Error("Ushbu kalit allaqachon ishlatilgan.");
            }

            let mockTitle = 'Full Mock Exam (L+R+W)';
            if (freshKeyData.collectionId) {
                const colRef = db.collection("test_collections").doc(freshKeyData.collectionId);
                const colDoc = await transaction.get(colRef);
                if (colDoc.exists) {
                    mockTitle = colDoc.data().name || mockTitle;
                }
            }

            const userData = userDoc.data();
            const now = new Date().toISOString();
            let mockAssignment = {};
            let isMock = false;

            // Check if it's a mock exam bundle or single test
            if (freshKeyData.type === 'mock_bundle' || freshKeyData.type === 'mock_full' || (freshKeyData.assignedTests && freshKeyData.assignedTests.readingId)) {
                isMock = true;

                const subTests = {
                    reading: String(freshKeyData.assignedTests?.readingId || freshKeyData.readingId || "").trim(),
                    listening: String(freshKeyData.assignedTests?.listeningId || freshKeyData.listeningId || "").trim(),
                    writing: String(freshKeyData.assignedTests?.writingId || freshKeyData.writingId || "").trim()
                };

                // Tarkibi to'liq bo'lmagan kalitni FAOLLASHTIRMAYMIZ. Ilgari bo'sh satrli
                // subTests bilan tayinlov yaratilardi va talaba imtihonni ochganda
                // `getDoc(doc(db, "tests", ""))` ichkarida portlab, u sababsiz
                // /mock sahifasiga otilardi — kalit esa allaqachon "ishlatilgan" bo'lardi.
                if (!subTests.reading || !subTests.listening || !subTests.writing) {
                    throw new Error(
                        "Bu kalitning imtihon tarkibi to'liq sozlanmagan. Administratorga murojaat qiling."
                    );
                }

                mockAssignment = {
                    id: 'MOCK_' + freshKeyData.key,
                    type: 'mock_full',
                    title: mockTitle,
                    collectionId: freshKeyData.collectionId || "",
                    startDate: now,
                    status: 'unlocked_mock',
                    mockKey: freshKeyData.key,
                    subTests
                };

                // Add to mockTests array
                transaction.update(userRef, {
                    mockTests: admin.firestore.FieldValue.arrayUnion(mockAssignment)
                });
            } else {
                mockAssignment = {
                    id: freshKeyData.targetId || "",
                    type: 'test',
                    startDate: now,
                    endDate: null,
                    status: 'unlocked_key',
                    key: freshKeyData.key
                };

                // Add to assignedTests array
                transaction.update(userRef, {
                    assignedTests: admin.firestore.FieldValue.arrayUnion(mockAssignment)
                });
            }

            // Mark key as used securely in transaction
            transaction.update(keyRef, {
                isUsed: true,
                usedBy: userId,
                usedByName: userData?.fullName || userData?.email || userId,
                usedAt: now
            });

            return { 
                success: true, 
                isMock,
                assignment: mockAssignment 
            };
        });

        return transactionResult;

    } catch (error) {
        console.error("verifyAccessKey Error:", error);
        
        // Propagate Firebase HttpsError, wrap standard errors
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Kalitni faollashtirishda xatolik yuz berdi.');
    }
}

module.exports = { verifyAccessKey };
