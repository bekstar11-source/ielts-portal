/** claps may be number or legacy string like "4.8K" */
export function parseArticleClaps(claps) {
    if (typeof claps === 'number' && !Number.isNaN(claps)) return claps;
    if (claps == null || claps === '') return 0;
    const s = String(claps).trim().toUpperCase();
    if (s.endsWith('K')) {
        const n = parseFloat(s.replace(/K$/, ''));
        return Number.isNaN(n) ? 0 : Math.round(n * 1000);
    }
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? 0 : n;
}

export function getArticleCommentCount(article) {
    return Array.isArray(article?.comments) ? article.comments.length : 0;
}

/** Claps + discussion (comments weighted higher) */
export function getArticlePopularityScore(article) {
    const claps = parseArticleClaps(article?.claps);
    const comments = getArticleCommentCount(article);
    const featuredBoost = article?.isFeatured ? 50 : 0;
    return claps + comments * 8 + featuredBoost;
}

export function getPopularArticles(articles = [], limit = 5) {
    const ranked = [...articles]
        .map((article) => ({
            article,
            score: getArticlePopularityScore(article),
        }))
        .sort((a, b) => b.score - a.score);

    const engaged = ranked.filter(({ score }) => score > 0);
    if (engaged.length > 0) {
        return engaged.slice(0, limit).map(({ article }) => article);
    }

    return [...articles]
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, limit);
}

export function formatArticleListDate(createdAt) {
    if (!createdAt) return '';
    try {
        const date =
            typeof createdAt.toDate === 'function'
                ? createdAt.toDate()
                : createdAt.seconds
                  ? new Date(createdAt.seconds * 1000)
                  : new Date(createdAt);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 1) return 'Today';
        if (diffDays === 1) return '1d ago';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

export function formatClapsDisplay(claps) {
    const n = parseArticleClaps(claps);
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}
