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
            <div className="bg-[#050505] pt-24 pb-20 px-6 relative overflow-hidden">
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

            <main className="max-w-[1440px] mx-auto px-6 -mt-10 relative z-20">
                {/* SEARCH & FILTERS BAR */}
                <div className="bg-white/80 backdrop-blur-2xl p-4 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white flex flex-col md:flex-row gap-4 mb-12">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search articles, topics or keywords..."
                            className="w-full bg-[#f5f5f7] border-none rounded-2xl pl-12 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                                    activeCategory === cat 
                                    ? 'bg-[#1d1d1f] text-white shadow-xl shadow-black/10' 
                                    : 'bg-[#f5f5f7] text-[#86868b] hover:bg-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ARTICLES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            [1,2,3,4,5,6].map(i => (
                                <div key={i} className="h-[450px] bg-white rounded-[40px] border border-white shadow-sm animate-pulse" />
                            ))
                        ) : filteredArticles.length > 0 ? (
                            filteredArticles.map((article, idx) => (
                                <motion.div
                                    key={article.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => navigate(`/article/${article.id}`)}
                                    className="group bg-white rounded-[40px] p-8 border border-white shadow-sm hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col relative overflow-hidden"
                                >
                                    {/* Accent background on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex items-center gap-2">
                                                {article.isFeatured && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                                                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100">
                                                    {article.category}
                                                </span>
                                            </div>

                                        {article.imageUrl && (
                                            <div className="w-full h-48 mb-6 rounded-3xl overflow-hidden relative">
                                                <img 
                                                    src={article.imageUrl} 
                                                    alt={article.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                            </div>
                                        )}

                                        <h3 className="text-2xl md:text-3xl font-bold leading-tight mb-4 group-hover:text-[#0066cc] transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>

                                        <p className="text-[#86868b] text-sm font-medium mb-8 flex-1 line-clamp-3 leading-relaxed">
                                            {article.content?.find(b => b.type === 'paragraph')?.text || "Read this interesting article to enhance your English skills and general knowledge..."}
                                        </p>

                                        <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#86868b]">
                                                    <Clock size={14} className="text-blue-500" />
                                                    <span>{article.readTime || '5 min'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#86868b]">
                                                    <MessageSquare size={14} className="text-purple-500" />
                                                    <span>{article.quiz?.length || 0} Quiz</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[#1d1d1f]">
                                                {article.authorAvatar ? (
                                                    <img src={article.authorAvatar} className="w-8 h-8 rounded-full object-cover border border-black/5" alt={article.author} />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black">
                                                        {article.author?.charAt(0) || 'I'}
                                                    </div>
                                                )}
                                                <span className="text-[12px] font-bold">{article.author || 'IELTS Portal'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-40 text-center">
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                                    <BookOpen size={40} className="text-gray-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-[#1d1d1f]">No articles found</h3>
                                <p className="text-[#86868b] mt-2">Try adjusting your search or category filters.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
