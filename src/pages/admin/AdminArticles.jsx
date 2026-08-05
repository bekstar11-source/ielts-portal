import React, { useState, useMemo } from "react";
import { Plus, Search, X, RefreshCw, Star, Lock, FileText } from "lucide-react";
import { extractArticleCategories, normalizeArticleCategory, formatArticleCategoryHashtag } from "../../utils/articleCategory";
import { useAdminArticles } from "../../hooks/useAdminArticles";
import AdminArticlesTable from "../../components/admin/AdminArticles/AdminArticlesTable";
import AdminArticlesEditor from "../../components/admin/AdminArticles/AdminArticlesEditor";

const SORT_OPTIONS = [
    { id: "newest", label: "Yangi" },
    { id: "oldest", label: "Eski" },
    { id: "title", label: "A → Z" },
    { id: "claps", label: "Mashhur" },
];

const toMillis = (value) => {
    const date = value?.toDate?.() || (value ? new Date(value) : null);
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

export default function AdminArticles() {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [showModal, setShowModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [error, setError] = useState("");

    const {
        articles, loading, processing,
        handleSaveArticle, handleDeleteArticle, uploadFile, refresh,
    } = useAdminArticles();

    const existingCategories = useMemo(() => extractArticleCategories(articles), [articles]);

    const stats = useMemo(
        () => ({
            total: articles.length,
            pro: articles.filter((a) => a.isMemberOnly).length,
            featured: articles.filter((a) => a.isFeatured).length,
        }),
        [articles]
    );

    const visibleArticles = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const cat = normalizeArticleCategory(activeCategory).toLowerCase();

        const filtered = articles.filter((a) => {
            const category = normalizeArticleCategory(a?.category).toLowerCase();
            if (cat && category !== cat) return false;
            if (!q) return true;
            return (
                (a?.title || "").toLowerCase().includes(q) ||
                (a?.subtitle || "").toLowerCase().includes(q) ||
                (a?.author || "").toLowerCase().includes(q) ||
                category.includes(q)
            );
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
            if (sortBy === "claps") return (b.claps || 0) - (a.claps || 0);
            if (sortBy === "oldest") return toMillis(a.createdAt) - toMillis(b.createdAt);
            return toMillis(b.createdAt) - toMillis(a.createdAt);
        });
    }, [articles, searchTerm, activeCategory, sortBy]);

    const handleOpenModal = (article = null) => {
        setSelectedArticle(article);
        setShowModal(true);
    };

    const handleSave = async (formData) => {
        setError("");
        try {
            const success = await handleSaveArticle(formData, selectedArticle?.id);
            if (success) setShowModal(false);
        } catch (err) {
            setError("Saqlashda xatolik: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        setError("");
        try {
            await handleDeleteArticle(id);
        } catch (err) {
            setError("O'chirishda xatolik: " + err.message);
        }
    };

    const isFiltered = Boolean(searchTerm.trim() || activeCategory);

    return (
        <div className="flex-1 space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Maqolalar</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        O&apos;quvchilar uchun darajali maqolalar yarating va boshqaring.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        title="Yangilash"
                        className="p-2.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Yangi maqola</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")} className="shrink-0">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: <FileText size={16} />, label: "Jami", value: stats.total, tone: "text-blue-600 bg-blue-500/10" },
                    { icon: <Lock size={16} />, label: "PRO", value: stats.pro, tone: "text-yellow-600 bg-yellow-500/10" },
                    { icon: <Star size={16} />, label: "Tavsiya", value: stats.featured, tone: "text-violet-600 bg-violet-500/10" },
                ].map(({ icon, label, value, tone }) => (
                    <div
                        key={label}
                        className="bg-white dark:bg-[#1E1E1E] p-4 rounded-[20px] border border-gray-100 dark:border-white/5 flex items-center gap-3"
                    >
                        <div className={`p-2.5 rounded-xl ${tone}`}>{icon}</div>
                        <div>
                            <p className="text-lg font-bold leading-none">{loading ? "—" : value}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-1">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-[24px] border border-gray-100 dark:border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Sarlavha, izoh, muallif yoki kategoriya bo'yicha qidirish..."
                            className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl pl-10 pr-9 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1 p-1 rounded-xl bg-gray-50 dark:bg-[#252525] shrink-0">
                        {SORT_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setSortBy(opt.id)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    sortBy === opt.id
                                        ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {existingCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveCategory("")}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                !activeCategory
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                            }`}
                        >
                            Barchasi
                        </button>
                        {existingCategories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    activeCategory === cat
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                                }`}
                            >
                                {formatArticleCategoryHashtag(cat)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!loading && (
                <p className="text-xs text-gray-400 font-medium px-1">
                    {visibleArticles.length} ta maqola ko&apos;rsatilmoqda
                    {isFiltered ? ` (jami ${stats.total})` : ""}
                </p>
            )}

            <AdminArticlesTable
                articles={visibleArticles}
                loading={loading}
                isFiltered={isFiltered}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
            />

            {showModal && (
                <AdminArticlesEditor
                    article={selectedArticle}
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    existingCategories={existingCategories}
                    onUpload={uploadFile}
                    processing={processing}
                />
            )}
        </div>
    );
}
