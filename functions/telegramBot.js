const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

const TELEGRAM_TOKEN = "8622410650:AAE1qXWWncsD9aOrOXzeE4aA37hhIOwkU0s";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body;
  if (!update || !update.message) {
    return res.status(200).send("OK");
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;
  const contact = update.message.contact;

  try {
    // 1. Handle /start or any text
    if (text && text.startsWith("/start")) {
      await sendRequestContact(chatId);
    } 
    // 2. Handle Contact sharing
    else if (contact) {
      let phoneNumber = contact.phone_number;
      // Normalize: ensure it starts with + for consistency if needed, 
      // but Telegram often provides it without + or with it.
      // We will store it without + for easier matching.
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      
      const telegramId = contact.user_id.toString();
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`Generating code ${code} for phone ${cleanPhone}`);

      // Save to Firestore
      await admin.firestore().collection("telegram_codes").doc(telegramId).set({
        code: code,
        phoneNumber: cleanPhone,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        chatId: chatId
      });

      await sendMessageWithLink(chatId, 
        `✅ Sizning tasdiqlash kodingiz:\n\n🔑 <b>${code}</b>\n\nQuyidagi tugmani bosib, saytga qaytib kodni kiriting.`,
        "🌐 Saytga o'tish",
        "https://ielts-portal-v1.web.app/login"
      );
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return res.status(200).send("OK"); // Always return 200 to Telegram
  }
});

async function sendMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
      })
    });
  } catch (e) {
    console.error("Error sending message:", e);
  }
}

async function sendMessageWithLink(chatId, text, buttonText, url) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: buttonText, url: url }]
          ]
        }
      })
    });
  } catch (e) {
    console.error("Error sending message with link:", e);
  }
}

async function sendRequestContact(chatId) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "IELT-PORTAL tizimiga kirish uchun telefon raqamingizni yuboring:",
        reply_markup: {
          keyboard: [
            [{ text: "📞 Raqamni yuborish", request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      })
    });
  } catch (e) {
    console.error("Error sending contact request:", e);
  }
}

exports.verifyTelegramOTP = functions.https.onCall(async (data, context) => {
  const { code } = data;

  console.log(`Verifying OTP: ${code}`);

  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Kodni kiriting.");
  }

  // Find the code in Firestore (searching by code only)
  const codesSnapshot = await admin.firestore().collection("telegram_codes")
    .where("code", "==", code)
    .get();

  if (codesSnapshot.empty) {
    console.log(`No matching code found for ${code}`);
    throw new functions.https.HttpsError("not-found", "Kod noto'g'ri yoki muddati o'tgan.");
  }

  // Sort by timestamp in memory to get the most recent one
  const docs = codesSnapshot.docs.sort((a, b) => b.data().timestamp - a.data().timestamp);
  const codeDoc = docs[0];
  const userData = codeDoc.data();
  const cleanPhone = userData.phoneNumber;

  // Check expiration (5 minutes)
  const timestamp = userData.timestamp.toDate();
  const now = new Date();
  if ((now - timestamp) > 5 * 60 * 1000) {
    console.log(`Code expired for ${cleanPhone}`);
    await codeDoc.ref.delete();
    throw new functions.https.HttpsError("deadline-exceeded", "Kod muddati o'tgan.");
  }

  // Delete the code after use
  await codeDoc.ref.delete();

  // Find or create user in Firebase Auth
  const authPhone = `+${cleanPhone}`;
  let userRecord;
  let isNewUser = false;
  try {
    userRecord = await admin.auth().getUserByPhoneNumber(authPhone);
    console.log(`User found: ${userRecord.uid}`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log(`Creating new user for ${authPhone}`);
      isNewUser = true;
      userRecord = await admin.auth().createUser({
        phoneNumber: authPhone,
        displayName: `User ${cleanPhone.slice(-4)}`
      });
      
      await admin.firestore().collection("users").doc(userRecord.uid).set({
        phoneNumber: authPhone,
        role: "student",
        accountType: "public", // Telegram orqali kirganlar 'public' hisoblanadi
        onboardingCompleted: false, // Onboardingdan o'tishi shart
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      console.error("Auth Error:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }

  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  return { token: customToken, isNewUser };
});
