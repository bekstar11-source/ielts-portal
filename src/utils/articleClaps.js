import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';

const STORAGE_KEY = 'ielts_clapped_articles';

export function getLocalClappedArticleIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function getUserClappedArticleIds(user, userData) {
    if (user && Array.isArray(userData?.clappedArticles)) {
        return userData.clappedArticles;
    }
    return getLocalClappedArticleIds();
}

export function hasClappedArticle(articleId, user, userData) {
    if (!articleId) return false;
    return getUserClappedArticleIds(user, userData).includes(articleId);
}

export async function addArticleClap({ db, articleId, user, userData, updateUserLocalData }) {
    if (hasClappedArticle(articleId, user, userData)) {
        return { success: false, alreadyClapped: true };
    }

    await updateDoc(doc(db, 'articles', articleId), { claps: increment(1) });

    if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
            clappedArticles: arrayUnion(articleId),
        });
        if (updateUserLocalData) {
            updateUserLocalData({
                clappedArticles: [...new Set([...(userData?.clappedArticles || []), articleId])],
            });
        }
    } else {
        const ids = getLocalClappedArticleIds();
        if (!ids.includes(articleId)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, articleId]));
        }
    }

    return { success: true };
}

export async function removeArticleClap({ db, articleId, user, userData, updateUserLocalData }) {
    if (!hasClappedArticle(articleId, user, userData)) {
        return { success: false, notClapped: true };
    }

    await updateDoc(doc(db, 'articles', articleId), { claps: increment(-1) });

    if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
            clappedArticles: arrayRemove(articleId),
        });
        if (updateUserLocalData) {
            updateUserLocalData({
                clappedArticles: (userData?.clappedArticles || []).filter((id) => id !== articleId),
            });
        }
    } else {
        const ids = getLocalClappedArticleIds().filter((id) => id !== articleId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }

    return { success: true };
}
