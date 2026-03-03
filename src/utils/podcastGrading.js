// src/utils/podcastGrading.js
// Barcha bosqichlardagi foizlarni IELTS baliga (1.0–9.0) aylantiruvchi algoritm

/**
 * Foizni IELTS band skoriga aylantiradi.
 * @param {number} pct - 0..100 oraliqda foiz
 * @returns {number} IELTS bandi (0.5 qadam)
 */
export function percentToIELTS(pct) {
    if (pct >= 97) return 9.0;
    if (pct >= 93) return 8.5;
    if (pct >= 87) return 8.0;
    if (pct >= 81) return 7.5;
    if (pct >= 75) return 7.0;
    if (pct >= 69) return 6.5;
    if (pct >= 60) return 6.0;
    if (pct >= 54) return 5.5;
    if (pct >= 47) return 5.0;
    if (pct >= 40) return 4.5;
    if (pct >= 33) return 4.0;
    if (pct >= 27) return 3.5;
    if (pct >= 20) return 3.0;
    if (pct >= 16) return 2.5;
    return 1.0;
}

/**
 * 4 ta IELTS bandini o'rtachalab yakuniy ballni hisoblaydi.
 * 0.5 ga yaxlitlanadi (IELTS standarti).
 */
export function calcOverallBand(bands) {
    const { listening, accuracy, vocabulary, speaking } = bands;
    const sum = listening + accuracy + vocabulary + speaking;
    const avg = sum / 4;
    return Math.round(avg * 2) / 2;
}

/**
 * Dictation stage uchun: nechta so'z to'g'ri yozilganini hisoblaydi.
 * @param {Array} segmentResults - [{userText, correctText}]
 * @returns {number} foiz (0-100)
 */
export function calcDictationAccuracy(segmentResults) {
    let totalWords = 0;
    let correctWords = 0;

    for (const seg of segmentResults) {
        const correct = tokenize(seg.correctText);
        const user = tokenize(seg.userText);
        totalWords += correct.length;

        for (let i = 0; i < correct.length; i++) {
            if (user[i] && normalizeWord(user[i]) === normalizeWord(correct[i])) {
                correctWords++;
            }
        }
    }

    if (totalWords === 0) return 0;
    return Math.round((correctWords / totalWords) * 100);
}

/**
 * MCQ va Gap-fill uchun: to'g'ri javoblar sonini foizga aylantiradi.
 */
export function calcSimpleScore(correct, total) {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
}

/**
 * MCQ + GapFill o'rtacha → Listening Comprehension IELTS bali.
 */
export function calcListeningBand(mcqPct, gapFillPct) {
    const avg = (mcqPct + gapFillPct) / 2;
    return percentToIELTS(avg);
}

// --- Helpers ---
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[.,!?;:'"()\-]/g, "")
        .split(/\s+/)
        .filter(Boolean);
}

function normalizeWord(word) {
    return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}
