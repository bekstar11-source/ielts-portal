// functions/expireSubscriptions.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Muddati o'tgan obunalarni bepul tarifga tushiradi.
 *
 * Ilgari buni KLIENT qilardi (`AuthContext.processUserData` → `updateDoc`):
 * foydalanuvchi hech qachon saytga kirmasa yoki yozuvni bloklasa, hujjatda
 * `accountType: 'pro'` abadiy qolib ketardi. Endi hujjatni faqat server
 * yangilaydi; kirish huquqi esa har bir so'rovda `getSanitizedTest` ichida
 * muddat bo'yicha alohida tekshiriladi (bu funksiya kechiksa ham xavfsiz).
 */
async function runExpirySweep() {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const snap = await db
    .collection("users")
    .where("subscriptionEnd", "<=", now)
    .get();

  if (snap.empty) {
    console.log("expireSubscriptions: muddati o'tgan obuna topilmadi.");
    return { checked: 0, downgraded: 0 };
  }

  let downgraded = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    // Allaqachon bepul bo'lganlarni qayta yozmaymiz.
    const stillPaid =
      data.accountType === "pro" ||
      data.accountType === "standard" ||
      data.accountType === "premium" ||
      data.isPro === true ||
      data.isPremium === true;
    if (!stillPaid) continue;

    batch.update(doc.ref, {
      accountType: "public",
      tier: "public",
      isPro: false,
      isPremium: admin.firestore.FieldValue.delete(),
      subscriptionExpiredAt: now
    });
    downgraded++;
    opsInBatch++;

    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) await batch.commit();

  console.log(`expireSubscriptions: ${snap.size} ta tekshirildi, ${downgraded} ta tushirildi.`);
  return { checked: snap.size, downgraded };
}

// Har kuni Toshkent vaqti bilan 00:10 da
const expireSubscriptions = functions
  .runWith({ timeoutSeconds: 300, memory: "256MB" })
  .pubsub.schedule("10 0 * * *")
  .timeZone("Asia/Tashkent")
  .onRun(async () => {
    await runExpirySweep();
    return null;
  });

module.exports = { expireSubscriptions, runExpirySweep };
