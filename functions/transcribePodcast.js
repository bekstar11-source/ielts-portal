// functions/transcribePodcast.js
const admin = require("firebase-admin");
const OpenAI = require("openai").default;
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const os = require("os");


/**
 * Whisper API orqali MP3 ni matnga o'giradi va segmentlarga bo'lib Firestore ga saqlaydi.
 * @param {object} data - { podcastId, audioUrl }
 * @param {object} context - Firebase auth context
 */
async function transcribePodcast(data, context) {
    if (!context.auth) throw new Error("Faqat autentifikatsiya qilingan foydalanuvchilar uchun.");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { podcastId, audioUrl, script } = data;
    if (!podcastId || !audioUrl) throw new Error("podcastId va audioUrl talab qilinadi.");

    const db = admin.firestore();
    const podcastRef = db.collection("podcasts").doc(podcastId);

    // Status: processing
    await podcastRef.update({ transcriptionStatus: "processing" });

    try {
        // 1. MP3 ni temp faylga yuklash
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`Audio yuklab bo'lmadi: ${response.statusText}`);

        const tmpFile = path.join(os.tmpdir(), `podcast_${podcastId}.mp3`);
        const buffer = await response.buffer();
        fs.writeFileSync(tmpFile, buffer);

        // 2. Whisper API ga yuborish (verbose_json — timestamps bilan)
        const apiPayload = {
            file: fs.createReadStream(tmpFile),
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: script ? ["word", "segment"] : ["segment"],
        };

        if (script) {
            // Whisper xatolarini minimallashtirish uchun scriptning bir qismini prompt sifatida beramiz
            apiPayload.prompt = script.slice(0, 500);
        }

        const transcription = await openai.audio.transcriptions.create(apiPayload);

        // 3. Segmentlarni Firestore ga saqlash
        const batch = db.batch();
        const segmentsRef = podcastRef.collection("segments");

        let finalSegments = [];

        if (script && transcription.words && transcription.words.length > 0) {
            // ── IMPROVED FORCED ALIGNMENT ─────────────────────────────────────
            // Eski usul: so'z sanab surib borish → bitta xato butun gaplarni suradi
            // Yangi usul: har bir gap uchun BOSHLANISH va TUGASH anchor so'zlarini
            //             Whisper words arrayida qidirish (fuzzy match).
            //             Whisper bitta so'zni o'tkazib yuborsa ham keyingi gap buzilmaydi.

            function nw(word) {
                // So'zni normallashtirish: kichik harf, faqat harf va raqam
                return (word || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            }

            const rawSentences = script
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .replace(/\s+[-\u2013\u2014]\s+/g, "\n")
                .split("\n")
                .flatMap(line => {
                    line = line.trim().replace(/^[""]/g, "").replace(/[""]$/g, "").trim();
                    if (!line) return [];
                    return line
                        .replace(/([.!?;])(["'\u201C\u201D]?)\s+(?=[A-Z\u201C"])/g, "$1$2\n")
                        .split("\n")
                        .map(s => s.trim())
                        .filter(Boolean);
                });

            // ── So'z chegaralari: min=10, max=20 ────────────────────────────────
            const MIN_WORDS = 10;
            const MAX_WORDS = 20;
            const BREAK_WORDS = new Set(["and", "but", "or", "where", "which", "who", "because", "so", "then", "however", "although", "while", "when", "that"]);

            function splitLong(sent) {
                const words = sent.trim().split(/\s+/).filter(Boolean);
                if (words.length <= MAX_WORDS) return [words.join(" ")];
                // O'rtasiga yaqin eng tabiiy bo'linish nuqtasini topamiz
                const mid = Math.floor(words.length / 2);
                let bestIdx = mid;
                let bestScore = Infinity;
                const lo = Math.max(MIN_WORDS, mid - 8);
                const hi = Math.min(words.length - MIN_WORDS, mid + 8);
                for (let i = lo; i <= hi; i++) {
                    const prevWord = words[i - 1] || "";
                    const nextWord = (words[i] || "").toLowerCase().replace(/[^a-z]/g, "");
                    const isNatural = prevWord.endsWith(",") || prevWord.endsWith(";") || BREAK_WORDS.has(nextWord);
                    const score = Math.abs(i - mid) - (isNatural ? 6 : 0);
                    if (score < bestScore) { bestScore = score; bestIdx = i; }
                }
                const left = words.slice(0, bestIdx).join(" ");
                const right = words.slice(bestIdx).join(" ");
                return [...splitLong(left), ...splitLong(right)]; // rekursiv — juda uzun bo'lsa yana bo'ladi
            }

            function mergeShort(sents) {
                const out = [];
                let i = 0;
                while (i < sents.length) {
                    const wc = sents[i].split(/\s+/).filter(Boolean).length;
                    if (wc < MIN_WORDS) {
                        if (i + 1 < sents.length) {
                            const nextWc = sents[i + 1].split(/\s+/).filter(Boolean).length;
                            // Ikkalasini birlashtirish MAX * 1.5 dan oshmasin
                            if (wc + nextWc <= Math.floor(MAX_WORDS * 1.5)) {
                                out.push(sents[i] + " " + sents[i + 1]);
                                i += 2; continue;
                            }
                        }
                        // Oldingi bilan birlashtir
                        if (out.length > 0) {
                            out[out.length - 1] += " " + sents[i];
                            i++; continue;
                        }
                    }
                    out.push(sents[i]);
                    i++;
                }
                return out;
            }

            // 1. Uzunlarni bo'l
            const afterSplit = rawSentences.flatMap(s => splitLong(s));
            // 2. Qisqalarni birlashtir
            const userSentences = mergeShort(afterSplit);

            console.log(`[Alignment] Jami segmentlar: ${userSentences.length} (raw: ${rawSentences.length})`);

            const whisperWords = transcription.words; // [{word, start, end}]
            let wPos = 0; // hozirgi qidiruv pozitsiyasi


            userSentences.forEach((sentence, index) => {
                const sentWordRaw = sentence.split(/\s+/).filter(Boolean);
                const sentNorm = sentWordRaw.map(nw).filter(Boolean);

                if (sentNorm.length === 0) return;

                // ── START ANCHOR: birinchi 1-2 so'zni qidirish ────────────────
                const fw = sentNorm[0];
                const sw = sentNorm[1] || null;

                let matchStart = wPos;
                const startWindow = Math.min(whisperWords.length, wPos + 60);

                // 2-so'z bilan aniq qidiruv
                let found = false;
                for (let wi = wPos; wi < startWindow; wi++) {
                    if (nw(whisperWords[wi].word) === fw) {
                        if (!sw) { matchStart = wi; found = true; break; }
                        if (wi + 1 < whisperWords.length && nw(whisperWords[wi + 1].word) === sw) {
                            matchStart = wi; found = true; break;
                        }
                    }
                }
                // Agar 2-so'z bilan topilmasa, faqat 1-so'z bilan
                if (!found) {
                    for (let wi = wPos; wi < startWindow; wi++) {
                        if (nw(whisperWords[wi].word) === fw) {
                            matchStart = wi; found = true; break;
                        }
                    }
                }
                // Hech narsa topilmasa — oldingi pozitsiyadan davom
                if (!found) matchStart = wPos;

                // ── END ANCHOR: oxirgi 1-2 so'zni qidirish ───────────────────
                const lw = sentNorm[sentNorm.length - 1];
                const slw = sentNorm.length >= 2 ? sentNorm[sentNorm.length - 2] : null;

                // Oxirgi so'z taxminan qayerda bo'lishi kerak (so'z soni asosida)
                const expectedEnd = matchStart + sentNorm.length - 1;
                const endSearchStart = Math.max(matchStart, expectedEnd - 8);
                const endSearchEnd = Math.min(whisperWords.length, expectedEnd + 12);

                let matchEnd = Math.min(expectedEnd, whisperWords.length - 1);

                // 2-so'z bilan aniq qidiruv
                let foundEnd = false;
                for (let wi = endSearchStart; wi < endSearchEnd; wi++) {
                    if (nw(whisperWords[wi].word) === lw) {
                        if (!slw) { matchEnd = wi; foundEnd = true; break; }
                        if (wi > 0 && nw(whisperWords[wi - 1].word) === slw) {
                            matchEnd = wi; foundEnd = true; break;
                        }
                    }
                }
                if (!foundEnd) {
                    for (let wi = endSearchStart; wi < endSearchEnd; wi++) {
                        if (nw(whisperWords[wi].word) === lw) {
                            matchEnd = wi; foundEnd = true; break;
                        }
                    }
                }

                // matchEnd hech qachon matchStart dan kichik bo'lmasin
                if (matchEnd < matchStart) matchEnd = Math.min(matchStart + sentNorm.length - 1, whisperWords.length - 1);

                const startTime = parseFloat((whisperWords[matchStart]?.start ?? (finalSegments.length > 0 ? finalSegments[finalSegments.length - 1].endTime : 0)).toFixed(3));
                const endTime = parseFloat((whisperWords[matchEnd]?.end ?? (startTime + 1.5)).toFixed(3));

                finalSegments.push({
                    index,
                    text: sentence.trim(),
                    startTime,
                    endTime,
                    editedBy: "gibrid-align",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Keyingi gap matchEnd+1 dan boshlansin
                wPos = matchEnd + 1;
            });
        } else {
            // ODDY TRANSKRIPSIYA: Agar tayyor matn berilmagan bo'lsa
            finalSegments = transcription.segments.map((seg, index) => ({
                index,
                text: seg.text.trim(),
                startTime: parseFloat(seg.start.toFixed(2)),
                endTime: parseFloat(seg.end.toFixed(2)),
                editedBy: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }));
        }

        // SEGMENTLARNI BIRLASHTIRISH LOGIKASI (Auto-Merge)
        // Qisqa so'zlarni (yes, no, ok, goodbye va hk) alohida qilib qoldirmasdan, oldingi yoki keyingi segmentga qo'shib yuborish
        const mergedSegments = [];
        const shortWordsList = ["yes", "no", "ok", "okay", "goodbye", "bye", "hello", "hi", "right", "sure", "well", "so", "and", "but", "exactly", "yeah", "yep", "nope", "oh", "ah", "wow"];

        for (let i = 0; i < finalSegments.length; i++) {
            let current = finalSegments[i];

            // So'zlar sonini sanaymiz (harflardan iborat so'zlar)
            const wordCount = current.text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/)).length;
            const duration = current.endTime - current.startTime;

            const cleanTextLower = current.text.toLowerCase().replace(/[^a-z]/g, '');
            const isTargetShortWord = shortWordsList.includes(cleanTextLower) || (wordCount <= 2 && duration <= 1.5);

            if (isTargetShortWord && mergedSegments.length > 0) {
                // O'zidan oldingi segmentga qo'shib yuboramiz (faqat gaplar orasidagi bo'shliq bo'lsa)
                const prev = mergedSegments[mergedSegments.length - 1];
                prev.text = prev.text + " " + current.text;
                prev.endTime = current.endTime;
                if (!prev.editedBy) prev.editedBy = "auto-merged";
            } else if (isTargetShortWord && i < finalSegments.length - 1) {
                // Agar bu eng birinchi segment bo'lsa, o'zidan keyingi segmentga qo'shib beramiz
                let next = finalSegments[i + 1];
                next.text = current.text + " " + next.text;
                next.startTime = current.startTime;
                if (!next.editedBy) next.editedBy = "auto-merged";
                // Current segment o'zlashtirildi, uni ro'yxatga qo'shmaymiz
            } else {
                mergedSegments.push(current);
            }
        }

        // Indexlarni to'g'irlash
        mergedSegments.forEach((seg, index) => {
            seg.index = index;
        });

        // Bazaga yozish
        mergedSegments.forEach((segData) => {
            const segRef = segmentsRef.doc();
            batch.set(segRef, segData);
        });

        await batch.commit();

        // 4. Temp faylni o'chirish
        fs.unlinkSync(tmpFile);

        // 5. Podcast statusini yangilash
        await podcastRef.update({
            transcriptionStatus: "completed",
            totalSegments: transcription.segments.length,
            duration: transcription.segments[transcription.segments.length - 1]?.end || 0,
            fullTranscript: transcription.text,
        });

        return { success: true, segmentCount: transcription.segments.length };
    } catch (error) {
        await podcastRef.update({ transcriptionStatus: "failed", transcriptionError: error.message });
        console.error("Transcription error:", error);
        throw new Error(`Transkriptsiya xatosi: ${error.message}`);
    }
}

module.exports = { transcribePodcast };
