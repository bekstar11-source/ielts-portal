import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, XCircle, Brain, Target, Zap, Volume2 } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function WordBankFlashcards({ words, onBack, onUpdateStatus }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = right, -1 = left
    const { t } = useTranslation();

    if (!words || words.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <RefreshCw className="w-12 h-12 text-gray-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('wordbank.wordsNotFound')}</h3>
                <p className="text-gray-400 mb-6">{t('wordbank.flashcardMinWords')}</p>
                <button
                    onClick={onBack}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                    {t('wordbank.goBack')}
                </button>
            </div>
        );
    }

    const currentWord = words[currentIndex];
    const [playingAudio, setPlayingAudio] = useState(false);

    const playPronunciation = (e, text) => {
        e.stopPropagation();
        if (!('speechSynthesis' in window)) {
            alert(t('wordbank.speechNotSupported'));
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

    // Color themes based on isDark
    const frontStyle = {
        background: isDark 
            ? 'linear-gradient(145deg, rgba(28, 28, 30, 0.8) 0%, rgba(10, 10, 12, 0.9) 100%)' 
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 245, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isDark ? '0 20px 40px -15px rgba(0, 0, 0, 0.7)' : '0 20px 40px -15px rgba(0, 0, 0, 0.06)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
    };

    const backStyle = {
        transform: 'rotateY(180deg)',
        background: isDark 
            ? 'linear-gradient(145deg, rgba(251, 81, 2, 0.12) 0%, rgba(20, 20, 25, 0.9) 100%)' 
            : 'linear-gradient(145deg, rgba(251, 81, 2, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isDark ? '1px solid rgba(251, 81, 2, 0.2)' : '1px solid rgba(251, 81, 2, 0.15)',
        boxShadow: isDark ? '0 20px 40px -15px rgba(0, 0, 0, 0.7)' : '0 20px 40px -15px rgba(0, 0, 0, 0.06)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
    };

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 py-8 px-4 flex flex-col justify-between relative ${isDark ? 'bg-black text-[#f5f5f7]' : 'bg-slate-50 text-[#1d1d1f]'}`}>
            {/* Soft Ambient Glowing Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] mix-blend-screen animate-pulse ${isDark ? 'bg-[#FB5102]/8' : 'bg-[#FB5102]/3'}`} style={{ animationDuration: '6s' }} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] mix-blend-screen animate-pulse ${isDark ? 'bg-orange-500/5' : 'bg-orange-300/3'}`} style={{ animationDuration: '8s' }} />
            </div>

            <div className="flex-1 flex flex-col justify-between max-w-2xl mx-auto w-full relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-4">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>{t('wordbank.back')}</span>
                    </button>
                    <div className={`text-sm font-medium px-4 py-1.5 rounded-full ${isDark ? 'text-gray-400 bg-white/5' : 'text-slate-600 bg-slate-200/60'}`}>
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
                                className="absolute w-full h-full backface-hidden rounded-3xl pt-8 px-8 pb-16 flex flex-col items-center justify-center text-center inset-0 overflow-hidden"
                                style={frontStyle}
                            >
                                <div className="flex items-center justify-center gap-4 mb-6">
                                    <h2 className={`text-4xl md:text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {currentWord.passageWord || currentWord.word}
                                    </h2>
                                    <button
                                        onClick={(e) => playPronunciation(e, currentWord.passageWord || currentWord.word)}
                                        className={`p-3 rounded-full transition-all ${playingAudio ? 'bg-[#FB5102]/20 text-[#FB5102] animate-pulse' : (isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-slate-200/50 hover:bg-slate-200 text-slate-600 hover:text-slate-950')}`}
                                        title="Talaffuz"
                                    >
                                        <Volume2 className="w-6 h-6" />
                                    </button>
                                </div>
                                {currentWord.contextSentence && (
                                    <div className={`mt-4 border-t w-full ${isDark ? 'border-white/10' : 'border-slate-200'} pt-6`}>
                                        <p className={`text-sm italic font-medium ${isDark ? 'text-gray-400 opacity-80' : 'text-slate-600'}`}>
                                            "{currentWord.contextSentence}"
                                        </p>
                                    </div>
                                )}
                                {currentWord.type && (
                                    <div className="mt-3">
                                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                                            currentWord.type === 'synonym' 
                                                ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') 
                                                : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                                        }`}>
                                            {currentWord.type}
                                        </span>
                                    </div>
                                )}
                                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 z-10 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                    <RefreshCw className="w-3 h-3" />
                                    {t('wordbank.clickToFlip')}
                                </div>
                            </div>

                            {/* BACK FACE (Translation & Def) */}
                            <div
                                className="absolute w-full h-full backface-hidden rounded-3xl p-8 flex flex-col justify-center inset-0 overflow-hidden"
                                style={backStyle}
                            >
                                <div className="space-y-6">
                                    {currentWord.questionWord ? (
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                {currentWord.type === 'antonym' ? t('wordbank.antonym') : t('wordbank.synonym')}
                                            </span>
                                            <h3 className={`text-3xl font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {currentWord.questionWord}
                                            </h3>
                                        </div>
                                    ) : currentWord.translation ? (
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t('wordbank.translation')}</span>
                                            <h3 className={`text-2xl font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {currentWord.translation}
                                            </h3>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <h3 className={`text-2xl font-bold leading-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('wordbank.noTranslationFound')}</h3>
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{t('wordbank.noTranslationDesc')}</p>
                                        </div>
                                    )}

                                    {currentWord.definition && (
                                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/35 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                            <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-[#FB5102]/85' : 'text-[#FB5102]'}`}>{t('wordbank.definition')}</span>
                                            <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>{currentWord.definition}</p>
                                        </div>
                                    )}

                                    {currentWord.example && (
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{t('wordbank.example')}</span>
                                            <p className={`text-sm italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>"{currentWord.example}"</p>
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
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-slate-200/50 hover:bg-slate-200/80 text-slate-700'}`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {isFlipped ? (
                            <div className="flex gap-2 animate-fade-in-up">
                                <button
                                    onClick={() => handleKnowledgeAction(1)}
                                    className="flex flex-col items-center py-2 px-3 rounded-2xl bg-rose-500/[0.06] hover:bg-rose-500/[0.12] dark:bg-rose-500/[0.1] dark:hover:bg-rose-500/[0.16] text-rose-600 dark:text-rose-400 border border-rose-500/10 dark:border-rose-500/20 transition-all hover:scale-[1.03] active:scale-[0.97] min-w-[74px]"
                                >
                                    <Brain className="w-4 h-4 mb-0.5" />
                                    <span className="text-[10px] font-bold tracking-wide">{t('wordbank.hard')}</span>
                                    <span className="text-[9px] opacity-75 mt-0.5">1m</span>
                                </button>
                                <button
                                    onClick={() => handleKnowledgeAction(3)}
                                    className="flex flex-col items-center py-2 px-3 rounded-2xl bg-blue-500/[0.06] hover:bg-blue-500/[0.12] dark:bg-blue-500/[0.1] dark:hover:bg-blue-500/[0.16] text-blue-600 dark:text-blue-400 border border-blue-500/10 dark:border-blue-500/20 transition-all hover:scale-[1.03] active:scale-[0.97] min-w-[74px]"
                                >
                                    <Target className="w-4 h-4 mb-0.5" />
                                    <span className="text-[10px] font-bold tracking-wide">{t('wordbank.good')}</span>
                                    <span className="text-[9px] opacity-75 mt-0.5">1-3 k</span>
                                </button>
                                <button
                                    onClick={() => handleKnowledgeAction(5)}
                                    className="flex flex-col items-center py-2 px-3 rounded-2xl bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] dark:bg-emerald-500/[0.1] dark:hover:bg-emerald-500/[0.16] text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 dark:border-emerald-500/20 transition-all hover:scale-[1.03] active:scale-[0.97] min-w-[74px]"
                                >
                                    <Zap className="w-4 h-4 mb-0.5" />
                                    <span className="text-[10px] font-bold tracking-wide">{t('wordbank.easy')}</span>
                                    <span className="text-[9px] opacity-75 mt-0.5">4+ k</span>
                                </button>
                            </div>
                        ) : (
                            <div className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t('wordbank.clickToSeeAnswer')}</div>
                        )}

                        <button
                            onClick={handleNext}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-slate-200/50 hover:bg-slate-200/80 text-slate-700'}`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
