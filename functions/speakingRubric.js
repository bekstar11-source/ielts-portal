// functions/speakingRubric.js
// IELTS Speaking baholash uchun prompt va JSON sxema.
// Alohida fayl — prompt ustida ishlashda evaluateSpeaking.js ga tegmaslik uchun.

const CRITERIA = ["fluency", "lexical", "grammar", "pronunciation"];

/** Audiodan o'lchanadigan ko'rsatkichlar — band ballardan farqli, kuzatiladi. */
const METRIC_KEYS = [
    "wordCount",
    "speakingRateWpm",
    "fillerCount",
    "longPauses",
    "selfCorrections",
];

/**
 * Uchta feedback rejimi. `voice` — edge-tts ovozi (klientda ishlatiladi),
 * `style` — modelga beriladigan ohang ta'rifi.
 */
const FEEDBACK_MODES = {
    friend: {
        voice: { en: "en-US-AvaMultilingualNeural", uz: "uz-UZ-MadinaNeural" },
        style:
            "An upbeat, high-energy friend who is genuinely excited for the student. Informal spoken " +
            "register, contractions, 2-3 short punchy sentences. Open with the win and sound pleased " +
            "about it, then drop the one fix lightly, like a tip between friends. Never mention band " +
            "scores. This is read aloud fast and bright, so keep the sentences short enough to carry " +
            "that energy — no long clauses.",
    },
    examiner: {
        voice: { en: "en-GB-RyanNeural", uz: "uz-UZ-SardorNeural" },
        style:
            "A real IELTS examiner debriefing the candidate. Serious, formal and emotionally flat — " +
            "no praise, no encouragement, no softening. 3-4 sentences. State the band for each " +
            "criterion, quote the descriptor language, and say precisely what is missing to reach " +
            "the next half band. Declarative statements only, delivered as a verdict.",
    },
    coach: {
        voice: { en: "en-US-AndrewMultilingualNeural", uz: "uz-UZ-SardorNeural" },
        style:
            "A coach who knows this student and is on their side. Sincere and direct, no distance and " +
            "no performance — speak to them, not about them. 3-4 sentences. Pick the single " +
            "highest-impact weakness, give one concrete phrase or structure to use instead, and one " +
            "short drill they can do in two minutes. Say it briskly, the way a coach talks between " +
            "rounds, and end on the drill.",
    },
};

/**
 * Feedback matni ovozda o'qiladi — TTS uchun yozish qoidalari.
 *
 * Eng sun'iy eshitiladigan narsa ovoz emas, matn: yozma sintaksis, uzun
 * ergash gaplar, qisqartmalar va raqamlar dvigatelni qoqiltiradi. Shuning
 * uchun modeldan boshdanoq OG'ZAKI nutq so'raymiz.
 */
const SPEECH_RULES = `These strings are fed straight into a text-to-speech engine, so write SPOKEN
language, not written language:
- No markdown, no bullet points, no emoji, no numbered lists, no parentheses, no slashes.
- No dashes of any kind, neither short nor long. The voice reads a dash as a stumble. Where you
  want that pause, use a comma or start a new sentence.
- Never use abbreviations or symbols the voice would mangle (%, &, e.g., i.e., IELTS is fine).
- Write every number as words, including band scores: "six and a half", not "6.5".
- Vary the sentence length on purpose. A very short sentence next to a longer one is what makes
  speech sound spoken; sentences of the same length in a row sound like a machine reading a list.
- One idea per sentence. Break a long sentence into two — the voice needs somewhere to breathe,
  and commas and full stops are the only breathing marks it has.
- Use the contractions and connectives a person actually says out loud, and open sentences the
  way speech does, not the way an essay does.
- When you quote what the candidate said, keep the quote short — one phrase, not a sentence.`;

