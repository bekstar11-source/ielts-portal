import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, XCircle, Brain, Target, Zap, Volume2 } from 'lucide-react';

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
    const [playingAudio, setPlayingAudio] = useState(false);

    const playPronunciation = (e, text) => {
        e.stopPropagation();
        if (!('speechSynthesis' in window)) {
            alert("Afsuski, brauzeringizda ovozli o'qish imkoniyati yo'q.");
            return;
        }
        window.speechSynthesis.cancel();
        setPlayingAudio(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => setPlayingAudio(false);
        utterance.onerror = () => setPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
    };

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

    // Spaced Repetition System (SM-2 Algorithm subset)
    const handleKnowledgeAction = (quality) => {
        // Quality: 1 (Qiyin), 3 (Yaxshi), 5 (Oson)
        let easeFactor = currentWord.easeFactor || 2.5;
        let interval = currentWord.interval || 0;
        let learningStatus = currentWord.learningStatus || 'learning';

        // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (easeFactor < 1.3) easeFactor = 1.3; // Minimum limit

        if (quality < 3) {
            // Hard or failed: reset interval
            interval = 0;
            learningStatus = 'learning';
        } else {
            // Good or Easy
            if (interval === 0) {
                interval = 1;
            } else if (interval === 1) {
                interval = 3; // First successful review
            } else {
                interval = Math.round(interval * easeFactor);
            }
            // If it's pushed far enough, consider it mastered (e.g. interval > 14 days)
            if (interval > 14) learningStatus = 'mastered';
            else learningStatus = 'review';
        }

        // Calculate Next Review Date
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        if (onUpdateStatus) {
            onUpdateStatus(currentWord.id, {
                learningStatus,
                easeFactor,
                interval,
                nextReviewDate
            });
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
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                    {currentWord.word}
                                </h2>
                                <button
                                    onClick={(e) => playPronunciation(e, currentWord.word)}
                                    className={`p-3 rounded-full transition-all ${playingAudio ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                    title="Talaffuz"
                                >
                                    <Volume2 className="w-6 h-6" />
                                </button>
                            </div>
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
            <div className="flex flex-col items-center justify-between px-4 max-w-sm mx-auto w-full gap-4">
                <div className="flex items-center justify-between w-full">
                    <button
                        onClick={handlePrev}
                        className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    {isFlipped ? (
                        <div className="flex gap-2 animate-fade-in-up">
                            <button
                                onClick={() => handleKnowledgeAction(1)}
                                className="flex flex-col items-center p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all hover:scale-105 active:scale-95 border border-red-500/20 min-w-[80px]"
                            >
                                <Brain className="w-5 h-5 mb-1" />
                                <span className="text-xs font-bold">Qiyin</span>
                                <span className="text-[10px] opacity-70 mt-1">1m</span>
                            </button>
                            <button
                                onClick={() => handleKnowledgeAction(3)}
                                className="flex flex-col items-center p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all hover:scale-105 active:scale-95 border border-blue-500/20 min-w-[80px]"
                            >
                                <Target className="w-5 h-5 mb-1" />
                                <span className="text-xs font-bold">Yaxshi</span>
                                <span className="text-[10px] opacity-70 mt-1">1-3 k</span>
                            </button>
                            <button
                                onClick={() => handleKnowledgeAction(5)}
                                className="flex flex-col items-center p-3 rounded-2xl bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-all hover:scale-105 active:scale-95 border border-green-500/20 min-w-[80px]"
                            >
                                <Zap className="w-5 h-5 mb-1" />
                                <span className="text-xs font-bold">Oson</span>
                                <span className="text-[10px] opacity-70 mt-1">4+ k</span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 italic">Javobni ko'rish uchh karta ustiga bosing</div>
                    )}

                    <button
                        onClick={handleNext}
                        className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
