import React, { useState, useEffect } from "react";
import { Save, Trash2, Maximize2, Minimize2, X, Link2, ArrowRightLeft, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VocabularyCanvas({
    captureData,
    onClearCapture,
    testId,
    testName,
    onSaveAll,
    isSaving
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [wordPairs, setWordPairs] = useState([]);

    // State machine for capturing
    const [step, setStep] = useState(0); // 0: idle, 1: pending question word, 2: picking relation
    const [passageData, setPassageData] = useState(null);
    const [questionData, setQuestionData] = useState(null);

    // Expanded card for context view
    const [expandedCardId, setExpandedCardId] = useState(null);

    useEffect(() => {
        if (captureData) {
            setIsOpen(true);
            if (captureData.source === 'passage' || (!passageData && captureData.source !== 'question')) {
                setPassageData(captureData);
                setStep(1);
            } else if (captureData.source === 'question') {
                if (passageData) {
                    setQuestionData(captureData);
                    setStep(2);
                } else {
                    // Only question selected? We can store it as passage data or ignore. Let's start with it anyway.
                    setPassageData({ ...captureData, source: 'passage' });
                    setStep(1);
                }
            }
            onClearCapture();
        }
    }, [captureData, passageData, onClearCapture]);

    const handleAddPair = (relation) => {
        setWordPairs(prev => [...prev, {
            id: Date.now().toString(),
            passageWord: passageData.word,
            passageContext: passageData.context,
            questionWord: questionData.word,
            questionContext: questionData.context,
            type: relation,
            testId: testId || "",
            testName: testName || "",
        }]);
        setPassageData(null);
        setQuestionData(null);
        setStep(0);
    };

    const handleCancelCapture = () => {
        setPassageData(null);
        setQuestionData(null);
        setStep(0);
    };

    const handleRemovePair = (id) => {
        setWordPairs(prev => prev.filter(p => p.id !== id));
        if (expandedCardId === id) setExpandedCardId(null);
    };

    const handleSave = () => {
        if (wordPairs.length === 0) return;
        if (onSaveAll) onSaveAll(wordPairs);
        // We will clear inside the success callback originally, but here we can just clear it.
        setWordPairs([]);
    };

    if (!isOpen && step === 0 && wordPairs.length === 0) return null;

    return (
        <AnimatePresence mode="wait">
            {!isOpen ? (
                <motion.div
                    key="minimized"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-6 right-6 z-[2000]"
                >
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-full text-white font-semibold shadow-xl hover:bg-slate-800 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    >
                        <Link2 className="w-4 h-4 text-blue-400" />
                        Vocabulary ({wordPairs.length})
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="maximized"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="fixed bottom-6 right-6 z-[2000] w-[380px] sm:w-[420px] max-h-[50vh] flex flex-col bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Link2 className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-bold text-white tracking-wide">Vocabulary Canvas</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                        <AnimatePresence mode="popLayout">
                            {/* Capture UI: Step 1 (Waiting for Question) */}
                            {step === 1 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-4 mb-4 rounded-xl bg-blue-900/20 border border-blue-500/30 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                                    <button onClick={handleCancelCapture} className="absolute top-2 right-2 text-blue-400/50 hover:text-red-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                        Target Locked
                                    </div>
                                    <div className="text-lg font-bold text-white mb-2 truncate">{passageData?.word}</div>
                                    <div className="text-sm text-blue-200">Endi savoldagi sinonim/antonimni belgilang...</div>
                                </motion.div>
                            )}

                            {/* Capture UI: Step 2 (Relation Pick) */}
                            {step === 2 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-4 mb-4 rounded-xl bg-slate-800/80 border border-slate-600 shadow-xl relative"
                                >
                                    <button onClick={handleCancelCapture} className="absolute top-2 right-2 text-slate-400 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-base font-bold text-white text-center flex-1 truncate px-2">{passageData?.word}</div>
                                        <ArrowRightLeft className="w-4 h-4 text-slate-500 shrink-0" />
                                        <div className="text-base font-bold text-white text-center flex-1 truncate px-2">{questionData?.word}</div>
                                    </div>

                                    <p className="text-xs text-center text-slate-400 mb-3 uppercase tracking-wider font-semibold">Bog'lanishni tanlang</p>

                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => handleAddPair('synonym')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-colors">
                                            <span className="text-xs font-bold">Sinonim</span>
                                        </button>
                                        <button onClick={() => handleAddPair('antonym')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors">
                                            <span className="text-xs font-bold">Antonim</span>
                                        </button>
                                        <button onClick={() => handleAddPair('phrase')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-colors">
                                            <span className="text-xs font-bold">Ibora</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* List of Pairs */}
                            {wordPairs.length === 0 && step === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center opacity-60">
                                    <Search className="w-10 h-10 text-slate-500 mb-3" />
                                    <p className="text-sm text-slate-300 font-medium">Matndan so'z belgilang</p>
                                    <p className="text-xs text-slate-400 mt-1">Paraphraselarni topish uchun matndagi so'zni tanlab "[+ Paraphrase]" tugmasini bosing</p>
                                </div>
                            ) : (
                                wordPairs.map((pair) => {
                                    const isSynonym = pair.type === 'synonym';
                                    const isAntonym = pair.type === 'antonym';

                                    let colorClass = isSynonym ? 'text-emerald-400' : isAntonym ? 'text-rose-400' : 'text-amber-400';
                                    let bgClass = isSynonym ? 'bg-emerald-500/10 border-emerald-500/20' : isAntonym ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20';
                                    let label = isSynonym ? 'SYN' : isAntonym ? 'ANT' : 'PHR';

                                    const isExpanded = expandedCardId === pair.id;

                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            key={pair.id}
                                            className={`mb-3 rounded-xl border transition-all cursor-pointer group ${bgClass} hover:border-slate-500`}
                                            onClick={() => setExpandedCardId(isExpanded ? null : pair.id)}
                                        >
                                            <div className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <span className="font-bold text-white text-sm truncate">{pair.passageWord}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${colorClass} border border-current opacity-70`}>{label}</span>
                                                    <span className={`font-bold text-sm truncate ${colorClass}`}>{pair.questionWord}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemovePair(pair.id); }}
                                                    className="ml-2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Context Dropdown */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden border-t border-slate-700/30"
                                                    >
                                                        <div className="p-3 space-y-3 bg-slate-900/30 text-xs">
                                                            <div>
                                                                <span className="block font-bold text-slate-500 mb-1 uppercase tracking-widest text-[9px]">Passage Context</span>
                                                                <p className="text-slate-300 leading-relaxed italic border-l-2 border-slate-600 pl-2">
                                                                    {pair.passageContext || "No context found"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="block font-bold text-slate-500 mb-1 uppercase tracking-widest text-[9px]">Question Context</span>
                                                                <p className="text-slate-300 leading-relaxed italic border-l-2 border-slate-600 pl-2">
                                                                    {pair.questionContext || "No context found"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>

                    </div>

                    {/* Footer / Save Button */}
                    {wordPairs.length > 0 && (
                        <div className="p-4 bg-slate-900/80 border-t border-slate-700/50 shrink-0">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? "Saqlanmoqda..." : `WordBank'ga saqlash (${wordPairs.length})`}
                            </button>
                        </div>
                    )}

                    <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
            `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
