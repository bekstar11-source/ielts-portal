// functions/multilevelSpeakingRubric.js
// Multilevel Speaking baholash uchun deskriptorlar, prompt va JSON sxema.
//
// IELTS rubrikasidan (`speakingRubric.js`) ALOHIDA turadi, chunki chiqadigan
// narsa boshqacha: u yerda 0-9 band, bu yerda CEFR darajasi. Ammo ovoz, til
// va shaxsiylashtirish qoidalari o'sha yerdan OLINADI — o'quvchi ikkala
// imtihonda ham bir xil ohangdagi feedback eshitishi kerak.

const {
    METRIC_KEYS,
    SPEECH_RULES,
    LANG_RULES,
    FEEDBACK_MODES,
    DEFAULT_MODE,
    resolveMode,
    buildPersonalBlock,
} = require("./speakingRubric");

const {
    ML_LEVELS,
    ML_LEVEL_RANGE,
    ML_CRITERIA,
    normalizeMlLevel,
    clampScoreToMlLevel,
    aggregateMlSpeaking,
} = require("./multilevelSpeaking");

/**
 * Deskriptorlar.
 *
 * B1, B2 va C1 — Multilevel uchun tayyorlangan rasmiy bo'lmagan, CEFR ga
 * asoslangan tavsiflar. A2 va below_A2 esa BIZ yozganmiz va ular shunchaki
 * to'liqlik uchun emas: enum'da pastki chegara bo'lmasa, model B1 dan past
 * gapirgan nomzodni ham majburan B1 ga "ko'taradi" — ya'ni yolg'on baho
 * beradi. Eng zaif o'quvchi aynan birinchi kuni keladi.
 */
const DESCRIPTORS = {
    fluency: {
        C1: [
            "Sustains long and complex stretches of speech at a natural pace, without strain.",
            "Hesitates only where a native speaker would; never gropes for words or ideas.",
            "Uses linking devices and discourse markers (moreover, nevertheless, in terms of) fully, naturally and accurately.",
        ],
        B2: [
            "Generally fluent, with occasional hesitation while searching for a word or a structure.",
            "Develops ideas in a logically connected sequence.",
            "Uses linking devices well, but may repeat them or place one awkwardly.",
        ],
        B1: [
            "Speaks at a slow or moderate pace with frequent, clearly audible pauses to shape an idea.",
            "Can join short simple sentences, but coherence breaks down over a longer turn.",
            "Uses only the simplest connectives (and, but, because, so), and few of them.",
        ],
        A2: [
            "Produces short, isolated utterances; long pauses even on familiar topics.",
            "Frequently abandons an utterance before finishing it.",
            "Little or no linking — ideas are listed rather than connected.",
        ],
        below_A2: [
            "Cannot sustain speech: isolated words or memorised fragments separated by long silences.",
            "Communication breaks down; the listener has to carry the exchange.",
        ],
    },
    lexical: {
        C1: [
            "Uses a wide and flexible vocabulary that covers the topic fully.",
            "Uses less common words, idiomatic expressions and collocations precisely and almost without error.",
            "Paraphrases smoothly and imperceptibly when a word does not come.",
        ],
        B2: [
            "Has enough varied vocabulary to explain a position clearly on a range of topics.",
            "Attempts less common and idiomatic items, with minor errors of meaning or collocation.",
            "Paraphrases successfully and keeps the exchange going.",
        ],
        B1: [
            "Vocabulary is sufficient for familiar, everyday topics but strains on unfamiliar or abstract ones.",
            "Frequent errors of word choice; the same words are repeated throughout.",
            "Attempts to paraphrase, but often unsuccessfully or unclearly.",
        ],
        A2: [
            "Vocabulary limited to concrete everyday needs — family, home, routine.",
            "Cannot discuss anything outside the immediate and familiar.",
            "Paraphrase is essentially absent; the candidate stops when the word is missing.",
        ],
        below_A2: [
            "A handful of memorised words and phrases.",
            "Often unable to name basic everyday things.",
        ],
    },
    grammar: {
        C1: [
            "Uses a wide range of complex structures freely and naturally.",
            "The majority of sentences are error-free.",
            "Only the kind of slip a native speaker also makes.",
        ],
        B2: [
            "Uses a mix of simple and complex structures effectively.",
            "Makes some errors in complex sentences, but they never obstruct understanding.",
            "Self-corrects from time to time.",
        ],
        B1: [
            "Relies on simple structures and makes errors even in those.",
            "Attempts complex sentences (conditionals, passives) but makes serious errors in them.",
            "Grammar errors sometimes make the intended meaning hard to follow.",
        ],
        A2: [
            "Only memorised simple structures; systematic errors in basic tense and word order.",
            "Errors often obscure meaning; no genuine attempt at complex sentences.",
        ],
        below_A2: [
            "No control of structure beyond isolated words and fixed formulas.",
        ],
    },
    pronunciation: {
        C1: [
            "Clear articulation; uses word stress and intonation skilfully to shape or sharpen meaning.",
            "L1 influence is minimal and causes the listener no difficulty.",
            "All words and sounds are readily intelligible.",
        ],
        B2: [
            "Generally intelligible; word stress and intonation are mostly correct but not consistently so.",
            "L1 accent is noticeable but does not disrupt communication.",
            "Some sounds in harder words are wrong, without changing meaning.",
        ],
        B1: [
            "Frequent pronunciation errors; word stress and intonation are visibly weak.",
            "Strong L1 influence makes some words or whole sentences hard to understand.",
            "The listener must concentrate continuously to follow.",
        ],
        A2: [
            "Heavy L1 influence; common words are frequently mispronounced.",
            "Stress and intonation are flat or absent; the listener often needs repetition.",
        ],
        below_A2: [
            "Largely unintelligible even to a listener used to this accent.",
        ],
    },
};

