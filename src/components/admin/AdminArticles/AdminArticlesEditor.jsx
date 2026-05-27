/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Trash2, ImageIcon, Loader2, Copy, Check } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import {
    ARTICLE_LEVELS,
    ARTICLE_LEVEL_META,
    makeEmptyContentBlock,
    makeEmptyArticleLevels,
    normalizeArticleLevels,
    computeReadTimeFromContent,
} from '../../../utils/articleLevels';
import { normalizeArticleCategory } from '../../../utils/articleCategory';
import CategoryHashtagInput from './CategoryHashtagInput';

const VOCABULARY_JSON_SAMPLE = `[
  {
    "word": "sustainable",
    "translation": "barqaror, uzoq muddatli",
    "definition": "Able to continue or be continued for a long time without harming the environment.",
    "example": "Governments are investing in sustainable energy sources.",
    "partOfSpeech": "adjective"
  },
  {
    "word": "breakthrough",
    "translation": "yutuq, muhim kashfiyot",
    "definition": "An important discovery or development that helps solve a problem.",
    "example": "Scientists announced a breakthrough in battery technology.",
    "partOfSpeech": "noun"
  }
]`;

const emptyVocabularyJsonByLevel = () =>
    ARTICLE_LEVELS.reduce((acc, lv) => {
        acc[lv] = '';
        return acc;
    }, {});

