import React, { useState, useEffect, useMemo } from "react";
import { BookOpen, X, Search, Copy, Loader2 } from "lucide-react";
import { db } from "../../../firebase/firebase";
import toast from "react-hot-toast";
import { useTheme } from "../../../context/ThemeContext";

export default function QuestionBankModal({
    isOpen,
    onClose,
    allAvailableTests
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [qBankSearchTerm, setQBankSearchTerm] = useState("");
    const [selectedQBankTestId, setSelectedQBankTestId] = useState("");
    const [qBankTestData, setQBankTestData] = useState(null);
    const [loadingQBankTestData, setLoadingQBankTestData] = useState(false);
    const [selectedPassageIndex, setSelectedPassageIndex] = useState(0);

    useEffect(() => {
        if (!selectedQBankTestId) { setQBankTestData(null); return; }
        const fetchTestData = async () => {
            setLoadingQBankTestData(true);
            try {
                const { getDoc, doc } = await import("firebase/firestore");
                const snap = await getDoc(doc(db, "tests", selectedQBankTestId));
                if (snap.exists()) { setQBankTestData(snap.data()); setSelectedPassageIndex(0); }
                else toast.error("Test yuklanmadi");
            } catch (err) {
                toast.error("Yuklashda xatolik");
            } finally {
                setLoadingQBankTestData(false);
            }
        };
        fetchTestData();
    }, [selectedQBankTestId]);

    const filteredQBankTests = useMemo(() => {
        const combined = [...(allAvailableTests?.reading || []), ...(allAvailableTests?.listening || [])];
        if (!qBankSearchTerm.trim()) return combined;
        const term = qBankSearchTerm.toLowerCase();
        return combined.filter(t => t.title.toLowerCase().includes(term) || t.id.toLowerCase().includes(term));
    }, [allAvailableTests, qBankSearchTerm]);

    if (!isOpen) return null;

    const handleCopyPassageJSON = () => {
        if (!qBankTestData?.passages?.[selectedPassageIndex]) return;
        try {
            const passage = qBankTestData.passages[selectedPassageIndex];
            const questions = (qBankTestData.questions || []).filter(q => String(q.passageId) === String(passage.id));
            const keywordTable = (qBankTestData.keywordTable || []).filter(kw => String(kw.passageId) === String(passage.id));
            navigator.clipboard.writeText(JSON.stringify({ passage, questions, keywordTable }, null, 2));
            toast.success("Nusxalandi! Buni yangi test tahrirlagichining JSON maydoniga qo'shishingiz mumkin. 📋");
        } catch {
            toast.error("Nusxa olishda xatolik.");
        }
    };

    const panelClass = `border-r flex flex-col min-h-0 ${isDark ? 'border-white/5' : 'border-zinc-100'}`;
    const inputClass = `w-full text-xs pl-8 pr-3 py-2 rounded-lg border outline-none ${
        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
    }`;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qbank-modal-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-5xl h-[80dvh] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border flex flex-col ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className={`p-4 border-b flex justify-between items-center ${
                    isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'
                }`}>
                    <h2 id="qbank-modal-title" className="font-bold text-lg flex items-center gap-2">
                        <BookOpen className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                        Savollar banki (Browse Passages & Parts)
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 flex min-h-0">
                    {/* Left panel: Test List */}
                    <div className={`w-80 ${panelClass}`}>
                        <div className="p-3 border-b border-inherit">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                <input
                                    type="text"
                                    className={inputClass}
                                    placeholder="Test nomini qidiring..."
                                    value={qBankSearchTerm}
                                    onChange={e => setQBankSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {filteredQBankTests.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedQBankTestId(t.id)}
                                    className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all block truncate ${
                                        selectedQBankTestId === t.id
                                            ? 'bg-blue-600 text-white'
                                            : isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                                    }`}
                                >
                                    <span className="opacity-70 text-[9px] uppercase block tracking-wider mb-0.5">{t.type}</span>
                                    {t.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right panel: Passages & Preview */}
                    <div className="flex-1 flex flex-col min-h-0 p-4">
                        {loadingQBankTestData ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="animate-spin text-blue-500" size={24} />
                            </div>
                        ) : qBankTestData ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex gap-2 border-b pb-3 mb-3 border-zinc-100 dark:border-white/5 shrink-0 overflow-x-auto">
                                    {(qBankTestData.passages || []).map((pass, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedPassageIndex(i)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shrink-0 ${
                                                selectedPassageIndex === i
                                                    ? 'bg-blue-600 text-white border-transparent'
                                                    : isDark ? 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                            }`}
                                        >
                                            {pass.title || `Passage ${i + 1}`}
                                        </button>
                                    ))}
                                </div>

                                {qBankTestData.passages?.[selectedPassageIndex] ? (
                                    <div className="flex-1 flex min-h-0 gap-4">
                                        <div className={`flex-1 border p-4 rounded-xl overflow-y-auto custom-scrollbar text-sm leading-relaxed ${
                                            isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-150'
                                        }`}>
                                            <h3 className="font-extrabold text-base mb-3">{qBankTestData.passages[selectedPassageIndex].title}</h3>
                                            <div
                                                dangerouslySetInnerHTML={{ __html: qBankTestData.passages[selectedPassageIndex].content || "<p class='italic text-zinc-400'>Matn yo'q</p>" }}
                                                className="space-y-3 prose dark:prose-invert max-w-none text-xs"
                                            />
                                        </div>

                                        <div className="w-80 flex flex-col min-h-0 border-l pl-4 border-zinc-100 dark:border-white/5 shrink-0">
                                            <div className="mb-4">
                                                <button
                                                    onClick={handleCopyPassageJSON}
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                                                >
                                                    <Copy size={14} /> Passage JSON nusxalash
                                                </button>
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Savollar Ro'yxati</h4>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                                {(qBankTestData.questions || [])
                                                    .filter(q => String(q.passageId) === String(qBankTestData.passages[selectedPassageIndex].id))
                                                    .map((q, idx) => (
                                                        <div key={idx} className={`p-2 rounded-lg border text-[11px] font-bold ${
                                                            isDark ? 'bg-white/5 border-white/5 text-zinc-300' : 'bg-white border-zinc-150 text-zinc-700'
                                                        }`}>
                                                            <span className="text-blue-500 mr-1.5">S{q.id || idx + 1}</span>
                                                            <span className="opacity-70 uppercase text-[9px] px-1 bg-zinc-500/10 rounded">{q.type}</span>
                                                            <p className="mt-1 font-medium line-clamp-2">{q.question || q.title || "Savol matni kiritilmagan"}</p>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-zinc-400 italic text-sm">
                                        Ushbu modulda bo'limlar topilmadi.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 italic text-sm">
                                <BookOpen size={48} className="stroke-1 text-zinc-350 dark:text-zinc-650 mb-3" />
                                Chap paneldan biror test tanlang. Undagi bo'limlar va savollarni bu yerda ko'rishingiz mumkin.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
