// functions/seo.test.js
//
// SEO qatlamining sof (Firestore'siz) mantig'i uchun testlar.
//
// Bu yerda tekshiriladigan narsalar aynan sekin va sezilmay buziladiganlar:
// noto'g'ri qochirilgan belgi HTML/XML ni buzadi, lekin sahifa baribir
// "ishlaydiganday" ko'rinadi — xatoni faqat qidiruv tizimi sezadi.

const test = require("node:test");
const assert = require("node:assert");

const { setMetaTag, setCanonical, setTitle, appendJsonLd, escapeHtml } = require("./htmlMeta");
const { toPlainText, getContentBlocks, buildDescription, buildPrerenderHtml } = require("./shareArticle");
const { escapeXml } = require("./sitemap");

const HTML = `<!doctype html><html><head>
<meta name="description" content="eski" />
<meta property="og:title" content="eski" />
<title>ENGLEV</title>
</head><body><div id="root"></div></body></html>`;

test("setMetaTag mavjud tegni almashtiradi, ikkinchisini qo'shmaydi", () => {
  const out = setMetaTag(HTML, "og:title", "Yangi sarlavha", true);
  assert.match(out, /content="Yangi sarlavha"/);
  assert.strictEqual((out.match(/property="og:title"/g) || []).length, 1);
});

test("setMetaTag yo'q tegni </head> oldidan qo'shadi", () => {
  const out = setMetaTag(HTML, "og:image", "https://englev.uz/a.png", true);
  assert.match(out, /<meta property="og:image" content="https:\/\/englev\.uz\/a\.png" \/>\n<\/head>/);
});

test("meta qiymatidagi qo'shtirnoq atributdan chiqib ketmaydi", () => {
  // Sarlavhada " bo'lsa va qochirilmasa, atribut erta yopilib butun <head>
  // buzilardi — Telegram bunday sahifada preview ko'rsatmaydi.
  const out = setMetaTag(HTML, "og:title", 'IELTS "Reading" darsi', true);
  assert.ok(!out.includes('content="IELTS "Reading"'));
  assert.match(out, /&quot;Reading&quot;/);
});

test("setCanonical yo'q bo'lsa qo'shadi, bor bo'lsa almashtiradi", () => {
  const once = setCanonical(HTML, "https://englev.uz/article/a1");
  assert.strictEqual((once.match(/rel="canonical"/g) || []).length, 1);
  const twice = setCanonical(once, "https://englev.uz/article/a2");
  assert.strictEqual((twice.match(/rel="canonical"/g) || []).length, 1);
  assert.match(twice, /article\/a2/);
});

test("setTitle faqat <title> ni almashtiradi", () => {
  const out = setTitle(HTML, "Maqola | ENGLEV");
  assert.match(out, /<title>Maqola \| ENGLEV<\/title>/);
});

