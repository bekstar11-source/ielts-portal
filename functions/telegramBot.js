const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const crypto = require("crypto");

// Speaking jonli tekshiruvi to'lovi shu yerdan tasdiqlanadi.
const { markSpeakingReviewPaid } = require("./speakingReview");

// Obuna narxlari va ro'yxatdan o'tish chegirmasi.
const {
  formatSom, getPlanPrice, BILLING_DAYS,
  TEACHER_TIERS, TEACHER_BILLING_DAYS, teacherPricePerStudent,
} = require("./pricing");

// O'qituvchi obunasi tasdiqlangach o'quvchilarga Pro huquqini tarqatish.
const { syncTeacherGroupPro } = require("./groupMembership");
const { toDate } = require("./subscription");
const {
  DISCOUNT_ALREADY_CLAIMED,
  DISCOUNT_CONFIG,
  clampCycles,
  getClaimRefs,
  resolveClaimState,
  buildClaimDoc,
  buildClaimCycleUpdate,
  checkDiscountEligibility,
} = require("./signupDiscount");

// ⚠️ Token endi kod ichida SAQLANMAYDI. Deploydan oldin sozlang:
//   firebase functions:config:set telegram.token="<BOTFATHER_TOKEN>" \
//                                 telegram.admin_chat_id="66049218" \
//                                 telegram.webhook_secret="<random>"
// (yoki TELEGRAM_TOKEN / TELEGRAM_ADMIN_CHAT_ID / TELEGRAM_WEBHOOK_SECRET env)
// Eski token git tarixida ochiq qolgani uchun BotFather'da revoke qilinishi shart.
let cfg = {};
try {
  // Legacy runtime config (Google uni to'xtatdi) — bo'lsa ishlatamiz, bo'lmasa .env
  cfg = (functions.config && functions.config().telegram) || {};
} catch (e) {
  cfg = {};
}
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || cfg.token || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || cfg.webhook_secret || "";

// Admin ID — faqat konfiguratsiyadan. Firestore'dagi `config/telegram` hujjati
// endi buni O'ZGARTIRA OLMAYDI (ilgari istalgan odam /admin_info yozib
// barcha to'lov tasdiqlash tugmalarini o'ziga o'tkazib olardi).
const ADMIN_CHAT_ID = String(
  process.env.TELEGRAM_ADMIN_CHAT_ID || cfg.admin_chat_id || "66049218"
);

function isAdminChat(chatId) {
  return String(chatId) === ADMIN_CHAT_ID;
}

