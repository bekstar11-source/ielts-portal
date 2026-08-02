import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWritingReview } from '../../hooks/useWritingReview';

// Components
import WritingReviewSidebar from '../../components/admin/WritingReview/WritingReviewSidebar';
import WritingReviewWorkspace from '../../components/admin/WritingReview/WritingReviewWorkspace';
import { PaperPlaneTilt as SendIcon, CaretUp, CaretDown, Sparkle } from '@phosphor-icons/react';

export default function TeacherWritingReview() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const location = useLocation();
    const { 
        writings, students, loading, saving, aiLoading, handleSaveFeedback, handleAICheck 
    } = useWritingReview(userData);

    // Natijalar sahifasidan kelingan bo'lsa, o'sha insho darhol ochiladi.
    // Ilgari bu `useEffect` ichida `setState` bilan qilinardi — birinchi
    // renderda noto'g'ri insho ko'rinib, keyin almashardi.
    const navState = location.state;
    const [selectedId, setSelectedId] = useState(navState?.selectedId ?? null);
    const [filter, setFilter] = useState(navState?.selectedId ? 'all' : 'pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackData, setFeedbackData] = useState({});
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);

    // Sahifa ochiq turganda yangi `state` bilan qayta navigatsiya bo'lsa —
    // React'ning "render paytida state'ni moslash" namunasi.
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

    const getAnswers = (res) => {
        if (!res) return {};
        let source = res.userAnswers || res.writingAnswers || {};
        if (Array.isArray(res.attempts) && res.attempts.length > 0) {
            const lastAttempt = res.attempts[res.attempts.length - 1];
            source = lastAttempt.userAnswers || lastAttempt.writingAnswers || source;
        }
        if (res.details?.writingAnswers) {
            source = res.details.writingAnswers;
        }

        // Nusxa olamiz: ilgari bu yerdagi `ans.task1 = ...` natija hujjatining
        // O'ZINI o'zgartirardi (`res.userAnswers` ga havola edi).
        const ans = { ...source };
        if (!ans.task1 && res.task1) ans.task1 = res.task1;
        if (!ans.task1 && res.writingAnswer) ans.task1 = res.writingAnswer;
        if (!ans.task2 && res.task2) ans.task2 = res.task2;
        return ans;
    };

    const answers = activeWriting ? getAnswers(activeWriting) : {};
    const hasT1 = activeWriting ? !!answers.task1 : false;
    const hasT2 = activeWriting ? !!answers.task2 : false;

    const calculateTaskBand = (details) => {
        if (!details) return '';
        const { ta, tr, cc, lr, gra } = details;
        const criteria = [ta || tr, cc, lr, gra].map(parseFloat).filter(n => !isNaN(n));
        if (criteria.length < 4) return '';
        const avg = criteria.reduce((sum, v) => sum + v, 0) / criteria.length;
        let integerPart = Math.floor(avg);
        const fractionalPart = avg - integerPart;
        if (fractionalPart >= 0.75) return (integerPart + 1).toFixed(1);
        if (fractionalPart >= 0.25) return (integerPart + 0.5).toFixed(1);
        return integerPart.toFixed(1);
    };

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
        // Firestore stores whole bands (e.g. 7.0) as a bare integer (7), which
        // won't match the "7.0"-style <option> values below — normalize.
        const n = Number(raw);
        return isNaN(n) ? '' : n.toFixed(1);
    };

    const calculateOverallScoreDisplay = () => {
        const t1 = parseFloat(getTaskBandValue(1));
        const t2 = parseFloat(getTaskBandValue(2));

        if (hasT1 && hasT2) {
            if (isNaN(t1) || isNaN(t2)) return '--';
            const raw = (t1 + 2 * t2) / 3;
            let integerPart = Math.floor(raw);
            const fractionalPart = raw - integerPart;
            if (fractionalPart >= 0.75) return (integerPart + 1).toFixed(1);
            if (fractionalPart >= 0.25) return (integerPart + 0.5).toFixed(1);
            return integerPart.toFixed(1);
        } else if (hasT1) {
            return isNaN(t1) ? '--' : t1.toFixed(1);
        } else if (hasT2) {
            return isNaN(t2) ? '--' : t2.toFixed(1);
        }
        return '--';
    };

    const handleSave = async () => {
        if (hasT1 && !getTaskBandValue(1)) {
            toast.error("1-topshiriq uchun band tanlang");
            return;
        }
        if (hasT2 && !getTaskBandValue(2)) {
            toast.error("2-topshiriq uchun band tanlang");
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
            // Draft is now reflected on the server — drop it so a stale local
            // value can't shadow fresh data if this submission is reopened.
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

    // Fills the grading selects from the AI's suggested per-criterion bands
    // so the teacher can adjust rather than retype everything.
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
        toast.success(`${taskNum}-topshiriq uchun AI baholari qo'llandi`);
    };

    const applyAiFeedback = () => {
        const parts = [1, 2]
            .map(n => aiReviewForActive?.[`task${n}`]?.criteria?.overall?.feedback)
            .filter(Boolean);
        if (parts.length === 0) return;
        setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: parts.join('\n\n') } }));
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-10 h-10 border-2 border-gray-200 dark:border-white/10 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Ma'lumotlar yuklanmoqda...</p>
        </div>
    );

    const ieltsBands = ['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'];
    const selectCls = `h-7 px-2 rounded-md text-xs border outline-none cursor-pointer bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200'}`;
    const aiHintCls = 'flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:opacity-70';

    const renderTaskCriteria = (taskNum, criteriaList, hasTask) => {
        if (!hasTask) {
            return (
                <div className="flex items-center justify-center rounded-xl p-8 text-xs text-gray-400">
                    {taskNum}-topshiriq topshirilmagan
                </div>
            );
        }
        return (
            <div className={taskNum === 1 ? 'md:pr-6 md:border-r border-gray-100 dark:border-white/5' : ''}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
                    <h4 className="text-xs font-medium text-gray-500">{taskNum}-topshiriq mezonlari</h4>
                    <div className="flex items-center gap-2">
                        {aiReviewForActive?.[`task${taskNum}`] && (
                            <button onClick={() => applyAiSuggestion(taskNum)} title="AI baholarini qo'llash" className={aiHintCls}>
                                <Sparkle size={12} /> AI
                            </button>
                        )}
                        <span className="text-xs text-gray-400">Band:</span>
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
        <div className={`relative w-full h-[calc(100vh-80px)] flex overflow-hidden rounded-2xl border ${isDark ? 'bg-[#121212] border-white/5' : 'bg-[#FAFAFA] border-gray-200'}`}>
            <WritingReviewSidebar
                writings={writings} students={students} filter={filter} setFilter={setFilter}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedId={selectedId} setSelectedId={setSelectedId} isDark={isDark}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {activeWriting ? (
                    <>
                        <WritingReviewWorkspace
                            activeWriting={activeWriting}
                            studentName={students.find(s => s.id === activeWriting.userId)?.fullName || activeWriting.userName || 'O\'quvchi'}
                            isDark={isDark}
                            onBack={() => setSelectedId(null)}
                        />

                        {/* Collapsible Grading Drawer — docked in the flex column so it never covers the essay text */}
                        <div className={`shrink-0 flex flex-col border-t z-20 overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                            isPanelExpanded ? 'h-[55vh]' : 'h-12'
                        } ${isDark ? 'bg-[#171717] border-white/5 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>

                            {/* Drawer Header Toggle */}
                            <div
                                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                                className={`shrink-0 h-12 px-6 flex items-center justify-between cursor-pointer border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-medium">Baholash</span>
                                    <span className="text-xs text-gray-400">Band {calculateOverallScoreDisplay()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <span className="text-xs">{isPanelExpanded ? 'Yashirish' : 'Ochish'}</span>
                                    {isPanelExpanded ? <CaretDown size={14} /> : <CaretUp size={14} />}
                                </div>
                            </div>

                            {/* Panel tarkibi doim DOM'da — yig'ilganda `overflow-hidden` uni
                                qirqib turadi. Ilgari u `unmount` bo'lardi va balandlik
                                animatsiyasi boshlanmasdan tarkib g'oyib bo'lib pirpirardi. */}
                            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-6" inert={!isPanelExpanded}>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                                    {/* Criteria Grading Columns */}
                                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderTaskCriteria(1, [
                                            { key: 'ta', label: "Vazifani bajarish (TA)" },
                                            { key: 'cc', label: "Izchillik (CC)" },
                                            { key: 'lr', label: "Lug'at boyligi (LR)" },
                                            { key: 'gra', label: 'Grammatika (GRA)' }
                                        ], hasT1)}
                                        {renderTaskCriteria(2, [
                                            { key: 'tr', label: "Vazifaga javob (TR)" },
                                            { key: 'cc', label: "Izchillik (CC)" },
                                            { key: 'lr', label: "Lug'at boyligi (LR)" },
                                            { key: 'gra', label: 'Grammatika (GRA)' }
                                        ], hasT2)}
                                    </div>

                                    {/* Feedback Column */}
                                    <div className="lg:col-span-4 flex flex-col gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs text-gray-400">Ustoz izohi</label>
                                                {(aiReviewForActive?.task1 || aiReviewForActive?.task2) && (
                                                    <button onClick={applyAiFeedback} className={aiHintCls}>
                                                        <Sparkle size={12} /> AI dan olish
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                rows={4}
                                                value={fd.feedback ?? (activeWriting?.teacherFeedback || '')}
                                                onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: e.target.value } }))}
                                                placeholder="Tahrirlash va grammatik tuzatishlar bo'yicha maslahatlar yozing..."
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
                                                    <><Sparkle size={13} /> {aiReviewForActive ? 'Qayta tekshirish' : 'AI Check'}</>
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
                                                    <><SendIcon size={13} /> Saqlash</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Natijalar ro'yxatidan inshoni tanlang</div>
                )}
            </div>
        </div>
    );
}
