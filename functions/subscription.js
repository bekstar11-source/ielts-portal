/**
 * Obuna mantiqining SERVER tomondagi nusxasi.
 * ⚠️ `src/utils/subscription.js` bilan bir xil bo'lishi shart.
 * Klientdagi nusxa faqat UI uchun; haqiqiy ruxsat shu yerda hal qilinadi.
 */

/** Firestore Timestamp / ISO string / Date — barchasini Date ga keltiradi. */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function getSubscriptionEnd(userData) {
  return toDate(userData && userData.subscriptionEnd);
}

function isStaff(userData) {
  return !!userData && (userData.role === "admin" || userData.role === "teacher");
}

function isGrouped(userData) {
  return !!(userData && userData.groupId && userData.groupId !== "none");
}

/** Muddatni hisobga olmagan xom tarif. Legacy `premium`/`isPremium` → `standard`. */
function getRawTier(userData) {
  if (!userData) return "free";
  if (userData.accountType === "pro" || userData.isPro === true) return "pro";
  if (
    userData.accountType === "standard" ||
    userData.accountType === "premium" ||
    userData.isPremium === true
  ) {
    return "standard";
  }
  return "free";
}

/** `subscriptionEnd` yo'q bo'lsa (admin qo'lda bergan) — o'tmagan deb qaraladi. */
function isSubscriptionExpired(userData) {
  const end = getSubscriptionEnd(userData);
  if (!end) return false;
  return end.getTime() <= Date.now();
}

/**
 * O'QITUVCHI OBUNASI — `users/{teacherId}.teacherSubscription`.
 * ⚠️ `src/utils/subscription.js` dagi nusxasi bilan bir xil.
 */
function getTeacherSubscriptionEnd(userData) {
  return toDate(userData && userData.teacherSubscription && userData.teacherSubscription.validUntil);
}

function hasActiveTeacherSubscription(userData) {
  const end = getTeacherSubscriptionEnd(userData);
  return !!end && end.getTime() > Date.now();
}

/**
 * GURUH PRO — o'qituvchining faol obunasidan kelib chiqadigan Pro huquqi.
 *
 * `users/{studentId}.groupPro` — DENORMALLASHTIRILGAN nusxa: o'quvchi
 * o'qituvchining hujjatini o'qiy olmaydi (`firestore.rules` ruxsat bermaydi),
 * shuning uchun UI qulfini ochish uchun huquq o'quvchi hujjatiga yoziladi.
 * Maydonni faqat Admin SDK yozadi (`protectedUserFields`), uni yangilab
 * turuvchi joylar: `manageGroupStudent`, Telegram bot tasdiqlashi va kunlik
 * `expireSubscriptions` supurgisi.
 *
 * ⚠️ Bu maydon eskirgan bo'lishi mumkin (o'qituvchi obunasi tugagan, supurgi
 * hali yurmagan), shuning uchun HAQIQIY ruxsatni `checkEntitlement` har doim
 * o'qituvchining hujjatidan qayta tekshiradi. Bu yerdagi qiymat — tezkor yo'l.
 */
function getGroupProEnd(userData) {
  return toDate(userData && userData.groupPro && userData.groupPro.validUntil);
}

function hasActiveGroupPro(userData) {
  const end = getGroupProEnd(userData);
  return !!end && end.getTime() > Date.now();
}

/** Muddatni hisobga olgan haqiqiy tarif. */
function getTier(userData) {
  const raw = getRawTier(userData);
  const own = raw === "free" || isSubscriptionExpired(userData) ? "free" : raw;
  if (own === "pro") return own;
  // Guruh obunasi Pro beradi — o'quvchining o'z tarifi undan past bo'lsa,
  // yuqorisi yutadi (Standard sotib olgan o'quvchi guruhda Pro ishlaydi).
  if (hasActiveGroupPro(userData)) return "pro";
  return own;
}

