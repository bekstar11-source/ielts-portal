const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');

const openaiLocal = null; // We will initialize it inside the function to avoid deployment errors.

exports.checkWriting = async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tish kerak.');
    }

    const { resultId } = data;
    if (!resultId) {
        throw new functions.https.HttpsError('invalid-argument', 'resultId taqdim etilmagan.');
    }

    try {
        const db = admin.firestore();
        
        // 2. Fetch Result
        const resultDoc = await db.collection('results').doc(resultId).get();
        if (!resultDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Natija topilmadi.');
        }
        const resultData = resultDoc.data();

        // 3. Fetch Test Data
        const testDoc = await db.collection('tests').doc(resultData.testId).get();
        if (!testDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Test topilmadi.');
        }
        const testData = testDoc.data();

        // Extract Prompts and Images
        let prompt1 = "";
        let prompt2 = "";
        let image1 = null;
        let image2 = null;
        if (testData.writingTasks && testData.writingTasks.length > 0) {
            const t1 = testData.writingTasks.find(t => t.id === 1);
            const t2 = testData.writingTasks.find(t => t.id === 2);
            prompt1 = t1?.prompt || "";
            image1 = t1?.image || t1?.image_url || null;
            prompt2 = t2?.prompt || "";
            image2 = t2?.image || t2?.image_url || null;
        } else {
            prompt1 = testData.task1 || "";
            image1 = testData.image_url || null;
            prompt2 = testData.task2 || testData.passage || "";
        }

        // Extract Answers
        // Some legacy data might use 'essay' or 'task1' at root or 'userAnswers.task1'
        let answer1 = resultData.userAnswers?.task1 || resultData.task1 || resultData.writingAnswers?.task1 || "";
        let answer2 = resultData.userAnswers?.task2 || resultData.task2 || resultData.writingAnswers?.task2 || resultData.essay || "";

        if (!answer1 && !answer2) {
            throw new functions.https.HttpsError('failed-precondition', 'O\'quvchi javobi topilmadi.');
        }

        // 4. Construct System Prompt
        const systemPrompt = `You are a highly experienced IELTS Writing examiner.
Your task is to review an IELTS Writing submission from a student.
You must accurately grade it based on the official IELTS band descriptors: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy.

CRITICAL INSTRUCTION FOR TASK 1: If an image (chart, graph, diagram) is provided, you MUST analyze it carefully. 
Verify if the student accurately described the trends, highs, lows, and numbers present in the image. Penalize inaccuracies heavily under 'Task Achievement'.

You will identify ALL specific errors in the text including:
1. Grammatical errors (tenses, prepositions, articles, etc.)
2. Lexical errors and wrong word choices
3. Spelling and punctuation mistakes
4. Wrong data or inaccurate numbers (especially for Task 1)
For each error, present the original text, the correction, and explain the rule succinctly in Uzbek.
You will also propose a band score for Task 1, Task 2, and provide overall feedback written completely in Uzbek.

IMPORTANT REQUIREMENTS:
- The output MUST be valid JSON.
- Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). Return raw JSON only.

EXPECTED JSON FORMAT:
{
  "task1": {
    "grammarErrors": [
      { "original": "text with spelling/grammar/punctuation error", "correction": "corrected text", "explanation": "Uzbek explanation" }
    ],
    "lexicalErrors": [
      { "original": "wrong word/data/inaccurate fact", "correction": "better word/correct data", "explanation": "Uzbek explanation" }
    ],
    "criteria": {
      "taskAchievement": { "band": 7.0, "feedback": "Uzbek feedback for Task Achievement / Response." },
      "coherence": { "band": 6.0, "feedback": "Uzbek feedback for Coherence & Cohesion." },
      "lexical": { "band": 5.0, "feedback": "Uzbek feedback for Lexical Resource." },
      "grammar": { "band": 5.0, "feedback": "Uzbek feedback for Grammatical Range & Accuracy." },
      "overall": { "band": 6.0, "feedback": "UMUMIY XULOSA VA MASLAHATLAR:\n1. Nimalarda eng ko'p xato qildingiz (qisqacha yoritib bering).\n2. O'z ustingizda ishlash uchun maslahatlar: Quyida aniq qadamlar va qaysi mavzularni (masalan Complex Sentences, Pask Tense, Muayyan so'z boyligi) o'qishingiz kerakligini ro'yxat / bullet pointlar (•) orqali batafsil tushuntiring. Faqat 'grammatikani yaxshilang' demasdan, xuddi malakali ustozdek eng muhim mashqlarni ayting." }
    }
  },
  "task2": {
    "grammarErrors": [],
    "lexicalErrors": [],
    "criteria": {
      "taskAchievement": { "band": 7.0, "feedback": "..." },
      "coherence": { "band": 6.0, "feedback": "..." },
      "lexical": { "band": 5.0, "feedback": "..." },
      "grammar": { "band": 5.0, "feedback": "..." },
      "overall": { "band": 6.0, "feedback": "UMUMIY XULOSA VA MASLAHATLAR:\n1. Nimalarda eng ko'p xato qildingiz...\n2. O'z ustingizda ishlash uchun maslahatlar (Aniq mavzular va ro'yxat)..." }
    }
  }
}

Notes:
- If a task is missing or blank, return empty arrays and 0 for that task's band.
- Be extremely thorough. Identify AS MANY ERRORS AS POSSIBLE. Do not skip spelling, punctuation, or wrong data mistakes!
- The 'overall.feedback' MUST be long, helpful, and highly actionable. Represent a highly paid IELTS Expert.
`;

        const userMessageContent = [];

        userMessageContent.push({
            type: "text",
            text: `Task 1 Prompt:\n${prompt1}\n\nStudent Task 1 Answer:\n${answer1 || "[NO ANSWER PROVIDED]"}\n\n---\n`
        });

        if (image1) {
            userMessageContent.push({
                type: "image_url",
                image_url: { url: image1 }
            });
        }

        userMessageContent.push({
            type: "text",
            text: `Task 2 Prompt:\n${prompt2}\n\nStudent Task 2 Answer:\n${answer2 || "[NO ANSWER PROVIDED]"}`
        });

        if (image2) {
            userMessageContent.push({
                type: "image_url",
                image_url: { url: image2 }
            });
        }

        // 5. Call OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || functions.config().openai?.key,
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessageContent }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const aiResponseText = completion.choices[0].message.content;
        let aiReview;
        try {
            aiReview = JSON.parse(aiResponseText);
        } catch (e) {
            console.error("Failed to parse JSON", aiResponseText);
            throw new functions.https.HttpsError('internal', 'AI qaytargan format noto\'g\'ri.');
        }

        // 6. Save to Firestore
        await db.collection('results').doc(resultId).update({
            aiReview: aiReview,
            aiReviewCompletedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, aiReview };

    } catch (error) {
        console.error("checkWriting error:", error);
        throw new functions.https.HttpsError('internal', error.message || 'Xatolik yuz berdi');
    }
};
