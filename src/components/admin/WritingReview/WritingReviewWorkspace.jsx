import React from 'react';
import { User, Calendar, TextT, ArrowLeft, Sparkle } from '@phosphor-icons/react';
import { useTranslation } from '../../../context/LanguageContext';

const AIReviewPanel = ({ review, isDark, t, lang }) => {
    if (!review) return null;
    const criteria = review.criteria || {};
    const overallFeedback = criteria.overall?.feedback;
    const errors = [...(review.grammarErrors || []), ...(review.lexicalErrors || [])];
    const imageAnalysis = review.imageAnalysis;

    const criterionLabels = {
        taskAchievement: 'TA/TR',
        coherence: 'CC',
        lexical: 'LR',
        grammar: 'GRA',
        overall: t('teacher.writingReview.criteria.overall') || (lang === 'uz' ? 'Umumiy' : 'Overall')
    };

    return (
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 mb-3">
                <Sparkle size={13} className="text-blue-500" />
                <h5 className="text-xs font-medium text-gray-500">
                    {t('teacher.writingReview.workspace.aiAnalysis') || (lang === 'uz' ? 'AI tahlili' : 'AI Analysis')}
                </h5>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(criteria).map(([key, val]) => (
                    <span
                        key={key}
                        className={`text-[11px] font-medium px-2 py-1 rounded-md ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                    >
                        {criterionLabels[key] || key}: <span className="text-blue-600 dark:text-blue-400">{val.band ?? '-'}</span>
                    </span>
                ))}
            </div>

            {imageAnalysis && (
                <div className={`mb-3 p-2.5 rounded-lg text-[12px] leading-relaxed ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <span className="font-medium opacity-60">
                        {lang === 'uz' ? 'Rasm tahlili: ' : 'Image analysis: '}
                    </span>
                    <span className="opacity-80 whitespace-pre-wrap">{imageAnalysis}</span>
                </div>
            )}

            {overallFeedback && (
                <p className="text-[13px] leading-relaxed opacity-80 whitespace-pre-wrap mb-3">{overallFeedback}</p>
            )}

            {errors.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer text-[11px] font-medium select-none text-gray-500">
                        {(t('teacher.writingReview.workspace.errorList') || (lang === 'uz' ? 'Xatolar ro\'yxati ({count})' : 'Error list ({count})')).replace('{count}', errors.length)}
                    </summary>
                    <div className="mt-2 space-y-2">
                        {errors.map((err, i) => (
                            <div key={i} className={`p-2.5 rounded-lg text-[12px] ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="line-through opacity-50">{err.original}</span>
                                    <span className="opacity-40">→</span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">{err.correction}</span>
                                </div>
                                {err.explanation && <p className="mt-1 opacity-60">{err.explanation}</p>}
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
};

const WritingReviewWorkspace = ({ activeWriting, studentName, isDark, onBack }) => {
    const { t, lang } = useTranslation();
    if (!activeWriting) return null;

    // Robust answer extraction
    const getAnswers = (res) => {
        let ans = res.userAnswers || res.writingAnswers || {};

        if (res.attempts && Array.isArray(res.attempts) && res.attempts.length > 0) {
            const lastAttempt = res.attempts[res.attempts.length - 1];
            if (lastAttempt.userAnswers || lastAttempt.writingAnswers) {
                ans = lastAttempt.userAnswers || lastAttempt.writingAnswers || ans;
            }
        }

        if (res.details?.writingAnswers) {
            ans = res.details.writingAnswers || ans;
        }

        if (!ans.task1 && res.task1) ans.task1 = res.task1;
        if (!ans.task1 && res.writingAnswer) ans.task1 = res.writingAnswer;
        if (!ans.task2 && res.task2) ans.task2 = res.task2;

        return ans;
    };

    const answers = getAnswers(activeWriting);
    const task1Content = answers.task1 || "";
    const task2Content = answers.task2 || "";
    const aiReview = activeWriting.aiReview;

    const wordCountLabel = lang === 'uz' ? "so'z" : "words";

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className={`px-4 sm:px-8 py-3.5 flex items-center gap-3 border-b ${isDark ? 'bg-[#161616] border-white/5' : 'bg-white border-gray-100'}`}>
                <button
                    onClick={onBack}
                    className={`lg:hidden shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-slate-600'}`}
                    aria-label={t('teacher.writingReview.workspace.backToList') || (lang === 'uz' ? "Ro'yxatga qaytish" : "Back to list")}
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-medium shrink-0 ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-slate-600'}`}>
                        <User size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold tracking-tight truncate">{studentName}</h2>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar size={11} /> {new Date(activeWriting.date?.seconds ? activeWriting.date.seconds * 1000 : activeWriting.date).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US')}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full shrink-0" />
                            <span className="flex items-center gap-1 truncate"><TextT size={11} /> {activeWriting.testTitle || 'General Training'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Task 1 */}
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                            <h4 className="text-sm font-medium text-gray-500">
                                {t('teacher.writingReview.workspace.task1') || (lang === 'uz' ? '1-topshiriq' : 'Task 1')}
                            </h4>
                            <span className="text-[11px] text-gray-400">{task1Content.trim().split(/\s+/).filter(Boolean).length} {wordCountLabel}</span>
                        </div>
                        <div className="text-[15px] leading-[1.8] font-serif whitespace-pre-wrap text-slate-700 dark:text-gray-300">
                            {task1Content || <span className="italic opacity-30">{t('teacher.writingReview.workspace.notSubmitted') || (lang === 'uz' ? 'Topshirilmagan' : 'Not submitted')}</span>}
                        </div>
                        <AIReviewPanel review={aiReview?.task1} isDark={isDark} t={t} lang={lang} />
                    </div>

                    {/* Task 2 */}
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                            <h4 className="text-sm font-medium text-gray-500">
                                {t('teacher.writingReview.workspace.task2') || (lang === 'uz' ? '2-topshiriq' : 'Task 2')}
                            </h4>
                            <span className="text-[11px] text-gray-400">{task2Content.trim().split(/\s+/).filter(Boolean).length} {wordCountLabel}</span>
                        </div>
                        <div className="text-[15px] leading-[1.8] font-serif whitespace-pre-wrap text-slate-700 dark:text-gray-300">
                            {task2Content || <span className="italic opacity-30">{t('teacher.writingReview.workspace.notSubmitted') || (lang === 'uz' ? 'Topshirilmagan' : 'Not submitted')}</span>}
                        </div>
                        <AIReviewPanel review={aiReview?.task2} isDark={isDark} t={t} lang={lang} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WritingReviewWorkspace;
