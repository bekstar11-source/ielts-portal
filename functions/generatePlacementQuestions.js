// functions/generatePlacementQuestions.js
//
// CEFR placement testi uchun savol QORALAMASINI generatsiya qiladi.
//
// ─── NEGA QORALAMA ──────────────────────────────────────────────────────────
//
// Bu funksiya Firestore'ga HECH NARSA YOZMAYDI. U faqat qoralamani qaytaradi,
// admin esa uni ko'rib chiqib, o'zi saqlaydi. Sabab: placement natijasi
// o'quvchini butun o'quv yo'liga yo'naltiradi — noto'g'ri belgilangan darajali
// savol odamni bir necha oyga noto'g'ri materialga yuborishi mumkin. AI bunday
// qarorni yolg'iz qabul qilmasligi kerak.
//
// ─── NEGA "grammatika + lug'at" ─────────────────────────────────────────────
//
// Reading/Listening testi darajani ham o'lchaydi, lekin u UZOQ (matn o'qish
// kerak) va boshlang'ich odamni qo'rqitadi. Bitta jumlalik grammatika/lug'at
// savoli 10-15 soniyada javob beriladi — 40 savollik test 10 daqiqada tugaydi.
// Bu marketing ilgagi uchun hal qiluvchi: uzun test tashlab ketiladi.

const admin = require("firebase-admin");
const OpenAI = require("openai").default;

const { CEFR_ORDER } = require("./cefr");

/** Bir chaqiruvda so'ralishi mumkin bo'lgan maksimal savol. */
const MAX_COUNT = 20;

/** Har bir savolda nechta variant bo'lishi shart. */
const OPTION_COUNT = 4;

const SKILLS = new Set(["grammar", "vocabulary"]);

/**
 * Daraja uchun mazmun yo'riqnomasi.
 *
 * Aniq misol berilmasa, AI hamma daraja uchun deyarli bir xil qiyinlikdagi
 * savol yozadi — natijada pillapoyali ballash (`placementScoring.js`) ma'nosini
 * yo'qotadi.
 */
const LEVEL_GUIDE = {
  A1: "Present simple of 'be' and common verbs, basic plurals, articles a/an, numbers, colours, family, everyday objects. Sentences of 5-8 words.",
  A2: "Past simple of regular/irregular verbs, comparatives, 'going to' future, common prepositions of time and place, everyday adjectives. Sentences of 6-10 words.",
  B1: "Present perfect vs past simple, first conditional, modals of obligation, relative clauses, common phrasal verbs, work and travel vocabulary.",
  B2: "Second and third conditionals, passive voice, reported speech, gerunds vs infinitives, collocations, abstract and opinion vocabulary.",
  C1: "Inversion, mixed conditionals, nuanced modality, advanced connectors, idiomatic expressions, register and formality distinctions.",
};

/** Qaytarilgan savolni tekshiradi; yaroqsiz bo'lsa sababini qaytaradi. */
function validateQuestion(q, level, skill) {
  if (!q || typeof q !== "object") return "savol obyekt emas";
  if (typeof q.prompt !== "string" || q.prompt.trim().length < 5) return "prompt juda qisqa";
  if (!Array.isArray(q.options) || q.options.length !== OPTION_COUNT) {
    return `variantlar soni ${OPTION_COUNT} bo'lishi kerak`;
  }
  if (q.options.some((o) => typeof o !== "string" || !o.trim())) return "bo'sh variant bor";

  // Takrorlangan variant — savolni buzadi: ikkita bir xil javobdan qaysi biri
  // "to'g'ri" ekani noaniq bo'lib qoladi.
  const seen = new Set(q.options.map((o) => o.trim().toLowerCase()));
  if (seen.size !== q.options.length) return "takrorlangan variant bor";

  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= OPTION_COUNT) {
    return "answerIndex noto'g'ri";
  }
  if (!CEFR_ORDER.includes(level)) return "daraja noto'g'ri";
  if (!SKILLS.has(skill)) return "skill noto'g'ri";
  return null;
}

