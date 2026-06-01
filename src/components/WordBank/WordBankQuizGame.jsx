import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trophy, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export default function WordBankQuizGame({ words, onBack, isDark }) {
    const { t } = useTranslation();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameState, setGameState] = useState('init'); // 'init', 'playing', 'won', 'error'
    const [resetKey, setResetKey] = useState(0);

    // Timer
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

    // Generate Quiz Questions
    useEffect(() => {
        // We need words that have translations or definitions
        const validWords = words.filter(w => 
            w.word && (w.translation || w.definition || w.questionWord)
        );

        if (validWords.length < 4) {
            setGameState('error');
            return;
        }

        // Shuffle and take up to 10 words
        const shuffledWords = [...validWords].sort(() => 0.5 - Math.random());
        const selectedWords = shuffledWords.slice(0, Math.min(10, shuffledWords.length));

        const generatedQuestions = selectedWords.map((wordItem) => {
            // Determine type of question:
            // 0: Given English word -> Find Uzbek Translation
            // 1: Given Uzbek Translation -> Find English Word
            // 2: Given Definition -> Find English Word
            let type = Math.floor(Math.random() * 3);
            
            // Fallback check: if word has no translation, force type 2 (definition)
            if (type === 0 && !wordItem.translation && !wordItem.questionWord) type = 2;
            if (type === 1 && !wordItem.translation && !wordItem.questionWord) type = 2;
            if (type === 2 && !wordItem.definition) type = 0; // if no definition, force translation

            let questionText = "";
            let correctAnswer = "";

            if (type === 0) {
                questionText = `"${wordItem.word}" so'zining tarjimasini toping:`;
                correctAnswer = wordItem.translation || wordItem.questionWord;
            } else if (type === 1) {
                questionText = `"${wordItem.translation || wordItem.questionWord}" tarjimasiga mos keluvchi so'zni toping:`;
                correctAnswer = wordItem.word;
            } else {
                questionText = `Ushbu ta'rifga mos keluvchi so'zni toping: \n"${wordItem.definition}"`;
                correctAnswer = wordItem.word;
            }

            // Generate options (correct + 3 distractors)
            const distractors = validWords
                .filter(w => w.id !== wordItem.id)
                .map(w => {
                    if (type === 0) return w.translation || w.questionWord;
                    return w.word;
                })
                .filter(val => val && val !== correctAnswer);

            // Shuffle distractors and pick 3
            const shuffledDistractors = [...new Set(distractors)].sort(() => 0.5 - Math.random()).slice(0, 3);
            
            // If we don't have 3 distractors, pad with dummy placeholders
            while (shuffledDistractors.length < 3) {
                shuffledDistractors.push(type === 0 ? "Noma'lum" : "Word");
            }

            const options = [...shuffledDistractors, correctAnswer].sort(() => 0.5 - Math.random());

            return {
                questionText,
                correctAnswer,
                options,
                wordItem
            };
        });

        setQuestions(generatedQuestions);
        setCurrentQuestionIdx(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setScore(0);
        setTimeElapsed(0);
        setGameState('playing');
    }, [words, resetKey]);

    const handleOptionClick = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);

        const currentQ = questions[currentQuestionIdx];
        if (option === currentQ.correctAnswer) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIdx + 1 < questions.length) {
            setCurrentQuestionIdx(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setGameState('won');
        }
    };

    if (gameState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4 animate-bounce" />
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    So'zlar yetarli emas
                </h3>
                <p className="text-gray-400 mb-6 font-light max-w-sm">
                    Multiple Choice Quiz o'ynash uchun Wordbank'da kamida 4 ta tarjimasi yoki izohi bor so'z bo'lishi kerak.
                </p>
                <button onClick={onBack} className="px-6 py-2.5 bg-[#FB5102] hover:bg-[#e64a02] text-white rounded-xl transition-all shadow-md">
                    Orqaga qaytish
                </button>
            </div>
        );
    }

    if (gameState === 'won') {
        const percent = Math.round((score / questions.length) * 100);
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full max-w-md mx-auto animate-fade-in-up">
                <div className="w-24 h-24 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mb-6">
                    <Trophy className="w-12 h-12 text-yellow-500 animate-pulse" />
                </div>
                <h2 className="text-3xl font-extrabold mb-1 tracking-tight">Quiz yakunlandi!</h2>
                <p className="text-gray-400 text-sm mb-6">Sizning natijangiz:</p>

                {/* Score Circular Ring */}
                <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="50" stroke={isDark ? '#2c2c2e' : '#e5e7eb'} strokeWidth="8" fill="transparent" />
                        <circle cx="64" cy="64" r="50" stroke="#FB5102" strokeWidth="8" fill="transparent"
                            strokeDasharray={314}
                            strokeDashoffset={314 - (314 * percent) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-bold">{score} / {questions.length}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{percent}% To'g'ri</span>
                    </div>
                </div>

                <div className={`w-full p-4 rounded-2xl border mb-8 flex justify-around text-sm font-semibold ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-150'}`}>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sarflangan vaqt</p>
                        <p className="text-lg mt-1 font-mono">{formatTime(timeElapsed)}</p>
                    </div>
                    <div className="w-[1px] bg-gray-200 dark:bg-white/10" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">To'g'ri topildi</p>
                        <p className="text-lg mt-1 text-emerald-500">+{score * 10} XP</p>
                    </div>
                </div>

                <div className="flex gap-4 w-full">
                    <button onClick={onBack} className={`flex-1 py-3 font-semibold rounded-xl transition-all border ${isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'}`}>
                        Tugatish
                    </button>
                    <button onClick={() => setResetKey(prev => prev + 1)} className="flex-1 py-3 bg-[#FB5102] hover:bg-[#e64a02] text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-[#FB5102]/20">
                        Qayta urinish
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) return null;

    const currentQ = questions[currentQuestionIdx];

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 py-8 px-4 flex flex-col justify-between relative ${isDark ? 'bg-black text-[#f5f5f7]' : 'bg-slate-50 text-[#1d1d1f]'}`}>
            {/* Ambient background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] ${isDark ? 'bg-[#FB5102]/5' : 'bg-[#FB5102]/2'}`} />
            </div>

            <div className="flex-1 flex flex-col justify-between max-w-2xl mx-auto w-full relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-2">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Chiqish</span>
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Clock */}
                        <div className={`flex items-center gap-2 text-xs font-bold p-2 px-3 rounded-lg border shadow-sm ${isDark ? 'text-gray-200 bg-white/10 border-white/10' : 'text-slate-700 bg-white border-slate-200'}`}>
                            <Clock className="w-4 h-4 text-[#FB5102]" />
                            <span className="font-mono text-sm">{formatTime(timeElapsed)}</span>
                        </div>

                        {/* Progress */}
                        <div className={`text-xs font-bold px-3 py-2 rounded-lg border shadow-sm ${isDark ? 'text-gray-200 bg-white/10 border-white/10' : 'text-slate-700 bg-white border-slate-200'}`}>
                            {currentQuestionIdx + 1} / {questions.length}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-8">
                    <div 
                        className="h-full bg-[#FB5102] transition-all duration-300"
                        style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question Section */}
                <div className="flex-1 flex flex-col justify-center mb-8">
                    <motion.div 
                        key={currentQuestionIdx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`p-6 md:p-8 rounded-3xl border shadow-sm text-center mb-6 min-h-[160px] flex flex-col justify-center items-center
                            ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-150'}`}
                    >
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#FB5102] mb-3">Quiz Savoli</span>
                        <h2 className="text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-wrap">
                            {currentQ.questionText}
                        </h2>
                    </motion.div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-3">
                        {currentQ.options.map((option, idx) => {
                            const isCorrect = option === currentQ.correctAnswer;
                            const isSelected = option === selectedOption;
                            
                            let optionClass = `w-full p-4 rounded-xl border font-medium text-left transition-all flex items-center justify-between shadow-sm outline-none cursor-pointer `;
                            let icon = null;

                            if (isAnswered) {
                                if (isCorrect) {
                                    optionClass += isDark 
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold scale-[1.01]' 
                                        : 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold scale-[1.01]';
                                    icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
                                } else if (isSelected) {
                                    optionClass += isDark 
                                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 font-bold' 
                                        : 'bg-rose-50 border-rose-300 text-rose-700 font-bold';
                                    icon = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
                                } else {
                                    optionClass += 'opacity-50 cursor-default';
                                }
                            } else {
                                optionClass += isDark 
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#FB5102]/30 text-white' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-[#FB5102]/30 text-slate-700';
                            }

                            return (
                                <motion.button
                                    key={idx}
                                    onClick={() => handleOptionClick(option)}
                                    disabled={isAnswered}
                                    whileHover={!isAnswered ? { scale: 1.005 } : {}}
                                    whileTap={!isAnswered ? { scale: 0.995 } : {}}
                                    className={optionClass}
                                >
                                    <span className="text-sm md:text-base">{option}</span>
                                    {icon}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="h-14 flex items-center justify-center">
                    {isAnswered && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleNext}
                            className="px-8 py-3 bg-[#FB5102] hover:bg-[#e64a02] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#FB5102]/20 active:scale-95 flex items-center gap-2"
                        >
                            <span>{currentQuestionIdx + 1 === questions.length ? "Natijalarni ko'rish" : "Keyingi savol"}</span>
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}
