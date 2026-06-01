import React, { useState } from 'react';
import { X, Sparkles, Loader2, Save } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export default function AddWordModal({ isOpen, onClose, onAdd, isDark }) {
    const { t } = useTranslation();
    const [word, setWord] = useState('');
    const [translation, setTranslation] = useState('');
    const [definition, setDefinition] = useState('');
    const [example, setExample] = useState('');
    const [useAI, setUseAI] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!word.trim()) return alert("So'zni yozing");

        setIsSubmitting(true);
        try {
            await onAdd({
                word: word.trim(),
                translation: useAI ? '' : translation.trim(),
                definition: useAI ? '' : definition.trim(),
                example: useAI ? '' : example.trim(),
                hasAI: !useAI // If useAI is false, it already has user fields (no need for AI generation)
            });
            // Clear inputs
            setWord('');
            setTranslation('');
            setDefinition('');
            setExample('');
            setUseAI(true);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Body */}
            <div className={`relative w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-2xl transition-all duration-300 transform scale-100 z-10
                ${isDark 
                    ? 'bg-[#1c1c1e] border-white/10 text-white' 
                    : 'bg-white border-gray-150 text-gray-900'
                }`}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className={`absolute right-4 top-4 p-2 rounded-full transition-colors
                        ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Title */}
                <div className="mb-6 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#FB5102]/10 text-[#FB5102]' : 'bg-[#FB5102]/10 text-[#FB5102]'}`}>
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-xl font-bold">
                        {useAI ? "Yangi so'z (AI yordamida)" : "Yangi so'z qo'shish"}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Word Input */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Inglizcha so'z / ibora *
                        </label>
                        <input 
                            type="text" 
                            required
                            placeholder="Masalan: Abandon"
                            value={word}
                            onChange={(e) => setWord(e.target.value)}
                            className={`w-full border outline-none rounded-xl py-3 px-4 text-sm transition-all 
                                ${isDark 
                                    ? 'bg-black/20 border-white/10 focus:border-[#FB5102]/40 text-white focus:bg-black/35' 
                                    : 'bg-[#f5f5f7] border-transparent focus:bg-white focus:border-[#FB5102]/30 text-gray-900'
                                }`}
                        />
                    </div>

                    {/* AI Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-dashed dark:border-white/10 border-gray-200 bg-orange-500/[0.02] dark:bg-orange-500/[0.04]">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#FB5102]" />
                            <div className="text-left">
                                <p className="text-xs font-bold">AI orqali to'ldirish</p>
                                <p className="text-[10px] text-gray-500">Tarjima, ta'rif va misollarni AI yozib beradi</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setUseAI(!useAI)}
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none 
                                ${useAI ? 'bg-[#FB5102]' : 'bg-gray-300 dark:bg-white/10'}`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ${useAI ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>

                    {/* Manual inputs shown only when AI is OFF */}
                    {!useAI && (
                        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                            {/* Translation */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    O'zbekcha tarjimasi
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Masalan: Tark etmoq, tashlab ketmoq"
                                    value={translation}
                                    onChange={(e) => setTranslation(e.target.value)}
                                    className={`w-full border outline-none rounded-xl py-3 px-4 text-sm transition-all 
                                        ${isDark 
                                            ? 'bg-black/20 border-white/10 focus:border-[#FB5102]/40 text-white' 
                                            : 'bg-[#f5f5f7] border-transparent focus:bg-white focus:border-[#FB5102]/30 text-gray-900'
                                        }`}
                                />
                            </div>

                            {/* Definition */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Inglizcha ta'rifi (Definition)
                                </label>
                                <textarea 
                                    placeholder="Masalan: To leave completely and never return."
                                    value={definition}
                                    onChange={(e) => setDefinition(e.target.value)}
                                    rows={2}
                                    className={`w-full border outline-none rounded-xl py-3 px-4 text-sm transition-all resize-none 
                                        ${isDark 
                                            ? 'bg-black/20 border-white/10 focus:border-[#FB5102]/40 text-white' 
                                            : 'bg-[#f5f5f7] border-transparent focus:bg-white focus:border-[#FB5102]/30 text-gray-900'
                                        }`}
                                />
                            </div>

                            {/* Example */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Misol gap (Example sentence)
                                </label>
                                <textarea 
                                    placeholder="Masalan: He decided to abandon his old car."
                                    value={example}
                                    onChange={(e) => setExample(e.target.value)}
                                    rows={2}
                                    className={`w-full border outline-none rounded-xl py-3 px-4 text-sm transition-all resize-none 
                                        ${isDark 
                                            ? 'bg-black/20 border-white/10 focus:border-[#FB5102]/40 text-white' 
                                            : 'bg-[#f5f5f7] border-transparent focus:bg-white focus:border-[#FB5102]/30 text-gray-900'
                                        }`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t dark:border-white/5 border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all border
                                ${isDark 
                                    ? 'border-white/10 text-gray-300 hover:bg-white/5' 
                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Bekor qilish
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !word.trim()}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 bg-[#FB5102] hover:bg-[#e64a02] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#FB5102]/15 active:scale-[0.98]
                                ${isSubmitting || !word.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{useAI ? "AI orqali qo'shish" : "Saqlash"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
