import { stripHtml } from './textUtils';
import { clampCefr } from './cefr.js';

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

export function normalizeArticleLevels(article) {
    const ensureBlockStyles = (contentArray) => {
        if (!Array.isArray(contentArray)) return [];
        return contentArray.map(block => {
            if (!block) return makeEmptyContentBlock('paragraph');
            
            const hasValidStyle = block.style && 
                                  typeof block.style === 'object' && 
                                  Object.keys(block.style).length > 0;
                                  
            return {
                ...block,
                style: hasValidStyle ? {
                    fontSize: block.style.fontSize || (block.type === 'heading' ? 26 : 16),
                    lineHeight: block.style.lineHeight || (block.type === 'heading' ? 1.25 : 1.6),
                    marginTop: block.style.marginTop !== undefined ? block.style.marginTop : (block.type === 'heading' ? 24 : 0),
                    marginBottom: block.style.marginBottom !== undefined ? block.style.marginBottom : (block.type === 'heading' ? 12 : 16),
                    fontWeight: block.style.fontWeight || (block.type === 'heading' ? '700' : '400'),
                    letterSpacing: block.style.letterSpacing || (block.type === 'heading' ? '-0.015em' : '0'),
                } : {
                    fontSize: block.type === 'heading' ? 26 : 16,
                    lineHeight: block.type === 'heading' ? 1.25 : 1.6,
                    marginTop: block.type === 'heading' ? 24 : 0,
                    marginBottom: block.type === 'heading' ? 12 : 16,
                    fontWeight: block.type === 'heading' ? '700' : '400',
                    letterSpacing: block.type === 'heading' ? '-0.015em' : '0',
                }
            };
        });
    };

    if (article?.levels && typeof article.levels === 'object') {
        return ARTICLE_LEVELS.reduce((acc, level) => {
            const src = article.levels[level] || {};
            const content = ensureBlockStyles(src.content);
            acc[level] = {
                content: content.length ? content : [makeEmptyContentBlock('paragraph')],
                vocabulary: Array.isArray(src.vocabulary) ? src.vocabulary : [],
                readTime: src.readTime || computeReadTimeFromContent(content),
            };
            return acc;
        }, {});
    }

    const legacyContent = ensureBlockStyles(article?.content);
    const legacy = {
        content: legacyContent.length ? legacyContent : [makeEmptyContentBlock('paragraph')],
        vocabulary: Array.isArray(article?.vocabulary) ? article.vocabulary : [],
        readTime: article?.readTime || computeReadTimeFromContent(legacyContent),
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

/**
 * "5 min read" (bazada shu ko'rinishda saqlanadi) → "5 daqiqa".
 * Interfeys o'zbekcha bo'lgani uchun o'qish vaqti ham o'zbekcha ko'rsatiladi.
 */
export function formatReadTimeLabel(readTime) {
    if (!readTime) return '';
    const match = String(readTime).match(/\d+/);
    if (!match) return String(readTime);
    return `${match[0]} daqiqa`;
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
    if (fromProfile) {
        // ⚠️ `clampCefr` SHART: onboarding endi A2 ni ham yozishi mumkin
        // (boshlang'ich daraja), lekin maqolalar faqat B1/B2/C1 da mavjud.
        // Ilgari bu yerda oddiy `includes` tekshiruvi turardi va A2 o'quvchisi
        // jimgina B2 ga tushib ketardi — ya'ni unga eng og'ir matn berilardi.
        const matched = clampCefr(fromProfile, ARTICLE_LEVELS);
        if (matched) return matched;
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
