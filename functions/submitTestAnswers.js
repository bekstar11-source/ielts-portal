// functions/submitTestAnswers.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { evaluateTest } = require("./ieltsScoring");
const { checkEntitlement } = require("./subscription");

/**
 * Cloud Function to securely grade test answers on the backend, 
 * save the results and mistake sessions, and update user statistics.
 */
async function submitTestAnswers(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const userId = context.auth.uid;
    const { testId, testMode, userAnswers, timeSpent, violationType, partNumber = null } = data;

    if (!testId || typeof testId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Test identifikatori kiritilishi shart.');
    }

    const cleanUserAnswers = userAnswers || {};
    const cleanTestMode = testMode || 'practice';
    const cleanTimeSpent = timeSpent || 0;
    const cleanViolationType = violationType || null;
    const parsedPartNumber = partNumber ? Number(partNumber) : null;

    try {
        const db = admin.firestore();

        // 1. Fetch raw test with correct answers
        const testSnap = await db.collection("tests").doc(testId).get();
        if (!testSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Kiritilgan test topilmadi.');
        }

        const testData = { id: testSnap.id, ...testSnap.data() };
        const testType = (testData.type || 'reading').toLowerCase().trim();

        // 2. Fetch user profile
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Foydalanuvchi profili topilmadi.');
        }
        const userData = userSnap.data();

        // 3. Tarif/biriktirish bo'yicha ruxsatni tekshirish — xuddi `getSanitizedTest`
        // dagi kabi. Bu bo'lmasa, foydalanuvchi kontentni hech qachon olmagan
        // (getSanitizedTest'dan rad javobi kelgan) bo'lsa ham, ushbu callable'ga
        // to'g'ridan-to'g'ri murojaat qilib, istalgan testning natijasini "topshirib"
        // saqlab qo'yishi mumkin edi.
        const entitled = await checkEntitlement(db, userId, userData, testData, testId, parsedPartNumber);
        if (!entitled) {
            throw new functions.https.HttpsError('permission-denied', 'Bu testni ishlash uchun obuna talab qilinadi.');
        }

        // 4. Securely evaluate answers
        const { correctCount, totalQ, band, mistakes, missingKeys, typeStats } = evaluateTest(testData, cleanUserAnswers, parsedPartNumber);

        // Per-passage breakdown (question count + mistake count only — never answers)
        // so the result screen can show an accurate "mistakes per part" view without
        // the client ever seeing correct answers.
        let partBreakdown = [];
        if (parsedPartNumber) {
            const passage = testData.passages && testData.passages[parsedPartNumber - 1];
            partBreakdown = [{
                passageId: passage?.id || null,
                total: totalQ,
                mistakes: Math.max(0, totalQ - correctCount)
            }];
        } else if (Array.isArray(testData.passages) && testData.passages.length > 0) {
            partBreakdown = testData.passages.map((passage, idx) => {
                const r = evaluateTest(testData, cleanUserAnswers, idx + 1);
                return {
                    passageId: passage.id || null,
                    total: r.totalQ,
                    mistakes: Math.max(0, r.totalQ - r.correctCount)
                };
            });
        }

        // Talaba javob bergan, lekin javob kaliti kiritilmagan savollar — test tuzishdagi xato.
        // Bunday savollar umumiy hisobga kirmaydi, ya'ni band sun'iy ravishda ko'tariladi.
        if (missingKeys && missingKeys.length > 0) {
            functions.logger.warn(
                `[submitTestAnswers] Javob kaliti yo'q savollar: test=${testId} savollar=[${missingKeys.join(', ')}] ` +
                `— bu savollar ${totalQ} ta umumiy hisobdan tashqarida qoldi.`
            );
        }

        // 5. Save results atomically using a transaction
        const resultDocId = parsedPartNumber 
            ? `${userId}_${testId}_part_${parsedPartNumber}`
            : `${userId}_${testId}`;
            
        const resultRef = db.collection("results").doc(resultDocId);
        const now = new Date().toISOString();

        const currentAttempt = {
            attemptId: new Date().getTime().toString(),
            date: now,
            score: correctCount,
            bandScore: band || 0,
            timeSpent: cleanTimeSpent,
            mode: cleanTestMode,
            userAnswers: cleanUserAnswers,
            partNumber: parsedPartNumber,
            typeStats: typeStats || {}
        };

        await db.runTransaction(async (transaction) => {
            const resultSnap = await transaction.get(resultRef);
            let bestScore = correctCount;
            let bestBandScore = band || 0;

            if (resultSnap.exists) {
                const existingData = resultSnap.data();
                if (existingData.bestScore > bestScore) {
                    bestScore = existingData.bestScore;
                    bestBandScore = existingData.bestBandScore || bestBandScore;
                }
            }

            const resultDataToSave = {
                userName: userData?.fullName || context.auth.token.email || 'Candidate',
                testTitle: parsedPartNumber ? `${testData.title || 'Untitled Test'} (Part ${parsedPartNumber})` : (testData.title || 'Untitled Test'),
                type: testType,
                totalQuestions: totalQ,
                status: testType === 'reading' || testType === 'listening' ? 'graded' : 'submitted',
                partNumber: parsedPartNumber,
                
                bestScore: bestScore,
                bestBandScore: bestBandScore,
                latestScore: correctCount,
                latestBandScore: band || 0,
                score: bestScore,
                bandScore: bestBandScore,
                lastAttemptDate: now,
                date: now,

                // Savol turlari kesimidagi statistika — Pro "Xatolar tahlili" shundan
                // yig'iladi. Ataylab OXIRGI urinishnikini saqlaymiz: aks holda bitta
                // testni qayta-qayta ishlagan o'quvchi umumiy manzarani buzib yuborardi.
                typeStats: typeStats || {},


                attempts: admin.firestore.FieldValue.arrayUnion(currentAttempt),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (resultSnap.exists) {
                transaction.update(resultRef, resultDataToSave);
            } else {
                transaction.set(resultRef, {
                    ...resultDataToSave,
                    userId: userId,
                    testId: testId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Update user stats
            const updatePayload = {
                "stats.totalTests": admin.firestore.FieldValue.increment(1),
                "stats.totalBandScore": admin.firestore.FieldValue.increment(band || 0),
                "lastActiveAt": admin.firestore.FieldValue.serverTimestamp()
            };

            if (testType === 'reading') {
                const currentBest = userData.bestReadingBand || 0;
                if (band > currentBest) {
                    updatePayload.bestReadingBand = band;
                }
            } else if (testType === 'listening') {
                const currentBest = userData.bestListeningBand || 0;
                if (band > currentBest) {
                    updatePayload.bestListeningBand = band;
                }
            }

            transaction.update(userRef, updatePayload);
        });

        // 6. Save mistake sessions if any (doesn't need transaction but run in parallel)
        if (mistakes && mistakes.length > 0) {
            const mistakeSessionRef = db.collection("users").doc(userId).collection("mistakeSessions").doc();
            await mistakeSessionRef.set({
                mistakes,
                typeStats: typeStats || {},
                date: now,
                testId: testId,
                testTitle: testData.title || 'Untitled Test'
            });
        }

        return {
            success: true,
            score: correctCount,
            bandScore: band || 0,
            totalQuestions: totalQ,
            partBreakdown,
            mistakes: mistakes,
            resultId: resultDocId
        };

    } catch (error) {
        console.error("submitTestAnswers Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Testni topshirishda xatolik yuz berdi.');
    }
}

module.exports = { submitTestAnswers };
