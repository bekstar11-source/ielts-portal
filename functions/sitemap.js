// functions/sitemap.js
//
// `/sitemap.xml` — dinamik generatsiya qilinadi.
//
// ─── NEGA STATIK FAYL EMAS ──────────────────────────────────────────────────
//
// Ilgari `public/sitemap.xml` qo'lda yozilgan statik fayl edi va ichida faqat
// uchta sahifa bor edi (bosh sahifa, login, register). Yangi maqola qo'shilsa
// u sitemap'ga TUSHMASDI — ya'ni qidiruv tizimi uni faqat tasodifan topishi
// mumkin edi. Qo'lda yangilab turish esa amalda hech qachon bajarilmaydi.
//
// Endi ro'yxat Firestore'dan o'qiladi va har doim haqiqiy holatni aks ettiradi.
//
// ⚠️ `public/sitemap.xml` QAYTA YARATILMASIN: Firebase Hosting statik faylni
// rewrite'dan OLDIN xizmat qiladi, ya'ni fayl mavjud bo'lsa bu funksiya
// umuman chaqirilmaydi va sitemap yana muzlab qoladi.

const admin = require("firebase-admin");

const SITE = "https://englev.uz";

/** Sitemap'ga tushadigan ommaviy marshrutlar (`public/robots.txt` bilan mos). */
const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/articles", changefreq: "daily", priority: "0.9" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/trial", changefreq: "monthly", priority: "0.8" },
  { path: "/register", changefreq: "monthly", priority: "0.7" },
  { path: "/login", changefreq: "monthly", priority: "0.5" },
];

/** XML matn tugunlari uchun — `&` va `<` xom holda XML'ni buzadi. */
function escapeXml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDate(value) {
  try {
    if (!value) return null;
    const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function urlEntry({ path, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(SITE + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sitemap(req, res) {
  const today = new Date().toISOString().split("T")[0];
  const entries = STATIC_ROUTES.map((r) => urlEntry({ ...r, lastmod: today }));

  try {
    // Faqat ommaviy maqolalar: premium maqola mehmonga ochilmaydi, demak uni
    // sitemap'ga qo'yish qidiruv tizimini ochilmaydigan sahifaga yuborish
    // bo'lardi (`shareArticle.js` ularga `noindex` beradi).
    //
    // 5000 — sitemap standarti ruxsat bergan 50 000 dan ancha past, lekin bir
    // funksiya chaqiruvi uchun xavfsiz chegara. Shundan oshsa sitemap indeksga
    // (bir nechta faylga) bo'lish kerak bo'ladi.
    const snap = await admin
      .firestore()
      .collection("articles")
      .where("isMemberOnly", "==", false)
      .orderBy("createdAt", "desc")
      .limit(5000)
      .get();

    snap.forEach((doc) => {
      const data = doc.data() || {};
      entries.push(
        urlEntry({
          path: `/article/${doc.id}`,
          lastmod: toIsoDate(data.updatedAt) || toIsoDate(data.createdAt) || today,
          changefreq: "weekly",
          priority: "0.7",
        })
      );
    });
  } catch (err) {
    // Maqolalar o'qilmasa ham statik marshrutli sitemap qaytarish kerak —
    // bo'sh javob yoki 500 qidiruv tizimida butun sitemap'ni yaroqsiz qiladi.
    console.error("sitemap: maqolalarni o'qib bo'lmadi", err);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  res.set("Content-Type", "application/xml; charset=utf-8");
  // Bir soat CDN keshi — sitemap real vaqtda yangilanishi shart emas.
  res.set("Cache-Control", "public, max-age=600, s-maxage=3600");
  return res.status(200).send(xml);
}

module.exports = { sitemap, escapeXml, STATIC_ROUTES };
