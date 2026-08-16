/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, orderBy, limit, startAfter } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Search, ChevronRight, Clock, User,
    MessageSquare, ArrowUpRight, Newspaper, Edit2, Star, ChevronDown, BookMarked
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import { useAuth } from "../../context/AuthContext";
import SiteFooter from "../../components/common/SiteFooter";
import BottomNav from "../../components/dashboard/BottomNav";
import { useTranslation } from "../../context/LanguageContext";

import { stripHtml } from "../../utils/textUtils";
import { getArticleContent, getMaxVocabularyCount, articleHasLevels } from "../../utils/articleLevels";
import { extractArticleCategories, formatArticleCategoryHashtag, normalizeArticleCategory, categoryMatchesSearch } from "../../utils/articleCategory";
import { getPopularArticles, formatClapsDisplay, parseArticleClaps } from "../../utils/articlePopularity";
import { getUserClappedArticleIds, addArticleClap, removeArticleClap } from "../../utils/articleClaps";
import { getSavedArticleIds, toggleArticleSave, fetchSavedArticles } from "../../utils/articleSaves";
import PopularArticlesSidebar from "../../components/articles/PopularArticlesSidebar";
import Logo from "../../components/common/Logo";

const CATEGORY_INITIAL_LIMIT = 6;

export default function Articles() {
    const { user, userData, updateUserLocalData } = useAuth();
    const { t } = useTranslation();
    const isTeacher = userData?.role === 'teacher';
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [categoriesExpanded, setCategoriesExpanded] = useState(false);
    const [clappedArticleIds, setClappedArticleIds] = useState(() => new Set());
    const [clappingId, setClappingId] = useState(null);
    const feedRef = useRef(null);

    // Saqlanganlar (bookmark)
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [savedArticles, setSavedArticles] = useState([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [savingId, setSavingId] = useState(null);

    const savedIds = useMemo(() => getSavedArticleIds(userData), [userData?.savedArticles]);
    const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);

    useEffect(() => {
        setClappedArticleIds(new Set(getUserClappedArticleIds(user, userData)));
    }, [user, userData?.clappedArticles]);

    // Saqlangan maqolalar feed'da bo'lmasligi mumkin (sahifalab yuklanadi) →
    // ularni ID bo'yicha alohida olib kelamiz.
    useEffect(() => {
        if (!showSavedOnly) return;
        if (!user || savedIds.length === 0) {
            setSavedArticles([]);
            return;
        }

        let cancelled = false;
        setSavedLoading(true);
        fetchSavedArticles(db, savedIds)
            .then((items) => { if (!cancelled) setSavedArticles(items); })
            .catch((err) => {
                console.error("Error fetching saved articles:", err);
                if (!cancelled) setSavedArticles([]);
            })
            .finally(() => { if (!cancelled) setSavedLoading(false); });

        return () => { cancelled = true; };
    }, [showSavedOnly, user, savedIds]);

    // Foydalanuvchi chiqib ketsa filtr yopiq qolmasin
    useEffect(() => {
        if (!user && showSavedOnly) setShowSavedOnly(false);
    }, [user, showSavedOnly]);

    const handleToggleSave = async (e, articleId) => {
        e.stopPropagation();
        if (!user) {
            navigate('/auth/login');
            return;
        }
        if (savingId) return;

        setSavingId(articleId);
        const wasSaved = savedIdSet.has(articleId);

        // Optimistic — userData lokal holati darhol yangilanadi
        updateUserLocalData?.({
            savedArticles: wasSaved
                ? savedIds.filter((x) => x !== articleId)
                : [...new Set([...savedIds, articleId])],
        });

        try {
            await toggleArticleSave({ db, articleId, user, userData, updateUserLocalData, save: !wasSaved });
            if (wasSaved) {
                setSavedArticles((prev) => prev.filter((a) => a.id !== articleId));
            }
        } catch (err) {
            console.error("Error saving article:", err);
            updateUserLocalData?.({ savedArticles: savedIds });
        } finally {
            setSavingId(null);
        }
    };

    const popularArticles = useMemo(() => getPopularArticles(articles, 5), [articles]);

    useEffect(() => {
        fetchArticles(true);
    }, []);

    const fetchArticles = async (isInitial = false) => {
        if (isInitial) {
            setLoading(true);
            setLastVisible(null);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }
        try {
            let q = query(
                collection(db, "articles"),
                orderBy("createdAt", "desc"),
                limit(12)
            );
            if (!isInitial && lastVisible) {
                q = query(
                    collection(db, "articles"),
                    orderBy("createdAt", "desc"),
                    startAfter(lastVisible),
                    limit(12)
                );
            }
            const snap = await getDocs(q);
            if (snap.empty) {
                setHasMore(false);
                if (isInitial) setArticles([]);
            } else {
                const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setLastVisible(snap.docs[snap.docs.length - 1]);
                if (snap.docs.length < 12) {
                    setHasMore(false);
                }
                if (isInitial) {
                    setArticles(fetched);
                } else {
                    setArticles(prev => {
                        const existing = new Set(prev.map(a => a.id));
                        const unique = fetched.filter(a => !existing.has(a.id));
                        return [...prev, ...unique];
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching articles:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const categories = useMemo(() => {
        const defaultCats = ["All", "Reading", "Listening", "Vocabulary", "Grammar", "Speaking", "Writing", "Tips"];
        const loadedCats = extractArticleCategories(articles);
        const merged = new Set([...defaultCats, ...loadedCats]);
        return Array.from(merged).sort((a, b) => {
            if (a === "All") return -1;
            if (b === "All") return 1;
            return a.localeCompare(b);
        });
    }, [articles]);
    const hasMoreCategories = categories.length > CATEGORY_INITIAL_LIMIT;
    const primaryCategories = hasMoreCategories
        ? categories.slice(0, CATEGORY_INITIAL_LIMIT)
        : categories;
    const extraCategories = hasMoreCategories ? categories.slice(CATEGORY_INITIAL_LIMIT) : [];
    const hiddenCategoryCount = extraCategories.length;

    useEffect(() => {
        if (
            activeCategory !== "All" &&
            !categories.slice(0, CATEGORY_INITIAL_LIMIT).includes(activeCategory)
        ) {
            setCategoriesExpanded(true);
        }
    }, [activeCategory, categories]);

    const renderCategoryButton = (cat) => (
        <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`pb-3 pt-1 text-[13px] sm:text-sm font-medium transition-all relative whitespace-nowrap ${
                activeCategory === cat 
                ? 'text-black dark:text-white' 
                : 'text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
        >
            {cat === "All" ? (t('common.all') || 'All') : formatArticleCategoryHashtag(cat)}
            {activeCategory === cat && (
                <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-black dark:bg-white"
                />
            )}
        </button>
    );

    const sourceArticles = showSavedOnly ? savedArticles : articles;
    const filteredArticles = sourceArticles.filter(a => {
        const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            categoryMatchesSearch(a.category, searchTerm);
        const matchesCategory = activeCategory === "All" || normalizeArticleCategory(a.category) === activeCategory;
        return matchesSearch && matchesCategory;
    });
    const feedLoading = showSavedOnly ? savedLoading : loading;

    const handleClap = async (e, articleId) => {
        e.stopPropagation();
        const isClapped = clappedArticleIds.has(articleId);

        if (isClapped) {
            setClappedArticleIds((prev) => {
                const next = new Set(prev);
                next.delete(articleId);
                return next;
            });
            setArticles((prev) =>
                prev.map((a) =>
                    a.id === articleId
                        ? { ...a, claps: Math.max(0, parseArticleClaps(a.claps) - 1) }
                        : a
                )
            );
        } else {
            setClappedArticleIds((prev) => new Set([...prev, articleId]));
            setArticles((prev) =>
                prev.map((a) =>
                    a.id === articleId
                        ? { ...a, claps: parseArticleClaps(a.claps) + 1 }
                        : a
                )
            );
        }

        setClappingId(articleId);
        setTimeout(() => setClappingId(null), 300);

        try {
            if (isClapped) {
                await removeArticleClap({
                    db,
                    articleId,
                    user,
                    userData,
                    updateUserLocalData,
                });
            } else {
                await addArticleClap({
                    db,
                    articleId,
                    user,
                    userData,
                    updateUserLocalData,
                });
            }
        } catch (err) {
            console.error("Error updating claps:", err);
            if (isClapped) {
                setClappedArticleIds((prev) => new Set([...prev, articleId]));
                setArticles((prev) =>
                    prev.map((a) =>
                        a.id === articleId
                            ? { ...a, claps: parseArticleClaps(a.claps) + 1 }
                            : a
                    )
                );
            } else {
                setClappedArticleIds((prev) => {
                    const next = new Set(prev);
                    next.delete(articleId);
                    return next;
                });
                setArticles((prev) =>
                    prev.map((a) =>
                        a.id === articleId
                            ? { ...a, claps: Math.max(0, parseArticleClaps(a.claps) - 1) }
                            : a
                    )
                );
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-black font-sans text-[#1d1d1f] dark:text-[#f5f5f7] antialiased selection:bg-[#0066cc]/10 selection:text-[#0066cc] transition-colors duration-300">
            {!isTeacher && <DashboardHeader user={user} userData={userData} activeTab="articles" />}

            {/* ARTICLES TOP BAR (Medium-style) */}
            <header
                className={`sticky ${isTeacher ? 'top-0' : 'top-12'} z-40 bg-white/85 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.08]`}
            >
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 md:h-[60px] flex items-center gap-3 sm:gap-5">
                    {/* Wordmark */}
                    <button
                        type="button"
                        onClick={() => {
                            setActiveCategory("All");
                            setSearchTerm("");
                            setShowSavedOnly(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="shrink-0 group"
                        title="Englev Articles"
                    >
                        <Logo
                            size="sm"
                            suffix={t('articles.title') || 'Articles'}
                            suffixClassName="hidden sm:inline"
                        />
                    </button>

                    {/* Search pill */}
                    <div className="relative flex-1 max-w-[380px] group">
                        <Search
                            size={17}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 group-focus-within:text-black dark:group-focus-within:text-white transition-colors"
                        />
                        <input
                            type="text"
                            placeholder={t('articles.searchPlaceholder') || 'Search...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 md:h-10 rounded-full bg-black/[0.045] dark:bg-white/[0.07] border border-transparent focus:border-black/10 dark:focus:border-white/15 focus:bg-black/[0.06] dark:focus:bg-white/10 pl-10 pr-4 text-sm outline-none focus:ring-0 text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-gray-400 dark:placeholder-neutral-500 transition-colors"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
                        {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                            <button
                                type="button"
                                onClick={() => navigate(userData.role === 'admin' ? '/admin/articles' : '/teacher/articles')}
                                title={t('articles.manageArticles') || "Manage Articles"}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[13px] font-medium text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                            >
                                <Edit2 size={18} strokeWidth={1.6} />
                                <span className="hidden md:inline">{t('articles.manageArticles') || "Manage Articles"}</span>
                            </button>
                        )}
                        {user && (
                            <button
                                type="button"
                                onClick={() => setShowSavedOnly(v => !v)}
                                aria-pressed={showSavedOnly}
                                title={showSavedOnly ? (t('articles.allArticles') || "Barcha maqolalar") : (t('articles.savedArticles') || "Saqlangan maqolalar")}
                                className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                                    showSavedOnly
                                        ? 'text-black dark:text-white bg-black/[0.06] dark:bg-white/[0.1]'
                                        : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                                }`}
                            >
                                <BookMarked size={18} strokeWidth={1.6} fill={showSavedOnly ? 'currentColor' : 'none'} />
                                <span className="hidden md:inline">{t('articles.saved') || "Saqlangan"}</span>
                                {savedIds.length > 0 && (
                                    <span className="hidden md:inline text-[11px] tabular-nums text-gray-400 dark:text-neutral-500">
                                        {savedIds.length}
                                    </span>
                                )}
                                {savedIds.length > 0 && (
                                    <span className="md:hidden absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#1d1d1f] dark:bg-white text-white dark:text-black text-[9px] font-bold leading-[15px] text-center">
                                        {savedIds.length > 9 ? '9+' : savedIds.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 md:pt-5 pb-24">
                <div className="flex flex-col lg:flex-row lg:gap-0">
                <div className="flex-1 min-w-0 lg:pr-10 xl:pr-12" ref={feedRef}>
                {/* SEARCH & FILTERS BAR (MEDIUM STYLE TABS) */}
                <div className="border-b border-black/[0.05] dark:border-white/[0.08] mb-12 pb-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
                        <div className="flex-1 min-w-0 space-y-2 w-full">
                            <motion.div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1">
                                {primaryCategories.map(renderCategoryButton)}
                                {hasMoreCategories && !categoriesExpanded && (
                                    <button
                                        type="button"
                                        onClick={() => setCategoriesExpanded(true)}
                                        className="pb-3 pt-1 text-[13px] sm:text-sm font-medium text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap"
                                    >
                                        Show more
                                        <span className="text-[11px] text-gray-400 dark:text-neutral-500">(+{hiddenCategoryCount})</span>
                                        <ChevronDown size={14} className="opacity-60" />
                                    </button>
                                )}
                            </motion.div>
                            <AnimatePresence>
                                {categoriesExpanded && extraCategories.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <motion.div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                                            {extraCategories.map(renderCategoryButton)}
                                            <button
                                                type="button"
                                                onClick={() => setCategoriesExpanded(false)}
                                                className="pb-3 pt-1 text-[13px] sm:text-sm font-medium text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                Show less
                                            </button>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {showSavedOnly && (
                            <div className="flex items-center gap-2 md:shrink-0 md:pt-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-3 py-1 text-[12px] font-medium text-[#242424] dark:text-neutral-200">
                                    <BookMarked size={13} fill="currentColor" />
                                    {t('articles.saved') || "Saqlangan"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowSavedOnly(false)}
                                    className="text-[12px] font-medium text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    {t('articles.clearFilters') || "Tozalash"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:hidden mb-10 pb-10 border-b border-[#e5e5e5] dark:border-white/10">
                    <PopularArticlesSidebar
                        articles={popularArticles}
                        loading={loading}
                        onArticleClick={(id) => navigate(`/article/${id}`)}
                        onSeeAll={() => {
                            setActiveCategory("All");
                            setSearchTerm("");
                        }}
                    />
                </div>

                {/* ARTICLES FEED (MEDIUM STYLE) */}
                <div className="space-y-12">
                    <AnimatePresence mode="popLayout">
                        {feedLoading ? (
                            [1,2,3].map(i => (
                                <div key={i} className="flex flex-col md:flex-row gap-8 items-start animate-pulse">
                                    <div className="flex-1 space-y-4">
                                        <div className="w-48 h-4 bg-gray-200 dark:bg-neutral-800 rounded" />
                                        <div className="w-full h-8 bg-gray-200 dark:bg-neutral-800 rounded" />
                                        <div className="w-3/4 h-16 bg-gray-200 dark:bg-neutral-800 rounded" />
                                    </div>
                                    <div className="w-full md:w-40 aspect-square bg-gray-200 dark:bg-neutral-800 rounded-lg" />
                                </div>
                            ))
                        ) : filteredArticles.length > 0 ? (
                            filteredArticles.map((article, idx) => (
                                <motion.div
                                    key={article.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => navigate(`/article/${article.id}`)}
                                    className="group cursor-pointer flex flex-col-reverse md:flex-row gap-8 items-start pb-12 border-b border-black/[0.05] dark:border-white/[0.08] last:border-0"
                                >
                                    {/* Content Part */}
                                    <div className="flex-1 space-y-3">
                                        {/* Author Row */}
                                        <div className="flex items-center gap-2 mb-2">
                                            {article.authorAvatar ? (
                                                <img src={article.authorAvatar} className="w-5 h-5 rounded-full object-cover" alt={article.author} />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-[8px] font-bold text-gray-400">
                                                    {article.author?.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-[13px] font-medium text-[#242424] dark:text-neutral-200">{article.author}</span>
                                            {(article.isFeatured || article.isMemberOnly) && <Star size={12} className="text-yellow-500 fill-yellow-500 ml-1" />}
                                        </div>

                                        {/* Title & Excerpt */}
                                        <div className="space-y-2">
                                            <h3 className="text-xl md:text-2xl font-bold text-[#242424] dark:text-neutral-100 leading-tight group-hover:text-gray-600 dark:group-hover:text-neutral-300 transition-colors line-clamp-2">
                                                {article.title}
                                            </h3>
                                             <p className="text-[15px] md:text-[16px] text-gray-500 dark:text-neutral-400 leading-snug line-clamp-2">
                                                 {article.subtitle 
                                                     ? stripHtml(article.subtitle) 
                                                     : (() => {
                                                         const excerptContent = getArticleContent(article, 'B2');
                                                         const cleanParagraph = stripHtml(excerptContent?.find(b => b.type === 'paragraph')?.text || '');
                                                         return cleanParagraph.length > 120 
                                                             ? cleanParagraph.substring(0, 120) + '...' 
                                                             : cleanParagraph;
                                                     })()}
                                             </p>
                                        </div>

                                        {/* Meta Row */}
                                        <div className="flex items-center justify-between pt-4">
                                            <div className="flex items-center gap-4 text-[#6B6B6B] dark:text-neutral-400 text-[13px]">
                                                {article.isFeatured && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                                                <span>{article.createdAt ? new Date(article.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Mar 9'}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleClap(e, article.id)}
                                                    className={`flex items-center gap-1 transition-all hover:text-[#242424] dark:hover:text-white ${
                                                        clappedArticleIds.has(article.id)
                                                            ? 'text-[#242424] dark:text-white'
                                                            : ''
                                                    } ${clappingId === article.id ? 'scale-110' : ''}`}
                                                >
                                                    <motion.span
                                                        animate={clappingId === article.id ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                                                        className="inline-block"
                                                    >
                                                        👏
                                                    </motion.span>
                                                    <span>{formatClapsDisplay(article.claps)}</span>
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare size={14} />
                                                    <span>{article.comments?.length || 0}</span>
                                                </div>
                                                {articleHasLevels(article) && (
                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                        B1 · B2 · C1
                                                    </span>
                                                )}
                                                {getMaxVocabularyCount(article) > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <BookOpen size={14} />
                                                        <span>{getMaxVocabularyCount(article)}+ words</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-400">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleSave(e, article.id)}
                                                    disabled={savingId === article.id}
                                                    aria-pressed={savedIdSet.has(article.id)}
                                                    aria-label={savedIdSet.has(article.id) ? "Saqlanganlardan olib tashlash" : "Keyinroq o'qish uchun saqlash"}
                                                    title={savedIdSet.has(article.id) ? "Saqlangan" : "Saqlash"}
                                                    className={`p-1 rounded-full transition-colors disabled:opacity-50 ${
                                                        savedIdSet.has(article.id)
                                                            ? 'text-[#242424] dark:text-white'
                                                            : 'hover:text-black dark:hover:text-white'
                                                    }`}
                                                >
                                                    <BookMarked size={18} fill={savedIdSet.has(article.id) ? 'currentColor' : 'none'} />
                                                </button>
                                                {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                                                    <Edit2
                                                        size={18}
                                                        className="hover:text-black transition-colors cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(userData.role === 'admin' ? '/admin/articles' : '/teacher/articles');
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Part */}
                                    {article.imageUrl && (
                                        <div className="w-full md:w-48 lg:w-52 aspect-[4/3] md:aspect-square rounded-lg overflow-hidden shrink-0">
                                            <img 
                                                src={article.imageUrl} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                                alt={article.title} 
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        ) : showSavedOnly ? (
                            <div className="py-20 text-center space-y-3">
                                <div className="w-14 h-14 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mx-auto text-gray-400 dark:text-neutral-500">
                                    <BookMarked size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-[#242424] dark:text-neutral-200">
                                    {savedIds.length === 0 ? (t('articles.noSavedArticles') || "Hali saqlangan maqola yo'q") : (t('articles.noSavedArticlesMatch') || "Bu filtrga mos saqlangan maqola yo'q")}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm mx-auto">
                                    {savedIds.length === 0
                                        ? (t('articles.saveTooltip') || "Maqola kartasidagi yoki o'qish sahifasidagi xatcho'p belgisini bosib, maqolani keyinroq o'qish uchun saqlang.")
                                        : (t('articles.tryChangingFilters') || "Qidiruv yoki kategoriya filtrini o'zgartirib ko'ring.")}
                                </p>
                                <button
                                    onClick={() => setShowSavedOnly(false)}
                                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {t('articles.backToAll') || "Barcha maqolalarga qaytish"}
                                </button>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <h3 className="text-xl font-bold text-gray-400">{t('articles.noArticlesFound') || "No articles found"}</h3>
                            </div>
                        )}
                    </AnimatePresence>
                    {hasMore && !loading && !showSavedOnly && (
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => fetchArticles(false)}
                                disabled={loadingMore}
                                className="bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/10 text-gray-800 dark:text-zinc-200 px-6 py-2.5 rounded-full text-xs font-bold shadow-sm hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        <span>{t('articles.loading') || "Yuklanmoqda..."}</span>
                                    </>
                                ) : (
                                    <span>{t('articles.loadMore') || "Yana yuklash"}</span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
                </div>

                {/* Popular sidebar — desktop right */}
                <PopularArticlesSidebar
                    className="hidden lg:block w-[280px] xl:w-[300px] shrink-0 self-stretch pt-1 lg:ml-10 xl:ml-12 lg:pl-10 xl:pl-12 lg:border-l lg:border-[#e5e5e5] dark:lg:border-white/10"
                    articles={popularArticles}
                    loading={loading}
                    onArticleClick={(id) => navigate(`/article/${id}`)}
                    onSeeAll={() => {
                        setActiveCategory("All");
                        setSearchTerm("");
                        feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                />
                </div>
            </main>

            {!isTeacher && <BottomNav activeTab="articles" />}
            {!isTeacher && <SiteFooter />}
        </div>
    );
}
