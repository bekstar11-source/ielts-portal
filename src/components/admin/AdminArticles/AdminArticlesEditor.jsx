import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus, Trash2, Sparkles, Star, ImageIcon, Loader2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';

const AdminArticlesEditor = ({ 
    article, isOpen, onClose, onSave, onUpload, processing, isDark 
}) => {
    const [uploading, setUploading] = useState(false);
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
            ? { fontSize: 24, lineHeight: 1.2, marginTop: 24, marginBottom: 12, fontWeight: '700', letterSpacing: '-0.01em' }
            : { fontSize: 16, lineHeight: 1.6, marginTop: 0, marginBottom: 16, fontWeight: '400', letterSpacing: '0' };
            
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

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await onUpload(file);
            if (url) {
                setFormData(prev => ({
                    ...prev,
                    [field]: url
                }));
            }
        } catch (err) {
            alert("Rasm yuklashda xatolik yuz berdi: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !processing && !uploading && onClose()}
            />
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.98 }}
                className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Compact Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/2">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {article ? "Maqolani tahrirlash" : "Yangi maqola yaratish"}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={processing || uploading} 
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-5">
                        
                        {/* Grid Row 1: Title & Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Sarlavha</label>
                                <input 
                                    required type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                                    placeholder="Masalan: The Future of AI in Education"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Kategoriya</label>
                                <input 
                                    required type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                                    placeholder="Masalan: Science & Technology"
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Grid Row 2: Subtitle / Excerpt */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Qisqa izoh (Excerpt)</label>
                            <input 
                                type="text"
                                className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                                placeholder="Maqola ro'yxatida ko'rinadigan qisqa izoh (maksimal 150 ta belgi)..."
                                value={formData.subtitle}
                                onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                            />
                        </div>

                        {/* Grid Row 3: Cover Image Section */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Asosiy rasm (Cover Image)</label>
                            <div className="flex gap-3 items-center">
                                {/* Thumbnail Preview */}
                                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 dark:bg-[#252525] dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.imageUrl ? (
                                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="preview" />
                                    ) : (
                                        <ImageIcon className="text-gray-400" size={20} />
                                    )}
                                </div>
                                <input 
                                    type="text"
                                    className="flex-1 bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                                    placeholder="Rasm manzili (URL) yoki yuklang..."
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                                />
                                <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-bold text-xs transition-all shrink-0 active:scale-95">
                                    {uploading ? (
                                        <Loader2 className="animate-spin text-white" size={14} />
                                    ) : (
                                        <Upload size={14} />
                                    )}
                                    <span>{uploading ? "Yuklanmoqda..." : "Yuklash"}</span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        disabled={uploading}
                                        onChange={(e) => handleFileUpload(e, 'imageUrl')} 
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Settings Row: Read Time, Author, Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">O'qish vaqti</label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                                    value={formData.readTime}
                                    onChange={(e) => setFormData({...formData, readTime: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Muallif</label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                                    value={formData.author}
                                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-4 items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        checked={formData.isMemberOnly}
                                        onChange={(e) => setFormData({...formData, isMemberOnly: e.target.checked})}
                                    />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">PRO a'zolar</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        checked={formData.isFeatured}
                                        onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                                    />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Featured</span>
                                </label>
                            </div>
                        </div>

                        {/* Content Blocks Section */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center border-t border-gray-100 dark:border-white/5 pt-4">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Maqola matni</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => addContentBlock('heading')} 
                                        className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                    >
                                        + Sarlavha
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => addContentBlock('paragraph')} 
                                        className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                    >
                                        + Paragraf
                                    </button>
                                </div>
                            </div>

                            {/* Rendered Blocks */}
                            <div className="space-y-3">
                                {formData.content.map((block, idx) => (
                                    <div key={idx} className="relative group bg-gray-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-black/[0.03] dark:border-white/[0.03]">
                                        <div className="flex gap-3 items-start">
                                            <div className="flex-1 min-w-0">
                                                {block.type === 'heading' ? (
                                                    <div>
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase block mb-1">Sarlavha</span>
                                                        <input 
                                                            type="text"
                                                            className="w-full bg-white dark:bg-[#252525] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 py-2 text-sm font-bold text-gray-900 dark:text-white"
                                                            value={block.text}
                                                            onChange={(e) => updateContentBlock(idx, e.target.value)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Paragraf matni</span>
                                                        <div className="bg-white dark:bg-[#252525] rounded-lg overflow-hidden border border-black/[0.05] dark:border-white/[0.05]">
                                                            <ReactQuill 
                                                                theme="snow"
                                                                value={block.text}
                                                                onChange={(content) => updateContentBlock(idx, content)}
                                                                modules={{
                                                                    toolbar: [
                                                                        ['bold', 'italic', 'underline', 'strike'],
                                                                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                                                        ['clean']
                                                                    ]
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => removeContentBlock(idx)} 
                                                className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition-all self-start mt-5"
                                                title="Blockni o'chirish"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-2">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                            >
                                Bekor qilish
                            </button>
                            <button 
                                type="submit" 
                                disabled={processing || uploading} 
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 transition-all flex items-center gap-1.5 active:scale-95"
                            >
                                {processing && <Loader className="animate-spin" size={14} />}
                                <span>{article ? "Maqolani yangilash" : "Maqolani yaratish"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

const Loader = ({ size, className }) => <Sparkles size={size} className={className} />;

export default AdminArticlesEditor;
