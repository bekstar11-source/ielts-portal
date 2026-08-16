import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion as Motion } from 'framer-motion';
import {
    X, Upload, ImageIcon, Loader2, Sparkles, AlignLeft, ChevronDown, ChevronUp,
    Star, Lock, FileText, Settings2, CheckCircle2, AlertCircle, Copy, User, Link2,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    ARTICLE_LEVELS,
    ARTICLE_LEVEL_META,
    makeEmptyContentBlock,
    makeEmptyArticleLevels,
    normalizeArticleLevels,
    computeReadTimeFromContent,
} from '../../../utils/articleLevels';
import { normalizeArticleCategory } from '../../../utils/articleCategory';
import { parseVocabularyJson, inspectVocabularyJson } from '../../../utils/articleVocabulary';
import { stripHtml } from '../../../utils/textUtils';
import CategoryHashtagInput from './CategoryHashtagInput';
import ArticleContentBlocks from './ArticleContentBlocks';
import ArticleVocabularyEditor from './ArticleVocabularyEditor';

const EMPTY_FORM = {
    title: '',
    subtitle: '',
    category: '',
    author: 'IELTS Portal',
    authorAvatar: '',
    imageUrl: '',
    imageCaption: '',
    isFeatured: false,
    isMemberOnly: false,
};

const emptyVocabularyJsonByLevel = () =>
    ARTICLE_LEVELS.reduce((acc, lv) => {
        acc[lv] = '';
        return acc;
    }, {});

const levelWordCount = (levelData) =>
    (levelData?.content || []).reduce(
        (acc, b) => acc + stripHtml(b?.text || '').split(/\s+/).filter(Boolean).length,
        0
    );

