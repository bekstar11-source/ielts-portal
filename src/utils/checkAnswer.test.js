// src/utils/checkAnswer.test.js
//
//   npm run test:utils
//
// JAVOB TEKSHIRISH QATLAMI — portaldagi eng qimmat kod.
//
// Bu yerdagi qoidalarning deyarli har biri HAQIQIY xatodan keyin qo'shilgan:
// talaba to'g'ri javob yozib "xato" olgan, yoki noto'g'ri javob "to'g'ri"
// sanalgan. Shu paytgacha ular faqat kod ichidagi izoh bilan himoyalangan edi —
// izoh esa refaktorni to'xtata olmaydi.
//
// Har bir test bitta aniq regressiyani qulflaydi. Test yiqilsa, demak kimdir
// o'sha xatoni qaytarib keltirdi.
//
// ⚠️ Bu fayl `functions/ieltsScoring.js` ga ham tegishli: server ball qo'yadi,
// klient review chizadi, ikkalasi shu bitta manbadan generatsiya qilinadi.

import test from 'node:test';
import assert from 'node:assert';

import {
  normalizeString,
  isChoiceQuestionType,
  isMultiAnswerType,
  getMultiSelectCount,
  getAnswerKey,
  getQuestionWeight,
  isRomanNumeral,
  romanToInt,
  getNumeralPrefix,
  stripNumeralPrefix,
  getOptionLabel,
  getOptionText,
  findOptionIndex,
  hasSequentialLetterLabels,
  resolveOptionDisplay,
  checkAnswer,
  scoreMultiAnswer
} from './ieltsScoring.js';

// Gap-fill / short-answer rejimi (variant-tanlash EMAS) — eng keng tarqalgan holat.
const gap = (correct, user) => checkAnswer(correct, user, false, null);
// Variant-tanlash rejimi (MCQ / TFNG / matching).
const choice = (correct, user, options = null) => checkAnswer(correct, user, true, options);

// ─────────────────────────────────────────────────────────────────────────────
// normalizeString
// ─────────────────────────────────────────────────────────────────────────────

test('normalizeString: vergul BUTUNLAY olib tashlanadi, bo\'shliqqa almashmaydi', () => {
  // "9,000" → "9 000" bo'lib qolsa, talabaning "9000" javobi mos kelmasdi.
  assert.equal(normalizeString('9,000'), '9000');
  assert.equal(normalizeString('1,234,567'), '1234567');
});

test('normalizeString: tinish belgilari bo\'shliqqa aylanadi', () => {
  assert.equal(normalizeString('St. Paul'), 'st paul');
  assert.equal(normalizeString("don't"), 'don t');
  assert.equal(normalizeString('Really?!'), 'really');
});

test('normalizeString: ortiqcha bo\'shliqlar yig\'iladi va kichik harfga tushadi', () => {
  assert.equal(normalizeString('  The   BIG   House  '), 'the big house');
});