const LANG_RULES = {
    en: `Write all three feedback strings in English.`,
    uz: `Write the feedback in Uzbek (Latin script) — this student's own language.
Natural spoken Uzbek is the requirement, and it is the easiest thing here to get wrong.

Never translate an English sentence into Uzbek. Compose it in Uzbek from the start. The test:
if a sentence could be back-translated into English word for word, it is a translation wearing
Uzbek words. Rewrite it.

BANNED. Every one of these is grammatical, and every one of them gives you away:
- Bookish written forms: mazkur, ushbu, hisoblanadi, amalga oshirish, ta'kidlash joizki,
  shuni aytish kerakki, lozim, mavjud.
- The "-moqda" verb form. Say "gapiryapsiz", never "gapirmoqdasiz"; "yaxshi ketyapti", never
  "yaxshi bormoqda".
- The possessive chain "Sizning ...ingiz ... edi". That is English syntax in Uzbek clothing.
- Calqued praise: "Ajoyib ish", "Yaxshi ish", "Yo'lda davom eting", "Zo'r bo'ldi" as an opener
  every single time.
- English words Uzbek already owns: level, problem, practice, mistake, improve. Use daraja,
  muammo, mashq, xato, yaxshilash.

REQUIRED. The small words that make Uzbek sound like it was said out loud rather than written:
-ku, -da, -chi, mana, endi, xullas, aslida, hozir, qarang, bo'pti. A teacher uses them
constantly, but not in every sentence — sprinkled in, not stacked.

Other rules:
- Address the student with "siz".
- Uzbek names of the criteria: ravonlik, so'z boyligi, grammatika, talaffuz.
- Keep IELTS terms and the candidate's own quoted English words in English. An Uzbek teacher
  code-switches exactly like that and it sounds natural.
- Band scores as Uzbek words: "olti yarim", not "6.5".
- Use apostrophes properly in o' and g' — the voice reads them as different letters.

REWRITE EXAMPLES. Study the shape of the change, do not reuse the wording:
BAD:  "Sizning ravonligingiz yaxshi edi, lekin siz ko'proq bog'lovchi so'zlarni ishlatishingiz kerak."
GOOD: "Ravon gapirdingiz-ku, zo'r. Faqat gaplar bir-biriga ulanmayapti. Orasiga "and then",
      "that's why" qo'shib ko'ring."
BAD:  "Grammatikangizda bir nechta xatolar mavjud. Siz o'tgan zamonni to'g'ri ishlatishingiz lozim."
GOOD: "Grammatika biroz oqsayapti. "I go there last year" dedingiz, "I went" bo'lishi kerak edi."
BAD:  "Ajoyib ish! Yo'lda davom eting!"
GOOD: "Zo'r ketyapsiz. Shu tempni ushlab turing."
BAD:  "Sizning talaffuzingiz olti ballga teng hisoblanadi."
GOOD: "Talaffuz olti ball. Tovushlar tushunarli, lekin urg'u bir tekis, shuning uchun olti
      yarimga yetmadi."`,
};

/**
 * "Bu o'quvchini taniyman" bloki.
 *
 * Ism va oldingi urinishlar promptga tushmasa, matn har safar o'quvchini
 * birinchi marta ko'rayotgan begonaning matni bo'lib qolaveradi. Blok faqat
 * aytishga arziydigan narsa bo'lgandagina qo'shiladi — bo'sh sarlavha modelni
 * yo'qni bordek qilib gapirishga undaydi.
 *
 * @param {{ studentName?: string|null, history?: object|null }} ctx
 * @returns {string} bo'sh satr — kontekst yo'q degani
 */
function buildPersonalBlock({ studentName, history }) {
    const facts = [];

    // Faqat ism — familiya bilan murojaat qilish o'zbekchada g'alati eshitiladi.
    const firstName = String(studentName || "").trim().split(/\s+/)[0];
    if (firstName) facts.push(`This student's first name is ${firstName}.`);

    if (history?.lastOverall) {
        facts.push(`Their previous overall band was ${history.lastOverall}.`);
    }

    const mistakes = (history?.mistakes || []).filter((item) => item?.said && item?.better);
    if (mistakes.length > 0) {
        const lines = mistakes
            .map(
                (item) =>
                    `- said "${item.said}" instead of "${item.better}"` +
                    (item.sessions > 1 ? ` (in ${item.sessions} separate sessions)` : "")
            )
            .join("\n");
        facts.push(`Mistakes they have made in recent sessions:\n${lines}`);
    }

    if (facts.length === 0) return "";

    return `YOU HAVE TAUGHT THIS STUDENT BEFORE. What you already know:
${facts.join("\n")}

How to use this, and it is easy to overdo:
- Say their name at most once, in the place a teacher would actually say it. Never open with it
  every time, and never use it in the examiner voice.
- Refer to at most ONE item from the list above, and only if THIS answer actually touches it:
  either they repeated it, or they finally got it right. Getting it right is worth saying out
  loud, and it is the most valuable sentence you can write.
- Never recite the list, never count out loud how many times, never say the word "history".
- Only mention the previous band if today's overall actually moved.
- If none of this is relevant to this particular answer, ignore the whole block in silence.
  A forced callback is worse than no callback.`;
}

