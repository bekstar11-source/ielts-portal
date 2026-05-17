// functions/submitMockExam.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { evaluateTest, calculateBandScore, calculateOverallBand } = require("./ieltsScoring");

/**
 * Cloud Function to securely grade and log full mock exams on the backend.
 * Evaluates Listening and Reading subtests securely, sets up grading details,
 * and updates user profile and assignments.
 */
async function submitMockExam(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const userId = context.auth.uid;
    const { mockKey, mockData, answers } = data;

    if (!mockKey || !mockData || !mockData.subTests || !answers) {
        throw new functions.https.HttpsError('invalid-argument', 'Imtihon ma\'lumotlari to\'liq taqdim etilmadi.');
    }

    const { listening: listeningAns, reading: readingAns, writing: writingAns } = answers;
    const { listening: listeningId, reading: readingId, writing: writingId } = mockData.subTests;

    try {
        const db = admin.firestore();

        // 1. Fetch raw subtest documents securely
        const [listeningSnap, readingSnap, writingSnap] = await Promise.all([
            db.collection("tests").doc(listeningId).get(),
            db.collection("tests").doc(readingId).get(),
            db.collection("tests").doc(writingId).get()
        ]);

        if (!listeningSnap.exists || !readingSnap.exists || !writingSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Imtihon qismlaridan biri bazada topilmadi.');
        }

        const listeningTest = { id: listeningSnap.id, ...listeningSnap.data() };
        const readingTest = { id: readingSnap.id, ...readingSnap.data() };

        // 2. Score listening and reading securely on backend
        const lEval = evaluateTest(listeningTest, listeningAns || {});
        const rEval = evaluateTest(readingTest, readingAns || {});

        const lBand = lEval.band || 0;
        const rBand = rEval.band || 0;

        const finalScores = {
            listening: lEval.correctCount,
            reading: rEval.correctCount,
            listeningBand: lBand,
            readingBand: rBand,
        };

        const interimOverall = calculateOverallBand([lBand, rBand].filter(b => b > 0));
        finalScores.overallBand = interimOverall;

        // 3. Fetch user profile
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Foydalanuvchi profili topilmadi.');
        }
        const userData = userSnap.data();

        // 4. Save full mock results document
        const resultDoc = {
            userId: userId,
            userName: userData?.fullName || context.auth.token.email || "Candidate",
            testTitle: "FULL MOCK EXAM",
            type: "mock_full",
            mockKey: mockKey,
            subTests: mockData.subTests, 
            date: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            scores: finalScores,
            bandScore: interimOverall,
            overallBand: interimOverall,
            details: { 
                listeningAnswers: listeningAns || {}, 
                readingAnswers: readingAns || {}, 
                writingAnswers: writingAns || {} 
            },
            status: 'pending_review'
        };

        const resRef = await db.collection("results").add(resultDoc);

        // 4.5. Create subtest completion receipts to authorize review access under firestore rules
        await Promise.all([
            db.collection("results").doc(`${userId}_${listeningId}`).set({
                userId: userId,
                testId: listeningId,
                type: 'listening',
                mockKey: mockKey,
                parentResultId: resRef.id,
                status: 'graded',
                score: lEval.correctCount,
                bandScore: lBand,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }),
            db.collection("results").doc(`${userId}_${readingId}`).set({
                userId: userId,
                testId: readingId,
                type: 'reading',
                mockKey: mockKey,
                parentResultId: resRef.id,
                status: 'graded',
                score: rEval.correctCount,
                bandScore: rBand,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }),
            db.collection("results").doc(`${userId}_${writingId}`).set({
                userId: userId,
                testId: writingId,
                type: 'writing',
                mockKey: mockKey,
                parentResultId: resRef.id,
                status: 'submitted',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            })
        ]);

        // 5. Update user assignment status in user profile
        const mockTests = userData.mockTests || [];
        const updatedMockTests = mockTests.map(m => {
            if (m.id === mockData.id || m.mockKey === mockKey) {
                return { ...m, status: 'completed', resultId: resRef.id };
            }
            return m;
        });

        await userRef.update({ 
            mockTests: updatedMockTests,
            "lastActiveAt": admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            resultId: resRef.id,
            scores: finalScores,
            overallBand: interimOverall
        };

    } catch (error) {
        console.error("submitMockExam Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Imtihonni yakunlashda xatolik yuz berdi.');
    }
}

module.exports = { submitMockExam };