/**
 * Uch qism — vazifa, vaqt va shu qismda nimani ko'rish mumkinligi.
 *
 * Matnlar rasmiy interfeys ko'rsatmalaridan olingan. Uchala qism uch xil
 * vazifa, shuning uchun "javob qisqa" degan hukm ham har qismda boshqacha
 * o'lchanadi: 30 soniyalik savolda 40 so'z yetarli, 2 daqiqalik javobda esa
 * bu vazifaning bajarilmagani.
 */
const PARTS = {
    1: {
        name: "Part 1 — six short questions",
        task:
            "Three short personal questions (food, home town, weather and the like), then three " +
            "questions about a pair of photographs shown on screen. Each answer is recorded " +
            "separately with 30 seconds of speaking time, except the first photo question, which " +
            "gets 45. There is no examiner and no interruption: the candidate hears a tone and " +
            "speaks alone. In 30 seconds a complete answer is two or three developed sentences — " +
            "judge length against that, not against a two-minute turn.",
    },
    2: {
        name: "Part 2 — one photograph, three questions, one answer",
        task:
            "A single photograph is shown with three written questions under it. The candidate " +
            "gets 1 minute to think and then 2 minutes to answer ALL THREE questions in one " +
            "uninterrupted turn. Covering all three is the task itself: an answer that develops " +
            "the first question beautifully and never reaches the third has not completed it, " +
            "however good the language was.",
    },
    3: {
        name: "Part 3 — balanced argument from a pros and cons table",
        task:
            "A topic is shown with two lists, Pros and Cons. The candidate must choose TWO items " +
            "from EACH list and present a balanced argument covering both sides, with 1 minute to " +
            "prepare and 2 minutes to speak. The task has a shape: both sides represented, two " +
            "points each, and the sides actually weighed against each other rather than listed " +
            "one after the other. Taking a side and arguing only that side is a failure of the " +
            "task, no matter how fluent the delivery.",
    },
};

/**
 * Qism uchun vazifa bajarilishini baholash qoidalari.
 *
 * IELTS rubrikasida bunday narsa yo'q — u yerda savol bitta va oddiy. Bu
 * yerda 2 va 3-qismning o'z tuzilishi bor va aynan shu narsa o'quvchini
 * yiqitadi: til yaxshi, lekin uchinchi savolga yetib bormagan.
 */
