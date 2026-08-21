// src/hooks/useSeo.js
//
// Sahifaga qarab <title>, meta description, canonical va Open Graph teglarini
// almashtiradi.
//
// ─── NEGA KERAK ─────────────────────────────────────────────────────────────
//
// Bu SPA: `index.html` bitta va u BARCHA marshrutlar uchun bir xil sarlavha va
// tavsifni beradi. Ya'ni Google indeksiga tushgan har bir maqola "ENGLEV |
// Ingliz tili portali" nomi bilan, bir xil tavsif bilan tushardi — bunday
// sahifalar bir-birining dublikati sifatida qaraladi va reyting olmaydi.
//
// ─── BU HOOK NIMANI YOPMAYDI ────────────────────────────────────────────────
//
// Bu teglar JS ishga tushgandan KEYIN paydo bo'ladi. Googlebot JS'ni render
// qiladi, shuning uchun unga yetarli. Lekin Telegram, Facebook va WhatsApp
// havola ko'rinishini (link preview) yasashda JS'ni UMUMAN ishlatmaydi — ular
// faqat serverdan kelgan xom HTML'ni o'qiydi.
//
// O'zbekistonda ulashishning asosiy kanali Telegram bo'lgani uchun bu jiddiy.
// Shuning uchun `/article/**` uchun server tomonda `functions/shareArticle.js`
// xuddi shu teglarni index.html ichiga OLDINDAN yozib beradi. Ikkalasi bir xil
// qiymatni berishi kerak — birini o'zgartirsangiz, ikkinchisini ham tekshiring.

import { useEffect } from 'react';

const SITE_NAME = 'ENGLEV';
const DEFAULT_IMAGE = 'https://englev.uz/englev-logo.png';

/** Prod domeni — `localhost` da ham canonical prod manzilini ko'rsatsin. */
const SITE_ORIGIN = 'https://englev.uz';

/**
 * Nomi bo'yicha <meta> topadi, bo'lmasa yaratadi.
 * `property` (Open Graph) va `name` (oddiy meta) atributlari farqlanadi.
 */
function upsertMeta(key, value, isProperty) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** JSON-LD blokini `data-seo` bilan belgilab qo'yamiz — tozalash oson bo'lsin. */
function setJsonLd(schema) {
  const existing = document.head.querySelector('script[data-seo="jsonld"]');
  if (existing) existing.remove();
  if (!schema) return;
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.setAttribute('data-seo', 'jsonld');
  el.textContent = JSON.stringify(schema);
  document.head.appendChild(el);
}

/**
 * @param {object}  opts
 * @param {string}  opts.title        To'liq <title> matni (sayt nomisiz beriladi).
 * @param {string}  opts.description  ~155 belgigacha tavsif.
 * @param {string}  [opts.path]       Canonical yo'l, masalan `/article/abc`.
 * @param {string}  [opts.image]      Ijtimoiy tarmoq rasmi (to'liq URL).
 * @param {boolean} [opts.noIndex]    `true` bo'lsa — robots'ga indekslamaslikni aytadi.
 * @param {object}  [opts.jsonLd]     Schema.org obyekti.
 * @param {boolean} [opts.enabled]    `false` bo'lsa hook hech narsa qilmaydi
 *                                    (ma'lumot hali yuklanmaganda kerak).
 */
export function useSeo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noIndex = false,
  jsonLd = null,
  enabled = true,
} = {}) {
  // `jsonLd` — har renderda yangi obyekt bo'ladi, shuning uchun uni bog'liqlik
  // ro'yxatiga obyekt sifatida qo'ysak effekt cheksiz qayta ishga tushardi.
  // Serializatsiya qilingan nusxa esa qiymat bo'yicha solishtiriladi.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    if (!enabled || !title) return;

    const previousTitle = document.title;
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const url = path ? `${SITE_ORIGIN}${path}` : SITE_ORIGIN;

    document.title = fullTitle;
    if (description) upsertMeta('description', description, false);
    upsertLink('canonical', url);

    upsertMeta('og:title', fullTitle, true);
    upsertMeta('og:url', url, true);
    upsertMeta('og:image', image, true);
    if (description) upsertMeta('og:description', description, true);

    upsertMeta('twitter:title', fullTitle, false);
    upsertMeta('twitter:url', url, false);
    upsertMeta('twitter:image', image, false);
    if (description) upsertMeta('twitter:description', description, false);

    upsertMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow', false);

    setJsonLd(jsonLdKey ? JSON.parse(jsonLdKey) : null);

    return () => {
      document.title = previousTitle;
      setJsonLd(null);
      // Canonical qolib ketsa keyingi sahifa noto'g'ri manzilni e'lon qilardi.
      document.head.querySelector('link[rel="canonical"]')?.remove();
      // Yopiq sahifadan ommaviysiga o'tganda `noindex` ilashib qolmasin.
      upsertMeta('robots', 'index, follow', false);
    };
  }, [title, description, path, image, noIndex, jsonLdKey, enabled]);
}

export default useSeo;
