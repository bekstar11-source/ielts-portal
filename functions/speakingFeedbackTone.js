// functions/speakingFeedbackTone.js
// Tayyor baholashni BOSHQA ohangda qayta yozadi.
//
// NEGA ALOHIDA FUNKSIYA?
// Ilgari `evaluateSpeaking` uchala ohangni birdan yozardi. Kutish vaqtini
// esa chiqish tokenlari belgilaydi, ular ketma-ket yoziladi — o'quvchi
// hech qachon ochmaydigan ikkita matnni ham kutib o'tirardi. Endi baholash
// bitta ohang bilan qaytadi, qolganlari faqat so'ralganda yoziladi.
//
// Bu chaqiruvda AUDIO YO'Q: ballar allaqachon qo'yilgan, o'zgarayotgani
// faqat ovoz. Shu sabab u baholashdan bir necha barobar tez va arzon, va
// kunlik limitdan yemaydi — o'quvchi ohang almashtirgani uchun urinish
// yo'qotmasligi kerak.

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const {
    CRITERIA,
    FEEDBACK_MODES,
    TONE_SCHEMA,
    resolveMode,
    buildTonePrompt,
} = require("./speakingRubric");
const { generateJson, TONE_CANDIDATES, TONE_TIMEOUT_MS } = require("./speakingModel");

/**
 * Klient yuborgan baholashni ishonchli shaklga keltiradi.
 *
 * Sessiyasiz mashqda (`sessionId` yo'q) Firestore da hujjat bo'lmaydi,
 * shuning uchun kontekst klientdan keladi. Bu xavfsiz: o'quvchi faqat
 * O'ZIGA ko'rsatiladigan matnga ta'sir qila oladi, ballar bu yerda qayta
 * hisoblanmaydi va hech qayerga yozilmaydi.
 */
function sanitizeEvaluation(raw) {
    const bands = {};
    for (const key of [...CRITERIA, "overall"]) {
        const value = Number(raw?.bands?.[key]);
        bands[key] = Number.isFinite(value) ? value : 0;
    }

    const evidence = {};
    for (const key of CRITERIA) {
        evidence[key] = String(raw?.evidence?.[key] || "").slice(0, 400);
    }

    return {
        bands,
        evidence,
        transcript: String(raw?.transcript || "").slice(0, 4000),
        corrections: (Array.isArray(raw?.corrections) ? raw.corrections : [])
            .slice(0, 3)
            .map((item) => ({
                said: String(item?.said || "").slice(0, 300),
                better: String(item?.better || "").slice(0, 300),
            })),
    };
}

/**
 * @param {object} data - { mode, sessionId?, questionId?, question?, part?,
 *                          feedbackLang?, evaluation? }
 * @returns {Promise<{ mode: string, feedback: string, cached: boolean }>}
 */
async function speakingFeedbackTone(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Avtorizatsiyadan o'tish kerak."
        );
    }

    const {
        mode: rawMode,
        sessionId,
        questionId,
        question,
        part = 1,
        feedbackLang,
        evaluation: clientEvaluation,
    } = data || {};

    if (!FEEDBACK_MODES[rawMode]) {
        throw new functions.https.HttpsError("invalid-argument", "Ohang noto'g'ri.");
    }
    const mode = resolveMode(rawMode);
    const lang = feedbackLang === "en" ? "en" : "uz";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "GEMINI_API_KEY sozlanmagan."
        );
    }

    const uid = context.auth.uid;
    const db = admin.firestore();

    // Saqlangan javob bo'lsa — o'sha manba. Klient yuborganidan ustun turadi,
    // chunki matn ballar bilan zid chiqmasligi kerak.
    let answerRef = null;
    let stored = null;
    if (sessionId && questionId) {
        answerRef = db
            .collection("speakingSessions")
            .doc(String(sessionId))
            .collection("answers")
            .doc(String(questionId));
        const snap = await answerRef.get();
        if (snap.exists) {
            const answer = snap.data();
            if (answer.uid && answer.uid !== uid) {
                throw new functions.https.HttpsError("permission-denied", "Javob begona.");
            }
            // Bir marta yozilgan ohang qayta yozilmaydi — o'quvchi u yoqdan
            // bu yoqqa o'tib turganda har safar kutmasin.
            const existing = answer.feedback?.[mode];
            if (typeof existing === "string" && existing.trim()) {
                return { mode, feedback: existing.trim(), cached: true };
            }
            stored = answer;
        } else {
            // Hujjat yo'q — yozadigan joy ham yo'q.
            answerRef = null;
        }
    }

    const source = stored || clientEvaluation;
    if (!source) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Qayta yozish uchun baholash topilmadi."
        );
    }

    const startedAt = Date.now();
    let feedback;
    try {
        const raw = await generateJson({
            apiKey,
            parts: [
                {
                    text: buildTonePrompt({
                        mode,
                        feedbackLang: stored?.feedbackLang || lang,
                        question: stored?.question || question,
                        part: stored?.part || part,
                        evaluation: sanitizeEvaluation(source),
                    }),
                },
            ],
            schema: TONE_SCHEMA,
            temperature: 0.4,
            // Matnli so'rovda audio uchun eng tez model eng sekiniga aylanadi
            // — batafsil izoh speakingModel.js da.
            models: TONE_CANDIDATES,
            timeoutMs: TONE_TIMEOUT_MS,
        });
        feedback = String(raw?.feedback || "").trim();
    } catch (error) {
        console.error("Speaking tone error:", error.message);
        throw new functions.https.HttpsError("internal", error.message);
    }

    if (!feedback) {
        throw new functions.https.HttpsError("internal", "Ohang matni bo'sh qaytdi.");
    }

    console.log(
        `speakingFeedbackTone: mode=${mode} ${Date.now() - startedAt}ms`
    );

    // Yozib qo'yamiz, keyingi safar kutmasin. Muvaffaqiyatsiz bo'lsa ham
    // matnni qaytaramiz — o'quvchi uchun asosiysi shu.
    if (answerRef) {
        try {
            await answerRef.set({ feedback: { [mode]: feedback } }, { merge: true });
        } catch (error) {
            console.error("Speaking tone save error:", error);
        }
    }

    return { mode, feedback, cached: false };
}

module.exports = { speakingFeedbackTone };