test("appendJsonLd ichidagi </script> blokni erta yopmaydi", () => {
  // Maqola matnida </script> uchrasa, qochirilmagan holda u JSON-LD blokini
  // yopib, qolgan JSON'ni sahifaga matn sifatida to'kib yuborardi.
  const out = appendJsonLd(HTML, { headline: "a</script><b>x</b>" });
  assert.strictEqual((out.match(/<\/script>/g) || []).length, 1);
  assert.match(out, /<\\\//);
});

test("toPlainText HTML teg va entity'larni tozalaydi", () => {
  assert.strictEqual(toPlainText("<p>Salom&nbsp;<b>dunyo</b></p>"), "Salom dunyo");
  assert.strictEqual(toPlainText("a &amp; b"), "a & b");
  assert.strictEqual(toPlainText(null), "");
});

test("getContentBlocks eski (content) va yangi (levels) formatni ham o'qiydi", () => {
  const eski = { content: [{ text: "eski" }] };
  assert.deepStrictEqual(getContentBlocks(eski), [{ text: "eski" }]);

  // Yangi formatda B1 birinchi navbatda olinadi.
  const yangi = { levels: { B1: { content: [{ text: "b1" }] }, C1: { content: [{ text: "c1" }] } } };
  assert.deepStrictEqual(getContentBlocks(yangi), [{ text: "b1" }]);

  // B1 bo'sh bo'lsa keyingi darajaga tushadi.
  const b1yoq = { levels: { B1: { content: [] }, B2: { content: [{ text: "b2" }] } } };
  assert.deepStrictEqual(getContentBlocks(b1yoq), [{ text: "b2" }]);

  assert.deepStrictEqual(getContentBlocks({}), []);
});

test("buildDescription 155 belgidan oshmaydi va so'z o'rtasida uzilmaydi", () => {
  const uzun = { subtitle: "lorem ipsum ".repeat(40) };
  const out = buildDescription(uzun, []);
  assert.ok(out.length <= 156, `uzunlik ${out.length}`);
  assert.ok(out.endsWith("…"));
  // Kesilgan joy probel bo'lgani uchun oxirgi so'z butun qoladi.
  assert.ok(!out.includes("lore…"));
});

test("buildDescription subtitle bo'lmasa matn bloklaridan yig'adi", () => {
  const out = buildDescription({}, [{ text: "<p>Birinchi jumla.</p>" }, { text: "<p>Ikkinchi.</p>" }]);
  assert.strictEqual(out, "Birinchi jumla. Ikkinchi.");
});

test("buildDescription bo'sh maqolada ham tavsif qaytaradi", () => {
  // Bo'sh `description` — qidiruv natijasida sahifani tasodifiy matn bilan
  // ko'rsatilishiga olib keladi, shuning uchun zaxira matn shart.
  const out = buildDescription({}, []);
  assert.ok(out.length > 20);
});

test("escapeXml sitemap'ni buzadigan belgilarni qochiradi", () => {
  assert.strictEqual(escapeXml("a & b"), "a &amp; b");
  assert.strictEqual(escapeXml("<loc>"), "&lt;loc&gt;");
});

test("escapeHtml null/undefined da yiqilmaydi", () => {
  assert.strictEqual(escapeHtml(null), "");
  assert.strictEqual(escapeHtml(undefined), "");
});

// ─── PRERENDER ──────────────────────────────────────────────────────────────

test("buildPrerenderHtml sarlavha, subtitle va matnni semantik teglarga soladi", () => {
  const out = buildPrerenderHtml(
    { title: "Dreams", subtitle: "<p>Kirish</p>", author: "Aziz" },
    [{ type: "paragraph", text: "<p>Birinchi.</p>" }, { type: "heading", text: "Bo'lim" }]
  );
  assert.match(out, /<h1>Dreams<\/h1>/);
  assert.match(out, /<p class="sub">Kirish<\/p>/);
  assert.match(out, /<p class="by">Aziz<\/p>/);
  assert.match(out, /<p>Birinchi\.<\/p>/);
  // Sarlavha bloki <h2> bo'lishi kerak — ierarxiya qidiruv tizimi uchun muhim.
  assert.match(out, /<h2>Bo&#039;lim<\/h2>/);
});

test("prerender maqola matnidagi HTML'ni qochiradi (skript tushmasin)", () => {
  // Maqola muharriridan kelgan xom HTML to'g'ridan-to'g'ri qo'yilsa, sahifaga
  // begona teg yoki skript tushardi. Matn har doim oddiy matnga aylantiriladi.
  const out = buildPrerenderHtml(
    { title: 'A <script>alert(1)</script>' },
    [{ type: "paragraph", text: '<img src=x onerror="alert(2)">matn' }]
  );
  assert.ok(!out.includes("<script>"));
  assert.ok(!out.includes("onerror"));
  assert.match(out, /&lt;script&gt;/);
});

test("prerender bloklar sonini cheklaydi", () => {
  const many = Array.from({ length: 200 }, (_, i) => ({ type: "paragraph", text: `p${i}` }));
  const out = buildPrerenderHtml({ title: "T" }, many);
  assert.strictEqual((out.match(/<p>/g) || []).length, 60);
});

test("prerender bo'sh bloklarni tashlab ketadi", () => {
  const out = buildPrerenderHtml({ title: "T" }, [
    { type: "paragraph", text: "<p>&nbsp;</p>" },
    { type: "paragraph", text: "bor" },
  ]);
  assert.strictEqual((out.match(/<p>/g) || []).length, 1);
});

test("premium maqolada blok bo'lmaydi — matn sizib chiqmaydi", () => {
  // `shareArticle` premium maqolada `blocks` ni ataylab bo'sh qoldiradi;
  // shu holatda prerender faqat sarlavhadan iborat bo'lishi kerak.
  const out = buildPrerenderHtml({ title: "Premium" }, []);
  assert.match(out, /<h1>Premium<\/h1>/);
  assert.ok(!out.includes("<p>"));
});