/**
 * Gemini responseSchema.
 *
 * `feedback` — BITTA matn, o'quvchi tanlagan ohangda.
 *
 * Ilgari uchalasi ham shu yerda qaytardi. Mantiq shunday edi: audio input
 * eng qimmat qism, uni takror yubormaylik. Lekin kutish vaqtini chiqish
 * tokenlari belgilaydi, ular esa ketma-ket yoziladi — o'quvchi hech qachon
 * ochmaydigan ikkita matnni ham kutib o'tirardi. Endi almashtirilganda
 * kerakli ohang `speakingFeedbackTone` orqali alohida yoziladi: u audiosiz
 * ishlaydi, sekundlar emas, taxminan bir soniya oladi.
 */
const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        transcript: { type: "string" },
        bands: {
            type: "object",
            properties: {
                fluency: { type: "number" },
                lexical: { type: "number" },
                grammar: { type: "number" },
                pronunciation: { type: "number" },
                overall: { type: "number" },
            },
            required: [...CRITERIA, "overall"],
        },
        evidence: {
            type: "object",
            description: "Har bir mezon uchun audiodan olingan aniq dalil (1 jumla).",
            properties: {
                fluency: { type: "string" },
                lexical: { type: "string" },
                grammar: { type: "string" },
                pronunciation: { type: "string" },
            },
            required: CRITERIA,
        },
        corrections: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    said: { type: "string" },
                    better: { type: "string" },
                    why: { type: "string" },
                },
                required: ["said", "better", "why"],
            },
        },
        vocabulary: {
            type: "array",
            description:
                "Band 7+ uchun aynan shu javobda ishlatsa bo'ladigan ibora almashtirishlari.",
            items: {
                type: "object",
                properties: {
                    instead: { type: "string" },
                    use: { type: "string" },
                    example: { type: "string" },
                },
                required: ["instead", "use", "example"],
            },
        },
        metrics: {
            type: "object",
            description:
                "Audiodan o'lchangan ko'rsatkichlar — band emas, kuzatiladigan raqamlar.",
            properties: {
                wordCount: { type: "number" },
                speakingRateWpm: { type: "number" },
                fillerCount: { type: "number" },
                longPauses: { type: "number" },
                selfCorrections: { type: "number" },
            },
            required: ["wordCount", "speakingRateWpm", "fillerCount", "longPauses"],
        },
        followUp: {
            type: "string",
            description: "Imtihonchi aynan shu javobdan keyin beradigan tabiiy savol.",
        },
        feedback: {
            type: "string",
            description: "Baholashning og'zaki xulosasi — faqat so'ralgan ohangda.",
        },
    },
    required: [
        "transcript",
        "bands",
        "evidence",
        "corrections",
        "vocabulary",
        "metrics",
        "followUp",
        "feedback",
    ],
};

const DEFAULT_MODE = "friend";

/** Noma'lum ohang kelsa sukut bo'yicha rejimga tushamiz. */
function resolveMode(mode) {
    return FEEDBACK_MODES[mode] ? mode : DEFAULT_MODE;
}

/**
 * @param {{ question: string, part: 1|2|3, cueCard?: string,
 *           feedbackLang?: 'uz'|'en', mode?: string,
 *           studentName?: string|null, history?: object|null }} ctx
 */
