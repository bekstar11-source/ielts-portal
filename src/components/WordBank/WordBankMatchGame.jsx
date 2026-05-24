import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trophy, AlertTriangle, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

// Fisher-Yates shuffle
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export default function WordBankMatchGame({ words, onBack, onComplete }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t, lang } = useTranslation();

    const [resetKey, setResetKey] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, won, error, init
    const [leftItems, setLeftItems] = useState([]);
    const [rightItems, setRightItems] = useState([]);

    const [selectedLeft, setSelectedLeft] = useState(null);
    const [selectedRight, setSelectedRight] = useState(null);
    const [matchedPairs, setMatchedPairs] = useState(new Set());
    const [incorrectMatch, setIncorrectMatch] = useState(false);

    // Stats
    const [moves, setMoves] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);

    // Timer logic
    useEffect(() => {
        let timer;
        if (gameState === 'playing') {
            timer = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [gameState]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Initialize Game
    useEffect(() => {
        if (!words || words.length === 0) return;

        // Take up to 6 random words that have definitions, translations, or are keyword pairs
        const validWords = words.filter(w =>
            w.translation || w.definition || (w.passageWord && w.questionWord)
        );

        if (validWords.length < 3) {
            setGameState('error');
            return;
        }

        const selectedWords = shuffleArray(validWords).slice(0, 6);

        const left = selectedWords.map(w => ({
            id: w.id,
            text: w.passageWord || w.word,
            type: 'left'
        }));
        const right = selectedWords.map(w => ({
            id: w.id,
            text: w.questionWord || w.translation || (w.definition ? w.definition.substring(0, 40) + '...' : ''),
            type: 'right'
        }));

        setLeftItems(shuffleArray(left));
        setRightItems(shuffleArray(right));
        setMatchedPairs(new Set());
        setMoves(0);
        setTimeElapsed(0);
        setGameState('playing');
        setSelectedLeft(null);
        setSelectedRight(null);
    }, [words, resetKey]);

    // Handle Selection Logic
    useEffect(() => {
        if (selectedLeft && selectedRight) {
            setMoves(m => m + 1);
            if (selectedLeft.id === selectedRight.id) {
                // Match
                setMatchedPairs(prev => new Set([...prev, selectedLeft.id]));
                setSelectedLeft(null);
                setSelectedRight(null);
            } else {
                // No Match
                setIncorrectMatch(true);
                setTimeout(() => {
                    setSelectedLeft(null);
                    setSelectedRight(null);
                    setIncorrectMatch(false);
                }, 800);
            }
        }
    }, [selectedLeft, selectedRight]);

    // Win condition check
    useEffect(() => {
        if (leftItems.length > 0 && matchedPairs.size === leftItems.length) {
            setGameState('won');
            if (onComplete) onComplete(moves, timeElapsed);
        }
    }, [matchedPairs, leftItems.length, moves, timeElapsed, onComplete]);


    const handleItemClick = (item) => {
        if (matchedPairs.has(item.id)) return; // Already matched
        if (incorrectMatch) return; // Wait for animation

        if (item.type === 'left') {
            if (selectedLeft?.id === item.id) setSelectedLeft(null); // Deselect
            else setSelectedLeft(item);
        } else {
            if (selectedRight?.id === item.id) setSelectedRight(null); // Deselect
            else setSelectedRight(item);
        }
    };

    if (gameState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('wordbank.notEnoughWords')}</h3>
                <p className="text-gray-400 mb-6 font-light">{t('wordbank.matchMinWords')}</p>
                <button onClick={onBack} className={`px-6 py-2 rounded-lg transition-colors border ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                    {t('wordbank.goBack')}
                </button>
            </div>
        );
    }

    if (gameState === 'won') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full animate-fade-in-up">
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                    <Trophy className="w-12 h-12 text-yellow-400" />
                </div>
                <h2 className={`text-4xl font-bold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('wordbank.gameComplete')}</h2>
                <p className="text-gray-400 mb-8 text-lg font-light text-center">
                    {lang === 'uz' ? (
                        <>Siz barcha so'zlarni <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{formatTime(timeElapsed)}</span> ichida <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{moves}</span> ta urinishda topdingiz.</>
                    ) : (
                        <>You matched all words in <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{formatTime(timeElapsed)}</span> with <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{moves}</span> attempts.</>
                    )}
                </p>
                <div className="flex gap-4">
                    <button onClick={onBack} className={`px-6 py-3 font-medium rounded-xl transition-colors border ${isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'}`}>
                        {t('wordbank.backToVocabulary')}
                    </button>
                    <button onClick={() => {
                        setResetKey(prev => prev + 1);
                    }} className="px-6 py-3 bg-[#FB5102] hover:bg-[#e64a02] text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-[#FB5102]/20">
                        {t('wordbank.playAgain')}
                    </button>
                </div>
            </div>
        );
    }

    // ITEM CLASSES
    const getItemClass = (item) => {
        const isMatched = matchedPairs.has(item.id);
        const isSelected = (item.type === 'left' && selectedLeft?.id === item.id) ||
            (item.type === 'right' && selectedRight?.id === item.id);

        let baseClass = "p-4 w-full rounded-2xl border transition-all duration-300 font-semibold cursor-pointer text-center min-h-[80px] flex items-center justify-center hover:scale-[1.01] active:scale-[0.99] ";

        if (isMatched) {
            return baseClass + (isDark 
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 opacity-50 cursor-default scale-[0.98] hover:scale-[0.98] active:scale-[0.98]" 
                : "bg-emerald-50 border-emerald-200 text-emerald-700 opacity-60 cursor-default scale-[0.98] hover:scale-[0.98] active:scale-[0.98]");
        }

        if (isSelected) {
            if (incorrectMatch) {
                return baseClass + (isDark 
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-200 animate-shake" 
                    : "bg-rose-50 border-rose-300 text-rose-700 animate-shake");
            }
            // Brand orange (#FB5102) accent for selected state
            return baseClass + (isDark 
                ? "bg-[#FB5102]/20 border-[#FB5102] text-[#FB5102] font-bold shadow-[0_0_15px_rgba(251,81,2,0.25)] scale-[1.03]" 
                : "bg-[#FB5102]/10 border-[#FB5102] text-[#FB5102] font-bold shadow-[0_0_15px_rgba(251,81,2,0.12)] scale-[1.03]");
        }

        if (isDark) {
            return baseClass + "bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-[#FB5102]/30 shadow-md";
        } else {
            return baseClass + "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-[#FB5102]/30 shadow-sm";
        }
    };

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 py-8 px-4 flex flex-col justify-between relative ${isDark ? 'bg-black text-[#f5f5f7]' : 'bg-slate-50 text-[#1d1d1f]'}`}>
            {/* Soft Ambient Glowing Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] mix-blend-screen animate-pulse ${isDark ? 'bg-[#FB5102]/6' : 'bg-[#FB5102]/2'}`} style={{ animationDuration: '6s' }} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] mix-blend-screen animate-pulse ${isDark ? 'bg-orange-500/4' : 'bg-orange-300/2'}`} style={{ animationDuration: '8s' }} />
            </div>

            <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-4">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>{t('wordbank.back')}</span>
                    </button>
                    <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-2 text-sm font-bold backdrop-blur-md p-2 px-3 rounded-lg border shadow-sm ${isDark ? 'text-gray-200 bg-white/15 border-white/20' : 'text-slate-700 bg-white border-slate-200'}`}>
                            <Clock className="w-4 h-4 text-[#FB5102]" />
                            <span className={`font-mono text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{formatTime(timeElapsed)}</span>
                        </div>
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            {t('wordbank.attempts')}: <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{moves}</span>
                        </div>
                    </div>
                </div>

                {/* Game Board */}
                <div className="flex-1 grid grid-cols-2 gap-4 md:gap-8 px-4 mb-8">
                    {/* Left Column (English Words) */}
                    <div className="flex flex-col gap-3">
                        <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 px-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t('wordbank.wordsLabel')}</h3>
                        {leftItems.map(item => (
                            <div
                                key={`left-${item.id}`}
                                onClick={() => handleItemClick(item)}
                                className={getItemClass(item)}
                            >
                                <span className="text-lg">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Right Column (Translations/Definitions) */}
                    <div className="flex flex-col gap-3">
                        <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 px-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t('wordbank.meanings')}</h3>
                        {rightItems.map(item => (
                            <div
                                key={`right-${item.id}`}
                                onClick={() => handleItemClick(item)}
                                className={getItemClass(item)}
                            >
                                <span className="text-sm md:text-base leading-tight">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-6px); }
                        75% { transform: translateX(6px); }
                    }
                    .animate-shake {
                        animation: shake 0.15s ease-in-out 0s 2;
                    }
                `}</style>
            </div>
        </div>
    );
}
