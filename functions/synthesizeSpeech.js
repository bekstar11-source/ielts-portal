// functions/synthesizeSpeech.js
// Feedback matnini Microsoft Edge "Read Aloud" neural ovozlari bilan o'qiydi.
//
// NEGA SERVERDA?
// Ilgari bu klientda edi (@kingdanx/edge-tts-browser). Brauzerdan bu xizmatga
// WebSocket ulanishi o'tmaydi — handshake yiqiladi va kod jimgina brauzerning
// eski `speechSynthesis` ovoziga tushib ketardi. Ya'ni qaysi neural ovoz
// tanlangani umuman ahamiyatsiz edi: o'quvchi har doim eski robot ovozni
// eshitardi. Serverdan esa xuddi shu so'rov muammosiz ishlaydi.
//
// DIQQAT: bu endpoint SSML ning faqat eng sodda ko'rinishini qabul qiladi —
// bitta <voice> ichida bitta <prosody>, ichida esa SOF MATN. <break>,
// <emphasis>, <s>, <say-as>, <lang>, mstts teglari "SSML is invalid" bilan
// rad etiladi (tekshirilgan). Shuning uchun tanaffuslar faqat tinish
// belgilari va `rate` orqali beriladi.

const crypto = require("crypto");
const functions = require("firebase-functions");
const WebSocket = require("ws");

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

// Microsoft bu versiyani "yetarlicha yangimi" deb tekshiradi. Eski qiymat
// (masalan 130) 403 beradi — ulanish 403 bilan yiqila boshlasa, birinchi
// navbatda shu raqamni ko'taring.
const CHROMIUM_VERSION = "145.0.3800.10";
const WIN_EPOCH = 11644473600;

const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const MIME_TYPE = "audio/mpeg";
const SOCKET_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 2000;

/**
 * Rejim x til bo'yicha ovoz.
 *
 * Inglizcha ovozlar — 2024-yilgi "Multilingual" avlod (Ava/Andrew): eski
 * Aria/Guy ga qaraganda sezilarli tabiiy, nafas olishi va jonli intonatsiyasi
 * bor. O'zbek tilida Edge'da faqat ikkita ovoz mavjud (Madina, Sardor),
 * shuning uchun examiner va coach bitta ovozni bo'lishadi — ularni prosodiya
 * ajratadi: examiner sekinroq va pastroq, coach tezroq va yorqinroq.
 *
 * Ohangni faqat `rate` va `pitch` beradi — bu endpoint uslub teglarini
 * (mstts:express-as) qabul qilmaydi. Qolgan ish promptda: matnning o'zi
 * quvnoq, jiddiy yoki samimiy yozilishi kerak.
 */
const VOICES = {
    // Quvnoq va jo'shqin: tez sur'at, ko'tarilgan ton.
    friend: {
        en: { voice: "en-US-AvaMultilingualNeural", rate: "+10%", pitch: "+8Hz" },
        uz: { voice: "uz-UZ-MadinaNeural", rate: "+8%", pitch: "+8Hz" },
    },
    // Jiddiy: sekin, past, hissiyotsiz — imtihon xulosasi ohangi.
    examiner: {
        en: { voice: "en-GB-RyanNeural", rate: "-12%", pitch: "-6Hz" },
        uz: { voice: "uz-UZ-SardorNeural", rate: "-14%", pitch: "-8Hz" },
    },
    // Samimiy va tezkor: jonli sur'at, lekin ton deyarli neytral —
    // ko'tarilgan ton samimiylikni emas, hayajonni beradi.
    coach: {
        en: { voice: "en-US-AndrewMultilingualNeural", rate: "+9%", pitch: "+1Hz" },
        uz: { voice: "uz-UZ-SardorNeural", rate: "+10%", pitch: "+2Hz" },
    },
};

const DEFAULT_MODE = "friend";
const DEFAULT_LANG = "uz";

/** Vaqtga bog'liq token — har 5 daqiqada yangilanadi. */
function generateSecMsGec() {
    let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH;
    ticks -= ticks % 300;
    ticks *= 1e7;
    return crypto
        .createHash("sha256")
        .update(`${Math.floor(ticks)}${TRUSTED_CLIENT_TOKEN}`)
        .digest("hex")
        .toUpperCase();
}

