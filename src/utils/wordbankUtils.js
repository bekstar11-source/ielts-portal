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
