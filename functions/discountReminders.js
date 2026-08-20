// functions/discountReminders.js
//
// Chegirma zanjirini tirik saqlaydigan kunlik eslatma.
//
// ─── NEGA BU UMUMAN KERAK ───────────────────────────────────────────────────
//
// ⚠️ HOZIR AMALDA UYQUDA: `DISCOUNT_CONFIG.cycles` = 1, ya'ni yangi chegirma
// birinchi to'lovda to'liq sarflanadi va `cyclesRemaining` darhol 0 bo'ladi —
// pastdagi so'rov (`cyclesRemaining > 0`) ularni umuman ko'rmaydi. Fayl
// o'chirilmadi, chunki ESKI takliflar (30% × 2 oy bilan berilganlar) hamon
// ikkinchi oyga haqli va ularga va'da bajarilishi kerak.
//
// Chegirma bir necha OYNI qoplaganda to'lov QO'LDA ishlaydi (kartaga
// o'tkazma + chek + admin ✅). Ya'ni 2-oy — bu avtomatik yechib olinadigan
// pul emas, noldan boshlanadigan yangi sotuv. Eslatmasiz bunday model
// tushumni oshirmaydi, faqat oldindan olinadigan pulni ikkiga bo'lib
// tashlaydi va yarmini tasodifga qoldiradi (standard, 30% da):
//
//   2 tsikl ham yopilsa   49 000
//   1 tsiklda uzilsa      24 500
//
// Farq — aynan shu fayl.
//
// ─── NEGA MANBA `discount_claims` ───────────────────────────────────────────
//
// `users` bo'ylab yurish noto'g'ri bo'lardi: u yerda Telegram chat ID yo'q
// (bot foydalanuvchini `payment_sessions` orqali taniydi), qolgan oylar esa
// faqat ko'rsatish uchun nusxalanadi. Reyestrda ikkalasi ham bor va u
// haqiqiy manba. Bundan tashqari reyestrda FAQAT to'lov qilganlar bo'ladi —
// ya'ni aylanadigan hujjatlar soni obunachilar soni bilan cheklangan.
//
// `ph_` hujjatlari tashlab ketiladi: ular o'sha shaxsning ikkinchi nusxasi,
// aks holda bitta odam ikki marta xabar olardi.

const admin = require("firebase-admin");
const functions = require("firebase-functions");

const { DISCOUNT_CONFIG, toDate, isChainBroken } = require("./signupDiscount");
const { getPlanPrice, applyDiscount, formatSom } = require("./pricing");

/** Saytdagi `openPaymentBot` bilan bir xil bot. */
const BOT_START_URL = "https://t.me/ielts_portal_auth_bot?start=";

/**
 * Obuna tugashiga necha kun qolganda birinchi eslatma ketadi.
 *
 * 1 emas, 3: to'lov qo'lda va admin tasdig'ini kutadi. Oxirgi kuni yuborilgan
 * eslatma o'quvchini uzilish bilan qoldiradi — obuna yopiladi, keyin qaytib
 * kelish ehtimoli keskin tushadi.
 */
const BEFORE_END_DAYS = 3;

/**
 * Chegirma yonishiga necha kun qolganda oxirgi eslatma ketadi.
 *
 * Bu ikkinchi to'lqin: birinchisi obuna tugashiga bog'langan, bu esa
 * `maxGapDays` ga. Obuna tugagach ~15 kunlik imkoniyat qoladi (30 kunlik
 * tarif, 45 kunlik zanjir oynasi) — o'sha oynani sukut bilan o'tkazib
 * yubormaslik kerak.
 */
const LAST_CALL_DAYS = 5;

/** Bir yurishda ko'rib chiqiladigan eng ko'p reyestr hujjati. */
const SCAN_LIMIT = 500;

const DAY_MS = 86400000;

/** Nechta to'liq kun qolgan (yuqoriga yaxlitlanadi: 0.4 kun ham "1 kun"). */
function daysUntil(date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / DAY_MS));
}

/**
 * Shu hujjat uchun qaysi eslatma navbatda.
 *
 * `null` — hozir yubormaymiz. Ikki bosqich ataylab ARALASHTIRILMAGAN: ular
 * turli sanalarga bog'langan (obuna tugashi ↔ zanjir oynasi) va bittasi
 * yuborilgani ikkinchisini bekor qilmaydi.
 */
function pickStage(subscriptionEnd, chainDeadline) {
  if (subscriptionEnd && subscriptionEnd.getTime() > Date.now()) {
    const left = subscriptionEnd.getTime() - Date.now();
    if (left <= BEFORE_END_DAYS * DAY_MS) return "before_end";
  }
  if (chainDeadline && chainDeadline.getTime() > Date.now()) {
    const left = chainDeadline.getTime() - Date.now();
    if (left <= LAST_CALL_DAYS * DAY_MS) return "last_call";
  }
  return null;
}

/** Eslatma matni. */
function buildMessage(stage, { cyclesRemaining, percent, price, basePrice, daysLeft, tierLabel }) {
  const priceLine =
    `💰 <b>${formatSom(price)} so'm</b> <s>${formatSom(basePrice)}</s> · 🎁 ${percent}% chegirma\n`;

  if (stage === "before_end") {
    return `⏰ <b>Obunangiz ${daysLeft} kundan keyin tugaydi</b>\n\n` +
      `Chegirmangizdan yana <b>${cyclesRemaining} oy</b> qolgan — uzaytirsangiz ` +
      `${tierLabel} tarifini shu narxda davom ettirasiz:\n\n` +
      priceLine +
      `\nTo'lovni hoziroq qilsangiz obunangiz uzilmaydi.`;
  }

  return `🎁 <b>Chegirmangiz ${daysLeft} kundan keyin yonadi</b>\n\n` +
    `Sizda ${percent}% chegirmaning <b>${cyclesRemaining} oyi</b> ishlatilmay qolgan. ` +
    `Shu muddat ichida to'lamasangiz, keyingi obunangiz to'liq narxda bo'ladi:\n\n` +
    priceLine;
}

