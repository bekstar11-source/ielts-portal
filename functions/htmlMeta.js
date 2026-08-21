// functions/htmlMeta.js
//
// `index.html` ichiga meta teg yozish uchun umumiy yordamchilar.
//
// Bu funksiyalar ilgari faqat `shareTest.js` ichida yashardi. `shareArticle.js`
// paydo bo'lganda ularning ikkinchi nusxasini yozish kerak bo'lardi — loyihada
// bunday ikkilanish allaqachon muammo tug'dirgan (qarang: `pricing.js` boshidagi
// izoh, narx ikki joyda mustaqil yozilgani haqida). Shuning uchun yagona manba.

/** HTML atributi ichiga xavfsiz joylashtirish uchun. */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Meta tegni almashtiradi, bo'lmasa `</head>` oldidan qo'shadi.
 *
 * @param {string}  htmlContent
 * @param {string}  propertyOrName  masalan "og:title" yoki "description"
 * @param {string}  value
 * @param {boolean} isProperty      `true` → property="..." (Open Graph),
 *                                  `false` → name="..." (oddiy meta)
 */
function setMetaTag(htmlContent, propertyOrName, value, isProperty = true) {
  const attr = isProperty ? "property" : "name";
  const regex = new RegExp(`<meta[^>]*${attr}="${propertyOrName}"[^>]*>`, "i");
  const newTag = `<meta ${attr}="${propertyOrName}" content="${escapeHtml(value)}" />`;
  if (regex.test(htmlContent)) {
    return htmlContent.replace(regex, newTag);
  }
  return htmlContent.replace("</head>", `${newTag}\n</head>`);
}

/** `<link rel="canonical">` ni o'rnatadi (dublikat sahifalarga qarshi). */
function setCanonical(htmlContent, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  const regex = /<link[^>]*rel="canonical"[^>]*>/i;
  if (regex.test(htmlContent)) {
    return htmlContent.replace(regex, tag);
  }
  return htmlContent.replace("</head>", `${tag}\n</head>`);
}

/** `<title>` matnini almashtiradi. */
function setTitle(htmlContent, title) {
  return htmlContent.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

/** JSON-LD blokini `</head>` oldidan qo'shadi. */
function appendJsonLd(htmlContent, schema) {
  if (!schema) return htmlContent;
  // `</script>` ketma-ketligi JSON ichida uchrasa blokni erta yopib yuborardi.
  const json = JSON.stringify(schema).replace(/<\//g, "<\\/");
  return htmlContent.replace(
    "</head>",
    `<script type="application/ld+json">${json}</script>\n</head>`
  );
}

/**
 * `index.html` ni ommaviy hostdan olib keladi.
 *
 * Cloud Function o'z domenida ishlaydi (`*.cloudfunctions.net`), u yerda
 * `index.html` yo'q — shuning uchun manba doim ommaviy host bo'lishi kerak.
 */
async function fetchIndexHtml(req, fetchImpl) {
  let host = req.headers["x-forwarded-host"] || req.headers.host || "englev.uz";
  if (host.includes("cloudfunctions.net") || host.includes("google.com")) {
    host = "englev.uz";
  }
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const res = await fetchImpl(`${protocol}://${host}/index.html`);
  if (!res.ok) {
    throw new Error(`index.html olinmadi: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

module.exports = {
  escapeHtml,
  setMetaTag,
  setCanonical,
  setTitle,
  appendJsonLd,
  fetchIndexHtml,
};
