// src/utils/questionTypeCorpus.test.js
//
//   npm run test:utils
//
// GOLDEN CORPUS TESTI — savol turlari bo'yicha asosiy himoya to'ri.
//
// Bitta savol to'rtta MUSTAQIL joyda talqin qilinadi:
//
//   1. renderer      — talaba javob maydonini ko'radimi?
//   2. evaluateTest  — ball maxrajiga kiradimi? (`totalQ`)
//   3. reviewAnswers — review ro'yxatida ko'rinadimi?
//   4. getActualQuestionCount — "40 ta savol" yozuviga kiradimi?
//
// Ularning har biri o'z daraxt yuruvchisiga ega. Biri ikkinchisidan siljiganda
// hech qanday xatolik chiqmaydi — talaba shunchaki noto'g'ri band oladi. Shu
// sabab har bir namuna uchun TO'RTALASI ham tekshiriladi.

import test from 'node:test';
import assert from 'node:assert';

import { CORPUS, testWith } from './__fixtures__/questionTypeCorpus.js';
import { evaluateTest, isMultiAnswerType } from './ieltsScoring.js';
import { buildReviewQuestions } from './reviewAnswers.js';
import { getActualQuestionCount } from './TestUtils.js';
import { resolveListeningRenderer, resolveReadingRenderer } from './questionTypeRegistry.js';
import { canonicalQuestionType } from './questionTypes.js';

/** Review qatoridagi ID lar: ko'p javobli guruhda ular "1, 2" ko'rinishida birlashadi. */
const reviewIds = (rows) =>
  new Set(rows.flatMap((r) => String(r.id).split(',').map((s) => s.trim())).filter(Boolean));

for (const c of CORPUS) {
  const data = testWith(c.skill, c.group);

  // ─── 1. RENDERER ───────────────────────────────────────────────────────────
  if (c.skill === 'listening') {
    test(`[renderer] ${c.name}`, () => {
      const renderer = isMultiAnswerType(c.group.type)
        ? 'SelectionBox'
        : resolveListeningRenderer(c.group.type);

      assert.notEqual(
        renderer, null,
        `"${c.group.type}" dispatcher'da tanilmaydi — guruh javob maydonisiz chiziladi, ` +
        `lekin ball hisobiga baribir kiradi.`
      );
      if (c.rendererOnly) assert.equal(renderer, c.rendererOnly);
    });
  } else {
    // Reading dispatcher'i bitta renderer emas, bayroqlar to'plami bilan
    // ishlaydi (guruh bir vaqtda jadval ham, variantlar ro'yxatli ham bo'lishi
    // mumkin), lekin ASOSIY komponent baribir bitta — uni registr tanlaydi.
    test(`[renderer] ${c.name}`, () => {
      const renderer = resolveReadingRenderer(c.group, isMultiAnswerType(c.group.type));
      assert.ok(renderer, 'renderer tanlanmadi');
      if (c.rendererOnly) assert.equal(renderer, c.rendererOnly);
    });
  }

  // ─── 2. BALL HISOBI ────────────────────────────────────────────────────────
  test(`[ball] ${c.name}`, () => {
    const ev = evaluateTest(data, c.answers);

    assert.equal(ev.totalQ, c.expectedTotal, 'maxraj (totalQ) kutilganidan farq qiladi');
    assert.equal(
      ev.correctCount, c.expectedTotal,
      `hamma javob TO'G'RI berilgan, lekin ${ev.correctCount}/${ev.totalQ} sanaldi`
    );
    assert.deepEqual(ev.mistakes, [], 'to\'g\'ri javoblar xato deb belgilandi');
    assert.deepEqual(ev.missingKeys, [], 'javob kaliti topilmadi');
  });

  test(`[ball] ${c.name} — javobsiz urinish 0 ball beradi`, () => {
    // Teskari tomon: javob berilmaganda maxraj O'ZGARMASLIGI shart. Aks holda
    // javobsiz savollar maxrajdan tushib, band sun'iy ko'tarilardi.
    const ev = evaluateTest(data, {});
    assert.equal(ev.totalQ, c.expectedTotal, 'javobsiz urinishda maxraj o\'zgardi');
    assert.equal(ev.correctCount, 0);
  });

  // ─── 3. REVIEW ─────────────────────────────────────────────────────────────
  test(`[review] ${c.name} — ball bilan bir xil savollarni ko'radi`, () => {
    const ev = evaluateTest(data, c.answers);
    const rows = buildReviewQuestions(data, c.answers);

    const inReview = reviewIds(rows);
    const inScore = new Set(ev.questionOrder.map(String));

    assert.deepEqual(
      [...inScore].filter((id) => !inReview.has(id)), [],
      'ball hisobiga kirgan, lekin review\'da ko\'rinmaydigan savollar'
    );
    assert.deepEqual(
      [...inReview].filter((id) => !inScore.has(id)), [],
      'review\'da bor, lekin ball hisobiga kirmagan savollar'
    );
  });

  test(`[review] ${c.name} — to'g'ri javobni yashil belgilaydi`, () => {
    // Eng qimmat nomuvofiqlik: review'da ✓ ko'rinadi, ball esa berilmaydi.
    const rows = buildReviewQuestions(data, c.answers);
    const wrong = rows.filter((r) => !r.isCorrect);
    assert.deepEqual(
      wrong.map((r) => ({ id: r.id, kutilgan: r.correctAnswer, berilgan: r.userAnswer })), [],
      'hamma javob to\'g\'ri, lekin review ularni xato deb ko\'rsatdi'
    );
  });

  // ─── 4. SAVOL SANAGICH ─────────────────────────────────────────────────────
  test(`[sanoq] ${c.name} — kartochkadagi son ball maxraji bilan bir xil`, () => {
    assert.equal(
      getActualQuestionCount(data), c.expectedTotal,
      'getActualQuestionCount ball maxrajidan farq qiladi — talaba "40 ta savol" ' +
      'yozuvini ko\'rib, boshqa maxrajga baholanadi'
    );
  });

  // ─── 5. TAHLIL TASNIFI ─────────────────────────────────────────────────────
  test(`[tahlil] ${c.name} — xatolar tahlilida "other" ga tushmaydi`, () => {
    assert.notEqual(
      canonicalQuestionType(c.group.type), 'other',
      `"${c.group.type}" tahlilda oilasiz qoladi — talaba statistikada "boshqa" qatorini ko'radi`
    );
  });
}

