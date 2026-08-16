// src/utils/wordbankUtils.js
import { db } from "../firebase/firebase";
import {
    collection,
    addDoc,
    getDocs,
    getCountFromServer,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch,
    Timestamp,
} from "firebase/firestore";

function toFirestoreTimestamp(val, fallbackMillis = Date.now()) {
    if (!val) return Timestamp.fromMillis(fallbackMillis);
    if (val instanceof Timestamp) return val;
    if (typeof val.toMillis === "function") return Timestamp.fromMillis(val.toMillis());
    if (typeof val.seconds === "number") {
        return new Timestamp(val.seconds, val.nanoseconds || 0);
    }
    if (typeof val === "number") return Timestamp.fromMillis(val);
    if (val instanceof Date) return Timestamp.fromDate(val);
    return Timestamp.fromMillis(fallbackMillis);
}

function getMillis(val) {
    if (!val) return 0;
    if (typeof val === "number") return val;
    if (typeof val.toMillis === "function") return val.toMillis();
    if (typeof val.seconds === "number") return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
    if (val instanceof Date) return val.getTime();
    return 0;
}

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
        createdAt: toFirestoreTimestamp(wordData.createdAt),
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

    const baseTime = Date.now();
    wordsArray.forEach((wordData, index) => {
        const ref = wordData.id ? doc(db, "users", userId, "wordbank", wordData.id) : doc(collection(db, "users", userId, "wordbank"));
        const createdAt = toFirestoreTimestamp(wordData.createdAt, baseTime - index * 10);
        batch.set(ref, {
            passageWord: wordData.passageWord,
            questionWord: wordData.questionWord,
            type: wordData.type || "synonym",
            testId: wordData.testId || "",
            testName: wordData.testName || "",
            createdAt,
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

    const baseTime = Date.now();
    pairs.forEach((pair, index) => {
        const ref = doc(db, "users", userId, "synonymPairs", testId, "pairs", pair.id);
        const createdAt = toFirestoreTimestamp(pair.createdAt, baseTime - index * 10);
        batch.set(ref, {
            passageWord: pair.passageWord || "",
            questionWord: pair.questionWord || "",
            type: pair.type || "synonym",
            testId,
            createdAt,
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
    const snapshot = await getDocs(query(ref, orderBy("createdAt", "desc")));
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
        const diff = getMillis(b.createdAt) - getMillis(a.createdAt);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
    });
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
                const countSnap = await getCountFromServer(query(ref));
                counts[testId] = countSnap.data().count;
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
    const wordbankRef = doc(db, "users", userId, "wordbank", pairId);
    // Xatoni yutmaymiz — chaqiruvchi UI dan qatorni o'chirishdan oldin bilishi kerak
    await Promise.all([
        deleteDoc(ref),
        deleteDoc(wordbankRef)
    ]);
}
