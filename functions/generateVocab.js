// functions/generateVocab.js
const OpenAI = require("openai").default;


/**
 * Podcast transskriptidan B1/B2 darajadagi lug'atni AI yordamida generatsiya qiladi.
 * @param {object} data - { transcript, level: 'B1'|'B2', count: number, hintWords: string }
 */
async function generateVocab(data, context) {
    if (!context.auth) throw new Error("Autentifikatsiya talab qilinadi.");

    const { transcript, level = "B1", count = 10, hintWords = "" } = data;
    if (!transcript) throw new Error("transcript talab qilinadi.");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Podcast'ning "vocabulary review" qismidagi so'zlar — albatta kiritilishi SHART
    let hintSection = "";
    if (hintWords && hintWords.trim()) {
        hintSection = `

MANDATORY WORDS (ALL must be included — these are the podcast's own vocabulary review words):
${hintWords}
You MUST include every single one of these words/phrases. They take priority over everything else.`;
    }

    // Qiyinlik darajasi bo'yicha yo'riqnoma
    const levelGuide = {
        B1: "B1-B2 (upper-intermediate). Avoid very basic words. Target useful but challenging words a learner needs to expand their vocabulary.",
        B2: "B2-C1 (upper-intermediate to advanced). Focus on academic, professional, idiomatic, and sophisticated vocabulary.",
        C1: "C1-C2 (advanced). Include complex collocations, idioms, phrasal verbs, and domain-specific terms.",
    }[level] || "B2-C1. Focus on non-trivial, useful academic or professional vocabulary.";

    const prompt = `You are an expert IELTS vocabulary coach. Analyze the podcast transcript below and extract exactly ${count} vocabulary items for ${level} level learners.

DIFFICULTY: ${levelGuide}

STRICTLY AVOID these types of words (they are too simple):
- Articles/conjunctions/prepositions: a, an, the, and, but, or, so, in, on, at, of, to, for
- Very common verbs: make, take, give, come, go, get, have, do, say, know, think, see, look
- Very common adjectives: good, bad, big, small, new, old, great, nice, right
- Any word that a pre-intermediate (A2/B1) student already knows
- Do NOT pick: people, thing, things, time, year, years, way, work (noun), life (unless in a specific collocation)

PREFER:
- Multi-word phrases, idioms, collocations, and phrasal verbs (e.g. "reach for the stars", "reading people")
- Domain-specific terms (e.g. "dyslexia", "superpower", "empowering")
- Academic/professional vocabulary (e.g. "collaborate", "entrepreneur", "contribute")
- Words with nuanced meanings that students benefit from learning explicitly
${hintSection}

Podcast Transcript:
"""
${transcript.substring(0, 4000)}
"""

Return ONLY valid JSON (no markdown, no extra text):
{
  "vocabulary": [
    {
      "word": "<word or multi-word phrase>",
      "definition": "<clear, useful definition in English — explain nuance and usage context>",
      "example": "<exact sentence from the transcript containing this word>",
      "testSentence": "<NEW original sentence NOT from transcript, with {{gap}} replacing the word. Must be natural and contextually correct.>"
    }
  ]
}

Strict rules:
- Include ALL mandatory words (if any) — non-negotiable
- Fill remaining slots with the most challenging and useful words/phrases from the transcript
- Each testSentence must be completely NEW (not from transcript) with exactly one {{gap}}
- Do NOT repeat words
- Return exactly ${count} items`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3, // Kamroq tasodifiy — aniqroq, qat'iyroq natija
        });

        const result = JSON.parse(completion.choices[0].message.content);

        // Validate
        if (!Array.isArray(result.vocabulary)) {
            throw new Error("AI javobi noto'g'ri: vocabulary array topilmadi.");
        }

        // Ensure each has required fields
        const validated = result.vocabulary.map((item, i) => {
            if (!item.word || !item.definition || !item.testSentence) {
                throw new Error(`${i + 1}-so'z ma'lumotlari to'liq emas.`);
            }
            if (!item.testSentence.includes("{{gap}}")) {
                item.testSentence = item.testSentence.replace(
                    new RegExp(`\\b${item.word}\\b`, "i"),
                    "{{gap}}"
                );
            }
            return item;
        });

        return { success: true, vocabulary: validated };
    } catch (error) {
        console.error("Vocab generation error:", error);
        throw new Error(`Lug'at generatsiya xatosi: ${error.message}`);
    }
}

module.exports = { generateVocab };
