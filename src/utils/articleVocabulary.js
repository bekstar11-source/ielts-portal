export const VOCABULARY_JSON_SAMPLE = `[
  {
    "word": "sustainable",
    "translation": "barqaror, uzoq muddatli",
    "definition": "Able to continue or be continued for a long time without harming the environment.",
    "example": "Governments are investing in sustainable energy sources.",
    "partOfSpeech": "adjective"
  },
  {
    "word": "breakthrough",
    "translation": "yutuq, muhim kashfiyot",
    "definition": "An important discovery or development that helps solve a problem.",
    "example": "Scientists announced a breakthrough in battery technology.",
    "partOfSpeech": "noun"
  }
]`;

/**
 * Lug'at JSON matnini tekshirib, tozalangan massivga aylantiradi.
 * Xato bo'lsa tushunarli xabar bilan Error tashlaydi.
 */
export function parseVocabularyJson(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return [];

    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    } catch {
        throw new Error("JSON noto'g'ri formatda. Qavslarni va vergullarni tekshiring.");
    }
    if (!Array.isArray(parsed)) {
        throw new Error('JSON massiv bo\'lishi kerak: [ { "word": "..." }, ... ]');
    }

    return parsed.map((item, i) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`${i + 1}-element obyekt bo'lishi kerak`);
        }
        if (!item.word?.trim()) {
            throw new Error(`${i + 1}-so'zda majburiy "word" maydoni yo'q`);
        }
        return {
            word: item.word.trim(),
            translation: item.translation?.trim() || '',
            definition: item.definition?.trim() || '',
            example: item.example?.trim() || '',
            partOfSpeech: item.partOfSpeech?.trim() || '',
        };
    });
}

/** Textarea uchun xavfsiz tekshiruv: { words, error } qaytaradi, hech qachon tashlamaydi. */
export function inspectVocabularyJson(raw) {
    try {
        return { words: parseVocabularyJson(raw), error: '' };
    } catch (err) {
        return { words: [], error: err.message };
    }
}
