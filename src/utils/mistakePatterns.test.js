// src/utils/mistakePatterns.test.js
//
//   npm run test:utils
//
// Tasnif noto'g'ri ishlasa hech qanday xatolik chiqmaydi — o'quvchi shunchaki
// noto'g'ri maslahat oladi ("imlongizni mashq qiling", holbuki muammo matnni
// tushunishda). Shu sabab har bir naqsh uchun kamida bitta aniq holat bor.

import test from 'node:test';
import assert from 'node:assert';

import { classifyMistake, MISTAKE_PATTERNS, NEAR_MISS_PATTERNS } from './mistakePatterns.js';

const classify = (userResponse, correctAnswer, questionType) =>
  classifyMistake({ userResponse, correctAnswer, questionType }).pattern;

test('shakl xatolari bir-biridan ajratiladi', () => {
  assert.strictEqual(classify('goverment', 'government', 'completion'), 'spelling');
  assert.strictEqual(classify('childs', 'children', 'completion'), 'singular_plural');
  assert.strictEqual(classify('the local museum', 'museum', 'completion'), 'extra_words');
  assert.strictEqual(classify('', 'museum', 'completion'), 'no_answer');
  assert.strictEqual(classify('bicycle', 'museum', 'completion'), 'off_target');
});

test('NOT GIVEN tuzog\'i: yo\'q ma\'lumotni "bor" deb hisoblash', () => {
  // Eng ko'p uchraydigan IELTS xatosi — ilgari umumiy "wrong_option" ichida yo'qolardi.
  assert.strictEqual(classify('TRUE', 'NOT GIVEN', 'true_false_ng'), 'ng_overclaim');
  assert.strictEqual(classify('FALSE', 'NOT GIVEN', 'true_false_ng'), 'ng_overclaim');
  assert.strictEqual(classify('YES', 'NOT GIVEN', 'yes_no_ng'), 'ng_overclaim');
  assert.strictEqual(classify('NO', 'NOT GIVEN', 'yes_no_ng'), 'ng_overclaim');
});

test('NOT GIVEN tuzog\'i: matndagi ma\'lumotni topa olmaslik', () => {
  assert.strictEqual(classify('NOT GIVEN', 'TRUE', 'true_false_ng'), 'ng_missed');
  assert.strictEqual(classify('NOT GIVEN', 'FALSE', 'true_false_ng'), 'ng_missed');
  assert.strictEqual(classify('NOT GIVEN', 'YES', 'yes_no_ng'), 'ng_missed');
});

test('TRUE ↔ FALSE almashuvi alohida naqsh', () => {
  assert.strictEqual(classify('TRUE', 'FALSE', 'true_false_ng'), 'tf_flip');
  assert.strictEqual(classify('FALSE', 'TRUE', 'true_false_ng'), 'tf_flip');
  assert.strictEqual(classify('NO', 'YES', 'yes_no_ng'), 'tf_flip');
});

test('eski qisqartmalar ham taniladi', () => {
  assert.strictEqual(classify('T', 'NG', 'true_false_ng'), 'ng_overclaim');
  assert.strictEqual(classify('NG', 'T', 'true_false_ng'), 'ng_missed');
  assert.strictEqual(classify('F', 'T', 'true_false_ng'), 'tf_flip');
  assert.strictEqual(classify('NOTGIVEN', 'FALSE', 'true_false_ng'), 'ng_missed');
});

test('tanib bo\'lmagan T/F/NG javobi umumiy yo\'lga tushadi', () => {
  // Buzuq kalit yoki erkin matn — "noto'g'ri variant" hech bo'lmasa yolg'on emas.
  assert.strictEqual(classify('probably', 'NOT GIVEN', 'true_false_ng'), 'wrong_option');
  assert.strictEqual(classify('TRUE', 'maybe', 'true_false_ng'), 'wrong_option');
});

test('boshqa variant tanlash oilalari o\'zgarmadi', () => {
  assert.strictEqual(classify('iv', 'vii', 'headings'), 'wrong_option');
  assert.strictEqual(classify('B', 'C', 'multiple_choice'), 'wrong_option');
  assert.strictEqual(classify('A', 'D', 'matching'), 'wrong_option');
});

test('javob kalitga aynan teng bo\'lsa sabab aniqlanmaydi', () => {
  // Ko'p javobli savolning boshqa slotidagi nomuvofiqlik — ko'rsatilsa chalg'itadi.
  assert.strictEqual(classify('museum', 'museum/gallery', 'completion'), null);
});

test('yangi naqshlar "yaqin marra" emas', () => {
  // Ular mazmuniy xatolar: imlo mashqi bilan tuzalmaydi va ball ta'siri
  // hisobiga kirmasligi kerak.
  ['ng_overclaim', 'ng_missed', 'tf_flip'].forEach((pattern) => {
    assert.ok(MISTAKE_PATTERNS.includes(pattern), `${pattern} ro'yxatda bo'lishi kerak`);
    assert.ok(!NEAR_MISS_PATTERNS.includes(pattern), `${pattern} yaqin marra bo'lmasligi kerak`);
  });
});
