// functions/analyzeSpeaking.js
const admin = require("firebase-admin");
const OpenAI = require("openai").default;
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const os = require("os");


/**
 * O'quvchining ovozli javobini Whisper bilan matnga o'girib, ChatGPT bilan IELTS baholaydi.
 * @param {object} data - { audioUrl, podcastTitle, podcastTranscript, attemptId }
 */
async function analyzeSpeaking(data, context) {
    if (!context.auth) throw new Error("Autentifikatsiya talab qilinadi.");

    const { audioUrl, podcastTitle, podcastTranscript, attemptId } = data;
    if (!audioUrl || !attemptId) throw new Error("audioUrl va attemptId talab qilinadi.");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        // 1. Audio ni temp faylga yuklash
        const response = await fetch(audioUrl);
        const tmpFile = path.join(os.tmpdir(), `speaking_${attemptId}.webm`);
        fs.writeFileSync(tmpFile, await response.buffer());

        // 2. Whisper — kontekst prompt bilan gallyusinatsiyani kamaytirish
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tmpFile),
            model: "whisper-1",
            language: "en",
            prompt: podcastTitle
                ? `The speaker is summarizing a podcast titled "${podcastTitle}". Topics discussed include: ${podcastTranscript?.substring(0, 200) || "general topics"}.`
                : undefined,
        });

        fs.unlinkSync(tmpFile);
        const spokenText = transcription.text;

        // 3. ChatGPT — IELTS baholash (strict JSON mode)
        const evaluationPrompt = `You are an IELTS Speaking examiner. Evaluate the following spoken summary of a podcast.

Podcast context: "${podcastTitle || 'N/A'}"
Student's spoken text: "${spokenText}"

Evaluate strictly on IELTS criteria. Return ONLY valid JSON (no markdown, no extra text):
{
  "fluency": <number 1.0-9.0, step 0.5>,
  "lexical": <number 1.0-9.0, step 0.5>,
  "grammar": <number 1.0-9.0, step 0.5>,
  "pronunciation": <number 1.0-9.0, step 0.5>,
  "overall": <average of above, rounded to nearest 0.5>,
  "feedback": {
    "fluency": "<1 sentence specific feedback>",
    "lexical": "<1 sentence specific feedback>",
    "grammar": "<1 sentence specific feedback>",
    "pronunciation": "<1 sentence specific feedback>"
  },
  "transcript": "${spokenText.replace(/"/g, '\\"')}"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: evaluationPrompt }],
            temperature: 0.3,
        });

        const scoreData = JSON.parse(completion.choices[0].message.content);

        // Schema validation
        const requiredKeys = ["fluency", "lexical", "grammar", "pronunciation", "overall"];
        for (const key of requiredKeys) {
            if (typeof scoreData[key] !== "number") {
                throw new Error(`AI javobi noto'g'ri: '${key}' maydoni topilmadi.`);
            }
            // 0.5 ga yaxlitlash
            scoreData[key] = Math.round(scoreData[key] * 2) / 2;
        }

        return { success: true, scores: scoreData };
    } catch (error) {
        console.error("Speaking analysis error:", error);
        throw new Error(`Nutq tahlil xatosi: ${error.message}`);
    }
}

module.exports = { analyzeSpeaking };
