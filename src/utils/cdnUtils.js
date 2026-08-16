// Firebase Storage fayllarini Cloudflare Worker orqali uzatadi.
// Worker javoblarni edge'da 30 kun keshlaydi, shuning uchun bitta fayl
// Firebase'dan faqat bir marta yuklanadi — qolgani CDN'dan (bandwidth tejash).
const CDN_DOMAIN = "https://firebase-cdn.bekstar11.workers.dev";
const FIREBASE_STORAGE_ORIGIN = "https://firebasestorage.googleapis.com";

export const getCdnUrl = (originalUrl) => {
  if (!originalUrl || typeof originalUrl !== "string") return originalUrl;

  // Faqat Firebase Storage manzillari qayta yo'naltiriladi. blob:, data:,
  // YouTube havolalari va allaqachon CDN'ga ishora qilayotganlari tegilmaydi.
  if (!originalUrl.startsWith(FIREBASE_STORAGE_ORIGIN)) return originalUrl;

  // Speaking yozuvlari — shaxsiy ma'lumot (storage.rules'da faqat egasi va
  // staff o'qiy oladi). Worker javoblarni ochiq edge keshiga qo'yadi va kesh
  // kaliti Authorization header'ni hisobga olmaydi, shuning uchun bu fayllar
  // ATAYLAB CDN'dan chetlab o'tkaziladi.
  if (originalUrl.includes("/o/speaking%2F") || originalUrl.includes("/o/speaking/")) {
    return originalUrl;
  }

  return originalUrl.replace(FIREBASE_STORAGE_ORIGIN, CDN_DOMAIN);
};

/**
 * getCdnUrl'ning teskarisi: CDN manzilini xom Firebase Storage manziliga qaytaradi.
 *
 * Worker yagona nuqta — u yiqilsa butun imtihon guruhi audiosiz qoladi. Shu sababli
 * har bir yuklovchi CDN muvaffaqiyatsiz bo'lganda ORIGINAL manzil bilan qayta
 * urinishi kerak (qimmatroq, lekin imtihon davom etadi).
 */
export const getOriginUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  if (!url.startsWith(CDN_DOMAIN)) return url;
  return url.replace(CDN_DOMAIN, FIREBASE_STORAGE_ORIGIN);
};

/** Manzil CDN orqali ketayotganini bildiradi (fallback kerakligini aniqlash uchun). */
export const isCdnUrl = (url) => typeof url === "string" && url.startsWith(CDN_DOMAIN);
