// functions/evaluateSpeaking.js
// IELTS Speaking javobini Gemini bilan AUDIO-NATIVE baholaydi:
// audio to'g'ridan-to'g'ri modelga boradi, transkript oralig'ida yo'qolmaydi.
// Shu sabab pronunciation va fluency haqiqiy tovushdan baholanadi.
//
// Eski functions/analyzeSpeaking.js (Whisper + GPT) podcast xulosasi uchun
// qolaveradi — bu yangi Speaking moduli uchun alohida funksiya.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

const {
    CRITERIA,
    RESPONSE_SCHEMA,
    resolveMode,
    buildPrompt,
    normalizeEvaluation,
} = require("./speakingRubric");
const { generateJson } = require("./speakingModel");
const { reserveSpeakingSlot, releaseSpeakingSlot } = require("./speakingQuota");
const { fetchSpeakingHistory } = require("./speakingHistory");
const { applyRollup, buildSpeakingDelta } = require("./analyticsRollup");

// Gemini qabul qiladigan audio formatlar. DIQQAT: audio/webm bu ro'yxatda YO'Q,
// shuning uchun klient yozuvni WAV ga o'giradi (src/utils/audioWav.js).
const SUPPORTED_MIME = new Set([
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
]);

// Inline audio uchun so'rov limiti 20MB. Base64 hajmni ~1.37x oshiradi,
// shuning uchun xom audioni 12MB da cheklaymiz (16kHz mono WAV da ~6 daqiqa).
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

/**
 * Audioni Storage dan Admin SDK orqali oladi.
 *
 * Ilgari klient `audioUrl` (tokenli download URL) yuborardi. Bunday URL
 * Storage qoidalarini butunlay chetlab o'tadi va Firestore da saqlanib,
 * keyinchalik havolani qo'lga kiritgan har kimga o'quvchining ovozini
 * ochib qo'yardi. Endi klient faqat YO'L yuboradi.
 */
async function readAudio({ audioPath, audioUrl, uid }) {
    if (audioPath) {
        // Faqat o'z papkasidan — boshqa o'quvchining yozuvini so'rab bo'lmaydi.
        if (!audioPath.startsWith(`speaking/${uid}/`)) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Audio yo'li noto'g'ri."
            );
        }
        const file = admin.storage().bucket().file(audioPath);
        const [meta] = await file.getMetadata();
        if (Number(meta.size) > MAX_AUDIO_BYTES) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Audio juda uzun. Javobni qisqartiring."
            );
        }
        const [buffer] = await file.download();
        return buffer;
    }

    // Eski klientlar uchun (deploy oralig'ida ochiq qolgan sahifalar).
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.buffer();
}

/**
 * @param {object} data - { audioPath, mimeType, question, part, sessionId, questionId, cueCard, topic }
 */
