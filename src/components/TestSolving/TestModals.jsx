// src/components/TestSolving/TestModals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { calculateBandScore, formatTime, checkAnswer, scoreMultiAnswer, isMultiAnswerType, isChoiceQuestionType } from '../../utils/ieltsScoring';
import { Icons } from '../Icons';
import { useAuth } from '../../context/AuthContext';
import PricingModal from '../dashboard/PricingModal';
import { useTranslation } from '../../context/LanguageContext';
import DetailedAnswersModal from '../TestReview/DetailedAnswersModal';

// ──────────────────────────────────────────────
// NOTE: useAudioPreloader hook REMOVED to fix bandwidth issue.
// Audio preloading is handled solely by TestHeader's AudioPreloader.
// This eliminates duplicate downloads that were causing 2x bandwidth.
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// RESUME TEST MODAL
// ──────────────────────────────────────────────
export const ResumeTestModal = ({ show, onContinue, onFresh }) => {
    const { t } = useTranslation();

    if (!show) return null;

    return (
        <div className="absolute inset-0 bg-white/90 z-[1000] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('testSolving.resumeTitle')}</h2>
                <p className="text-gray-500 mb-8 text-sm">{t('testSolving.resumeSubtitle')}</p>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onContinue}
                        className="bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                    >
                        <div className="text-3xl mb-3">▶️</div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600">{t('testSolving.continueTest')}</h3>
                        <p className="text-gray-400 text-xs mt-2">{t('testSolving.continueTestDesc')}</p>
                    </button>

                    <button
                        onClick={onFresh}
                        className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                    >
                        <div className="text-3xl mb-3">🔄</div>
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600">{t('testSolving.startFresh')}</h3>
                        <p className="text-gray-400 text-xs mt-2">{t('testSolving.startFreshDesc')}</p>
                    </button>
                </div>
            </div>
        </div>
    );
};


