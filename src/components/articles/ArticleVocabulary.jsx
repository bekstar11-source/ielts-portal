import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, ChevronDown, Volume2, Plus, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const speakWord = (word) => {
    if (!window.speechSynthesis || !word) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
};

export default function ArticleVocabulary({ vocabulary = [], level, articleTitle }) {
    const [expanded, setExpanded] = useState(true);
    const [openIndex, setOpenIndex] = useState(null);
    const { user } = useAuth();
    const [addedWords, setAddedWords] = useState(new Set());
    const [addingWordId, setAddingWordId] = useState(null);
    const [isAddingAll, setIsAddingAll] = useState(false);

    useEffect(() => {
        if (!user) {
            setAddedWords(new Set());
            return;
        }

        const fetchExistingWords = async () => {
            try {
                const q = query(collection(db, "users", user.uid, "vocabulary"));
                const snapshot = await getDocs(q);
                const wordsSet = new Set(snapshot.docs.map(doc => doc.data().word?.toLowerCase().trim()));
                setAddedWords(wordsSet);
            } catch (error) {
                console.error("Error fetching existing vocabulary:", error);
            }
        };

        fetchExistingWords();
    }, [user]);

    const handleAddWord = async (item) => {
        if (!user) {
            alert("Lug'atga qo'shish uchun avval tizimga kiring.");
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

            setAddedWords(prev => new Set([...prev, item.word.toLowerCase().trim()]));
        } catch (error) {
            console.error("Error adding word to wordbank:", error);
            alert("Lug'atga qo'shishda xatolik yuz berdi: " + error.message);
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
                next.delete(item.word.toLowerCase().trim());
                return next;
            });
        } catch (error) {
            console.error("Error removing word:", error);
            alert("O'chirishda xatolik yuz berdi: " + error.message);
        } finally {
            setAddingWordId(null);
        }
    };

    const handleAddAllWords = async () => {
        if (!user) {
            alert("Lug'atga qo'shish uchun avval tizimga kiring.");
            return;
        }

        setIsAddingAll(true);
        try {
            const batch = writeBatch(db);
            const wordsToAdd = vocabulary.filter(item => !addedWords.has(item.word?.toLowerCase().trim()));

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
                wordsToAdd.forEach(item => next.add(item.word.toLowerCase().trim()));
                return next;
            });
        } catch (error) {
            console.error("Error adding all words to wordbank:", error);
            alert("Barcha so'zlarni qo'shishda xatolik yuz berdi: " + error.message);
        } finally {
            setIsAddingAll(false);
        }
    };

    if (!vocabulary?.length) return null;

    return (
        <section className="mt-16 mb-8 max-w-2xl mx-auto">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#F9F9F9] dark:bg-neutral-900/50 hover:bg-[#F2F2F2] dark:hover:bg-neutral-900 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <BookMarked size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#242424] dark:text-neutral-100 font-sans">
                            Key vocabulary{level ? ` (${level})` : ''}
                        </h3>
                        <p className="text-[13px] text-[#6B6B6B] dark:text-neutral-400 font-sans">
                            {vocabulary.length} {vocabulary.length === 1 ? 'word' : 'words'} for this level
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 space-y-2">
                            <div className="flex items-center justify-between px-2 py-1">
                                <span className="text-[13px] text-gray-550 dark:text-neutral-400 font-sans">
                                    Barcha so'zlarni bir martada qo'shing
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddAllWords}
                                    disabled={isAddingAll || vocabulary.every(item => addedWords.has(item.word?.toLowerCase().trim()))}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FB5102] hover:bg-[#e64a02] disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:text-gray-400 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                                >
                                    {isAddingAll ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span>Qo'shilmoqda...</span>
                                        </>
                                    ) : vocabulary.every(item => addedWords.has(item.word?.toLowerCase().trim())) ? (
                                        <>
                                            <Check size={13} />
                                            <span>Barchasi qo'shilgan</span>
                                        </>
                                    ) : (
                                        <>
                                            <BookMarked size={13} />
                                            <span>Barchasini qo'shish</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            {vocabulary.map((item, idx) => {
                                const isOpen = openIndex === idx;
                                return (
                                    <div
                                        key={`${item.word}-${idx}`}
                                        className="rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-neutral-950 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenIndex(isOpen ? null : idx)}
                                            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-[11px] font-bold text-gray-400 w-5 shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-[#242424] dark:text-neutral-100 font-sans">
                                                            {item.word}
                                                        </span>
                                                        {item.partOfSpeech && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400">
                                                                {item.partOfSpeech}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.translation && (
                                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate font-sans">
                                                            {item.translation}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {(() => {
                                                    const isAdded = addedWords.has(item.word?.toLowerCase().trim());
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isAdded) {
                                                                    handleRemoveWord(item);
                                                                } else {
                                                                    handleAddWord(item);
                                                                }
                                                            }}
                                                            className={`p-2 rounded-lg transition-colors ${
                                                                isAdded 
                                                                    ? 'text-green-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' 
                                                                    : 'text-gray-400 hover:text-[#FB5102] hover:bg-orange-50 dark:hover:bg-orange-950/30'
                                                            }`}
                                                            title={isAdded ? "Lug'atdan o'chirish" : "Lug'atga qo'shish"}
                                                            disabled={addingWordId === item.word}
                                                        >
                                                            {addingWordId === item.word ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : isAdded ? (
                                                                <Check size={16} />
                                                            ) : (
                                                                <Plus size={16} />
                                                            )}
                                                        </button>
                                                    );
                                                })()}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        speakWord(item.word);
                                                    }}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                                    title="Listen"
                                                >
                                                    <Volume2 size={16} />
                                                </button>
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {isOpen && (item.definition || item.example) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden border-t border-black/[0.04] dark:border-white/[0.05]"
                                                >
                                                    <div className="px-4 py-3 pl-12 space-y-2 text-sm font-sans">
                                                        {item.definition && (
                                                            <p className="text-[#6B6B6B] dark:text-neutral-400 leading-relaxed">
                                                                {item.definition}
                                                            </p>
                                                        )}
                                                        {item.example && (
                                                            <p className="text-[#242424] dark:text-neutral-300 italic border-l-2 border-blue-500/40 pl-3">
                                                                &ldquo;{item.example}&rdquo;
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
