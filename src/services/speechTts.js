// src/services/speechTts.js
// Feedback matnini ovozga aylantiradi va ijro etadi.
//
// Ikki dvigatel:
//   1. `synthesizeSpeech` Firebase funksiyasi — Microsoft Edge neural ovozlari.
//      Sintez SERVERDA bo'lishi shart: brauzerdan Edge TTS ga WebSocket
//      ulanishi o'tmaydi (handshake yiqiladi), serverdan esa muammosiz ishlaydi.
//   2. speechSynthesis — brauzerga o'rnatilgan, tarmoqsiz ishlaydi, sifati past.
//
// Birinchisi ishlamasa ikkinchisiga o'tamiz — o'quvchi feedbackni baribir
// eshitadi, lekin buni yashirmaymiz: chaqiruvchi `engine` ni ko'radi va
// ekranda ogohlantirish chiqadi. Ilgari bu jimgina sodir bo'lardi va sifat
// tushib ketgani sezilmasdi.

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';

/**
 * Feedback rejimlari. Ovozlarning o'zi serverda —
 * functions/synthesizeSpeech.js dagi VOICES jadvalida.
 *
 * `description` — o'quvchi javob berishdan OLDIN ohangni tanlaydi, shuning
 * uchun har biri nima berishini bir qatorda tushuntirib turishi kerak.
 */
export const FEEDBACK_MODES = {
    friend: {
        label: { uz: "Do'st", en: 'Friend' },
        description: {
            uz: "Iliq va dalda beruvchi — avval nima yaxshi chiqqanini aytadi",
            en: 'Warm and encouraging — leads with what went well',
        },
    },
    coach: {
        label: { uz: 'Coach', en: 'Coach' },
        description: {
            uz: "To'g'ridan-to'g'ri — keyingi safar nimani o'zgartirishni aytadi",
            en: 'Direct and practical — tells you what to change next time',
        },
    },
    examiner: {
        label: { uz: 'Examiner', en: 'Examiner' },
        description: {
            uz: 'Rasmiy va xolis — imtihondagidek, mezonlar tilida',
            en: 'Formal and neutral — exam language, criterion by criterion',
        },
    },
};

export const DEFAULT_MODE = 'friend';
export const DEFAULT_LANG = 'uz';

/** Brauzer ovozi uchun locale — neural ovoz ishlamay qolgan holat uchun. */
const NATIVE_LANG = { uz: 'uz-UZ', en: 'en-US' };

// Sintez qilingan audio URL lari: rejim almashtirilganda qayta so'ramaymiz.
const cache = new Map();
const cacheKey = (mode, lang, text) => `${mode}::${lang}::${text}`;

const synthesizeFn = httpsCallable(functions, 'synthesizeSpeech');

/** Server orqali sintez. @returns {Promise<string>} object URL */
async function synthesizeRemote(text, mode, lang) {
    const { data } = await synthesizeFn({ text, mode, lang });
    if (!data?.audioBase64) throw new Error('Ovoz xizmati bo\'sh javob qaytardi');

    // base64 -> Blob
    const binary = atob(data.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    return URL.createObjectURL(new Blob([bytes], { type: data.mimeType || 'audio/mpeg' }));
}

/** Brauzerning o'z dvigateli. @returns {() => void} to'xtatish funksiyasi */
function speakNative(text, lang, onEnd) {
    const synth = window.speechSynthesis;
    if (!synth) throw new Error('Brauzer ovoz sintezini qo\'llamaydi');

    // Shu tilga mos ovoz. Aniq locale bo'lmasa til kodi bo'yicha qidiramiz.
    const locale = NATIVE_LANG[lang] || NATIVE_LANG[DEFAULT_LANG];
    const prefix = locale.slice(0, 2).toLowerCase();
    const match = synth
        .getVoices()
        .find((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith(prefix));

    // Mos ovoz yo'q bo'lsa — o'zbekcha matnni inglizcha ovoz o'qishi ma'nosiz.
    if (!match) throw new Error(`'${locale}' uchun brauzerda ovoz yo'q`);

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.voice = match;
    utterance.rate = 0.95;

    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    synth.speak(utterance);

    return () => synth.cancel();
}

/**
 * Matnni ovozda o'qiydi. Avval neural ovoz, u ishlamasa brauzer dvigateli.
 *
 * @param {string} text
 * @param {keyof typeof FEEDBACK_MODES} mode
 * @param {{ lang?: 'uz'|'en', onEnd?: () => void }} [options]
 * @returns {Promise<{ stop: () => void, engine: 'neural'|'native' }>}
 * @throws {Error} ikkala dvigatel ham ishlamasa
 */
export async function play(text, mode = DEFAULT_MODE, { lang = DEFAULT_LANG, onEnd } = {}) {
    const clean = (text || '').trim();
    if (!clean) throw new Error('Ovozga aylantirish uchun matn yo\'q.');

    const key = cacheKey(mode, lang, clean);

    let url = cache.get(key);
    if (!url) {
        try {
            url = await synthesizeRemote(clean, mode, lang);
            cache.set(key, url);
        } catch (error) {
            console.warn('Neural ovoz ishlamadi, brauzer ovoziga o\'tildi:', error.message);
            const stop = speakNative(clean, lang, onEnd);
            return { stop, engine: 'native' };
        }
    }

    const audio = new Audio(url);
    audio.onended = onEnd;
    audio.onerror = onEnd;

    try {
        await audio.play();
    } catch (error) {
        // Brauzer avtomatik ijroni bloklagan bo'lishi mumkin (user gesture yo'q).
        // Bu xato emas — o'quvchi "Eshitish" tugmasini bossa ishlaydi.
        if (error.name === 'NotAllowedError') {
            const blocked = new Error('autoplay-blocked');
            blocked.name = 'AutoplayBlocked';
            throw blocked;
        }
        throw error;
    }

    return {
        stop: () => {
            audio.pause();
            audio.currentTime = 0;
        },
        engine: 'neural',
    };
}

/**
 * Keshdagi object URL larni bo'shatadi.
 * @param {string} [text] - berilsa, faqat shu matnga tegishlilari
 */
export function revokeSpeech(text) {
    for (const [key, url] of cache.entries()) {
        if (text && !key.endsWith(`::${text.trim()}`)) continue;
        URL.revokeObjectURL(url);
        cache.delete(key);
    }
}
