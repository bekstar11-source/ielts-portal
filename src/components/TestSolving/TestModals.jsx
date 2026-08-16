// src/components/TestSolving/TestModals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { formatTime, evaluateTest } from '../../utils/ieltsScoring';
import { Icons } from '../Icons';
import { useAuth } from '../../context/AuthContext';
import PricingModal from '../dashboard/PricingModal';
import { useTranslation } from '../../context/LanguageContext';
import DetailedAnswersModal from '../TestReview/DetailedAnswersModal';
import { Play, RefreshCcw, GraduationCap, Headphones, Lock, BarChart3 } from 'lucide-react';
import { getTier, canAccessPremiumContent } from '../../utils/subscription';

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
                        className="bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md flex flex-col items-center"
                    >
                        <div className="mb-4 text-blue-500/80 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-300">
                            <Play size={42} fill="currentColor" strokeWidth={1.5} />
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600">{t('testSolving.continueTest')}</h3>
                        <p className="text-gray-400 text-xs mt-2">{t('testSolving.continueTestDesc')}</p>
                    </button>

                    <button
                        onClick={onFresh}
                        className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md flex flex-col items-center"
                    >
                        <div className="mb-4 text-red-500/80 group-hover:text-red-600 group-hover:-rotate-180 transition-all duration-500">
                            <RefreshCcw size={42} strokeWidth={1.5} />
                        </div>
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
                        className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md flex flex-col items-center"
                    >
                        <div className="mb-4 text-red-500/80 group-hover:text-red-600 group-hover:scale-110 transition-all duration-300">
                            <GraduationCap size={42} strokeWidth={1.5} />
                        </div>
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
                        className="bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md flex flex-col items-center"
                    >
                        <div className="mb-4 text-green-500/80 group-hover:text-green-600 group-hover:scale-110 transition-all duration-300">
                            <Headphones size={42} strokeWidth={1.5} />
                        </div>
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
export const ResultModal = ({ show, test, testMode, score, bandScore, totalQuestions: totalQuestionsProp = 0, partBreakdown = [], timeLeft, initialDuration, isReviewing, setIsReviewing, onExit, userAnswers, partNumber = null, resultId = null, navigate = null, fromNewsfeed = false, from = null }) => {
    const { t } = useTranslation();
    const { userData } = useAuth();
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showDetailedAnswers, setShowDetailedAnswers] = useState(false);

    // Tarif — yagona manbadan, obuna muddati bilan (utils/subscription)
    const tier = getTier(userData);
    const isPro = tier === 'pro';
    const isStandard = tier === 'standard';

    const canReview = canAccessPremiumContent(userData);

    const timeSpent = testMode === 'practice' ? timeLeft : Math.max(0, (initialDuration || (test.duration || 60) * 60) - timeLeft);

    // Xatoliklarni har bir bo'lim (Part/Passage) bo'yicha hisoblash — ZAXIRA yo'l.
    // Asosiy manba serverdan kelgan `partBreakdown`. Bu hisob faqat javob kalitlari
    // klientda mavjud bo'lganda (admin/o'qituvchi) yoki eski natijalarda ishlaydi.
    //
    // Ilgari bu yerda `evaluateTest` ning mustaqil nusxasi bor edi: javob kalitini
    // truthy tekshirardi ("0" javobli savollar hisobdan tushardi), ko'p javobli
    // guruh og'irligini boshqacha sanardi va natijada natija ekranidagi xatolar soni
    // review'dagidan farq qilardi.
    const partStats = React.useMemo(() => {
        if (!test || !Array.isArray(test.passages) || test.passages.length === 0 || !userAnswers) return [];

        const stats = test.passages.map((passage, pIdx) => {
            const { correctCount, totalQ } = evaluateTest(test, userAnswers, pIdx + 1);
            return {
                passageId: passage.id,
                name: passage.title || `Part ${pIdx + 1}`,
                correct: correctCount,
                total: totalQ,
                mistakes: Math.max(0, totalQ - correctCount),
                partIndex: pIdx
            };
        });

        if (partNumber) {
            return stats.filter((_, idx) => idx === partNumber - 1);
        }
        return stats;
    }, [test, userAnswers, partNumber]);

    if (!show || isReviewing) return null;

    // Server tomonidan hisoblangan qiymatlar — javob kalitlari clientga
    // yuborilmagani uchun yagona ishonchli manba shu (partStats faqat eski
    // natijalar uchun zaxira variant, chunki javoblarsiz hech narsani to'g'ri sanay olmaydi).
    const displayParts = partBreakdown.length > 0
        ? partBreakdown.map((part, index) => ({ ...part, partIndex: index }))
        : partStats;
    const totalQuestions = totalQuestionsProp > 0
        ? totalQuestionsProp
        : (partStats.reduce((acc, curr) => acc + curr.total, 0) || (partNumber ? 10 : 40));
    const totalMistakes = Math.max(0, totalQuestions - score);
    const colsClass = displayParts.length === 1 ? 'grid-cols-1 max-w-[120px] mx-auto' : (displayParts.length === 3 ? 'grid-cols-3' : 'grid-cols-4');

    return (
        <div className="absolute inset-0 bg-warm-canvas/90 dark:bg-warm-dark/90 z-[9999] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white dark:bg-warm-dark-elevated p-8 rounded-3xl shadow-2xl border border-warm-hairline dark:border-white/10 max-w-md w-full text-center">
                <h3 className="font-bold text-2xl text-warm-ink dark:text-warm-on-dark mb-1.5 tracking-tight">{t('testSolving.testCompleted') || 'Test yakunlandi'}</h3>

                <p className="text-warm-muted dark:text-warm-on-dark-soft mb-6 flex items-center justify-center gap-1.5 text-sm font-medium">
                    <Icons.Clock className="w-4 h-4 opacity-70" />
                    {t('testSolving.timeSpent') || 'Sarflangan vaqt'}: <span className="font-semibold text-warm-body dark:text-warm-on-dark">{formatTime(timeSpent)}</span>
                </p>

                {test.type !== 'speaking' && test.type !== 'writing' ? (
                    <div className="my-5">
                        {/* Core Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Answers Panel */}
                            <div className="bg-warm-surface dark:bg-warm-dark-soft border border-warm-hairline dark:border-white/10 rounded-2xl p-4 flex flex-col justify-center items-center">
                                <span className="text-[11px] font-semibold text-warm-muted dark:text-warm-on-dark-soft uppercase tracking-wide">{t('testSolving.answers') || 'Javoblar'}</span>
                                <div className="flex items-baseline gap-1.5 mt-2">
                                    <span className="text-3xl font-bold text-warm-success">{score}</span>
                                    <span className="text-warm-muted-soft font-medium text-lg">/</span>
                                    <span className="text-3xl font-bold text-warm-error">{totalMistakes}</span>
                                </div>
                                <div className="flex gap-3 mt-2.5 text-[11px] font-semibold">
                                    <span className="text-warm-success">✓ {t('testSolving.correct') || "To'g'ri"}</span>
                                    <span className="text-warm-error">✗ {t('testSolving.mistake') || 'Xato'}</span>
                                </div>
                            </div>

                            {/* Band Score Panel */}
                            <div className="bg-warm-primary/[0.06] dark:bg-warm-primary/10 border border-warm-primary/15 rounded-2xl p-4 flex flex-col justify-center items-center">
                                <span className="text-[11px] font-semibold text-warm-primary uppercase tracking-wide">{t('testSolving.bandScore') || 'Band score'}</span>
                                {/* Band har doim bitta ko'rinishda — "7" va "7.0" bir xil
                                    natijaning ikki xil yozuvi bo'lib chalkashtirardi. */}
                                <span className="text-4xl font-bold text-warm-primary mt-1.5">
                                    {Number.isFinite(Number(bandScore)) ? Number(bandScore).toFixed(1) : '0.0'}
                                </span>
                                <span className="text-[11px] font-medium text-warm-primary/70 mt-2">{t('testSolving.ieltsStandard') || 'IELTS standarti'}</span>
                            </div>
                        </div>

                        {/* Part Breakdown Grid */}
                        {displayParts.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-warm-hairline dark:border-white/10 w-full text-left">
                                <p className="text-[11px] font-semibold text-warm-muted dark:text-warm-on-dark-soft uppercase tracking-wide text-center mb-3.5">
                                    {t('testSolving.mistakesAnalysis') || 'Xatolar tahlili'}
                                </p>
                                <div className={`grid ${colsClass} gap-2.5`}>
                                    {displayParts.map((part, index) => (
                                        <div key={part.passageId || index} className="bg-warm-surface dark:bg-warm-dark-soft border border-warm-hairline dark:border-white/10 rounded-xl px-3 py-2.5 text-center transition-colors hover:bg-warm-card duration-200">
                                            <span className="block text-[11px] font-semibold text-warm-muted dark:text-warm-on-dark-soft leading-none mb-1.5">
                                                Part {part.partIndex !== undefined ? part.partIndex + 1 : index + 1}
                                            </span>
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-sm font-bold text-warm-error">{part.mistakes}</span>
                                                <span className="text-[11px] font-medium text-warm-muted dark:text-warm-on-dark-soft">{t('testSolving.mistakes') || 'xato'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-warm-muted dark:text-warm-on-dark-soft my-6 text-sm">{t('testSolving.submittedGrading')}</p>
                )}

                <div className="flex flex-col gap-2.5 mt-6">
                    {test.type !== 'speaking' && test.type !== 'writing' && (
                        <button
                            onClick={() => {
                                if (canReview) {
                                    setShowDetailedAnswers(true);
                                } else {
                                    setShowPricingModal(true);
                                }
                            }}
                            className="bg-white dark:bg-warm-dark-soft border border-warm-hairline dark:border-white/10 hover:bg-warm-surface dark:hover:bg-warm-dark-elevated text-warm-ink dark:text-warm-on-dark font-semibold py-3 rounded-2xl w-full text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <BarChart3 className="w-4 h-4 opacity-80" />
                            {t('testSolving.viewDetailedAnswers') || 'Javoblar ro\'yxati (Batafsil)'}
                            {!canReview && <Lock className="w-3.5 h-3.5 opacity-70" />}
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
                        className="bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary font-semibold py-3 rounded-2xl w-full text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {t('testSolving.reviewMistakes') || 'Xatolarni ko\'rib chiqish'}
                        {!canReview && <Lock className="w-3.5 h-3.5 opacity-80" />}
                    </button>
                    <button onClick={onExit} className="text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark font-medium py-2 rounded-xl w-full text-sm transition-colors duration-200">{t('testSolving.exit') || 'Chiqish'}</button>
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
                    totalQuestions={totalQuestions}
                    partNumber={partNumber}
                    moduleType={test?.type}
                />
            )}
        </div>
    );
};