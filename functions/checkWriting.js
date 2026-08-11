const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');

// Task 1 rasmi (grafik/diagramma) modelga base64 sifatida yuboriladi. 10MB dan
// katta fayl Vision uchun ham keraksiz, ham funksiya xotirasini yeydi.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const DEFAULT_MODEL = 'gpt-4o';

/**
 * Rasm manzilini modelga yuborish uchun tayyorlaydi.
 *
 * Firebase Storage'ning `getDownloadURL` havolalari ochiq bo'lsa-da, OpenAI
 * ularni har doim ham yuklab ololmaydi (token muddati, CDN cheklovi va h.k.).
 * Shu sabab rasmni O'ZIMIZ yuklab, `data:` URI ko'rinishida yuboramiz —
 * faqat yuklab bo'lmasa xom havolaga qaytamiz.
 */
const toImagePayload = async (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const url = rawUrl.trim();
    if (!url) return null;

    // Allaqachon base64 bo'lsa — o'zgartirmaymiz.
    if (url.startsWith('data:image/')) return url;
    if (!/^https?:\/\//i.test(url)) return null;

    try {
        const res = await fetch(url, { timeout: 20000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buf = await res.buffer();
        if (!buf.length || buf.length > MAX_IMAGE_BYTES) {
            throw new Error(`Rasm hajmi mos emas: ${buf.length} bayt`);
        }

        const contentType = (res.headers.get('content-type') || 'image/png').split(';')[0].trim();
        if (!contentType.startsWith('image/')) throw new Error(`Rasm emas: ${contentType}`);

        return `data:${contentType};base64,${buf.toString('base64')}`;
    } catch (e) {
        console.warn('checkWriting: rasmni yuklab bo\'lmadi, xom havola yuboriladi:', url, e.message);
        return url;
    }
};

/** Vazifadan rasm maydonini topadi — hujjatlarda nomi bir xil emas. */
const pickImage = (task, testData, taskNo) => (
    task?.image ||
    task?.image_url ||
    task?.imageUrl ||
    task?.chartImage ||
    (taskNo === 1
        ? (testData.task1ImageUrl || testData.image_url || testData.image || testData.imageUrl)
        : (testData.task2ImageUrl || null)) ||
    null
);

/** writingTasks massivi `id` ni son ham, satr ham saqlashi mumkin. */
const findTask = (tasks, taskNo) =>
    tasks.find(t => Number(t?.id) === taskNo) || tasks[taskNo - 1] || null;

const wordCount = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Natija hujjatidan writing testining ID sini topadi.
 *
 * mock_full hujjatlarida `testId` UMUMAN yo'q — writing testi
 * `subTests.writing` ichida yotadi. Ilgari shu sabab mock imtihonlarda
 * AI tekshiruvi "documentPath" xatosi bilan yiqilardi.
 */
const resolveWritingTestId = (resultData) => (
    resultData.subTests?.writing ||
    resultData.details?.subTests?.writing ||
    resultData.writingTestId ||
    resultData.testId ||
    null
);

exports.checkWriting = async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Avtorizatsiyadan o\'tish kerak.');
    }

    const { resultId } = data || {};
    if (!resultId) {
        throw new functions.https.HttpsError('invalid-argument', 'resultId taqdim etilmagan.');
    }

    const apiKey = (process.env.OPENAI_API_KEY || functions.config().openai?.key || '')
        .trim()
        .replace(/^["']|["']$/g, '');
    if (!apiKey) {
        console.error('checkWriting: OPENAI_API_KEY sozlanmagan.');
        throw new functions.https.HttpsError(
            'failed-precondition',
            'OpenAI API kaliti sozlanmagan. Administrator bilan bog\'laning.'
        );
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
        let writingTestId = resolveWritingTestId(resultData);
        if (!writingTestId) {
            throw new functions.https.HttpsError('failed-precondition', 'Natijaga bog\'langan test topilmadi.');
        }

        let testDoc = await db.collection('tests').doc(String(writingTestId)).get();
        if (!testDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Test topilmadi.');
        }
        let testData = testDoc.data();

        // Mock testning "ota" hujjati topilgan bo'lsa — writing qismiga o'tamiz.
        if (!testData.writingTasks && !testData.task1 && testData.subTests?.writing) {
            const subSnap = await db.collection('tests').doc(String(testData.subTests.writing)).get();
            if (subSnap.exists) {
                writingTestId = testData.subTests.writing;
                testData = subSnap.data();
            }
        }

        // Extract Prompts and Images
        let prompt1 = '';
        let prompt2 = '';
        let rawImage1 = null;
        let rawImage2 = null;

        if (Array.isArray(testData.writingTasks) && testData.writingTasks.length > 0) {
            const t1 = findTask(testData.writingTasks, 1);
            const t2 = findTask(testData.writingTasks, 2);
            prompt1 = t1?.prompt || t1?.question || testData.task1 || '';
            prompt2 = t2?.prompt || t2?.question || testData.task2 || '';
            rawImage1 = pickImage(t1, testData, 1);
            rawImage2 = pickImage(t2, testData, 2);
        } else {
            prompt1 = testData.task1 || '';
            prompt2 = testData.task2 || testData.passage || '';
            rawImage1 = pickImage(null, testData, 1);
            rawImage2 = pickImage(null, testData, 2);
        }

        // Extract Answers (Robust extraction matching frontend)
        const getAnswers = (res) => {
            // Priority 1: Top-level writing specific fields
            let ans = res.writingAnswers || res.userAnswers || res.answers || {};

            // Priority 2: Attempts array (New system)
            if (res.attempts && Array.isArray(res.attempts) && res.attempts.length > 0) {
                // Try to find the latest attempt with writing data
                const attemptsWithWriting = [...res.attempts].reverse().find(a =>
                    a.writingAnswers || a.userAnswers || a.answers || a.task1 || a.task2
                );

                if (attemptsWithWriting) {
                    ans = {
                        ...ans,
                        ...(attemptsWithWriting.writingAnswers || attemptsWithWriting.userAnswers || attemptsWithWriting.answers || {}),
                        task1: attemptsWithWriting.task1 || (attemptsWithWriting.writingAnswers?.task1) || (attemptsWithWriting.userAnswers?.task1) || (attemptsWithWriting.answers?.task1),
                        task2: attemptsWithWriting.task2 || (attemptsWithWriting.writingAnswers?.task2) || (attemptsWithWriting.userAnswers?.task2) || (attemptsWithWriting.answers?.task2)
                    };
                }
            }

            // Priority 3: Details (Mock Exams)
            if (res.details) {
                const detailsAns = res.details.writingAnswers || res.details.userAnswers || res.details.answers || {};
                ans = { ...ans, ...detailsAns };
            }

            // Priority 4: Direct legacy fields at root
            if (!ans.task1) ans.task1 = res.task1 || res.writingAnswer || res.answer1;
            if (!ans.task2) ans.task2 = res.task2 || res.essay || res.answer2;

            return ans;
        };

        const answers = getAnswers(resultData);
        const answer1 = (answers.task1 || '').trim();
        const answer2 = (answers.task2 || '').trim();

        if (!answer1 && !answer2) {
            throw new functions.https.HttpsError('failed-precondition', 'O\'quvchi javobi topilmadi.');
        }

        // Rasmlarni faqat javob mavjud bo'lgan vazifalar uchun yuklaymiz.
        const [image1, image2] = await Promise.all([
            answer1 ? toImagePayload(rawImage1) : null,
            answer2 ? toImagePayload(rawImage2) : null
        ]);

        // 4. Construct System Prompt
        const systemPrompt = `You are a highly experienced, strict IELTS Writing examiner (Academic & General Training).
You grade a student's submission against the official IELTS band descriptors:
Task Achievement/Response (TA/TR), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA).

=== TASK 1 WITH A VISUAL (chart / graph / table / map / process diagram) ===
When an image is attached to Task 1, it is the SOURCE DATA the student had to describe.
You MUST work through it in this exact order BEFORE grading:
1. Read the visual yourself: identify its type (line graph, bar chart, pie chart, table, map, process),
   the title, the axis labels, the units (%, millions, °C, years...), the time span and every category.
2. Note the real key features: the overview trends, the highest and lowest values, crossover points,
   the biggest changes, and anything that stays flat. Write these down in "imageAnalysis".
3. Only then compare the student's text against the visual:
   - Did they give a clear OVERVIEW of the main trends? (Missing overview caps TA at band 5.)
   - Did they select and report the KEY features, or just list every number?
   - Is EVERY number, date, unit, category name and comparison they wrote actually correct?
   - Did they invent data that is not in the visual, or explain reasons the visual does not show?
   Every factual mismatch with the image MUST appear in "lexicalErrors" with the correct value from the
   image in "correction", and TA/TR must be penalised heavily for inaccurate data.
If the visual is a map or a process, check the sequence, the directions and the stage names instead of numbers.
If NO image is attached to Task 1, grade the text on its own and leave "imageAnalysis" as an empty string —
never invent a description of a chart you cannot see.

=== GENERAL RULES ===
- Under-length answers (Task 1 under 150 words, Task 2 under 250 words) must be penalised under TA/TR;
  say so explicitly in the feedback. Word counts are given to you.
- Memorised or off-topic content, and answers that do not address all parts of the prompt, lower TA/TR.
- Find AS MANY REAL ERRORS AS POSSIBLE: grammar (tense, article, preposition, agreement, word form),
  spelling, punctuation, collocation, register, wrong word choice, and factual/data errors.
- Do NOT invent errors. "original" MUST be an exact, verbatim substring of the student's answer for that task,
  so it can be highlighted in the text. Never quote text from the prompt or from another task.
- Bands are on the 0-9 scale in 0.5 steps.
- ALL feedback and explanations are written in UZBEK. Error "original"/"correction" stay in English.

=== OUTPUT ===
- Return RAW, VALID JSON only. No markdown fences, no commentary outside the JSON.

EXPECTED JSON FORMAT:
{
  "task1": {
    "imageAnalysis": "Uzbek: rasmda nima tasvirlangan — turi, o'lchov birligi, davri, asosiy trendlar va raqamlar.",
    "grammarErrors": [
      { "original": "exact text from the answer", "correction": "corrected text", "explanation": "Uzbek explanation of the rule" }
    ],
    "lexicalErrors": [
      { "original": "wrong word / wrong number from the answer", "correction": "better word / correct number from the image", "explanation": "Uzbek explanation" }
    ],
    "criteria": {
      "taskAchievement": { "band": 7.0, "feedback": "Uzbek feedback. Overview bormi, ma'lumotlar to'g'rimi, so'z soni yetarlimi." },
      "coherence": { "band": 6.0, "feedback": "Uzbek feedback for Coherence & Cohesion." },
      "lexical": { "band": 5.0, "feedback": "Uzbek feedback for Lexical Resource." },
      "grammar": { "band": 5.0, "feedback": "Uzbek feedback for Grammatical Range & Accuracy." },
      "overall": { "band": 6.0, "feedback": "UMUMIY XULOSA VA MASLAHATLAR:\\n1. Nimalarda eng ko'p xato qildingiz (qisqacha yoritib bering).\\n2. O'z ustingizda ishlash uchun maslahatlar: quyida aniq qadamlar va qaysi mavzularni (masalan Complex Sentences, Past Tense, ma'lum so'z boyligi) o'rganish kerakligini bullet pointlar (•) orqali batafsil tushuntiring. Faqat 'grammatikani yaxshilang' demasdan, malakali ustozdek aniq mashqlarni ayting." }
    }
  },
  "task2": {
    "imageAnalysis": "",
    "grammarErrors": [],
    "lexicalErrors": [],
    "criteria": {
      "taskAchievement": { "band": 7.0, "feedback": "..." },
      "coherence": { "band": 6.0, "feedback": "..." },
      "lexical": { "band": 5.0, "feedback": "..." },
      "grammar": { "band": 5.0, "feedback": "..." },
      "overall": { "band": 6.0, "feedback": "UMUMIY XULOSA VA MASLAHATLAR: ..." }
    }
  }
}

Notes:
- If a task was not submitted, return empty arrays, band 0 and a short Uzbek note saying it was not submitted.
- The 'overall.feedback' MUST be long, concrete and actionable — you represent a highly paid IELTS expert.
`;

        const userMessageContent = [];

        userMessageContent.push({
            type: 'text',
            text: [
                '=== TASK 1 ===',
                `Prompt:\n${prompt1 || '[PROMPT NOT AVAILABLE]'}`,
                image1
                    ? 'A visual for Task 1 is attached below. Analyse it first, then verify the student\'s data.'
                    : 'No visual is attached for Task 1.',
                `Student word count: ${wordCount(answer1)} (required minimum: 150)`,
                `Student Task 1 Answer:\n${answer1 || '[NOT SUBMITTED]'}`
            ].join('\n\n')
        });

        if (image1) {
            userMessageContent.push({
                type: 'image_url',
                image_url: { url: image1, detail: 'high' }
            });
        }

        userMessageContent.push({
            type: 'text',
            text: [
                '=== TASK 2 ===',
                `Prompt:\n${prompt2 || '[PROMPT NOT AVAILABLE]'}`,
                `Student word count: ${wordCount(answer2)} (required minimum: 250)`,
                `Student Task 2 Answer:\n${answer2 || '[NOT SUBMITTED]'}`
            ].join('\n\n')
        });

        if (image2) {
            userMessageContent.push({
                type: 'image_url',
                image_url: { url: image2, detail: 'high' }
            });
        }

        // 5. Call OpenAI
        const openai = new OpenAI({ apiKey, maxRetries: 2, timeout: 120000 });
        const model = (process.env.OPENAI_WRITING_MODEL || DEFAULT_MODEL).trim();

        const callModel = async () => {
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessageContent }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 6000
            });
            return completion.choices?.[0]?.message?.content || '';
        };

        // Ba'zan model JSON ni ```json blok ichida qaytaradi yoki uzilib qoladi —
        // bir marta qayta urinib ko'ramiz.
        const parseReview = (raw) => {
            const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
            return JSON.parse(cleaned);
        };

        let aiReview;
        let lastRaw = '';
        for (let attempt = 0; attempt < 2; attempt += 1) {
            lastRaw = await callModel();
            try {
                aiReview = parseReview(lastRaw);
                break;
            } catch (e) {
                console.warn(`checkWriting: JSON parse xatosi (urinish ${attempt + 1})`, e.message);
            }
        }

        if (!aiReview) {
            console.error('checkWriting: JSON parse qilinmadi', lastRaw.slice(0, 2000));
            throw new functions.https.HttpsError('internal', 'AI qaytargan format noto\'g\'ri. Qayta urinib ko\'ring.');
        }

        // 5.5. Javobni normallashtirish — UI `criteria` bo'yicha aylanadi va
        //      `band` ni to'g'ridan-to'g'ri ko'rsatadi, shuning uchun maydonlar
        //      har doim mavjud va son bo'lishi kerak.
        const CRITERIA = ['taskAchievement', 'coherence', 'lexical', 'grammar', 'overall'];
        const normalizeTask = (task, submitted) => {
            const src = task && typeof task === 'object' ? task : {};
            const criteria = {};
            CRITERIA.forEach((key) => {
                const c = src.criteria?.[key] || {};
                const band = Number(c.band);
                criteria[key] = {
                    band: submitted && Number.isFinite(band) ? band : 0,
                    feedback: typeof c.feedback === 'string' ? c.feedback : ''
                };
            });

            const cleanErrors = (list) => (Array.isArray(list) ? list : [])
                .filter(e => e && (e.original || e.correction))
                .map(e => ({
                    original: String(e.original || ''),
                    correction: String(e.correction || ''),
                    explanation: String(e.explanation || '')
                }));

            return {
                imageAnalysis: typeof src.imageAnalysis === 'string' ? src.imageAnalysis : '',
                grammarErrors: submitted ? cleanErrors(src.grammarErrors) : [],
                lexicalErrors: submitted ? cleanErrors(src.lexicalErrors) : [],
                criteria
            };
        };

        const normalized = {
            task1: normalizeTask(aiReview.task1, Boolean(answer1)),
            task2: normalizeTask(aiReview.task2, Boolean(answer2)),
            model,
            hasTask1Image: Boolean(image1)
        };

        // 6. Save to Firestore
        await db.collection('results').doc(resultId).update({
            aiReview: normalized,
            aiReviewCompletedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, aiReview: normalized };

    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('checkWriting error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Xatolik yuz berdi');
    }
};
