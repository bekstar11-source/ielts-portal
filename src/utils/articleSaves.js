import { doc, updateDoc, arrayUnion, arrayRemove, documentId, collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Maqolani "saqlash" (bookmark) — `users/{uid}.savedArticles` massivida saqlanadi.
 * Faqat tizimga kirgan foydalanuvchilar uchun (lokal fallback yo'q — bu ro'yxat
 * qurilmalar orasida sinxron bo'lishi kerak).
 */

export function getSavedArticleIds(userData) {
    return Array.isArray(userData?.savedArticles) ? userData.savedArticles : [];
}

export function isArticleSaved(articleId, userData) {
    if (!articleId) return false;
    return getSavedArticleIds(userData).includes(articleId);
}

export async function toggleArticleSave({ db, articleId, user, userData, updateUserLocalData, save }) {
    if (!user) return { success: false, needsAuth: true };

    const next = typeof save === 'boolean' ? save : !isArticleSaved(articleId, userData);

    await updateDoc(doc(db, 'users', user.uid), {
        savedArticles: next ? arrayUnion(articleId) : arrayRemove(articleId),
    });

    const current = getSavedArticleIds(userData);
    updateUserLocalData?.({
        savedArticles: next
            ? [...new Set([...current, articleId])]
            : current.filter((x) => x !== articleId),
    });

    return { success: true, saved: next };
}

/**
 * Saqlangan maqolalarni ID bo'yicha yuklaydi.
 * Firestore `in` operatori bir so'rovda 30 tagacha qiymatni qabul qiladi,
 * shuning uchun ID'lar bo'laklarga bo'linadi. O'chirilgan maqolalar shunchaki
 * natijaga tushmaydi.
 */
export async function fetchSavedArticles(db, ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (unique.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < unique.length; i += 30) {
        chunks.push(unique.slice(i, i + 30));
    }

    const snaps = await Promise.all(
        chunks.map((chunk) =>
            getDocs(query(collection(db, 'articles'), where(documentId(), 'in', chunk)))
        )
    );

    const byId = new Map();
    snaps.forEach((snap) => {
        snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
    });

    // Foydalanuvchi saqlagan tartibda (eng oxirgi saqlangani birinchi)
    return unique
        .slice()
        .reverse()
        .map((id) => byId.get(id))
        .filter(Boolean);
}