function buildPrompt({
    question,
    part = 1,
    cueCard,
    feedbackLang = "uz",
    mode,
    studentName,
    history,
}) {
    const langRule = LANG_RULES[feedbackLang] || LANG_RULES.uz;
    const tone = resolveMode(mode);
    const personal = buildPersonalBlock({ studentName, history });

    return `You are a certified IELTS Speaking examiner. You are listening to the audio of a
candidate answering ONE question from IELTS Speaking Part ${part}.

Question asked: "${question}"${cueCard ? `\nCue card notes: "${cueCard}"` : ""}

LISTEN TO THE AUDIO ITSELF — do not judge from the transcript alone. Pronunciation and
Fluency must be scored from what you HEAR: hesitation and filler patterns, self-correction,
pace, word and sentence stress, intonation, connected speech, and intelligibility.

Scoring rules:
- Score each criterion 1.0-9.0 in steps of 0.5, using the official IELTS band descriptors.
- "overall" is the average of the four, rounded to the nearest 0.5.
- Accent is NOT a fault. Pronunciation measures intelligibility and prosody, never how
  close the speaker sounds to a native. Only lower it when meaning is actually obscured.
- A Part ${part} answer that is far too short for the task caps Fluency and Lexical Resource.
- If the audio is silent, unintelligible, or off-topic, return bands of 0 and say so plainly
  in every feedback mode. Never invent a transcript.

"transcript": always the candidate's own words in English, verbatim. Never translated.
"corrections": 1-3 items, taken verbatim from what the candidate actually said. Skip if none.
"said" and "better" stay in English; "why" and every "evidence" string follow the feedback
language rule below, because they are shown to the student on screen.

"vocabulary": 2-3 upgrades that fit THIS answer — a plain word or phrase the candidate
actually used ("instead"), the band 7+ alternative ("use"), and one short English sentence
showing it in this very topic ("example"). All three stay in English; skip an item rather
than inventing an upgrade the candidate had no chance to use. Never suggest rare or
bookish words a speaker would not say out loud.

"metrics": measured from the audio, not estimated from a feeling.
- wordCount: words actually spoken.
- speakingRateWpm: words per minute over the speaking time.
- fillerCount: audible fillers — um, uh, er, like, you know — as heard, not as written.
- longPauses: silences of roughly two seconds or more inside the answer.
- selfCorrections: times the candidate restarted or repaired a phrase.
These numbers are shown to the student as they are, so they must be honest; if the audio
is too short or unintelligible to measure, return zeros.

"followUp": the single question a real examiner would ask next, in English, growing out of
what this candidate actually said — not a generic next question from the topic list. Keep it
to one sentence. For Part 2, ask the rounding-off question the examiner would ask after the
long turn.

"feedback": the spoken verdict, written in ONE voice — the one described below. It must agree
with the bands you gave; a student who reads the feedback and then looks at the scores must
see the same story.

${FEEDBACK_MODES[tone].style}
${personal ? `\n${personal}\n` : ""}
${langRule}

${SPEECH_RULES}`;
}

/**
 * Tayyor baholashni BOSHQA ohangda qayta yozish uchun prompt.
 *
 * Audio bu yerda umuman yo'q — ballar allaqachon qo'yilgan, o'zgarayotgani
 * faqat ovoz. Shu sabab bu chaqiruv baholashdan bir necha barobar tez va
 * arzon, va kunlik limitdan yemaydi.
 */
function buildTonePrompt({
    mode,
    feedbackLang = "uz",
    question,
    part = 1,
    evaluation,
    personalization,
}) {
    const tone = resolveMode(mode);
    const langRule = LANG_RULES[feedbackLang] || LANG_RULES.uz;
    // Kontekst baholash paytida hisoblangan holicha keladi (javob hujjatidan).
    // Bu yerda qaytadan o'qib bo'lmaydi: shu javobning xatolari o'sha omborga
    // ALLAQACHON yozilgan, ya'ni model hozir tuzatayotgan xatosini "o'tgan
    // safar ham shunday edingiz" deb qaytarib berardi.
    const personal = buildPersonalBlock(personalization || {});
    const bands = evaluation?.bands || {};
    const corrections = (evaluation?.corrections || [])
        .map((item) => `- said "${item.said}" -> better "${item.better}"`)
        .join("\n");
    const evidence = CRITERIA.map((key) => `- ${key}: ${evaluation?.evidence?.[key] || "-"}`)
        .join("\n");

    return `An IELTS Speaking answer has already been assessed. Your only job is to deliver that
same assessment out loud in a different voice. Do NOT re-score and do NOT contradict anything
below — the student is looking at these numbers on the same screen.

Question asked: "${question || ""}" (Part ${part})

Bands already awarded:
- fluency: ${bands.fluency}
- lexical resource: ${bands.lexical}
- grammar: ${bands.grammar}
- pronunciation: ${bands.pronunciation}
- overall: ${bands.overall}

What was heard:
${evidence}

${corrections ? `Corrections already given to the student:\n${corrections}\n` : ""}
What the candidate said, verbatim:
"${(evaluation?.transcript || "").slice(0, 1500)}"

Write "feedback" as a single string in this voice:

${FEEDBACK_MODES[tone].style}
${personal ? `\n${personal}\n` : ""}
${langRule}

${SPEECH_RULES}`;
}

