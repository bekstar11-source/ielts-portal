import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { formatArticleCategoryHashtag } from '../../utils/articleCategory';
import {
    formatArticleListDate,
    formatClapsDisplay,
    getArticleCommentCount,
    parseArticleClaps,
} from '../../utils/articlePopularity';
import { useTranslation } from '../../context/LanguageContext';

export default function PopularArticlesSidebar({
    articles = [],
    loading = false,
    onArticleClick,
    onSeeAll,
    className = '',
}) {
    const { t } = useTranslation();
    return (
        <aside className={`${className}`}>
            <div className="lg:sticky lg:top-24">
                <h2 className="text-[12px] font-bold text-[#242424] dark:text-neutral-100 mb-4 tracking-tight uppercase">
                    {t('articles.popularArticles') || "Popular Articles"}
                </h2>

                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-1.5 animate-pulse">
                                <div className="h-2.5 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded" />
                                <div className="h-3.5 w-full bg-gray-200 dark:bg-neutral-800 rounded" />
                                <div className="h-2 w-1/4 bg-gray-200 dark:bg-neutral-800 rounded" />
                            </div>
                        ))}
                    </div>
                ) : articles.length === 0 ? (
                    <p className="text-[11px] text-gray-500 dark:text-neutral-400 leading-relaxed">
                        {t('articles.noPopularArticles') || "Hozircha mashhur maqolalar yo'q. O'qing va qarsak chaling — ro'yxat shu yerda paydo bo'ladi."}
                    </p>
                ) : (
                    <ul className="space-y-6">
                        {articles.map((article) => {
                            const categoryLabel = formatArticleCategoryHashtag(article.category) || 'Articles';
                            const commentCount = getArticleCommentCount(article);
                            const clapCount = parseArticleClaps(article.claps);

                            return (
                                <li key={article.id}>
                                    <button
                                        type="button"
                                        onClick={() => onArticleClick?.(article.id)}
                                        className="w-full text-left group"
                                    >
                                        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                            {article.authorAvatar ? (
                                                <img
                                                    src={article.authorAvatar}
                                                    alt=""
                                                    className="w-4 h-4 rounded-full object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-[8px] font-bold text-gray-500 shrink-0">
                                                    {article.author?.charAt(0) || 'I'}
                                                </div>
                                            )}
                                            <p className="text-[11px] text-[#6B6B6B] dark:text-neutral-400 truncate leading-snug">
                                                In{' '}
                                                <span className="text-[#242424] dark:text-neutral-300 font-medium">
                                                    {categoryLabel}
                                                </span>
                                                {' '}by{' '}
                                                <span className="text-[#242424] dark:text-neutral-300 font-medium">
                                                    {article.author || 'IELTS Portal'}
                                                </span>
                                                {article.isFeatured && (
                                                    <Star
                                                        size={10}
                                                        className="inline-block ml-0.5 text-yellow-500 fill-yellow-500 align-middle"
                                                    />
                                                )}
                                            </p>
                                        </div>

                                        <h3 className="text-[14px] font-bold text-[#242424] dark:text-neutral-100 leading-snug line-clamp-3 group-hover:text-gray-600 dark:group-hover:text-neutral-300 transition-colors mb-1.5">
                                            {article.title}
                                        </h3>

                                        <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] dark:text-neutral-500">
                                            {article.isFeatured && (
                                                <Star size={10} className="text-yellow-500 fill-yellow-500 shrink-0" />
                                            )}
                                            <span>{formatArticleListDate(article.createdAt)}</span>
                                            {clapCount > 0 && (
                                                <span className="flex items-center gap-0.5">
                                                    <span aria-hidden>👏</span>
                                                    {formatClapsDisplay(article.claps)}
                                                </span>
                                            )}
                                            {commentCount > 0 && (
                                                <span className="flex items-center gap-0.5">
                                                    <MessageSquare size={10} />
                                                    {commentCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {articles.length > 0 && (
                    <button
                        type="button"
                        onClick={onSeeAll}
                        className="mt-6 text-[11px] text-[#6B6B6B] dark:text-neutral-400 hover:text-[#242424] dark:hover:text-white transition-colors"
                    >
                        {t('articles.seeFullList') || "See the full list"}
                    </button>
                )}
            </div>
        </aside>
    );
}
