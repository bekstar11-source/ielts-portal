import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRightLeft, X, Minimize2, BookOpen, Save, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveSynonymPairs, getSynonymPairs, deleteSynonymPair, batchAddWordsToBank } from "../../utils/wordbankUtils";

// Belgilangan matnni tozalaydi: ortiqcha bo'shliq/qator uzilishi va chekka tinish belgilari
function normalizeWord(raw) {
    return (raw || "")
        .replace(/\s+/g, " ")
        .replace(/[.,!?;:()"“”„«»]/g, "")
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
        .trim();
}

/**
 * VocabSynonymCanvas
 * Props:
 *   captureData    – { word, context, source } | null
 *   onClearCapture – () => void
 *   userId         – string
 *   testId         – string
 *   testTitle      – string  (WordBank da nom uchun)
 */
export default function VocabSynonymCanvas({ captureData, onClearCapture, userId, testId, testTitle, onWordClick }) {
    const [isOpen, setIsOpen] = useState(true);
    const [step, setStep] = useState(0);
    const [passageData, setPassageData] = useState(null);
    const [questionData, setQuestionData] = useState(null);

    const [pairs, setPairs] = useState([]);
    const [unsavedIds, setUnsavedIds] = useState(new Set());

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // unsavedIds ning eng so'nggi qiymati async callback'lar uchun
    const unsavedIdsRef = useRef(unsavedIds);
    useEffect(() => { unsavedIdsRef.current = unsavedIds; }, [unsavedIds]);

    const localIdSeq = useRef(0);
    const flashTimerRef = useRef(null);
    useEffect(() => () => clearTimeout(flashTimerRef.current), []);

    // Load saved pairs from Firestore on mount
    useEffect(() => {
        if (!userId || !testId) return;
        let cancelled = false;
        setIsLoading(true);
        getSynonymPairs(userId, testId)
            .then((data) => {
                if (cancelled) return;
                // Yuklash paytida qo'shilgan (hali saqlanmagan) juftlarni yo'qotmaymiz
                setPairs((prev) => {
                    const pending = prev.filter((p) => unsavedIdsRef.current.has(p.id));
                    const pendingIds = new Set(pending.map((p) => p.id));
                    return [...pending, ...data.filter((p) => !pendingIds.has(p.id))];
                });
            })
            .catch(console.error)
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [userId, testId]);

    // Warn before leaving if there are unsaved pairs
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (unsavedIds.size > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [unsavedIds.size]);

    // Handle incoming capture data
    useEffect(() => {
        if (!captureData) return;

        // Clean word from punctuation and spaces
        const cleanWord = normalizeWord(captureData.word);
        if (!cleanWord) {
            onClearCapture();
            return;
        }

        setIsOpen(true);
        const cData = { ...captureData, word: cleanWord };
        const isPassage = cData.source === "passage";

        // Manba bo'yicha tegishli tomonni to'ldiramiz/almashtiramiz.
        // (Ilgari ikkala tomon to'lganda yangi tanlov jimgina yo'qolar edi)
        const nextPassage = isPassage ? cData : passageData;
        const nextQuestion = isPassage ? questionData : cData;

        setPassageData(nextPassage);
        setQuestionData(nextQuestion);
        setStep(nextPassage && nextQuestion ? 2 : 1);

        onClearCapture();
    }, [captureData]); // eslint-disable-line

    const handleAddPair = (relation) => {
        const pWord = passageData?.word?.trim();
        const qWord = questionData?.word?.trim();

        const reset = () => {
            setPassageData(null);
            setQuestionData(null);
            setStep(0);
        };

        if (!pWord || !qWord) { reset(); return; }

        const existing = pairs.find(p =>
            p.passageWord?.trim().toLowerCase() === pWord.toLowerCase() &&
            p.questionWord?.trim().toLowerCase() === qWord.toLowerCase()
        );

        if (existing) {
            // Bir xil juft — faqat bog'lanish turi o'zgargan bo'lsa yangilaymiz
            if (existing.type !== relation) {
                setPairs((prev) => prev.map((p) => (p.id === existing.id ? { ...p, type: relation } : p)));
                setUnsavedIds((prev) => new Set(prev).add(existing.id));
            }
            reset();
            return;
        }

        const localId = `local_${Date.now()}_${localIdSeq.current++}`;
        const newPair = {
            id: localId,
            // Saqlashda id Firestore id'siga almashadi — React key esa o'zgarmasligi kerak,
            // aks holda qator unmount/mount bo'lib "sakraydi"
            _k: localId,
            passageWord: pWord,
            questionWord: qWord,
            type: relation,
            createdAt: Date.now(),
        };
        setPairs((prev) => [newPair, ...prev]);
        setUnsavedIds((prev) => new Set([...prev, newPair.id]));
        reset();
    };

    const handleCancelCapture = () => {
        setPassageData(null);
        setQuestionData(null);
        setStep(0);
    };

    // Save to synonymPairs (single source of truth)
    const handleSave = useCallback(async () => {
        if (isSaving) return;
        
        if (!userId || !testId) {
            console.error('VocabSynonymCanvas: userId yoki testId topilmadi, saqlash o‘tkazib yuborildi');
            return;
        }
        const toSave = pairs.filter((p) => unsavedIds.has(p.id));
        if (toSave.length === 0) return;

        setIsSaving(true);
        try {
            // Generate stable IDs for unsaved pairs preserving creation order
            const baseNow = Date.now();
            const idMap = {};
            const withRealIds = toSave.map((p, index) => {
                const createdAt = typeof p.createdAt === 'number'
                    ? p.createdAt
                    : (p.createdAt?.toMillis ? p.createdAt.toMillis() : baseNow - index * 10);

                const newId = p.id?.startsWith('local_')
                    ? `${createdAt}_${Math.random().toString(36).slice(2, 7)}`
                    : p.id;

                idMap[p.id] = newId;
                return { ...p, id: newId, createdAt };
            });

            // Prepare wordbank entries
            const wordbankEntries = withRealIds.map((p) => ({
                id: p.id,
                passageWord: p.passageWord || '',
                questionWord: p.questionWord || '',
                type: p.type || 'synonym',
                testId: testId,
                testName: testTitle || testId,
                createdAt: p.createdAt,
            }));

            // Save to synonymPairs and WordBank in parallel
            await Promise.all([
                saveSynonymPairs(userId, testId, withRealIds),
                batchAddWordsToBank(userId, wordbankEntries)
            ]);

            // Update local state with new IDs — no extra re-fetch needed
            setPairs(prev => prev.map(p => {
                if (idMap[p.id]) return { ...p, id: idMap[p.id] };
                return p;
            }));
            // Faqat shu partiyada saqlanganlarini olib tashlaymiz —
            // saqlash davomida qo'shilganlar keyingi avtosaqlashda ketadi
            const savedIds = new Set(toSave.map((p) => p.id));
            setUnsavedIds((prev) => {
                const next = new Set();
                prev.forEach((id) => { if (!savedIds.has(id)) next.add(id); });
                return next;
            });
            setSavedFlash(true);
            clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => setSavedFlash(false), 2500);
        } catch (err) {
            console.error('Saqlashda xato:', err);
            alert('Saqlashda xatolik: ' + (err?.message || err));
        } finally {
            setIsSaving(false);
        }
    }, [userId, testId, testTitle, pairs, unsavedIds]);

    // Auto-save: whenever a new pair is added, persist it automatically (debounced)
    useEffect(() => {
        if (unsavedIds.size === 0 || isSaving) return;
        const timer = setTimeout(() => {
            handleSave();
        }, 600);
        return () => clearTimeout(timer);
    }, [unsavedIds, isSaving, handleSave]);

    const handleRemovePair = useCallback(async (pair) => {
        const isUnsaved = unsavedIds.has(pair.id);
        if (isUnsaved) {
            setPairs((prev) => prev.filter((p) => p.id !== pair.id));
            setUnsavedIds((prev) => { const s = new Set(prev); s.delete(pair.id); return s; });
        } else {
            setDeletingId(pair.id);
            try {
                await deleteSynonymPair(userId, testId, pair.id);
                setPairs((prev) => prev.filter((p) => p.id !== pair.id));
            } catch (err) {
                console.error("O'chirishda xato:", err);
            } finally {
                setDeletingId(null);
            }
        }
    }, [userId, testId, unsavedIds]);

    // Bir joyda saqlanadigan rang tokenlari — qator, nishon va tugmalar shu yerdan rang oladi
    const typeConfig = {
        synonym: {
            label: "SYN",
            full: "Sinonim",
            accent: "#34d399",       // emerald-400
            accentSoft: "#a7f3d0",   // emerald-200
            tint: "rgba(16,185,129,0.10)",
            line: "rgba(52,211,153,0.28)",
        },
        antonym: {
            label: "ANT",
            full: "Antonim",
            accent: "#fb7185",       // rose-400
            accentSoft: "#fecdd3",   // rose-200
            tint: "rgba(244,63,94,0.10)",
            line: "rgba(251,113,133,0.28)",
        },
        phrase: {
            label: "PHR",
            full: "Ibora",
            accent: "#fbbf24",       // amber-400
            accentSoft: "#fde68a",   // amber-200
            tint: "rgba(245,158,11,0.10)",
            line: "rgba(251,191,36,0.28)",
        },
    };

    const hasActivity = step > 0 || pairs.length > 0;
    if (!isOpen && !hasActivity) return null;

    const lockedWord = passageData ? passageData.word : questionData?.word;

    return (
        <AnimatePresence mode="wait">
            {!isOpen ? (
                <motion.div
                    key="mini"
                    initial={{ opacity: 0, scale: 0.85, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 16 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-4 right-4 sm:bottom-16 sm:right-6 z-[2000]"
                >
                    <button
                        onClick={() => setIsOpen(true)}
                        aria-label="Sinonimlar panelini ochish"
                        className="vsc-focus group flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full text-sm font-semibold text-slate-100 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(15,23,42,0.97) 100%)',
                            border: '1px solid rgba(139,92,246,0.35)',
                            boxShadow: '0 10px 30px -8px rgba(2,6,23,0.85), 0 0 0 1px rgba(255,255,255,0.03) inset',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <BookOpen className="w-4 h-4 text-violet-300 transition-colors group-hover:text-violet-200" />
                        <span className="tracking-[0.01em]">Sinonimlar</span>
                        {pairs.length > 0 && (
                            <span
                                className="px-1.5 min-w-[20px] text-center rounded-full text-[11px] font-bold tabular-nums leading-5"
                                style={{ background: 'rgba(139,92,246,0.22)', color: '#ddd6fe' }}
                            >
                                {pairs.length}
                            </span>
                        )}
                        {unsavedIds.size > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Saqlanmagan o'zgarishlar bor" />
                        )}
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="max"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    role="complementary"
                    aria-label="Sinonimlar paneli"
                    className="fixed bottom-4 right-4 sm:bottom-16 sm:right-6 z-[2000] w-[min(440px,calc(100vw-2rem))] flex flex-col rounded-2xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(17,25,43,0.98) 0%, rgba(11,17,31,0.98) 100%)',
                        border: '1px solid rgba(148,163,184,0.16)',
                        boxShadow: '0 24px 60px -18px rgba(2,6,23,0.9), 0 0 0 1px rgba(255,255,255,0.02) inset',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
                        style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.3)' }}
                            >
                                <BookOpen className="w-3.5 h-3.5 text-violet-300" />
                            </div>
                            <span className="text-[13px] font-semibold text-slate-100 tracking-[0.01em] truncate">Sinonimlar</span>
                            {isLoading && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin shrink-0" />}
                            {pairs.length > 0 && !isLoading && (
                                <span
                                    className="px-1.5 min-w-[20px] text-center rounded-full text-[11px] font-semibold tabular-nums leading-5 shrink-0"
                                    style={{ background: 'rgba(139,92,246,0.16)', color: '#c4b5fd' }}
                                >
                                    {pairs.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Panelni yig'ish"
                            title="Yig'ish"
                            className="vsc-focus vsc-icon-btn shrink-0 p-1.5 rounded-lg"
                        >
                            <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Tanlov kartasi — ro'yxatdan tashqarida, shunda paydo bo'lib/yo'qolganda
                        pastdagi qatorlar qayta tartiblanmaydi */}
                    <div className={step > 0 ? "px-2.5 pt-2.5" : ""}>
                        <AnimatePresence initial={false}>
                            {/* Bitta doimiy karta: 1-qadamdan 2-qadamga o'tganda unmount bo'lmaydi,
                                shuning uchun balandlik nolga tushib qaytmaydi */}
                            {step > 0 && (
                                <motion.div
                                    key="capture"
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.16, ease: "easeOut" }}
                                    className="relative p-3.5 rounded-xl"
                                    style={
                                        step === 1
                                            ? { background: 'rgba(59,130,246,0.09)', border: '1px solid rgba(96,165,250,0.28)' }
                                            : { background: 'rgba(148,163,184,0.07)', border: '1px solid rgba(148,163,184,0.2)' }
                                    }
                                >
                                    <button
                                        onClick={handleCancelCapture}
                                        aria-label="Tanlovni bekor qilish"
                                        title="Bekor qilish"
                                        className="vsc-focus vsc-icon-btn absolute top-2 right-2 p-1 rounded-md z-10"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>

                                    {step === 1 ? (
                                        <>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="vsc-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
                                                </span>
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300/90">Qulflandi</span>
                                            </div>
                                            <p className="text-[17px] font-semibold text-white leading-snug break-words pr-5">
                                                {lockedWord}
                                            </p>
                                            <p className="text-[12px] mt-2 leading-relaxed" style={{ color: 'rgba(191,219,254,0.7)' }}>
                                                {passageData
                                                    ? "Endi savoldagi mos so'zni belgilang"
                                                    : "Endi matndagi mos so'zni belgilang"}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex flex-col items-center gap-2 mb-4 pt-1">
                                                <div className="w-full px-5 text-center text-[16px] font-semibold text-white leading-snug break-words">
                                                    {passageData?.word}
                                                </div>
                                                <div className="flex items-center justify-center w-full gap-2.5 py-0.5">
                                                    <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.28))' }} />
                                                    <ArrowRightLeft className="w-3.5 h-3.5 text-violet-300/80 shrink-0" />
                                                    <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.28), transparent)' }} />
                                                </div>
                                                <div className="w-full px-5 text-center text-[16px] font-semibold text-white leading-snug break-words">
                                                    {questionData?.word}
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-center uppercase tracking-[0.14em] mb-2 font-semibold text-slate-500">
                                                Bog'lanishni tanlang
                                            </p>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {["synonym", "antonym", "phrase"].map((key) => {
                                                    const cfg = typeConfig[key];
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => handleAddPair(key)}
                                                            className="vsc-focus vsc-choice py-2.5 rounded-lg text-[12px] font-semibold"
                                                            style={{
                                                                background: cfg.tint,
                                                                border: `1px solid ${cfg.line}`,
                                                                color: cfg.accentSoft,
                                                                '--vsc-accent': cfg.accent,
                                                            }}
                                                        >
                                                            {cfg.full}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Body — ~4 qator ko'rinadi, keyin scroll */}
                    <div className="overflow-y-auto overscroll-contain p-2.5 space-y-1.5 vocab-syn-scroll" style={{ maxHeight: '340px' }}>
                        <AnimatePresence initial={false} mode="popLayout">

                            {/* Bo'sh holat */}
                            {pairs.length === 0 && step === 0 && !isLoading && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-11 px-6 text-center"
                                >
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                                        style={{ background: 'rgba(148,163,184,0.07)', border: '1px solid rgba(148,163,184,0.14)' }}
                                    >
                                        <BookOpen className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <p className="text-[13px] font-semibold text-slate-300">Hali juftlik yo'q</p>
                                    <p className="text-[12px] mt-1.5 leading-relaxed text-slate-500 max-w-[240px]">
                                        Matndan so'zni belgilang, so'ng savoldagi sinonimini tanlang — juftlik shu yerda paydo bo'ladi.
                                    </p>
                                </motion.div>
                            )}

                            {/* Juftliklar */}
                            {pairs.map((pair) => {
                                const cfg = typeConfig[pair.type] || typeConfig.synonym;
                                const isUnsaved = unsavedIds.has(pair.id);
                                const isDeleting = deletingId === pair.id;

                                return (
                                    <motion.div
                                        layout="position"
                                        // _k saqlashdan keyin ham o'zgarmaydi — id almashsa ham qator remount bo'lmaydi
                                        key={pair._k || pair.id}
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: isDeleting ? 0.4 : 1, y: 0 }}
                                        exit={{ opacity: 0, x: -12 }}
                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                        className="vsc-row group relative flex items-center gap-2 pl-3 pr-1.5 py-2 rounded-xl"
                                        style={{
                                            background: cfg.tint,
                                            border: `1px solid ${cfg.line}`,
                                            '--vsc-accent': cfg.accent,
                                        }}
                                    >
                                        <span
                                            className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-70"
                                            style={{ background: cfg.accent }}
                                            aria-hidden="true"
                                        />

                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <button
                                                onClick={() => onWordClick && onWordClick(pair.passageWord, 'passage')}
                                                className="vsc-focus vsc-word flex-1 min-w-0 text-right text-[13px] font-medium text-slate-100 leading-snug break-words rounded-md px-0.5"
                                                title="Matndan izlash"
                                            >
                                                {pair.passageWord}
                                            </button>

                                            <span
                                                className="shrink-0 px-1.5 py-[3px] rounded-md text-[9px] font-bold uppercase tracking-[0.08em] leading-none"
                                                style={{ background: 'rgba(255,255,255,0.06)', color: cfg.accent }}
                                                title={cfg.full}
                                            >
                                                {cfg.label}
                                            </span>

                                            <button
                                                onClick={() => onWordClick && onWordClick(pair.questionWord, 'question')}
                                                className="vsc-focus vsc-word flex-1 min-w-0 text-left text-[13px] font-semibold leading-snug break-words rounded-md px-0.5"
                                                style={{ color: cfg.accentSoft }}
                                                title="Savoldan izlash"
                                            >
                                                {pair.questionWord}
                                            </button>

                                            {/* Joyi doim band — saqlanganda nuqta yo'qolsa so'zlar siljib ketmasin */}
                                            <span
                                                className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 transition-opacity duration-300"
                                                style={{
                                                    opacity: isUnsaved ? 1 : 0,
                                                    boxShadow: isUnsaved ? '0 0 8px rgba(251,191,36,0.6)' : 'none',
                                                }}
                                                title={isUnsaved ? "Saqlanmagan" : undefined}
                                                aria-hidden={!isUnsaved}
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleRemovePair(pair)}
                                            disabled={isDeleting}
                                            aria-label="Juftlikni o'chirish"
                                            title="O'chirish"
                                            className="vsc-focus vsc-del shrink-0 p-1.5 rounded-lg disabled:cursor-wait"
                                        >
                                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Footer — avtosaqlash holati.
                        Juftlik bor ekan doim ko'rinadi: paydo bo'lib/yo'qolsa panel balandligi
                        o'zgarib, pastdan biriktirilgani uchun butun ro'yxat sakrardi. */}
                    {pairs.length > 0 && (
                        <div
                            className="px-4 h-9 flex items-center shrink-0"
                            style={{ borderTop: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.6)' }}
                            aria-live="polite"
                        >
                            {unsavedIds.size > 0 ? (
                                <div className="flex items-center gap-2 w-full text-[12px] font-medium text-slate-400">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300 shrink-0" />
                                            <span className="text-slate-300">Saqlanmoqda…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            <span>Avtomatik saqlanadi</span>
                                            <span className="ml-auto tabular-nums text-slate-500">{unsavedIds.size} ta kutilmoqda</span>
                                        </>
                                    )}
                                </div>
                            ) : savedFlash ? (
                                <div className="flex items-center gap-2 w-full text-[12px] font-medium" style={{ color: '#6ee7b7' }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Saqlandi · Wordbank'ga qo'shildi</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full text-[12px] font-medium text-slate-500">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                                    <span>Hammasi saqlangan</span>
                                </div>
                            )}
                        </div>
                    )}

                    <style>{`
                        .vocab-syn-scroll::-webkit-scrollbar { width: 6px; }
                        .vocab-syn-scroll::-webkit-scrollbar-track { background: transparent; }
                        .vocab-syn-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.18); border-radius: 999px; }
                        .vocab-syn-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.35); }
                        .vocab-syn-scroll { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.22) transparent; }

                        .vsc-focus { outline: none; }
                        .vsc-focus:focus-visible {
                            outline: 2px solid rgba(167,139,250,0.85);
                            outline-offset: 2px;
                        }

                        .vsc-icon-btn {
                            color: #94a3b8;
                            background: rgba(148,163,184,0.08);
                            transition: color .15s ease, background-color .15s ease;
                        }
                        .vsc-icon-btn:hover { color: #e2e8f0; background: rgba(148,163,184,0.18); }

                        .vsc-choice {
                            transition: background-color .15s ease, border-color .15s ease, transform .12s ease, color .15s ease;
                        }
                        .vsc-choice:hover {
                            border-color: var(--vsc-accent);
                            color: #fff;
                            background: color-mix(in srgb, var(--vsc-accent) 22%, transparent);
                        }
                        .vsc-choice:active { transform: scale(0.97); }

                        .vsc-row { transition: background-color .15s ease, border-color .15s ease; }
                        .vsc-row:hover { border-color: color-mix(in srgb, var(--vsc-accent) 55%, transparent); }

                        .vsc-word { transition: color .15s ease, background-color .15s ease; }
                        .vsc-word:hover { background: rgba(255,255,255,0.06); color: #fff; }

                        .vsc-del {
                            color: #64748b;
                            opacity: 1;
                            transition: opacity .15s ease, color .15s ease, background-color .15s ease;
                        }
                        .vsc-del:hover { color: #fda4af; background: rgba(244,63,94,0.14); }
                        @media (hover: hover) and (pointer: fine) {
                            .vsc-del { opacity: 0; }
                            .vsc-row:hover .vsc-del,
                            .vsc-del:focus-visible { opacity: 1; }
                        }

                        .vsc-ping { animation: vsc-ping 1.6s cubic-bezier(0,0,0.2,1) infinite; }
                        @keyframes vsc-ping { 75%, 100% { transform: scale(2); opacity: 0; } }

                        @media (prefers-reduced-motion: reduce) {
                            .vsc-ping, .vocab-syn-scroll * { animation: none !important; }
                            .vsc-choice:active { transform: none; }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