/** Vaqt hujumiga chidamli string solishtirish. */
function safeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ─── Kirish sessiyasi (session fixation'ga qarshi) ───────────────────────
//
// ⚠️ MUAMMO: `sessionId` ni BRAUZER tanlaydi va u deep link orqali botga
// keladi. Hujumchi o'z sessiyasi bilan havola yasab qurbonga yuborsa
// (t.me/bot?start=login_<hujumchi_sessiyasi>), qurbon kontaktini ulashishi
// bilan QURBONNING token'i hujumchi sessiyasiga yozilar va hujumchi uning
// hisobiga kirib olardi.
//
// YECHIM: kontakt so'ralishidan OLDIN bot tasdiqlash so'raydi va sessiyadan
// kelib chiqadigan 4 belgili kodni ko'rsatadi. Xuddi shu kod foydalanuvchining
// brauzer ekranida ham turadi. Kodlar mos kelmasa — demak havola begona
// qurilma uchun, foydalanuvchi "Bekor qilish" ni bosadi.
// Brauzer tomonidagi juftligi: src/pages/auth/Login.jsx → derivePairingCode
function derivePairingCode(sessionId) {
  return crypto.createHash("sha256").update(`pair|${sessionId}`, "utf8")
    .digest("hex").slice(0, 4).toUpperCase();
}

// Boshlangan kirish sessiyasi shu muddatdan keyin kuchini yo'qotadi.
const LOGIN_STATE_TTL_MS = 5 * 60 * 1000;


exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  // Telegram webhook'ni faqat Telegram chaqirayotganiga ishonch hosil qilamiz
  // (setWebhook ... secret_token=<WEBHOOK_SECRET> bilan o'rnatilishi kerak).
  //
  // ⚠️ Ilgari bu tekshiruv `if (WEBHOOK_SECRET && ...)` edi — ya'ni secret
  // sozlanmagan bo'lsa HIMOYA UMUMAN ISHLAMASDI. U holda istalgan odam bu
  // function URL'iga soxta `callback_query` POST qilib, `chat.id` ni admin
  // ID'siga tenglashtirar va `isAdminChat()` tekshiruvini chetlab o'tib,
  // o'ziga bepul Pro/obuna tasdiqlatib olardi. Endi secret bo'lmasa
  // so'rov RAD ETILADI (fail-closed).
  if (!WEBHOOK_SECRET) {
    console.error(
      "TELEGRAM_WEBHOOK_SECRET sozlanmagan — webhook rad etildi. " +
      "Sozlash: firebase functions:config:set telegram.webhook_secret=\"<random>\" " +
      "(yoki TELEGRAM_WEBHOOK_SECRET env) va setWebhook'da secret_token bilan qayta ro'yxatdan o'tkazing."
    );
    return res.status(503).send("Webhook secret not configured");
  }

  if (!safeEquals(req.get("X-Telegram-Bot-Api-Secret-Token"), WEBHOOK_SECRET)) {
    console.warn("Rejected webhook call with invalid secret token");
    return res.status(401).send("Unauthorized");
  }

  const update = req.body;
  if (!update || (!update.message && !update.callback_query)) {
    return res.status(200).send("OK");
  }

  const message = update.message;
  const callbackQuery = update.callback_query;
  const chatId = message ? message.chat.id : callbackQuery.message.chat.id;
  const text = message ? message.text : null;
  const contact = message ? message.contact : null;
  const photo = message ? message.photo : null;
  const document = message ? message.document : null;

  try {
    // 1. Callback Query handle (Tugmalar bosilganda)
    if (callbackQuery) {
      await handleCallback(chatId, callbackQuery);
      return res.status(200).send("OK");
    }

    // 2. To'lov/Kirish uchun /start deep linking (start=USERID_PLANID_BILLING yoki start=login_SESSID)
    if (text && text.startsWith("/start ")) {
      const payload = text.split(" ")[1];
      
      if (payload === "login" || payload.startsWith("login_")) {
        const sessionId = payload.includes("_") ? payload.split("_")[1] : null;
        if (sessionId) {
          // Sessiya hali TASDIQLANMAGAN. Token yozilishidan oldin
          // foydalanuvchi ekranidagi kod bilan solishtirib tasdiqlashi shart
          // (izoh: derivePairingCode).
          await admin.firestore().collection("bot_states").doc(chatId.toString()).set({
            action: "login_pending",
            sessionId: sessionId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          await sendLoginConfirmPrompt(chatId, sessionId);
        } else {
          // sessionId'siz oddiy `/start login` — faqat qo'lda kod olish.
          await sendAuthCodePrompt(chatId);
        }
      } else {
        const parts = payload.split("_");
        // params: USERID_PLANID_BILLING
        // Agar userId ichida "_" bo'lsa (masalan telegram_ID), parts uzunligi 3 tadan ko'p bo'ladi
        if (parts.length >= 3) {
          const billing = parts.pop();
          const planId = parts.pop();
          const userId = parts.join("_");
          await handlePaymentStart(chatId, userId, planId, billing);
        } else {
          await sendWelcome(chatId, message.from.first_name);
        }
      }
    } 
    // 3. Oddiy /start
    else if (text === "/start") {
      await sendWelcome(chatId, message.from.first_name);
    }
    // 4. Screenshot yuborilganda (Rasm yoki hujjat ko'rinishida)
    else if (photo || (document && document.mime_type && document.mime_type.startsWith("image/"))) {
      await handleScreenshot(chatId, photo, document, message.from);
    }
    // 5. Chat ID ni ko'rsatish (faqat ma'lumot uchun — hech narsani o'zgartirmaydi).
    // Admin chat ID ni almashtirish endi faqat `functions:config:set` orqali.
    else if (text === "/admin_info") {
      await sendMessage(
        chatId,
        `Sizning Chat ID: <code>${chatId}</code>\n\n` +
        (isAdminChat(chatId)
          ? "✅ Siz admin sifatida ro'yxatdan o'tgansiz."
          : "ℹ️ Adminni almashtirish uchun: <code>firebase functions:config:set telegram.admin_chat_id=\"" + chatId + "\"</code>")
      );
    }
    // 6. Kontakt ulashilganda (Auth uchun)
    else if (contact) {
      await handleAuthContact(chatId, contact);
    }
    // 7. Admin xabar yuborishi (Reply state)
    else if (text && isAdminChat(chatId)) {
      const adminStateDoc = await admin.firestore().collection("admin_states").doc(chatId.toString()).get();
      if (adminStateDoc.exists) {
        const state = adminStateDoc.data();
        if (state.action === "replying") {
          await sendMessage(state.targetChatId, `💬 <b>Admin xabari:</b>\n\n${text}`);
          await sendMessage(chatId, "✅ Xabar yuborildi.");
          await admin.firestore().collection("admin_states").doc(chatId.toString()).delete();
          return res.status(200).send("OK");
        }
      }
      
      // Agar state yo'q bo'lsa oddiy start kabi
      await sendWelcome(chatId, message.from.first_name);
    }
    // 8. Boshqa matnlar uchun asosiy menyu
    else if (text) {
      await sendWelcome(chatId, message.from.first_name);
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return res.status(200).send("OK");
  }
});

// Faqat admin bosishi mumkin bo'lgan tugmalar.
const ADMIN_ONLY_CALLBACKS = ["approve_", "ap_mock_", "ap_teach_", "ap_spk_", "ask_reply_"];

// Callback handle (Tugmalar)
async function handleCallback(chatId, query) {
  const data = query.data;

  // ⚠️ Tasdiqlash tugmalari — pul beradigan amallar. Xabar boshqa chatga
  // ko'chirilgan yoki callback qo'lda yuborilgan holatlarda ham himoyalanadi.
  if (ADMIN_ONLY_CALLBACKS.some(prefix => data.startsWith(prefix)) && !isAdminChat(chatId)) {
    console.warn(`Non-admin chat ${chatId} tried admin callback: ${data}`);
    await answerCallbackQuery(query.id, "Bu amal faqat admin uchun.");
    return;
  }

  if (data === "show_prices") {
    const msg = "📊 <b>Tariflar va Narxlar:</b>\n\n" +
      "🔹 <b>Standard:</b>\n" +
      "  - 1 oy: 35 000 so'm\n" +
      "  - 3 oy: 89 000 so'm (Tejamkor!)\n\n" +
      "🔸 <b>Pro (AI bilan):</b>\n" +
      "  - 1 oy: 49 000 so'm\n" +
      "  - 3 oy: 129 000 so'm (Eng mashhur!)";
    
    await sendMessage(chatId, msg, {
      inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: "https://ielts-portal-v1.web.app/pricing" }]]
    });
  } 
  // VARIANT A upsell tugmasi: `sw_{billing}_{planId}`.
  // Bu O'QUVCHI tugmasi (ADMIN_ONLY_CALLBACKS ga kirmaydi) — u faqat o'z
  // chatidagi to'lov sessiyasini qayta yozadi, boshqa hech narsaga tegmaydi.
  else if (data.startsWith("sw_")) {
    const [, newBilling, newPlanId] = data.split("_");
    const sessionSnap = await admin.firestore()
      .collection("payment_sessions").doc(chatId.toString()).get();
    const userId = sessionSnap.exists ? sessionSnap.data().userId : null;

    if (!userId) {
      await answerCallbackQuery(query.id, "Sessiya eskirgan. Saytdan qaytadan boshlang.");
      return;
    }

    await answerCallbackQuery(query.id, "");
    await sendSubscriptionInvoice(chatId, userId, newPlanId, newBilling);
  }
  else if (data === "check_status") {
    // Foydalanuvchi statusini bazadan tekshirish logikasi (agar userId saqlangan bo'lsa)
    await sendMessage(chatId, "⏳ Sizning to'lovingiz tekshirilmoqda. Agar to'lov qilgan bo'lsangiz, tez orada Pro ruxsat beriladi.");
  }
  else if (data.startsWith("ap_mock_")) {
    const mockId = data.slice(8); // Extract mock ID directly

    const { studentUserId, studentChatId } = parseStudentFromCaption(query.message.caption);
    if (!studentUserId || !studentChatId) {
      await sendMessage(chatId, "❌ Xatolik: O'quvchi ma'lumotlarini caption'dan o'qib bo'lmadi (ehtimol, bu chek allaqachon qayta ishlangan).");
      return;
    }

    try {
      // 1. Fetch mock metadata from Firestore
      const mockDoc = await admin.firestore().collection("tests_metadata").doc(mockId).get();
      if (!mockDoc.exists) {
        throw new Error("Mock test topilmadi.");
      }
      const mockData = mockDoc.data();
      
      // 2. Construct mock assignment object
      const now = new Date().toISOString();
      const mockKey = "PURCHASED_" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const mockAssignment = {
        id: "MOCK_" + mockKey,
        type: "mock_full",
        title: mockData.title,
        collectionId: mockData.collectionId || "",
        startDate: now,
        status: "unlocked_mock",
        mockKey: mockKey,
        subTests: {
          reading: mockData.subTests?.readingId || "",
          listening: mockData.subTests?.listeningId || "",
          writing: mockData.subTests?.writingId || ""
        }
      };

      // 3. Add to user's mockTests array in firestore
      const userRef = admin.firestore().collection("users").doc(studentUserId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new Error(`Foydalanuvchi topilmadi: ${studentUserId}`);
      }
      await userRef.update({
        mockTests: admin.firestore.FieldValue.arrayUnion(mockAssignment)
      });

      // To'lov sessiyasini yopamiz (keyingi chek eski tanlov bilan aralashmasligi uchun)
      await admin.firestore().collection("payment_sessions").doc(studentChatId).set({
        status: "approved",
        approvedMockId: mockId,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // 4. Notify Student
      await sendMessage(studentChatId, `🎉 <b>Mock to'lovingiz tasdiqlandi!</b>\n\nSizga <b>${mockData.title}</b> mock imtihoni ochildi. Saytga kirib "Mock Exams" bo'limida uni topshirishingiz mumkin.`);
      
      // 5. Update Admin Message
      await editMessageText(chatId, query.message.message_id, `✅ <b>MOCK TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId}</code>\nMock: <b>${mockData.title}</b>\nStatus: Yakunlandi.`);
    } catch (err) {
      console.error("Mock Promotion Error:", err);
      await sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
    }
  }
  else if (data.startsWith("ap_spk_")) {
    // Speaking sessiyasi uchun jonli o'qituvchi tekshiruvi to'lovi.
    const orderId = data.slice("ap_spk_".length);

    const { studentUserId, studentChatId } = parseStudentFromCaption(query.message.caption);
    if (!studentChatId) {
      await sendMessage(chatId, "❌ Xatolik: O'quvchi chat ID sini caption'dan o'qib bo'lmadi.");
      return;
    }

    try {
      const { price } = await markSpeakingReviewPaid(orderId);
      const formatted = new Intl.NumberFormat("uz-UZ").format(price);

      await admin.firestore().collection("payment_sessions").doc(studentChatId).set({
        status: "approved",
        approvedSpeakingOrderId: orderId,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await sendMessage(
        studentChatId,
        `🎉 <b>To'lovingiz tasdiqlandi!</b>\n\nSpeaking javoblaringiz jonli o'qituvchi tekshiruviga yuborildi. Tayyor bo'lgach saytdagi Speaking bo'limida ko'rasiz.`
      );
      await editMessageText(
        chatId,
        query.message.message_id,
        `✅ <b>SPEAKING TEKSHIRUVI TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId || "-"}</code>\nBuyurtma: <code>${orderId}</code>\nSumma: <b>${formatted} so'm</b>`
      );
    } catch (err) {
      console.error("Speaking review approval error:", err);
      await sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
    }
  }
  else if (data.startsWith("ap_teach_")) {
    // O'qituvchi guruh obunasini tasdiqlash
    const tierId = data.slice("ap_teach_".length);
    const tierInfo = TEACHER_TIERS[tierId];
    if (!tierInfo) {
      await sendMessage(chatId, "❌ Noma'lum o'qituvchi tarifi: " + tierId);
      return;
    }

    const { studentUserId, studentChatId } = parseStudentFromCaption(query.message.caption);
    if (!studentUserId || !studentChatId) {
      await sendMessage(chatId, "❌ Xatolik: Foydalanuvchi ma'lumotlarini caption'dan o'qib bo'lmadi.");
      return;
    }

    try {
      const db = admin.firestore();
      const userRef = db.collection("users").doc(studentUserId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new Error(`Foydalanuvchi topilmadi: ${studentUserId}`);
      }

      // Amaldagi obuna ustiga qo'shamiz.
      // ⚠️ `toDate` — chunki `validUntil` eski yozuvlarda ISO satr, yangilarida
      // Timestamp. `new Date(timestamp)` "Invalid Date" berib, faol obunani
      // tugagan deb hisoblardi va muddat noldan boshlanardi.
      const current = userSnap.data().teacherSubscription;
      const currentEnd = toDate(current && current.validUntil);
      const base = currentEnd && currentEnd > new Date() ? new Date(currentEnd) : new Date();
      // Kun bilan qo'shamiz: `setMonth(+1)` 31-yanvarda 3-martga sakraydi va
      // o'quvchi obunalaridagi 30 kunlik davr bilan mos kelmasdi.
      base.setDate(base.getDate() + TEACHER_BILLING_DAYS);

      await userRef.update({
        teacherSubscription: {
          tierId: tierId,
          tier: tierInfo.name,
          maxStudents: tierInfo.maxStudents,
          price: tierInfo.price,
          validUntil: admin.firestore.Timestamp.fromDate(base)
        }
      });

      // O'quvchilar Pro huquqini shu zahoti oladi — aks holda ular buni
      // faqat keyingi kunlik supurgidan keyin ko'rardi.
      let syncedStudents = 0;
      try {
        syncedStudents = await syncTeacherGroupPro(db, studentUserId);
      } catch (syncErr) {
        console.error("syncTeacherGroupPro failed:", syncErr);
      }

      await db.collection("payment_sessions").doc(studentChatId).set({
        status: "approved",
        approvedTeacherTier: tierId,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const endText = base.toLocaleDateString("uz-UZ");
      await sendMessage(studentChatId, `🎉 <b>To'lovingiz tasdiqlandi!</b>\n\n<b>${tierInfo.name}</b> obunasi faollashtirildi (${tierInfo.maxStudents} tagacha o'quvchi).\n👑 Guruhingizdagi o'quvchilar PRO imkoniyatlarini oladi.\n📅 <b>Muddat:</b> ${endText} gacha.`);
      await editMessageText(chatId, query.message.message_id, `✅ <b>O'QITUVCHI OBUNASI TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId}</code>\nTarif: <b>${tierInfo.name}</b>\nMuddat: <b>${endText}</b>\nPro berilgan o'quvchilar: <b>${syncedStudents}</b>`);
    } catch (err) {
      console.error("Teacher Promotion Error:", err);
      await sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
    }
  }
  else if (data.startsWith("approve_")) {
    // callback_data = `approve_{tier}`. Ilgari chatId va uid ham shu yerga
    // tiqilardi — Telegram'ning 64 baytlik chegarasiga urilib, uzun uid'larda
    // tugma umuman ishlamay qolardi. Endi ular caption'dan o'qiladi (ap_mock_ kabi).
    const tier = data.slice("approve_".length);
    if (tier !== "pro" && tier !== "standard") {
      await sendMessage(chatId, "❌ Noma'lum tarif: " + tier);
      return;
    }

    const { studentUserId, studentChatId } = parseStudentFromCaption(query.message.caption);
    if (!studentUserId || !studentChatId) {
      await sendMessage(chatId, "❌ Xatolik: O'quvchi ma'lumotlarini caption'dan o'qib bo'lmadi (ehtimol, bu chek allaqachon qayta ishlangan).");
      return;
    }

    try {
      const db = admin.firestore();
      const sessionRef = db.collection("payment_sessions").doc(studentChatId);
      const userRef = db.collection("users").doc(studentUserId);

      // Get billing info from payment_sessions to determine duration
      const sessionDoc = await sessionRef.get();
      const sessionData = sessionDoc.exists ? sessionDoc.data() : null;

      // Sessiya boshqa foydalanuvchiga tegishli bo'lsa — to'xtatamiz
      // (chat egasi almashgan yoki eski sessiya qolib ketgan holat).
      if (sessionData && sessionData.userId && sessionData.userId !== studentUserId) {
        await sendMessage(chatId, `⚠️ Bekor qilindi: sessiyadagi foydalanuvchi (<code>${sessionData.userId}</code>) tugmadagidan (<code>${studentUserId}</code>) farq qiladi.`);
        return;
      }
      if (sessionData && sessionData.status === "approved") {
        await sendMessage(chatId, "⚠️ Bu to'lov allaqachon tasdiqlangan (takroriy bosish e'tiborsiz qoldirildi).");
        return;
      }

      const billingDays = sessionData && sessionData.billing === "tri"
        ? BILLING_DAYS.tri
        : BILLING_DAYS.monthly;

      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        await sendMessage(chatId, `❌ Foydalanuvchi topilmadi: <code>${studentUserId}</code>. O'quvchi avval saytga kirishi kerak.`);
        return;
      }

      // ─── Chegirmani SARFLASH ────────────────────────────────────────────
      //
      // Sessiya yozilgandan beri (o'quvchi karta raqamini ko'rgan paytdan
      // adminning tugma bosishigacha soatlar o'tishi mumkin) o'sha shaxs
      // boshqa hisob orqali chegirmani ishlatib ulgurgan bo'lishi mumkin —
      // shuning uchun reyestr TRANZAKSIYA ichida qayta tekshiriladi.
      const discountPercent = (sessionData && sessionData.discountPercent) || 0;
      // Sessiyada yozilgan raqamlar: shu to'lov necha oyni yeydi va jami nechta.
      //
      // ⚠️ Eski sessiyalar (bu deploydan oldin ochilgan, hali tasdiqlanmagan)
      // `discountCycles` siz keladi. Ularga yangi ko'p oylik hisobni qo'llasak,
      // 50% lik eski taklif bilan kelgan o'quvchi yana ikki oy 50% olardi.
      // Shuning uchun ular AYNAN eski qoida bilan yopiladi: 1 dan 1, ya'ni
      // bitta to'lovda chegirma to'liq sarflanadi.
      const hasCycleInfo = Boolean(sessionData && Number(sessionData.discountCycles) > 0);
      const discountCycles = hasCycleInfo ? Number(sessionData.discountCycles) : 1;
      // ⚠️ `clampCycles`: shu deploydan oldin ochilgan, hali tasdiqlanmagan
      // sessiyalarda `discountCyclesTotal: 3` bo'lishi mumkin (eski
      // `config/trial` qiymati). Cheklamasak, tasdiqlash paytida yana 3 oylik
      // hisob tiklanardi va sayt bilan bot yana ajralib ketardi.
      const discountCyclesTotal = hasCycleInfo
        ? (clampCycles(sessionData.discountCyclesTotal) || DISCOUNT_CONFIG.cycles)
        : 1;
      const phoneNumber = userSnap.data().phoneNumber || null;
      const { tgRef, phRef } = getClaimRefs(db, studentChatId, phoneNumber);

      let base = null;
      let discountConflict = false;
      let cyclesLeftAfter = 0;

      try {
        await db.runTransaction(async (tx) => {
          // ⚠️ Firestore tranzaksiyasida BARCHA o'qishlar yozuvlardan oldin.
          const claimSnaps = discountPercent > 0
            ? await Promise.all([tx.get(tgRef), phRef ? tx.get(phRef) : Promise.resolve(null)])
            : [];
          const freshUser = await tx.get(userRef);

          // Sanoqchi holati: `tg_` va `ph_` orasidagi UMUMIY hisob.
          // Hujjat mavjudligi endi yetarli emas — muhimi qancha oy qolgani.
          const claimState = resolveClaimState(claimSnaps, discountCyclesTotal);
          if (discountPercent > 0 && claimState.remaining < discountCycles) {
            throw new Error(DISCOUNT_ALREADY_CLAIMED);
          }

          // Amaldagi obuna ustiga QO'SHAMIZ. Ilgari muddat har safar bugundan
          // qayta boshlanardi va qolgan kunlar yonib ketardi.
          const currentEnd = freshUser.data().subscriptionEnd;
          const currentEndDate =
            currentEnd && typeof currentEnd.toDate === "function" ? currentEnd.toDate() : null;
          base = currentEndDate && currentEndDate > new Date() ? new Date(currentEndDate) : new Date();
          base.setDate(base.getDate() + billingDays);

          const userUpdate = {
            tier: tier, // pro or standard
            accountType: tier, // for backward compatibility and header checks
            isPro: tier === "pro",
            // Legacy bayroqlar tozalanadi, aks holda ular muddatdan qat'i nazar ruxsat berardi
            isPremium: admin.firestore.FieldValue.delete(),
            subscriptionStart: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionEnd: admin.firestore.Timestamp.fromDate(base)
          };

          if (discountPercent > 0) {
            const used = claimState.used + discountCycles;
            const remaining = Math.max(0, claimState.remaining - discountCycles);
            cyclesLeftAfter = remaining;

            const money = {
              uid: studentUserId,
              planId: sessionData.planId,
              billing: sessionData.billing,
              percent: discountPercent,
              originalPrice: sessionData.originalPrice,
              finalPrice: sessionData.price,
            };

            // Har bir reyestr hujjati alohida qaraladi: biri bo'lib, ikkinchisi
            // bo'lmasligi mumkin (o'quvchi Telegramni almashtirgan holat).
            // Yo'g'i `create` bilan tug'iladi — bu BIRINCHI tsikldagi poyga
            // himoyasini saqlab qoladi (hujjat oradan paydo bo'lsa tranzaksiya
            // yiqiladi). Bori esa umumiy holatga TENGLASHTIRILADI.
            const cycleUpdate = buildClaimCycleUpdate({ ...money, used, remaining });
            const firstDoc = buildClaimDoc({
              ...money,
              telegramId: studentChatId,
              phoneNumber,
              cyclesTotal: discountCyclesTotal,
              cyclesUsed: used,
            });

            [tgRef, phRef].forEach((ref, i) => {
              if (!ref) return;
              const snap = claimSnaps[i];
              if (snap && snap.exists) tx.update(ref, cycleUpdate);
              else tx.create(ref, firstDoc);
            });

            // `users` hujjatidagi nusxa — faqat Pricing.jsx da ko'rsatish uchun.
            // Chegirma butunlay tugagandagina `used` bo'ladi; ilgari bu birinchi
            // to'lovdayoq yozilardi va 2-oyda taklif yo'qolgandek ko'rinardi.
            userUpdate["signupDiscount.cyclesUsed"] = used;
            userUpdate["signupDiscount.cyclesRemaining"] = remaining;
            userUpdate["signupDiscount.lastCycleAt"] = admin.firestore.Timestamp.now();
            if (remaining <= 0) {
              userUpdate["signupDiscount.status"] = "used";
              userUpdate["signupDiscount.usedAt"] = admin.firestore.Timestamp.now();
            }
          }

          tx.update(userRef, userUpdate);
        });
      } catch (txErr) {
        if (txErr.message !== DISCOUNT_ALREADY_CLAIMED) throw txErr;

        // Chegirma allaqachon ishlatilgan. Pul KELGAN — obunani bermay
        // turish noto'g'ri bo'lardi. Shuning uchun chegirmasiz qayta
        // yozamiz va adminni ogohlantiramiz: summa farqini u hal qiladi.
        discountConflict = true;
        const currentEnd = userSnap.data().subscriptionEnd;
        const currentEndDate =
          currentEnd && typeof currentEnd.toDate === "function" ? currentEnd.toDate() : null;
        base = currentEndDate && currentEndDate > new Date() ? new Date(currentEndDate) : new Date();
        base.setDate(base.getDate() + billingDays);

        await userRef.update({
          tier: tier,
          accountType: tier,
          isPro: tier === "pro",
          isPremium: admin.firestore.FieldValue.delete(),
          subscriptionStart: admin.firestore.FieldValue.serverTimestamp(),
          subscriptionEnd: admin.firestore.Timestamp.fromDate(base)
        });
      }

      if (discountConflict) {
        await sendMessage(chatId,
          `⚠️ <b>Obuna berildi, LEKIN chegirmali oylar yetmadi.</b>\n\n` +
          `Foydalanuvchi: <code>${studentUserId}</code>\n` +
          `To'langan (kutilgan): ${formatSom(sessionData.price)} so'm\n` +
          `To'liq narx: ${formatSom(sessionData.originalPrice)} so'm\n\n` +
          `Sessiya ochilgandan keyin bu shaxs chegirmali oylarini boshqa hisob ` +
          `orqali sarflagan bo'lishi mumkin — chekdagi summani tekshiring.`
        );
      }

      // Sessiyani yopamiz — aks holda keyingi chek eski `billing` bilan o'qilardi.
      if (sessionDoc.exists) {
        await sessionRef.set({
          status: "approved",
          approvedTier: tier,
          approvedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // Notify Student
      const tierName = tier === "pro" ? "Pro 🔥" : "Standard ✅";
      const periodName = billingDays === 90 ? "3 oylik" : "1 oylik";
      const endText = base.toLocaleDateString("uz-UZ");
      // Qolgan chegirmali oylar aytiladi — bu keyingi to'lovni qaytarib
      // keladigan yagona xabar. Sukut saqlasak o'quvchi 2-oyda to'liq narx
      // kutib, obunani uzaytirmay ketardi.
      let confirmMsg = `🎉 <b>To'lovingiz tasdiqlandi!</b>\n\n` +
        `Sizda <b>${periodName} ${tierName}</b> tarifi faollashtirildi.\n` +
        `📅 <b>Amal qilish muddati:</b> ${endText} gacha.`;
      if (!discountConflict && discountPercent > 0 && cyclesLeftAfter > 0) {
        confirmMsg += `\n\n🎁 <b>Chegirmangizdan yana ${cyclesLeftAfter} oy qoldi</b> — ` +
          `${endText} dan keyin ${DISCOUNT_CONFIG.maxGapDays} kun ichida to'lasangiz ` +
          `${discountPercent}% saqlanadi.`;
      }
      await sendMessage(studentChatId, confirmMsg);

      // Update Admin Message
      await editMessageText(chatId, query.message.message_id, `✅ <b>TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId}</code>\nTarif: <b>${tierName} (${periodName})</b>\nMuddat: <b>${endText}</b>\nStatus: Yakunlandi.`);
    } catch (err) {
      console.error("Promotion Error:", err);
      await sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
    }
  }
  else if (data.startsWith("ask_reply_")) {
    const studentChatId = data.split("_")[2];
    // Set admin's reply state
    await admin.firestore().collection("admin_states").doc(chatId.toString()).set({
      action: "replying",
      targetChatId: studentChatId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await sendMessage(chatId, "✍️ <b>Foydalanuvchiga yubormoqchi bo'lgan xabaringizni yozing:</b>\n\n(Keyingi yuborgan xabaringiz unga boradi)");
  }
  else if (data === "get_auth_code") {
    await sendAuthCodePrompt(chatId);
  }
  // Kirish sessiyasini TASDIQLASH — shundan keyingina kontakt so'raladi.
  else if (data.startsWith("lgok_")) {
    const sessionId = data.slice(5);
    const stateRef = admin.firestore().collection("bot_states").doc(chatId.toString());
    const stateSnap = await stateRef.get();
    const state = stateSnap.exists ? stateSnap.data() : null;

    // Tugma faqat SHU chat boshlagan va hali eskirmagan sessiya uchun ishlaydi.
    const startedMs = state && state.timestamp ? state.timestamp.toMillis() : 0;
    const stale = !startedMs || Date.now() - startedMs > LOGIN_STATE_TTL_MS;

    if (!state || state.sessionId !== sessionId || state.action !== "login_pending" || stale) {
      await answerCallbackQuery(query.id, "Bu so'rov eskirgan. Saytdan qaytadan boshlang.");
      await stateRef.delete().catch(() => {});
      return;
    }

    await stateRef.set({
      action: "login_auth",
      sessionId: sessionId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await answerCallbackQuery(query.id, "");
    await sendAuthCodePrompt(chatId);
  }
  else if (data.startsWith("lgno_")) {
    await admin.firestore().collection("bot_states").doc(chatId.toString()).delete().catch(() => {});
    await answerCallbackQuery(query.id, "");
    await sendMessage(
      chatId,
      "🛑 <b>Kirish bekor qilindi.</b>\n\n" +
      "Agar bu havolani kimdir sizga yuborgan bo'lsa — u sizning hisobingizga kirmoqchi bo'lgan. " +
      "Hech qanday ma'lumot uzatilmadi.\n\n" +
      "Saytga kirish uchun har doim saytning o'zidagi «Telegram orqali kirish» tugmasidan foydalaning."
    );
  }
}

/**
 * Kirishni tasdiqlash so'rovi. Foydalanuvchi botdagi kodni O'Z EKRANIDAGI kod
 * bilan solishtiradi — begona (fishing) havolada ular mos kelmaydi.
 */
async function sendLoginConfirmPrompt(chatId, sessionId) {
  const pairingCode = derivePairingCode(sessionId);

  const msg = "🔐 <b>Saytga kirishni tasdiqlang</b>\n\n" +
    `Brauzeringiz ekranida shu kod turgan bo'lishi kerak:\n\n👉 <code>${pairingCode}</code>\n\n` +
    "⚠️ <b>Agar kod mos kelmasa yoki siz hozir saytga kirmayotgan bo'lsangiz — " +
    "«Men emas» tugmasini bosing.</b> Aks holda hisobingizga boshqa odam kirib qolishi mumkin.";

  await sendMessage(chatId, msg, {
    inline_keyboard: [
      [{ text: "✅ Ha, bu men — davom etish", callback_data: `lgok_${sessionId}` }],
      [{ text: "❌ Men emas / bekor qilish", callback_data: `lgno_${sessionId}` }]
    ]
  });
}

async function sendAuthCodePrompt(chatId) {
  const msg = "📱 <b>Telefon raqamingizni yuboring</b>\n\n" +
    "Saytga kirish kodi (OTP) olish uchun quyidagi tugmani bosib telefon raqamingizni bot bilan ulashing.";
  
  const keyboard = {
    keyboard: [
      [{ text: "📱 Telefon raqamni yuborish", request_contact: true }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
  
  await sendMessage(chatId, msg, keyboard);
}

// Callback query'ga javob (Telegram'dagi "soat"ni to'xtatadi)
async function answerCallbackQuery(callbackQueryId, text) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "",
        show_alert: Boolean(text)
      })
    });
  } catch (err) {
    console.error("answerCallbackQuery error:", err);
  }
}

/** Adminga yuborilgan chek caption'idan o'quvchi ma'lumotlarini o'qiydi. */
function parseStudentFromCaption(caption) {
  const text = caption || "";
  const userMatch = text.match(/User ID:(?:<\/b>)?\s*(?:<code>)?\s*([^\s<]+)/i);
  const chatMatch = text.match(/Student Chat ID:(?:<\/b>)?\s*(?:<code>)?\s*([^\s<]+)/i);
  return {
    studentUserId: userMatch ? userMatch[1] : null,
    studentChatId: chatMatch ? chatMatch[1] : null
  };
}

// Edit message helper — caption'ni yangilaydi va tugmalarni olib tashlaydi,
// shunda bir chek ikki marta tasdiqlanmaydi.
async function editMessageText(chatId, messageId, text) {
  await fetch(`${TELEGRAM_API}/editMessageCaption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] }
    })
  });
}

// Chiroyli Welcome xabari
async function sendWelcome(chatId, firstName) {
  const msg = `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
    `<b>IELTS Portal</b> rasmiy botiga xush kelibsiz. 🎓\n\n` +
    `Bu yerda siz:\n` +
    `✅ Saytga kirish uchun kod olishingiz;\n` +
    `✅ Premium tariflar uchun to'lov qilishingiz;\n` +
    `✅ To'lov cheklarini yuborishingiz mumkin.\n\n` +
    `Quyidagi tugmalardan birini tanlang:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "💎 Tariflar va Narxlar", callback_data: "show_prices" }],
      [{ text: "🔑 Kirish uchun kod", callback_data: "get_auth_code" }],
      [{ text: "🌐 Platformaga o'tish", url: "https://ielts-portal-v1.web.app" }]
    ]
  };

  await sendMessage(chatId, msg, keyboard);
}

// To'lov jarayoni (Chiroyli ko'rinishda)
async function handlePaymentStart(chatId, userId, planId, billing) {
  // Karta raqamini ko'rsatishdan OLDIN uid haqiqiyligini tekshiramiz.
  // Ilgari sayt tizimga kirmagan o'quvchi uchun `guest` yuborardi: o'quvchi
  // pulni to'lab, chekni yuborgach admin tasdiqlashda "Foydalanuvchi topilmadi"
  // xatosiga urilardi. Endi to'lovga umuman yo'l qo'ymaymiz.
  if (!userId || userId === "guest" || userId === "undefined" || userId === "null") {
    await sendMessage(chatId,
      `⚠️ <b>Avval saytga kiring.</b>\n\n` +
      `To'lovni bog'lash uchun hisobingiz kerak. Iltimos, saytga kiring va ` +
      `tarif tugmasini o'sha yerdan bosing — shundan keyin karta ma'lumotlari yuboriladi.`,
      { inline_keyboard: [[{ text: "🌐 Saytga kirish", url: "https://ielts-portal-v1.web.app/login" }]] }
    );
    return;
  }

  const userExists = await admin.firestore().collection("users").doc(userId).get();
  if (!userExists.exists) {
    await sendMessage(chatId,
      `⚠️ <b>Hisob topilmadi.</b>\n\n` +
      `Bu havoladagi foydalanuvchi (<code>${userId}</code>) bazada yo'q. ` +
      `Iltimos, saytga qaytadan kiring va tarif tugmasini bosing. To'lov qilmang — ` +
      `aks holda tasdiqlab bo'lmaydi.`,
      { inline_keyboard: [[{ text: "🌐 Saytga kirish", url: "https://ielts-portal-v1.web.app/login" }]] }
    );
    return;
  }

  // Speaking jonli tekshiruvi: start=UID_spk_{orderId}
  if (planId === "spk") {
    const orderId = billing;
    const orderSnap = await admin.firestore()
      .collection("speakingReviewOrders").doc(orderId).get();

    if (!orderSnap.exists) {
      await sendMessage(chatId, "❌ <b>Buyurtma topilmadi.</b> Saytdan qaytadan urinib ko'ring.");
      return;
    }
    const order = orderSnap.data();
    const formatted = new Intl.NumberFormat("uz-UZ").format(order.price);

    await admin.firestore().collection("payment_sessions").doc(chatId.toString()).set({
      userId,
      planId: "spk",
      speakingOrderId: orderId,
      sessionId: order.sessionId,
      price: order.price,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await sendMessage(chatId,
      `💳 <b>TO'LOV MA'LUMOTLARI (SPEAKING TEKSHIRUVI)</b>\n\n` +
      `📦 <b>Xizmat:</b> Jonli o'qituvchi tekshiruvi${order.topicTitle ? ` — ${order.topicTitle}` : ""}\n` +
      `💰 <b>Summa:</b> ${formatted} so'm\n\n` +
      `--------------------------\n` +
      `🏛 <b>Karta:</b> <code>8600 0529 2812 2652</code>\n` +
      `👤 <b>Ega:</b> Aslbek Jo'raboyev\n` +
      `--------------------------\n\n` +
      `📝 To'lov chekini (screenshot) shu botga yuboring — admin tasdiqlagach javoblaringiz o'qituvchiga boradi.`
    );
    return;
  }

  if (planId === "mock") {
    const mockId = billing;
    const mockDoc = await admin.firestore().collection("tests_metadata").doc(mockId).get();
    if (!mockDoc.exists) {
      await sendMessage(chatId, "❌ <b>Mock imtihon topilmadi.</b>");
      return;
    }
    const mockData = mockDoc.data();
    const price = mockData.price !== undefined ? mockData.price : 30000;
    const formattedPrice = new Intl.NumberFormat("uz-UZ").format(price);

    await admin.firestore().collection("payment_sessions").doc(chatId.toString()).set({
      userId,
      planId: "mock",
      mockId: mockId,
      mockTitle: mockData.title,
      price: price,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const msg = `💳 <b>TO'LOV MA'LUMOTLARI (MOCK IMTIHON)</b>\n\n` +
      `📦 <b>Imtihon:</b> ${mockData.title}\n` +
      `💰 <b>Summa:</b> ${formattedPrice} so'm\n\n` +
      `--------------------------\n` +
      `🏛 <b>Karta:</b> <code>8600 0529 2812 2652</code>\n` +
      `👤 <b>Ega:</b> Aslbek Jo'raboyev\n` +
      `--------------------------\n\n` +
      `📝 <b>Ko'rsatma:</b>\n` +
      `1. Yuqoridagi kartaga kerakli summani o'tkazing.\n` +
      `2. To'lov chekini (screenshot) ushbu botga yuboring.\n` +
      `3. Admin tasdiqlashi bilan platformada mock imtihon ochiladi.`;

    await sendMessage(chatId, msg);
    return;
  }

  // O'qituvchi guruh obunasi: start=UID_teacher_tier-10 ("_" ajratgich bo'lgani
  // uchun klient tarif ID sini "tier-10" ko'rinishida yuboradi).
  if (planId === "teacher") {
    const teacherTierId = String(billing).replace(/-/g, "_");
    const tierInfo = TEACHER_TIERS[teacherTierId];
    if (!tierInfo) {
      await sendMessage(chatId, "❌ <b>Bunday o'qituvchi tarifi topilmadi.</b>");
      return;
    }

    await admin.firestore().collection("payment_sessions").doc(chatId.toString()).set({
      userId,
      planId: "teacher",
      teacherTier: teacherTierId,
      maxStudents: tierInfo.maxStudents,
      price: tierInfo.price,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await sendMessage(chatId,
      `💳 <b>TO'LOV MA'LUMOTLARI (O'QITUVCHI OBUNASI)</b>\n\n` +
      `📦 <b>Tarif:</b> ${tierInfo.name} (${tierInfo.maxStudents} tagacha o'quvchi)\n` +
      `💰 <b>Summa:</b> ${formatSom(tierInfo.price)} so'm ` +
      `(${formatSom(teacherPricePerStudent(tierInfo))} so'm / o'quvchi)\n` +
      `👑 <b>O'quvchilarga:</b> PRO darajasi (obuna muddati davomida)\n` +
      `🗓 <b>Muddat:</b> ${TEACHER_BILLING_DAYS} kun\n\n` +
      `--------------------------\n` +
      `🏛 <b>Karta:</b> <code>8600 0529 2812 2652</code>\n` +
      `👤 <b>Ega:</b> Aslbek Jo'raboyev\n` +
      `--------------------------\n\n` +
      `📝 To'lov chekini (screenshot) shu botga yuboring — admin tasdiqlagach obuna faollashadi.`
    );
    return;
  }

  await sendSubscriptionInvoice(chatId, userId, planId, billing);
}

/**
 * Obuna to'lovi uchun karta ma'lumotlarini yuboradi.
 *
 * `handlePaymentStart` dan ham, "3 oylikka o'tish" tugmasidan ham chaqiriladi —
 * shuning uchun alohida funksiya.
 *
 * ⚠️ Bu yerda chegirma faqat TEKSHIRILADI, sarflanmaydi. Odam bu xabarni ko'rib
 * pul to'lamasligi mumkin; taklifni o'sha payt "yoqib yuborsak" u bekorga
 * yo'qolardi. Sarflash `approve_` tugmasida, tranzaksiya ichida bo'ladi.
 */
async function sendSubscriptionInvoice(chatId, userId, planId, billing) {
  const db = admin.firestore();

  const basePrice = getPlanPrice(planId, billing);
  if (basePrice === null) {
    await sendMessage(chatId, `❌ <b>Noma'lum tarif:</b> ${planId} (${billing}). Saytdan qaytadan tanlang.`);
    return;
  }

  let discount = { eligible: false, percent: 0, finalPrice: basePrice, upsell: null };
  try {
    discount = await checkDiscountEligibility(db, userId, chatId.toString(), planId, billing);
  } catch (err) {
    // Chegirma tekshiruvi yiqilsa to'lovni TO'XTATMAYMIZ — to'liq narx bilan
    // davom etamiz. Aks holda bitta xatolik butun sotuv oqimini o'ldirardi.
    console.error("Discount eligibility check failed:", err);
  }

  const finalPrice = discount.eligible ? discount.finalPrice : basePrice;
  const planName = planId.toUpperCase();
  const period = billing === "tri" ? "3 OY" : "1 OY";

  await db.collection("payment_sessions").doc(chatId.toString()).set({
    userId,
    planId,
    billing,
    price: finalPrice,
    originalPrice: basePrice,
    discountPercent: discount.eligible ? discount.percent : 0,
    // Sanoqchi uchun: shu to'lov necha OYNI yeydi va jami nechta bor.
    // Tasdiqlash tranzaksiyasi aynan shu raqamlarni ayiradi — narx bilan
    // sarflanadigan oy bitta sessiyada yozilishi shart, aks holda admin
    // soatlar keyin bosganda ikkisi ajralib qolardi.
    discountCycles: discount.eligible ? (discount.cycles || 0) : 0,
    discountCyclesTotal: discount.eligible ? (discount.cyclesTotal || DISCOUNT_CONFIG.cycles) : 0,
    discountCycleNumber: discount.eligible ? (discount.cycleNumber || 1) : 0,
    status: "pending",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  let priceBlock = `💰 <b>Summa:</b> ${formatSom(finalPrice)} so'm\n`;
  if (discount.eligible) {
    priceBlock =
      `💰 <b>Summa:</b> ${formatSom(finalPrice)} so'm\n` +
      `   <s>${formatSom(basePrice)}</s> · 🎁 <b>${discount.percent}% chegirma</b>\n`;
  }

  // Chegirma bir necha OYGA tarqalgan — o'quvchi buni to'lov paytida bilishi
  // shart. "1/2-oy" ni ko'rsatmasak, 2-oyda to'liq narx kutib, chegirma
  // yo'qolgan deb o'ylaydi va to'lamay ketadi.
  if (discount.eligible && discount.cyclesTotal > 1) {
    const last = discount.cycleNumber + discount.cycles - 1;
    const span = discount.cycles > 1 ? `${discount.cycleNumber}–${last}` : `${discount.cycleNumber}`;
    priceBlock += `   📅 Chegirmali oy: <b>${span}/${discount.cyclesTotal}</b>\n`;
  }

  let msg = `💳 <b>TO'LOV MA'LUMOTLARI</b>\n\n` +
    `📦 <b>Tarif:</b> ${planName} (${period})\n` +
    priceBlock +
    `\n--------------------------\n` +
    `🏛 <b>Karta:</b> <code>8600 0529 2812 2652</code>\n` +
    `👤 <b>Ega:</b> Aslbek Jo'raboyev\n` +
    `--------------------------\n\n` +
    `📝 <b>Ko'rsatma:</b>\n` +
    `1. Yuqoridagi kartaga kerakli summani o'tkazing.\n` +
    `2. To'lov chekini (screenshot) ushbu botga yuboring.\n` +
    `3. Admin tasdiqlashi bilan saytda Pro imkoniyatlar ochiladi.`;

  // Zanjir sharti — o'quvchiga AYTILISHI shart. Aks holda "45 kun" jimgina
  // ishlaydigan jazo bo'lib qoladi: odam kechikadi, chegirmasi yonadi va bu
  // qo'llab-quvvatlashga shikoyat bo'lib qaytadi.
  if (discount.eligible && discount.cyclesRemaining > discount.cycles) {
    const left = discount.cyclesRemaining - discount.cycles;
    msg += `\n\n🎁 <b>Chegirmangiz yana ${left} oy amal qiladi</b> — keyingi to'lovni ` +
      `obuna tugagach ${DISCOUNT_CONFIG.maxGapDays} kun ichida qilsangiz ${discount.percent}% saqlanadi.`;
  }

  // Zanjir uzilgan yoki qolgan oylar yetmagan holat: sabab aytilmasa o'quvchi
  // narxni xato deb o'ylab, kutilganidan kam summa o'tkazadi.
  if (!discount.eligible && discount.reason === "chain_expired") {
    msg += `\n\n⏳ <i>Chegirma zanjiri uzilgan (oxirgi to'lovdan ${DISCOUNT_CONFIG.maxGapDays} kundan ko'p o'tdi), ` +
      `shuning uchun narx to'liq.</i>`;
  } else if (!discount.eligible && discount.reason === "insufficient_cycles") {
    msg += `\n\n⏳ <i>Chegirmangizdan ${discount.cyclesRemaining} oy qolgan — u 3 oylik paketni qoplamaydi. ` +
      `1 oylik tanlasangiz chegirma ishlaydi.</i>`;
  }

  // Upsell: chegirma bor, lekin u BOSHQA davrga tegishli. Yangi takliflarda
  // bu 3 oylikni tanlagan o'quvchini 1 oylikka yo'naltiradi (chegirma 2 oyni
  // qoplaydi, tri esa 3 oyni yeydi); eski `["tri"]` takliflarda — aksincha.
  //
  // ⚠️ Matn `up.billing` dan qurilishi shart: qattiq "3 oylik" deb yozilsa,
  // 1 oylikka yo'naltiruvchi tugma teskari davrni reklama qilardi.
  let keyboard = null;
  const up = discount.upsell;
  if (!discount.eligible && up) {
    const upMonths = up.billing === "tri" ? 3 : 1;
    const upLabel = `${upMonths} oylik`;
    const perMonthLine = upMonths > 1
      ? ` (oyiga ${formatSom(Math.round(up.finalPrice / upMonths))})`
      : "";
    msg += `\n\n--------------------------\n` +
      `🎁 <b>Sizda ${up.percent}% chegirma bor</b> — u ${upLabel} paketda amal qiladi:\n` +
      `   <s>${formatSom(up.originalPrice)}</s> → <b>${formatSom(up.finalPrice)} so'm</b>` +
      perMonthLine;
    keyboard = {
      inline_keyboard: [[
        { text: `🎁 ${upLabel}ka o'tish — ${formatSom(up.finalPrice)} so'm`, callback_data: `sw_${up.billing}_${planId}` }
      ]]
    };
  }

  await sendMessage(chatId, msg, keyboard);
}

// Screenshot handling (Notification to Admin)
async function handleScreenshot(chatId, photoArray, documentObj, from) {
  let fileId = null;
  if (photoArray && photoArray.length > 0) {
    fileId = photoArray[photoArray.length - 1].file_id;
  } else if (documentObj) {
    fileId = documentObj.file_id;
  }

  if (!fileId) {
    await sendMessage(chatId, "❌ <b>Xatolik:</b> Rasm fayli topilmadi.");
    return;
  }

  const sessionDoc = await admin.firestore().collection("payment_sessions").doc(chatId.toString()).get();
  
  let session = null;
  let userId = null;

  const sessionData = sessionDoc.exists ? sessionDoc.data() : null;

  // Allaqachon tasdiqlangan sessiya "eski tanlov" hisoblanadi — uni tarif
  // sifatida ko'rsatib adminni chalg'itmaymiz (foydalanuvchi yangi to'lov uchun
  // saytdan qayta link ochishi kerak), lekin userId sifatida ishlatsa bo'ladi.
  if (sessionData && sessionData.status !== "approved") {
    session = sessionData;
  }
  userId = (sessionData && sessionData.userId) || null;

  if (!userId) {
    // Try to find user by telegram ID
    const userDoc = await admin.firestore().collection("users").doc(`telegram_${chatId}`).get();
    if (userDoc.exists) {
      userId = `telegram_${chatId}`;
    }
  }

  if (!userId) {
    await sendMessage(chatId, "❌ <b>Xatolik:</b> Profilingiz aniqlanmadi. Iltimos, avval platformaga Telegram orqali kiring yoki saytdan tarif/mock tanlang.");
    return;
  }

  const fromName = `${from.first_name} ${from.last_name || ""}`.trim();
  let adminMsg = `🎯 <b>YANGI TO'LOV KELDI!</b>\n\n` +
    `👤 <b>Kimdan:</b> ${fromName}\n` +
    `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
    `💬 <b>Student Chat ID:</b> <code>${chatId}</code>\n`;

  if (session) {
    if (session.planId === "mock") {
      const formattedPrice = new Intl.NumberFormat("uz-UZ").format(session.price);
      adminMsg += `📦 <b>Tanlangan:</b> ${session.mockTitle}\n` +
        `💰 <b>Summa:</b> ${formattedPrice} so'm\n`;
    } else if (session.planId === "spk") {
      adminMsg += `📦 <b>Tanlangan:</b> Speaking — jonli o'qituvchi tekshiruvi\n` +
        `🧾 <b>Buyurtma:</b> <code>${session.speakingOrderId}</code>\n` +
        `💰 <b>Summa:</b> ${new Intl.NumberFormat("uz-UZ").format(session.price)} so'm\n`;
    } else if (session.planId === "teacher") {
      const tierInfo = TEACHER_TIERS[session.teacherTier] || {};
      adminMsg += `📦 <b>Tanlangan:</b> O'qituvchi obunasi — ${tierInfo.name || session.teacherTier}\n` +
        `👥 <b>Limit:</b> ${session.maxStudents} o'quvchi\n` +
        `💰 <b>Summa:</b> ${new Intl.NumberFormat("uz-UZ").format(session.price)} so'm\n`;
    } else {
      // `session.price` endi RAQAM (ilgari "35 000" ko'rinishidagi matn edi) —
      // shuning uchun bu yerda ham formatlash kerak, aks holda admin
      // "89000 so'm" ko'rardi.
      adminMsg += `📦 <b>Tanlangan:</b> ${session.planId} (${session.billing})\n` +
        `💰 <b>Summa:</b> ${formatSom(session.price)} so'm\n`;
      if (session.discountPercent > 0) {
        adminMsg += `🎁 <b>Chegirma:</b> ${session.discountPercent}% ` +
          `(to'liq narx ${formatSom(session.originalPrice)} so'm)\n`;
        // Tsikl raqamisiz admin 2-oyda kamaytirilgan summani xato deb o'ylab
        // chekni rad etardi — chegirma endi bir martalik emas.
        if (session.discountCyclesTotal > 1) {
          const last = (session.discountCycleNumber || 1) + (session.discountCycles || 1) - 1;
          const span = (session.discountCycles || 1) > 1
            ? `${session.discountCycleNumber}–${last}`
            : `${session.discountCycleNumber}`;
          adminMsg += `📅 <b>Chegirmali oy:</b> ${span}/${session.discountCyclesTotal}\n`;
        }
      }
    }
  } else {
    adminMsg += `⚠️ <i>Tanlangan tarif/mock aniqlanmadi (chek to'g'ridan-to'g'ri yuborildi).</i>\n`;
  }
  adminMsg += `⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}\n\n` +
    `Tasdiqlash uchun tugmalardan foydalaning:`;

  const inlineKeyboard = [
    [
      // Student ID/chat ID caption'dan o'qiladi (callback_data 64 bayt bilan cheklangan)
      { text: "✅ Standard", callback_data: "approve_standard" },
      { text: "🔥 Pro", callback_data: "approve_pro" }
    ]
  ];

  if (session && session.planId === "spk" && session.speakingOrderId) {
    inlineKeyboard.unshift([
      {
        text: "🎤 Speaking tekshiruvi",
        callback_data: `ap_spk_${session.speakingOrderId}`
      }
    ]);
  }

  if (session && session.planId === "teacher") {
    const tierInfo = TEACHER_TIERS[session.teacherTier] || {};
    inlineKeyboard.unshift([
      {
        text: `👨‍🏫 O'qituvchi: ${tierInfo.name || session.teacherTier}`,
        callback_data: `ap_teach_${session.teacherTier}`
      }
    ]);
  }

  // Fetch all mock tests to list as buttons
  try {
    const mocksSnap = await admin.firestore().collection("tests_metadata")
      .where("type", "==", "mock")
      .get();

    mocksSnap.forEach(doc => {
      const mockData = doc.data();
      inlineKeyboard.push([
        { text: `🎁 Mock: ${mockData.title}`, callback_data: `ap_mock_${doc.id}` }
      ]);
    });
  } catch (err) {
    console.error("Error fetching mock tests for admin keyboard:", err);
  }

  inlineKeyboard.push([
    { text: "💬 Xabar yuborish", callback_data: `ask_reply_${chatId}` }
  ]);

  const adminKeyboard = { inline_keyboard: inlineKeyboard };

  await sendPhotoToAdmin(fileId, adminMsg, adminKeyboard);
  await sendMessage(chatId, "✅ <b>Rahmat!</b> Chekingiz qabul qilindi. Admin tez orada tekshirib ruxsat beradi. Odatda bu 5-15 daqiqa vaqt oladi.");
}

async function handleAuthContact(chatId, contact) {
  const cleanPhone = contact.phone_number.replace(/\D/g, "");
  const telegramId = (contact.user_id || chatId).toString();

  // ⚠️ Kod TAXMIN QILINMAYDIGAN bo'lishi shart: `Math.random()` kriptografik
  // emas va uning chiqishlaridan keyingi qiymatlarni tiklash mumkin.
  const code = crypto.randomInt(100000, 1000000).toString();

  // 1. Tasdiqlangan kirish sessiyasini olamiz.
  //    Faqat `login_auth` (foydalanuvchi botda «Ha, bu men» ni bosgan) va
  //    hali eskirmagan holat qabul qilinadi — tasdiqlanmagan `login_pending`
  //    ga token YOZILMAYDI.
  let sessionId = null;
  try {
    const botStateDoc = await admin.firestore().collection("bot_states").doc(chatId.toString()).get();
    if (botStateDoc.exists) {
      const stateData = botStateDoc.data();
      const startedMs = stateData.timestamp ? stateData.timestamp.toMillis() : 0;
      const stale = !startedMs || Date.now() - startedMs > LOGIN_STATE_TTL_MS;

      if (stateData.action === "login_auth" && stateData.sessionId && !stale) {
        sessionId = stateData.sessionId;
      } else if (stale || stateData.action === "login_pending") {
        // Eskirgan yoki tasdiqlanmagan holatni tozalaymiz.
        await admin.firestore().collection("bot_states").doc(chatId.toString()).delete().catch(() => {});
      }
    }
  } catch (err) {
    console.error("Error fetching bot state:", err);
  }

  // 2. Custom Token generation & user setup
  const firebaseUid = `telegram_${telegramId}`;
  let token = null;
  let isNewUser = false;
  try {
    token = await admin.auth().createCustomToken(firebaseUid);

    const userRef = admin.firestore().collection("users").doc(firebaseUid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      isNewUser = true;
      const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
      await userRef.set({
        uid: firebaseUid,
        telegramId: telegramId,
        phoneNumber: cleanPhone,
        fullName: fullName || "Telegram User",
        role: "student",
        accountType: "public",
        onboardingCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        isOnline: true
      });
    } else {
      const existingData = userSnap.data();
      if (!existingData.fullName || existingData.fullName === "Noma'lum" || existingData.fullName === "Telegram User") {
        const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
        if (fullName) {
          await userRef.update({ fullName });
        }
      }
    }
  } catch (err) {
    console.error("Error setting up Firebase user / token:", err);
  }

  // 3. Write back to login_sessions if sessionId is active
  if (sessionId && token) {
    try {
      await admin.firestore().collection("login_sessions").doc(sessionId).set({
        token: token,
        isNewUser: isNewUser,
        status: "authenticated",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      // clean up bot_state
      await admin.firestore().collection("bot_states").doc(chatId.toString()).delete();
    } catch (err) {
      console.error("Error writing to login_sessions:", err);
    }
  }

  // 4. Save code as fallback in telegram_codes
  await admin.firestore().collection("telegram_codes").doc(telegramId).set({
    code,
    phoneNumber: cleanPhone,
    firstName: contact.first_name || "",
    lastName: contact.last_name || "",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    chatId: chatId.toString(),
    attempts: 0 // noto'g'ri urinishlar hisoblagichi — verifyTelegramOTP ga qarang
  });

  let msg;
  if (sessionId) {
    msg = `🎉 <b>Muvaffaqiyatli kirdingiz!</b>\n\n` +
      `Platformadagi sahifangiz avtomatik ravishda profilingizga kirdi. Endi saytga qaytib o'rganishni davom ettirishingiz mumkin.\n\n` +
      `<i>(Agar avtomatik kirmagan bo'lsa, ushbu kodni saytga kiriting: <code>${code}</code>)</i>`;
  } else {
    msg = `🔑 <b>TASDIQLASH KODI</b>\n\n` +
      `Sizning maxfiy kodingiz:\n\n` +
      `👉 <code>${code}</code>\n\n` +
      `Ushbu kodni saytga kiriting. Hech kimga bermang!`;
  }

  await sendMessage(chatId, msg, {
    inline_keyboard: [[{ text: "🌐 Saytga qaytish", url: "https://ielts-portal-v1.web.app/dashboard" }]]
  });
}

// Bitta kodga ruxsat etilgan noto'g'ri urinishlar soni.
const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;

/**
 * Telegram OTP tekshiruvi.
 *
 * ⚠️ Ilgari bu yerda ikkita jiddiy teshik bor edi:
 *   1. `phoneNumber` berilmasa kod BUTUN kolleksiya bo'ylab qidirilardi
 *      (`where("code", "==", ...)`). Ya'ni 000000–999999 ni aylanib chiqqan
 *      hujumchi o'sha payt kod kutayotgan ISTALGAN foydalanuvchining
 *      token'ini olardi — kimning hisobi ekanini bilishi ham shart emasdi.
 *   2. Urinishlar soni cheklanmagandi: lockout ham, hisoblagich ham yo'q edi.
 *
 * Endi telefon raqami majburiy (ya'ni hujumchi qurbonning raqamini bilishi
 * shart) va har bir kod uchun atigi 5 ta urinish beriladi — shundan keyin kod
 * o'chiriladi va qaytadan so'rash kerak bo'ladi.
 */
/**
 * OTP kodini tekshiradi va uni ISHLATILGAN deb belgilaydi.
 *
 * Ikkita chaqiruvchisi bor: `verifyTelegramOTP` (Telegram orqali KIRISH) va
 * `linkTelegram` (mavjud hisobga Telegramni BOG'LASH). Ikkalasi bir xil
 * xavfsizlik shartlariga tayanadi — muddat, urinishlar limiti, doimiy vaqtli
 * solishtirish — shuning uchun mantiq bitta joyda turadi. Nusxalash bu yerda
 * ayniqsa xavfli: bitta nusxada limit unutilsa, kodni taxmin qilib bo'lardi.
 *
 * @returns {{telegramId: string, data: object, ref: object}}
 * @throws {functions.https.HttpsError}
 */
async function consumeTelegramOtp(phoneNumber, code) {
  if (!code || !/^\d{6}$/.test(String(code))) {
    throw new functions.https.HttpsError("invalid-argument", "Kod 6 xonali bo'lishi kerak.");
  }

  if (!phoneNumber || typeof phoneNumber !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Telefon raqami kiritilishi shart.");
  }

  const cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.length < 9) {
    throw new functions.https.HttpsError("invalid-argument", "Telefon raqami noto'g'ri.");
  }

  const snapshot = await admin.firestore().collection("telegram_codes")
    .where("phoneNumber", "==", cleanPhone)
    .get();

  if (snapshot.empty) {
    throw new functions.https.HttpsError("not-found", "Kod noto'g'ri yoki muddati o'tgan.");
  }

  const docs = snapshot.docs.sort((a, b) => {
    const tA = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
    const tB = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
    return tB - tA;
  });

  const doc = docs[0];
  const storedData = doc.data();

  const timestamp = storedData.timestamp ? storedData.timestamp.toMillis() : 0;
  if (!timestamp || Date.now() - timestamp > OTP_TTL_MS) {
    await doc.ref.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "Kod muddati tugagan. Yangi kod so'rang.");
  }

  const attempts = Number(storedData.attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await doc.ref.delete().catch(() => {});
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Juda ko'p noto'g'ri urinish. Botdan yangi kod so'rang."
    );
  }

  if (!safeEquals(String(storedData.code || ""), String(code))) {
    const left = OTP_MAX_ATTEMPTS - (attempts + 1);
    if (left <= 0) {
      await doc.ref.delete().catch(() => {});
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Juda ko'p noto'g'ri urinish. Botdan yangi kod so'rang."
      );
    }
    await doc.ref.update({ attempts: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    throw new functions.https.HttpsError(
      "permission-denied",
      `Kod noto'g'ri. Yana ${left} ta urinish qoldi.`
    );
  }

  return { telegramId: doc.id, data: storedData, ref: doc.ref };
}

/**
 * Mavjud hisobga Telegramni bog'laydi.
 *
 * Email bilan ro'yxatdan o'tgan foydalanuvchida Telegram bilan hech qanday
 * aloqa yo'q edi — ya'ni haftalik xulosa ularga umuman yetmasdi. Bu funksiya
 * `users/{uid}.telegramChatId` ni yozadi va shundan keyin xabar boradi.
 *
 * Maydon `firestore.rules` da himoyalangan: uni faqat shu yerdan yozish mumkin,
 * aks holda o'quvchi boshqa odamning chat id sini yozib, uning xabarlarini
 * o'ziga burib yuborardi.
 */
exports.linkTelegram = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
  }

  const { phoneNumber, code } = data || {};
  const { telegramId, ref } = await consumeTelegramOtp(phoneNumber, code);

  // Kod bir martalik — bog'langach darhol o'chiriladi.
  await ref.delete().catch(() => {});

  await admin.firestore().collection("users").doc(context.auth.uid).set({
    telegramChatId: String(telegramId),
    telegramLinkedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await sendMessage(
    telegramId,
    "🔗 <b>Hisobingiz bog'landi.</b>\n\nEndi har dushanba haftalik tahlil xulosasini shu yerda olasiz."
  ).catch(() => {});

  return { success: true };
});

exports.verifyTelegramOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber, code } = data || {};

  if (!code || !/^\d{6}$/.test(String(code))) {
    throw new functions.https.HttpsError("invalid-argument", "Kod 6 xonali bo'lishi kerak.");
  }

  if (!phoneNumber || typeof phoneNumber !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Telefon raqami kiritilishi shart.");
  }

  const cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.length < 9) {
    throw new functions.https.HttpsError("invalid-argument", "Telefon raqami noto'g'ri.");
  }

  const snapshot = await admin.firestore().collection("telegram_codes")
    .where("phoneNumber", "==", cleanPhone)
    .get();

  if (snapshot.empty) {
    throw new functions.https.HttpsError("not-found", "Kod noto'g'ri yoki muddati o'tgan.");
  }

  // Eng oxirgi so'ralgan kod
  const docs = snapshot.docs.sort((a, b) => {
    const tA = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
    const tB = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
    return tB - tA;
  });

  const doc = docs[0];
  const storedData = doc.data();

  // Muddat — kod yaratilganidan 5 daqiqa.
  const timestamp = storedData.timestamp ? storedData.timestamp.toMillis() : 0;
  if (!timestamp || Date.now() - timestamp > OTP_TTL_MS) {
    await doc.ref.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "Kod muddati tugagan. Yangi kod so'rang.");
  }

  // Urinishlar limiti — kodni topgunicha taxmin qilishning oldini oladi.
  const attempts = Number(storedData.attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await doc.ref.delete().catch(() => {});
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Juda ko'p noto'g'ri urinish. Botdan yangi kod so'rang."
    );
  }

  if (!safeEquals(String(storedData.code || ""), String(code))) {
    const left = OTP_MAX_ATTEMPTS - (attempts + 1);
    if (left <= 0) {
      await doc.ref.delete().catch(() => {});
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Juda ko'p noto'g'ri urinish. Botdan yangi kod so'rang."
      );
    }
    await doc.ref.update({ attempts: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    throw new functions.https.HttpsError(
      "permission-denied",
      `Kod noto'g'ri. Yana ${left} ta urinish qoldi.`
    );
  }

  const telegramId = doc.id;
  const phoneNumberVal = storedData.phoneNumber;

  // 1. Firebase Custom Token yaratish (telegramId ni UID sifatida ishlatamiz)
  const firebaseUid = `telegram_${telegramId}`;
  const token = await admin.auth().createCustomToken(firebaseUid);

  // 2. Foydalanuvchi bazada bormi tekshiramiz
  const userRef = admin.firestore().collection("users").doc(firebaseUid);
  const userSnap = await userRef.get();
  let isNewUser = false;

  if (!userSnap.exists) {
    isNewUser = true;
    const fullName = `${storedData.firstName || ""} ${storedData.lastName || ""}`.trim();
    await userRef.set({
      uid: firebaseUid,
      telegramId: telegramId,
      phoneNumber: phoneNumberVal,
      fullName: fullName || "Telegram User",
      role: "student",
      accountType: "public",
      onboardingCompleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      isOnline: true
    });
  } else {
    // If user exists but name is missing or "Noma'lum", update it
    const existingData = userSnap.data();
    if (!existingData.fullName || existingData.fullName === "Noma'lum" || existingData.fullName === "Telegram User") {
      const fullName = `${storedData.firstName || ""} ${storedData.lastName || ""}`.trim();
      if (fullName) {
        await userRef.update({ fullName });
      }
    }
  }

  // Muvaffaqiyatli - kodni o'chiramiz
  await doc.ref.delete();

  return { success: true, token, isNewUser, telegramId };
});

// Universal sendMessage function
async function sendMessage(chatId, text, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML"
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

/**
 * Adminga bildirishnoma (HTML). Boshqa modullar ham chaqiradi — masalan
 * `trial.js` chegirma berilganda.
 *
 * Xatosi ATAYLAB yutiladi: bildirishnoma yuborilmagani asosiy amalni
 * (chegirma berish, to'lov tasdiqlash) yiqitmasligi kerak.
 */
async function notifyAdmin(text, replyMarkup = null) {
  if (!TELEGRAM_TOKEN || !ADMIN_CHAT_ID) return false;
  try {
    await sendMessage(ADMIN_CHAT_ID, text, replyMarkup);
    return true;
  } catch (err) {
    console.warn("Adminga xabar yuborilmadi:", err);
    return false;
  }
}
exports.notifyAdmin = notifyAdmin;
// Rejalashtirilgan eslatmalar shu yerdan yuboriladi (discountReminders.js).
// Token/API manzili faqat SHU faylda turadi — nusxa ko'chirilmasin.
exports.sendMessage = sendMessage;
exports.consumeTelegramOtp = consumeTelegramOtp;

async function sendPhotoToAdmin(fileId, caption, replyMarkup = null) {
  if (ADMIN_CHAT_ID) {
    const body = {
      chat_id: ADMIN_CHAT_ID,
      photo: fileId,
      caption: caption,
      parse_mode: "HTML"
    };
    if (replyMarkup) body.reply_markup = replyMarkup;

    await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
}
