// functions/weeklyDigest.js
//
// Haftalik xulosa — o'quvchini qaytarib keladigan eng arzon kanal.
//
// Analitika sahifasi faqat o'quvchi O'ZI kirganda ishlaydi. Xulosa esa uni
// eslatadi va aynan bitta narsa bilan qaytaradi: o'tgan haftadagi o'z natijasi.
//
// KIMGA YUBORILADI
// ────────────────
// Ikki yo'l bilan:
//   • Telegram orqali ro'yxatdan o'tganlar — ularning `uid` si
//     `telegram_{chatId}` ko'rinishida, ya'ni chat id uid ning o'zida.
//   • Email bilan ro'yxatdan o'tib, keyin hisobini bog'laganlar —
//     `users/{uid}.telegramChatId` (`linkTelegram` callable'i yozadi).
//
// Bog'lamaganlar xabar olmaydi va bu to'g'ri: ularga yuboradigan kanal yo'q.
//
// NARXI
// ─────
// Bitta jamlanma hujjati = bitta o'qish. Faqat OXIRGI HAFTA ichida faol bo'lgan
// foydalanuvchilar tanlanadi, ya'ni "bir marta kirib ketganlar" har hafta
// o'qilmaydi va bezovta qilinmaydi.

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { COLLECTION } = require("./analyticsRollup");
const { isoWeekKey } = require("./isoWeek.js");
const { summarizeTiming } = require("./timingAnalysis.js");

/** Bir ishga tushishda ko'pi bilan shuncha foydalanuvchi ko'riladi. */
const SCAN_LIMIT = 500;

/** Xabar yuborish uchun o'tgan haftada kamida shuncha savol ishlangan bo'lishi kerak. */
const MIN_QUESTIONS = 10;

/**
 * Savol turlarining o'zbekcha nomlari.
 *
 * Klientdagi `translations.js` ESM va uni bu yerdan import qilib bo'lmaydi;
 * xabar esa faqat o'zbek tilida yuboriladi, shuning uchun qisqa ro'yxat yetadi.
 * Ro'yxatda yo'q tur xom nomi bilan chiqadi — bu xabarni buzmaydi.
 */
const FAMILY_LABELS = {
  multiple_choice: "Multiple Choice",
  true_false_ng: "True/False/Not Given",
  yes_no_ng: "Yes/No/Not Given",
  headings: "Matching Headings",
  matching: "Matching",
  completion: "Completion (gap-fill)",
  flow_chart: "Flow Chart",
  map_diagram: "Map / Diagram",
  short_answer: "Short Answer",
  other: "Boshqa"
};

/** Telegram uid prefiksi. */
const TELEGRAM_PREFIX = "telegram_";

function chatIdFromUid(uid) {
  return String(uid || "").startsWith(TELEGRAM_PREFIX)
    ? String(uid).slice(TELEGRAM_PREFIX.length)
    : null;
}

/** O'tgan haftaning ISO kaliti. */
function previousWeekKey(now = new Date()) {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - 7);
  return isoWeekKey(d);
}

/**
 * Xulosa matnini quradi. Ma'lumot yetarli bo'lmasa `null` — jim qolish
 * bo'sh xabar yuborishdan yaxshi.
 *
 * @returns {string|null}
 */