function hasActiveSubscription(userData) {
  return getTier(userData) !== "free";
}

/**
 * Premium kontent uchun umumiy ruxsat.
 *
 * Guruh a'zoligining O'ZI bu yerga kirmaydi — lekin o'qituvchisining obunasi
 * faol bo'lgan o'quvchida `groupPro` turadi va `getTier` uni Pro deb qaytaradi.
 */
function canAccessPremiumContent(userData) {
  if (!userData) return false;
  if (isStaff(userData)) return true;
  return hasActiveSubscription(userData);
}

function meetsTier(userData, requiredTier) {
  if (!requiredTier || requiredTier === "free") return true;
  if (isStaff(userData)) return true;
  const tier = getTier(userData);
  if (requiredTier === "pro") return tier === "pro";
  if (requiredTier === "standard") return tier === "pro" || tier === "standard";
  return true;
}

/**
 * Testning "ko'lami": bitta passage/section (part) mi, to'liq test mi, to'plam mi.
 *
 * Bazada bu alohida maydon sifatida saqlanmaydi, shuning uchun tuzilmadan
 * aniqlaymiz — Practice sahifalari ham xuddi shu qoidaga tayanadi:
 *   • Reading — bitta passage li hujjat "part", ko'p passage li hujjat "full".
 *   • Listening — bitta hujjatda `parts` (part1..part4) bo'ladi; `partNumber`
 *     ko'rsatilgan bo'lsa "part", ko'rsatilmasa butun test ishlanadi → "full".
 *
 * @param {object} test
 * @param {number|string|null} partNumber  URL dagi `?part=N` (bo'lsa)
 * @returns {'part'|'full'|'set'}
 */
function getTestScope(test, partNumber = null) {
  if (!test) return 'part';
  if (test.isSet) return 'set';

  // Ro'yxatni tuzgan joy ko'lamni aniq bilsa (masalan kolleksiyaning
  // "Full Tests" bo'limi), shu bayroqni qo'yadi. Tuzilmadan taxmin qilishga
  // tayanib qolmaymiz: `tests_metadata` da `passages` bo'lmasa, full test
  // jimgina "part" deb qaralib, Standard'ga ochilib ketardi.
  if (test.isFullTest) return 'full';

  if (partNumber !== null && partNumber !== undefined && String(partNumber).trim() !== '') {
    return 'part';
  }

  const countEntries = (value) => {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return 0;
  };

  const type = String(test.type || '').toLowerCase();
  if (type === 'listening') {
    return countEntries(test.parts) > 1 ? 'full' : 'part';
  }

  return countEntries(test.passages) > 1 ? 'full' : 'part';
}

/**
 * Testni ochish uchun MINIMAL tarif.
 *
 * Qoida ikki qismdan iborat:
 *   1. To'liq test va to'plamlar — HAR DOIM Pro. Admin kolleksiyani "standard"
 *      qilib qo'ygan bo'lsa ham: to'plam ichidagi full testni faqat Pro ishlaydi.
 *   2. PART testlar — darajani ADMIN belgilaydi. Kolleksiyaning `accessTier` i
 *      nima bo'lsa, ichidagi part testlar ham o'sha darajada. Ya'ni "standard"
 *      kolleksiyadagi part testni Standard o'quvchi ham yechadi, "pro"
 *      kolleksiyadagisini esa faqat Pro — lekin ikkalasi ham Parts sahifasida
 *      ko'rinib turadi, ustida tegishli yorliq bilan.
 *
 * ⚠️ Bu funksiya `functions/subscription.js` dagi nusxasi bilan bir xil bo'lishi
 * shart — server (`getSanitizedTest`) aynan shu qoidaga tayanadi.
 *
 * @returns {'free'|'standard'|'pro'}
 */
