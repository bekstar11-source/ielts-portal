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
// ─── MAQOLA MATNI HTML ICHIDA (PRERENDER) ──────────────────────────────────
//
// Matn `#root` ichiga OLDINDAN yoziladi va HAMMAGA bir xil beriladi.
//
// NEGA User-Agent bo'yicha AJRATILMAYDI: Firebase Hosting CDN'i `Vary` ni
// hisobga olmaydi — kesh kaliti faqat URL. Robot uchun alohida javob
// tayyorlansa, u keshga tushib oddiy foydalanuvchiga berilardi (va aksincha).
// Bundan tashqari UA bo'yicha boshqa kontent berish "cloaking" ga o'xshab
// qoladi. Hammaga bir xil HTML — kesh xavfsiz, cloaking xavfi nol.
//
// NEGA UMUMAN KERAK: Googlebot JS'ni render qiladi, lekin Yandex (bu bozorda
// jiddiy ulush) buni ancha ishonchsiz bajaradi. Prerender'siz Yandex maqola
// matnini umuman ko'rmasligi mumkin edi.
//
// FOYDALANUVCHIGA ZARARI YO'Q: React `createRoot().render()` birinchi
// render'da `#root` ichini tozalaydi, ya'ni matn ilova yuklangach almashadi.
// Oraliqda odam BEZAKSIZ matn ko'rmasligi uchun pastda `PRERENDER_STYLE` bor —
// u o'quv mavzusining rangi va tipografiyasini takrorlaydi. Natijada bu
// "chaqnash" emas, balki bosqichma-bosqich yuklanish bo'lib ko'rinadi va LCP
// (eng katta kontent chizilishi) ham yaxshilanadi.
//
// ⚠️ Mavzu: ilovada tungi rejim `.dark` klassi orqali (localStorage'dan)
// beriladi — JS'gacha uni bilib bo'lmaydi. Shuning uchun bu yerda
// `prefers-color-scheme` ishlatiladi: bu eng yaqin taxmin.

const admin = require("firebase-admin");
const fetch = require("node-fetch");
const {
  escapeHtml,
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

/**
 * Prerender uchun tipografiya.
 *
 * O'quv mavzusining palitrasi (`ArticleReading.jsx` dagi `--r-paper`/`--r-ink`)
 * bilan bir xil qiymatlar — React yuklanganda ekrandagi rang o'zgarmasin.
 */
const PRERENDER_STYLE = `
<style id="prerender-style">
#prerender-article{max-width:680px;margin:0 auto;padding:64px 20px;
 font-family:'Source Serif 4',Georgia,serif;color:#1f1e1c;background:#faf9f5;
 font-size:19px;line-height:1.72}
#prerender-article h1{font-size:38px;line-height:1.18;margin:0 0 12px;
 letter-spacing:-.01em;font-weight:700}
#prerender-article h2{font-size:26px;line-height:1.3;margin:32px 0 12px;font-weight:700}
#prerender-article .sub{font-size:20px;color:#6c6a64;margin:0 0 8px}
#prerender-article .by{font-size:15px;color:#6c6a64;margin:0 0 32px;
 font-family:'Public Sans',system-ui,sans-serif}
#prerender-article p{margin:0 0 1.35em}
body{margin:0;background:#faf9f5}
@media (prefers-color-scheme:dark){
 #prerender-article{color:#e8e5de;background:#171614}
 #prerender-article .sub,#prerender-article .by{color:#948f85}
 body{background:#171614}
}
</style>`;

/** Bir sahifada chiqariladigan maksimal blok — javob hajmi cheklansin. */
const MAX_PRERENDER_BLOCKS = 60;

/**
 * `#root` ichiga qo'yiladigan semantik maqola HTML'i.
 *
 * Matn HAR DOIM oddiy matnga aylantirilib, keyin qochiriladi: maqola
 * muharriridan kelgan xom HTML'ni to'g'ridan-to'g'ri qo'yish sahifaga begona
 * teg (yoki skript) tushishiga yo'l ochardi.
 */
function buildPrerenderHtml(data, blocks) {
  const parts = [];
  if (data.title) parts.push(`<h1>${escapeHtml(data.title)}</h1>`);
  if (data.subtitle) parts.push(`<p class="sub">${escapeHtml(toPlainText(data.subtitle))}</p>`);
  if (data.author) parts.push(`<p class="by">${escapeHtml(data.author)}</p>`);

  for (const block of blocks.slice(0, MAX_PRERENDER_BLOCKS)) {
    const text = toPlainText(block && block.text);
    if (!text) continue;
    // Sarlavha bloklari <h2> bo'ladi — hujjat ierarxiyasi qidiruv tizimi
    // uchun ham, ekran o'quvchisi uchun ham ma'noli bo'lsin.
    parts.push(block.type === "heading"
      ? `<h2>${escapeHtml(text)}</h2>`
      : `<p>${escapeHtml(text)}</p>`);
  }

  return `<article id="prerender-article">${parts.join("")}</article>`;
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

      // Matnni `#root` ichiga oldindan yozamiz — Yandex va JS ishlatmaydigan
      // boshqa robotlar uchun. Premium maqolada bu blok YO'Q: u yerda `blocks`
      // ataylab bo'sh, ya'ni paywall matni sizib chiqmaydi.
      if (blocks.length) {
        html = html.replace("</head>", `${PRERENDER_STYLE}\n</head>`);
        html = html.replace(
          '<div id="root"></div>',
          `<div id="root">${buildPrerenderHtml(data, blocks)}</div>`
        );
      }
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

module.exports = { shareArticle, toPlainText, getContentBlocks, buildDescription, buildPrerenderHtml };
