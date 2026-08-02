/**
 * Obuna (subscription) bo'yicha YAGONA manba.
 *
 * Ilgari tarif tekshiruvi 4 xil joyda 4 xil yozilgan edi (AuthContext,
 * useDailyLimit.checkLimit, useDailyLimit.incrementUsage, getSanitizedTest) va
 * ular bir-biriga mos kelmasdi — masalan `isPremium: true` bo'lgan foydalanuvchi
 * hech qachon muddati tugamasdi, lekin kontentga kira olardi.
 *
 * ⚠️ Bu fayldagi mantiq `functions/subscription.js` bilan bir xil bo'lishi shart.
 * Klientdagi tekshiruv faqat UI uchun — haqiqiy himoya serverda.
 */

/** Firestore Timestamp / ISO string / Date — barchasini Date ga keltiradi. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function getSubscriptionEnd(userData) {
  return toDate(userData?.subscriptionEnd);
}

export function isStaff(userData) {
  return userData?.role === 'admin' || userData?.role === 'teacher';
}

/** Foydalanuvchi o'qituvchi guruhiga biriktirilganmi. */
export function isGrouped(userData) {
  return Boolean(userData?.groupId && userData.groupId !== 'none');
}

/**
 * Hujjatdagi maydonlardan xom tarifni o'qiydi (muddatni hisobga olmaydi).
 * Legacy `premium` / `isPremium` — `standard` deb qaraladi.
 * @returns {'pro'|'standard'|'free'}
 */
export function getRawTier(userData) {
  if (!userData) return 'free';
  if (userData.accountType === 'pro' || userData.isPro === true) return 'pro';
  if (
    userData.accountType === 'standard' ||
    userData.accountType === 'premium' ||
    userData.isPremium === true
  ) {
    return 'standard';
  }
  return 'free';
}

/**
 * Obuna muddati o'tganmi.
 * `subscriptionEnd` umuman yo'q bo'lsa (admin qo'lda bergan tariflar) — o'tmagan
 * deb qaraladi, aks holda mavjud foydalanuvchilar birdaniga bloklanib qolardi.
 */
export function isSubscriptionExpired(userData) {
  const end = getSubscriptionEnd(userData);
  if (!end) return false;
  return end.getTime() <= Date.now();
}

/**
 * Muddatni hisobga olgan holdagi haqiqiy tarif.
 * @returns {'pro'|'standard'|'free'}
 */
export function getTier(userData) {
  const raw = getRawTier(userData);
  if (raw === 'free') return 'free';
  if (isSubscriptionExpired(userData)) return 'free';
  return raw;
}

/** Pullik va hozir amal qilayotgan obunasi bormi (xodimlar bu yerga kirmaydi). */
export function hasActiveSubscription(userData) {
  return getTier(userData) !== 'free';
}

/**
 * Premium kontent (Reading / Listening) uchun umumiy ruxsat.
 *
 * ⚠️ Guruhga a'zolikning O'ZI bu yerda ruxsat bermaydi — server
 * (`getSanitizedTest`) ham shunday ishlaydi: guruh o'quvchisiga faqat
 * BIRIKTIRILGAN testlar ochiladi. Aks holda UI qulfni ochib, test ochilganda
 * server "permission-denied" qaytarardi.
 * Biriktirilgan testlar uchun `hasDirectAssignment` / `isAssignedItem` ishlating.
 */
export function canAccessPremiumContent(userData) {
  if (!userData) return false;
  if (isStaff(userData)) return true;
  return hasActiveSubscription(userData);
}

/**
 * Ro'yxatdagi element o'qituvchi/guruh tomonidan biriktirilganmi.
 * `useStudentData` biriktirilgan testlarga `isAssignment: true` qo'yadi.
 */
export function isAssignedItem(item) {
  if (!item) return false;
  return Boolean(item.isAssignment || item.groupId || item.isMock || item.mockKey);
}

/**
 * Testning `collectionAccessTier` darajasiga yetadimi.
 * @param {object} userData
 * @param {'free'|'standard'|'pro'|undefined} requiredTier
 */
export function meetsTier(userData, requiredTier) {
  if (!requiredTier || requiredTier === 'free') return true;
  if (isStaff(userData)) return true;
  const tier = getTier(userData);
  if (requiredTier === 'pro') return tier === 'pro';
  if (requiredTier === 'standard') return tier === 'pro' || tier === 'standard';
  return true;
}

/** Ushbu test aynan shu foydalanuvchiga biriktirilganmi (guruhsiz, lokal tekshiruv). */
export function hasDirectAssignment(userData, testId) {
  if (!userData || !testId) return false;
  const id = String(testId).trim();
  const assigned = userData.assignedTests || [];
  if (assigned.some((a) => String(a?.id ?? a).trim() === id)) return true;

  const mocks = userData.mockTests || [];
  return mocks.some((m) => {
    const sub = m?.subTests || {};
    return sub.reading === id || sub.listening === id || sub.writing === id;
  });
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
export function getTestScope(test, partNumber = null) {
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
export function getRequiredTier(test, partNumber = null) {
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
export function tierAllowsTest(userData, test, partNumber = null) {
  if (isStaff(userData)) return true;
  return meetsTier(userData, getRequiredTier(test, partNumber));
}

/** ProfileSidebar kabi UI joylari uchun ko'rsatiladigan yorliq. */
export function getTierLabel(userData) {
  const tier = getTier(userData);
  if (tier === 'pro') return 'PRO obuna';
  if (tier === 'standard') return 'Standard obuna';
  return 'Bepul tarif';
}

/* ─────────────────────────────────────────────────────────────
 * O'QITUVCHI OBUNASI (`teacherSubscription`)
 *
 * Ilgari bu tekshiruv 3 xil sahifada 3 marta qo'lda yozilgan edi
 * (TeacherDashboard, TeacherSubscription, TeacherGroupStats) va hammasi
 * `new Date(sub.validUntil)` deb yozardi — Firestore Timestamp kelib
 * qolsa "Invalid Date" chiqib, taqqoslash jimgina `false` bo'lardi.
 * ───────────────────────────────────────────────────────────── */

/** O'qituvchi obunasining tugash sanasi (yo'q bo'lsa `null`). */
export function getTeacherSubscriptionEnd(userData) {
  return toDate(userData?.teacherSubscription?.validUntil);
}

/** O'qituvchining guruh obunasi hozir amal qiladimi. */
export function hasActiveTeacherSubscription(userData) {
  const end = getTeacherSubscriptionEnd(userData);
  return Boolean(end) && end.getTime() > Date.now();
}

/** Obuna tugashiga necha kun qolgani (tugagan/yo'q bo'lsa 0). */
export function getTeacherSubscriptionDaysLeft(userData) {
  const end = getTeacherSubscriptionEnd(userData);
  if (!end) return 0;
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return days > 0 ? days : 0;
}
