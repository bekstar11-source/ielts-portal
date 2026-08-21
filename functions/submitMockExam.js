// functions/submitMockExam.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { evaluateTest, calculateBandScore, calculateOverallBand } = require("./ieltsScoring");
const { applyRollup, buildTestDelta } = require("./analyticsRollup");
const { mergeTypeStats } = require("./questionTypes");

/**
 * Cloud Function to securely grade and log full mock exams on the backend.
 *
 * ⚠️ XAVFSIZLIK: qaysi testlar baholanishini KLIENT hal qila olmaydi. Ilgari
 * `mockData.subTests` to'g'ridan-to'g'ri klientdan olinardi, ya'ni talaba o'zi
 * javoblarini biladigan testlarning ID sini yuborib, sun'iy yuqori band ola olardi.
 * Endi tarkib faqat `users/{uid}.mockTests` ichidagi haqiqiy tayinlovdan o'qiladi.
 */

/** Natija hujjati uchun barqaror (deterministik) ID — takroriy topshirish yangi hujjat yaratmaydi. */
function buildResultId(userId, mockKey) {
    const safeKey = String(mockKey).replace(/[^A-Za-z0-9_-]/g, '-');
    return `mock_${userId}_${safeKey}`;
}

async function submitMockExam(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const userId = context.auth.uid;
    const { mockKey, answers } = data || {};

    if (!mockKey || typeof mockKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Imtihon kaliti (mockKey) kiritilishi shart.');
    }
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        throw new functions.https.HttpsError('invalid-argument', 'Javoblar noto\'g\'ri formatda yuborildi.');
    }

    const cleanKey = mockKey.trim();
    const { listening: listeningAns, reading: readingAns, writing: writingAns } = answers;

    try {
        const db = admin.firestore();
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Foydalanuvchi profili topilmadi.');
        }
        const userData = userSnap.data();

        // 1. Imtihon haqiqatan ham shu foydalanuvchiga biriktirilganini tekshiramiz.
        const mockTests = Array.isArray(userData.mockTests) ? userData.mockTests : [];
        const assignmentIndex = mockTests.findIndex(
            m => m && String(m.mockKey || '').trim() === cleanKey
        );

        if (assignmentIndex === -1) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Bu imtihon sizning hisobingizga biriktirilmagan.'
            );
        }

        const assignment = mockTests[assignmentIndex];
        const resultId = buildResultId(userId, cleanKey);

        // 2. Takroriy topshirishni bloklaymiz — aks holda bitta kalit bilan cheksiz
        //    natija yaratib, eng yaxshisini tanlab olish mumkin edi.
        if (assignment.status === 'completed') {
            const existingRef = db.collection("results").doc(assignment.resultId || resultId);
            const existingSnap = await existingRef.get();
            if (existingSnap.exists) {
                const existing = existingSnap.data();
                return {
                    success: true,
                    alreadySubmitted: true,
                    resultId: existingSnap.id,
                    scores: existing.scores || {},
                    overallBand: existing.overallBand ?? existing.bandScore ?? 0
                };
            }
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Bu imtihon allaqachon topshirilgan.'
            );
        }

        // 3. Tarkibni FAQAT serverdagi tayinlovdan olamiz (klientnikiga ishonmaymiz).
        const subTests = assignment.subTests || {};
        const listeningId = String(subTests.listening || '').trim();
        const readingId = String(subTests.reading || '').trim();
        const writingId = String(subTests.writing || '').trim();

        if (!listeningId || !readingId || !writingId) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Imtihon tarkibi to\'liq sozlanmagan. Administratorga murojaat qiling.'
            );
        }

        // 4. Fetch raw subtest documents securely
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

        // 5. Score listening and reading securely on backend
        const lEval = evaluateTest(listeningTest, listeningAns || {});
        const rEval = evaluateTest(readingTest, readingAns || {});

        // Band jadvalini MODUL turidan olamiz, `testData.type` dan emas. `evaluateTest`
        // ichida `testData.type || 'reading'` ishlatiladi — agar admin listening slotiga
        // `type` maydoni noto'g'ri hujjatni bog'lasa, band jimgina Reading jadvali bo'yicha
        // hisoblanardi; `type` umuman bo'lmasa esa `calculateBandScore` null qaytarib,
        // talaba band 0 olardi. Bu yerda tur aniq ma'lum, shuning uchun ochiq uzatamiz.
        if (String(listeningTest.type || '').toLowerCase() !== 'listening') {
            functions.logger.warn(
                `[submitMockExam] Listening sloti noto'g'ri turdagi test: id=${listeningId} type=${listeningTest.type}`
            );
        }
        if (String(readingTest.type || '').toLowerCase() !== 'reading') {
            functions.logger.warn(
                `[submitMockExam] Reading sloti noto'g'ri turdagi test: id=${readingId} type=${readingTest.type}`
            );
        }

        const lBand = calculateBandScore(lEval.correctCount, 'listening', lEval.totalQ) || 0;
        const rBand = calculateBandScore(rEval.correctCount, 'reading', rEval.totalQ) || 0;

        const finalScores = {
            listening: lEval.correctCount,
            reading: rEval.correctCount,
            listeningTotal: lEval.totalQ,
            readingTotal: rEval.totalQ,
            listeningBand: lBand,
            readingBand: rBand,
        };

        // DIQQAT: 0 ni FILTRLAMAYMIZ. Ilgari `.filter(b => b > 0)` bor edi va hech narsa
        // yozmagan talabaning listening bandi (0) hisobdan tushib qolardi — masalan
        // L=0, R=6.0 bo'lganda overall 3.0 emas, 6.0 chiqardi.
        const interimOverall = calculateOverallBand([lBand, rBand]);
        finalScores.overallBand = interimOverall;

        // 6. Save full mock results document (deterministik ID → takroran chaqirilsa ham bitta hujjat)
        const serverSubTests = { listening: listeningId, reading: readingId, writing: writingId };
        const resultDoc = {
            userId: userId,
            userName: userData?.fullName || context.auth.token.email || "Candidate",
            testTitle: assignment.title || "FULL MOCK EXAM",
            type: "mock_full",
            mockKey: cleanKey,
            subTests: serverSubTests,
            date: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            scores: finalScores,
            bandScore: interimOverall,
            overallBand: interimOverall,

            // Xatolar tahlili (Pro) uchun savol turlari kesimi. Mock'da Listening va
            // Reading bitta hujjatga tushadi, shuning uchun ikkalasini qo'shib yozamiz —
            // o'quvchi uchun "Matching Headings"dagi zaiflik qaysi bo'limdan kelganidan
            // qat'i nazar bir xil ko'nikma muammosi.
            typeStats: mergeTypeStats(lEval.typeStats, rEval.typeStats),
            details: {
                listeningAnswers: listeningAns || {},
                readingAnswers: readingAns || {},
                writingAnswers: writingAns || {}
            },
            status: 'pending_review'
        };

        const resRef = db.collection("results").doc(resultId);
        await resRef.set(resultDoc);

        // 6.5. Subtest "kvitansiyalari" — firestore.rules ularning MAVJUDLIGIGA qarab
        //      review uchun xom testni o'qishga ruxsat beradi.
        //
        //      DIQQAT: bu hujjatlarning ID si `{uid}_{testId}` — aynan submitTestAnswers
        //      ishlatadigan ID. Ilgari bu yerda merge'siz `.set()` chaqirilardi va talaba
        //      o'sha testni ilgari mustaqil ishlagan bo'lsa, uning butun tarixi
        //      (attempts, bestScore, testTitle, totalQuestions) o'chib ketardi.
        //      Endi `{ merge: true }` va faqat mock'ga tegishli maydonlar yoziladi —
        //      ball/status kabi "practice" semantikasidagi maydonlarga tegilmaydi.
        //      Mock ballari to'liq holda yuqoridagi mock_full hujjatida turadi.
        const receipt = (testId) => db.collection("results").doc(`${userId}_${testId}`).set({
            userId: userId,
            testId: testId,
            mockKey: cleanKey,
            parentResultId: resRef.id,
            mockSubmittedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await Promise.all([
            receipt(listeningId),
            receipt(readingId),
            receipt(writingId)
        ]);

        // 6.6. Analitika jamlanmasi. Mock'da Listening va Reading alohida
        //      baholanadi, shuning uchun rollupga ham ikkita alohida delta
        //      tushadi — o'quvchi "Listening'da orqadaman" degan xulosani
        //      mock natijasidan ham ko'ra olsin.
        //
        //      `resultId` deterministik (mockKey asosida), ya'ni takroran
        //      chaqirilsa `sourceId` bir xil bo'ladi va rollup ikkinchi marta
        //      qo'llanmaydi.
        //
        //      BUTUN BLOK himoyalangan: `applyRollup` faqat o'z tranzaksiyasidagi
        //      xatoni yutadi, `buildTestDelta` esa yutmaydi. Natija allaqachon
        //      saqlangan — jamlanmadagi nosozlik uni ko'rsatishga to'sqinlik
        //      qilmasligi kerak (jamlanma `rebuildSummary` da tiklanadi).
        try {
            const mockDate = new Date();
            for (const [skill, evaluation, moduleBand] of [
                ['listening', lEval, lBand],
                ['reading', rEval, rBand]
            ]) {
                await applyRollup(db, userId, buildTestDelta({
                    skill,
                    typeStats: evaluation.typeStats || {},
                    mistakes: evaluation.mistakes || [],
                    band: moduleBand,
                    date: mockDate,
                    isFirstAttempt: true,
                    sourceId: `${resRef.id}_${skill}`
                }));
            }
        } catch (rollupErr) {
            functions.logger.error("[submitMockExam] analitika jamlanmasi yangilanmadi:", rollupErr);
        }

        // 7. Tayinlovni "completed" ga o'tkazamiz. Tranzaksiya kerak, chunki `mockTests`
        //    butun massiv sifatida qayta yoziladi — parallel `verifyAccessKey` (arrayUnion)
        //    yangi kalitni qo'shib ulgursa, oddiy update uni yo'q qilib yuborardi.
        await db.runTransaction(async (transaction) => {
            const freshSnap = await transaction.get(userRef);
            const freshData = freshSnap.exists ? freshSnap.data() : {};
            const freshMocks = Array.isArray(freshData.mockTests) ? freshData.mockTests : [];

            const updated = freshMocks.map(m => {
                if (m && String(m.mockKey || '').trim() === cleanKey) {
                    return { ...m, status: 'completed', resultId: resRef.id };
                }
                return m;
            });

            transaction.update(userRef, {
                mockTests: updated,
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
            });
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
