// src/services/articleTts.js
// Maqolani Microsoft Edge neural ovozi bilan o'qiydi.
//
// NEGA ALOHIDA SERVIS?
// `speechTts.js` bitta qisqa feedback matni uchun: bitta so'rov, bitta Audio.
// Maqola esa o'n-yigirma paragraf va minglab belgi — serverdagi chegara
// 2000 belgi, ya'ni bitta so'rovga sig'maydi. Bu yerda navbat quriladi,
// keyingi bo'lak joriysi yangrayotganda oldindan yuklanadi (shuning uchun
// paragraflar orasida sukunat sezilmaydi) va joriy paragraf chaqiruvchiga
// qaytariladi — ekranda ajratib ko'rsatish uchun.
//
// Neural ovoz ishlamasa (tarmoq yo'q, funksiya xato berdi) chaqiruvchi
// brauzerning o'z `speechSynthesis` dvigateliga qaytadi — sifati past, lekin
// o'quvchi baribir eshitadi.

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';

/* Serverdagi chegara 2000 — zaxira bilan olamiz */
const MAX_CHUNK_CHARS = 1700;

const synthesizeFn = httpsCallable(functions, 'synthesizeSpeech');

/* 5 ms sukunat — elementni foydalanuvchi bosgan payt "ochish" uchun
   (pastdagi `unlock` izohiga qarang). */
const SILENT_WAV =
    'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

/* Sintez qilingan audio: sessiya davomida qayta so'ralmaydi
   (pauza/davom, darajani qaytarib tanlash, ikkinchi marta tinglash) */
const audioCache = new Map();

/**
 * Matnni jumla chegaralari bo'yicha bo'laklarga ajratadi.
 * Jumla o'rtasidan kesilsa, ovoz noto'g'ri intonatsiya bilan tugaydi.
 */
export function splitForTts(text, max = MAX_CHUNK_CHARS) {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    if (clean.length <= max) return [clean];

    const sentences = clean.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [clean];
    const chunks = [];
    let buffer = '';

    const flush = () => {
        const trimmed = buffer.trim();
        if (trimmed) chunks.push(trimmed);
        buffer = '';
    };

    for (const sentence of sentences) {
        if (buffer && (buffer + sentence).length > max) flush();

        if (sentence.length > max) {
            for (const word of sentence.split(' ')) {
                if (buffer && (buffer + ' ' + word).length > max) flush();
                buffer += (buffer ? ' ' : '') + word;
            }
            continue;
        }

        buffer += sentence;
    }
    flush();

    return chunks;
}

async function synthesizeChunk(text) {
    if (audioCache.has(text)) return audioCache.get(text);

    const promise = (async () => {
        const { data } = await synthesizeFn({ text, mode: 'reader', lang: 'en' });
        if (!data?.audioBase64) throw new Error("Ovoz xizmati bo'sh javob qaytardi");

        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

        return URL.createObjectURL(new Blob([bytes], { type: data.mimeType || 'audio/mpeg' }));
    })();

    audioCache.set(text, promise);
    // Xato bo'lsa keshda qolmasin — keyingi urinish qaytadan so'rasin
    promise.catch(() => audioCache.delete(text));
    return promise;
}

/**
 * Maqola o'quvchisi.
 *
 * @param {object} options
 * @param {Array<{ blockIndex: number, text: string }>} options.blocks
 * @param {(blockIndex: number) => void} [options.onBlockChange]
 * @param {(loading: boolean) => void} [options.onLoadingChange]
 * @param {() => void} [options.onEnd]
 * @param {(error: Error) => void} [options.onError] - o'qishni davom ettirib bo'lmadi
 */