function getRequiredTier(test, partNumber = null) {
  if (!test) return 'free';

  const scope = getTestScope(test, partNumber);
  if (scope === 'full' || scope === 'set') return 'pro';

  const colTier = test.collectionAccessTier;
  if (colTier === 'free' || colTier === 'standard' || colTier === 'pro') return colTier;

  if (test.isFree) return 'free';

  const type = String(test.type || '').toLowerCase();
  if (type === 'reading' || type === 'listening') return 'standard';

  // Writing/Speaking hozircha obuna bilan cheklanmagan.
  return 'free';
}

/**
 * Tarif bo'yicha testni ochish mumkinmi.
 *
 * DIQQAT: bu faqat TARIF bo'yicha qaror. O'qituvchi biriktirgan yoki mock
 * tarkibidagi testlar alohida yo'l bilan ochiladi — shuning uchun `false`
 * "ruxsat yo'q" degani emas, "tarif yetarli emas" degani.
 */
function tierAllowsTest(userData, test, partNumber = null) {
  if (isStaff(userData)) return true;
  return meetsTier(userData, getRequiredTier(test, partNumber));
}

/**
 * Foydalanuvchi berilgan testning KONTENTI/JAVOBLARIGA kira oladimi — yagona
 * tekshiruv, `getSanitizedTest` (kontent o'qish) va `submitTestAnswers`
 * (javob topshirish) callable'lari ikkalasi ham shu funksiyadan foydalanadi,
 * toki ikkisi orasida tekshiruv chetlab o'tilmasin.
 *
 * Avval tarif (`tierAllowsTest`) tekshiriladi; yetmasa — to'g'ridan-to'g'ri
 * biriktirilgan, guruh orqali biriktirilgan yoki mock tarkibida ochilgan
 * testlarga alohida ruxsat beriladi.
 */
async function checkEntitlement(db, uid, userData, testData, testId, partNumber = null) {
  if (isStaff(userData)) return true;

  if (tierAllowsTest(userData, testData, partNumber)) return true;

  const userAssigns = (userData && userData.assignedTests) || [];
  if (userAssigns.some((a) => String(a.id).trim() === testId)) return true;

  const mockTests = (userData && userData.mockTests) || [];
  const inUnlockedMock = mockTests.some((m) => {
    const sub = m.subTests || {};
    return sub.reading === testId || sub.listening === testId || sub.writing === testId;
  });
  if (inUnlockedMock) return true;

  const groupsSnap = await db.collection('groups').where('studentIds', 'array-contains', uid).get();
  const teacherIds = new Set();
  for (const groupDoc of groupsSnap.docs) {
    const groupData = groupDoc.data();
    const groupAssigns = groupData.assignedTests || [];
    if (groupAssigns.some((a) => String(a.id).trim() === testId)) return true;
    if (groupData.teacherId) teacherIds.add(groupData.teacherId);
  }

  // Guruh Pro: o'qituvchining obunasi FAOL bo'lsa, a'zosi Pro kontentni to'liq
  // ochadi. Bu tekshiruv `groupPro` maydoniga tayanmaydi — u denormallashgan
  // nusxa va eskirishi mumkin; yagona haqiqat manbasi o'qituvchining hujjati.
  // Aks holda obuna tugagach ham o'quvchilar Pro'da qolib ketardi.
  for (const teacherId of teacherIds) {
    const teacherSnap = await db.collection('users').doc(teacherId).get();
    if (teacherSnap.exists && hasActiveTeacherSubscription(teacherSnap.data())) return true;
  }

  return false;
}

module.exports = {
  toDate,
  getSubscriptionEnd,
  isStaff,
  isGrouped,
  getRawTier,
  isSubscriptionExpired,
  getTier,
  hasActiveSubscription,
  canAccessPremiumContent,
  meetsTier,
  getTestScope,
  getRequiredTier,
  tierAllowsTest,
  getTeacherSubscriptionEnd,
  hasActiveTeacherSubscription,
  getGroupProEnd,
  hasActiveGroupPro,
  checkEntitlement,
};
