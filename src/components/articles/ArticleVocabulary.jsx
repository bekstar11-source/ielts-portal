import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookMarked, ChevronDown, Volume2, Plus, Check, Loader2,
    Search, X, AlertCircle, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const norm = (w) => (w || '').toLowerCase().trim();

export default function ArticleVocabulary({ vocabulary = [], level, articleTitle }) {
    const [expanded, setExpanded] = useState(true);
    const [openIndex, setOpenIndex] = useState(null);
    const { user } = useAuth();
    const [addedWords, setAddedWords] = useState(new Set());
    const [addingWordId, setAddingWordId] = useState(null);
    const [isAddingAll, setIsAddingAll] = useState(false);
    const [speakingWord, setSpeakingWord] = useState(null);
    const [search, setSearch] = useState('');
    const [notice, setNotice] = useState(null); // { type: 'error' | 'info', text }
    const noticeTimer = useRef(null);

    /* Alert oynasi o'qishni to'xtatadi — xabarni panel ichida ko'rsatamiz. */
    const flash = (type, text) => {
        setNotice({ type, text });
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 4000);
    };
    useEffect(() => () => clearTimeout(noticeTimer.current), []);

    useEffect(() => {
        if (!user) {
            setAddedWords(new Set());
            return;
        }

        const fetchExistingWords = async () => {
            try {
                const q = query(collection(db, "users", user.uid, "vocabulary"));
                const snapshot = await getDocs(q);
                const wordsSet = new Set(snapshot.docs.map(doc => norm(doc.data().word)));
                setAddedWords(wordsSet);
            } catch (error) {
                console.error("Error fetching existing vocabulary:", error);
            }
        };

        fetchExistingWords();
    }, [user]);

    const speakWord = (word) => {
        if (!window.speechSynthesis || !word) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => setSpeakingWord(null);
        utterance.onerror = () => setSpeakingWord(null);
        setSpeakingWord(word);
        window.speechSynthesis.speak(utterance);
    };

    const handleAddWord = async (item) => {
        if (!user) {
            flash('error', "Lug'atga qo'shish uchun avval tizimga kiring.");
            return;
        }

        try {
            setAddingWordId(item.word);

            await addDoc(collection(db, "users", user.uid, "vocabulary"), {
                word: item.word,
                contextSentence: item.example || "",
                testTitle: articleTitle || "Maqola",
                sectionTitle: articleTitle || "Maqola",
                addedAt: serverTimestamp(),

                // Predefined article vocabulary fields
                definition: item.definition || "",
                example: item.example || "",
                translation: item.translation || "",
                hasAI: true,

                // SRS fields
                learningStatus: 'learning',
                easeFactor: 2.5,
                interval: 0,
                nextReviewDate: serverTimestamp()
            });

            setAddedWords(prev => new Set([...prev, norm(item.word)]));
        } catch (error) {
            console.error("Error adding word to wordbank:", error);
            flash('error', "Lug'atga qo'shishda xatolik: " + error.message);
        } finally {
            setAddingWordId(null);
        }
    };

    const handleRemoveWord = async (item) => {
        if (!user) return;
        try {
            setAddingWordId(item.word);

            const q = query(
                collection(db, "users", user.uid, "vocabulary"),
                where("word", "==", item.word)
            );
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "users", user.uid, "vocabulary", d.id)));
            await Promise.all(deletePromises);

            setAddedWords(prev => {
                const next = new Set(prev);
                next.delete(norm(item.word));
                return next;
            });
        } catch (error) {
            console.error("Error removing word:", error);
            flash('error', "O'chirishda xatolik: " + error.message);
        } finally {
            setAddingWordId(null);
        }
    };

    const handleAddAllWords = async () => {
        if (!user) {
            flash('error', "Lug'atga qo'shish uchun avval tizimga kiring.");
            return;
        }

        setIsAddingAll(true);
        try {
            const batch = writeBatch(db);
            const wordsToAdd = vocabulary.filter(item => !addedWords.has(norm(item.word)));

            if (wordsToAdd.length === 0) return;

            wordsToAdd.forEach(item => {
                const docRef = doc(collection(db, "users", user.uid, "vocabulary"));
                batch.set(docRef, {
                    word: item.word,
                    contextSentence: item.example || "",
                    testTitle: articleTitle || "Maqola",
                    sectionTitle: articleTitle || "Maqola",
                    addedAt: serverTimestamp(),

                    definition: item.definition || "",
                    example: item.example || "",
                    translation: item.translation || "",
                    hasAI: true,

                    learningStatus: 'learning',
                    easeFactor: 2.5,
                    interval: 0,
                    nextReviewDate: serverTimestamp()
                });
            });

            await batch.commit();

            setAddedWords(prev => {
                const next = new Set(prev);
                wordsToAdd.forEach(item => next.add(norm(item.word)));
                return next;
            });
            flash('info', `${wordsToAdd.length} ta so'z lug'atingizga qo'shildi.`);
        } catch (error) {
            console.error("Error adding all words to wordbank:", error);
            flash('error', "Barcha so'zlarni qo'shishda xatolik: " + error.message);
        } finally {
            setIsAddingAll(false);
        }
    };

    /* Qidiruv so'z, tarjima va ta'rif bo'yicha ishlaydi — o'quvchi ko'pincha
       o'zbekcha ma'nosini yozib qidiradi. Asl indeks saqlanadi: tartib raqami
       filtrlangandan keyin ham maqoladagi joyni ko'rsatadi. */
    const rows = useMemo(
        () => vocabulary.map((item, idx) => ({ item, idx })),
        [vocabulary]
    );
    const visibleRows = useMemo(() => {
        const q = norm(search);
        if (!q) return rows;
        return rows.filter(({ item }) =>
            norm(item.word).includes(q) ||
            norm(item.translation).includes(q) ||
            norm(item.definition).includes(q)
        );
    }, [rows, search]);

    const addedCount = useMemo(
        () => vocabulary.filter(item => addedWords.has(norm(item.word))).length,
        [vocabulary, addedWords]
    );
    const allAdded = vocabulary.length > 0 && addedCount === vocabulary.length;
    const progress = vocabulary.length ? (addedCount / vocabulary.length) * 100 : 0;

    if (!vocabulary?.length) return null;

    return (
        <section className="mt-16 mb-8 max-w-2xl mx-auto vocab-block font-sans">
            {/* Maqola sahifasining "qog'oz" mavzusi (--r-*) bilan bir xil ranglar:
                oq kartochka va ko'k/to'q sariq urg'u bu fonda begona ko'rinardi. */}
            <style>{`
                .vocab-block { font-family: Outfit, Inter, system-ui, sans-serif; }
                .vocab-card {
                    background: var(--r-paper);
                    border: 1px solid var(--r-hairline);
                }
                .vocab-head { background: var(--r-surface); }
                .vocab-head:hover { background: var(--r-surface-strong); }
                .vocab-row { transition: background-color .15s ease; }
                .vocab-row:hover { background: var(--r-hover); }
                .vocab-row.is-open { background: var(--r-hover); }
                .vocab-ghost {
                    color: var(--r-muted);
                    transition: background-color .15s ease, color .15s ease, transform .12s ease;
                }
                .vocab-ghost:hover { background: var(--r-hover); color: var(--r-ink); }
                .vocab-ghost:active { transform: scale(0.94); }
                .vocab-ghost.is-active { color: var(--r-accent); background: var(--r-accent-soft); }
                .vocab-added {
                    color: var(--r-accent);
                    background: var(--r-accent-soft);
                    transition: background-color .15s ease, color .15s ease;
                }
                .vocab-added:hover { color: #d05353; background: rgba(208, 83, 83, 0.12); }
                .vocab-solid {
                    background: var(--r-ink);
                    color: var(--r-paper);
                    transition: filter .15s ease, transform .12s ease;
                }
                .vocab-solid:hover:not(:disabled) { filter: brightness(1.25); }
                .vocab-solid:active:not(:disabled) { transform: scale(0.97); }
                .vocab-solid:disabled { opacity: .6; }
                .vocab-search {
                    background: var(--r-surface);
                    border: 1px solid transparent;
                    color: var(--r-ink);
                    transition: border-color .15s ease, background-color .15s ease;
                }
                .vocab-search::placeholder { color: var(--r-muted); }
                .vocab-search:focus { border-color: var(--r-focus); background: var(--r-paper); }
                .vocab-block button:focus-visible,
                .vocab-search:focus-visible {
                    outline: 2px solid var(--r-focus);
                    outline-offset: 2px;
                }
                /* Misol jumlasi maqola matni bilan bir xil serif — kontekstdan uzilmasin */
                .vocab-example {
                    font-family: Charter, Georgia, Cambria, "Times New Roman", Times, serif;
                }
                @media (prefers-reduced-motion: reduce) {
                    .vocab-row, .vocab-ghost, .vocab-solid { transition: none; }
                }
            `}</style>

            <div className="vocab-card rounded-2xl overflow-hidden">
                {/* Sarlavha: bosilganda ro'yxat ochiladi/yopiladi */}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="vocab-head w-full flex items-center gap-3 p-4 sm:p-[18px] text-left transition-colors"
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--r-accent-soft)', color: 'var(--r-accent)' }}
                    >
                        <BookMarked size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3
                            className="text-[17px] font-semibold tracking-[-0.01em] leading-tight"
                            style={{ color: 'var(--r-ink)' }}
                        >
                            Kalit so'zlar
                            {level && (
                                <span
                                    className="ml-2 align-middle text-[10px] font-bold uppercase tracking-[0.06em] px-1.5 py-[3px] rounded-md"
                                    style={{ backgroundColor: 'var(--r-accent-soft)', color: 'var(--r-accent)' }}
                                >
                                    {level}
                                </span>
                            )}
                        </h3>
                        <p className="text-[12.5px] leading-snug mt-[3px]" style={{ color: 'var(--r-muted)' }}>
                            {vocabulary.length} ta so'z
                            {user && (
                                <>
                                    <span className="mx-1.5 opacity-50">·</span>
                                    <span style={allAdded ? { color: 'var(--r-accent)', fontWeight: 600 } : undefined}>
                                        {addedCount} ta lug'atingizda
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                    <ChevronDown
                        size={18}
                        className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        style={{ color: 'var(--r-muted)' }}
                    />
                </button>

                {/* Yupqa progress chizig'i — qancha so'z saqlanganini bir qarashda ko'rsatadi */}
                {user && (
                    <div className="h-[3px]" style={{ backgroundColor: 'var(--r-track)' }}>
                        <motion.div
                            className="h-full"
                            style={{ backgroundColor: 'var(--r-accent)' }}
                            initial={false}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                        >
                            {/* Asboblar qatori: qidiruv + hammasini qo'shish */}
                            <div
                                className="flex items-center gap-2 px-3 sm:px-4 py-3 border-t"
                                style={{ borderColor: 'var(--r-hairline)' }}
                            >
                                {vocabulary.length > 5 && (
                                    <div className="relative flex-1 min-w-0">
                                        <Search
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                            style={{ color: 'var(--r-muted)' }}
                                        />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="So'z yoki tarjima bo'yicha qidirish"
                                            aria-label="Lug'at ichidan qidirish"
                                            className="vocab-search w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none"
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={() => setSearch('')}
                                                aria-label="Qidiruvni tozalash"
                                                className="vocab-ghost absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleAddAllWords}
                                    disabled={isAddingAll || allAdded}
                                    title={allAdded ? "Barcha so'zlar lug'atingizda" : "Barcha so'zlarni lug'atga qo'shish"}
                                    className={`shrink-0 ml-auto flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold tracking-[-0.005em] ${
                                        allAdded ? 'cursor-default' : 'vocab-solid'
                                    }`}
                                    style={allAdded ? { backgroundColor: 'var(--r-accent-soft)', color: 'var(--r-accent)' } : undefined}
                                >
                                    {isAddingAll ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Qo'shilmoqda</span>
                                        </>
                                    ) : allAdded ? (
                                        <>
                                            <Check size={14} />
                                            <span>Hammasi qo'shilgan</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={14} />
                                            <span className="hidden sm:inline">Hammasini qo'shish</span>
                                            <span className="sm:hidden">Hammasi</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <AnimatePresence>
                                {notice && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <div
                                            className="mx-3 sm:mx-4 mb-2 flex items-start gap-2 px-3 py-2 rounded-lg text-[12.5px] leading-snug"
                                            style={notice.type === 'error'
                                                ? { backgroundColor: 'rgba(208, 83, 83, 0.12)', color: '#d05353' }
                                                : { backgroundColor: 'var(--r-accent-soft)', color: 'var(--r-accent)' }}
                                        >
                                            {notice.type === 'error'
                                                ? <AlertCircle size={15} className="mt-px shrink-0" />
                                                : <Check size={15} className="mt-px shrink-0" />}
                                            <span>{notice.text}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Ro'yxat: kartochkalar emas, bo'linuvchi qatorlar — zichroq va o'qishga qulay */}
                            <ul className="border-t" style={{ borderColor: 'var(--r-hairline)' }}>
                                {visibleRows.map(({ item, idx }, position) => {
                                    const isOpen = openIndex === idx;
                                    const isAdded = addedWords.has(norm(item.word));
                                    const isBusy = addingWordId === item.word;
                                    const isSpeaking = speakingWord === item.word;
                                    const panelId = `vocab-panel-${idx}`;
                                    const hasDetails = Boolean(item.definition || item.example);
                                    const toggle = () => hasDetails && setOpenIndex(isOpen ? null : idx);

                                    return (
                                        <li
                                            key={`${item.word}-${idx}`}
                                            className={`relative vocab-row ${isOpen ? 'is-open' : ''}`}
                                            style={position > 0 ? { borderTop: '1px solid var(--r-hairline)' } : undefined}
                                        >
                                            {/* Qo'shilgan so'zning chap chekkasida urg'u chizig'i */}
                                            {isAdded && (
                                                <span
                                                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                                                    style={{ backgroundColor: 'var(--r-accent)' }}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <div className="flex items-start gap-2 px-3 sm:px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={toggle}
                                                    aria-expanded={hasDetails ? isOpen : undefined}
                                                    aria-controls={hasDetails ? panelId : undefined}
                                                    className={`flex flex-1 items-start gap-3 min-w-0 text-left py-0.5 rounded-lg ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                                                >
                                                    <span
                                                        className="text-[11px] font-semibold w-4 shrink-0 pt-[5px] tabular-nums opacity-70"
                                                        style={{ color: 'var(--r-muted)' }}
                                                    >
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-baseline gap-2 flex-wrap">
                                                            <span
                                                                className="text-[16px] font-semibold tracking-[-0.01em] leading-snug"
                                                                style={{ color: 'var(--r-ink)' }}
                                                            >
                                                                {item.word}
                                                            </span>
                                                            {item.partOfSpeech && (
                                                                <span
                                                                    className="text-[11px] italic leading-none"
                                                                    style={{ color: 'var(--r-muted)' }}
                                                                >
                                                                    {item.partOfSpeech}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.translation && (
                                                            <p
                                                                className="text-[14px] leading-snug mt-[3px]"
                                                                style={{ color: 'var(--r-ink-soft)' }}
                                                            >
                                                                {item.translation}
                                                            </p>
                                                        )}
                                                        {hasDetails && !isOpen && (
                                                            <span
                                                                className="inline-flex items-center gap-1 mt-1.5 text-[11.5px] font-medium"
                                                                style={{ color: 'var(--r-muted)' }}
                                                            >
                                                                Ta'rif va misol
                                                                <ChevronDown size={11} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>

                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => speakWord(item.word)}
                                                        className={`vocab-ghost w-9 h-9 flex items-center justify-center rounded-lg ${isSpeaking ? 'is-active' : ''}`}
                                                        title="Talaffuzini tinglash"
                                                        aria-label={`${item.word} — talaffuzini tinglash`}
                                                    >
                                                        <Volume2 size={16} className={isSpeaking ? 'animate-pulse' : ''} />
                                                    </button>
                                                    {/* Qo'shish/o'chirish: holati matn bilan ham ko'rinsin */}
                                                    <button
                                                        type="button"
                                                        onClick={() => (isAdded ? handleRemoveWord(item) : handleAddWord(item))}
                                                        disabled={isBusy}
                                                        className={`h-9 px-2.5 flex items-center gap-1 rounded-lg text-[12.5px] font-semibold group/add ${
                                                            isAdded ? 'vocab-added' : 'vocab-ghost'
                                                        }`}
                                                        title={isAdded ? "Lug'atdan o'chirish" : "Lug'atga qo'shish"}
                                                        aria-label={isAdded ? `${item.word} — lug'atdan o'chirish` : `${item.word} — lug'atga qo'shish`}
                                                    >
                                                        {isBusy ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : isAdded ? (
                                                            <>
                                                                <Check size={16} className="group-hover/add:hidden" />
                                                                <X size={16} className="hidden group-hover/add:block" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={16} />
                                                                <span className="hidden sm:inline">Qo'shish</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <AnimatePresence initial={false}>
                                                {isOpen && hasDetails && (
                                                    <motion.div
                                                        id={panelId}
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-3 sm:px-4 pb-4 pl-10 sm:pl-11 space-y-2.5">
                                                            {item.definition && (
                                                                <p
                                                                    className="text-[13.5px] leading-[1.6]"
                                                                    style={{ color: 'var(--r-muted)' }}
                                                                >
                                                                    {item.definition}
                                                                </p>
                                                            )}
                                                            {item.example && (
                                                                <p
                                                                    className="vocab-example text-[15px] italic leading-[1.65] pl-3 border-l-2"
                                                                    style={{ color: 'var(--r-ink-soft)', borderColor: 'var(--r-accent-soft)' }}
                                                                >
                                                                    &ldquo;{item.example}&rdquo;
                                                                </p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </li>
                                    );
                                })}
                            </ul>

                            {visibleRows.length === 0 && (
                                <div className="px-4 py-10 text-center">
                                    <p className="text-[13px]" style={{ color: 'var(--r-muted)' }}>
                                        &ldquo;{search}&rdquo; bo'yicha so'z topilmadi
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="mt-2 text-[13px] font-semibold hover:underline"
                                        style={{ color: 'var(--r-accent)' }}
                                    >
                                        Qidiruvni tozalash
                                    </button>
                                </div>
                            )}

                            {!user && (
                                <div
                                    className="px-4 py-3 border-t text-center"
                                    style={{ borderColor: 'var(--r-hairline)', backgroundColor: 'var(--r-surface)' }}
                                >
                                    <p className="text-[12.5px] leading-snug" style={{ color: 'var(--r-muted)' }}>
                                        So'zlarni shaxsiy lug'atingizga saqlash uchun tizimga kiring.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
