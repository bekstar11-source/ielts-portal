import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trophy, AlertTriangle, Clock } from 'lucide-react';

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
    const [gameState, setGameState] = useState('playing'); // playing, won
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

        // Take up to 6 random words that have definitions or translations
        const validWords = words.filter(w => w.translation || w.definition);

        if (validWords.length < 3) {
            setGameState('error');
            return;
        }

        const selectedWords = shuffleArray(validWords).slice(0, 6);

        const left = selectedWords.map(w => ({ id: w.id, text: w.word, type: 'left' }));
        const right = selectedWords.map(w => ({
            id: w.id,
            text: w.translation || w.definition.substring(0, 40) + '...',
            type: 'right'
        }));

        setLeftItems(shuffleArray(left));
        setRightItems(shuffleArray(right));
        setMatchedPairs(new Set());
        setMoves(0);
        setTimeElapsed(0);
        setGameState('playing');
        setGameState('playing');
        setSelectedLeft(null);
        setSelectedRight(null);
    }, [words]);

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
                <h3 className="text-xl font-semibold text-white mb-2">So'zlar yetarli emas</h3>
                <p className="text-gray-400 mb-6">Match o'yinini o'ynash uchun kamida 3 ta tarjimasi yoki izohi bloklangan so'zingiz bo'lishi kerak.</p>
                <button onClick={onBack} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    Orqaga qaytish
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
                <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">O'yin yakunlandi!</h2>
                <p className="text-gray-400 mb-8 text-lg">Siz barcha so'zlarni <span className="text-white font-bold">{formatTime(timeElapsed)}</span> daqiqa ichida <span className="text-white font-bold">{moves}</span> ta urunishda topdingiz.</p>
                <div className="flex gap-4">
                    <button onClick={onBack} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors border border-white/10">
                        Lug'atga qaytish
                    </button>
                    <button onClick={() => {
                        // Re-trigger useEffect
                        setGameState('init');
                        setTimeout(() => setGameState('playing'), 50);
                    }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                        Yana o'ynash
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

        let baseClass = "p-4 w-full rounded-2xl border transition-all duration-300 font-medium cursor-pointer text-center min-h-[80px] flex items-center justify-center ";

        if (isMatched) {
            return baseClass + "bg-green-500/10 border-green-500/30 text-green-400 opacity-50 cursor-default scale-[0.98]";
        }

        if (isSelected) {
            if (incorrectMatch) {
                return baseClass + "bg-red-500/20 border-red-500/50 text-red-200 animate-shake";
            }
            return baseClass + "bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]";
        }

        return baseClass + "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200 hover:border-white/20";
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Orqaga</span>
                </button>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-400 bg-white/5 p-2 px-3 rounded-lg border border-white/10">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-mono text-base">{formatTime(timeElapsed)}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-400">
                        Urinishlar: <span className="text-white font-bold text-base">{moves}</span>
                    </div>
                </div>
            </div>

            {/* Game Board */}
            <div className="flex-1 grid grid-cols-2 gap-4 md:gap-8 px-4 mb-8">
                {/* Left Column (English Words) */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">So'zlar</h3>
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
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Ma'nolari</h3>
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
        </div>
    );
}