const AdminArticlesEditor = ({ article, isOpen, onClose, onSave, onUpload, processing, existingCategories = [] }) => {
    const [uploading, setUploading] = useState(false);
    const [activeEditorLevel, setActiveEditorLevel] = useState('B1');
    const [vocabularyJsonByLevel, setVocabularyJsonByLevel] = useState(emptyVocabularyJsonByLevel);
    const [vocabularyJsonError, setVocabularyJsonError] = useState('');
    const [vocabCopyDone, setVocabCopyDone] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        category: '',
        author: 'IELTS Portal',
        authorAvatar: '',
        imageUrl: '',
        isFeatured: false,
        isMemberOnly: false,
        levels: makeEmptyArticleLevels(),
        quiz: [{ question: '', options: ['', '', '', ''], correct: 0 }],
    });

    const activeLevel = formData.levels[activeEditorLevel];
    const vocabularyJson = vocabularyJsonByLevel[activeEditorLevel] || '';

    useEffect(() => {
        if (article) {
            const levels = normalizeArticleLevels(article);
            setFormData({
                title: article.title || '',
                subtitle: article.subtitle || '',
                category: normalizeArticleCategory(article.category) || '',
                author: article.author || 'IELTS Portal',
                authorAvatar: article.authorAvatar || '',
                imageUrl: article.imageUrl || '',
                isFeatured: article.isFeatured || false,
                isMemberOnly: article.isMemberOnly || false,
                levels,
                quiz: article.quiz || [{ question: '', options: ['', '', '', ''], correct: 0 }],
            });
            setVocabularyJsonByLevel(
                ARTICLE_LEVELS.reduce((acc, lv) => {
                    const vocab = levels[lv]?.vocabulary;
                    acc[lv] = vocab?.length ? JSON.stringify(vocab, null, 2) : '';
                    return acc;
                }, {})
            );
            setVocabularyJsonError('');
        } else if (isOpen && !article) {
            setFormData((prev) => ({
                ...prev,
                levels: makeEmptyArticleLevels(),
            }));
            setVocabularyJsonByLevel(emptyVocabularyJsonByLevel());
            setVocabularyJsonError('');
            setActiveEditorLevel('B1');
        }
    }, [article, isOpen]);

    useEffect(() => {
        if (!activeLevel?.content) return;
        const newReadTime = computeReadTimeFromContent(activeLevel.content);
        setFormData((prev) => {
            const current = prev.levels[activeEditorLevel]?.readTime;
            if (current === newReadTime) return prev;
            return {
                ...prev,
                levels: {
                    ...prev.levels,
                    [activeEditorLevel]: {
                        ...prev.levels[activeEditorLevel],
                        readTime: newReadTime,
                    },
                },
            };
        });
    }, [activeLevel?.content, activeEditorLevel]);

    const updateLevels = (level, patch) => {
        setFormData((prev) => ({
            ...prev,
            levels: {
                ...prev.levels,
                [level]: { ...prev.levels[level], ...patch },
            },
        }));
    };

    const copyVocabularySample = async () => {
        try {
            await navigator.clipboard.writeText(VOCABULARY_JSON_SAMPLE);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = VOCABULARY_JSON_SAMPLE;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setVocabCopyDone(true);
        setTimeout(() => setVocabCopyDone(false), 2000);
    };

    const insertVocabularySample = () => {
        setVocabularyJsonByLevel((prev) => ({
            ...prev,
            [activeEditorLevel]: VOCABULARY_JSON_SAMPLE,
        }));
        setVocabularyJsonError('');
    };

    const parseVocabularyJson = (raw) => {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        } catch {
            throw new Error("JSON noto'g'ri formatda. Qavslarni va vergullarni tekshiring.");
        }
        if (!Array.isArray(parsed)) {
            throw new Error('JSON massiv bo\'lishi kerak: [ { "word": "..." }, ... ]');
        }
        return parsed.map((item, i) => {
            if (!item || typeof item !== 'object') {
                throw new Error(`${i + 1}-element obyekt bo'lishi kerak`);
            }
            if (!item.word?.trim()) {
                throw new Error(`${i + 1}-so'zda majburiy "word" maydoni yo'q`);
            }
            return {
                word: item.word.trim(),
                translation: item.translation?.trim() || '',
                definition: item.definition?.trim() || '',
                example: item.example?.trim() || '',
                partOfSpeech: item.partOfSpeech?.trim() || '',
            };
        });
    };

    const handleSave = (e) => {
        e.preventDefault();
        const category = normalizeArticleCategory(formData.category);
        if (!category) {
            alert("Kategoriya kiriting (# bilan boshlang yoki ro'yxatdan tanlang)");
            return;
        }
        const levels = { ...formData.levels };

        for (const lv of ARTICLE_LEVELS) {
            try {
                const vocabulary = parseVocabularyJson(vocabularyJsonByLevel[lv] || '');
                levels[lv] = {
                    ...levels[lv],
                    vocabulary,
                    readTime: computeReadTimeFromContent(levels[lv].content),
                };
            } catch (err) {
                setVocabularyJsonError(`${lv}: ${err.message}`);
                setActiveEditorLevel(lv);
                return;
            }
        }

        setVocabularyJsonError('');
        onSave({
            title: formData.title,
            subtitle: formData.subtitle,
            category,
            author: formData.author,
            authorAvatar: formData.authorAvatar,
            imageUrl: formData.imageUrl,
            isFeatured: formData.isFeatured,
            isMemberOnly: formData.isMemberOnly,
            quiz: formData.quiz,
            levels,
            readTime: levels.B2.readTime,
            hasLevels: true,
        });
    };

    const addContentBlock = (type) => {
        const content = [...(activeLevel.content || []), makeEmptyContentBlock(type)];
        updateLevels(activeEditorLevel, { content });
    };

    const updateContentBlock = (index, text) => {
        const content = [...activeLevel.content];
        content[index] = { ...content[index], text };
        updateLevels(activeEditorLevel, { content });
    };

    const removeContentBlock = (index) => {
        const content = activeLevel.content.filter((_, i) => i !== index);
        updateLevels(activeEditorLevel, { content: content.length ? content : [makeEmptyContentBlock('paragraph')] });
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await onUpload(file);
            if (url) setFormData((prev) => ({ ...prev, [field]: url }));
        } catch (err) {
            alert('Rasm yuklashda xatolik yuz berdi: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const levelTabClass = (level) => {
        const meta = ARTICLE_LEVEL_META[level];
        const isActive = activeEditorLevel === level;
        const base = 'px-4 py-2 rounded-xl text-xs font-bold transition-all';
        if (!isActive) return `${base} bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400`;
        if (meta.color === 'emerald') return `${base} bg-emerald-600 text-white`;
        if (meta.color === 'violet') return `${base} bg-violet-600 text-white`;
        return `${base} bg-blue-600 text-white`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !processing && !uploading && onClose()}
            />
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.98 }}
                className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
            >
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/2">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {article ? 'Maqolani tahrirlash' : 'Yangi maqola yaratish'}
                        </h2>
                        <p className="text-[11px] text-gray-500 mt-0.5">Har bir daraja uchun alohida matn va lug&apos;at (B1, B2, C1)</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processing || uploading}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Sarlavha</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 font-medium text-gray-900 dark:text-white"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Kategoriya</label>
                                <CategoryHashtagInput
                                    required
                                    value={formData.category}
                                    onChange={(category) => setFormData({ ...formData, category })}
                                    existingCategories={existingCategories}
                                    placeholder="# Kategoriya — yozing yoki tanlang"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Qisqa izoh</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 font-medium text-gray-900 dark:text-white"
                                value={formData.subtitle}
                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cover Image</label>
                            <div className="flex gap-3 items-center">
                                <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-[#252525] flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.imageUrl ? (
                                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <ImageIcon className="text-gray-400" size={20} />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white"
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                />
                                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shrink-0">
                                    {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                                    <span>Yuklash</span>
                                    <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={(e) => handleFileUpload(e, 'imageUrl')} />
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Muallif</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4 items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isMemberOnly} onChange={(e) => setFormData({ ...formData, isMemberOnly: e.target.checked })} />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">PRO</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })} />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Featured</span>
                                </label>
                            </div>
                        </div>

                        {/* Level tabs */}
                        <div className="border-t border-gray-100 dark:border-white/5 pt-4 space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                Daraja (matn + lug&apos;at)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ARTICLE_LEVELS.map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => {
                                            setActiveEditorLevel(level);
                                            setVocabularyJsonError('');
                                        }}
                                        className={levelTabClass(level)}
                                    >
                                        {ARTICLE_LEVEL_META[level].title}
                                        <span className="block text-[10px] font-medium opacity-80 mt-0.5">
                                            {formData.levels[level]?.readTime}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Vocabulary for active level */}
                        <div className="space-y-2 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] p-4 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase">
                                    Lug&apos;at — {activeEditorLevel}
                                </label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={copyVocabularySample} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-[10px] font-bold">
                                        {vocabCopyDone ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        {vocabCopyDone ? 'Nusxalandi' : 'Namuna'}
                                    </button>
                                    <button type="button" onClick={insertVocabularySample} className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 text-[10px] font-bold text-blue-600">
                                        Qo&apos;yish
                                    </button>
                                </div>
                            </div>
                            <textarea
                                rows={8}
                                spellCheck={false}
                                className={`w-full bg-white dark:bg-[#252525] rounded-xl px-4 py-3 text-xs font-mono min-h-[120px] ${
                                    vocabularyJsonError ? 'ring-2 ring-red-500/50' : 'focus:ring-2 focus:ring-blue-500/50'
                                }`}
                                placeholder={`${activeEditorLevel} uchun JSON massiv...`}
                                value={vocabularyJson}
                                onChange={(e) => {
                                    setVocabularyJsonByLevel((prev) => ({
                                        ...prev,
                                        [activeEditorLevel]: e.target.value,
                                    }));
                                    if (vocabularyJsonError) setVocabularyJsonError('');
                                }}
                            />
                            {vocabularyJsonError && <p className="text-xs text-red-500 font-medium">{vocabularyJsonError}</p>}
                        </div>

                        {/* Content for active level */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                                    Maqola matni — {activeEditorLevel}
                                </label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => addContentBlock('heading')} className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px] font-bold">
                                        + Sarlavha
                                    </button>
                                    <button type="button" onClick={() => addContentBlock('paragraph')} className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px] font-bold">
                                        + Paragraf
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(activeLevel?.content || []).map((block, idx) => (
                                    <div key={`${activeEditorLevel}-${idx}`} className="bg-gray-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-black/[0.03] dark:border-white/[0.03]">
                                        <div className="flex gap-3 items-start">
                                            <div className="flex-1 min-w-0">
                                                {block.type === 'heading' ? (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-white dark:bg-[#252525] border rounded-lg px-3 py-2 text-sm font-bold"
                                                        value={block.text}
                                                        onChange={(e) => updateContentBlock(idx, e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="bg-white dark:bg-[#252525] rounded-lg overflow-hidden border">
                                                        <ReactQuill
                                                            theme="snow"
                                                            value={block.text}
                                                            onChange={(content) => updateContentBlock(idx, content)}
                                                            modules={{
                                                                toolbar: [
                                                                    ['bold', 'italic', 'underline', 'strike'],
                                                                    [{ list: 'ordered' }, { list: 'bullet' }],
                                                                    ['clean'],
                                                                ],
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeContentBlock(idx)}
                                                className="p-1.5 bg-red-500/10 text-red-500 rounded-lg self-start mt-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500">
                                Bekor qilish
                            </button>
                            <button
                                type="submit"
                                disabled={processing || uploading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                            >
                                {processing && <Loader2 className="animate-spin" size={14} />}
                                {article ? 'Yangilash' : 'Yaratish'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminArticlesEditor;
