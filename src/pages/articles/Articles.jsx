/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BookOpen, Search, ChevronRight, Clock, User, 
    MessageSquare, ArrowUpRight, Newspaper, Edit2, Star, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import { useAuth } from "../../context/AuthContext";
import SiteFooter from "../../components/common/SiteFooter";
import BottomNav from "../../components/dashboard/BottomNav";

import { stripHtml } from "../../utils/textUtils";
import { getArticleContent, getMaxVocabularyCount, articleHasLevels } from "../../utils/articleLevels";
import { extractArticleCategories, formatArticleCategoryHashtag, normalizeArticleCategory, categoryMatchesSearch } from "../../utils/articleCategory";
import { getPopularArticles, formatClapsDisplay, parseArticleClaps } from "../../utils/articlePopularity";
import { getUserClappedArticleIds, addArticleClap, removeArticleClap } from "../../utils/articleClaps";
import PopularArticlesSidebar from "../../components/articles/PopularArticlesSidebar";

const CATEGORY_INITIAL_LIMIT = 6;

export default function Articles() {
    const { user, userData, updateUserLocalData } = useAuth();
    const isTeacher = userData?.role === 'teacher';
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [categoriesExpanded, setCategoriesExpanded] = useState(false);
    const [clappedArticleIds, setClappedArticleIds] = useState(() => new Set());
    const [clappingId, setClappingId] = useState(null);
    const feedRef = useRef(null);

    useEffect(() => {
        setClappedArticleIds(new Set(getUserClappedArticleIds(user, userData)));
    }, [user, userData?.clappedArticles]);

    const popularArticles = useMemo(() => getPopularArticles(articles, 5), [articles]);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching articles:", err);
        } finally {
            setLoading(false);
        }
    };

    const categories = ["All", ...extractArticleCategories(articles)];
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
            {cat === "All" ? cat : formatArticleCategoryHashtag(cat)}
            {activeCategory === cat && (
                <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-black dark:bg-white"
                />
            )}
        </button>
    );

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            categoryMatchesSearch(a.category, searchTerm);
        const matchesCategory = activeCategory === "All" || normalizeArticleCategory(a.category) === activeCategory;
        return matchesSearch && matchesCategory;
    });

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

            {/* HERO SECTION */}
            <div className="bg-[#050505] pt-4 pb-3.5 md:pt-6 md:pb-5 px-4 md:px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full" />
                </div>
                
                <div className="max-w-[1440px] mx-auto relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl"
                    >
                        <span className="eyebrow text-[10px] md:text-xs text-blue-400 mb-0.5 md:mb-1 block">Articles</span>
                        <h1 className="headline text-lg md:text-[26px] text-white mb-1 md:mb-1.5 block">
                            Explore and <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Expand Your Mind.</span>
                        </h1>
                        <p className="body-sm text-[11px] md:text-sm text-white/60 max-w-xl leading-relaxed mb-2.5 md:mb-3 block">
                            Boost your vocabulary and reading skills with curated articles.
                        </p>

                        {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                            <button 
                                onClick={() => navigate(userData.role === 'admin' ? '/admin/articles' : '/teacher/articles')}
                                className="flex items-center gap-1.5 bg-white text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold text-[9px] md:text-xs hover:bg-gray-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                            >
                                <Edit2 size={10} />
                                Manage Articles
                            </button>
                        )}
                    </motion.div>
                </div>
            </div>

            <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-24">
                <div className="flex flex-col lg:flex-row lg:gap-0">
                <div className="flex-1 min-w-0 lg:pr-10 xl:pr-12" ref={feedRef}>
                {/* SEARCH & FILTERS BAR (MEDIUM STYLE TABS) */}
                <div className="border-b border-black/[0.05] dark:border-white/[0.08] mb-12 pb-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
                        <div className="flex-1 min-w-0 space-y-2">
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
                        <div className="relative group w-full md:w-auto md:min-w-[220px] md:shrink-0 md:pt-0.5">
                            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search..."
                                className="w-full bg-transparent border-none pl-6 pr-4 py-2 text-sm focus:ring-0 transition-all font-medium text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-gray-400 dark:placeholder-neutral-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
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
                        {loading ? (
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
                                            <div className="flex items-center gap-4 text-gray-400">
                                                <BookOpen size={18} className="hover:text-black transition-colors" />
                                                {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                                                    <Edit2 
                                                        size={18} 
                                                        className="hover:text-black transition-colors" 
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
                        ) : (
                            <div className="py-20 text-center">
                                <h3 className="text-xl font-bold text-gray-400">No articles found</h3>
                            </div>
                        )}
                    </AnimatePresence>
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
