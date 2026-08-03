// src/utils/audioWav.js
// MediaRecorder yozuvini (webm/opus yoki mp4/aac) 16kHz mono WAV ga o'giradi.
//
// NIMAGA KERAK: Gemini audio input faqat wav / mp3 / aiff / aac / ogg / flac
// formatlarini qabul qiladi — webm ro'yxatda YO'Q, brauzer esa aynan webm yozadi.
// 16kHz mono nutq uchun yetarli va faylni ~6 barobar kichraytiradi
// (44.1kHz stereo o'rniga): 1 daqiqa ≈ 1.9MB.

const TARGET_SAMPLE_RATE = 16000;

/**
 * PCM (Float32, -1..1) ni 16-bit WAV blobga o'raydi.
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @returns {Blob}
 */
function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, text) => {
        for (let i = 0; i < text.length; i += 1) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    };

    const dataSize = samples.length * 2;
    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // PCM chunk hajmi
    view.setUint16(20, 1, true); // format: PCM
    view.setUint16(22, 1, true); // kanallar: mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bit depth
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < samples.length; i += 1) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
}

/**
 * Namunalarning eng baland nuqtasi (0..1).
 *
 * Jimlikni aniqlash uchun: mikrofon o'chiq yoki noto'g'ri qurilma tanlangan
 * bo'lsa, o'quvchi ikki daqiqa gapirib bo'sh fayl yuboradi — bu ham pul,
 * ham "band 0" degan adolatsiz feedback demakdir.
 * @param {Float32Array} samples
 */
function peakLevel(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
        const value = Math.abs(samples[i]);
        if (value > peak) peak = value;
    }
    return peak;
}

/**
 * Yozib olingan audio blobni WAV ga o'giradi.
 * @param {Blob} blob - MediaRecorder chiqargan blob
 * @returns {Promise<{ blob: Blob, mimeType: string, durationSec: number, peak: number }>}
 */
export async function toWav(blob) {
    const arrayBuffer = await blob.arrayBuffer();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error("Brauzer audio qayta ishlashni qo'llamaydi.");

    const decodeCtx = new AudioCtx();
    let decoded;
    try {
        decoded = await decodeCtx.decodeAudioData(arrayBuffer);
    } finally {
        // decodeAudioData tugagach kontekst kerak emas — resurs bo'shatamiz.
        decodeCtx.close();
    }

    if (decoded.duration === 0) throw new Error("Audio bo'sh.");

    // 16kHz mono ga qayta namunalash
    const frameCount = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start();

    const rendered = await offlineCtx.startRendering();
    const channel = rendered.getChannelData(0);

    return {
        blob: encodeWav(channel, TARGET_SAMPLE_RATE),
        mimeType: "audio/wav",
        durationSec: decoded.duration,
        peak: peakLevel(channel),
    };
}
