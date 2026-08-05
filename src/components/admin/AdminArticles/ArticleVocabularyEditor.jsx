import React, { useMemo, useState } from 'react';
import { Copy, Check, AlertCircle, CheckCircle2, Eraser, Wand2, BookMarked } from 'lucide-react';
import { VOCABULARY_JSON_SAMPLE, inspectVocabularyJson } from '../../../utils/articleVocabulary';

/**
 * Daraja lug'ati uchun JSON muharriri — jonli tekshiruv va ko'rinish bilan.
 */
const ArticleVocabularyEditor = ({ level, value, onChange }) => {
    const [copied, setCopied] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const { words, error } = useMemo(() => inspectVocabularyJson(value), [value]);
    const isEmpty = !value.trim();

    const copySample = async () => {
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const prettify = () => {
        if (error || isEmpty) return;
        onChange(JSON.stringify(words, null, 2));
    };

    return (
        <div className="space-y-2.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] p-4 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookMarked size={12} /> Lug&apos;at — {level}
                    </span>
                    {!isEmpty && !error && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={11} /> {words.length} so&apos;z
                        </span>
                    )}
                    {error && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold flex items-center gap-1">
                            <AlertCircle size={11} /> Xato
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={copySample}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/[0.15] text-[10px] font-bold transition-colors"
                    >
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copied ? 'Nusxalandi' : 'Namuna'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange(VOCABULARY_JSON_SAMPLE)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-colors"
                    >
                        Qo&apos;yish
                    </button>
                    <button
                        type="button"
                        onClick={prettify}
                        disabled={isEmpty || !!error}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/[0.15] text-[10px] font-bold transition-colors disabled:opacity-40"
                    >
                        <Wand2 size={12} /> Tartiblash
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        disabled={isEmpty}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[10px] font-bold text-red-500 transition-colors disabled:opacity-40"
                    >
                        <Eraser size={12} /> Tozalash
                    </button>
                </div>
            </div>

            <textarea
                rows={7}
                spellCheck={false}
                className={`w-full bg-white dark:bg-[#252525] rounded-xl px-4 py-3 text-xs font-mono min-h-[110px] text-gray-900 dark:text-gray-100 outline-none border ${
                    error
                        ? 'border-red-500/50 ring-1 ring-red-500/30'
                        : 'border-black/[0.05] dark:border-white/[0.06] focus:ring-2 focus:ring-blue-500/40'
                }`}
                placeholder={`${level} uchun JSON massiv — yoki AI yordamchisidan avtomatik to'ldiring`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />

            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}

            {!error && words.length > 0 && (
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => setShowPreview((s) => !s)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider"
                    >
                        {showPreview ? "Ko'rinishni yopish" : "Ko'rinishni ochish"}
                    </button>
                    {showPreview && (
                        <div className="flex flex-wrap gap-1.5">
                            {words.map((w, i) => (
                                <span
                                    key={`${w.word}-${i}`}
                                    title={[w.partOfSpeech, w.translation].filter(Boolean).join(' · ')}
                                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.06] text-[11px] font-semibold text-gray-700 dark:text-gray-200"
                                >
                                    {w.word}
                                    {w.translation && (
                                        <span className="text-gray-400 font-normal"> — {w.translation}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ArticleVocabularyEditor;