const TASK_RULES = {
    1: `The clock is short. Do not penalise the candidate for not developing an answer the way a
two-minute turn would allow. A one-word answer is still under-length. For the photo questions,
the answer must actually be about what is in the pictures — a generic speech about the topic
that would work without the photographs shows the candidate did not engage with the task.`,
    2: `Check all three questions. State in the fluency or lexical evidence which of the three the
candidate covered and which they did not. If one is missing entirely, Fluency and Coherence
cannot go above B1 — the turn was not organised to fit the task. If the candidate stopped well
before the two minutes, say so.`,
    3: `Check the shape of the argument. The candidate had to take two points from the Pros list
and two from the Cons list. Count what they actually used. If they covered only one side, or used
fewer than two points from a side, Fluency and Coherence cannot go above B1, because the task was
to build a balanced argument and it was not built. Also look for whether the two sides were
weighed against each other with contrastive language (however, on the other hand, whereas) or
merely listed in sequence — that contrast is what separates B2 from B1 here.`,
};

/** Deskriptorlarni promptga tushadigan matnga aylantiradi. */
function renderDescriptors() {
    const CRITERION_TITLE = {
        fluency: "FLUENCY AND COHERENCE",
        lexical: "LEXICAL RESOURCE",
        grammar: "GRAMMATICAL RANGE AND ACCURACY",
        pronunciation: "PRONUNCIATION",
    };

    // Yuqoridan pastga — model eng yuqori darajani birinchi o'qiydi va
    // nomzodni unga qarab pastlatadi, aks holda B1 dan boshlab ko'tarish
    // "hammaga B1" ga aylanib ketadi.
    const levels = [...ML_LEVELS].reverse();

    return ML_CRITERIA.map((key) => {
        const body = levels
            .map((level) => {
                const lines = DESCRIPTORS[key][level].map((line) => `  - ${line}`).join("\n");
                const [min, max] = ML_LEVEL_RANGE[level];
                return `${level} (${min}-${max}):\n${lines}`;
            })
            .join("\n");
        return `${CRITERION_TITLE[key]}\n${body}`;
    }).join("\n\n");
}

const DESCRIPTOR_BLOCK = renderDescriptors();

/** Sxemada takrorlanadigan bitta mezon bloki. */
const criterionSchema = {
    type: "object",
    properties: {
        level: { type: "string", enum: ML_LEVELS },
        score: { type: "number" },
        evidence: { type: "string" },
    },
    required: ["level", "score", "evidence"],
};

const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        transcript: { type: "string" },
        criteria: {
            type: "object",
            description: "Har mezon: deskriptor bo'yicha daraja, 0-100 ball va audiodan dalil.",
            properties: {
                fluency: criterionSchema,
                lexical: criterionSchema,
                grammar: criterionSchema,
                pronunciation: criterionSchema,
            },
            required: ML_CRITERIA,
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
            description: "Keyingi darajaga olib chiqadigan, shu javobga mos ibora almashtirishlari.",
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
            properties: {
                wordCount: { type: "number" },
                speakingRateWpm: { type: "number" },
                fillerCount: { type: "number" },
                longPauses: { type: "number" },
                selfCorrections: { type: "number" },
            },
            required: ["wordCount", "speakingRateWpm", "fillerCount", "longPauses"],
        },
        followUp: { type: "string" },
        feedback: { type: "string" },
    },
    required: [
        "transcript",
        "criteria",
        "corrections",
        "vocabulary",
        "metrics",
        "followUp",
        "feedback",
    ],
};

/**
 * IELTS qoidalarini bekor qiluvchi blok.
 *
 * `LANG_RULES` va ohang tavsiflari IELTS uchun yozilgan va ichida "band"
 * so'zi bor. Ular o'zgartirilmaydi (IELTS moduli ishlab turibdi), o'rniga
 * shu blok promptning OXIRIDA turadi va ustun qoladi.
 */
const EXAM_OVERRIDE = `THIS EXAM IS NOT IELTS. Wherever the instructions below mention IELTS, bands,
or band scores, they do not apply here:
- Never say the word "band". There are no bands in this exam, only levels.
- Never read the 0-100 score out loud in the feedback. It is an internal number for the
  progress chart. Speak about the LEVEL and about what is missing to reach the next one.
- Level names are read aloud as letters and numbers: "B two", "C one". In Uzbek feedback keep
  them exactly as they are, "B2", "C1" — an Uzbek teacher says them in English.`;


/**
 * Savol bloki — qismga qarab boshqacha.
 *
 * Rasmlar promptga MATN sifatida tushmaydi: ular chaqiruvga alohida
 * `inlineData` bo'lib boradi (`evaluateSpeaking`). Bu yerda modelga
 * shunchaki rasm BORLIGI aytiladi, chunki "rasmda nima ko'ryapsiz" degan
 * savolga bahoni rasmni ko'rmasdan qo'yib bo'lmaydi.
 */
