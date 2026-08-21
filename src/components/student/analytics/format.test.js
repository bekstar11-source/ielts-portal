// src/components/student/analytics/format.test.js
//
//   npm run test:utils
//
// `mistakeReason` tarjima kalitini DINAMIK tanlaydi, ya'ni `check:i18n` uni
// tekshira olmaydi (u faqat `t('literal')` chaqiruvlarini ko'radi). Kalitdagi
// xato yoki tarjimaning bir tilda unutilishi ekranda `analytics.whyPlural`
// bo'lib chiqardi. Shu bo'shliqni quyidagi test yopadi.

import test from 'node:test';
import assert from 'node:assert';

import { mistakeReason, MISTAKE_REASON_KEYS } from './format.js';
import { translations } from '../../../locales/translations.js';

/** "analytics.whyPlural" → tarjimalar daraxtidagi qiymat. */
function lookup(locale, dottedKey) {
  return dottedKey.split('.').reduce((node, part) => (node ? node[part] : undefined), locale);
}

test('har bir sabab kaliti ikkala tilda ham mavjud', () => {
  const missing = [];

  Object.entries(MISTAKE_REASON_KEYS).forEach(([pattern, key]) => {
    ['uz', 'en'].forEach((lang) => {
      const value = lookup(translations[lang], key);
      if (typeof value !== 'string' || value.length === 0) {
        missing.push(`${lang}: ${key} (${pattern})`);
      }
    });
  });

  assert.deepStrictEqual(missing, [], `tarjimasi yo'q kalitlar:\n${missing.join('\n')}`);
});

test('sonli sabablarda {count} o\'rni bor', () => {
  // Bu ikkisi `{count}` bilan almashtiriladi — o'rin bo'lmasa son yo'qoladi.
  ['whySpelling', 'whyExtraWords'].forEach((name) => {
    ['uz', 'en'].forEach((lang) => {
      const value = lookup(translations[lang], `analytics.${name}`);
      assert.ok(value.includes('{count}'), `${lang}.${name} ichida {count} bo'lishi kerak`);
    });
  });
});

test('imlo xatosi belgilar farqini aytadi', () => {
  const reason = mistakeReason({ pattern: 'spelling', distance: 2, correctText: 'government' });
  assert.strictEqual(reason.key, 'analytics.whySpelling');
  assert.strictEqual(reason.count, 2);
});

test('masofasi yo\'q imlo xatosi sababsiz qoladi', () => {
  // Aytadigan aniq gap yo'q — umumiy yorliq qatorda allaqachon turibdi.
  assert.strictEqual(mistakeReason({ pattern: 'spelling', distance: 0 }), null);
  assert.strictEqual(mistakeReason({ pattern: 'spelling' }), null);
});

test('ortiqcha so\'z xatosi kalit uzunligini aytadi', () => {
  const one = mistakeReason({ pattern: 'extra_words', correctText: 'museum', userText: 'the local museum' });
  assert.strictEqual(one.count, 1);

  // Ko'p variantli kalitda so'z soni birinchisidan olinadi.
  const variants = mistakeReason({ pattern: 'extra_words', correctText: 'city hall / town hall' });
  assert.strictEqual(variants.count, 2);
});

test('aniq gap yo\'q naqshlarda sabab berilmaydi', () => {
  // Bularda qatorning o'zi ("iv → vii") allaqachon hammasini aytadi.
  assert.strictEqual(mistakeReason({ pattern: 'wrong_option' }), null);
  assert.strictEqual(mistakeReason({ pattern: 'off_target' }), null);
  assert.strictEqual(mistakeReason({}), null);
  assert.strictEqual(mistakeReason(null), null);
});

test('prototip kalitlari sabab bo\'lib qolmaydi', () => {
  assert.strictEqual(mistakeReason({ pattern: '__proto__' }), null);
  assert.strictEqual(mistakeReason({ pattern: 'constructor' }), null);
});
