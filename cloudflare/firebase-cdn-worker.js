/**
 * Cloudflare Worker — Firebase Storage oldidagi kesh proksisi.
 * Deploy: dash.cloudflare.com → Workers → firebase-cdn → Edit code → Deploy.
 * (Bu fayl worker'ning manba nusxasi — dashboard'dagi kod shu bilan bir xil turishi kerak.)
 *
 * Maqsad: bitta fayl Firebase'dan faqat bir marta yuklanadi, qolgan barcha
 * so'rovlar Cloudflare edge keshidan beriladi → Firebase bandwidth tejaladi.
 */

const ORIGIN = "https://firebasestorage.googleapis.com";

// Muvaffaqiyatli fayl javoblari uchun. Firebase yuklab olish manzillari
// `?token=` bilan keladi va fayl o'zgarganda token ham yangilanadi, shuning
// uchun `immutable` xavfsiz.
const SUCCESS_CACHE_CONTROL = "public, max-age=2592000, immutable";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, ETag",
  "Access-Control-Max-Age": "3600",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Faqat o'qish. Yuklash/o'chirish Firebase SDK orqali to'g'ridan-to'g'ri
    // ketadi — yozuv so'rovlarini keshlovchi proksi orqali o'tkazishning ma'nosi yo'q.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
      });
    }

    const url = new URL(request.url);
    const originUrl = ORIGIN + url.pathname + url.search;

    // MUHIM: Authorization header ATAYLAB uzatilmaydi. Kesh kaliti header'larni
    // hisobga olmaydi, shuning uchun autentifikatsiyalangan javob keshga tushsa,
    // u shu manzilni bilgan HAR KIMGA berilardi. Bu yerda faqat ochiq
    // `?token=...` manzillari qo'llab-quvvatlanadi.
    const originRequest = new Request(originUrl, {
      method: request.method,
      headers: pickHeaders(request.headers, ["range", "if-none-match", "if-range", "accept"]),
      redirect: "follow",
    });

    let response = await fetch(originRequest, {
      cf: {
        // Xato javoblarni Cloudflare o'z-o'zidan keshlab qo'ymasin.
        cacheTtlByStatus: { "200-299": 2592000, "300-399": 0, "400-599": 0 },
        cacheEverything: true,
      },
    });

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);

    if (response.ok || response.status === 206 || response.status === 304) {
      headers.set("Cache-Control", SUCCESS_CACHE_CONTROL);
    } else {
      // BUG TUZATILDI: ilgari 403/404 javoblari ham 30 kunlik `immutable` bilan
      // keshlanardi — fayl keyinchalik to'g'ri yuklansa ham, o'sha manzil bir oy
      // davomida xato qaytaraverardi.
      headers.set("Cache-Control", "no-store");
      headers.delete("Expires");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

function pickHeaders(source, allowList) {
  const result = new Headers();
  for (const name of allowList) {
    const value = source.get(name);
    if (value) result.set(name, value);
  }
  return result;
}
