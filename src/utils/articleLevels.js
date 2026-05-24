import { stripHtml } from './textUtils';

export const ARTICLE_LEVELS = ['B1', 'B2', 'C1'];

export const ARTICLE_LEVEL_META = {
    B1: { label: 'B1', title: 'B1 — Oddiy', color: 'emerald' },
    B2: { label: 'B2', title: 'B2 — O\'rta', color: 'blue' },
    C1: { label: 'C1', title: 'C1 — Yuqori', color: 'violet' },
};

const DEFAULT_BLOCK_STYLE = {
    fontSize: 16,
    lineHeight: 1.6,
    marginTop: 0,
    marginBottom: 16,
    fontWeight: '400',
    letterSpacing: '0',
};

export const makeEmptyContentBlock = (type = 'paragraph') => ({
    type,
    text: '',
    style:
        type === 'heading'
            ? {
                  fontSize: 24,
                  lineHeight: 1.2,
                  marginTop: 24,
                  marginBottom: 12,
                  fontWeight: '700',
                  letterSpacing: '-0.01em',
              }
            : { ...DEFAULT_BLOCK_STYLE },
});

export const makeEmptyArticleLevel = () => ({
    content: [makeEmptyContentBlock('paragraph')],
    vocabulary: [],
    readTime: '1 min read',
});

export const makeEmptyArticleLevels = () =>
    ARTICLE_LEVELS.reduce((acc, level) => {
        acc[level] = makeEmptyArticleLevel();
        return acc;
    }, {});

export function computeReadTimeFromContent(content = []) {
    const totalWords = content.reduce((acc, block) => {
        if (!block?.text) return acc;
        const words = stripHtml(block.text).split(/\s+/).filter(Boolean).length;
        return acc + words;
    }, 0);
    const minutes = Math.max(1, Math.ceil(totalWords / 200));
    return `${minutes} min read`;
}

/** Legacy `content` / `vocabulary` → `levels` */
export function normalizeArticleLevels(article) {
    if (article?.levels && typeof article.levels === 'object') {
        return ARTICLE_LEVELS.reduce((acc, level) => {
            const src = article.levels[level] || {};
            acc[level] = {
                content: src.content?.length ? src.content : [makeEmptyContentBlock('paragraph')],
                vocabulary: Array.isArray(src.vocabulary) ? src.vocabulary : [],
                readTime: src.readTime || computeReadTimeFromContent(src.content),
            };
            return acc;
        }, {});
    }

    const legacy = {
        content: article?.content?.length ? article.content : [makeEmptyContentBlock('paragraph')],
        vocabulary: Array.isArray(article?.vocabulary) ? article.vocabulary : [],
        readTime: article?.readTime || computeReadTimeFromContent(article?.content),
    };

    return ARTICLE_LEVELS.reduce((acc, level) => {
        acc[level] = { ...legacy, vocabulary: [...legacy.vocabulary] };
        return acc;
    }, {});
}

export function getArticleLevelData(article, level = 'B2') {
    const levels = normalizeArticleLevels(article);
    const key = ARTICLE_LEVELS.includes(level) ? level : 'B2';
    return levels[key];
}

export function getArticleContent(article, level = 'B2') {
    return getArticleLevelData(article, level).content || [];
}

export function getArticleVocabulary(article, level = 'B2') {
    return getArticleLevelData(article, level).vocabulary || [];
}

export function getArticleReadTime(article, level = 'B2') {
    return getArticleLevelData(article, level).readTime || article?.readTime || '5 min read';
}

export function articleHasLevels(article) {
    return Boolean(article?.levels);
}

export function getMaxVocabularyCount(article) {
    const levels = normalizeArticleLevels(article);
    return Math.max(...ARTICLE_LEVELS.map((l) => levels[l]?.vocabulary?.length || 0), 0);
}

export function getDefaultReadingLevel(userData) {
    const fromProfile = userData?.englishLevel || userData?.level;
    if (fromProfile && ARTICLE_LEVELS.includes(String(fromProfile).toUpperCase())) {
        return String(fromProfile).toUpperCase();
    }
    try {
        const saved = localStorage.getItem('articlePreferredLevel');
        if (saved && ARTICLE_LEVELS.includes(saved)) return saved;
    } catch {
        /* ignore */
    }
    return 'B2';
}

export function savePreferredReadingLevel(level) {
    try {
        localStorage.setItem('articlePreferredLevel', level);
    } catch {
        /* ignore */
    }
}