const AdminArticlesEditor = ({ article, isOpen, onClose, onSave, onUpload, processing, existingCategories = [] }) => {
    const [uploadingField, setUploadingField] = useState('');
    const [activeTab, setActiveTab] = useState('meta');
    const [activeEditorLevel, setActiveEditorLevel] = useState('B2');
    const [vocabularyJsonByLevel, setVocabularyJsonByLevel] = useState(emptyVocabularyJsonByLevel);
    const [formError, setFormError] = useState('');

    // AI yordamchisi
    const [rawPasteText, setRawPasteText] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);
    const [showAiHelper, setShowAiHelper] = useState(false);

    const [formData, setFormData] = useState({ ...EMPTY_FORM, levels: makeEmptyArticleLevels() });
    const snapshotRef = useRef('');

    const uploading = Boolean(uploadingField);
    const busy = processing || uploading || aiProcessing;
    const activeLevel = formData.levels[activeEditorLevel];

    /* ---------- Ochilganda formani to'liq qayta yuklash ---------- */
    useEffect(() => {
        if (!isOpen) return;

        const levels = article ? normalizeArticleLevels(article) : makeEmptyArticleLevels();
        // O'qish vaqtini darrov moslashtiramiz — aks holda forma ochilishidayoq "o'zgargan" bo'lib qoladi
        ARTICLE_LEVELS.forEach((lv) => {
            levels[lv].readTime = computeReadTimeFromContent(levels[lv].content);
        });
        const nextForm = article
            ? {
                  title: article.title || '',
                  subtitle: article.subtitle || '',
                  category: normalizeArticleCategory(article.category) || '',
                  author: article.author || 'IELTS Portal',
                  authorAvatar: article.authorAvatar || '',
                  imageUrl: article.imageUrl || '',
                  imageCaption: article.imageCaption || '',
                  isFeatured: article.isFeatured || false,
                  isMemberOnly: article.isMemberOnly || false,
                  levels,
              }
            : { ...EMPTY_FORM, levels };

        const nextVocab = ARTICLE_LEVELS.reduce((acc, lv) => {
            const vocab = levels[lv]?.vocabulary;
            acc[lv] = vocab?.length ? JSON.stringify(vocab, null, 2) : '';
            return acc;
        }, {});

        setFormData(nextForm);
        setVocabularyJsonByLevel(nextVocab);
        snapshotRef.current = JSON.stringify({ form: nextForm, vocab: nextVocab });

        setFormError('');
        setRawPasteText('');
        setShowAiHelper(false);
        setActiveEditorLevel('B2');
        setActiveTab('meta');
    }, [article, isOpen]);

    /* ---------- O'qish vaqtini avtomatik hisoblash ---------- */
    useEffect(() => {
        if (!activeLevel?.content) return;
        const newReadTime = computeReadTimeFromContent(activeLevel.content);
        setFormData((prev) => {
            if (prev.levels[activeEditorLevel]?.readTime === newReadTime) return prev;
            return {
                ...prev,
                levels: {
                    ...prev.levels,
                    [activeEditorLevel]: { ...prev.levels[activeEditorLevel], readTime: newReadTime },
                },
            };
        });
    }, [activeLevel?.content, activeEditorLevel]);

    const isDirty = useCallback(
        () => snapshotRef.current !== JSON.stringify({ form: formData, vocab: vocabularyJsonByLevel }),
        [formData, vocabularyJsonByLevel]
    );

    const requestClose = useCallback(() => {
        if (busy) return;
        if (isDirty() && !window.confirm("Saqlanmagan o'zgarishlar bor. Yopilsinmi?")) return;
        onClose();
    }, [busy, isDirty, onClose]);

    /* ---------- Esc bilan yopish + fonni qulflash ---------- */
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') requestClose();
        };
        document.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, requestClose]);

    const setField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    const updateLevels = (level, patch) => {
        setFormData((prev) => ({
            ...prev,
            levels: { ...prev.levels, [level]: { ...prev.levels[level], ...patch } },
        }));
    };

    /* ---------- Darajalar holati ---------- */
    const levelStats = useMemo(
        () =>
            ARTICLE_LEVELS.reduce((acc, lv) => {
                const words = levelWordCount(formData.levels[lv]);
                const { words: vocab, error } = inspectVocabularyJson(vocabularyJsonByLevel[lv] || '');
                acc[lv] = {
                    words,
                    vocabCount: vocab.length,
                    vocabError: error,
                    ready: words > 0,
                    readTime: formData.levels[lv]?.readTime,
                };
                return acc;
            }, {}),
        [formData.levels, vocabularyJsonByLevel]
    );

    const copyFromLevel = (sourceLevel) => {
        const src = formData.levels[sourceLevel];
        if (!src) return;
        if (!window.confirm(`${sourceLevel} matni va lug'ati ${activeEditorLevel} ustiga ko'chirilsinmi?`)) return;
        updateLevels(activeEditorLevel, {
            content: src.content.map((b) => ({ ...b })),
            readTime: src.readTime,
        });
        setVocabularyJsonByLevel((prev) => ({ ...prev, [activeEditorLevel]: prev[sourceLevel] || '' }));
    };

    /* ---------- AI / tezkor joylash ---------- */
    const mergeOrReplaceContent = (newBlocks) => {
        const existing = activeLevel?.content || [];
        const hasContent = existing.length > 1 || (existing.length === 1 && existing[0]?.text);
        if (hasContent && !window.confirm("Mavjud matn almashtirilsinmi? Bekor qilinsa, oxiriga qo'shiladi.")) {
            return [...existing, ...newBlocks];
        }
        return newBlocks;
    };

    const handleQuickSplit = () => {
        const paragraphs = rawPasteText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
        if (!paragraphs.length) return;
        const newBlocks = paragraphs.map((p) => ({ ...makeEmptyContentBlock('paragraph'), text: p }));
        updateLevels(activeEditorLevel, { content: mergeOrReplaceContent(newBlocks) });
        setRawPasteText('');
        setShowAiHelper(false);
    };

    const handleAiBeautify = async () => {
        if (!rawPasteText.trim()) return;
        setAiProcessing(true);
        setFormError('');
        try {
            const beautifyFn = httpsCallable(getFunctions(), 'beautifyArticle');
            const result = await beautifyFn({ text: rawPasteText, level: activeEditorLevel });

            if (!result.data?.success) {
                setFormError('AI tahririda kutilmagan xatolik yuz berdi.');
                return;
            }
            const { content: newBlocks, vocabulary: newVocab } = result.data;
            updateLevels(activeEditorLevel, { content: mergeOrReplaceContent(newBlocks || []) });
            if (newVocab?.length) {
                setVocabularyJsonByLevel((prev) => ({
                    ...prev,
                    [activeEditorLevel]: JSON.stringify(newVocab, null, 2),
                }));
            }
            setRawPasteText('');
            setShowAiHelper(false);
        } catch (err) {
            console.error(err);
            setFormError('AI tahririda xatolik: ' + err.message);
        } finally {
            setAiProcessing(false);
        }
    };

    /* ---------- Saqlash ---------- */
    const handleSave = (e) => {
        e.preventDefault();
        if (busy) return;

        if (!formData.title.trim()) {
            setFormError('Sarlavha kiriting.');
            setActiveTab('meta');
            return;
        }
        const category = normalizeArticleCategory(formData.category);
        if (!category) {
            setFormError("Kategoriya kiriting (# bilan boshlang yoki ro'yxatdan tanlang).");
            setActiveTab('meta');
            return;
        }

        const levels = { ...formData.levels };
        for (const lv of ARTICLE_LEVELS) {
            try {
                levels[lv] = {
                    ...levels[lv],
                    vocabulary: parseVocabularyJson(vocabularyJsonByLevel[lv] || ''),
                    readTime: computeReadTimeFromContent(levels[lv].content),
                };
            } catch (err) {
                setFormError(`${lv} lug'ati: ${err.message}`);
                setActiveTab('content');
                setActiveEditorLevel(lv);
                return;
            }
        }

        const emptyLevels = ARTICLE_LEVELS.filter((lv) => !levelStats[lv].ready);
        if (emptyLevels.length === ARTICLE_LEVELS.length) {
            setFormError('Kamida bitta daraja uchun matn kiriting.');
            setActiveTab('content');
            return;
        }
        if (emptyLevels.length && !window.confirm(`${emptyLevels.join(', ')} darajasi bo'sh. Shunday saqlansinmi?`)) {
            setActiveTab('content');
            setActiveEditorLevel(emptyLevels[0]);
            return;
        }

        setFormError('');
        onSave({
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim(),
            category,
            author: formData.author.trim() || 'IELTS Portal',
            authorAvatar: formData.authorAvatar,
            imageUrl: formData.imageUrl,
            imageCaption: formData.imageCaption.trim(),
            isFeatured: formData.isFeatured,
            isMemberOnly: formData.isMemberOnly,
            levels,
            readTime: levels.B2.readTime,
            hasLevels: true,
        });
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setUploadingField(field);
        try {
            const url = await onUpload(file);
            if (url) setField(field, url);
        } catch (err) {
            setFormError('Rasm yuklashda xatolik: ' + err.message);
        } finally {
            setUploadingField('');
        }
    };

    if (!isOpen) return null;

    const levelTabClass = (level) => {
        const meta = ARTICLE_LEVEL_META[level];
        const isActive = activeEditorLevel === level;
        const base = 'relative px-3 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition-all text-left min-w-[96px] sm:min-w-[112px]';
        if (!isActive) {
            return `${base} bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-warm-on-dark-soft hover:bg-gray-200 dark:hover:bg-white/10`;
        }
        const tone =
            meta.color === 'emerald' ? 'bg-emerald-600' : meta.color === 'violet' ? 'bg-violet-600' : 'bg-blue-600';
        return `${base} ${tone} text-white shadow-lg shadow-black/10`;
    };

    const tabClass = (tab) =>
        `px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === tab
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`;

    const inputClass =
        'w-full bg-gray-50 dark:bg-[#252320] border border-transparent focus:border-blue-500/40 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/30 font-medium text-gray-900 dark:text-white outline-none transition-all';

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={requestClose}
            />
            <Motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                className="relative w-full max-w-4xl h-[94dvh] sm:h-[92dvh] bg-white dark:bg-[#1f1e1b] rounded-t-3xl sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-3 sm:px-6 py-3 sm:py-3.5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center gap-2 sm:gap-4 bg-gray-50/60 dark:bg-white/[0.02]">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                            {article ? 'Maqolani tahrirlash' : 'Yangi maqola'}
                        </h2>
                        <p className="text-[11px] text-gray-500 truncate">
                            {formData.title || "Sarlavha kiritilmagan"}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-white/5 shrink-0">
                        <button type="button" className={tabClass('meta')} onClick={() => setActiveTab('meta')}>
                            <Settings2 size={13} /> <span className="hidden sm:inline">Ma&apos;lumot</span>
                        </button>
                        <button type="button" className={tabClass('content')} onClick={() => setActiveTab('content')}>
                            <FileText size={13} /> <span className="hidden sm:inline">Kontent</span>
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={busy}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 shrink-0 disabled:opacity-40"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar overscroll-contain">
                        {/* ------------ TAB: MA'LUMOT ------------ */}
                        {activeTab === 'meta' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                            Sarlavha *
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            placeholder="Maqola sarlavhasi"
                                            value={formData.title}
                                            onChange={(e) => setField('title', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                            Kategoriya *
                                        </label>
                                        <CategoryHashtagInput
                                            value={formData.category}
                                            onChange={(category) => setField('category', category)}
                                            existingCategories={existingCategories}
                                            placeholder="# Kategoriya — yozing yoki tanlang"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                        Qisqa izoh
                                    </label>
                                    <textarea
                                        rows={2}
                                        maxLength={220}
                                        className={`${inputClass} resize-none`}
                                        placeholder="Ro'yxatda va feedda ko'rinadigan qisqa tavsif"
                                        value={formData.subtitle}
                                        onChange={(e) => setField('subtitle', e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-400 text-right pr-1">
                                        {formData.subtitle.length}/220
                                    </p>
                                </div>

                                {/* Cover */}
                                <div className="space-y-2 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] p-4 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                        Muqova rasmi
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="w-full sm:w-40 h-24 rounded-xl bg-gray-100 dark:bg-[#252320] flex items-center justify-center overflow-hidden shrink-0 border border-black/[0.04] dark:border-white/[0.05]">
                                            {formData.imageUrl ? (
                                                <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Muqova" />
                                            ) : (
                                                <ImageIcon className="text-gray-300 dark:text-warm-muted" size={26} />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <input
                                                        type="text"
                                                        className={`${inputClass} pl-9 text-xs`}
                                                        placeholder="https://... yoki yuklang"
                                                        value={formData.imageUrl}
                                                        onChange={(e) => setField('imageUrl', e.target.value)}
                                                    />
                                                </div>
                                                <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl flex items-center gap-1.5 font-bold text-xs shrink-0 transition-colors">
                                                    {uploadingField === 'imageUrl' ? (
                                                        <Loader2 className="animate-spin" size={14} />
                                                    ) : (
                                                        <Upload size={14} />
                                                    )}
                                                    <span>Yuklash</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        disabled={uploading}
                                                        onChange={(e) => handleFileUpload(e, 'imageUrl')}
                                                    />
                                                </label>
                                            </div>
                                            <input
                                                type="text"
                                                className={`${inputClass} text-xs`}
                                                placeholder="Rasm izohi (ixtiyoriy) — maqolada rasm ostida chiqadi"
                                                value={formData.imageCaption}
                                                onChange={(e) => setField('imageCaption', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Muallif */}
                                <div className="space-y-2 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] p-4 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                        Muallif
                                    </label>
                                    <div className="flex gap-3 items-center">
                                        <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#252320] flex items-center justify-center overflow-hidden shrink-0 border border-black/[0.04] dark:border-white/[0.05]">
                                            {formData.authorAvatar ? (
                                                <img src={formData.authorAvatar} className="w-full h-full object-cover" alt="Muallif" />
                                            ) : (
                                                <User className="text-gray-300 dark:text-warm-muted" size={18} />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            className={`${inputClass} flex-1`}
                                            placeholder="Muallif ismi"
                                            value={formData.author}
                                            onChange={(e) => setField('author', e.target.value)}
                                        />
                                        <label className="cursor-pointer bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/[0.15] text-gray-700 dark:text-warm-on-dark-soft px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shrink-0 transition-colors">
                                            {uploadingField === 'authorAvatar' ? (
                                                <Loader2 className="animate-spin" size={14} />
                                            ) : (
                                                <Upload size={14} />
                                            )}
                                            <span className="hidden sm:inline">Avatar</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                disabled={uploading}
                                                onChange={(e) => handleFileUpload(e, 'authorAvatar')}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Ko'rinish sozlamalari */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setField('isMemberOnly', !formData.isMemberOnly)}
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                            formData.isMemberOnly
                                                ? 'border-yellow-500/40 bg-yellow-500/10'
                                                : 'border-black/[0.05] dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] hover:border-black/10'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl ${formData.isMemberOnly ? 'bg-yellow-500 text-black' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                            <Lock size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Faqat PRO</p>
                                            <p className="text-[10px] text-gray-500">Obunachilar uchun</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setField('isFeatured', !formData.isFeatured)}
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                            formData.isFeatured
                                                ? 'border-blue-500/40 bg-blue-500/10'
                                                : 'border-black/[0.05] dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] hover:border-black/10'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl ${formData.isFeatured ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                            <Star size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Tavsiya etilgan</p>
                                            <p className="text-[10px] text-gray-500">Bosh sahifada ajratiladi</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ------------ TAB: KONTENT ------------ */}
                        {activeTab === 'content' && (
                            <div className="space-y-4">
                                {/* Daraja tanlovi */}
                                <div className="flex flex-wrap gap-2">
                                    {ARTICLE_LEVELS.map((level) => {
                                        const stat = levelStats[level];
                                        return (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setActiveEditorLevel(level)}
                                                className={levelTabClass(level)}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    {ARTICLE_LEVEL_META[level].title}
                                                    {stat.vocabError ? (
                                                        <AlertCircle size={12} className="text-red-400" />
                                                    ) : stat.ready ? (
                                                        <CheckCircle2 size={12} className={activeEditorLevel === level ? 'opacity-90' : 'text-emerald-500'} />
                                                    ) : null}
                                                </span>
                                                <span className="block text-[10px] font-medium opacity-75 mt-0.5">
                                                    {stat.words} so&apos;z · {stat.vocabCount} lug&apos;at
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Boshqa darajadan ko'chirish */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Nusxa olish:
                                    </span>
                                    {ARTICLE_LEVELS.filter((lv) => lv !== activeEditorLevel).map((lv) => (
                                        <button
                                            key={lv}
                                            type="button"
                                            disabled={!levelStats[lv].ready}
                                            onClick={() => copyFromLevel(lv)}
                                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-[10px] font-bold text-gray-600 dark:text-warm-on-dark-soft flex items-center gap-1 transition-colors disabled:opacity-40 disabled:hover:bg-gray-100"
                                        >
                                            <Copy size={11} /> {lv} → {activeEditorLevel}
                                        </button>
                                    ))}
                                </div>

                                {/* AI yordamchisi */}
                                <div className="rounded-2xl border border-blue-500/20 dark:border-blue-500/25 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 p-4 space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAiHelper((s) => !s)}
                                        className="w-full flex items-center justify-between font-bold text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wider hover:opacity-85 transition-opacity"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sparkles size={15} />
                                            AI yordamchisi — {activeEditorLevel}
                                        </span>
                                        {showAiHelper ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {showAiHelper && (
                                        <div className="space-y-3 pt-3 border-t border-blue-500/10">
                                            <p className="text-[11px] text-gray-500 dark:text-warm-on-dark-soft">
                                                Matnni joylang: oddiy paragraflarga ajrating yoki AI orqali {activeEditorLevel} darajasiga
                                                moslashtiring — lug&apos;at ham avtomatik yaratiladi.
                                            </p>
                                            <textarea
                                                rows={6}
                                                className="w-full bg-white dark:bg-[#252320] border border-blue-500/10 rounded-xl px-4 py-3 text-xs placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 text-gray-900 dark:text-white outline-none"
                                                placeholder="Maqolaning to'liq matnini shu yerga joylang..."
                                                value={rawPasteText}
                                                onChange={(e) => setRawPasteText(e.target.value)}
                                                disabled={aiProcessing}
                                            />
                                            <div className="flex flex-wrap gap-2 justify-between items-center">
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {rawPasteText.split(/\s+/).filter(Boolean).length} so&apos;z
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleQuickSplit}
                                                        disabled={aiProcessing || !rawPasteText.trim()}
                                                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-warm-on-dark-soft font-bold text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-40"
                                                    >
                                                        <AlignLeft size={14} /> Paragraflarga ajratish
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAiBeautify}
                                                        disabled={aiProcessing || !rawPasteText.trim()}
                                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 disabled:opacity-40"
                                                    >
                                                        {aiProcessing ? (
                                                            <>
                                                                <Loader2 className="animate-spin" size={14} /> AI ishlamoqda...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles size={14} /> AI bilan tayyorlash
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <ArticleVocabularyEditor
                                    level={activeEditorLevel}
                                    value={vocabularyJsonByLevel[activeEditorLevel] || ''}
                                    onChange={(val) =>
                                        setVocabularyJsonByLevel((prev) => ({ ...prev, [activeEditorLevel]: val }))
                                    }
                                />

                                <ArticleContentBlocks
                                    blocks={activeLevel?.content || []}
                                    onChange={(content) => updateLevels(activeEditorLevel, { content })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            {formError ? (
                                <p className="text-[11px] font-bold text-red-500 flex items-center gap-1.5">
                                    <AlertCircle size={13} /> {formError}
                                </p>
                            ) : (
                                <p className="text-[11px] text-gray-400 font-medium truncate">
                                    {ARTICLE_LEVELS.map((lv) => `${lv}: ${levelStats[lv].words} so'z`).join('  ·  ')}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={requestClose}
                                disabled={busy}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="submit"
                                disabled={busy}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {processing && <Loader2 className="animate-spin" size={14} />}
                                {article ? 'Yangilash' : 'Yaratish'}
                            </button>
                        </div>
                    </div>
                </form>
            </Motion.div>
        </div>
    );
};

export default AdminArticlesEditor;
