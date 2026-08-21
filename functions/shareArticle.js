// functions/shareArticle.js
//
// `/article/:id` uchun server tomonda tayyorlangan HTML.
//
// ─── MUAMMO ────────────────────────────────────────────────────────────────
//
// Sayt — SPA: `index.html` bitta va u barcha marshrutlar uchun bir xil
// sarlavha, tavsif va rasmni beradi. Natijada:
//
//   • Telegram'da ulashilgan har qanday maqola havolasi bir xil ko'rinardi
//     ("ENGLEV | Ingliz tili portali" + logotip). O'zbekistonda ulashishning
//     asosiy kanali Telegram bo'lgani uchun bu to'g'ridan-to'g'ri yo'qotilgan
//     trafik.
//   • Yandex (bu bozorda jiddiy ulush) JS render qilishda ishonchsiz — u
//     maqola matnini umuman ko'rmasligi mumkin edi.
//
// Klientdagi `src/hooks/useSeo.js` bu teglarni JS orqali yozadi, lekin
// ijtimoiy tarmoq skraperlari JS'ni UMUMAN ishga tushirmaydi. Shuning uchun
// server tomonda ham xuddi shu qiymatlar kerak — ikkalasi mos bo'lishi shart.
//
// ─── NEGA MAQOLA MATNI HTML GA QO'SHILMAYDI ────────────────────────────────
//
// Vasvasa bor: robotga (User-Agent bo'yicha) maqola matnini xom HTML ichida
// berish — shunda Yandex uni JS'siz ham o'qirdi. LEKIN Firebase Hosting CDN'i
// `Vary: User-Agent` ni HISOBGA OLMAYDI: kesh kaliti faqat URL. Ya'ni robot
// uchun tayyorlangan javob keshga tushib, keyin oddiy foydalanuvchiga
// berilardi (va aksincha) — natijada odam React yuklanguncha bezaksiz matnni
// ko'rardi, robot esa matnsiz nusxani olardi.
//
// Shuning uchun bu yerda faqat meta teglar, canonical va JSON-LD bor — ular
// ko'rinishga ta'sir qilmaydi va keshlanishi butunlay xavfsiz. Googlebot JS'ni
// render qilgani uchun matnni baribir ko'radi.
//
// Yandex uchun to'liq yechim — chekkada (edge) haqiqiy prerender. Loyihada
// allaqachon Cloudflare worker bor (`cloudflare/firebase-cdn-worker.js`),
// mantiqiy keyingi qadam o'sha yerda.

const admin = require("firebase-admin");
const fetch = require("node-fetch");
const {
  setMetaTag,
  setCanonical,
  setTitle,
  appendJsonLd,
  fetchIndexHtml,
} = require("./htmlMeta");

const SITE = "https://englev.uz";
const DEFAULT_IMAGE = `${SITE}/englev-logo.png`;

/** Maqolalar `articleLevels.js` dagi tartibda saqlanadi. */
const LEVEL_ORDER = ["B1", "B2", "C1"];

/** HTML teglarini olib tashlab, toza matn qaytaradi. */
function toPlainText(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Maqolaning ko'rsatiladigan matn bloklarini oladi.
 *
 * Hujjat ikki formatda bo'lishi mumkin: eski maqolalarda `content` to'g'ridan-
 * to'g'ri massiv, yangilarida esa `levels: { B1: {content}, B2: {...} }`.
 * (`src/utils/articleLevels.js` bilan bir xil mantiq.)
 */
function getContentBlocks(data) {
  if (Array.isArray(data.content) && data.content.length) return data.content;
  const levels = data.levels || {};
  for (const lv of LEVEL_ORDER) {
    if (Array.isArray(levels[lv]?.content) && levels[lv].content.length) {
      return levels[lv].content;
    }
  }
  return [];
}

/** Qidiruv natijasi uchun ~155 belgilik tavsif — jumla o'rtasida uzilmaydi. */
function buildDescription(data, blocks) {
  const raw = data.subtitle
    ? toPlainText(data.subtitle)
    : blocks.map((b) => toPlainText(b && b.text)).join(" ");
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "ENGLEV — daraja bo'yicha moslashtirilgan ingliz tili maqolalari: B1, B2 va C1.";
  }
  if (clean.length <= 155) return clean;
  const cut = clean.slice(0, 155);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + "…";
}

