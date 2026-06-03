const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Yangi API Token
const TELEGRAM_TOKEN = "8622410650:AAE1qXWWncsD9aOrOXzeE4aA37hhIOwkU0s";
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
  const document = message ? message.document : null;

  try {
    // Load dynamic admin chat ID from Firestore
    try {
      const configSnap = await admin.firestore().collection("config").doc("telegram").get();
      if (configSnap.exists && configSnap.data().adminChatId) {
        ADMIN_CHAT_ID = configSnap.data().adminChatId.toString();
      }
    } catch (err) {
      console.error("Error loading ADMIN_CHAT_ID config:", err);
    }
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
          await admin.firestore().collection("bot_states").doc(chatId.toString()).set({
            action: "login_auth",
            sessionId: sessionId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        await sendAuthCodePrompt(chatId);
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
    // 5. Admin uchun ID sini bilish
    else if (text === "/admin_info") {
      try {
        await admin.firestore().collection("config").doc("telegram").set({
          adminChatId: chatId.toString()
        }, { merge: true });
        await sendMessage(chatId, `Sizning Chat ID: <code>${chatId}</code>\nTizimda muvaffaqiyatli saqlandi! Endi barcha to'lov bildirishnomalari sizga keladi.`);
      } catch (err) {
        await sendMessage(chatId, `Sizning Chat ID: <code>${chatId}</code>\nUni functions/telegramBot.js dagi ADMIN_CHAT_ID ga yozib qo'ying.`);
      }
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
      "  - 1 oy: 35 000 so'm\n" +
      "  - 3 oy: 89 000 so'm (Tejamkor!)\n\n" +
      "🔸 <b>Pro (AI bilan):</b>\n" +
      "  - 1 oy: 49 000 so'm\n" +
      "  - 3 oy: 129 000 so'm (Eng mashhur!)";
    
    await sendMessage(chatId, msg, {
      inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: "https://ielts-portal-v1.web.app/pricing" }]]
    });
  } 
  else if (data === "check_status") {
    // Foydalanuvchi statusini bazadan tekshirish logikasi (agar userId saqlangan bo'lsa)
    await sendMessage(chatId, "⏳ Sizning to'lovingiz tekshirilmoqda. Agar to'lov qilgan bo'lsangiz, tez orada Pro ruxsat beriladi.");
  }
  else if (data.startsWith("ap_mock_")) {
    const mockId = data.slice(8); // Extract mock ID directly
    
    // Parse student details from caption
    const caption = query.message.caption || "";
    const userMatch = caption.match(/User ID:<\/b> <code>([^<]+)<\/code>/);
    const chatMatch = caption.match(/Student Chat ID:<\/b> <code>([^<]+)<\/code>/);
    
    const studentUserId = userMatch ? userMatch[1] : null;
    const studentChatId = chatMatch ? chatMatch[1] : null;

    if (!studentUserId || !studentChatId) {
      await sendMessage(chatId, "❌ Xatolik: O'quvchi ma'lumotlarini caption'dan o'qib bo'lmadi.");
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
      await userRef.update({
        mockTests: admin.firestore.FieldValue.arrayUnion(mockAssignment)
      });

      // 4. Notify Student
      await sendMessage(studentChatId, `🎉 <b>Mock to'lovingiz tasdiqlandi!</b>\n\nSizga <b>${mockData.title}</b> mock imtihoni ochildi. Saytga kirib "Mock Exams" bo'limida uni topshirishingiz mumkin.`);
      
      // 5. Update Admin Message
      await editMessageText(chatId, query.message.message_id, `✅ <b>MOCK TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId}</code>\nMock: <b>${mockData.title}</b>\nStatus: Yakunlandi.`);
    } catch (err) {
      console.error("Mock Promotion Error:", err);
      await sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
    }
  }
  else if (data.startsWith("approve_")) {
    // approve_tier_studentChatId_studentUserId
    const parts = data.split("_");
    const tier = parts[1];
    const studentChatId = parts[2];
    const studentUserId = parts.slice(3).join("_");
    
    try {
      // Get billing info from payment_sessions to determine duration
      const sessionDoc = await admin.firestore().collection("payment_sessions").doc(studentChatId).get();
      let billingDays = 30; // default 30 days (1 month)
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        if (sessionData && sessionData.billing === "tri") {
          billingDays = 90; // 90 days (3 months)
        }
      }

      const subscriptionStart = admin.firestore.FieldValue.serverTimestamp();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + billingDays);
      const subscriptionEnd = admin.firestore.Timestamp.fromDate(endDate);

      // Update User in Firestore
      await admin.firestore().collection("users").doc(studentUserId).update({
        tier: tier, // pro or standard
        accountType: tier, // for backward compatibility and header checks
        isPro: tier === "pro",
        subscriptionStart: subscriptionStart,
        subscriptionEnd: subscriptionEnd
      });

      // Notify Student
      const tierName = tier === "pro" ? "Pro 🔥" : "Standard ✅";
      const periodName = billingDays === 90 ? "3 oylik" : "1 oylik";
      await sendMessage(studentChatId, `🎉 <b>To'lovingiz tasdiqlandi!</b>\n\nSizda <b>${periodName} ${tierName}</b> tarifi faollashtirildi. Endi platformaning barcha imkoniyatlaridan foydalanishingiz mumkin.`);
      
      // Update Admin Message
      await editMessageText(chatId, query.message.message_id, `✅ <b>TASDIQLANDI!</b>\n\nFoydalanuvchi: <code>${studentUserId}</code>\nTarif: <b>${tierName} (${periodName})</b>\nStatus: Yakunlandi.`);
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
  if (planId === "mock") {
    const mockId = billing;
    const mockDoc = await admin.firestore().collection("tests_metadata").doc(mockId).get();
    if (!mockDoc.exists) {
      await sendMessage(chatId, "❌ <b>Mock imtihon topilmadi.</b>");
      return;
    }
    const mockData = mockDoc.data();
    const price = mockData.price !== undefined ? mockData.price : 20000;
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

  const prices = {
    standard_monthly: "35 000", standard_tri: "89 000",
    pro_monthly: "49 000", pro_tri: "129 000"
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

  if (sessionDoc.exists) {
    session = sessionDoc.data();
    userId = session.userId;
  } else {
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
    } else {
      adminMsg += `📦 <b>Tanlangan:</b> ${session.planId} (${session.billing})\n` +
        `💰 <b>Summa:</b> ${session.price} so'm\n`;
    }
  } else {
    adminMsg += `⚠️ <i>Tanlangan tarif/mock aniqlanmadi (chek to'g'ridan-to'g'ri yuborildi).</i>\n`;
  }
  adminMsg += `⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}\n\n` +
    `Tasdiqlash uchun tugmalardan foydalaning:`;

  const inlineKeyboard = [
    [
      { text: "✅ Standard", callback_data: `approve_standard_${chatId}_${userId}` },
      { text: "🔥 Pro", callback_data: `approve_pro_${chatId}_${userId}` }
    ]
  ];

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
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 1. Fetch any pending login session for this bot user
  let sessionId = null;
  try {
    const botStateDoc = await admin.firestore().collection("bot_states").doc(chatId.toString()).get();
    if (botStateDoc.exists) {
      const stateData = botStateDoc.data();
      if (stateData.action === "login_auth" && stateData.sessionId) {
        sessionId = stateData.sessionId;
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
    chatId: chatId.toString()
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

exports.verifyTelegramOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber, code } = data;
  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Kod kiritilishi shart.");
  }

  let doc;
  
  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const snapshot = await admin.firestore().collection("telegram_codes")
      .where("phoneNumber", "==", cleanPhone)
      .get();
      
    if (snapshot.empty) {
      throw new functions.https.HttpsError("not-found", "Ushbu raqam uchun kod topilmadi.");
    }
    
    // Sort by timestamp and get latest
    const docs = snapshot.docs.sort((a, b) => {
      const tA = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
      const tB = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
      return tB - tA;
    });
    
    doc = docs[0];
  } else {
    // Search by code only (if phone not provided by client)
    const snapshot = await admin.firestore().collection("telegram_codes")
      .where("code", "==", code.toString())
      .get();
      
    if (snapshot.empty) {
      throw new functions.https.HttpsError("not-found", "Kod noto'g'ri yoki muddati o'tgan.");
    }
    
    // Get the most recent one with this code
    const docs = snapshot.docs.sort((a, b) => {
      const tA = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
      const tB = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
      return tB - tA;
    });
    
    doc = docs[0];
  }

  const storedData = doc.data();
  if (storedData.code !== code.toString()) {
    throw new functions.https.HttpsError("permission-denied", "Kod noto'g'ri.");
  }

  const now = Date.now();
  const timestamp = storedData.timestamp ? storedData.timestamp.toMillis() : 0;
  if (now - timestamp > 10 * 60 * 1000) {
    throw new functions.https.HttpsError("deadline-exceeded", "Kod muddati tugagan.");
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
