import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BookOpen, Search, ChevronRight, Clock, User, 
    MessageSquare, ArrowUpRight, Newspaper, Edit2, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import { useAuth } from "../context/AuthContext";
import SiteFooter from "../components/common/SiteFooter";

export default function Articles() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

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

    const categories = ["All", ...Array.from(new Set(articles.map(a => a.category))).filter(Boolean)];

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            a.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === "All" || a.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#1d1d1f] antialiased selection:bg-[#0066cc]/10 selection:text-[#0066cc]">
            <DashboardHeader user={user} userData={userData} activeTab="articles" />

            {/* HERO SECTION */}
            <div className="bg-[#050505] pt-20 pb-12 px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full" />
                </div>
                
                <div className="max-w-[1440px] mx-auto relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6">
                            Explore and <br />
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Expand Your Mind.</span>
                        </h1>
                        <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed mb-8">
                            Dive into curated articles designed to boost your vocabulary, 
                            improve reading comprehension, and keep you informed.
                        </p>

                        {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                            <button 
                                onClick={() => navigate(userData.role === 'admin' ? '/admin/articles' : '/teacher/articles')}
                                className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/10"
                            >
                                <Edit2 size={18} />
                                Manage Articles
                            </button>
                        )}
                    </motion.div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 pt-10 pb-24">
                {/* SEARCH & FILTERS BAR (MEDIUM STYLE TABS) */}
                <div className="border-b border-black/[0.05] mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`pb-4 text-sm font-medium transition-all relative whitespace-nowrap ${
                                    activeCategory === cat 
                                    ? 'text-black' 
                                    : 'text-gray-500 hover:text-black'
                                }`}
                            >
                                {cat}
                                {activeCategory === cat && (
                                    <motion.div 
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-[1px] bg-black"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="relative group min-w-[240px]">
                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search..."
                            className="w-full bg-transparent border-none pl-6 pr-4 py-2 text-sm focus:ring-0 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* ARTICLES FEED (MEDIUM STYLE) */}
                <div className="space-y-12">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            [1,2,3].map(i => (
                                <div key={i} className="flex flex-col md:flex-row gap-8 items-start animate-pulse">
                                    <div className="flex-1 space-y-4">
                                        <div className="w-48 h-4 bg-gray-200 rounded" />
                                        <div className="w-full h-8 bg-gray-200 rounded" />
                                        <div className="w-3/4 h-16 bg-gray-200 rounded" />
                                    </div>
                                    <div className="w-full md:w-40 aspect-square bg-gray-200 rounded-lg" />
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
                                    className="group cursor-pointer flex flex-col-reverse md:flex-row gap-8 items-start pb-12 border-b border-black/[0.05] last:border-0"
                                >
                                    {/* Content Part */}
                                    <div className="flex-1 space-y-3">
                                        {/* Author Row */}
                                        <div className="flex items-center gap-2 mb-2">
                                            {article.authorAvatar ? (
                                                <img src={article.authorAvatar} className="w-5 h-5 rounded-full object-cover" alt={article.author} />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold">
                                                    {article.author?.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-[13px] font-medium text-[#242424]">{article.author}</span>
                                            {article.isFeatured && <Star size={12} className="text-yellow-500 fill-yellow-500 ml-1" />}
                                        </div>

                                        {/* Title & Excerpt */}
                                        <div className="space-y-2">
                                            <h3 className="text-xl md:text-2xl font-bold text-[#242424] leading-tight group-hover:text-gray-600 transition-colors line-clamp-2">
                                                {article.title}
                                            </h3>
                                            <p className="text-[15px] md:text-[16px] text-gray-500 leading-snug line-clamp-2">
                                                {article.subtitle || article.content?.find(b => b.type === 'paragraph')?.text}
                                            </p>
                                        </div>

                                        {/* Meta Row */}
                                        <div className="flex items-center justify-between pt-4">
                                            <div className="flex items-center gap-4 text-[#6B6B6B] text-[13px]">
                                                {article.isFeatured && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                                                <span>{article.createdAt ? new Date(article.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Mar 9'}</span>
                                                <div className="flex items-center gap-1">
                                                    <span>👏</span>
                                                    <span>{article.claps || '4.8K'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare size={14} />
                                                    <span>{article.quiz?.length || 0}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-400">
                                                <BookOpen size={18} className="hover:text-black transition-colors" />
                                                <Edit2 size={18} className="hover:text-black transition-colors" />
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
            </main>

            <SiteFooter />
        </div>
    );
}