/** Firestore Timestamp / Date / satrni ISO ko'rinishga keltiradi. */
function toIso(value) {
  try {
    if (!value) return undefined;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

async function shareArticle(req, res) {
  const urlPath = (req.originalUrl || req.url || "").split("?")[0];
  const parts = urlPath.split("/").filter(Boolean); // ["article", "<id>"]
  const articleId = parts[1];

  // Manzilda id bo'lmasa — ro'yxatga. 301 EMAS: `/article` alohida sahifa
  // sifatida indekslanib qolmasligi uchun vaqtinchalik yo'naltirish yetarli.
  if (parts[0] !== "article" || !articleId) {
    return res.redirect(302, "/articles");
  }

  let html;
  try {
    html = await fetchIndexHtml(req, fetch);
  } catch (err) {
    // index.html olinmasa hech narsa qila olmaymiz — SPA'ga qaytaramiz.
    console.error("shareArticle: index.html olinmadi", err);
    return res.redirect(302, "/articles");
  }

  try {
    const snap = await admin.firestore().collection("articles").doc(articleId).get();

    if (!snap.exists) {
      // ⚠️ 404 statusi MUHIM. 200 qaytarsak bu "yumshoq 404" bo'lardi va
      // qidiruv tizimi mavjud bo'lmagan maqolani indeksda saqlab qolardi.
      html = setTitle(html, "Maqola topilmadi | ENGLEV");
      html = setMetaTag(html, "robots", "noindex, follow", false);
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      return res.status(404).send(html);
    }

    const data = snap.data() || {};
    const url = `${SITE}/article/${articleId}`;
    const title = data.title ? `${data.title} | ENGLEV` : "ENGLEV";
    const image = data.coverImage || data.image || data.thumbnail || DEFAULT_IMAGE;

    // Premium maqola mehmonga ochilmaydi (`firestore.rules`), shuning uchun
    // uni indeksga bermaymiz: qidiruvdan kelgan odam faqat paywall ko'rardi,
    // bu esa sahifa sifatini pasaytiradi.
    const isMemberOnly = data.isMemberOnly === true;

    const blocks = isMemberOnly ? [] : getContentBlocks(data);
    const description = buildDescription(data, blocks);

    html = setTitle(html, title);
    html = setCanonical(html, url);
    html = setMetaTag(html, "description", description, false);
    html = setMetaTag(html, "robots", isMemberOnly ? "noindex, follow" : "index, follow", false);

    html = setMetaTag(html, "og:type", "article", true);
    html = setMetaTag(html, "og:title", title, true);
    html = setMetaTag(html, "og:description", description, true);
    html = setMetaTag(html, "og:image", image, true);
    html = setMetaTag(html, "og:url", url, true);

    html = setMetaTag(html, "twitter:title", title, false);
    html = setMetaTag(html, "twitter:description", description, false);
    html = setMetaTag(html, "twitter:image", image, false);
    html = setMetaTag(html, "twitter:url", url, false);

    if (!isMemberOnly) {
      html = appendJsonLd(html, {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: data.title || "",
        description,
        image,
        inLanguage: "en",
        datePublished: toIso(data.createdAt),
        dateModified: toIso(data.updatedAt) || toIso(data.createdAt),
        author: { "@type": "Person", name: data.author || "ENGLEV" },
        publisher: {
          "@type": "Organization",
          name: "ENGLEV",
          logo: { "@type": "ImageObject", url: `${SITE}/englev-logo.png` },
        },
        mainEntityOfPage: url,
        educationalLevel: LEVEL_ORDER.join(", "),
      });
    }

    // Brauzerda 10 daqiqa, CDN'da 1 soat — `shareTest.js` bilan bir xil.
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
    return res.status(200).send(html);
  } catch (err) {
    console.error("shareArticle xatosi:", err);
    // Meta'siz bo'lsa ham SPA ishlashi kerak — xom index.html qaytaramiz.
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);
  }
}

module.exports = { shareArticle, toPlainText, getContentBlocks, buildDescription };
