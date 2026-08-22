// functions/generatePlacementQuestions.test.js
//
// AI qaytargan savolni tekshirish mantig'i.
//
// NEGA MUHIM: buzuq savol xato bermaydi — u shunchaki testga tushadi va
// o'quvchini noto'g'ri darajaga yuboradi. Masalan ikkita bir xil variant
// bo'lsa, javob "noto'g'ri" hisoblanadi va odam o'zi bilgan darajadan
// pastroq natija oladi.

const test = require("node:test");
const assert = require("node:assert");

const { validateQuestion, LEVEL_GUIDE } = require("./generatePlacementQuestions");
const { CEFR_ORDER } = require("./cefr");

const good = () => ({
  prompt: "She ___ to school every day.",
  options: ["go", "goes", "going", "gone"],
  answerIndex: 1,
  explanation: "Uchinchi shaxs birlikda -s qo'shiladi.",
});

test("to'g'ri savol o'tadi", () => {
  assert.strictEqual(validateQuestion(good(), "A1", "grammar"), null);
});

test("takrorlangan variant rad etiladi", () => {
  // Ikkita bir xil variant bo'lsa, qaysi biri "to'g'ri" ekani noaniq.
  const q = good();
  q.options = ["goes", "goes", "going", "gone"];
  assert.match(validateQuestion(q, "A1", "grammar"), /takrorlangan/);
});

test("registr farqi ham takror hisoblanadi", () => {
  const q = good();
  q.options = ["Goes", "goes", "going", "gone"];
  assert.match(validateQuestion(q, "A1", "grammar"), /takrorlangan/);
});

test("variantlar soni 4 dan farq qilsa rad etiladi", () => {
  const q = good();
  q.options = ["go", "goes", "going"];
  assert.match(validateQuestion(q, "A1", "grammar"), /variantlar soni/);
});

test("answerIndex chegaradan chiqsa rad etiladi", () => {
  for (const bad of [-1, 4, 1.5, "1", null, undefined]) {
    const q = good();
    q.answerIndex = bad;
    assert.match(validateQuestion(q, "A1", "grammar"), /answerIndex/, `qiymat: ${bad}`);
  }
});

test("bo'sh yoki juda qisqa prompt rad etiladi", () => {
  const q = good();
  q.prompt = "___";
  assert.match(validateQuestion(q, "A1", "grammar"), /prompt/);
  q.prompt = "";
  assert.match(validateQuestion(q, "A1", "grammar"), /prompt/);
});

test("bo'sh variant rad etiladi", () => {
  const q = good();
  q.options = ["go", "  ", "going", "gone"];
  assert.match(validateQuestion(q, "A1", "grammar"), /bo'sh variant/);
});

test("noto'g'ri daraja va skill rad etiladi", () => {
  assert.match(validateQuestion(good(), "Z9", "grammar"), /daraja/);
  assert.match(validateQuestion(good(), "A1", "speaking"), /skill/);
});

test("obyekt bo'lmagan kirish yiqilmaydi", () => {
  for (const bad of [null, undefined, "savol", 42]) {
    assert.strictEqual(typeof validateQuestion(bad, "A1", "grammar"), "string");
  }
});

test("har bir CEFR darajasi uchun yo'riqnoma bor", () => {
  // Yo'riqnomasiz AI hamma daraja uchun bir xil qiyinlikda yozadi va
  // pillapoyali ballash ma'nosini yo'qotadi.
  for (const lv of ["A1", "A2", "B1", "B2", "C1"]) {
    assert.ok(LEVEL_GUIDE[lv] && LEVEL_GUIDE[lv].length > 20, `${lv} uchun yo'riqnoma yo'q`);
  }
  assert.ok(CEFR_ORDER.includes("C1"));
});