// ──────────────────────────────────────────────
// MODE SELECTION MODAL
// ──────────────────────────────────────────────
export const ModeSelectionModal = ({ show, setTestMode, setTimeLeft, setShowModeSelection, test }) => {
    const { t } = useTranslation();

    if (!show) return null;

    return (
        <div className="absolute inset-0 bg-white/90 z-[999] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('testSolving.selectModeTitle')}</h2>
                <p className="text-gray-500 mb-8 text-sm">{t('testSolving.selectModeSubtitle')}</p>
                <div className="grid grid-cols-2 gap-4">
                    {/* EXAM MODE — TestHeader's AudioPreloader handles buffering */}
                    <button
                        onClick={() => {
                            setTestMode('exam');
                            setShowModeSelection(false);
                        }}
                        className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                    >
                        <div className="text-3xl mb-3">🎓</div>
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600">{t('testSolving.examMode')}</h3>
                        <p className="text-gray-400 text-xs mt-2">{t('testSolving.examModeDesc')}</p>
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
                        <h3 className="font-bold text-gray-900 group-hover:text-green-600">{t('testSolving.practiceMode')}</h3>
                        <p className="text-gray-400 text-xs mt-2">{t('testSolving.practiceModeDesc')}</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// RESULT MODAL
// ──────────────────────────────────────────────
export const ResultModal = ({ show, test, testMode, score, bandScore, timeLeft, initialDuration, isReviewing, setIsReviewing, onExit, userAnswers, partNumber = null, resultId = null, navigate = null, fromNewsfeed = false, from = null }) => {
    const { t } = useTranslation();
    const { userData } = useAuth();
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showDetailedAnswers, setShowDetailedAnswers] = useState(false);

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
            const s = String(id).trim();
            const parts = s.split(/[\-–—_]/).map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return Math.abs(parts[1] - parts[0]) + 1;
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
                        const subKeys = ['questions', 'items', 'rows', 'groups', 'cells', 'content', 'parts'];
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
                        const isCorrect = checkAnswer(answer, userResp, isChoiceQuestionType(currentType));
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

            const filteredQuestions = (test.questions || []).filter(q => String(q.passageId) === String(passage.id));
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
        <div className="absolute inset-0 bg-white/90 z-[9999] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100/80 max-w-md w-full text-center">
                <h3 className="font-extrabold text-2xl text-gray-900 mb-1">{t('testSolving.testCompleted') || 'Test yakunlandi'}</h3>

                <p className="text-gray-400 mb-5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                    <Icons.Clock className="w-3.5 h-3.5 opacity-60" />
                    {t('testSolving.timeSpent') || 'Sarflangan vaqt'}: <span className="font-black text-gray-800">{formatTime(timeSpent)}</span>
                </p>

                {test.type !== 'speaking' && test.type !== 'writing' ? (
                    <div className="my-5">
                        {/* Core Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Answers Panel */}
                            <div className="bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-center items-center">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('testSolving.answers') || 'JAVOBLAR'}</span>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-3xl font-black text-emerald-650">{score}</span>
                                    <span className="text-gray-300 font-bold text-lg">/</span>
                                    <span className="text-3xl font-black text-rose-500">{totalMistakes}</span>
                                </div>
                                <div className="flex gap-3 mt-2 text-[9px] font-black tracking-widest uppercase">
                                    <span className="text-emerald-700">✓ {t('testSolving.correct') || "To'g'ri"}</span>
                                    <span className="text-rose-600">✗ {t('testSolving.mistake') || 'Xato'}</span>
                                </div>
                            </div>

                            {/* Band Score Panel */}
                            <div className="bg-blue-50/30 dark:bg-blue-950/20 border border-blue-150/40 dark:border-blue-900/30 rounded-2xl p-4 flex flex-col justify-center items-center">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{t('testSolving.bandScore') || 'BAND SCORE'}</span>
                                <span className="text-4xl font-black text-blue-650 mt-1.5">{bandScore}</span>
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2">{t('testSolving.ieltsStandard') || 'IELTS STANDARTI'}</span>
                            </div>
                        </div>

                        {/* Part Breakdown Grid */}
                        {partStats.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full text-left">
                                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center mb-4">
                                    {t('testSolving.mistakesAnalysis') || 'XATOLAR TAHLILI'}
                                </p>
                                <div className={`grid ${colsClass} gap-3`}>
                                    {partStats.map((part, index) => (
                                        <div key={part.passageId || index} className="bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-150/40 dark:border-zinc-800 rounded-2xl p-3 text-center transition-all hover:bg-zinc-50 duration-200">
                                            <span className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">
                                                Part {part.partIndex !== undefined ? part.partIndex + 1 : index + 1}
                                            </span>
                                            <div className="flex items-baseline justify-center gap-0.5 mt-1.5">
                                                <span className="text-sm font-black text-rose-500 dark:text-rose-455">{part.mistakes}</span>
                                                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider ml-0.5">{t('testSolving.mistakes') || 'xato'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500 my-6 text-sm">{t('testSolving.submittedGrading')}</p>
                )}

                <div className="flex flex-col gap-2.5 mt-5">
                    {test.type !== 'speaking' && test.type !== 'writing' && (
                        <button
                            onClick={() => {
                                if (canReview) {
                                    setShowDetailedAnswers(true);
                                } else {
                                    setShowPricingModal(true);
                                }
                            }}
                            className="bg-white border border-gray-250 hover:bg-gray-50 text-gray-900 font-extrabold py-3.5 rounded-2xl w-full text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {!canReview && <span className="text-xs">🔒</span>}
                            📊 {t('testSolving.viewDetailedAnswers') || 'Javoblar ro\'yxati (Batafsil)'}
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (canReview) {
                                if (resultId && navigate) {
                                    navigate(`/review/${resultId}`, { state: { fromNewsfeed, from } });
                                } else {
                                    setIsReviewing(true);
                                }
                            } else {
                                setShowPricingModal(true);
                            }
                        }} 
                        className="bg-gray-950 hover:bg-black text-white font-extrabold py-3.5 rounded-2xl w-full text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {!canReview && <span className="text-xs">🔒</span>}
                        {t('testSolving.reviewMistakes') || 'Xatolarni ko\'rib chiqish'}
                    </button>
                    <button onClick={onExit} className="text-gray-400 hover:text-gray-700 font-bold py-2 rounded-xl w-full text-[11px] uppercase tracking-wider transition-colors duration-200">{t('testSolving.exit') || 'Chiqish'}</button>
                </div>
            </div>

            {showPricingModal && (
                <PricingModal 
                    isOpen={showPricingModal}
                    onClose={() => setShowPricingModal(false)}
                    userName={userData?.fullName?.split(' ')[0]}
                />
            )}

            {showDetailedAnswers && (
                <DetailedAnswersModal
                    isOpen={showDetailedAnswers}
                    onClose={() => setShowDetailedAnswers(false)}
                    testData={test}
                    userAnswers={userAnswers}
                    score={score}
                    bandScore={bandScore}
                />
            )}
        </div>
    );
};