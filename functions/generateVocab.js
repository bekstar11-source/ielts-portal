// functions/generateVocab.js
const OpenAI = require("openai").default;


/**
 * Podcast transskriptidan B1/B2 darajadagi lug'atni AI yordamida generatsiya qiladi.
 * @param {object} data - { transcript, level: 'B1'|'B2', count: number }
 */
async function generateVocab(data, context) {
    if (!context.auth) throw new Error("Autentifikatsiya talab qilinadi.");

    const { transcript, level = "B1", count = 10, hintWords = "" } = data;
    if (!transcript) throw new Error("transcript talab qilinadi.");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let hintInstructions = "";
    if (hintWords.trim()) {
        hintInstructions = `\nCRITICAL REQUIREMENT: You MUST include the following specific words/phrases in your generated list of ${count} words: ${hintWords}. Find them in the transcript. The rest of the words can be chosen by you to reach exactly ${count} words.`;
    }

    const prompt = `You are an IELTS vocabulary teacher. From the following podcast transcript, extract exactly ${count} key vocabulary words appropriate for ${level} level IELTS learners.${hintInstructions}

Transcript:
"${transcript.substring(0, 3000)}"

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "vocabulary": [
    {
      "word": "<the word or phrase>",
      "definition": "<clear, simple definition in English>",
      "example": "<original sentence from the transcript containing this word>",
      "testSentence": "<A NEW sentence NOT from the transcript where the word is replaced with {{gap}}, e.g. 'The scientist made a significant {{gap}} in renewable energy.'>"
    }
  ]
}

Rules:
- Choose words that are academically or professionally useful
- Avoid proper nouns, very easy words (a, the, is), and very advanced C2+ words
- Each testSentence must be NEW and contextually logical
- testSentence must contain exactly one {{gap}} placeholder`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
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
                // Fallback: wrap the word with {{gap}} manually
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
