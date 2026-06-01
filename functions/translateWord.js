// functions/translateWord.js
const OpenAI = require("openai").default;

/**
 * So'z uchun AI tarjimasi va izohini generatsiya qiladi.
 * @param {object} data - { word, contextSentence }
 */
async function translateWord(data, context) {
    if (!context.auth) throw new Error("Autentifikatsiya talab qilinadi.");

    const { word, contextSentence } = data;
    console.log(`Translating word: ${word}, Key length: ${process.env.OPENAI_API_KEY?.length}, Start: ${process.env.OPENAI_API_KEY?.substring(0, 7)}`);
    
    if (!word) throw new Error("word talab qilinadi.");

    const apiKey = (process.env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, '');
    const openai = new OpenAI({ apiKey });

    const prompt = `
    Analyze the English word "${word}" within the following context sentence: "${contextSentence || 'No specific context provided, use general meaning.'}".
    Return a JSON object with EXACTLY these keys:
    - "definition": A concise English explanation of what the word means in this specific context.
    - "example": A good, clear English example sentence showing how to use the word.
    - "translation": The precise Uzbek translation of the word reflecting its meaning in this context.
    - "phonetics": The phonetic IPA transcription of the word, e.g., "/kənˈtɛkst/".
    - "partOfSpeech": The part of speech of the word in this context (e.g., noun, verb, adjective, adverb).
    - "synonyms": An array of up to 4 English synonyms of this word that are relevant in this context.
    - "antonyms": An array of up to 4 English antonyms of this word that are relevant in this context.
    - "collocations": An array of up to 4 common English collocations or phrases using this word.
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a helpful dictionary assistant. Return ONLY a JSON object. No markdown, no backticks." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
        });

        const result = JSON.parse(completion.choices[0].message.content);
        return { success: true, ...result };
    } catch (error) {
        console.error("AI Translation error:", error);
        throw new Error(`Tarjima xatosi: ${error.message}`);
    }
}

module.exports = { translateWord };