async function evaluateSpeaking(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Avtorizatsiyadan o'tish kerak."
        );
    }

    const {
        audioPath,
        audioUrl,
        mimeType = "audio/wav",
        question,
        part = 1,
        cueCard,
        sessionId,
        questionId,
        feedbackLang,
        feedbackMode,
        topicId,
        topicTitle,
        questionCount,
        durationSec,
    } = data || {};

    // Noma'lum til kelsa o'zbekchaga tushamiz — interfeys sukut bo'yicha o'zbekcha.
    const lang = feedbackLang === "en" ? "en" : "uz";
    // O'quvchi mikrofonni bosishdan oldin tanlagan ohang. Faqat shu ohang
    // yoziladi — qolganlari `speakingFeedbackTone` orqali keyin qo'shiladi.
    const mode = resolveMode(feedbackMode);
    const uid = context.auth.uid;
    const db = admin.firestore();

    if ((!audioPath && !audioUrl) || !question) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "audioPath va question talab qilinadi."
        );
    }
    if (!SUPPORTED_MIME.has(mimeType)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            `'${mimeType}' formatini model qabul qilmaydi. WAV formatida yuboring.`
        );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "GEMINI_API_KEY sozlanmagan."
        );
    }

    // Bosqichlar davomiyligi logga tushadi — sekinlashuv qaytsa, taxmin
    // qilmasdan qaysi bosqich ekanini ko'rish uchun.
    const startedAt = Date.now();
    const timings = {};
    const mark = (stage, from) => {
        timings[stage] = Date.now() - from;
    };

    // Audio yuklab olish limit tekshiruvi bilan parallel ketadi: ikkalasi
    // bir-biriga bog'liq emas, ketma-ket bo'lganda esa o'quvchi ikkita
    // aylanishni bekorga kutardi. Limit tugagan bo'lsa faqat trafik ketadi.
    const audioAt = Date.now();
    const audioPromise = readAudio({ audioPath, audioUrl, uid }).then(
        (buffer) => ({ buffer }),
        (error) => ({ error })
    );

    // 0. Kunlik limit — AI chaqiruvidan OLDIN band qilinadi.
    //
    // Oldingi urinishlar tarixi shu yerda, foydalanuvchi hujjati bilan BIRGA
    // o'qiladi: promptga tushishi kerak, lekin uning uchun alohida aylanish
    // kutib turishga arzimaydi. Tarix bo'lmasa feedback shunchaki
    // shaxsiylashtirilmagan chiqadi — javobni yiqitmaydi.
    const [userSnap, history] = await Promise.all([
        db.collection("users").doc(uid).get(),
        fetchSpeakingHistory(db, uid).catch((error) => {
            console.error("Speaking history error:", error.message);
            return null;
        }),
    ]);
    const userData = userSnap.exists ? userSnap.data() : {};
    const studentName = userData.name || userData.displayName || null;
    // Baholash paytidagi holat. Ohang almashtirilganda AYNAN shu qayta
    // ishlatiladi — o'sha payt tarixni qayta o'qib bo'lmaydi, chunki shu
    // javobning xatolari omborga allaqachon tushgan bo'ladi.
    const personalization = { studentName, history };
    mark("user", startedAt);

    let quota;
    try {
        quota = await reserveSpeakingSlot(db, uid, userData);
    } catch (error) {
        if (error.code === "quota-exceeded") {
            throw new functions.https.HttpsError(
                "resource-exhausted",
                `Bugungi limit tugadi — kuniga ${error.limit} ta javob. Ertaga yana ochiladi.`,
                { limit: error.limit, used: error.used }
            );
        }
        throw error;
    }

    // Shu nuqtadan keyingi har qanday xatoda o'rinni qaytaramiz.
    try {
        // 1. Audioni olamiz
        let audioBase64;
        try {
            const { buffer, error: readError } = await audioPromise;
            if (readError) throw readError;
            if (buffer.length === 0) {
                throw new functions.https.HttpsError("invalid-argument", "Audio fayl bo'sh.");
            }
            if (buffer.length > MAX_AUDIO_BYTES) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Audio juda uzun. Javobni qisqartiring."
                );
            }
            audioBase64 = buffer.toString("base64");
        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error("Speaking audio fetch error:", error);
            throw new functions.https.HttpsError("internal", "Audio yuklab olinmadi.");
        }

        mark("audio", audioAt);

        // 2. Gemini — audio + savol → JSON baholash.
        // Feedback faqat BITTA ohangda yoziladi: qolgan ikkitasi o'quvchi
        // ularga o'tgandagina, audiosiz va tezroq qo'shiladi.
        const modelAt = Date.now();
        let evaluation;
        try {
            const raw = await generateJson({
                apiKey,
                parts: [
                    {
                        text: buildPrompt({
                            question,
                            part,
                            cueCard,
                            feedbackLang: lang,
                            mode,
                            studentName,
                            history,
                        }),
                    },
                    { inlineData: { mimeType, data: audioBase64 } },
                ],
                schema: RESPONSE_SCHEMA,
                // 0.2 da matn qoliplashib qolardi — feedback har safar bir xil
                // jumla bilan boshlanib, ovozda takrorga o'xshab eshitilardi.
                // 0.4 og'zaki nutqqa jon kiritadi, ballarni esa hali ham
                // barqaror ushlab turadi.
                temperature: 0.4,
            });
            evaluation = normalizeEvaluation(raw, mode);
        } catch (error) {
            throw new functions.https.HttpsError("internal", error.message);
        }
        mark("model", modelAt);

        // 3. Saqlash — javob + sessiyaning umumiy holati.
        // Ikkala yozuv bir-biriga bog'liq emas, shuning uchun parallel ketadi:
        // ketma-ket bo'lganda o'quvchi ikkita Firestore aylanishini kutardi.
        const saveAt = Date.now();
        const writes = [];

        if (sessionId && questionId) {
            writes.push(
                saveAnswer(db, {
                    uid,
                    sessionId,
                    questionId,
                    evaluation,
                    question,
                    part,
                    lang,
                    audioPath: audioPath || null,
                    durationSec: Number(durationSec) || null,
                    topicId: topicId || null,
                    topicTitle: topicTitle || null,
                    questionCount: Number(questionCount) || null,
                    studentName,
                    groupId: userData.groupId || null,
                    personalization,
                }).catch((error) => {
                    // Saqlash muvaffaqiyatsiz bo'lsa ham natijani qaytaramiz —
                    // o'quvchi feedbackni yo'qotmasligi kerak.
                    console.error("Speaking answer save error:", error);
                })
            );
        }

        // Xatolar umumiy "mistakeSessions" omboriga ham tushadi: reading va
        // listening xatolari o'sha yerda, speaking xatolari esa faqat javob
        // ichida qolib ketardi va takrorlanayotganini hech kim ko'rmasdi.
        if (evaluation.corrections.length > 0) {
            writes.push(
                saveSpeakingMistakes(db, uid, { evaluation, question, part, sessionId }).catch(
                    (error) => {
                        console.error("Speaking mistakes save error:", error);
                    }
                )
            );
        }

        // Analitika jamlanmasi: `/analytics` Speaking bandlarini va takrorlanuvchi
        // tuzatishlarni shu yerdan oladi. Xatolik yuzaga kelsa ham javob qaytadi —
        // o'quvchi feedbackni yo'qotmasligi kerak.
        writes.push(
            applyRollup(db, uid, buildSpeakingDelta({
                bands: evaluation.bands,
                corrections: evaluation.corrections,
                sourceId: `${sessionId || "speaking"}_${part}_${startedAt}`
            }))
        );

        await Promise.all(writes);
        mark("save", saveAt);

        console.log("evaluateSpeaking timings:", JSON.stringify({
            ...timings,
            total: Date.now() - startedAt,
        }));

        return { success: true, evaluation, quota };
    } catch (error) {
        // Baholanmagan urinish limitdan yeyilmasin.
        await releaseSpeakingSlot(db, uid, quota.day);
        throw error;
    }
}

