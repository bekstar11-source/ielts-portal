// functions/buildBenchmarks.js
//
// Anonim taqqoslash — "61% yaxshimi yoki yomonmi?".
//
// Sahifadagi barcha foizlar shu paytgacha tayanchsiz turardi. O'quvchi
// "Matching Headings — 61%" ni ko'radi-yu, bu yaxshi natijami yoki yomonmi
// bilmaydi. Yagona ishonarli tayanch — xuddi shu darajadagi boshqa o'quvchilar.
//
// NEGA DARAJA BO'YICHA GURUHLANADI
// ────────────────────────────────
// Umumiy o'rtacha bilan taqqoslash zararli: band 5.0 dagi o'quvchi band 8.0
// dagilar bilan solishtirilsa, u har bir qatorda "orqadaman" degan xabar oladi
// va bu hech qanday ma'lumot bermaydi. Shuning uchun tayanch o'quvchining O'Z
// band darajasi bo'yicha guruhdan olinadi.
//
// MAXFIYLIK
// ─────────
// Faqat jamlanma sonlar chiqadi va guruhda kamida `MIN_COHORT` ta o'quvchi
// bo'lishi shart. Kichik guruhda o'rtacha bitta odamning natijasiga aylanib
// qoladi — bu esa boshqa o'quvchining ma'lumotini oshkor qilish demak.
//
// NARXI
// ─────
// Kuniga bir marta ishlaydi va namuna oladi (`SAMPLE_LIMIT`). Natija BITTA
// hujjatga yoziladi, ya'ni har bir o'quvchi uchun qo'shimcha narx — bitta
// o'qish, va u hamma uchun bir xil hujjat (kesh yaxshi ishlaydi).

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { COLLECTION } = require("./analyticsRollup");

/** Bir ishga tushishda ko'pi bilan shuncha jamlanma o'qiladi. */
const SAMPLE_LIMIT = 1000;

/** Guruh e'lon qilinishi uchun kerakli minimal o'quvchi soni. */
const MIN_COHORT = 20;

/** Bitta o'quvchi guruhga kirishi uchun kerakli minimal savol soni. */
const MIN_QUESTIONS_PER_USER = 40;

/** Savol oilasi guruhda e'lon qilinishi uchun kerakli minimal o'quvchi soni. */
const MIN_USERS_PER_FAMILY = 10;

/** Natija yoziladigan hujjat. */
const DOC_PATH = { collection: "stats", doc: "benchmarks" };

/**
 * O'quvchining daraja guruhi.
 *
 * Butun band bo'yicha ("5", "6", "7") — yarim band guruhlari juda mayda bo'lib,
 * `MIN_COHORT` ga yetmasdi. 5 dan past va 8 dan yuqorisi chekka guruhlarga
 * qo'shiladi: u yerda o'quvchi kam va ular baribir alohida guruh hosil qilmaydi.
 */
function bandBucket(band) {
  const value = Number(band) || 0;
  if (value <= 0) return null;
  if (value < 5) return "4";
  if (value >= 8) return "8";
  return String(Math.floor(value));
}

/**
 * Jamlanmalardan taqqoslash jadvalini quradi.
 *
 * Sof funksiya — Firestore talab qilmaydi va shu sabab sinaladi.
 *
 * @param {Array<object>} summaries `analyticsSummaries` hujjatlari
 * @returns {{buckets: object, sampled: number, updatedAtMs: number}}
 */
function computeBenchmarks(summaries) {
  // bucket → family → { sum, users }
  const acc = new Map();
  let sampled = 0;

  (Array.isArray(summaries) ? summaries : []).forEach((summary) => {
    const byType = summary?.byType || {};
    const totalQuestions = Object.values(byType).reduce(
      (sum, stat) => sum + (Number(stat?.total) || 0),
      0
    );
    if (totalQuestions < MIN_QUESTIONS_PER_USER) return;

    // Daraja — ikkala ko'nikmadan eng yaxshisi. Bitta bo'lim bo'yicha guruhlash
    // faqat Reading ishlagan o'quvchini noto'g'ri guruhga tushirardi.
    const bands = ["reading", "listening"]
      .map((skill) => Number(summary?.skills?.[skill]?.bestBand) || 0)
      .filter((b) => b > 0);
    const bucket = bandBucket(Math.max(0, ...bands));
    if (!bucket) return;

    sampled += 1;
    if (!acc.has(bucket)) acc.set(bucket, { users: 0, families: new Map() });
    const entry = acc.get(bucket);
    entry.users += 1;

    Object.entries(byType).forEach(([family, stat]) => {
      const total = Number(stat?.total) || 0;
      // Bitta o'quvchida ham kam namunali tur o'rtachani buzadi.
      if (total < 10) return;
      const accuracy = (Math.min(Number(stat?.correct) || 0, total) / total) * 100;

      if (!entry.families.has(family)) entry.families.set(family, { sum: 0, users: 0 });
      const familyEntry = entry.families.get(family);
      familyEntry.sum += accuracy;
      familyEntry.users += 1;
    });
  });

  const buckets = {};
  acc.forEach((entry, bucket) => {
    // Kichik guruh — o'rtacha bitta odamning natijasiga aylanadi.
    if (entry.users < MIN_COHORT) return;

    const families = {};
    entry.families.forEach((familyEntry, family) => {
      if (familyEntry.users < MIN_USERS_PER_FAMILY) return;
      families[family] = Math.round(familyEntry.sum / familyEntry.users);
    });

    if (Object.keys(families).length > 0) {
      buckets[bucket] = { users: entry.users, families };
    }
  });

  return { buckets, sampled, updatedAtMs: Date.now() };
}

/** Jamlanmalarni o'qib, taqqoslash hujjatini yangilaydi. */
async function runBuildBenchmarks() {
  const db = admin.firestore();

  const snap = await db.collection(COLLECTION).limit(SAMPLE_LIMIT).get();
  const result = computeBenchmarks(snap.docs.map((doc) => doc.data()));

  await db.collection(DOC_PATH.collection).doc(DOC_PATH.doc).set({
    buckets: result.buckets,
    sampled: result.sampled,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log("[buildBenchmarks]", JSON.stringify({
    scanned: snap.size,
    sampled: result.sampled,
    buckets: Object.keys(result.buckets)
  }));
  return result;
}

/** Har kuni 03:00 (Toshkent) — kam yuklangan vaqt. */
const buildBenchmarks = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 3 * * *")
  .timeZone("Asia/Tashkent")
  .onRun(async () => {
    await runBuildBenchmarks();
    return null;
  });

module.exports = {
  buildBenchmarks,
  runBuildBenchmarks,
  computeBenchmarks,
  bandBucket,
  MIN_COHORT,
  MIN_QUESTIONS_PER_USER
};
