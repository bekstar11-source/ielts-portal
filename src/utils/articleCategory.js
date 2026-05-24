/** Kategoriyani DB uchun normalizatsiya (# va ortiqcha bo'shliqlarsiz) */
export function normalizeArticleCategory(value) {
    if (value == null || value === '') return '';
    return String(value).replace(/^#+\s*/, '').trim();
}

/** UI uchun # bilan ko'rsatish */
export function formatArticleCategoryHashtag(value) {
    const normalized = normalizeArticleCategory(value);
    return normalized ? `#${normalized}` : '';
}

/** Maqolalar ro'yxatidan noyob kategoriyalar */
export function extractArticleCategories(articles = []) {
    const set = new Set();
    articles.forEach((a) => {
        const cat = normalizeArticleCategory(a?.category);
        if (cat) set.add(cat);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
}

export function categoryMatchesSearch(category, searchTerm) {
    const q = normalizeArticleCategory(searchTerm).toLowerCase();
    if (!q) return true;
    return normalizeArticleCategory(category).toLowerCase().includes(q);
}
