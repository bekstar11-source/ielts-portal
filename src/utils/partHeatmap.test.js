// src/utils/partHeatmap.test.js
//
//   npm run test:utils
//
// Bu bo'limning yagona qiymati — XULOSADA. Rangli kataklar o'z-o'zicha
// "P3 eng past" deydi, bu esa deyarli har bir o'quvchida shunday (P3 eng qiyin
// qilib tuzilgan). Shuning uchun xulosa qachon chiqishi va qachon CHIQMASLIGI
// aniq qotirilgan: asossiz "muammo" e'loni butun sahifaga ishonchni yo'qotadi.

import test from 'node:test';
import assert from 'node:assert';

import { buildPartHeatmap, MIN_PART_SAMPLE } from './partHeatmap.js';

const part = (total, wrong) => ({ total, wrong });

test('bo\'limlar aniqligi hisoblanadi', () => {
  const { rows } = buildPartHeatmap({
    reading: [part(13, 2), part(13, 5), part(14, 7)]
  });

  const reading = rows[0];
  assert.strictEqual(reading.skill, 'reading');
  assert.strictEqual(reading.parts[0].accuracy, 85);
  assert.strictEqual(reading.parts[1].accuracy, 62);
  assert.strictEqual(reading.parts[2].accuracy, 50);
  assert.strictEqual(reading.parts[0].index, 1, 'bo\'lim raqami 1 dan boshlanadi');
});

test('ishlanmagan bo\'lim o\'z o\'rnida qoladi', () => {
  // Faqat P1 va P3 ishlangan. P2 ni tashlab yuborsak, P3 ekranda P2 bo'lib
  // ko'rinardi va o'quvchi noto'g'ri passage'ni mashq qilardi.
  const { rows } = buildPartHeatmap({ reading: [part(13, 2), part(0, 0), part(14, 7)] });

  assert.strictEqual(rows[0].parts.length, 3);
  assert.strictEqual(rows[0].parts[1].total, 0);
  assert.strictEqual(rows[0].parts[1].accuracy, null);
  assert.strictEqual(rows[0].parts[2].index, 3);
});

test('Listening 4 ta bo\'limgacha to\'ldiriladi', () => {
  const { rows } = buildPartHeatmap({ listening: [part(10, 1), part(10, 3)] });
  assert.strictEqual(rows[0].parts.length, 4, 'IELTS Listening 4 bo\'limdan iborat');
});

test('oxirgi bo\'limdagi keskin pasayish xulosa beradi', () => {
  // O'rtacha 70%, S4 esa 45% — 25 foiz orqada. Bu bilim emas, vaqt/charchoq.
  const { rows } = buildPartHeatmap(
    { listening: [part(10, 3), part(10, 3), part(10, 3), part(10, 6)] },
    { reference: { listening: 70 } }
  );

  assert.strictEqual(rows[0].insight.kind, 'finalDrop');
  assert.strictEqual(rows[0].insight.part, 4);
  assert.strictEqual(rows[0].insight.gap, 30);
});

test('birinchi bo\'limdagi pasayish alohida xulosa', () => {
  // P1 eng oson qism — u yerdagi pastlik qiyinlik emas, e'tibor muammosi.
  const { rows } = buildPartHeatmap(
    { reading: [part(13, 6), part(13, 3), part(14, 3)] },
    { reference: { reading: 75 } }
  );

  assert.strictEqual(rows[0].insight.kind, 'earlyWeak');
  assert.strictEqual(rows[0].insight.part, 1);
});

test('oxirgi bo\'lim muammosi birinchisidan ustun', () => {
  // Ikkalasi ham past bo'lsa, bittasi ko'rsatiladi — vaqt muammosi jiddiyroq
  // va uni tuzatish qolganini ham yaxshilaydi.
  const { rows } = buildPartHeatmap(
    { reading: [part(13, 6), part(13, 3), part(14, 9)] },
    { reference: { reading: 75 } }
  );

  assert.strictEqual(rows[0].insight.kind, 'finalDrop');
});

test('odatiy pasayish xulosa BERMAYDI', () => {
  // P1 85%, P2 77%, P3 71% — o'rtacha 78%. Bu IELTS'ning normal egri chizig'i,
  // hech qanday muammo yo'q va "muammo" deb e'lon qilish yolg'on bo'lardi.
  const { rows } = buildPartHeatmap(
    { reading: [part(13, 2), part(13, 3), part(14, 4)] },
    { reference: { reading: 78 } }
  );

  assert.strictEqual(rows[0].insight, null);
});

test('kam savolli bo\'lim xulosaga asos bo\'lmaydi', () => {
  const tiny = MIN_PART_SAMPLE - 1;
  const { rows } = buildPartHeatmap(
    { reading: [part(13, 2), part(13, 3), part(tiny, tiny)] },
    { reference: { reading: 80 } }
  );

  assert.strictEqual(rows[0].parts[2].reliable, false);
  assert.strictEqual(rows[0].insight, null, 'ishonchsiz bo\'limdan xulosa chiqmaydi');
});

test('tayanch bo\'lmasa xulosa chiqmaydi', () => {
  const { rows } = buildPartHeatmap({
    reading: [part(13, 9), part(13, 3), part(14, 3)]
  });
  assert.strictEqual(rows[0].insight, null);
});

test('ma\'lumotsiz va notanish ko\'nikmalar tashlanadi', () => {
  assert.strictEqual(buildPartHeatmap({}).hasData, false);
  assert.strictEqual(buildPartHeatmap(undefined).hasData, false);
  assert.strictEqual(buildPartHeatmap({ reading: [] }).hasData, false);
  assert.strictEqual(buildPartHeatmap({ reading: [part(0, 0)] }).hasData, false);
  // Writing/Speaking da passage tushunchasi yo'q.
  assert.strictEqual(buildPartHeatmap({ writing: [part(10, 2)] }).hasData, false);
});

test('xulosa matnlari ikkala tilda mavjud va {gap} o\'rniga ega', async () => {
  // Kalit dinamik (`analytics.insight.${kind}`), ya'ni `check:i18n` uni ko'rmaydi.
  const { translations } = await import('../locales/translations.js');

  ['finalDrop', 'earlyWeak'].forEach((kind) => {
    ['uz', 'en'].forEach((lang) => {
      const value = translations[lang]?.analytics?.insight?.[kind];
      assert.ok(typeof value === 'string' && value, `${lang}.${kind} tarjimasi yo'q`);
      assert.ok(value.includes('{gap}'), `${lang}.${kind} ichida {gap} bo'lishi kerak`);
    });
  });
});
