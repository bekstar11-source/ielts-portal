// src/components/ReviewInterface/ReviewWordCapture.jsx
import React, { useState } from "react";
import { Plus, Save, Trash2, BookOpen, ArrowRightLeft } from "lucide-react";

export default function ReviewWordCapture({
    pendingPassageWord,
    onClearPending,
    testId,
    testName,
    onSaveAll,
    isSaving,
}) {
    const [wordPairs, setWordPairs] = useState([]);
    const [questionWord, setQuestionWord] = useState("");
    const [pairType, setPairType] = useState("synonym");

    // Passage so'z HighlightMenu'dan keladi
    const passageWord = pendingPassageWord || "";

    const handleAddPair = () => {
        if (!passageWord.trim() || !questionWord.trim()) return;

        setWordPairs((prev) => [
            ...prev,
            {
                passageWord: passageWord.trim(),
                questionWord: questionWord.trim(),
                type: pairType,
                testId: testId || "",
                testName: testName || "",
            },
        ]);

        // Tozalash
        setQuestionWord("");
        setPairType("synonym");
        if (onClearPending) onClearPending();
    };

    const handleRemovePair = (index) => {
        setWordPairs((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (wordPairs.length === 0) return;
        if (onSaveAll) onSaveAll(wordPairs);
        setWordPairs([]);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Yuqori: Input bo'limi */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Paraphrase Map
                </h3>

                <div className="space-y-3">
                    {/* Passage Word */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                            Matndagi so'z (Passage)
                        </label>
                        <input
                            type="text"
                            value={passageWord}
                            readOnly
                            placeholder="Matndan so'z tanlang..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-blue-50 focus:outline-none cursor-default"
                        />
                    </div>

                    {/* Question Word */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                            Savoldagi so'z (Question)
                        </label>
                        <input
                            type="text"
                            value={questionWord}
                            onChange={(e) => setQuestionWord(e.target.value)}
                            placeholder="Sinonim/Antonim yozing..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Turi (Synonym/Antonym) */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPairType("synonym")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${pairType === "synonym"
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            Synonym
                        </button>
                        <button
                            onClick={() => setPairType("antonym")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${pairType === "antonym"
                                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            Antonym
                        </button>
                    </div>

                    {/* Qo'shish tugmasi */}
                    <button
                        onClick={handleAddPair}
                        disabled={!passageWord.trim() || !questionWord.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Ro'yxatga qo'shish
                    </button>
                </div>
            </div>

            {/* O'rta: So'zlar ro'yxati */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {wordPairs.length === 0 ? (
                    <div className="text-center py-10">
                        <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">
                            Hali so'z qo'shilmadi
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Matndan so'z belgilab, yuqoridagi formani to'ldiring
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {wordPairs.map((pair, idx) => (
                            <div
                                key={idx}
                                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between group hover:border-blue-200 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-bold text-gray-800 truncate">
                                                {pair.passageWord}
                                            </span>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${pair.type === "synonym"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}
                                            >
                                                {pair.type === "synonym" ? "SYN" : "ANT"}
                                            </span>
                                            <span className="font-bold text-blue-600 truncate">
                                                {pair.questionWord}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemovePair(idx)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pastki: Save tugmasi */}
            {wordPairs.length > 0 && (
                <div className="p-4 bg-white border-t border-gray-200">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving
                            ? "Saqlanmoqda..."
                            : `WordBank'ga saqlash (${wordPairs.length} ta)`}
                    </button>
                </div>
            )}
        </div>
    );
}