function buildDigest(summary, weekKey) {
  const week = summary?.weeks?.[weekKey];
  const total = Number(week?.total) || 0;
  if (total < MIN_QUESTIONS) return null;

  const correct = Math.min(Number(week?.correct) || 0, total);
  const accuracy = Math.round((correct / total) * 100);

  const lines = [
    "📊 <b>Haftalik xulosa</b>",
    "",
    `Bu hafta: <b>${total}</b> ta savol, <b>${accuracy}%</b> to'g'ri.`
  ];

  // ── Eng kuchsiz savol turi ──
  // Jamlanmadagi umumiy kesim: bir haftalik ma'lumot tur bo'yicha juda kam
  // bo'ladi va undan xulosa chiqarish shovqin bo'lardi.
  const weakest = Object.entries(summary?.byType || {})
    .map(([family, stat]) => ({
      family,
      total: Number(stat?.total) || 0,
      accuracy: Number(stat?.total) > 0
        ? Math.round((Math.min(stat.correct, stat.total) / stat.total) * 100)
        : null
    }))
    .filter((row) => row.total >= 20 && row.accuracy !== null)
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  const weakestLabel = weakest
    ? (Object.prototype.hasOwnProperty.call(FAMILY_LABELS, weakest.family)
        ? FAMILY_LABELS[weakest.family]
        : weakest.family)
    : null;

  if (weakest) {
    lines.push(`Eng kuchsiz turingiz — <b>${weakestLabel}</b> (${weakest.accuracy}%).`);
  }

  // ── Bitta tavsiya ──
  // Ataylab BITTA: uchta maslahat yuborilsa, hech biri bajarilmaydi.
  const nearMiss = Number(summary?.nearMiss?.count) || 0;
  const ofTotal = Number(summary?.nearMiss?.ofTotal) || 0;
  const timing = summarizeTiming(summary?.timing);

  if (ofTotal > 0 && nearMiss / ofTotal >= 0.3) {
    const share = Math.round((nearMiss / ofTotal) * 100);
    lines.push("", `✍️ Xatolaringizning <b>${share}%</b> i imlo va so'z shakli — javobni bilgansiz. Bu eng tez tuzatiladigan qism.`);
  } else if (timing?.hasRanOutHabit) {
    lines.push("", "⏱ Javobsizlar test oxirida to'planyapti. IELTS da noto'g'ri javob uchun ball ayirilmaydi — bo'sh qoldirmang.");
  } else if (weakest) {
    lines.push("", `🎯 Shu hafta <b>${weakestLabel}</b> turiga alohida vaqt ajrating.`);
  }

  return lines.join("\n");
}

/**
 * Xulosalarni yuboradi.
 *
 * Bitta foydalanuvchidagi xatolik (bloklangan bot, o'chirilgan chat) qolganlarni
 * to'xtatmasligi shart — shuning uchun har biri alohida `try` ichida.
 */
async function runWeeklyDigest(now = new Date()) {
  const db = admin.firestore();
  const { sendMessage } = require("./telegramBot");

  const weekKey = previousWeekKey(now);
  // Faol bo'lganlar: jamlanmasi oxirgi 8 kunda yangilangan hujjatlar.
  const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  const snap = await db.collection(COLLECTION)
    .where("updatedAt", ">=", since)
    .limit(SCAN_LIMIT)
    .get();

  const tally = { scanned: snap.size, sent: 0, skipped: 0, noChat: 0, error: 0 };

  for (const doc of snap.docs) {
    // Xabar matnini AVVAL quramiz: u bo'sh bo'lsa, chat id ni qidirish uchun
    // foydalanuvchi hujjatini o'qishning hojati yo'q — bu ortiqcha o'qish.
    const text = buildDigest(doc.data(), weekKey);
    if (!text) {
      tally.skipped += 1;
      continue;
    }

    let chatId = chatIdFromUid(doc.id);
    if (!chatId) {
      // Email bilan kirgan foydalanuvchi hisobini bog'lagan bo'lishi mumkin.
      const userSnap = await db.collection("users").doc(doc.id).get().catch(() => null);
      const linked = userSnap?.exists ? userSnap.data()?.telegramChatId : null;
      chatId = linked ? String(linked) : null;
    }

    if (!chatId) {
      tally.noChat += 1;
      continue;
    }

    try {
      await sendMessage(chatId, text);
      tally.sent += 1;
    } catch (err) {
      console.error(`[weeklyDigest] yuborilmadi (${doc.id}):`, err?.message || err);
      tally.error += 1;
    }
  }

  console.log("[weeklyDigest]", JSON.stringify({ weekKey, ...tally }));
  return tally;
}

/**
 * Har dushanba 10:00 (Toshkent).
 *
 * Dushanba — yangi hafta boshi: xulosa o'tgan hafta haqida va reja tuzishga
 * hali vaqt bor. Yakshanba kechqurun yuborilsa, u "kech bo'ldi" degan taassurot
 * qoldirardi.
 */
const weeklyDigest = functions
  .runWith({ timeoutSeconds: 540, memory: "256MB" })
  .pubsub.schedule("0 10 * * 1")
  .timeZone("Asia/Tashkent")
  .onRun(async () => {
    await runWeeklyDigest();
    return null;
  });

module.exports = { weeklyDigest, runWeeklyDigest, buildDigest, previousWeekKey, chatIdFromUid };