function buildContextBlock({ question, bullets, prosCons, hasPhotos }) {
    const lines = [];

    if (hasPhotos) {
        lines.push(
            "The photograph or photographs the candidate was looking at are attached to this " +
                "request. Judge whether the answer is actually about them."
        );
    }

    if (question) lines.push(`Question shown: "${question}"`);

    if (Array.isArray(bullets) && bullets.length > 0) {
        lines.push(
            `The three questions under the photograph, all of which had to be answered in the ` +
                `one turn:\n${bullets.map((b, i) => `  ${i + 1}. ${b}`).join("\n")}`
        );
    }

    if (prosCons && (prosCons.pros?.length || prosCons.cons?.length)) {
        const side = (items) => (items || []).map((item) => `  - ${item}`).join("\n");
        lines.push(
            `Topic: ${prosCons.topic || question || ""}\n` +
                `PROS list shown on screen:\n${side(prosCons.pros)}\n` +
                `CONS list shown on screen:\n${side(prosCons.cons)}\n` +
                `The candidate had to use two items from each list.`
        );
    }

    return lines.join("\n\n");
}

/**
 * @param {{ question: string, part: 1|2|3, cueCard?: string,
 *           feedbackLang?: 'uz'|'en', mode?: string,
 *           studentName?: string|null, history?: object|null }} ctx
 */
function buildPrompt({
    question,
    part = 1,
    bullets,
    prosCons,
    hasPhotos = false,
    feedbackLang = "uz",
    mode,
    studentName,
    history,
}) {
    const langRule = LANG_RULES[feedbackLang] || LANG_RULES.uz;
    const tone = resolveMode(mode);
    const personal = buildPersonalBlock({ studentName, history });
    const partInfo = PARTS[part] || PARTS[1];
    const contextBlock = buildContextBlock({ question, bullets, prosCons, hasPhotos });

    return `You are a certified examiner for the Uzbek Multilevel English exam. You are listening
to the audio of ONE candidate answer from ${partInfo.name}.

What this part demands: ${partInfo.task}

${contextBlock}

LISTEN TO THE AUDIO ITSELF — do not judge from the transcript alone. Pronunciation and Fluency
must be scored from what you HEAR: hesitation and filler patterns, self-correction, pace, word
and sentence stress, intonation, connected speech, and intelligibility.

HOW TO SCORE
For each of the four criteria, award a CEFR level using the descriptors below, then place the
candidate inside that level with a 0-100 score.
- The level comes first and comes from the descriptors. The score only says where inside that
  level the candidate sits, so it MUST fall inside the level's own range shown below.
- Award a level only when the answer actually shows the behaviour described. Do not award an
  upper level because the candidate "seems close" to it.
- Judge each criterion independently. A candidate is routinely B2 on vocabulary and B1 on
  pronunciation; do not flatten the four to one number.
- Accent is NOT a fault. Pronunciation measures intelligibility and prosody, never how close
  the speaker sounds to a native. Lower it only when meaning is actually obscured.
- An answer far too short for the task caps Fluency and Lexical Resource at B1, however good
  the language in it was — the task itself was not completed.
- Part 1 rarely gives enough room to demonstrate C1. Award C1 there only if the language itself
  genuinely reaches it, not because a short answer contained no errors.
- If the audio is silent, unintelligible, or off-topic, return below_A2 with a score of 0 on
  every criterion and say so plainly. Never invent a transcript.

THIS PART'S TASK
${TASK_RULES[part] || TASK_RULES[1]}

DESCRIPTORS

${DESCRIPTOR_BLOCK}

FIELDS
"transcript": the candidate's own words in English, verbatim. Never translated.
"criteria.<name>.evidence": one sentence naming what you actually heard that put them at this
level — a quoted phrase, a counted pattern, a specific sound. Not a restatement of the
descriptor.
"corrections": 1-3 items taken verbatim from what the candidate said. Skip if there are none.
"said" and "better" stay in English; "why" and every "evidence" string follow the feedback
language rule below, because the student reads them on screen.
"vocabulary": 2-3 upgrades that fit THIS answer — a plain word or phrase the candidate actually
used ("instead"), the stronger alternative that would move this criterion up one level ("use"),
and one short English sentence using it on this very topic ("example"). All three stay in
English. Skip an item rather than inventing an upgrade the candidate had no chance to use.
Never suggest rare or bookish words a speaker would not say out loud.
"metrics": measured from the audio, not estimated from a feeling. wordCount is words actually
spoken; speakingRateWpm is words per minute over the speaking time; fillerCount is audible
fillers as heard; longPauses is silences of roughly two seconds or more inside the answer;
selfCorrections is the number of restarts or repairs. These numbers are shown to the student
as they are, so they must be honest. If the audio is too short to measure, return zeros.
"followUp": this exam has no examiner and no follow-up question, so this field is for PRACTICE
only: the one question that would push this candidate hardest on the weakness you just found,
in English, one sentence, growing out of what they actually said. Not a generic next question
from the topic list.
"feedback": the spoken verdict in ONE voice, described below. It must agree with the levels you
awarded — a student who hears the feedback and then looks at the levels must see the same story.

${FEEDBACK_MODES[tone].style}
${personal ? `\n${personal}\n` : ""}
${langRule}

${SPEECH_RULES}

${EXAM_OVERRIDE}`;
}