test('korpus har bir listening renderer\'ini qamrab oladi', () => {
  // Yangi renderer qo'shilib, namuna qo'shilmasa — shu test ogohlantiradi.
  const covered = new Set(CORPUS.filter((c) => c.skill === 'listening' && c.rendererOnly).map((c) => c.rendererOnly));
  for (const r of ['MapLabeling', 'Matching', 'TableCompletion', 'NoteCompletion', 'FlowChart', 'MultipleChoice']) {
    assert.ok(covered.has(r), `"${r}" renderer'i uchun korpusda namuna yo'q`);
  }
});

test('korpus har bir reading renderer\'ini qamrab oladi', () => {
  const covered = new Set(
    CORPUS.filter((c) => c.skill === 'reading')
      .map((c) => resolveReadingRenderer(c.group, isMultiAnswerType(c.group.type)))
  );
  for (const r of ['MatchingGrid', 'MatchingHeadings', 'Table', 'DiagramLabeling', 'SummaryGapFill', 'FlowChart', 'Choice', 'GapFill']) {
    assert.ok(covered.has(r), `"${r}" renderer'i uchun korpusda reading namunasi yo'q`);
  }
});

test('namunadagi har bir javob haqiqiy savolga tegishli', () => {
  // Namunalar orasida ID takrorlanishi MUAMMO EMAS — har biri alohida testga
  // o'raladi, va ba'zi juftliklar (massiv/obyekt ko'rinishidagi jadval qatorlari)
  // ataylab bir xil ID ishlatadi: gap aynan ikki yozilish bir xil natija
  // berishida.
  //
  // Xavflisi boshqa: namunada mavjud bo'lmagan ID ga javob yozib qo'yish.
  // Bunday javob jimgina e'tiborsiz qoladi va namuna kutilganidan kuchsiz
  // tekshiruvga aylanadi.
  for (const c of CORPUS) {
    const scored = new Set(evaluateTest(testWith(c.skill, c.group), c.answers).questionOrder.map(String));
    const orphan = Object.keys(c.answers).filter((id) => !scored.has(id));
    assert.deepEqual(orphan, [], `"${c.name}" — javob yozilgan, lekin bunday savol yo'q: ${orphan}`);
  }
});
