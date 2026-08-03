// functions/speakingModel.js
// Speaking moduli uchun Gemini chaqiruvi: model tanlash, "o'ylash" darajasi
// va JSON javobni olish. Baholash ham (`evaluateSpeaking`), ohangni qayta
// yozish ham (`speakingFeedbackTone`) shu yerdan o'tadi — model nomi yoki
// thinking sozlamasi bitta joyda o'zgarsin.

const fetch = require("node-fetch");

// Model ro'yxatlari VAZIFAGA QARAB boshqacha — bu taxmin emas, o'lchov.
// Bitta 26 soniyalik javobda, `thinkingLevel: "low"` bilan, 3 martadan:
//
//   audio baholash          3-flash-preview 4.6-5.4s (thoughts=0, barqaror)
//                           3.6-flash       9.9-10.4s
//                           3.5-flash       4.5-10.6s (bir marta 1627 thought
//                                           "sizib" chiqdi — ishonchsiz)
//
//   ohangni qayta yozish    3.6-flash       1.7-2.3s (thoughts=0)
//                           3-flash-preview 24-45s (!) — MATNLI so'rovda
//                                           thinkingLevel ni MENSIMAYDI va
//                                           5000-10000 thought tokeni yoqadi
//
// Ya'ni baholash uchun eng tez model ohang uchun eng yomoni. Ro'yxatlarni
// birlashtirmang: aynan shu narsa o'quvchini yarim daqiqa kutishga majbur
// qilardi.
//
// DIQQAT: ro'yxatga faqat ListModels da bor nomlarni qo'ying. Ilgari bosh
// qatorda "gemini-3-flash" turardi — bunday model umuman yo'q, har bir
// baholash bekorga 404 bilan boshlanardi. "gemini-2.5-flash" ham endi bu
// loyiha uchun 404 qaytaradi ("no longer available to new users").
const EVALUATION_MODELS = ["gemini-3-flash-preview", "gemini-3.6-flash", "gemini-flash-latest"];
const TONE_MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];

