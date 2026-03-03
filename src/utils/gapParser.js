// src/utils/gapParser.js
// "{{gap}}" belgilarini React <input> elementlariga aylantiruvchi utility

/**
 * "Hello {{world}} this is a {{test}}" kabi matnni parse qilib,
 * [{type: 'text', content: 'Hello '}, {type: 'gap', index: 0}, ...] qaytaradi.
 */
export function parseGapText(text) {
    const parts = [];
    const regex = /\{\{gap\}\}/gi;
    let lastIndex = 0;
    let gapIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
        }
        parts.push({ type: "gap", index: gapIndex++ });
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts;
}

/**
 * Matndan nechta {{gap}} borligini sanaydi.
 */
export function countGaps(text) {
    return (text.match(/\{\{gap\}\}/gi) || []).length;
}

/**
 * O'quvchi javobini to'g'ri javob bilan case-insensitive va punctuation-insensitive taqqoslaydi.
 */
export function checkGapAnswer(userAnswer, correctAnswer) {
    const normalize = (str) =>
        str
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:'"()\-]/g, "");
    return normalize(userAnswer) === normalize(correctAnswer);
}
