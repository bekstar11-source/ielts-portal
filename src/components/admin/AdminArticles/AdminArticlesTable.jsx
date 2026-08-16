import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ImageIcon, Star, Lock, Edit2, Trash2, Clock, BookMarked } from 'lucide-react';
import { formatArticleCategoryHashtag } from '../../../utils/articleCategory';
import { ARTICLE_LEVELS, formatReadTimeLabel, getMaxVocabularyCount } from '../../../utils/articleLevels';

const formatDate = (createdAt) => {
    const date = createdAt?.toDate?.() || (createdAt ? new Date(createdAt) : null);
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
};

const AdminArticlesTable = ({ articles, loading, onEdit, onDelete, isFiltered }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                        key={i}
                        className="h-[300px] bg-white dark:bg-[#1f1e1b] rounded-[28px] border border-black/[0.03] dark:border-white/5 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="py-20 text-center space-y-3">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <BookOpen size={38} />
                </div>
                <h3 className="text-lg font-bold">Maqolalar topilmadi</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    {isFiltered
                        ? "Qidiruv yoki filtrga mos maqola yo'q. Shartlarni o'zgartirib ko'ring."
                        : 'Yangi maqola yaratish uchun yuqoridagi tugmani bosing.'}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
                {articles.map((article) => {
                    const levels = article.levels || null;
                    const filledLevels = levels ? ARTICLE_LEVELS.filter((lv) => levels[lv]?.content?.length) : [];
                    const vocabCount = getMaxVocabularyCount(article);

                    return (
                        <Motion.div
                            key={article.id}
                            layout
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            className="group bg-white dark:bg-[#1f1e1b] rounded-[28px] border border-black/[0.04] dark:border-white/5 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/20 transition-all duration-300 flex flex-col"
                        >
                            <div className="h-36 w-full relative overflow-hidden bg-gray-100 dark:bg-white/5">
                                {article.imageUrl ? (
                                    <img
                                        src={article.imageUrl}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        alt={article.title || 'Maqola muqovasi'}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-warm-muted">
                                        <ImageIcon size={34} />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                    {article.category && (
                                        <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-[10px] font-bold rounded-full uppercase tracking-wider text-black shadow-sm">
                                            {formatArticleCategoryHashtag(article.category)}
                                        </span>
                                    )}
                                    {article.isMemberOnly && (
                                        <span className="px-2.5 py-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                            <Lock size={9} /> Pro
                                        </span>
                                    )}
                                    {article.isFeatured && (
                                        <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                            <Star size={9} className="fill-white" /> Top
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                <h3 className="text-base font-bold leading-snug mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {article.title || 'Nomsiz maqola'}
                                </h3>
                                {article.subtitle && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{article.subtitle}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                    {filledLevels.length > 0 ? (
                                        filledLevels.map((lv) => (
                                            <span
                                                key={lv}
                                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"
                                            >
                                                {lv}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                                            Darajasiz (eski)
                                        </span>
                                    )}
                                    {vocabCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-warm-on-dark-soft text-[10px] font-bold flex items-center gap-1">
                                            <BookMarked size={9} /> {vocabCount}
                                        </span>
                                    )}
                                    {article.readTime && (
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-warm-on-dark-soft text-[10px] font-bold flex items-center gap-1">
                                            <Clock size={9} /> {formatReadTimeLabel(article.readTime)}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto pt-3 border-t border-black/[0.04] dark:border-white/5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-400 overflow-hidden shrink-0">
                                            {article.authorAvatar ? (
                                                <img src={article.authorAvatar} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                article.author?.charAt(0) || '?'
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-gray-700 dark:text-white/80 truncate">
                                                {article.author || 'Nomaʼlum'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {formatDate(article.createdAt)} · 👏 {article.claps || 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            title="Tahrirlash"
                                            onClick={() => onEdit(article)}
                                            className="p-2 bg-gray-50 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            title="O'chirish"
                                            onClick={() => onDelete(article.id)}
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default AdminArticlesTable;