async function generatePlacementQuestions(data, context) {
  if (!context.auth) throw new Error("Autentifikatsiya talab qilinadi.");

  // Faqat admin. Bu funksiya pullik AI chaqiruvi qiladi va uning natijasi
  // o'quvchilarga ko'rsatiladigan kontentga aylanadi.
  const callerSnap = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new Error("Bu amal faqat administrator uchun.");
  }

  const level = String(data && data.level ? data.level : "").toUpperCase();
  const skill = String(data && data.skill ? data.skill : "grammar");
  const count = Math.min(Math.max(parseInt(data && data.count, 10) || 10, 1), MAX_COUNT);

  if (!CEFR_ORDER.includes(level)) {
    throw new Error(`Daraja noto'g'ri: ${level}. Kutilgan: ${CEFR_ORDER.join(", ")}`);
  }
  if (!SKILLS.has(skill)) {
    throw new Error(`Skill noto'g'ri: ${skill}. Kutilgan: grammar yoki vocabulary.`);
  }

  // Takrorlanmasligi uchun bankdagi mavjud savollarni AI ga ko'rsatamiz.
  const existingSnap = await admin
    .firestore()
    .collection("placement_questions")
    .where("level", "==", level)
    .where("skill", "==", skill)
    .limit(100)
    .get();
  const existingPrompts = existingSnap.docs
    .map((d) => (d.data() || {}).prompt)
    .filter(Boolean);

  const avoidSection = existingPrompts.length
    ? `\n\nDo NOT repeat or paraphrase any of these existing questions:\n${existingPrompts
        .slice(0, 60)
        .map((p) => `- ${p}`)
        .join("\n")}`
    : "";

  const apiKey = (process.env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  const openai = new OpenAI({ apiKey });

  const prompt = `You are a CEFR assessment writer. Write exactly ${count} multiple-choice ${skill} questions at CEFR level ${level}.

LEVEL ${level} SCOPE: ${LEVEL_GUIDE[level] || "Standard content for this level."}

Rules:
- Each question is ONE sentence with a single gap written as ___ (three underscores).
- Exactly ${OPTION_COUNT} answer options, exactly one unambiguously correct.
- Distractors must be plausible and reflect real learner mistakes, not nonsense.
- No two options may be interchangeable or equally correct.
- Keep the sentence culturally neutral and free of names of real people.
- The question must genuinely discriminate at ${level}: a learner one level below should usually get it wrong, a learner at ${level} should usually get it right.
- Write a short explanation in UZBEK (max 15 words) saying why the answer is correct.${avoidSection}

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "prompt": "<sentence with ___>",
      "options": ["<a>", "<b>", "<c>", "<d>"],
      "answerIndex": <0-3>,
      "explanation": "<short reason in Uzbek>"
    }
  ]
}`;

  let parsed;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      // Past temperatura: bu yerda ijodkorlik emas, aniqlik kerak.
      temperature: 0.4,
    });
    parsed = JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("generatePlacementQuestions AI xatosi:", error);
    throw new Error(`Savol generatsiya xatosi: ${error.message}`);
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error("AI javobi noto'g'ri: questions massivi topilmadi.");
  }

  // Yaroqsiz savolni TASHLAB YUBORAMIZ, butun chaqiruvni yiqitmaymiz: 10 tadan
  // 9 tasi yaxshi bo'lsa, admin o'sha 9 tasini oladi va yetmaganini qayta
  // so'raydi. Aks holda bitta buzuq savol butun ishni bekor qilardi.
  const accepted = [];
  const rejected = [];
  for (const q of parsed.questions) {
    const problem = validateQuestion(q, level, skill);
    if (problem) {
      rejected.push({ prompt: q && q.prompt, problem });
      continue;
    }
    accepted.push({
      level,
      skill,
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()),
      answerIndex: q.answerIndex,
      explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
      status: "draft",
    });
  }

  return { success: true, questions: accepted, rejected, requested: count };
}

module.exports = { generatePlacementQuestions, validateQuestion, LEVEL_GUIDE };