/**
 * Model javobini tekshiradi va normallashtiradi.
 *
 * Model daraja bilan ballni zid qaytarishi mumkin ("B2" deb, 45 ball berib).
 * `clampScoreToMlLevel` bunday holatda darajani ustun qo'yadi, `aggregate`
 * esa yakuniy natijani eng zaif mezon bo'yicha chiqaradi — ikkalasi ham
 * klient bilan bir xil fayldan (`multilevelSpeaking.js`) keladi.
 */
function normalizeEvaluation(raw, mode) {
    if (!raw || typeof raw !== "object") return null;

    const criteria = {};
    for (const key of ML_CRITERIA) {
        const item = raw.criteria?.[key] || {};
        const level = normalizeMlLevel(item.level);
        if (!level) return null;
        criteria[key] = {
            level,
            score: clampScoreToMlLevel(item.score, level),
            evidence: typeof item.evidence === "string" ? item.evidence.trim() : "",
        };
    }

    const overall = aggregateMlSpeaking(criteria);
    if (!overall) return null;

    // `aggregate` faqat daraja va ballni qaytaradi (u klientda ham ishlaydi va
    // matnni bilmaydi) — dalilni qaytarib qo'shamiz, u ekranda ko'rsatiladi.
    for (const key of ML_CRITERIA) {
        overall.criteria[key].evidence = criteria[key].evidence;
    }

    const corrections = (Array.isArray(raw.corrections) ? raw.corrections : [])
        .filter((item) => item && item.said && item.better)
        .slice(0, 3)
        .map((item) => ({
            said: String(item.said).trim(),
            better: String(item.better).trim(),
            why: String(item.why || "").trim(),
        }));

    const vocabulary = (Array.isArray(raw.vocabulary) ? raw.vocabulary : [])
        .filter((item) => item && item.instead && item.use)
        .slice(0, 3)
        .map((item) => ({
            instead: String(item.instead).trim(),
            use: String(item.use).trim(),
            example: String(item.example || "").trim(),
        }));

    const metrics = {};
    for (const key of METRIC_KEYS) {
        const n = Number(raw.metrics?.[key]);
        metrics[key] = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    }

    return {
        examType: "multilevel",
        transcript: typeof raw.transcript === "string" ? raw.transcript.trim() : "",
        criteria: overall.criteria,
        level: overall.level,
        score: overall.score,
        weakest: overall.weakest,
        corrections,
        vocabulary,
        metrics,
        followUp: typeof raw.followUp === "string" ? raw.followUp.trim() : "",
        // IELTS bilan BIR XIL shakl: kaliti ohang nomi bo'lgan obyekt.
        // Satr qaytarilsa, ohangni almashtirish (`speakingFeedbackTone`) va
        // javobni saqlash mantig'i ikkalasi ham buziladi.
        feedback: { [resolveMode(mode)]: typeof raw.feedback === "string" ? raw.feedback.trim() : "" },
    };
}

module.exports = {
    DESCRIPTORS,
    PARTS,
    TASK_RULES,
    RESPONSE_SCHEMA,
    DEFAULT_MODE,
    buildPrompt,
    normalizeEvaluation,
};
