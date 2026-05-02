import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebase";
import { 
    Plus, Search, Edit2, Trash2, BookOpen, 
    ChevronRight, X, Save, Layout, List, 
    Type, MessageSquare, CheckCircle2, Trash,
    Upload, ImageIcon, Loader2
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminArticles() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        subtitle: "",
        category: "",
        author: "IELTS Portal",
        authorAvatar: "",
        imageUrl: "",
        readTime: "5 min read",
        isFeatured: false,
        isMemberOnly: false,
        content: [{ type: 'paragraph', text: "" }],
        quiz: [{ question: "", options: ["", "", "", ""], correct: 0 }]
    });

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

    const handleOpenModal = (article = null) => {
        if (article) {
            setEditingArticle(article);
            setFormData({
                title: article.title || "",
                subtitle: article.subtitle || "",
                category: article.category || "",
                author: article.author || "IELTS Portal",
                authorAvatar: article.authorAvatar || "",
                imageUrl: article.imageUrl || "",
                readTime: article.readTime || "5 min read",
                isFeatured: article.isFeatured || false,
                isMemberOnly: article.isMemberOnly || false,
                content: article.content || [{ type: 'paragraph', text: "" }],
                quiz: article.quiz || [{ question: "", options: ["", "", "", ""], correct: 0 }]
            });
        } else {
            setEditingArticle(null);
            setFormData({
                title: "",
                subtitle: "",
                category: "",
                author: "IELTS Portal",
                authorAvatar: "",
                imageUrl: "",
                readTime: "5 min read",
                isFeatured: false,
                isMemberOnly: false,
                content: [{ type: 'paragraph', text: "" }],
                quiz: [{ question: "", options: ["", "", "", ""], correct: 0 }]
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const data = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (editingArticle) {
                await updateDoc(doc(db, "articles", editingArticle.id), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, "articles"), data);
            }
            
            await fetchArticles();
            setShowModal(false);
        } catch (err) {
            alert("Xato yuz berdi: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Haqiqatan ham ushbu maqolani o'chirmoqchimisiz?")) return;
        try {
            await deleteDoc(doc(db, "articles", id));
            setArticles(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            alert("Xato yuz berdi: " + err.message);
        }
    };

    // Form helpers
    const addContentBlock = (type) => {
        setFormData(prev => ({
            ...prev,
            content: [...prev.content, { type, text: "" }]
        }));
    };

    const updateContentBlock = (index, text) => {
        const newContent = [...formData.content];
        newContent[index].text = text;
        setFormData(prev => ({ ...prev, content: newContent }));
    };

    const removeContentBlock = (index) => {
        setFormData(prev => ({
            ...prev,
            content: prev.content.filter((_, i) => i !== index)
        }));
    };

    const addQuizQuestion = () => {
        setFormData(prev => ({
            ...prev,
            quiz: [...prev.quiz, { question: "", options: ["", "", "", ""], correct: 0 }]
        }));
    };

    const updateQuiz = (index, field, value, optIndex = null) => {
        const newQuiz = [...formData.quiz];
        if (optIndex !== null) {
            newQuiz[index].options[optIndex] = value;
        } else {
            newQuiz[index][field] = value;
        }
        setFormData(prev => ({ ...prev, quiz: newQuiz }));
    };

    const filteredArticles = articles.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileUpload = async (file, field) => {
        if (!file) return;
        setProcessing(true);
        try {
            const storageRef = ref(storage, `articles/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                null,
                (error) => {
                    alert("Yuklashda xato: " + error.message);
                    setProcessing(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setFormData(prev => ({ ...prev, [field]: downloadURL }));
                    setProcessing(false);
                }
            );
        } catch (err) {
            alert("Xato: " + err.message);
            setProcessing(false);
        }
    };

    return (
        <div className="flex-1 space-y-6">
            {/* Header Area */}
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

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-[24px] border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jami maqolalar</p>
                            <p className="text-2xl font-bold">{articles.length}</p>
                        </div>
                    </div>
                </div>
                {/* Additional stats can be added here */}
            </div>

            {/* Filter & Search */}
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

            {/* Articles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {loading ? (
                        [1,2,3].map(i => (
                            <div key={i} className="h-64 bg-white dark:bg-[#1E1E1E] rounded-[32px] border border-gray-100 dark:border-white/5 animate-pulse" />
                        ))
                    ) : filteredArticles.length > 0 ? (
                        filteredArticles.map((article) => (
                            <motion.div 
                                key={article.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group bg-white dark:bg-[#1E1E1E] rounded-[32px] border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 flex flex-col"
                            >
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            {article.category}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenModal(article)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(article.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {article.title}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-2 mb-4">
                                        <span>{article.author}</span>
                                        <span>•</span>
                                        <span>{article.readTime}</span>
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                        <MessageSquare size={12} />
                                        <span>{article.quiz?.length || 0} questions</span>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
                                    <button 
                                        onClick={() => handleOpenModal(article)}
                                        className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                                    >
                                        Tahrirlash <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                <BookOpen size={40} />
                            </div>
                            <p className="text-gray-500 font-medium">Hozircha maqolalar yo'q.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal - Full Screen or Large */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => !processing && setShowModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            className="relative w-full max-w-5xl max-h-full bg-white dark:bg-[#1E1E1E] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/2">
                                <div>
                                    <h2 className="text-xl font-bold">{editingArticle ? "Maqolani tahrirlash" : "Yangi maqola yaratish"}</h2>
                                    <p className="text-xs text-gray-500">Barcha ma'lumotlarni to'ldiring</p>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                <form onSubmit={handleSave} className="space-y-8">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sarlavha</label>
                                            <input 
                                                required
                                                type="text"
                                                className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                placeholder="Masalan: The Future of AI in Education"
                                                value={formData.title}
                                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Kategoriya</label>
                                            <input 
                                                required
                                                type="text"
                                                className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                placeholder="Masalan: Science & Technology"
                                                value={formData.category}
                                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-full">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sub-sarlavha (Medium style)</label>
                                            <input 
                                                type="text"
                                                className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                placeholder="Masalan: To love means being open to heartbreak"
                                                value={formData.subtitle}
                                                onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-full">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Asosiy rasm (Cover Image)</label>
                                            <div className="flex gap-3">
                                                <input 
                                                    type="text"
                                                    className="flex-1 bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                    placeholder="URL yoki rasm yuklang..."
                                                    value={formData.imageUrl}
                                                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                                                />
                                                <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-5 py-3.5 rounded-2xl flex items-center gap-2 font-bold transition-all shrink-0">
                                                    <Upload size={18} />
                                                    <span>Yuklash</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e.target.files[0], 'imageUrl')}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Muallif ismi</label>
                                                <input 
                                                    type="text"
                                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                    value={formData.author}
                                                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Muallif Avatar</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text"
                                                        className="flex-1 bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                        placeholder="Avatar URL..."
                                                        value={formData.authorAvatar}
                                                        onChange={(e) => setFormData({...formData, authorAvatar: e.target.value})}
                                                    />
                                                    <label className="cursor-pointer bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 p-3.5 rounded-2xl transition-all shrink-0">
                                                        <Upload size={18} />
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*"
                                                            onChange={(e) => handleFileUpload(e.target.files[0], 'authorAvatar')}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">O'qish vaqti</label>
                                            <input 
                                                type="text"
                                                className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                value={formData.readTime}
                                                onChange={(e) => setFormData({...formData, readTime: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex items-center gap-6 mt-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={formData.isFeatured}
                                                    onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                                                />
                                                <span className="text-sm font-bold">Featured (Yulduzcha)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={formData.isMemberOnly}
                                                    onChange={(e) => setFormData({...formData, isMemberOnly: e.target.checked})}
                                                />
                                                <span className="text-sm font-bold">Member-only story</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Content Editor */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Maqola matni</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => addContentBlock('heading')}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                                >
                                                    + Sarlavha
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => addContentBlock('paragraph')}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                                >
                                                    + Paragraf
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {formData.content.map((block, idx) => (
                                                <div key={idx} className="relative group">
                                                    {block.type === 'heading' ? (
                                                        <div className="flex gap-4">
                                                            <div className="w-1 bg-blue-500 rounded-full" />
                                                            <input 
                                                                type="text"
                                                                placeholder="Blok sarlavhasi..."
                                                                className="flex-1 bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-blue-500/50 transition-all"
                                                                value={block.text}
                                                                onChange={(e) => updateContentBlock(idx, e.target.value)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <textarea 
                                                            placeholder="Paragraf matni..."
                                                            className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500/50 transition-all leading-relaxed"
                                                            value={block.text}
                                                            onChange={(e) => updateContentBlock(idx, e.target.value)}
                                                        />
                                                    )}
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeContentBlock(idx)}
                                                        className="absolute -right-2 -top-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quiz Section */}
                                    <div className="space-y-4 pt-8 border-t border-gray-100 dark:border-white/5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Kichik test (Quiz)</label>
                                            <button 
                                                type="button" 
                                                onClick={addQuizQuestion}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-blue-600/20"
                                            >
                                                + Savol qo'shish
                                            </button>
                                        </div>
                                        <div className="space-y-8">
                                            {formData.quiz.map((q, qIdx) => (
                                                <div key={qIdx} className="p-6 bg-gray-50 dark:bg-[#252525] rounded-3xl space-y-4 border border-black/[0.02]">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[10px] font-bold text-gray-400">SAVOL {qIdx + 1}</label>
                                                            {formData.quiz.length > 1 && (
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setFormData({...formData, quiz: formData.quiz.filter((_, i) => i !== qIdx)})}
                                                                    className="text-red-500 hover:text-red-600 transition-colors"
                                                                >
                                                                    <Trash size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input 
                                                            type="text"
                                                            className="w-full bg-white dark:bg-[#1E1E1E] border-none rounded-xl px-4 py-3 text-sm font-bold"
                                                            placeholder="Savolni kiriting..."
                                                            value={q.question}
                                                            onChange={(e) => updateQuiz(qIdx, 'question', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {q.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className="flex gap-2">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => updateQuiz(qIdx, 'correct', optIdx)}
                                                                    className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all ${q.correct === optIdx ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white dark:bg-[#1E1E1E] text-gray-400'}`}
                                                                >
                                                                    {optIdx + 1}
                                                                </button>
                                                                <input 
                                                                    type="text"
                                                                    className="flex-1 bg-white dark:bg-[#1E1E1E] border-none rounded-xl px-4 py-2 text-xs"
                                                                    placeholder={`Variant ${optIdx + 1}`}
                                                                    value={opt}
                                                                    onChange={(e) => updateQuiz(qIdx, 'options', e.target.value, optIdx)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/5 transition-all"
                                >
                                    Bekor qilish
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={processing}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                                >
                                    {processing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    <span>Saqlash</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
