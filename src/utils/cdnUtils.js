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
