import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function WordBankFlashcards({ words, onBack, onUpdateStatus }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = right, -1 = left

    if (!words || words.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <RefreshCw className="w-12 h-12 text-gray-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">So'zlar topilmadi</h3>
                <p className="text-gray-400 mb-6">Flashcard o'ynash uchun kamida 1 ta so'z bo'lishi kerak.</p>
                <button
                    onClick={onBack}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                    Orqaga qaytish
                </button>
            </div>
        );
    }

    const currentWord = words[currentIndex];

    // Card Animation Variants
    const swipeVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            rotateY: isFlipped ? 180 : 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            rotateY: isFlipped ? 180 : 0
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            rotateY: isFlipped ? 180 : 0
        })
    };

    const handleNext = () => {
        setDirection(1);
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleKnowledgeAction = (status) => {
        // Option to save status like "mastered" or "needs_review" to DB via parent
        if (onUpdateStatus) {
            onUpdateStatus(currentWord.id, status);
        }
        handleNext();
    };

    return (
        <div className="flex flex-col h-full w-full max-w-2xl mx-auto py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Orqaga</span>
                </button>
                <div className="text-sm font-medium text-gray-400 bg-white/5 px-4 py-1.5 rounded-full">
                    {currentIndex + 1} / {words.length}
                </div>
            </div>

            {/* Flashcard Area */}
            <div className="flex-1 relative flex items-center justify-center min-h-[400px] perspective-1000 mb-8 px-4">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={swipeVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                            rotateY: { duration: 0.4, ease: "easeInOut" }
                        }}
                        className="w-full h-full max-w-md cursor-pointer absolute preserve-3d"
                        onClick={handleFlip}
                    >
                        {/* FRONT FACE (English Word) */}
                        <div
                            className={`absolute w-full h-full backface-hidden rounded-3xl p-8 flex flex-col items-center justify-center text-center inset-0 ${isFlipped ? 'invisible' : 'visible'}`}
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                                {currentWord.word}
                            </h2>
                            {currentWord.contextSentence && (
                                <div className="mt-4 border-t border-white/10 pt-6">
                                    <p className="text-sm text-gray-400 italic font-medium opacity-80">
                                        "{currentWord.contextSentence}"
                                    </p>
                                </div>
                            )}
                            <div className="absolute bottom-6 text-xs text-gray-500 font-medium uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5" />
                                O'girish uchun bosing
                            </div>
                        </div>

                        {/* BACK FACE (Translation & Def) */}
                        <div
                            className={`absolute w-full h-full backface-hidden rounded-3xl p-8 flex flex-col justify-center inset-0 ${!isFlipped ? 'invisible' : 'visible'}`}
                            style={{
                                transform: 'rotateY(180deg)',
                                background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 64, 175, 0.05) 100%)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div className="space-y-6">
                                {currentWord.translation ? (
                                    <div>
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Tarjimasi</span>
                                        <h3 className="text-2xl font-bold text-white leading-tight">
                                            {currentWord.translation}
                                        </h3>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white leading-tight mb-2">Tarjima yo'q</h3>
                                        <p className="text-sm text-gray-400">Wordbank'dagi "AI Izoh" tugmasini bosib tarjimani yuklang.</p>
                                    </div>
                                )}

                                {currentWord.definition && (
                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">Definition</span>
                                        <p className="text-sm text-gray-200">{currentWord.definition}</p>
                                    </div>
                                )}

                                {currentWord.example && (
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Misol</span>
                                        <p className="text-sm text-gray-300 italic">"{currentWord.example}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4 max-w-sm mx-auto w-full gap-4">
                <button
                    onClick={handlePrev}
                    className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleKnowledgeAction('needs_review')}
                        className="p-4 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all hover:scale-105 active:scale-95 border border-red-500/20"
                        title="Yodlash kerak"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => handleKnowledgeAction('mastered')}
                        className="p-4 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-all hover:scale-105 active:scale-95 border border-green-500/20"
                        title="Yodladim"
                    >
                        <CheckCircle className="w-6 h-6" />
                    </button>
                </div>

                <button
                    onClick={handleNext}
                    className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
