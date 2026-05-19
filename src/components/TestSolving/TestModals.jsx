// src/components/TestSolving/TestModals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { calculateBandScore, formatTime, checkAnswer, scoreMultiAnswer, isMultiAnswerType } from '../../utils/ieltsScoring';
import { Icons } from '../Icons';
import { useAuth } from '../../context/AuthContext';
import PricingModal from '../dashboard/PricingModal';

// ──────────────────────────────────────────────
// AUDIO PRELOADER HOOK
// Berilgan URL-lar ro'yxatini fetch() + blob URL orqali keshga oladi
// ──────────────────────────────────────────────
function useAudioPreloader(audioUrls) {
    const [progress, setProgress] = useState(0);   // 0..100
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);
    const blobUrls = useRef({});

    useEffect(() => {
        if (!audioUrls || audioUrls.length === 0) {
            setProgress(100);
            setDone(true);
            return;
        }

        let cancelled = false;
        let loaded = 0;

        const load = async (url) => {
            try {
                const res = await fetch(url, { cache: 'force-cache' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                blobUrls.current[url] = blobUrl;
            } catch (e) {
                console.warn('Audio preload failed for:', url, e.message);
                // Xato bo'lsa ham davom etamiz — original URL ishlatiladi
                blobUrls.current[url] = url;
            }

            if (!cancelled) {
                loaded++;
                setProgress(Math.round((loaded / audioUrls.length) * 100));
                if (loaded === audioUrls.length) setDone(true);
            }
        };

        Promise.all(audioUrls.map(url => load(url))).catch(e => {
            if (!cancelled) setError(e.message);
        });

        return () => { cancelled = true; };
    }, [audioUrls.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    return { progress, done, error, blobUrls: blobUrls.current };
}

// ──────────────────────────────────────────────
// MODE SELECTION MODAL
// ──────────────────────────────────────────────
export const ModeSelectionModal = ({ show, setTestMode, setTimeLeft, setShowModeSelection, test }) => {
    const [phase, setPhase] = useState('select'); // 'select' | 'preloading'

    // Barcha audio URL-larini testdan to'playmiz
    const allAudioUrls = React.useMemo(() => {
        if (!test?.passages) return [];
        return test.passages
            .map(p => p.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file)
            .filter(Boolean);
    }, [test]);

    const { progress, done } = useAudioPreloader(phase === 'preloading' ? allAudioUrls : []);

    // Preloading tugaganida testni boshla
    useEffect(() => {
        if (phase === 'preloading' && done) {
            // Kichik pauza (smooth transition uchun)
            setTimeout(() => {
                setTestMode('exam');
                setShowModeSelection(false);
            }, 600);
        }
    }, [done, phase]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!show) return null;

    // ── SELECT phase ──
    if (phase === 'select') {
        return (
            <div className="absolute inset-0 bg-white/90 z-[999] flex items-center justify-center backdrop-blur-md">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Test Mode</h2>
                    <p className="text-gray-500 mb-8 text-sm">Choose how you want to take this test</p>
                    <div className="grid grid-cols-2 gap-4">
                        {/* EXAM MODE — avval audio preload qiladi */}
                        <button
                            onClick={() => setPhase('preloading')}
                            className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="text-3xl mb-3">🎓</div>
                            <h3 className="font-bold text-gray-900 group-hover:text-red-600">Exam Mode</h3>
                            <p className="text-gray-400 text-xs mt-2">No pause. Real exam conditions.</p>
                        </button>

                        {/* PRACTICE MODE — to'g'ridan-to'g'ri boshlanadi */}
                        <button
                            onClick={() => {
                                setTestMode('practice');
                                setTimeLeft(0);
                                setShowModeSelection(false);
                            }}
                            className="bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="text-3xl mb-3">🎧</div>
                            <h3 className="font-bold text-gray-900 group-hover:text-green-600">Practice Mode</h3>
                            <p className="text-gray-400 text-xs mt-2">Pause allowed. Self-paced.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── PRELOADING phase ──
    return (
        <div className="absolute inset-0 bg-white/95 z-[999] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full text-center">
                {/* Animatsiyali ikon */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-3xl">{done ? '✅' : '📡'}</span>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {done ? 'Ready to Start!' : 'Preparing Audio...'}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    {done
                        ? 'All audio files are cached. Starting exam...'
                        : 'Downloading audio files for uninterrupted playback.'}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3 overflow-hidden">
                    <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-400 font-mono font-bold">{progress}%</p>

                {/* Part list */}
                {allAudioUrls.length > 0 && (
                    <div className="mt-4 flex gap-2 justify-center">
                        {allAudioUrls.map((url, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${progress >= Math.round(((i + 1) / allAudioUrls.length) * 100)
                                        ? 'border-blue-500 bg-blue-500 text-white'
                                        : 'border-gray-200 bg-white text-gray-400'
                                    }`}
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// RESULT MODAL
// ──────────────────────────────────────────────
export const ResultModal = ({ show, test, testMode, score, bandScore, timeLeft, initialDuration, isReviewing, setIsReviewing, onExit, userAnswers, partNumber = null, resultId = null, navigate = null }) => {
    const { userData } = useAuth();
    const [showPricingModal, setShowPricingModal] = useState(false);

    // Check if user is standard or pro (or premium/admin/teacher)
    const isPro = userData?.accountType === 'pro' || userData?.isPro;
    const isStandard = userData?.accountType === 'standard' || userData?.isStandard;
    const isPremium = userData?.accountType === 'premium' || userData?.isPremium || userData?.role === 'admin' || userData?.role === 'teacher';
    
    const canReview = isPro || isStandard || isPremium;

    const timeSpent = testMode === 'practice' ? timeLeft : Math.max(0, (initialDuration || (test.duration || 60) * 60) - timeLeft);

    // Xatoliklarni har bir bo'lim (Part/Passage) bo'yicha hisoblash
    const partStats = React.useMemo(() => {
        if (!test || !test.passages || !userAnswers) return [];

        const getWeight = (id) => {
            if (!id) return 1;
            const s = String(id);
            if (s.includes('-')) {
                const [start, end] = s.split('-').map(Number);
                return (end - start) + 1;
            }
            if (s.includes(',')) {
                return s.split(',').length;
            }
            return 1;
        };

        const stats = test.passages.map((passage, pIdx) => {
            let correctCount = 0;
            let totalQ = 0;
            const scoredIds = new Set();

            const walk = (obj, parentType) => {
                if (!obj) return;
                const currentType = obj.type || parentType;

                if (isMultiAnswerType(obj.type) && !obj.id) {
                    const groupItems = [];
                    const collectItems = (o) => {
                        const ans = o.answer || o.correct_answer || o.correctAnswer || o.correct_answer_value;
                        if (o.id && ans) {
                            groupItems.push(o);
                        }
                        const subKeys = ['questions', 'items', 'rows', 'cells', 'content'];
                        for (const sk of subKeys) {
                            if (o[sk] && Array.isArray(o[sk])) {
                                o[sk].forEach(collectItems);
                            }
                        }
                    };
                    collectItems(obj);

                    if (groupItems.length > 0) {
                        const allCorrect = groupItems.map(i => i.answer || i.correct_answer || i.correctAnswer || i.correct_answer_value).join(', ');
                        const allUser = groupItems.map(i => userAnswers[i.id] || "").join(', ');
                        
                        let weight = groupItems.length;
                        const t = String(obj.type).toLowerCase();
                        if (t.includes('five')) weight = 5;
                        else if (t.includes('four')) weight = 4;
                        else if (t.includes('three')) weight = 3;
                        else if (t.includes('two')) weight = 2;

                        const result = scoreMultiAnswer(allCorrect, allUser, weight);
                        correctCount += result.matches;
                        totalQ += result.weight;

                        groupItems.forEach(i => scoredIds.add(String(i.id)));
                        return;
                    }
                }

                const answer = obj.answer || obj.correct_answer || obj.correctAnswer || obj.correct_answer_value;
                if (obj.id && answer) {
                    const id = obj.id;
                    const idStr = String(id);

                    if (scoredIds.has(idStr)) return;

                    if (isMultiAnswerType(currentType)) {
                        const weight = getWeight(id);
                        const userResp = userAnswers[idStr] || userAnswers[id] || "";
                        const result = scoreMultiAnswer(answer, userResp, weight);
                        correctCount += result.matches;
                        totalQ += result.weight;
                        scoredIds.add(idStr);
                    } else {
                        const userResp = userAnswers[idStr] || userAnswers[id] || "";
                        const isCorrect = checkAnswer(answer, userResp);
                        if (isCorrect) correctCount++;
                        totalQ++;
                        scoredIds.add(idStr);
                    }
                }

                const CONTAINER_KEYS = ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'];
                for (const key of CONTAINER_KEYS) {
                    const val = obj[key];
                    if (val && Array.isArray(val)) {
                        val.forEach(child => walk(child, currentType));
                    } else if (val && typeof val === 'object') {
                        walk(val, currentType);
                    }
                }
            };

            const filteredQuestions = (test.questions || []).filter(q => q.passageId === passage.id);
            filteredQuestions.forEach(q => walk(q, q.type));
            
            // Shuningdek passage ning o'zini ham walk qilamiz, agar savollar passage ichida (masalan, groups) bo'lsa
            walk(passage, null);

            const mistakes = Math.max(0, totalQ - correctCount);

            return {
                passageId: passage.id,
                name: passage.title || `Part ${pIdx + 1}`,
                correct: correctCount,
                total: totalQ,
                mistakes: mistakes,
                partIndex: pIdx
            };
        });

        if (partNumber) {
            return stats.filter((_, idx) => idx === partNumber - 1);
        }
        return stats;
    }, [test, userAnswers, partNumber]);

    if (!show || isReviewing) return null;

    const totalQuestions = partStats.reduce((acc, curr) => acc + curr.total, 0) || (partNumber ? 10 : 40);
    const totalMistakes = Math.max(0, totalQuestions - score);
    const colsClass = partStats.length === 1 ? 'grid-cols-1 max-w-[120px] mx-auto' : (partStats.length === 3 ? 'grid-cols-3' : 'grid-cols-4');

    return (
        <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in">
            <div className="bg-white p-7 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center">
                <h3 className="font-bold text-2xl text-gray-900 mb-1">Test Completed 🎉</h3>

                <p className="text-gray-500 mb-3.5 flex items-center justify-center gap-1.5 text-xs font-semibold">
                    <Icons.Clock className="w-3.5 h-3.5 opacity-55" />
                    Time Spent: <span className="font-black text-gray-800">{formatTime(timeSpent)}</span>
                </p>

                {test.type !== 'speaking' && test.type !== 'writing' ? (
                    <div className="my-4">
                        {/* Core Stats Grid */}
                        <div className="grid grid-cols-2 gap-3.5">
                            {/* Answers Panel */}
                            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3.5 flex flex-col justify-center items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Answers</span>
                                <div className="flex items-baseline gap-1 mt-1.5">
                                    <span className="text-2xl font-black text-emerald-600">{score}</span>
                                    <span className="text-gray-300 font-bold text-md">/</span>
                                    <span className="text-2xl font-black text-rose-500">{totalMistakes}</span>
                                </div>
                                <div className="flex gap-2.5 mt-1.5 text-[9px] font-black tracking-wide">
                                    <span className="text-emerald-700">✓ To'g'ri</span>
                                    <span className="text-rose-600">✗ Xato</span>
                                </div>
                            </div>

                            {/* Band Score Panel */}
                            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 flex flex-col justify-center items-center">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Band Score</span>
                                <span className="text-3xl font-black text-blue-600 mt-1">{bandScore}</span>
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">IELTS Standard</span>
                            </div>
                        </div>

                        {/* Part Breakdown Grid */}
                        {partStats.length > 0 && (
                            <div className="mt-4 pt-3.5 border-t border-gray-100 w-full text-left">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-3">
                                    Xatolar Tahlili
                                </p>
                                <div className={`grid ${colsClass} gap-2`}>
                                    {partStats.map((part, index) => (
                                        <div key={part.passageId || index} className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-2 text-center">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase leading-none mb-1">
                                                Part {part.partIndex !== undefined ? part.partIndex + 1 : index + 1}
                                            </span>
                                            <div className="flex items-center justify-center gap-0.5 mt-1">
                                                <span className="text-xs font-black text-rose-500">{part.mistakes}</span>
                                                <span className="text-[9px] font-bold text-gray-400">xato</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500 my-6 text-sm">Your answer has been submitted for grading.</p>
                )}

                <div className="flex flex-col gap-2 mt-4">
                    <button 
                        onClick={() => {
                            if (canReview) {
                                if (resultId && navigate) {
                                    navigate(`/review/${resultId}`);
                                } else {
                                    setIsReviewing(true);
                                }
                            } else {
                                setShowPricingModal(true);
                            }
                        }} 
                        className="bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl w-full text-sm transition shadow-md shadow-gray-100 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                        {!canReview && <span className="text-xs">🔒</span>}
                        Review Mistakes
                    </button>
                    <button onClick={onExit} className="text-gray-500 hover:text-gray-900 font-bold py-2 rounded-xl w-full text-xs transition active:scale-[0.98]">Exit</button>
                </div>
            </div>

            {showPricingModal && (
                <PricingModal 
                    isOpen={showPricingModal}
                    onClose={() => setShowPricingModal(false)}
                    userName={userData?.fullName?.split(' ')[0]}
                />
            )}
        </div>
    );
};