/**
 * Bitta reyestr hujjatini ko'rib chiqadi va kerak bo'lsa xabar yuboradi.
 * @returns {Promise<string>} nima qilingani (loglar uchun)
 */
async function processClaim(db, sendMessage, doc) {
  const claim = doc.data() || {};

  const remaining = Number(claim.cyclesRemaining) || 0;
  if (remaining <= 0) return "skip:no_cycles";

  const telegramId = claim.telegramId;
  if (!telegramId) return "skip:no_telegram";

  const lastCycleAt = toDate(claim.lastCycleAt) || toDate(claim.claimedAt);
  if (!lastCycleAt) return "skip:no_last_cycle";

  // Zanjir allaqachon uzilgan — eslatma bermaymiz. "Chegirmangiz yonib
  // ketdi" xabari faqat achchiq taassurot qoldiradi, foyda keltirmaydi.
  if (isChainBroken(lastCycleAt)) return "skip:chain_broken";

  const chainDeadline = new Date(lastCycleAt.getTime() + DISCOUNT_CONFIG.maxGapDays * DAY_MS);

  if (!claim.uid) return "skip:no_uid";
  const userSnap = await db.collection("users").doc(claim.uid).get();
  if (!userSnap.exists) return "skip:no_user";
  const user = userSnap.data() || {};

  const subscriptionEnd = toDate(user.subscriptionEnd);
  const stage = pickStage(subscriptionEnd, chainDeadline);
  if (!stage) return "skip:not_due";

  // ─── Takrorlanishga qarshi ───
  // Kalit sifatida OXIRGI TSIKL sanasi ishlatiladi: o'quvchi to'lagach
  // `lastCycleAt` yangilanadi va eslatma keyingi oy uchun o'z-o'zidan
  // qayta quroliadi. Oddiy `sent: true` bayrog'i buni qila olmasdi.
  const cycleKey = String(lastCycleAt.getTime());
  const alreadySent = (claim.remindersSent || {})[stage];
  if (alreadySent === cycleKey) return `skip:already_sent:${stage}`;

  const tier = user.tier || user.accountType || "standard";
  const basePrice = getPlanPrice(tier, "monthly");
  if (basePrice === null) return `skip:unknown_tier:${tier}`;

  const percent = Number(claim.percent) || DISCOUNT_CONFIG.percent;
  const price = applyDiscount(basePrice, percent);
  const daysLeft = stage === "before_end" ? daysUntil(subscriptionEnd) : daysUntil(chainDeadline);

  const text = buildMessage(stage, {
    cyclesRemaining: remaining,
    percent,
    price,
    basePrice,
    daysLeft,
    tierLabel: tier === "pro" ? "Pro" : "Standard",
  });

  await sendMessage(telegramId, text, {
    inline_keyboard: [[{
      text: `💳 ${formatSom(price)} so'm — uzaytirish`,
      url: `${BOT_START_URL}${claim.uid}_${tier}_monthly`,
    }]],
  });

  // Belgi xabar YUBORILGACH qo'yiladi: yuborish yiqilsa ertaga qayta
  // urinilsin. Teskarisi bo'lsa bitta tarmoq xatosi butun oyni yo'qotardi.
  await doc.ref.set({ remindersSent: { [stage]: cycleKey } }, { merge: true });

  return `sent:${stage}`;
}

/**
 * Kunlik yurish.
 *
 * Har bir hujjat alohida o'raladi — bitta o'quvchidagi xato (masalan botni
 * bloklagan) qolganlarning eslatmasini to'xtatmasligi shart.
 */
async function runDiscountReminders() {
  const db = admin.firestore();
  // Halqa import: `telegramBot` bu faylni talab qilmaydi, shuning uchun
  // xavfsiz — lekin token faqat o'sha faylda tursin.
  const { sendMessage } = require("./telegramBot");

  const snap = await db.collection("discount_claims")
    .where("cyclesRemaining", ">", 0)
    .limit(SCAN_LIMIT)
    .get();

  const tally = {};
  for (const doc of snap.docs) {
    // `ph_` — o'sha shaxsning ikkinchi kaliti, xabar faqat `tg_` bo'yicha.
    if (!doc.id.startsWith("tg_")) continue;
    try {
      const outcome = await processClaim(db, sendMessage, doc);
      tally[outcome] = (tally[outcome] || 0) + 1;
    } catch (err) {
      console.error(`Eslatma yuborilmadi (${doc.id}):`, err);
      tally["error"] = (tally["error"] || 0) + 1;
    }
  }

  console.log("Chegirma eslatmalari:", JSON.stringify({ scanned: snap.size, ...tally }));
  return tally;
}

/** Har kuni 10:00 (Toshkent). Kechqurun emas — to'lov admin tasdig'ini kutadi. */
const discountReminders = functions
  .runWith({ timeoutSeconds: 300, memory: "256MB" })
  .pubsub.schedule("0 10 * * *")
  .timeZone("Asia/Tashkent")
  .onRun(async () => {
    await runDiscountReminders();
    return null;
  });

module.exports = {
  discountReminders,
  runDiscountReminders,
  // Testlar uchun ochiladi.
  pickStage,
  buildMessage,
  processClaim,
  BEFORE_END_DAYS,
  LAST_CALL_DAYS,
};
