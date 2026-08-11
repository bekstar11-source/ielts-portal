// functions/telegramLogin.js
//
// Telegram orqali kirish sessiyasini XAVFSIZ olib kelish.
//
// ⚠️ NIMA UCHUN BU FAYL BOR:
// Ilgari brauzer `login_sessions/{sessionId}` hujjatini to'g'ridan-to'g'ri
// `onSnapshot` bilan o'qirdi, qoida esa `allow read: if true` edi. Firestore'da
// `read` — bu `get` ham, `list` ham. Ya'ni istalgan odam tizimga kirmasdan
//     getDocs(collection(db, "login_sessions"))
// deb butun kolleksiyani so'rab, o'sha payt Telegram orqali kirayotgan HAR
// QANDAY foydalanuvchining custom token'ini olib, uning hisobiga kirib olardi.
//
// Endi qoidalar klientga `login_sessions` ni umuman ochmaydi, token esa faqat
// shu callable orqali beriladi.
//
// ISHLASH PRINSIPI (device-code oqimiga o'xshash):
//   1. Brauzer maxfiy `pollKey` yaratadi va uni O'ZIDA saqlaydi.
//   2. Deep link'ka esa `sessionId = sha256(pollKey)` ni qo'yadi.
//      Bir tomonlama hash bo'lgani uchun sessionId'ni ko'rgan odam (Telegram
//      serverlari, chatdagi havola, brauzer tarixi) pollKey'ni tiklay olmaydi.
//   3. Bot tokenni avvalgidek `login_sessions/{sessionId}` ga yozadi —
//      telegramBot.js da hech narsa o'zgarmaydi.
//   4. Tokenni olish uchun `pollKey` ni ko'rsatish shart: bu qiymat faqat
//      sessiyani BOSHLAGAN brauzerda bor.
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Custom token 1 soat yashaydi; sessiya undan ancha qisqa bo'lishi kerak.
const SESSION_TTL_MS = 10 * 60 * 1000;

// Telegram deep-link'dagi `start` parametri 64 belgidan oshmasligi kerak
// ("login_" prefiksi bilan birga), shuning uchun hash'ning dastlabki 40 ta
// hex belgisini olamiz — 160 bit taxmin qilib bo'lmaydigan darajada yetarli.
// Bu qiymat src/pages/auth/Login.jsx dagi `deriveSessionId` bilan bir xil.
const SESSION_ID_LENGTH = 40;

function deriveSessionId(pollKey) {
  return crypto.createHash("sha256").update(pollKey, "utf8")
    .digest("hex").slice(0, SESSION_ID_LENGTH);
}

async function claimTelegramLogin(data) {
  const pollKey = data && data.pollKey;

  // pollKey mijozda `crypto.randomUUID()` dan yasaladi (36 belgi). Qisqa
  // qiymatlarni umuman qabul qilmaymiz — brute-force maydonini yopamiz.
  if (typeof pollKey !== "string" || pollKey.length < 32 || pollKey.length > 256) {
    throw new functions.https.HttpsError("invalid-argument", "Sessiya kaliti noto'g'ri.");
  }

  const sessionId = deriveSessionId(pollKey);
  const db = admin.firestore();
  const ref = db.collection("login_sessions").doc(sessionId);
  const snap = await ref.get();

  // Hali bot javob bermagan — bu xato emas, brauzer yana so'raydi.
  if (!snap.exists) {
    return { status: "pending" };
  }

  const session = snap.data() || {};

  // Muddati o'tgan sessiyani darhol yo'q qilamiz.
  const createdMs = session.timestamp ? session.timestamp.toMillis() : 0;
  if (!createdMs || Date.now() - createdMs > SESSION_TTL_MS) {
    await ref.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "Sessiya muddati tugagan. Qaytadan urinib ko'ring.");
  }

  if (session.status !== "authenticated" || !session.token) {
    return { status: "pending" };
  }

  // Token bir martalik: o'qidik — o'chirdik. Shu bilan qayta ishlatish
  // (replay) va hujjatning bazada qolib ketishi ham yopiladi.
  await ref.delete().catch((err) => {
    console.error("login_sessions tozalanmadi:", err);
  });

  return {
    status: "authenticated",
    token: session.token,
    isNewUser: !!session.isNewUser
  };
}

module.exports = { claimTelegramLogin };