function buildSocketUrl() {
    const params = new URLSearchParams({
        TrustedClientToken: TRUSTED_CLIENT_TOKEN,
        "Sec-MS-GEC": generateSecMsGec(),
        "Sec-MS-GEC-Version": `1-${CHROMIUM_VERSION}`,
        ConnectionId: crypto.randomUUID().replace(/-/g, "").toUpperCase(),
    });
    return `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?${params}`;
}

/** Matn <prosody> ichiga xom joylashadi — bitta `&` butun so'rovni buzadi. */
function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Bitta matnni sintez qiladi.
 * @returns {Promise<Buffer>} mp3
 */
function synthesize(text, config) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(buildSocketUrl(), {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
                Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
            },
        });

        const chunks = [];
        let settled = false;

        const finish = (error, buffer) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                socket.close();
            } catch (e) {
                socket.terminate();
            }
            if (error) reject(error);
            else resolve(buffer);
        };

        const timer = setTimeout(() => {
            socket.terminate();
            finish(new Error("Ovoz xizmati javob bermadi"));
        }, SOCKET_TIMEOUT_MS);

        socket.on("open", () => {
            socket.send(
                `X-Timestamp:${new Date()}\r\n` +
                "Content-Type:application/json; charset=utf-8\r\n" +
                "Path:speech.config\r\n\r\n" +
                `{"context":{"synthesis":{"audio":{"metadataoptions":` +
                `{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},` +
                `"outputFormat":"${OUTPUT_FORMAT}"}}}}\r\n`
            );
            socket.send(
                `X-RequestId:${crypto.randomUUID().replace(/-/g, "")}\r\n` +
                "Content-Type:application/ssml+xml\r\n" +
                `X-Timestamp:${new Date()}Z\r\n` +
                "Path:ssml\r\n\r\n" +
                "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' " +
                "xml:lang='en-US'>" +
                `<voice name='${config.voice}'>` +
                `<prosody pitch='${config.pitch}' rate='${config.rate}' volume='+0%'>` +
                `${escapeXml(text)}</prosody></voice></speak>`
            );
        });

        socket.on("message", (data, isBinary) => {
            if (isBinary) {
                // Har bir binar xabar: 2 baytlik uzunlik + sarlavha + audio.
                const buffer = Buffer.from(data);
                if (buffer.length < 2) return;
                const headerLength = ((buffer[0] << 8) | buffer[1]) + 2;
                chunks.push(buffer.subarray(headerLength));
            } else if (data.toString().includes("Path:turn.end")) {
                finish(null, Buffer.concat(chunks));
            }
        });

        socket.on("error", (error) => finish(error));
        socket.on("close", (code, reason) => {
            if (chunks.length > 0) {
                finish(null, Buffer.concat(chunks));
                return;
            }
            finish(new Error(`Ovoz sintezi uzildi (${code} ${reason || ""})`.trim()));
        });
    });
}

/**
 * @param {{ text: string, mode?: string, lang?: 'uz'|'en' }} data
 * @returns {Promise<{ audioBase64: string, mimeType: string }>}
 */
async function synthesizeSpeech(data, context) {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Avtorizatsiyadan o'tish kerak."
        );
    }

    const text = String(data?.text || "").trim();
    if (!text) {
        throw new functions.https.HttpsError("invalid-argument", "Matn bo'sh.");
    }
    if (text.length > MAX_TEXT_LENGTH) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            `Matn juda uzun (${MAX_TEXT_LENGTH} belgidan oshmasin).`
        );
    }

    const byLang = VOICES[data?.mode] || VOICES[DEFAULT_MODE];
    const config = byLang[data?.lang] || byLang[DEFAULT_LANG];

    let audio;
    try {
        audio = await synthesize(text, config);
    } catch (error) {
        console.error("Edge TTS error:", error.message);
        throw new functions.https.HttpsError("unavailable", "Ovozni sintez qilib bo'lmadi.");
    }

    if (!audio || audio.length === 0) {
        throw new functions.https.HttpsError("unavailable", "Ovoz xizmati bo'sh audio qaytardi.");
    }

    return { audioBase64: audio.toString("base64"), mimeType: MIME_TYPE };
}

module.exports = { synthesizeSpeech, VOICES };
