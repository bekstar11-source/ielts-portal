// src/utils/wordbankUtils.js
import { db } from "../firebase/firebase";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";

/**
 * Bitta so'z juftligini WordBank'ga qo'shish
 */
export async function addWordToBank(userId, wordData) {
    const ref = collection(db, "users", userId, "wordbank");
    const docRef = await addDoc(ref, {
        passageWord: wordData.passageWord,
        questionWord: wordData.questionWord,
        type: wordData.type || "synonym", // "synonym" | "antonym"
        testId: wordData.testId || "",
        testName: wordData.testName || "",
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

/**
 * Foydalanuvchining barcha WordBank so'zlarini olish
 */
export async function getUserWordBank(userId) {
    const ref = collection(db, "users", userId, "wordbank");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * WordBank'dan bitta so'zni o'chirish
 */
export async function deleteWordFromBank(userId, wordId) {
    const ref = doc(db, "users", userId, "wordbank", wordId);
    await deleteDoc(ref);
}

/**
 * Bir nechta so'zni bir vaqtda batch yozish (Review tugagach)
 */
export async function batchAddWordsToBank(userId, wordsArray) {
    if (!wordsArray || wordsArray.length === 0) return;
    const batch = writeBatch(db);

    wordsArray.forEach((wordData) => {
        const ref = doc(collection(db, "users", userId, "wordbank"));
        batch.set(ref, {
            passageWord: wordData.passageWord,
            questionWord: wordData.questionWord,
            type: wordData.type || "synonym",
            testId: wordData.testId || "",
            testName: wordData.testName || "",
            createdAt: serverTimestamp(),
        });
    });

    await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNONYM / ANTONYM PAIRS  (users/{uid}/synonymPairs/{testId}/pairs/{pairId})
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Barcha juftlarni Firestore ga saqlash.
 * Har bir juft uchun doc ID = pair.id (lokal state dagi)
 * Bu funksiya har gal Canvas "Saqlash" bosilganda chaqiriladi.
 */
export async function saveSynonymPairs(userId, testId, pairs) {
    if (!userId || !testId || !pairs || pairs.length === 0) return;
    const batch = writeBatch(db);

    pairs.forEach((pair) => {
        const ref = doc(db, "users", userId, "synonymPairs", testId, "pairs", pair.id);
        batch.set(ref, {
            passageWord: pair.passageWord || "",
            questionWord: pair.questionWord || "",
            type: pair.type || "synonym",
            testId,
            createdAt: serverTimestamp(),
        }, { merge: true });
    });

    await batch.commit();
}


/**
 * Bitta test uchun barcha juftlarni yuklash.
 */
export async function getSynonymPairs(userId, testId) {
    if (!userId || !testId) return [];
    const ref = collection(db, "users", userId, "synonymPairs", testId, "pairs");
    const snapshot = await getDocs(query(ref, orderBy("createdAt", "asc")));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Bir nechta testId uchun juftlar sonini parallel olish.
 * Qaytadi: { [testId]: count }
 */
export async function getSynonymPairCounts(userId, testIds) {
    if (!userId || !testIds || testIds.length === 0) return {};
    const counts = {};
    await Promise.all(
        testIds.map(async (testId) => {
            try {
                const ref = collection(db, "users", userId, "synonymPairs", testId, "pairs");
                const snapshot = await getDocs(ref);
                counts[testId] = snapshot.size;
            } catch {
                counts[testId] = 0;
            }
        })
    );
    return counts;
}

/**
 * Bitta juftni o'chirish.
 */
export async function deleteSynonymPair(userId, testId, pairId) {
    const ref = doc(db, "users", userId, "synonymPairs", testId, "pairs", pairId);
    await deleteDoc(ref);
}
