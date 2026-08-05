// functions/speakingHistory.js
// O'quvchining oldingi speaking urinishlaridan qisqa kontekst yig'adi.
//
// NEGA KERAK?
// Feedback matnini "AI yozgan" qilib ko'rsatadigan narsa so'z tanlash emas —
// XOTIRASIZLIK. Har safar noldan boshlanadigan, o'quvchini birinchi marta
// ko'rayotgan matn qanchalik silliq yozilmasin, ustozga o'xshamaydi. Ustoz
// esa "o'tgan safar ham shu yerda adashgandingiz" deydi, va aynan shu bitta
// jumla butun feedbackni jonlantiradi.
//
// Ombor sifatida `users/{uid}/mistakeSessions` ishlatiladi — speaking xatolari
// allaqachon o'sha yerga tushadi (evaluateSpeaking.js:saveSpeakingMistakes),
// shuning uchun yangi yozuv sxemasi kerak emas. Indeks ham bor:
// firestore.indexes.json -> mistakeSessions (skill ASC, date DESC).

/** Nechta oxirgi sessiya ko'riladi. Uchtadan ortig'i "o'tgan safar" bo'lmay qoladi. */
const HISTORY_SESSIONS = 3;

/** Promptga tushadigan xatolar soni. Ro'yxat uzaysa model sanab chiqishga o'tadi. */
const MAX_MISTAKES = 4;

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @returns {Promise<null | {
 *   sessions: number,
 *   lastOverall: number|null,
 *   mistakes: Array<{ said: string, better: string, sessions: number }>
 * }>}
 */
async function fetchSpeakingHistory(db, uid) {
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("mistakeSessions")
        .where("skill", "==", "speaking")
        .orderBy("date", "desc")
        .limit(HISTORY_SESSIONS)
        .get();

    if (snap.empty) return null;

    // Kalit — tuzatilgan variant. Bir xil xato necha SESSIYADA uchraganini
    // sanaymiz: bitta javob ichidagi takror hisobga olinmaydi, aks holda
    // uzun javob "surunkali xato" bo'lib ko'rinib qolardi.
    const counts = new Map();
    let lastOverall = null;

    snap.docs.forEach((doc, index) => {
        const data = doc.data() || {};

        if (index === 0) {
            const overall = Number(data.bands?.overall);
            if (Number.isFinite(overall) && overall > 0) lastOverall = overall;
        }

        const seenHere = new Set();
        for (const item of Array.isArray(data.mistakes) ? data.mistakes : []) {
            const said = String(item?.userAnswer || "").trim();
            const better = String(item?.correctAnswer || "").trim();
            if (!said || !better) continue;

            const key = better.toLowerCase();
            if (seenHere.has(key)) continue;
            seenHere.add(key);

            const entry = counts.get(key) || { said, better, sessions: 0 };
            entry.sessions += 1;
            counts.set(key, entry);
        }
    });

    // Takrorlanganlari oldinga: aytishga arziydigani aynan o'sha.
    const mistakes = [...counts.values()]
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, MAX_MISTAKES);

    if (mistakes.length === 0 && lastOverall === null) return null;

    return { sessions: snap.size, lastOverall, mistakes };
}

module.exports = { fetchSpeakingHistory, HISTORY_SESSIONS, MAX_MISTAKES };
