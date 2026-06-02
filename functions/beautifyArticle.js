// functions/beautifyArticle.js
const OpenAI = require("openai").default;

/**
 * Maqolani berilgan IELTS darajasiga moslab chiroyli qiladi,
 * paragraflarga ajratadi va lug'atni generatsiya qiladi.
 * @param {object} data - { text, level }
 */
async function beautifyArticle(data, context) {
    if (!context.auth) throw new Error("Autentifikatsiya talab qilinadi.");

    const { text, level = "B2" } = data;
    if (!text) throw new Error("text talab qilinadi.");

    const apiKey = (process.env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, '');
    const openai = new OpenAI({ apiKey });

    const levelGuide = {
        B1: "B1-B2 (intermediate). Use simpler grammar and vocabulary. Keep sentences relatively short and clear, but suitable for IELTS learners.",
        B2: "B2-C1 (upper-intermediate). Keep natural complexity, using academic, professional, and sophisticated vocabulary.",
        C1: "C1-C2 (advanced). Use complex structures, advanced academic words, idioms, collocations, and natural native phrasing.",
    }[level] || "B2-C1.";

    const prompt = `You are an expert IELTS content editor. Your task is to format, beautify, and adapt the raw English text provided below for students learning English at the ${level} level.

Target IELTS Difficulty level: ${level} (${levelGuide})

STRICT RULES:
1. Adaptation & Formatting:
   - Beautify the text: correct any typos, grammatical errors, and sentence structures.
   - Format the text as a sequence of clean headings and paragraphs. 
   - Each heading or paragraph should represent a distinct, readable block of text.
   - Wrap parts of the text with standard inline HTML tags (e.g. <strong>...</strong> or <em>...</em>) ONLY if they highlight key words, concepts, or structural emphasis.
   - Do NOT wrap paragraphs in <p> tags. Return the text content directly inside each block.
   
2. Vocabulary Generation:
   - Extract exactly 4 to 8 key vocabulary words or collocations from the adapted text that are relevant and challenging for the selected level (${level}).
   - For each word/phrase, provide:
     * "word": The word/phrase as it appears.
     * "translation": Precise Uzbek translation reflecting its meaning in this context.
     * "definition": Clear, simple English definition explaining its meaning and usage.
     * "example": An example sentence showing how to use the word in context.
     * "partOfSpeech": The part of speech (e.g., adjective, noun, verb, adverb).

Raw Text to Process:
"""
${text}
"""

Return ONLY a valid JSON object matching this schema (do NOT wrap it in any markdown blocks like \`\`\`json):
{
  "content": [
    {
      "type": "heading" | "paragraph",
      "text": "<Formatted text of this block, e.g. 'Science has shown that <strong>exercise</strong> improves cognitive function.'>"
    }
  ],
  "vocabulary": [
    {
      "word": "<word>",
      "translation": "<Uzbek translation>",
      "definition": "<English definition>",
      "example": "<Example sentence>",
      "partOfSpeech": "<Part of speech>"
    }
  ]
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a helpful IELTS editor. Return ONLY a JSON object. No markdown formatting, no backticks." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
        });

        const result = JSON.parse(completion.choices[0].message.content);

        if (!Array.isArray(result.content)) {
            throw new Error("AI javobida 'content' massivi topilmadi.");
        }
        if (!Array.isArray(result.vocabulary)) {
            result.vocabulary = [];
        }

        return {
            success: true,
            content: result.content,
            vocabulary: result.vocabulary
        };
    } catch (error) {
        console.error("Error beautifying article:", error);
        throw new Error(`AI matn tahririda xato: ${error.message}`);
    }
}

module.exports = { beautifyArticle };