/** Ohangni qayta yozish uchun sxema — faqat bitta maydon. */
const TONE_SCHEMA = {
    type: "object",
    properties: { feedback: { type: "string" } },
    required: ["feedback"],
};

/** Band ballni 0-9 oralig'ida 0.5 ga yaxlitlaydi. */
function roundBand(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.min(9, Math.max(0, Math.round(n * 2) / 2));
}

/**
 * Model javobini tekshiradi va normallashtiradi.
 *
 * `feedback` — kalitlari ohang nomi bo'lgan obyekt, lekin endi ichida
 * boshida faqat BITTA yozuv bo'ladi. Qolganlari o'quvchi o'sha ohangga
 * o'tganda qo'shiladi, shuning uchun uni o'qiydigan har bir joy yo'q
 * ohangga tayyor turishi kerak.
 *
 * @param {object} raw
 * @param {string} mode - so'ralgan ohang
 * @throws {Error} sxema buzilgan bo'lsa
 */
function normalizeEvaluation(raw, mode) {
    if (!raw || typeof raw !== "object") throw new Error("AI javobi obyekt emas.");

    const bands = {};
    for (const key of CRITERIA) {
        const band = roundBand(raw.bands?.[key]);
        if (band === null) throw new Error(`AI javobida '${key}' band topilmadi.`);
        bands[key] = band;
    }
    // overall ni modelga ishonmasdan o'zimiz hisoblaymiz.
    bands.overall = roundBand(
        CRITERIA.reduce((sum, key) => sum + bands[key], 0) / CRITERIA.length
    );

    const tone = resolveMode(mode);
    if (typeof raw.feedback !== "string" || !raw.feedback.trim()) {
        throw new Error(`AI javobida '${tone}' feedback topilmadi.`);
    }
    const feedback = { [tone]: raw.feedback.trim() };

    // Ko'rsatkichlar ekranga raqam bo'lib chiqadi — manfiy yoki bema'ni
    // qiymat kelsa nolga tushiramiz, model "taxminan" yozib qo'ymasin.
    const metrics = {};
    for (const key of METRIC_KEYS) {
        const value = Number(raw.metrics?.[key]);
        metrics[key] = Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
    }

    const vocabulary = (Array.isArray(raw.vocabulary) ? raw.vocabulary : [])
        .filter((item) => item && item.instead && item.use)
        .slice(0, 3);

    return {
        transcript: typeof raw.transcript === "string" ? raw.transcript.trim() : "",
        bands,
        evidence: raw.evidence && typeof raw.evidence === "object" ? raw.evidence : {},
        corrections: Array.isArray(raw.corrections) ? raw.corrections.slice(0, 3) : [],
        vocabulary,
        metrics,
        followUp: typeof raw.followUp === "string" ? raw.followUp.trim() : "",
        feedback,
    };
}

module.exports = {
    CRITERIA,
    METRIC_KEYS,
    // Ovoz va til qoidalari Multilevel rubrikasida ham AYNAN shu holda
    // ishlatiladi (`multilevelSpeakingRubric.js`) — feedback ikkala imtihonda
    // bir xil o'qiladi, faqat baholash shkalasi boshqacha.
    SPEECH_RULES,
    LANG_RULES,
    FEEDBACK_MODES,
    DEFAULT_MODE,
    RESPONSE_SCHEMA,
    TONE_SCHEMA,
    resolveMode,
    buildPrompt,
    buildTonePrompt,
    buildPersonalBlock,
    roundBand,
    normalizeEvaluation,
};
