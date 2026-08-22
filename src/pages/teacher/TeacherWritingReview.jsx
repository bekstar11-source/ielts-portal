import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useWritingReview } from '../../hooks/useWritingReview';
import { getWritingAnswers, calculateTaskBand, combineWritingBand } from '../../utils/writingReview';
import {
    TeacherWritingReviewSkeleton, RefreshBar,
} from '../../components/teacher/TeacherSkeletons';

// Components
import WritingReviewSidebar from '../../components/admin/WritingReview/WritingReviewSidebar';
import WritingReviewWorkspace from '../../components/admin/WritingReview/WritingReviewWorkspace';
import { PaperPlaneTilt as SendIcon, CaretUp, CaretDown, Sparkle } from '@phosphor-icons/react';

export default function TeacherWritingReview() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const { t, lang } = useTranslation();
    const isDark = theme === 'dark';
    const location = useLocation();
    const {
        writings, students, loading, isRefreshing, saving, aiLoading, bulkState,
        handleSaveFeedback, handleAICheck, handleBulkAICheck
    } = useWritingReview(userData);
    const isAdmin = userData?.role === 'admin';

    const navState = location.state;
    const [selectedId, setSelectedId] = useState(navState?.selectedId ?? null);
    const [filter, setFilter] = useState(navState?.selectedId ? 'all' : 'pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackData, setFeedbackData] = useState({});
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    // Ommaviy tekshiruv uchun belgilangan ishlar (faqat admin ko'rinishida).
    const [selectedIds, setSelectedIds] = useState([]);

    const [prevNavState, setPrevNavState] = useState(navState);
    if (navState !== prevNavState) {
        setPrevNavState(navState);
        if (navState?.selectedId) {
            setSelectedId(navState.selectedId);
            setFilter('all');
        }
    }

    const activeWriting = writings.find(w => w.id === selectedId);
    const fd = feedbackData[selectedId] || {};

    const answers = activeWriting ? getWritingAnswers(activeWriting) : {};
    const hasT1 = activeWriting ? !!answers.task1 : false;
    const hasT2 = activeWriting ? !!answers.task2 : false;

    const setTaskDetails = (taskNum, criterion, value) => {
        setFeedbackData(prev => {
            const currentFd = prev[selectedId] || {};
            const detailsKey = `task${taskNum}Details`;
            const currentDetails = currentFd[detailsKey] || activeWriting?.[detailsKey] || {};
            const newDetails = { ...currentDetails, [criterion]: value };

            const calculatedBand = calculateTaskBand(newDetails);
            const bandKey = `task${taskNum}Band`;

            return {
                ...prev,
                [selectedId]: {
                    ...currentFd,
                    [detailsKey]: newDetails,
                    [bandKey]: calculatedBand || currentFd[bandKey] || activeWriting?.[bandKey] || ''
                }
            };
        });
    };

    const getTaskDetailsValue = (taskNum, criterion) => {
        return fd[`task${taskNum}Details`]?.[criterion] || activeWriting?.[`task${taskNum}Details`]?.[criterion] || '';
    };

    const getTaskBandValue = (taskNum) => {
        const raw = fd[`task${taskNum}Band`] ?? activeWriting?.[`task${taskNum}Band`];
        if (raw === undefined || raw === null || raw === '') return '';
        const n = Number(raw);
        return isNaN(n) ? '' : n.toFixed(1);
    };

    const calculateOverallScoreDisplay = () => {
        const overall = combineWritingBand(getTaskBandValue(1), getTaskBandValue(2), hasT1, hasT2);
        return isNaN(overall) || overall === 0 ? '--' : overall.toFixed(1);
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const selectMany = (ids, shouldSelect) => {
        setSelectedIds(prev => (shouldSelect
            ? [...new Set([...prev, ...ids])]
            : prev.filter(id => !ids.includes(id))));
    };

    const runBulkCheck = async ({ autoApply }) => {
        const result = await handleBulkAICheck(selectedIds, { autoApply });
        // Baholanganlar ro'yxatdan chiqib ketadi; qolganini qo'lda ko'rish
        // uchun tanlov faqat to'liq muvaffaqiyatda tozalanadi.
        if (result && result.failed.length === 0) setSelectedIds([]);
    };

    const handleSave = async () => {
        if (hasT1 && !getTaskBandValue(1)) {
            toast.error(t('teacher.writingReview.toastSelectBand1') || (lang === 'uz' ? "1-topshiriq uchun band tanlang" : "Please select a band for Task 1"));
            return;
        }
        if (hasT2 && !getTaskBandValue(2)) {
            toast.error(t('teacher.writingReview.toastSelectBand2') || (lang === 'uz' ? "2-topshiriq uchun band tanlang" : "Please select a band for Task 2"));
            return;
        }
        const submitData = {
            task1Band: getTaskBandValue(1),
            task2Band: getTaskBandValue(2),
            feedback: fd.feedback ?? (activeWriting?.teacherFeedback || ''),
            task1Details: fd.task1Details || activeWriting?.task1Details || null,
            task2Details: fd.task2Details || activeWriting?.task2Details || null
        };
        const savedId = selectedId;
        try {
            await handleSaveFeedback(savedId, submitData);
            setFeedbackData(prev => {
                const next = { ...prev };
                delete next[savedId];
                return next;
            });
        } catch {
            // Error toast already surfaced by useWritingReview.
        }
    };

    const aiReviewForActive = activeWriting?.aiReview;

    const applyAiSuggestion = (taskNum) => {
        const review = aiReviewForActive?.[`task${taskNum}`];
        if (!review) return;
        const map = taskNum === 1
            ? { taskAchievement: 'ta', coherence: 'cc', lexical: 'lr', grammar: 'gra' }
            : { taskAchievement: 'tr', coherence: 'cc', lexical: 'lr', grammar: 'gra' };
        Object.entries(map).forEach(([aiKey, critKey]) => {
            const band = review.criteria?.[aiKey]?.band;
            if (band !== undefined && band !== null && band !== '') {
                setTaskDetails(taskNum, critKey, String(band));
            }
        });
        toast.success((t('teacher.writingReview.toastAiApplied') || (lang === 'uz' ? "{n}-topshiriq uchun AI baholari qo'llandi" : "AI scores applied for Task {n}")).replace('{n}', taskNum));
    };

    const applyAiFeedback = () => {
        const parts = [1, 2]
            .map(n => aiReviewForActive?.[`task${n}`]?.criteria?.overall?.feedback)
            .filter(Boolean);
        if (parts.length === 0) return;
        setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: parts.join('\n\n') } }));
    };

    if (loading) return <TeacherWritingReviewSkeleton rows={7} />;

    const ieltsBands = ['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'];
    const selectCls = `h-7 px-2 rounded-md text-xs border outline-none cursor-pointer bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200'}`;
    const aiHintCls = 'flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:opacity-70';

    const renderTaskCriteria = (taskNum, criteriaList, hasTask) => {
        if (!hasTask) {
            return (
                <div className="flex items-center justify-center rounded-xl p-8 text-xs text-gray-400">
                    {(t('teacher.writingReview.taskNotSubmitted') || (lang === 'uz' ? "{n}-topshiriq topshirilmagan" : "Task {n} not submitted")).replace('{n}', taskNum)}
                </div>
            );
        }
        return (
            <div className={taskNum === 1 ? 'md:pr-6 md:border-r border-gray-100 dark:border-white/5' : ''}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
                    <h4 className="text-xs font-medium text-gray-500">
                        {taskNum === 1 
                            ? (t('teacher.writingReview.criteriaTask1') || (lang === 'uz' ? '1-topshiriq mezonlari' : 'Task 1 Criteria')) 
                            : (t('teacher.writingReview.criteriaTask2') || (lang === 'uz' ? '2-topshiriq mezonlari' : 'Task 2 Criteria'))}
                    </h4>
                    <div className="flex items-center gap-2">
                        {aiReviewForActive?.[`task${taskNum}`] && (
                            <button onClick={() => applyAiSuggestion(taskNum)} title={t('teacher.writingReview.applyAiCriteria') || (lang === 'uz' ? "AI baholarini qo'llash" : "Apply AI scores")} className={aiHintCls}>
                                <Sparkle size={12} /> AI
                            </button>
                        )}
                        <span className="text-xs text-gray-400">
                            {t('teacher.writingReview.band') || (lang === 'uz' ? 'Band:' : 'Band:')}
                        </span>
                        <select
                            value={getTaskBandValue(taskNum)}
                            onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], [`task${taskNum}Band`]: e.target.value } }))}
                            className={`${selectCls} font-medium`}
                        >
                            <option value="" className="text-black">--</option>
                            {ieltsBands.map(v => <option key={v} value={v} className="text-black">{v}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-3">
                    {criteriaList.map(crit => (
                        <div key={crit.key} className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-500 truncate">{crit.label}</span>
                            <select
                                value={getTaskDetailsValue(taskNum, crit.key)}
                                onChange={e => setTaskDetails(taskNum, crit.key, e.target.value)}
                                className={`${selectCls} w-20`}
                            >
                                <option value="" className="text-black">--</option>
                                {['4','5','6','7','8','9'].map(v => <option key={v} value={v} className="text-black">{v}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={`relative w-full h-[calc(100vh-80px)] flex overflow-hidden rounded-2xl border animate-content-in ${isDark ? 'bg-[#121212] border-white/5' : 'bg-[#FAFAFA] border-gray-200'}`}>
            <RefreshBar active={isRefreshing} />
            <WritingReviewSidebar
                writings={writings} students={students} filter={filter} setFilter={setFilter}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedId={selectedId} setSelectedId={setSelectedId} isDark={isDark}
                selectedIds={selectedIds}
                onToggleSelect={isAdmin ? toggleSelect : undefined}
                onSelectMany={selectMany}
                onClearSelection={() => setSelectedIds([])}
                bulkState={bulkState}
                onBulkCheck={runBulkCheck}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {activeWriting ? (
                    <>
                        <WritingReviewWorkspace
                            activeWriting={activeWriting}
                            studentName={students.find(s => s.id === activeWriting.userId)?.fullName || activeWriting.userName || (lang === 'uz' ? 'O\'quvchi' : 'Student')}
                            isDark={isDark}
                            onBack={() => setSelectedId(null)}
                        />

                        {/* Collapsible Grading Drawer */}
                        <div className={`shrink-0 flex flex-col border-t z-20 overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                            isPanelExpanded ? 'h-[55vh]' : 'h-12'
                        } ${isDark ? 'bg-[#171717] border-white/5 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>

                            {/* Drawer Header Toggle */}
                            <div
                                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                                className={`shrink-0 h-12 px-6 flex items-center justify-between cursor-pointer border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-medium">
                                        {t('teacher.writingReview.grading') || (lang === 'uz' ? 'Baholash' : 'Grading')}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {t('teacher.writingReview.band') || 'Band'} {calculateOverallScoreDisplay()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <span className="text-xs">
                                        {isPanelExpanded 
                                            ? (t('teacher.writingReview.collapse') || (lang === 'uz' ? 'Yashirish' : 'Hide')) 
                                            : (t('teacher.writingReview.expand') || (lang === 'uz' ? 'Ochish' : 'Open'))}
                                    </span>
                                    {isPanelExpanded ? <CaretDown size={14} /> : <CaretUp size={14} />}
                                </div>
                            </div>

                            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-6" inert={!isPanelExpanded}>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                                    {/* Criteria Grading Columns */}
                                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderTaskCriteria(1, [
                                            { key: 'ta', label: t('teacher.writingReview.criteria.ta') || (lang === 'uz' ? "Vazifani bajarish (TA)" : "Task Achievement (TA)") },
                                            { key: 'cc', label: t('teacher.writingReview.criteria.cc') || (lang === 'uz' ? "Izchillik (CC)" : "Coherence (CC)") },
                                            { key: 'lr', label: t('teacher.writingReview.criteria.lr') || (lang === 'uz' ? "Lug'at boyligi (LR)" : "Lexical Resource (LR)") },
                                            { key: 'gra', label: t('teacher.writingReview.criteria.gra') || (lang === 'uz' ? "Grammatika (GRA)" : "Grammar (GRA)") }
                                        ], hasT1)}
                                        {renderTaskCriteria(2, [
                                            { key: 'tr', label: t('teacher.writingReview.criteria.tr') || (lang === 'uz' ? "Vazifaga javob (TR)" : "Task Response (TR)") },
                                            { key: 'cc', label: t('teacher.writingReview.criteria.cc') || (lang === 'uz' ? "Izchillik (CC)" : "Coherence (CC)") },
                                            { key: 'lr', label: t('teacher.writingReview.criteria.lr') || (lang === 'uz' ? "Lug'at boyligi (LR)" : "Lexical Resource (LR)") },
                                            { key: 'gra', label: t('teacher.writingReview.criteria.gra') || (lang === 'uz' ? "Grammatika (GRA)" : "Grammar (GRA)") }
                                        ], hasT2)}
                                    </div>

                                    {/* Feedback Column */}
                                    <div className="lg:col-span-4 flex flex-col gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs text-gray-400">
                                                    {t('teacher.writingReview.teacherNote') || (lang === 'uz' ? "Ustoz izohi" : "Teacher feedback")}
                                                </label>
                                                {(aiReviewForActive?.task1 || aiReviewForActive?.task2) && (
                                                    <button onClick={applyAiFeedback} className={aiHintCls}>
                                                        <Sparkle size={12} /> {t('teacher.writingReview.takeFromAi') || (lang === 'uz' ? "AI dan olish" : "Get from AI")}
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                rows={4}
                                                value={fd.feedback ?? (activeWriting?.teacherFeedback || '')}
                                                onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: e.target.value } }))}
                                                placeholder={t('teacher.writingReview.notePlaceholder') || (lang === 'uz' ? "Tahrirlash va grammatik tuzatishlar bo'yicha maslahatlar yozing..." : "Write advice on editing and grammar corrections...")}
                                                className={`w-full px-4 py-3 rounded-xl text-xs border outline-none resize-none transition-colors ${
                                                    isDark ? 'bg-[#1E1E1E] border-white/10 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-slate-800 focus:border-blue-500'
                                                }`}
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2.5">
                                            <button
                                                onClick={() => handleAICheck(selectedId)}
                                                disabled={aiLoading || !activeWriting}
                                                className={`flex-1 h-10 border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ${
                                                    isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-slate-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {aiLoading ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <><Sparkle size={13} /> {aiReviewForActive ? (t('teacher.writingReview.recheck') || (lang === 'uz' ? 'Qayta tekshirish' : 'Recheck')) : (t('teacher.writingReview.aiCheck') || 'AI Check')}</>
                                                )}
                                            </button>

                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="flex-1 h-10 bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {saving ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <><SendIcon size={13} /> {t('teacher.writingReview.saveBtn') || (lang === 'uz' ? 'Saqlash' : 'Save')}</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                        {t('teacher.writingReview.selectPrompt') || (lang === 'uz' ? "Natijalar ro'yxatidan inshoni tanlang" : "Select an essay from the list")}
                    </div>
                )}
            </div>
        </div>
    );
}
