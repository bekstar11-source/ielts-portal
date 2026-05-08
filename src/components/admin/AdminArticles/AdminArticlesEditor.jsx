import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus, Trash2, Bold, Sparkles, User, Star, ImageIcon } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';

const AdminArticlesEditor = ({ 
    article, isOpen, onClose, onSave, onUpload, processing, isDark 
}) => {
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
        content: [{ 
            type: 'paragraph', 
            text: "",
            style: { fontSize: 18, lineHeight: 1.8, marginTop: 0, marginBottom: 32, fontWeight: '400', letterSpacing: '0' }
        }],
        quiz: [{ question: "", options: ["", "", "", ""], correct: 0 }]
    });

    useEffect(() => {
        if (article) {
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
        }
    }, [article, isOpen]);

    const handleSave = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const addContentBlock = (type) => {
        const defaultStyle = type === 'heading' 
            ? { fontSize: 32, lineHeight: 1.2, marginTop: 40, marginBottom: 20, fontWeight: '700', letterSpacing: '-0.02em' }
            : { fontSize: 18, lineHeight: 1.8, marginTop: 0, marginBottom: 32, fontWeight: '400', letterSpacing: '0' };
            
        setFormData(prev => ({
            ...prev,
            content: [...prev.content, { type, text: "", style: defaultStyle }]
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

    const updateQuiz = (index, field, value, optIndex = null) => {
        const newQuiz = [...formData.quiz];
        if (optIndex !== null) newQuiz[index].options[optIndex] = value;
        else newQuiz[index][field] = value;
        setFormData(prev => ({ ...prev, quiz: newQuiz }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => !processing && onClose()}
            />
            <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                className="relative w-full max-w-5xl max-h-full bg-white dark:bg-[#1E1E1E] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/2">
                    <div>
                        <h2 className="text-xl font-bold">{article ? "Maqolani tahrirlash" : "Yangi maqola yaratish"}</h2>
                        <p className="text-xs text-gray-500">Barcha ma'lumotlarni to'ldiring</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-8">
                        {/* Basic Info (Title, Category, Subtitle) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sarlavha</label>
                                <input 
                                    required type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                    placeholder="Masalan: The Future of AI in Education"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Kategoriya</label>
                                <input 
                                    required type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                    placeholder="Masalan: Science & Technology"
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Image & Author - Simplified for this module */}
                        <div className="space-y-2">
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
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => onUpload(e.target.files[0], 'imageUrl')} />
                                </label>
                            </div>
                        </div>

                        {/* Content Blocks */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Maqola matni</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => addContentBlock('heading')} className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] font-bold transition-all">+ Sarlavha</button>
                                    <button type="button" onClick={() => addContentBlock('paragraph')} className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] font-bold transition-all">+ Paragraf</button>
                                </div>
                            </div>
                            <div className="space-y-6">
                                {formData.content.map((block, idx) => (
                                    <div key={idx} className="relative group bg-gray-50/30 dark:bg-white/[0.02] p-4 rounded-3xl border border-black/[0.03] dark:border-white/[0.03]">
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-1">
                                                {block.type === 'heading' ? (
                                                    <input 
                                                        type="text"
                                                        className="w-full bg-white dark:bg-[#252525] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 py-3 text-lg font-bold"
                                                        value={block.text}
                                                        onChange={(e) => updateContentBlock(idx, e.target.value)}
                                                    />
                                                ) : (
                                                    <ReactQuill 
                                                        theme="snow"
                                                        className="bg-white dark:bg-[#252525] rounded-xl overflow-hidden"
                                                        value={block.text}
                                                        onChange={(content) => updateContentBlock(idx, content)}
                                                    />
                                                )}
                                            </div>
                                            <button type="button" onClick={() => removeContentBlock(idx)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Bekor qilish</button>
                            <button type="submit" disabled={processing} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                                {processing && <Loader2 className="animate-spin" size={18} />}
                                <span>{article ? "Maqolani yangilash" : "Maqolani yaratish"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

const Loader2 = ({ size, className }) => <Sparkles size={size} className={className} />;

export default AdminArticlesEditor;
