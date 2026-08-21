// functions/submitTestAnswers.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { evaluateTest } = require("./ieltsScoring");
const { checkEntitlement } = require("./subscription");
const { applyRollup, buildTestDelta, summarizeMistakeBatch } = require("./analyticsRollup");
const { analyzeAttemptTiming } = require("./timingAnalysis.js");

/**
 * Cloud Function to securely grade test answers on the backend, 
 * save the results and mistake sessions, and update user statistics.
 */
async function submitTestAnswers(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tilmagan.');
    }

    const userId = context.auth.uid;
    const { testId, testMode, userAnswers, timeSpent, violationType, partNumber = null, answerTimes = null } = data;

    if (!testId || typeof testId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Test identifikatori kiritilishi shart.');
    }

    const cleanUserAnswers = userAnswers || {};
    const cleanTestMode = testMode || 'practice';
    const cleanTimeSpent = timeSpent || 0;
    const cleanViolationType = violationType || null;
    // Savol → javob berilgan soniya. Klientdan keladi va faqat vaqt tahlilida
    // ishlatiladi — ballga ta'sir qilmaydi, shuning uchun ishonchsizligi xavfsiz.
    const cleanAnswerTimes = (answerTimes && typeof answerTimes === 'object') ? answerTimes : {};
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
        const { correctCount, totalQ, band, mistakes, missingKeys, typeStats, questionOrder } = evaluateTest(testData, cleanUserAnswers, parsedPartNumber);

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

        // Yaqin marra xatolari soni natija hujjatida saqlanadi: qayta urinishda
        // jamlanmaga FARQNI qo'shish uchun oldingi urinishning shu soni kerak
        // (xuddi `typeStats` kabi). Bu son "xatolarni tuzatsangiz band qancha
        // ko'tariladi" hisobining asosi.
        //
        // ⚠️ Bu hisob topshiriqni YIQITMASLIGI shart. Ilgari u himoyasiz turardi
        // va `analyticsRollup` dan eksport tushib qolganida ("summarizeMistakeBatch
        // is not a function") butun topshirish 500 bilan qulab, o'quvchi Finish
        // bosgach natija o'rniga testga qaytib qolardi. Natijaning o'zi bu sonsiz
        // ham to'g'ri saqlanadi.
        let mistakeStats = null;
        try {
            mistakeStats = summarizeMistakeBatch(mistakes);
        } catch (statErr) {
            functions.logger.error("[submitTestAnswers] mistakeStats hisoblanmadi:", statErr);
        }

        // Vaqt manzarasi: javoblar test davomiyligi bo'ylab qanday taqsimlangan,
        // oxirida shoshilganmi, javobsizlar oxirida to'planganmi. Yuqoridagi bilan
        // bir xil sabab bo'yicha himoyalangan — analitika hech qachon topshirishni
        // qulatmasligi kerak. Ma'lumot yetarli bo'lmasa `null` qaytadi.
        let timing = null;
        try {
            // Javob yozilib, keyin O'CHIRILGAN savol vaqt yozuvida qolib ketadi.
            // Uni "javoblangan" deb hisoblasak, "javobsizlar oxirida to'plangan"
            // signali ball hisobidagi bo'shliqlar bilan mos kelmasdi.
            const answeredTimes = {};
            Object.entries(cleanAnswerTimes).forEach(([id, seconds]) => {
                if (String(cleanUserAnswers[id] ?? '').trim() !== '') answeredTimes[id] = seconds;
            });

            timing = analyzeAttemptTiming({
                answerTimes: answeredTimes,
                questionOrder,
                timeSpent: cleanTimeSpent
            });
        } catch (timingErr) {
            functions.logger.error("[submitTestAnswers] vaqt tahlili hisoblanmadi:", timingErr);
        }

        // Rollup uchun kerak bo'ladigan "oldingi holat". Tranzaksiya ichida
        // o'qiladi, chunki hujjat baribir o'sha yerda o'qilyapti — alohida
        // `get()` qo'shimcha o'qish bo'lardi.
        let previousTypeStats = null;
        let previousPartBreakdown = null;
        let previousMistakeStats = null;
        let isFirstAttempt = true;

        await db.runTransaction(async (transaction) => {
            const resultSnap = await transaction.get(resultRef);
            let bestScore = correctCount;
            let bestBandScore = band || 0;

            // Tranzaksiya qayta urinishi mumkin — qiymatlar har safar qaytadan o'rnatiladi.
            previousTypeStats = null;
            previousPartBreakdown = null;
            previousMistakeStats = null;
            isFirstAttempt = !resultSnap.exists;

            if (resultSnap.exists) {
                const existingData = resultSnap.data();
                previousTypeStats = existingData.typeStats || null;
                previousPartBreakdown = existingData.partBreakdown || null;
                previousMistakeStats = existingData.mistakeStats || null;
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

                // Passage/section kesimi. Ilgari faqat javobda qaytardi va
                // natija ekrani yopilishi bilan yo'qolardi — analitikada
                // "qaysi bo'limda qiynalyapman" savoli javobsiz qolardi.
                partBreakdown: partBreakdown,

                // Oxirgi urinishdagi tasniflangan va "yaqin marra" xatolar soni.
                mistakeStats: mistakeStats,

                // Oxirgi urinishning vaqt manzarasi (natija ekranida ham asqotadi).
                timing: timing,

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
                // Ko'nikma ochiq yoziladi: ilgari uni faqat `testId` orqali natija
                // hujjatiga ulanib aniqlash mumkin edi.
                skill: testType,
                // Natija hujjatining ID si — xatolar jurnalidan `/review/:id` ga
                // o'tish uchun. Uni `testId` dan tiklab bo'lmaydi: alohida part
                // topshirilganda ID ga `_part_N` qo'shiladi.
                resultId: resultDocId,
                date: now,
                testId: testId,
                testTitle: testData.title || 'Untitled Test'
            });
        }

        // 7. Analitika jamlanmasi. `/analytics` sahifasi shu bitta hujjatni o'qiydi.
        //
        //    BUTUN BLOK himoyalangan: `applyRollup` faqat O'Z tranzaksiyasidagi
        //    xatoni yutadi, undan oldingi `buildTestDelta` (va modul importi) esa
        //    yutmaydi. Bu yerdagi har qanday nosozlik o'quvchining allaqachon
        //    saqlangan natijasini ko'rsatishga to'sqinlik qilmasligi kerak —
        //    jamlanma keyingi topshiriqda yoki `rebuildSummary` da tiklanadi.
        if (testType === 'reading' || testType === 'listening') {
            try {
                // Alohida part topshirilganda `partBreakdown` bitta elementli bo'ladi va
                // u 0-indeksda turadi. Jamlanmada indeks — bo'lim raqami, shuning uchun
                // yozuv o'z o'rniga suriladi: Part 3 natijasi Part 1 ustiga tushmasin.
                let rollupParts = partBreakdown;
                if (parsedPartNumber) {
                    rollupParts = new Array(parsedPartNumber).fill(null);
                    rollupParts[parsedPartNumber - 1] = partBreakdown[0] || null;
                }

                await applyRollup(db, userId, buildTestDelta({
                    skill: testType,
                    typeStats,
                    prevTypeStats: previousTypeStats,
                    mistakes,
                    partBreakdown: rollupParts,
                    prevPartBreakdown: previousPartBreakdown,
                    prevMistakeStats: previousMistakeStats,
                    band: band || 0,
                    timeSpent: cleanTimeSpent,
                    timing,
                    date: new Date(now),
                    isFirstAttempt,
                    sourceId: currentAttempt.attemptId
                }));
            } catch (rollupErr) {
                functions.logger.error("[submitTestAnswers] analitika jamlanmasi yangilanmadi:", rollupErr);
            }
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