/**
 * Javobni yozadi va sessiyaning yig'ma ko'rsatkichlarini yangilaydi.
 *
 * Parent hujjat ATAYLAB yoziladi: ilgari faqat `answers` subkolleksiyasi
 * to'ldirilardi, ya'ni `speakingSessions` da hujjat umuman mavjud bo'lmasdi
 * va `where('uid', ...)` bo'yicha tarixni chiqarib bo'lmasdi.
 *
 * Bitta tranzaksiya: bir savolga qayta javob berilsa, eski ballar
 * yig'indidan ayriladi — aks holda o'rtacha ikki marta hisoblanardi.
 */
async function saveAnswer(db, ctx) {
    const sessionRef = db.collection("speakingSessions").doc(ctx.sessionId);
    const answerRef = sessionRef.collection("answers").doc(String(ctx.questionId));
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.runTransaction(async (tx) => {
        const [sessionSnap, answerSnap] = await Promise.all([
            tx.get(sessionRef),
            tx.get(answerRef),
        ]);

        const session = sessionSnap.exists ? sessionSnap.data() : null;

        // Boshqa foydalanuvchining sessiyasiga yozib bo'lmaydi.
        if (session && session.uid && session.uid !== ctx.uid) {
            throw new functions.https.HttpsError("permission-denied", "Sessiya begona.");
        }

        const sums = { ...(session?.bandSums || {}) };
        let answered = Number(session?.answeredCount) || 0;

        if (answerSnap.exists) {
            const old = answerSnap.data().bands || {};
            for (const key of CRITERIA) {
                sums[key] = (Number(sums[key]) || 0) - (Number(old[key]) || 0);
            }
        } else {
            answered += 1;
        }

        for (const key of CRITERIA) {
            sums[key] = (Number(sums[key]) || 0) + (Number(ctx.evaluation.bands[key]) || 0);
        }

        const averages = {};
        for (const key of CRITERIA) {
            averages[key] = answered > 0 ? Math.round((sums[key] / answered) * 2) / 2 : 0;
        }
        const overall = answered > 0
            ? Math.round(
                (CRITERIA.reduce((sum, key) => sum + sums[key], 0) / (answered * CRITERIA.length)) * 2
            ) / 2
            : 0;

        // Feedback xaritasi `merge` bilan yoziladi, ya'ni eski kalitlar
        // o'zicha qolib ketardi: o'quvchi savolga QAYTA javob bersa, avvalgi
        // urinishda ochilgan ohang matni yangi javobga yopishib, boshqa ball
        // haqida gapirib turardi. Endi ular ochiq-oydin o'chiriladi.
        const feedbackPatch = { ...ctx.evaluation.feedback };
        if (answerSnap.exists) {
            for (const key of Object.keys(answerSnap.data().feedback || {})) {
                if (!(key in feedbackPatch)) {
                    feedbackPatch[key] = admin.firestore.FieldValue.delete();
                }
            }
        }

        tx.set(
            answerRef,
            {
                ...ctx.evaluation,
                feedback: feedbackPatch,
                uid: ctx.uid,
                sessionId: ctx.sessionId,
                questionId: ctx.questionId,
                question: ctx.question,
                part: ctx.part,
                feedbackLang: ctx.lang,
                audioPath: ctx.audioPath,
                durationSec: ctx.durationSec,
                // Ohang almashtirilganda `speakingFeedbackTone` shu yerdan
                // o'qiydi — batafsil izoh speakingRubric.js:buildTonePrompt da.
                personalization: ctx.personalization || null,
                createdAt: answerSnap.exists ? answerSnap.data().createdAt || now : now,
                updatedAt: now,
            },
            { merge: true }
        );

        tx.set(
            sessionRef,
            {
                uid: ctx.uid,
                studentName: ctx.studentName,
                groupId: ctx.groupId,
                topicId: ctx.topicId,
                topicTitle: ctx.topicTitle,
                part: ctx.part,
                questionCount: ctx.questionCount,
                answeredCount: answered,
                bandSums: sums,
                bands: averages,
                overallBand: overall,
                feedbackLang: ctx.lang,
                createdAt: session?.createdAt || now,
                updatedAt: now,
                // O'qituvchi tekshiruvi — alohida callable orqali boshqariladi.
                teacherReview: session?.teacherReview || { status: "none" },
            },
            { merge: true }
        );
    });
}

/**
 * Speaking tuzatishlarini `users/{uid}/mistakeSessions` ga yozadi.
 *
 * Shakl reading/listening yozuvlariga qasddan yaqin (`mistakes` massivi +
 * `date`), lekin `skill: "speaking"` bilan belgilanadi — shu bitta ombordan
 * "qaysi xato takrorlanyapti" degan savolga barcha ko'nikmalar bo'yicha
 * javob berish mumkin bo'lsin.
 */
async function saveSpeakingMistakes(db, uid, { evaluation, question, part, sessionId }) {
    const mistakes = evaluation.corrections.map((item) => ({
        question,
        userAnswer: String(item.said || "").slice(0, 300),
        correctAnswer: String(item.better || "").slice(0, 300),
        explanation: String(item.why || "").slice(0, 500),
    }));

    await db
        .collection("users")
        .doc(uid)
        .collection("mistakeSessions")
        .doc()
        .set({
            skill: "speaking",
            part,
            sessionId: sessionId || null,
            mistakes,
            bands: evaluation.bands,
            date: admin.firestore.FieldValue.serverTimestamp(),
            testTitle: `Speaking Part ${part}`,
        });
}

module.exports = { evaluateSpeaking };
