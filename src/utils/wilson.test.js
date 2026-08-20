// src/utils/wilson.test.js
//
//   npm run test:utils
//
// Bu funksiya sahifaning eng muhim qarorini boshqaradi: "eng kuchsiz turingiz
// shu". Chegaralar almashib qolsa hech qanday xatolik chiqmaydi — sahifa
// shunchaki noto'g'ri turni ko'rsatadi va o'quvchi haftalab keraksiz mashq
// qiladi. Shu sabab yo'nalish alohida tekshiriladi.

import test from 'node:test';
import assert from 'node:assert';

import { wilsonInterval } from './wilson.js';

test('oraliq foizni o\'z ichiga oladi', () => {
  [[2, 5], [4, 10], [20, 50], [35, 50], [1, 3]].forEach(([correct, total]) => {
    const w = wilsonInterval(correct, total);
    assert.ok(w.low <= w.center, `${correct}/${total}: quyi chegara foizdan katta`);
    assert.ok(w.center <= w.high, `${correct}/${total}: yuqori chegara foizdan kichik`);
  });
});

test('namuna o\'sgani sari oraliq torayadi', () => {
  // Bir xil 40%, uch xil namuna hajmi.
  const small = wilsonInterval(2, 5);
  const medium = wilsonInterval(8, 20);
  const large = wilsonInterval(20, 50);

  assert.strictEqual(small.center, 40);
  assert.strictEqual(medium.center, 40);
  assert.strictEqual(large.center, 40);

  assert.ok(small.margin > medium.margin, 'kichik namuna kengroq oraliq beradi');
  assert.ok(medium.margin > large.margin);
});

test('shovqinli namuna "kuchsiz" deb belgilanmaydi', () => {
  // 5 tadan 2 tasi — ilgari "40%, eng kuchsiz turingiz" deb ko'rsatilardi.
  // Yuqori chegarasi 70% dan yuqori, ya'ni bu tur haqiqatan kuchsizligi noma'lum.
  const noisy = wilsonInterval(2, 5);
  assert.ok(noisy.high >= 70, `2/5 uchun yuqori chegara ${noisy.high}% — 70 dan past bo'lmasligi kerak`);

  // 10 tadan 4 tasi esa allaqachon haqiqiy signal.
  const real = wilsonInterval(4, 10);
  assert.ok(real.high < 70, `4/10 uchun yuqori chegara ${real.high}% — 70 dan past bo'lishi kerak`);
});

test('bir xil foizda kattaroq namuna "aniqroq muammo" bo\'lib saralanadi', () => {
  // Saralash `wilson.high` bo'yicha o'sish tartibida — ya'ni kichikroq yuqori
  // chegara birinchi keladi.
  const large = wilsonInterval(20, 50);
  const small = wilsonInterval(4, 10);

  assert.ok(large.high < small.high, '50 tadan 20 tasi 10 tadan 4 tasidan ishonchliroq muammo');
});

test('chekka holatlar buzilmaydi', () => {
  // 0% va 100% da normal yaqinlashuv "± 0" deb bema'nilik chiqarardi.
  const none = wilsonInterval(0, 8);
  assert.strictEqual(none.center, 0);
  assert.strictEqual(none.low, 0);
  assert.ok(none.high > 0, '0/8 dan keyin ham noaniqlik qoladi');

  const all = wilsonInterval(8, 8);
  assert.strictEqual(all.center, 100);
  assert.strictEqual(all.high, 100);
  assert.ok(all.low < 100, '8/8 hali "har doim to\'g\'ri" degani emas');
});

test('yaroqsiz kirish xatolik bermaydi', () => {
  const empty = wilsonInterval(0, 0);
  assert.strictEqual(empty.low, 0);
  assert.strictEqual(empty.high, 100, 'ma\'lumotsiz holatda hech nima ma\'lum emas');

  // To'g'ri javob umumiy sondan ko'p bo'lib qolgan buzuq yozuv.
  const clamped = wilsonInterval(99, 10);
  assert.strictEqual(clamped.center, 100);
  assert.ok(clamped.high <= 100);
});
