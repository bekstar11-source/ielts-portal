// functions/cleanupSpeakingAudio.js
// Eski Speaking ovoz yozuvlarini Storage dan o'chiradi.
//
// Har bir javob ~1-5MB. Ular hech qachon o'chirilmasa, saqlash hisobi
// oyma-oy o'sib boraveradi, ustiga o'quvchining ovozi kerak bo'lmagan
// joyda muddatsiz turadi. Feedback va band ballar Firestore da qoladi —
// o'chadigan narsa faqat audio.
//
// 60 kun: o'qituvchi tekshiruvi bir necha kun ichida yopiladi, o'quvchi esa
// o'z javobini odatda o'sha hafta ichida qayta eshitadi.

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const RETENTION_DAYS = Number(process.env.SPEAKING_AUDIO_RETENTION_DAYS || 60);
const PREFIX = "speaking/";

async function runSpeakingAudioCleanup() {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const bucket = admin.storage().bucket();

    let deleted = 0;
    let scanned = 0;
    let pageToken;

    do {
        const [files, nextQuery] = await bucket.getFiles({
            prefix: PREFIX,
            autoPaginate: false,
            maxResults: 1000,
            pageToken,
        });

        for (const file of files) {
            scanned++;
            const created = Date.parse(file.metadata.timeCreated || "");
            if (!Number.isFinite(created) || created > cutoff) continue;
            try {
                await file.delete();
                deleted++;
            } catch (error) {
                // Fayl allaqachon o'chgan bo'lishi mumkin — sikl to'xtamasin.
                console.error(`cleanupSpeakingAudio: ${file.name} o'chmadi`, error.message);
            }
        }

        pageToken = nextQuery?.pageToken;
    } while (pageToken);

    console.log(`cleanupSpeakingAudio: ${scanned} ta fayl ko'rildi, ${deleted} ta o'chirildi.`);
    return { scanned, deleted };
}

// Har hafta yakshanba, Toshkent vaqti bilan 03:30 —
// kunlik yurgizishga arziydigan hajm yo'q.
const cleanupSpeakingAudio = functions
    .runWith({ timeoutSeconds: 540, memory: "256MB" })
    .pubsub.schedule("30 3 * * 0")
    .timeZone("Asia/Tashkent")
    .onRun(async () => {
        await runSpeakingAudioCleanup();
        return null;
    });

module.exports = { cleanupSpeakingAudio, runSpeakingAudioCleanup };
