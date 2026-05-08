import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Plus, Search, BookOpen } from "lucide-react";

// Hooks & Components
import { useAdminArticles } from "../hooks/useAdminArticles";
import AdminArticlesTable from "../components/admin/AdminArticles/AdminArticlesTable";
import AdminArticlesEditor from "../components/admin/AdminArticles/AdminArticlesEditor";

export default function AdminArticles() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);

    const { 
        articles, loading, processing, 
        handleSaveArticle, handleDeleteArticle, uploadFile 
    } = useAdminArticles();

    const handleOpenModal = (article = null) => {
        setSelectedArticle(article);
        setShowModal(true);
    };

    const handleSave = async (formData) => {
        try {
            const success = await handleSaveArticle(formData, selectedArticle?.id);
            if (success) setShowModal(false);
        } catch (err) {
            alert("Xato: " + err.message);
        }
    };

    const filteredArticles = articles.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Articles Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">O'quvchilar uchun qiziqarli maqolalar yarating va boshqaring.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    <span>Yangi maqola</span>
                </button>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-[24px] border border-gray-100 dark:border-white/5 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Maqola qidirish..."
                        className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <AdminArticlesTable 
                articles={filteredArticles}
                loading={loading}
                onEdit={handleOpenModal}
                onDelete={handleDeleteArticle}
            />

            {showModal && (
                <AdminArticlesEditor 
                    article={selectedArticle}
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    onUpload={async (file, field) => {
                        const url = await uploadFile(file);
                        // This callback needs a way to update the editor's inner state
                        // For now we'll handle it inside the editor or via a specific prop
                    }}
                    processing={processing}
                    isDark={isDark}
                />
            )}
        </div>
    );
}