test('normalizeString: yaroqsiz kirish bo\'sh satr beradi', () => {
  for (const bad of [null, undefined, '', 0, false]) {
    assert.equal(normalizeString(bad), '');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tur predikatlari
// ─────────────────────────────────────────────────────────────────────────────

test('isChoiceQuestionType: variant-tanlash turlari', () => {
  for (const t of ['mcq', 'multiple_choice', 'tfng', 'true_false', 'yes_no', 'yesno', 'matching', 'matching_headings']) {
    assert.equal(isChoiceQuestionType(t), true, t);
  }
});

test('isChoiceQuestionType: erkin matn turlari FALSE', () => {
  // Muhim: bu turlarda "C" javobini "C. elegans" kalitiga moslashtirish
  // noto'g'ri "to'g'ri" beradi — shuning uchun ular choice bo'lmasligi shart.
  for (const t of ['gap_fill', 'note_completion', 'short_answer', 'summary', 'table_completion', '', null]) {
    assert.equal(isChoiceQuestionType(t), false, String(t));
  }
});

test('isMultiAnswerType: `multiple choice` va `mcq` ATAYLAB chiqarib tashlangan', () => {
  // Ular "multi" so'zini o'z ichiga oladi, lekin har bir ID uchun bitta javob.
  assert.equal(isMultiAnswerType('multiple_choice'), false);
  assert.equal(isMultiAnswerType('mcq'), false);
  assert.equal(isMultiAnswerType('MCQ'), false);
});

test('isMultiAnswerType: checkbox turlari', () => {
  for (const t of ['pick_two', 'pick_five', 'multi_three', 'multi_choice_box', 'selection', 'multiple_answer']) {
    assert.equal(isMultiAnswerType(t), true, t);
  }
});

test('getMultiSelectCount: tur nomidagi son', () => {
  assert.equal(getMultiSelectCount('pick_two'), 2);
  assert.equal(getMultiSelectCount('multi-three'), 3);
  assert.equal(getMultiSelectCount('PICK FOUR'), 4);
  assert.equal(getMultiSelectCount('pick_five'), 5);
  assert.equal(getMultiSelectCount('selection'), null);
  assert.equal(getMultiSelectCount(null), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// getAnswerKey
// ─────────────────────────────────────────────────────────────────────────────

test('getAnswerKey: raqam 0 HAQIQIY kalit', () => {
  // Ilgari falsy tekshiruv tufayli "0" javobli savollar jimgina umumiy
  // hisobdan tushib qolardi — maxraj kichrayib, band sun'iy ko'tarilardi.
  assert.equal(getAnswerKey({ answer: 0 }), 0);
  assert.equal(getAnswerKey({ answer: '0' }), '0');
});

test('getAnswerKey: bo\'sh satr va bo\'sh massiv — kalit yo\'q', () => {
  assert.equal(getAnswerKey({ answer: '' }), undefined);
  assert.equal(getAnswerKey({ answer: '   ' }), undefined);
  assert.equal(getAnswerKey({ answer: [] }), undefined);
  assert.equal(getAnswerKey({ answer: null }), undefined);
});

test('getAnswerKey: muqobil maydon nomlari', () => {
  assert.equal(getAnswerKey({ correct_answer: 'x' }), 'x');
  assert.equal(getAnswerKey({ correctAnswer: 'y' }), 'y');
  assert.equal(getAnswerKey({ correct_answer_value: 'z' }), 'z');
  // `answer` birinchi o'rinda turadi.
  assert.equal(getAnswerKey({ answer: 'a', correct_answer: 'b' }), 'a');
});

test('getQuestionWeight: barcha tire turlari va vergul', () => {
  // ⚠️ Bazada diapazon ID lari EN TIRE bilan yoziladi ("35–36"). Ball hisobi,
  // review va footer navigatsiyasi shu funksiyaga tayanadi — qaysidir joyda
  // qo'lda `includes('-')` yozilsa, en tire o'tkazib yuboriladi va o'sha savol
  // 2 o'rniga 1 ball maxrajiga kiradi.
  assert.equal(getQuestionWeight('23-24'), 2);   // defis
  assert.equal(getQuestionWeight('35–36'), 2);   // en tire
  assert.equal(getQuestionWeight('35—36'), 2);   // em tire
  assert.equal(getQuestionWeight('23,24,25'), 3);
  assert.equal(getQuestionWeight('7'), 1);
  assert.equal(getQuestionWeight(null), 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// checkAnswer — erkin matn (gap-fill / short answer)
// ─────────────────────────────────────────────────────────────────────────────

test('checkAnswer: oddiy moslik, katta-kichik harf va bo\'shliqqa befarq', () => {
  assert.equal(gap('library', 'Library'), true);
  assert.equal(gap('library', '  LIBRARY '), true);
  assert.equal(gap('library', 'librari'), false);
});

test('checkAnswer: "/" bilan berilgan muqobil javoblar', () => {
  assert.equal(gap('bike/bicycle', 'bike'), true);
  assert.equal(gap('bike/bicycle', 'bicycle'), true);
  assert.equal(gap('the newspaper / newspaper', 'newspaper'), true);
  assert.equal(gap('bike/bicycle', 'car'), false);
});

test('checkAnswer: "and/or" — yarim javob TO\'G\'RI EMAS', () => {
  // Ilgari bu shunchaki "/" bo'yicha bo'linardi va talabaning "knife and"
  // javobi to'g'ri deb hisoblanardi.
  assert.equal(gap('knife and/or fork', 'knife'), true);
  assert.equal(gap('knife and/or fork', 'fork'), true);
  assert.equal(gap('knife and/or fork', 'knife and fork'), true);
  assert.equal(gap('knife and/or fork', 'knife and'), false);
});

test('checkAnswer: defisli yozuvning barcha ko\'rinishlari', () => {
  for (const user of ['car-park', 'car park', 'carpark']) {
    assert.equal(gap('car-park', user), true, user);
  }
  assert.equal(gap('car park', 'car-park'), true);
});

test('checkAnswer: qavs ichidagi so\'z ixtiyoriy', () => {
  assert.equal(gap('in (the) school', 'in school'), true);
  assert.equal(gap('in (the) school', 'in the school'), true);
  assert.equal(gap('in (the) school', 'at school'), false);
});

test('checkAnswer: minglik ajratkichli son', () => {
  assert.equal(gap('9,000', '9000'), true);
  assert.equal(gap('9000', '9,000'), true);
});

test('checkAnswer: massiv ko\'rinishidagi kalit — har bir variant tekshiriladi', () => {
  assert.equal(gap(['red', 'crimson'], 'crimson'), true);
  assert.equal(gap(['red', 'crimson'], 'blue'), false);
});

test('checkAnswer: bo\'sh javob har doim xato', () => {
  assert.equal(gap('library', ''), false);
  assert.equal(gap('library', '   '), false);
  assert.equal(gap('library', null), false);
  assert.equal(gap('library', undefined), false);
});

test('checkAnswer: kalit yo\'q bo\'lsa xato (crash emas)', () => {
  assert.equal(gap(null, 'library'), false);
  assert.equal(gap(undefined, 'library'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// checkAnswer — RIM RAQAM KESISH faqat variant-tanlashda
//
// Bu eng nozik qoida: `isChoiceType` bo'lganda "v. long text" javobidan faqat
// "v" olinadi. Erkin matnda esa bu kesish TO'G'RI javoblarni buzadi.
// ─────────────────────────────────────────────────────────────────────────────

test('checkAnswer: gap-fill javoblarida rim raqam kesilmaydi', () => {
  // "x-ray" → "x" ga qisqarsa, "x ray" kaliti bilan tasodifan mos kelardi,
  // "x-ray machine" esa noto'g'ri "to'g'ri" bo'lardi.
  assert.equal(gap('x-ray machine', 'x-ray machine'), true);
  assert.equal(gap('x-ray machine', 'x'), false);
  assert.equal(gap('i love it', 'i love it'), true);
  assert.equal(gap('i love it', 'i'), false);
});

test('checkAnswer: variant-tanlashda rim raqamli javob yorlig\'i olinadi', () => {
  assert.equal(choice('iv. Ways of protecting the environment', 'iv'), true);
  assert.equal(choice('iv', 'iv. Ways of protecting the environment'), true);
});

test('checkAnswer: erkin matnda bitta harf variant kalitiga MOS KELMAYDI', () => {
  // "C. elegans" — biologik nom, variant emas. Talaba "C" yozsa, bu xato.
  assert.equal(gap('C. elegans', 'C'), false);
  assert.equal(gap('A rare bird', 'A'), false);
  assert.equal(gap('C. elegans', 'C. elegans'), true);
});

test('checkAnswer: variant-tanlashda bitta harf kalitning prefiksiga mos keladi', () => {
  assert.equal(choice('C. The third option', 'C'), true);
  assert.equal(choice('B) Second', 'b'), true);
  assert.equal(choice('C. The third option', 'D'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Rim raqamlar
// ─────────────────────────────────────────────────────────────────────────────

test('isRomanNumeral / romanToInt', () => {
  assert.equal(isRomanNumeral('iv'), true);
  assert.equal(isRomanNumeral('VIII'), true);
  assert.equal(isRomanNumeral('iv.'), true);
  assert.equal(isRomanNumeral('hello'), false);
  assert.equal(isRomanNumeral(''), false);
  assert.equal(romanToInt('iv'), 4);
  assert.equal(romanToInt('ix'), 9);
  assert.equal(romanToInt('xiii'), 13);
  assert.ok(Number.isNaN(romanToInt('hello')));
});

test('getNumeralPrefix: tinish belgili va bo\'shliqli prefikslar', () => {
  assert.equal(getNumeralPrefix('iv. Heading'), 'iv');
  assert.equal(getNumeralPrefix('iv) Heading'), 'iv');
  assert.equal(getNumeralPrefix('iv Heading'), 'iv');
  assert.equal(getNumeralPrefix('3. Something'), '3');
});

test('getNumeralPrefix: oddiy jumla raqamli prefiks DEB O\'QILMAYDI', () => {
  // "I visited the museum" — bosh harfli "I" rim raqami emas, olmosh.
  // Bo'shliq bilan ajratilganda faqat HAQIQIY rim raqami qabul qilinadi.
  assert.equal(getNumeralPrefix('I visited the museum'), null);
  assert.equal(getNumeralPrefix('A big house'), null);
  assert.equal(getNumeralPrefix('The answer'), null);
});

test('stripNumeralPrefix: prefiks bo\'lmasa matn o\'zgarmaydi', () => {
  assert.equal(stripNumeralPrefix('iv. Heading'), 'Heading');
  assert.equal(stripNumeralPrefix('iv Heading'), 'Heading');
  assert.equal(stripNumeralPrefix('I visited the museum'), 'I visited the museum');
});

// ─────────────────────────────────────────────────────────────────────────────
// Variantlar ro'yxati: harf ↔ so'z moslashuvi
// ─────────────────────────────────────────────────────────────────────────────

test('getOptionLabel: yorliq, matndagi prefiks, so\'ng tartib', () => {
  assert.equal(getOptionLabel({ label: 'B', text: 'Cafe' }, 0), 'B');
  assert.equal(getOptionLabel('C. Library', 0), 'C');
  // Yorliq ham, prefiks ham yo'q — tartib bo'yicha.
  assert.equal(getOptionLabel('Library', 2), 'C');
});

test('getOptionText: tinish belgili prefiks ro\'yxatsiz ham kesiladi', () => {
  assert.equal(getOptionText('B. adaptation'), 'adaptation');
  assert.equal(getOptionText('B) adaptation'), 'adaptation');
  assert.equal(getOptionText('iv Heading'), 'Heading');
  assert.equal(getOptionText('adaptation'), 'adaptation');
});

// ─────────────────────────────────────────────────────────────────────────────
// TINISH BELGISIZ HARF YORLIG'I — "B the no-eye-contact condition"
//
// Bazadagi variantlar ko'pincha aynan shunday yozilgan: harf + BO'SHLIQ, nuqtasiz.
// Bitta variantga qarab "A" yorliqmi yoki artiklmi — bilib bo'lmaydi. Shuning
// uchun qaror BUTUN RO'YXATGA qarab qabul qilinadi: harflar A, B, C tartibida
// ketma-ket kelsa, ular yorliq.
// ─────────────────────────────────────────────────────────────────────────────

test('hasSequentialLetterLabels: izchil A/B/C ro\'yxati', () => {
  assert.equal(hasSequentialLetterLabels([
    'A the alone condition', 'B the no-eye-contact condition', 'C the aggressive condition'
  ]), true);
});

test('hasSequentialLetterLabels: izchil BO\'LMAGAN ro\'yxatlar rad etiladi', () => {
  // Aynan shu holatlar uchun qoida qat'iy: kesish variant matnini buzardi.
  assert.equal(hasSequentialLetterLabels(['A big house', 'A small car']), false, 'harflar takrorlangan');
  assert.equal(hasSequentialLetterLabels(['B first', 'C second']), false, 'A dan boshlanmagan');
  assert.equal(hasSequentialLetterLabels(['A big house', 'The red door']), false, 'aralash');
  assert.equal(hasSequentialLetterLabels(['A one', 'C two']), false, 'B tushib qolgan');
  assert.equal(hasSequentialLetterLabels(['A one']), false, 'bitta variant — dalil yetarli emas');
  assert.equal(hasSequentialLetterLabels(['i First', 'ii Second']), false, 'rim raqamli ro\'yxat');
  assert.equal(hasSequentialLetterLabels(null), false);
});

test('hasSequentialLetterLabels: yorliqdan keyin BO\'SHLIQ shart', () => {
  // ⚠️ Eng xavfli holat: bosh harflari tasodifan A, B, C bo'lgan oddiy so'zlar.
  // Bo'shliq talabi olib tashlansa, bu ro'yxat "yorliqli" deb o'qilib,
  // variantlar "ustralia" / "razil" / "anada" ga kesilardi.
  assert.equal(hasSequentialLetterLabels(['Australia', 'Brazil', 'Canada']), false);
  assert.equal(hasSequentialLetterLabels(['Adaptation', 'Bicycle']), false);
});

test('getOptionText: A/B/C bilan boshlanuvchi SO\'ZLAR kesilmaydi', () => {
  const opts = ['Australia', 'Brazil', 'Canada'];
  assert.equal(getOptionText(opts[0], opts), 'Australia');
  assert.equal(resolveOptionDisplay('B', opts), 'Brazil');
});

test('getOptionText: izchil ro\'yxatda bo\'shliqli yorliq kesiladi', () => {
  const opts = ['A the alone condition', 'B the no-eye-contact condition', 'C the aggressive condition'];
  assert.equal(getOptionText(opts[1], opts), 'the no-eye-contact condition');
  // Ro'yxatsiz chaqirilganda xatti-harakat O'ZGARMAYDI (orqaga moslik).
  assert.equal(getOptionText(opts[1]), 'B the no-eye-contact condition');
});

test('getOptionText: izchil bo\'lmagan ro\'yxatda matn TEGILMAYDI', () => {
  const opts = ['A big house', 'A small car'];
  assert.equal(getOptionText(opts[0], opts), 'A big house');
  assert.equal(getOptionText(opts[1], opts), 'A small car');
});

test('resolveOptionDisplay: review harfni variant matniga aylantiradi', () => {
  // Ilgari review'da "B the no-eye-contact condition" — harf matnga yopishgan
  // holda ko'rinardi.
  const opts = ['A the alone condition', 'B the no-eye-contact condition', 'C the aggressive condition'];
  assert.equal(resolveOptionDisplay('B', opts), 'the no-eye-contact condition');
});

test('findOptionIndex: bo\'shliqli yorliqli ro\'yxatda SO\'Z bilan ham topiladi', () => {
  const opts = ['A the alone condition', 'B the no-eye-contact condition'];
  assert.equal(findOptionIndex('the no-eye-contact condition', opts), 1);
  assert.equal(findOptionIndex('B', opts), 1);
  assert.equal(findOptionIndex('B the no-eye-contact condition', opts), 1);
});

test('checkAnswer: bo\'shliqli yorliqli ro\'yxatda kalit HARF, javob SO\'Z', () => {
  const opts = ['A the alone condition', 'B the no-eye-contact condition', 'C the aggressive condition'];
  assert.equal(checkAnswer('B', 'the no-eye-contact condition', false, opts), true);
  assert.equal(checkAnswer('B', 'the alone condition', false, opts), false);
});

test('findOptionIndex: harf yorlig\'i bo\'yicha', () => {
  const opts = ['A. adaptation', 'B. migration', 'C. hibernation'];
  assert.equal(findOptionIndex('B', opts), 1);
  assert.equal(findOptionIndex('b', opts), 1);
  assert.equal(findOptionIndex('migration', opts), 1);
  assert.equal(findOptionIndex('B. migration', opts), 1);
  assert.equal(findOptionIndex('yo\'q', opts), -1);
});

test('findOptionIndex: rim raqami 9+ variantli ro\'yxatda "I" HARFIGA bog\'lanmaydi', () => {
  // 9-variantning tartib yorlig'i "I" bo'ladi. Sarlavhalar ro'yxatida "i"
  // javobi 1-variantni bildiradi — tekshiruv tartibi buzilsa, u 9-variantga
  // ketardi va barcha sarlavha javoblari siljib ketardi.
  const headings = Array.from({ length: 10 }, (_, i) => `Heading number ${i + 1}`);
  assert.equal(findOptionIndex('i', headings), 0);
  assert.equal(findOptionIndex('iv', headings), 3);
});

test('findOptionIndex: variantlarning O\'ZIDA yozilgan rim raqami ustun turadi', () => {
  // Ro'yxat har doim ham raqam tartibida saqlanmaydi.
  const opts = ['iv Fourth heading', 'i First heading', 'ii Second heading'];
  assert.equal(findOptionIndex('i', opts), 1);
  assert.equal(findOptionIndex('iv', opts), 0);
});

test('resolveOptionDisplay: harfni ro\'yxatdagi so\'zga aylantiradi', () => {
  const opts = ['A. adaptation', 'B. migration'];
  assert.equal(resolveOptionDisplay('B', opts), 'migration');
  // Ro'yxatda topilmasa qiymat o'zgarishsiz qaytadi.
  assert.equal(resolveOptionDisplay('Z', opts), 'Z');
  assert.equal(resolveOptionDisplay('', opts), '');
});

test('checkAnswer: kalit HARF, javob SO\'Z — variantlar orqali bog\'lanadi', () => {
  // "Choose from the list" turlarida kalit "B", talaba esa so'z tanlaydi.
  const opts = ['A. adaptation', 'B. migration', 'C. hibernation'];
  assert.equal(checkAnswer('B', 'migration', false, opts), true);
  assert.equal(checkAnswer('migration', 'B', false, opts), true);
  assert.equal(checkAnswer('B', 'adaptation', false, opts), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreMultiAnswer ("Choose TWO letters")
// ─────────────────────────────────────────────────────────────────────────────

test('scoreMultiAnswer: harfli javoblar', () => {
  assert.deepEqual(scoreMultiAnswer('D,E', 'D,E', 2), { matches: 2, weight: 2 });
  assert.deepEqual(scoreMultiAnswer('D,E', 'E,D', 2), { matches: 2, weight: 2 });
  assert.deepEqual(scoreMultiAnswer('D,E', 'D,A', 2), { matches: 1, weight: 2 });
  assert.deepEqual(scoreMultiAnswer('D,E', '', 2), { matches: 0, weight: 2 });
});

test('scoreMultiAnswer: MATNLI javoblar so\'zlarga bo\'linib ketmaydi', () => {
  // Ilgari "a big house, small car" so'zlarga bo'linib ketardi ("a", "big",
  // "house", ...) — natijada talabaning YARIM javobi ham to'g'ri sanalardi.
  // Bo'lish qoidasi BARCHA bo'laklar harf bo'lgandagina qo'llanishi shart.
  const correct = 'a big house, small car';

  // To'liq javob — 2 ball.
  assert.deepEqual(scoreMultiAnswer(correct, correct, 2), { matches: 2, weight: 2 });

  // Bittasi to'g'ri — 1 ball.
  assert.deepEqual(scoreMultiAnswer(correct, 'a big house', 2), { matches: 1, weight: 2 });

  // ⚠️ DISKRIMINATSIYA QILUVCHI HOLAT: alohida so'zlar javob EMAS.
  // So'zlarga bo'lish qaytsa, bular noto'g'ri ravishda 2 ball olardi.
  assert.deepEqual(scoreMultiAnswer(correct, 'big, small', 2), { matches: 0, weight: 2 });
  assert.deepEqual(scoreMultiAnswer(correct, 'a, small', 2), { matches: 0, weight: 2 });
});

test('scoreMultiAnswer: prefiks faqat TINISH BELGISI bilan kesiladi', () => {
  // "A. Museum" → "a", lekin "a big house" → "a big house" (bo'shliq kesmaydi).
  assert.deepEqual(scoreMultiAnswer('A. Museum, B. Library', 'A. Museum, B. Library', 2), { matches: 2, weight: 2 });
  assert.deepEqual(scoreMultiAnswer('A. Museum, B. Library', 'a, b', 2), { matches: 2, weight: 2 });
});

test('scoreMultiAnswer: takroriy javob ikki marta sanalmaydi', () => {
  assert.deepEqual(scoreMultiAnswer('D,E', 'D,D', 2), { matches: 1, weight: 2 });
});

test('scoreMultiAnswer: mos kelganlar og\'irlikdan oshmaydi', () => {
  const r = scoreMultiAnswer('A,B,C', 'A,B,C', 2);
  assert.equal(r.matches, 2);
  assert.equal(r.weight, 2);
});

test('scoreMultiAnswer: massiv ko\'rinishidagi javob', () => {
  assert.deepEqual(scoreMultiAnswer(['D', 'E'], ['E', 'D'], 2), { matches: 2, weight: 2 });
});

test('scoreMultiAnswer: kalit yo\'q bo\'lsa crash bermaydi', () => {
  assert.deepEqual(scoreMultiAnswer(null, 'D,E', 2), { matches: 0, weight: 2 });
});
