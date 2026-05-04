const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Yangi API Token
const TELEGRAM_TOKEN = "8727553547:AAGgaEuqs2ZHADttfcjKlzeHtLrZcaqX0c4";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Admin ID
let ADMIN_CHAT_ID = "66049218";

exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
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

  try {
    // 1. Callback Query handle (Tugmalar bosilganda)
    if (callbackQuery) {
      await handleCallback(chatId, callbackQuery);
      return res.status(200).send("OK");
    }

    // 2. To'lov uchun /start deep linking (start=USERID_PLANID_BILLING)
    if (text && text.startsWith("/start ")) {
      const payload = text.split(" ")[1];
      const parts = payload.split("_");
      if (parts.length >= 2) {
        const [userId, planId, billing] = parts;
        await handlePaymentStart(chatId, userId, planId, billing);
      }
    } 
    // 3. Oddiy /start
    else if (text === "/start") {
      await sendWelcome(chatId, message.from.first_name);
    }
    // 4. Screenshot yuborilganda
    else if (photo) {
      await handleScreenshot(chatId, photo, message.from);
    }
    // 5. Admin uchun ID sini bilish
    else if (text === "/admin_info") {
      await sendMessage(chatId, `Sizning Chat ID: <code>${chatId}</code>\nUni functions/telegramBot.js dagi ADMIN_CHAT_ID ga yozib qo'ying.`);
    }
    // 6. Kontakt ulashilganda (Auth uchun)
    else if (contact) {
      await handleAuthContact(chatId, contact);
    }
    // 7. Admin xabar yuborishi (Reply state)
    else if (text && chatId.toString() === ADMIN_CHAT_ID) {
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

// Callback handle (Tugmalar)
async function handleCallback(chatId, query) {
  const data = query.data;
  
  if (data === "show_prices") {
    const msg = "📊 <b>Tariflar va Narxlar:</b>\n\n" +
      "🔹 <b>Standard:</b>\n" +
      "  - 1 oy: 29 000 so'm\n" +
      "  - 3 oy: 79 000 so'm (Tejamkor!)\n\n" +
      "🔸 <b>Pro (AI bilan):</b>\n" +
      "  - 1 oy: 39 000 so'm\n" +
      "  - 3 oy: 99 000 so'm (Eng mashhur!)";
    
    await sendMessage(chatId, msg, {
      inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: "https://ielts-portal-v1.web.app/pricing" }]]
    });
  } 
  else if (data === "check_status") {
    // Foydalanuvchi statusini bazadan tekshirish logikasi (agar userId saqlangan bo'lsa)
    await sendMessage(chatId, "⏳ Sizning to'lovingiz tekshirilmoqda. Agar to'lov qilgan bo'lsangiz, tez orada Pro ruxsat beriladi.");
  }
  else if (data.startsWith("approve_")) {
    // approve_tier_studentChatId_studentUserId
    const [_, tier, studentChatId, studentUserId] = data.split("_");
    
    try {
      // Update User in Firestore
      await admin.firestore().collection("users").doc(studentUserId).update({
        tier: tier, // pro or standard
        accountType: tier, // for backward compatibility and header checks
        isPro: tier === "pro",
        subscriptionStart: admin.firestore.FieldValue.serverTimestamp()
      });

      // Notify Student
      const tierName = tier === "pro" ? "Pro 🔥" : "Standard ✅";
      await sendMessage(studentChatId, `🎉 <b>To'lovingiz tasdiqlandi!</b>\n\nSizda <b>${tierName}</b> tarifi faollashtirildi. Endi platformaning barcha imkoniyatlaridan foydalanishingiz mumkin.`);
      
      // Update Admin Message
      await editMessageText(chatId, query.message.message_id, `✅ <b>TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId}</code>\nTarif: <b>${tierName}</b>\nStatus: Yakunlandi.`);
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
}

// Edit message helper
async function editMessageText(chatId, messageId, text) {
  await fetch(`${TELEGRAM_API}/editMessageCaption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: "HTML"
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
  const prices = {
    standard_monthly: "29 000", standard_tri: "79 000",
    pro_monthly: "39 000", pro_tri: "99 000"
  };

  const key = `${planId}_${billing}`;
  const price = prices[key] || "aniqlanmagan";
  const planName = planId.toUpperCase();
  const period = billing === "tri" ? "3 OY" : "1 OY";

  await admin.firestore().collection("payment_sessions").doc(chatId.toString()).set({
    userId, planId, billing, price, status: "pending", timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  const msg = `💳 <b>TO'LOV MA'LUMOTLARI</b>\n\n` +
    `📦 <b>Tarif:</b> ${planName} (${period})\n` +
    `💰 <b>Summa:</b> ${price} so'm\n\n` +
    `--------------------------\n` +
    `🏛 <b>Karta:</b> <code>8600 0529 2812 2652</code>\n` +
    `👤 <b>Ega:</b> Aslbek Jo'raboyev\n` +
    `--------------------------\n\n` +
    `📝 <b>Ko'rsatma:</b>\n` +
    `1. Yuqoridagi kartaga kerakli summani o'tkazing.\n` +
    `2. To'lov chekini (screenshot) ushbu botga yuboring.\n` +
    `3. Admin tasdiqlashi bilan saytda Pro imkoniyatlar ochiladi.`;

  await sendMessage(chatId, msg);
}

// Screenshot handling (Notification to Admin)
async function handleScreenshot(chatId, photoArray, from) {
  const fileId = photoArray[photoArray.length - 1].file_id;
  const sessionDoc = await admin.firestore().collection("payment_sessions").doc(chatId.toString()).get();
  
  if (!sessionDoc.exists) {
    await sendMessage(chatId, "❌ <b>Xatolik:</b> Iltimos, avval saytdan tarifni tanlang.");
    return;
  }

  const session = sessionDoc.data();
  const adminMsg = `🎯 <b>YANGI TO'LOV KELDI!</b>\n\n` +
    `👤 <b>Kimdan:</b> ${from.first_name} ${from.last_name || ""}\n` +
    `🆔 <b>User ID:</b> <code>${session.userId}</code>\n` +
    `📦 <b>Tarif:</b> ${session.planId} (${session.billing})\n` +
    `💰 <b>Summa:</b> ${session.price} so'm\n` +
    `⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}\n\n` +
    `Tasdiqlash uchun tugmalardan foydalaning:`;

  const adminKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Standard", callback_data: `approve_standard_${chatId}_${session.userId}` },
        { text: "🔥 Pro", callback_data: `approve_pro_${chatId}_${session.userId}` }
      ],
      [
        { text: "💬 Habar yuborish", callback_data: `ask_reply_${chatId}` }
      ]
    ]
  };

  await sendPhotoToAdmin(fileId, adminMsg, adminKeyboard);
  await sendMessage(chatId, "✅ <b>Rahmat!</b> Chekingiz qabul qilindi. Admin tez orada tekshirib ruxsat beradi. Odatda bu 5-15 daqiqa vaqt oladi.");
}

async function handleAuthContact(chatId, contact) {
  const cleanPhone = contact.phone_number.replace(/\D/g, "");
  const telegramId = contact.user_id.toString();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await admin.firestore().collection("telegram_codes").doc(telegramId).set({
    code, phoneNumber: cleanPhone, timestamp: admin.firestore.FieldValue.serverTimestamp(), chatId
  });

  const msg = `🔑 <b>TASDIQLASH KODI</b>\n\n` +
    `Sizning maxfiy kodingiz:\n\n` +
    `👉 <code>${code}</code>\n\n` +
    `Ushbu kodni saytga kiriting. Hech kimga bermang!`;

  await sendMessage(chatId, msg, {
    inline_keyboard: [[{ text: "🌐 Saytga qaytish", url: "https://ielts-portal-v1.web.app/login" }]]
  });
}

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
