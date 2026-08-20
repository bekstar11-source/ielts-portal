// functions/expireSubscriptions.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { syncAllGroupPro } = require("./groupMembership");

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

/**
 * Muddati o'tgan GURUH PRO huquqlarini o'chiradi.
 *
 * `users/{studentId}.groupPro` — o'qituvchi obunasidan kelib chiqadigan Pro
 * huquqining o'quvchi hujjatidagi nusxasi (UI qulfini ochish uchun; batafsil
 * `functions/subscription.js` da). O'qituvchining obunasi tugaganda hech kim
 * o'quvchilarni aylanib chiqmaydi — shu supurgi shuning uchun bor.
 *
 * ⚠️ So'rov `groupPro.validUntil` bo'yicha ketadi va u har doim Timestamp
 * sifatida yoziladi (`syncStudentGroupPro`), shuning uchun taqqoslash ishlaydi.
 * Haqiqiy kirish huquqi baribir har so'rovda `checkEntitlement` ichida
 * o'qituvchining hujjatidan tekshiriladi — bu supurgi kechiksa ham xavfsiz.
 */
async function runGroupProSweep() {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const snap = await db
    .collection("users")
    .where("groupPro.validUntil", "<=", now)
    .get();

  if (snap.empty) {
    console.log("expireSubscriptions: muddati o'tgan guruh Pro topilmadi.");
    return { checked: 0, cleared: 0 };
  }

  let cleared = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snap.docs) {
    batch.update(doc.ref, { groupPro: admin.firestore.FieldValue.delete() });
    cleared++;
    opsInBatch++;

    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) await batch.commit();

  console.log(`expireSubscriptions: ${cleared} ta guruh Pro huquqi o'chirildi.`);
  return { checked: snap.size, cleared };
}

// Har kuni Toshkent vaqti bilan 00:10 da
const expireSubscriptions = functions
  .runWith({ timeoutSeconds: 300, memory: "256MB" })
  .pubsub.schedule("10 0 * * *")
  .timeZone("Asia/Tashkent")
  .onRun(async () => {
    await runExpirySweep();
    // Avval to'liq qayta hisob (huquq BERADI ham, oladi ham), keyin
    // guruhi o'chirilgan/parchalangan o'quvchilar uchun yakuniy tozalash.
    await syncAllGroupPro(admin.firestore());
    await runGroupProSweep();
    return null;
  });

module.exports = { expireSubscriptions, runExpirySweep, runGroupProSweep };