export function createArticleReader({ blocks, onBlockChange, onLoadingChange, onEnd, onError }) {
    /** @type {Array<{ blockIndex: number, text: string }>} */
    const queue = [];
    for (const block of blocks) {
        for (const chunk of splitForTts(block.text)) {
            queue.push({ blockIndex: block.blockIndex, text: chunk });
        }
    }

    // iOS Safari yangi Audio elementini faqat foydalanuvchi harakatidan keyin
    // ijro etadi. Shuning uchun BITTA element yaratamiz va faqat `src` ni
    // almashtiramiz — birinchi bosishda "ochilgan" element shundayligicha qoladi.
    const audio = new Audio();
    audio.preload = 'auto';

    let disposed = false;
    let position = 0;
    let unlocked = false;
    const pending = new Map(); // queue indeksi -> Promise<objectURL>

    /**
     * Elementni foydalanuvchi harakati ichida "ochadi".
     *
     * Birinchi bo'lakni serverdan olish 1-3 soniya. Shu vaqt ichida bosish
     * hodisasi tugaydi, va Safari/iOS undan keyingi `play()` ni rad etadi —
     * natijada neural ovoz ishlamadi deb hisoblanib brauzer ovoziga o'tib
     * ketiladi. Shuning uchun `start()` chaqirilishi bilanoq, hali hech narsa
     * kutmasdan, 5 ms lik sukunatni ijro etamiz: element shu bilan "ochiladi"
     * va keyin `src` almashsa ham ijro huquqi saqlanadi.
     */
    const unlock = () => {
        if (unlocked) return;
        unlocked = true;
        audio.src = SILENT_WAV;
        const attempt = audio.play();
        if (attempt?.catch) attempt.catch(() => { /* ochilmadi — playAt xabar beradi */ });
    };

    const prefetch = (index) => {
        if (index >= queue.length || pending.has(index)) return pending.get(index);
        const promise = synthesizeChunk(queue[index].text);
        pending.set(index, promise);
        promise.catch(() => { /* playAt o'zi hal qiladi */ });
        return promise;
    };

    const playAt = async (index) => {
        if (disposed) return;

        if (index >= queue.length) {
            onLoadingChange?.(false);
            onEnd?.();
            return;
        }

        position = index;
        onBlockChange?.(queue[index].blockIndex);

        let url;
        try {
            const promise = prefetch(index);
            // Oldindan yuklab bo'lingan bo'lsa "yuklanmoqda" ko'rsatmaymiz.
            // Bitta mikrovazifa kutamiz: bajarilgan promise shu payt yechiladi,
            // hali kutayotgani esa yo'q.
            let ready = false;
            promise.then(() => { ready = true; }, () => { ready = true; });
            await Promise.resolve();
            if (!ready) onLoadingChange?.(true);
            url = await promise;
        } catch (error) {
            onLoadingChange?.(false);
            if (disposed) return;
            // Birinchi bo'lak ham yuklanmasa — dvigatel ishlamayapti, chaqiruvchi
            // zaxira variantga o'tsin. Keyingilari xato bersa shunchaki o'tkazamiz.
            if (index === 0) {
                onError?.(error);
                return;
            }
            console.warn('TTS chunk failed, skipping:', error?.message);
            playAt(index + 1);
            return;
        }

        if (disposed) return;
        onLoadingChange?.(false);

        // Joriy bo'lak yangrayotganda keyingilarini tayyorlab qo'yamiz.
        // Ikkitasi — qisqa paragraflar ketma-ket kelganda ham sukunat bo'lmasin.
        prefetch(index + 1);
        prefetch(index + 2);

        audio.src = url;
        audio.onended = () => { if (!disposed) playAt(index + 1); };
        audio.onerror = () => {
            if (disposed) return;
            console.warn('Audio playback error, skipping chunk');
            playAt(index + 1);
        };

        try {
            await audio.play();
        } catch (error) {
            if (disposed) return;
            onLoadingChange?.(false);
            onError?.(error);
        }
    };

    return {
        chunkCount: queue.length,
        start: () => {
            unlock();
            return playAt(0);
        },
        pause: () => audio.pause(),
        resume: () => audio.play().catch((error) => onError?.(error)),
        /** @param {number} rate 0.5–2 */
        setRate: (rate) => { audio.playbackRate = rate; },
        stop: () => {
            disposed = true;
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            pending.clear();
            onLoadingChange?.(false);
        },
        get position() { return position; },
    };
}

/** Keshdagi object URL larni bo'shatadi (masalan boshqa maqolaga o'tilganda) */
export async function revokeArticleAudio() {
    for (const promise of audioCache.values()) {
        try {
            URL.revokeObjectURL(await promise);
        } catch { /* ignore */ }
    }
    audioCache.clear();
}
