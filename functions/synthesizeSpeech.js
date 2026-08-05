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

// Ko'p ovozli o'qish uchun chegara. Har bir bo'lak alohida WebSocket so'rovi
// (ular parallel ketadi, ya'ni kutish vaqti oshmaydi), lekin har bir bo'g'inda
// qisqa sukunat qoladi. To'qqizta — uch-to'rt jumlalik feedback ichidagi
// iqtiboslarga yetadi; undan ko'pi matn shu qadar tez til almashtiryaptiki,
// uzuq-yuluq eshitiladi, shuning uchun bitta ovozga qaytamiz.
//
// Bu son quloq bilan sozlanadi: bo'g'inlar sezilib qolsa pasaytiring.
const MAX_SEGMENTS = 9;

/**
 * Matnni ovoz dvigateli kutgan ko'rinishga keltiradi.
 *
 * Model apostrofni uch xil belgi bilan qaytaradi (', ', ʻ), va uz-UZ ovozlari
 * faqat ASCII ni "o'" deb o'qiydi — qolganida "o" bo'lib ketadi, ya'ni "so'z"
 * "soz" ga aylanadi. Tire esa promptda taqiqlangan bo'lsa ham vaqti-vaqti
 * bilan chiqib qoladi va ovozda qoqilishga o'xshaydi.
 */
function normalizeForSpeech(text) {
    return text
        .replace(/[‘’ʻʼ´`]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\s*[—–]\s*/g, ", ")
        .replace(/,\s*,+/g, ",")
        .replace(/\s+/g, " ")
        .trim();
}

// Ovoz almashtiriladigan inglizcha bo'laklar: qo'shtirnoq ichidagi iqtibos
// (prompt o'quvchining o'z so'zlarini aynan shunday keltiradi) va IELTS.
const QUOTED = /"([^"]{1,120})"/g;
const ENGLISH_TERM = /\bIELTS\b/g;

/**
 * Qo'shtirnoq ichidagi matn inglizchami?
 *
 * Ataylab QATTIQ tekshiruv. Xato ijobiy javob o'zbekcha so'zni inglizcha ovoz
 * bilan o'qitadi, va bu hozirgi holatdan ko'ra yomonroq eshitiladi. Shuning
 * uchun o'zbekchaning eng aniq belgisi — o' va g' — uchrasa, tegmaymiz.
 */
function looksEnglish(text) {
    if (!/[A-Za-z]/.test(text)) return false;
    if (/[oOgG]'/.test(text)) return false;
    return /^[A-Za-z0-9 ,.'!?%-]+$/.test(text);
}

/**
 * Matnni til bo'yicha bo'laklarga ajratadi.
 * @returns {Array<{ text: string, english: boolean }>}
 */
function splitByLanguage(text) {
    const spans = [];

    for (const match of text.matchAll(QUOTED)) {
        // Qo'shtirnoqning o'zi tashlanadi: iqtibos ekanini endi ovoz almashuvi
        // bildiradi, ovoz esa tirnoq belgisini baribir o'qimaydi.
        if (looksEnglish(match[1])) {
            spans.push({ start: match.index, end: match.index + match[0].length, text: match[1] });
        }
    }
    for (const match of text.matchAll(ENGLISH_TERM)) {
        const start = match.index;
        // Iqtibos ichiga tushgan bo'lsa ikki marta hisoblamaymiz.
        if (spans.some((span) => start >= span.start && start < span.end)) continue;
        spans.push({ start, end: start + match[0].length, text: match[0] });
    }

    spans.sort((a, b) => a.start - b.start);

    const segments = [];
    let cursor = 0;
    for (const span of spans) {
        if (span.start > cursor) {
            segments.push({ text: text.slice(cursor, span.start), english: false });
        }
        segments.push({ text: span.text, english: true });
        cursor = span.end;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor), english: false });

    // Qo'shni bir xil tildagilar birlashtiriladi — har bir bo'lak alohida
    // so'rov, keraksizini yaratmaymiz.
    const merged = [];
    for (const segment of segments) {
        if (!segment.text.trim()) continue;
        const last = merged[merged.length - 1];
        if (last && last.english === segment.english) last.text += segment.text;
        else merged.push({ ...segment });
    }
    return merged;
}

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

    const text = normalizeForSpeech(String(data?.text || ""));
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
    const lang = byLang[data?.lang] ? data.lang : DEFAULT_LANG;
    const config = byLang[lang];

    // O'zbekcha ovoz inglizcha so'zni buzib o'qiydi: "fluency" "flunkiy" bo'lib
    // chiqadi, va matnning sun'iyligi aynan shu joyda bilinadi. SSML da <lang>
    // tegi bu endpointda rad etiladi, shuning uchun inglizcha bo'laklar alohida
    // so'rov bilan inglizcha ovozda o'qiladi va mp3 lar ulanadi.
    //
    // Tezlik va ton O'ZBEKCHA sozlamadan olinadi — ovoz almashsa ham sur'at
    // o'zgarmasligi kerak, aks holda iqtibos boshqa odam gapirganday eshitiladi.
    const segments = lang === "uz" ? splitByLanguage(text) : [{ text, english: false }];
    const multiVoice =
        segments.length > 1 &&
        segments.length <= MAX_SEGMENTS &&
        segments.some((segment) => segment.english);

    let audio;
    try {
        if (multiVoice) {
            const englishVoice = byLang.en?.voice || config.voice;
            const parts = await Promise.all(
                segments.map((segment) =>
                    synthesize(segment.text.trim(), {
                        ...config,
                        voice: segment.english ? englishVoice : config.voice,
                    })
                )
            );
            audio = Buffer.concat(parts);
        } else {
            audio = await synthesize(text, config);
        }
    } catch (error) {
        console.error("Edge TTS error:", error.message);
        throw new functions.https.HttpsError("unavailable", "Ovozni sintez qilib bo'lmadi.");
    }

    if (!audio || audio.length === 0) {
        throw new functions.https.HttpsError("unavailable", "Ovoz xizmati bo'sh audio qaytardi.");
    }

    return { audioBase64: audio.toString("base64"), mimeType: MIME_TYPE };
}

module.exports = { synthesizeSpeech, VOICES, normalizeForSpeech, splitByLanguage };
