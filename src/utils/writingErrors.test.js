// src/utils/writingErrors.test.js
//
//   npm run test:utils
//
// Ikki xavf bor va ikkalasi ham jimgina yuz beradi:
//   1. Model tur nomini biroz boshqacha yozadi ("Past Tense") va jamlanma
//      o'nlab bir martalik qatorga bo'linib ketadi.
//   2. Tarjima kaliti yo'q bo'lib qolsa, ekranda `analytics.writingErrors.tense`
//      chiqadi — `check:i18n` buni ko'rmaydi, chunki kalit dinamik.

import test from 'node:test';
import assert from 'node:assert';

import {
  canonicalWritingError,
  WRITING_ERROR_TYPES,
  WRITING_ERROR_TYPE_LIST
} from './writingErrors.js';
import { buildProductiveSkill } from './productiveSkills.js';
import { translations } from '../locales/translations.js';

test('model yozuvidagi og\'ishlar bitta turga keladi', () => {
  assert.strictEqual(canonicalWritingError('tense'), 'tense');
  assert.strictEqual(canonicalWritingError('Past Tense'), 'tense');
  assert.strictEqual(canonicalWritingError('verb tense'), 'tense');
  assert.strictEqual(canonicalWritingError('articles'), 'article');
  assert.strictEqual(canonicalWritingError('subject-verb agreement'), 'agreement');
  assert.strictEqual(canonicalWritingError('WORD ORDER'), 'word_order');
  assert.strictEqual(canonicalWritingError('informal register'), 'formality');
  assert.strictEqual(canonicalWritingError('vocabulary'), 'word_choice');
});

test('tanilmagan tur "other" ga tushadi', () => {
  assert.strictEqual(canonicalWritingError('nonsense'), 'other');
  assert.strictEqual(canonicalWritingError(''), 'other');
  assert.strictEqual(canonicalWritingError(undefined), 'other');
  assert.strictEqual(canonicalWritingError('__proto__'), 'other');
});

test('promptdagi ro\'yxat kanonik turlar bilan bir xil', () => {
  // Prompt modelga qaysi turlarni tanlashni aytadi. Ro'yxat kanonik nomlardan
  // chetga chiqsa, model ko'rsatilgan turni yozadi-yu, u `other` ga tushardi.
  const promptTypes = WRITING_ERROR_TYPE_LIST.split(' | ');
  promptTypes.forEach((type) => {
    assert.ok(WRITING_ERROR_TYPES.includes(type), `promptdagi "${type}" kanonik ro'yxatda yo'q`);
    assert.strictEqual(canonicalWritingError(type), type, `"${type}" o'zgarmasligi kerak`);
  });
  assert.ok(!promptTypes.includes('other'), '"other" ni modelga taklif qilmaymiz');
});

test('har bir tur ikkala tilda tarjimaga ega', () => {
  const missing = [];
  WRITING_ERROR_TYPES.forEach((type) => {
    ['uz', 'en'].forEach((lang) => {
      const value = translations[lang]?.analytics?.writingErrors?.[type];
      if (typeof value !== 'string' || !value) missing.push(`${lang}.${type}`);
    });
  });
  assert.deepStrictEqual(missing, [], `tarjimasi yo'q: ${missing.join(', ')}`);
});

test('mezon nomlari ikkala tilda tarjimaga ega', () => {
  // Writing va Speaking mezonlari — ular ham dinamik kalit bilan chiziladi.
  const names = ['taskAchievement', 'coherence', 'lexical', 'grammar', 'fluency', 'pronunciation', 'overall'];
  const missing = [];
  names.forEach((name) => {
    ['uz', 'en'].forEach((lang) => {
      const value = translations[lang]?.analytics?.criteria?.[name];
      if (typeof value !== 'string' || !value) missing.push(`${lang}.${name}`);
    });
  });
  assert.deepStrictEqual(missing, [], `tarjimasi yo'q: ${missing.join(', ')}`);
});

test('o\'rtacha band yig\'indidan chiqariladi', () => {
  // Ikki topshiriq: grammar 5.0 va 6.0 → o'rtacha 5.5.
  const skill = buildProductiveSkill({
    tasks: 2,
    criteriaSum: { grammar: 11, lexical: 12, overall: 11 }
  });

  assert.strictEqual(skill.tasks, 2);
  assert.strictEqual(skill.criteria.find((c) => c.name === 'grammar').band, 5.5);
  assert.strictEqual(skill.criteria.find((c) => c.name === 'lexical').band, 6);
  assert.strictEqual(skill.overall, 5.5);
});

test('IELTS yaxlitlash qoidasi: 5.75 → 6.0', () => {
  // Chegara holati. `.75` yuqoriga, `.25` esa `.5` ga boradi — IELTS shunday
  // hisoblaydi va o'quvchi buni natijalarida ko'rgan.
  const up = buildProductiveSkill({ tasks: 4, criteriaSum: { grammar: 23 } }); // 5.75
  assert.strictEqual(up.criteria[0].band, 6);

  const half = buildProductiveSkill({ tasks: 4, criteriaSum: { grammar: 21 } }); // 5.25
  assert.strictEqual(half.criteria[0].band, 5.5);
});

test('band 0.5 qadamga yaxlitlanadi', () => {
  // 17.5 / 3 = 5.833… — IELTS'da bunday band yo'q.
  const skill = buildProductiveSkill({ tasks: 3, criteriaSum: { grammar: 17.5 } });
  assert.strictEqual(skill.criteria[0].band, 6);

  const lower = buildProductiveSkill({ tasks: 3, criteriaSum: { grammar: 16 } });
  assert.strictEqual(lower.criteria[0].band, 5.5);
});

test('eng past mezon tanlanadi, "overall" hisobga olinmaydi', () => {
  const skill = buildProductiveSkill({
    tasks: 1,
    // `overall` eng past bo'lsa ham, u alohida mezon emas — qolganlarining xulosasi.
    criteriaSum: { grammar: 5, lexical: 6.5, overall: 4.5 }
  });

  assert.strictEqual(skill.weakest.name, 'grammar');
  assert.strictEqual(skill.overall, 4.5);
});

test('topshiriq bo\'lmasa bo\'lim ko\'rsatilmaydi', () => {
  assert.strictEqual(buildProductiveSkill(null), null);
  assert.strictEqual(buildProductiveSkill({ tasks: 0, criteriaSum: { grammar: 5 } }), null);
  assert.strictEqual(buildProductiveSkill(undefined), null);
});

test('qo\'shimcha maydonlar o\'tkaziladi', () => {
  const skill = buildProductiveSkill(
    { tasks: 1, criteriaSum: { grammar: 6 } },
    { fixes: [{ correctText: 'I have been living', count: 3 }] }
  );
  assert.strictEqual(skill.fixes.length, 1);
});
