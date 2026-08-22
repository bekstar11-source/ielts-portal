import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, CheckCircle2, XCircle, ArrowRight, AlertCircle, Flag, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildReviewQuestions, getReviewScoreSummary } from '../../utils/reviewAnswers';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function DetailedAnswersModal({
    isOpen,
    onClose,
    testData,
    resultId = null,
    userAnswers = {},
    score,
    bandScore,
    totalQuestions = null,
    partNumber = null,
    moduleType = null,
    onJumpToQuestion
}) {
    const { t } = useTranslation();
    const { user, userData } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'correct' | 'mistake' | 'skipped'
    const [reportingQuestion, setReportingQuestion] = useState(null); // question object being reported
    const [reportText, setReportText] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportedIds, setReportedIds] = useState(new Set());

    // Escape bilan yopish + fon scroll'ini bloklash: modal ochiqligida orqadagi
    // sahifa siljib ketardi va klaviaturadan yopib bo'lmasdi.
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, onClose]);

    const handleSubmitReport = async (q) => {
        if (!reportText.trim() || !user) return;
        setReportSubmitting(true);
        try {
            await addDoc(collection(db, 'testComments'), {
                testId: testData?.id || null,
                resultId,
                questionId: q.id,
                qNumber: q.qNumber,
                userId: user.uid,
                userName: userData?.fullName || user.displayName || 'Student',
                userRole: userData?.role || 'student',
                text: reportText.trim(),
                isReport: true,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setReportedIds(prev => new Set(prev).add(q.id));
            setReportingQuestion(null);
            setReportText('');
        } catch (error) {
            console.error('Error submitting report:', error);
            alert(t('testSolving.reportError') || "Xato yuz berdi. Qayta urinib ko'ring.");
        } finally {
            setReportSubmitting(false);
        }
    };

    // Savollar ro'yxati va ball xulosasi — yagona manbadan (`utils/reviewAnswers`),
    // ball hisoblagichi (`evaluateTest`) bilan bir xil qoidalar asosida.
    // Part practice'da faqat o'sha part savollari olinadi: ilgari butun test
    // bo'yicha hisoblanib, natija ekranidagidan butunlay boshqa band chiqardi.
    const questionsList = useMemo(
        () => buildReviewQuestions(testData, userAnswers, partNumber),
        [testData, userAnswers, partNumber]
    );

    const { correct: displayScore, total: displayTotal, mistakes: displayMistakes, band: displayBandScore } = useMemo(
        () => getReviewScoreSummary({
            testData,
            userAnswers,
            partNumber,
            moduleType,
            score,
            bandScore,
            totalQuestions,
            fallbackTotal: questionsList.length
        }),
        [testData, userAnswers, partNumber, moduleType, score, bandScore, totalQuestions, questionsList.length]
    );

    // Filtr chiplaridagi sonlar va "javob berilmagan" statistikasi ro'yxatning
    // o'zidan olinadi — yuqoridagi xulosa band uchun, bu esa ro'yxat uchun.
    const counts = useMemo(() => {
        const correct = questionsList.filter(q => q.isCorrect).length;
        const skipped = questionsList.filter(q => !String(q.userAnswer || '').trim()).length;
        return {
            all: questionsList.length,
            correct,
            mistake: questionsList.length - correct,
            skipped
        };
    }, [questionsList]);

    const accuracy = displayTotal > 0 ? Math.round((displayScore / displayTotal) * 100) : 0;

    const filteredQuestions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return questionsList.filter(q => {
            const matchesSearch = !term
                || String(q.qNumber).includes(term)
                || (q.questionText || '').toLowerCase().includes(term)
                || (q.type || '').toLowerCase().includes(term)
                || String(q.userAnswer || '').toLowerCase().includes(term)
                || String(q.correctAnswer || '').toLowerCase().includes(term);

            if (!matchesSearch) return false;
            if (filterStatus === 'correct') return q.isCorrect;
            if (filterStatus === 'mistake') return !q.isCorrect;
            if (filterStatus === 'skipped') return !String(q.userAnswer || '').trim();
            return true;
        });
    }, [questionsList, searchTerm, filterStatus]);

    if (!isOpen) return null;

    const statCards = [
        {
            key: 'answered',
            label: t('testSolving.answers') || 'Javoblar',
            value: `${counts.all - counts.skipped} / ${counts.all}`,
            tone: 'text-zinc-800 dark:text-zinc-200',
            box: 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-850',
            labelTone: 'text-zinc-400 dark:text-zinc-500'
        },
        {
            key: 'correct',
            label: t('testSolving.correct') || 'To\'g\'ri',
            value: displayScore,
            tone: 'text-emerald-600 dark:text-emerald-400',
            box: 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-emerald-900/30',
            labelTone: 'text-emerald-600 dark:text-emerald-500'
        },
        {
            key: 'mistake',
            label: t('testSolving.mistake') || 'Xato',
            value: displayMistakes,
            tone: 'text-rose-500 dark:text-rose-400',
            box: 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-100/60 dark:border-rose-900/30',
            labelTone: 'text-rose-500 dark:text-rose-400'
        },
        {
            key: 'band',
            label: t('testSolving.bandScore') || 'Band Score',
            value: displayBandScore ? Number(displayBandScore).toFixed(1) : '0.0',
            tone: 'text-blue-600 dark:text-blue-400',
            box: 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30',
            labelTone: 'text-blue-500 dark:text-blue-400'
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    role="dialog"
                    aria-modal="true"
                    className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-150 dark:border-zinc-800 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden font-sans"
                >
                    {/* Header */}
                    <div className="px-5 py-3 md:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-[20px]">analytics</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white truncate">
                                    {t('testSolving.detailedAnswersTitle') || 'Javoblar Tahlili'}
                                </h3>
                                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 font-medium truncate">
                                    {testData?.title || 'Practice Test'}
                                    {partNumber ? ` · Part ${partNumber}` : ''}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            aria-label={t('common.close') || 'Yopish'}
                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-550 dark:text-zinc-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="px-5 pt-2.5 md:px-6 bg-zinc-50/20 dark:bg-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {statCards.map(card => (
                            <div key={card.key} className={`${card.box} p-2.5 rounded-lg border flex flex-col justify-center`}>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${card.labelTone}`}>
                                    {card.label}
                                </span>
                                <span className={`text-base font-black mt-0.5 ${card.tone}`}>
                                    {card.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Accuracy bar — to'g'ri/xato nisbati bir qarashda ko'rinsin */}
                    <div className="px-5 md:px-6 pt-2.5 pb-3 bg-zinc-50/20 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-rose-100 dark:bg-rose-950/40 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${accuracy}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                                {accuracy}%
                            </span>
                        </div>
                    </div>

                    {/* Toolbar (Search & Filter) */}
                    <div className="px-5 py-2.5 md:px-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-3 bg-zinc-50/10">
                        {/* Search Input */}
                        <div className="relative w-full sm:flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 pl-9 pr-8 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                                placeholder={t('myResults.searchPlaceholder') || 'Qidirish...'}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    aria-label={t('common.clear') || 'Tozalash'}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Status Filters */}
                        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                            {[
                                { id: 'all', label: t('myResults.categories.all') || 'Barchasi', count: counts.all },
                                { id: 'correct', label: t('testSolving.correct') || 'To\'g\'ri', count: counts.correct },
                                { id: 'mistake', label: t('testSolving.mistake') || 'Xatolar', count: counts.mistake },
                                { id: 'skipped', label: t('testSolving.noAnswer') || 'Javobsiz', count: counts.skipped }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterStatus(f.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                                        filterStatus === f.id 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm' 
                                        : 'bg-white dark:bg-zinc-950 text-zinc-550 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                                    }`}
                                >
                                    {f.label}
                                    <span className={`text-[10px] font-black tabular-nums ${
                                        filterStatus === f.id ? 'opacity-70' : 'text-zinc-400 dark:text-zinc-600'
                                    }`}>
                                        {f.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Questions Table/List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {filteredQuestions.length > 0 ? (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {/* Table Header - Hidden on mobile, scrollda yopishib turadi */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-6 md:px-8 py-3 bg-zinc-50 dark:bg-zinc-950/60 backdrop-blur text-[10px] font-black uppercase text-zinc-400 tracking-wider sticky top-0 z-10 border-b border-zinc-100 dark:border-zinc-800">
                                    <div className="col-span-1">{t('testSolving.questionNum') || 'Savol'}</div>
                                    <div className="col-span-2">{t('testSolving.questionType') || 'Savol Turi'}</div>
                                    <div className="col-span-3">{t('testSolving.yourAnswer') || 'Sizning javobingiz'}</div>
                                    <div className="col-span-3">{t('testSolving.correctAnswer') || 'To\'g\'ri javob'}</div>
                                    <div className="col-span-3 text-right">{t('testSolving.status') || 'Holati'}</div>
                                </div>

                                {/* Table Body */}
                                {filteredQuestions.map((q) => {
                                    const isReporting = reportingQuestion?.id === q.id;
                                    const alreadyReported = reportedIds.has(q.id);
                                    const isSkipped = !String(q.userAnswer || '').trim();
                                    return (
                                        <div
                                            key={q.id}
                                            className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 md:px-8 py-3.5 items-center border-l-2 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 ${
                                                q.isCorrect
                                                    ? 'border-l-emerald-400/70'
                                                    : q.partialText
                                                        ? 'border-l-amber-400/70'
                                                        : 'border-l-rose-400/70'
                                            }`}
                                        >
                                            {/* Question Number */}
                                            <div className="col-span-1 flex items-center gap-3">
                                                <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm tabular-nums ${
                                                    q.isCorrect 
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                                }`}>
                                                    {q.qNumber}
                                                </div>
                                                <span className="md:hidden text-xs font-bold text-zinc-400 truncate">
                                                    {q.passageTitle || `Part ${parseInt(q.passageId) || q.passageId || '1'}`}
                                                </span>
                                            </div>

                                            {/* Question Type */}
                                            <div className="col-span-2 flex flex-col min-w-0">
                                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize truncate" title={q.type.replace(/[_-]/g, ' ')}>
                                                    {q.type.replace(/_/g, ' ').replace(/-/g, ' ')}
                                                </span>
                                                {q.passageTitle && (
                                                    <span className="hidden md:block text-[10px] text-zinc-400 dark:text-zinc-500 font-medium truncate" title={q.passageTitle}>
                                                        {q.passageTitle}
                                                    </span>
                                                )}
                                            </div>

                                            {/* User Answer */}
                                            <div className="col-span-3 flex flex-col min-w-0">
                                                <span className="md:hidden text-[10px] text-zinc-400 uppercase font-black tracking-wider mb-0.5">
                                                    {t('testSolving.yourAnswer') || 'Sizning javobingiz'}
                                                </span>
                                                <span className={`text-xs font-bold break-words ${
                                                    q.isCorrect 
                                                        ? 'text-emerald-700 dark:text-emerald-400' 
                                                        : isSkipped
                                                            ? 'text-zinc-400 italic font-medium'
                                                            : 'text-rose-700 dark:text-rose-400 line-through decoration-rose-300 decoration-1'
                                                }`}>
                                                    {q.userAnswer || `(${t('testSolving.noAnswer') || 'Javob berilmagan'})`}
                                                </span>
                                            </div>

                                            {/* Correct Answer */}
                                            <div className="col-span-3 flex flex-col min-w-0">
                                                <span className="md:hidden text-[10px] text-zinc-400 uppercase font-black tracking-wider mb-0.5">
                                                    {t('testSolving.correctAnswer') || 'To\'g\'ri javob'}
                                                </span>
                                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 break-words bg-emerald-50/60 dark:bg-emerald-950/20 px-2 py-1.5 rounded-lg border border-emerald-100/70 dark:border-emerald-900/30 w-fit max-w-full">
                                                    {q.correctAnswer}
                                                </span>
                                            </div>

                                            {/* Status and Actions */}
                                            <div className="col-span-3 flex items-center justify-between md:justify-end gap-2 mt-1 md:mt-0">
                                                {/* Status Badge */}
                                                {q.isCorrect ? (
                                                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 uppercase tracking-wide whitespace-nowrap">
                                                        <CheckCircle2 size={14} className="stroke-[2.5] shrink-0" />
                                                        {t('testSolving.correct') || 'To\'g\'ri'}
                                                    </span>
                                                ) : q.partialText ? (
                                                    <span className="flex items-center gap-1 text-[11px] font-black text-amber-600 uppercase tracking-wide whitespace-nowrap tabular-nums">
                                                        <MinusCircle size={14} className="stroke-[2.5] shrink-0" />
                                                        {q.partialText}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[11px] font-black text-rose-600 uppercase tracking-wide whitespace-nowrap">
                                                        <XCircle size={14} className="stroke-[2.5] shrink-0" />
                                                        {isSkipped
                                                            ? (t('testSolving.noAnswer') || 'Javobsiz')
                                                            : (t('testSolving.mistake') || 'Xato')}
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Report a mistake in this question */}
                                                    {alreadyReported ? (
                                                        <span
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                                            title={t('testSolving.reportSubmitted') || 'Xabar yuborildi'}
                                                        >
                                                            <CheckCircle2 size={13} className="stroke-[2.5]" />
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setReportingQuestion(isReporting ? null : q);
                                                                setReportText('');
                                                            }}
                                                            aria-label={t('testSolving.reportIssue') || 'Xabar berish'}
                                                            className={`w-7 h-7 flex items-center justify-center border rounded-lg transition-all ${
                                                                isReporting
                                                                    ? 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40'
                                                                    : 'text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
                                                            }`}
                                                            title={t('testSolving.reportIssue') || 'Xato/kamchilik haqida xabar berish'}
                                                        >
                                                            <Flag size={13} className="stroke-[2.5]" />
                                                        </button>
                                                    )}

                                                    {/* Go to question button (only if onJumpToQuestion is provided) */}
                                                    {onJumpToQuestion && (
                                                        <button
                                                            onClick={() => {
                                                                onJumpToQuestion(q);
                                                                onClose();
                                                            }}
                                                            className="h-7 px-2 flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all whitespace-nowrap"
                                                            title={t('testSolving.jumpToQuestion') || 'Savolga o\'tish'}
                                                        >
                                                            <span className="hidden lg:inline">
                                                                {t('testSolving.jumpToQuestion') || 'O\'tish'}
                                                            </span>
                                                            <ArrowRight size={13} className="stroke-[2.5]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Inline report form */}
                                            {isReporting && (
                                                <div className="col-span-1 md:col-span-12 mt-1 bg-orange-50/60 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3 flex flex-col gap-2">
                                                    <textarea
                                                        autoFocus
                                                        value={reportText}
                                                        onChange={(e) => setReportText(e.target.value)}
                                                        placeholder={t('testSolving.reportPlaceholder') || 'Bu savolda qanday xato yoki kamchilik bor? Batafsil yozing...'}
                                                        className="w-full text-xs font-medium bg-white dark:bg-zinc-950 border border-orange-200/60 dark:border-orange-900/40 rounded-lg px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-orange-400 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                                                    />
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => { setReportingQuestion(null); setReportText(''); }}
                                                            className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                                                        >
                                                            {t('testSolving.reportCancel') || 'Bekor qilish'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSubmitReport(q)}
                                                            disabled={reportSubmitting || !reportText.trim()}
                                                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-200 disabled:text-zinc-400 rounded-lg transition-all"
                                                        >
                                                            {reportSubmitting ? '...' : (t('testSolving.reportSubmit') || 'Yuborish')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <AlertCircle size={32} className="text-zinc-300 dark:text-zinc-650 mb-3" />
                                <p className="text-zinc-550 dark:text-zinc-400 text-sm font-medium">
                                    {t('myResults.noResults') || 'Hech narsa topilmadi'}
                                </p>
                                {(searchTerm || filterStatus !== 'all') && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                                        className="mt-3 px-3 py-1.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                                    >
                                        {t('myResults.categories.all') || 'Barchasi'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