/** Sozlama bo'lsa u ustun turadi (vergul bilan ajratilgan ro'yxat). */
function fromEnv(name, fallback) {
    const list = (process.env[name] || "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
    return list.length > 0 ? list : fallback;
}

const MODEL_CANDIDATES = fromEnv("GEMINI_SPEAKING_MODEL", EVALUATION_MODELS);
const TONE_CANDIDATES = fromEnv("GEMINI_SPEAKING_TONE_MODEL", TONE_MODELS);

/**
 * Bitta chaqiruv uchun tom to'siq.
 *
 * `thinkingLevel` ni har doim ham hurmat qilishmaydi (yuqoriga qarang), va
 * o'sha holatda so'rov 45 soniyagacha cho'zilib ketadi. Bu to'siq shunday
 * modelni uzib, keyingisiga o'tkazadi — o'quvchi kutmaydi.
 */
const CALL_TIMEOUT_MS = 25000;
const TONE_TIMEOUT_MS = 12000;

/**
 * "O'ylash" byudjeti — javob kutish vaqtining eng katta bo'lagi shu edi.
 *
 * Gemini 3 sukut bo'yicha `thinkingLevel: "high"` bilan ishlaydi: model
 * javob yozishdan oldin ~2000 ta "thought" tokeni sarflardi va bitta
 * baholash 16 soniya davom etardi. "low" da o'sha audio 5.7 soniyada
 * baholandi, ballar esa yarim balldan ortiq farq qilmadi (o'lchangan) —
 * rubrika qat'iy va sxema majburiy, bu vazifa uzoq mulohaza talab qilmaydi.
 *
 * Maydon nomi model avlodiga bog'liq: 3 da `thinkingLevel`, 2.5 da
 * `thinkingBudget`. Noto'g'ri maydon 400 qaytaradi, shuning uchun model
 * nomidan kelib chiqib tanlaymiz.
 */
function thinkingConfigFor(model) {
    if (model.startsWith("gemini-3")) {
        // Gemini 3 Flash da o'ylashni butunlay o'chirib bo'lmaydi.
        return { thinkingLevel: "low" };
    }
    if (model.startsWith("gemini-2.5")) {
        return { thinkingBudget: 0 };
    }
    return null;
}

/**
 * Sxema bo'yicha JSON qaytaradigan bitta chaqiruv.
 *
 * @param {{ apiKey: string, parts: object[], schema: object,
 *           temperature?: number, models?: string[], timeoutMs?: number }} options
 * @returns {Promise<object>} tahlil qilingan JSON
 * @throws {Error} `code` maydoni bilan: "unavailable" | "blocked" | "bad-json"
 */
async function generateJson({
    apiKey,
    parts,
    schema,
    temperature = 0.4,
    models = MODEL_CANDIDATES,
    timeoutMs = CALL_TIMEOUT_MS,
}) {
    const contents = [{ role: "user", parts }];
    let payload = null;
    let lastError = "";

    for (const model of models) {
        const buildBody = (thinking) => ({
            contents,
            generationConfig: {
                temperature,
                responseMimeType: "application/json",
                responseSchema: schema,
                ...(thinking ? { thinkingConfig: thinking } : {}),
            },
        });
        const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const call = (thinking) => fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify(buildBody(thinking)),
            timeout: timeoutMs,
        });

        let response;
        try {
            response = await call(thinkingConfigFor(model));
        } catch (error) {
            // node-fetch to'siqni "request-timeout" turi bilan uzadi.
            const timedOut = error.type === "request-timeout";
            if (timedOut) console.warn(`Gemini ${model}: ${timeoutMs}ms ichida javob bermadi.`);
            lastError = `${model}: ${timedOut ? "kutish vaqti tugadi" : error.message}`;
            continue;
        }

        if (response.status === 404) {
            // Model nomi mavjud emas — keyingisini sinaymiz.
            lastError = `${model}: model topilmadi`;
            continue;
        }

        if (!response.ok) {
            const detail = await response.text();
            console.error(`Gemini ${model} error ${response.status}:`, detail.slice(0, 500));
            lastError = `${model}: HTTP ${response.status}`;

            // thinkingConfig maydonlari model avlodlari orasida o'zgarib
            // turadi. Aynan shu sozlama rad etilsa, ishni butunlay
            // yiqitmaymiz — sekinroq, lekin sozlamasiz qayta urinamiz.
            if (response.status === 400 && /thinking/i.test(detail)) {
                try {
                    response = await call(null);
                } catch (error) {
                    lastError = `${model}: ${error.message}`;
                    continue;
                }
                if (response.ok) {
                    console.warn(`Gemini ${model}: thinkingConfig qabul qilinmadi.`);
                    payload = await response.json();
                    break;
                }
            }

            // 4xx — so'rovning o'zida muammo, boshqa model ham yordam bermaydi.
            if (response.status >= 400 && response.status < 500) break;
            continue;
        }

        payload = await response.json();
        break;
    }

    if (!payload) {
        const error = new Error(`Baholash xizmatiga ulanib bo'lmadi (${lastError}).`);
        error.code = "unavailable";
        throw error;
    }

    const candidate = payload.candidates?.[0];
    if (!candidate) {
        // Kontent filtri yoki bo'sh javob
        const reason = payload.promptFeedback?.blockReason || "noma'lum sabab";
        const error = new Error(`Model javob qaytarmadi (${reason}).`);
        error.code = "blocked";
        throw error;
    }

    const text = (candidate.content?.parts || []).map((part) => part.text || "").join("");
    try {
        return JSON.parse(text);
    } catch (parseError) {
        console.error("Gemini JSON parse error:", parseError.message, text.slice(0, 500));
        const error = new Error("Natija noto'g'ri formatda qaytdi. Qaytadan urinib ko'ring.");
        error.code = "bad-json";
        throw error;
    }
}

module.exports = {
    MODEL_CANDIDATES,
    TONE_CANDIDATES,
    TONE_TIMEOUT_MS,
    thinkingConfigFor,
    generateJson,
};
