import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

    const [selectedId, setSelectedId] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackData, setFeedbackData] = useState({});
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);

    // Handle navigation from Results page
    useEffect(() => {
        if (location.state?.selectedId) {
            setSelectedId(location.state.selectedId);
            setFilter('all');
        }
    }, [location.state]);

    const activeWriting = writings.find(w => w.id === selectedId);
    const fd = feedbackData[selectedId] || {};

    const getAnswers = (res) => {
        if (!res) return {};
        let ans = res.userAnswers || res.writingAnswers || {};
        if (res.attempts && Array.isArray(res.attempts) && res.attempts.length > 0) {
            const lastAttempt = res.attempts[res.attempts.length - 1];
            ans = lastAttempt.userAnswers || lastAttempt.writingAnswers || ans;
        }
        if (res.details?.writingAnswers) {
            ans = res.details.writingAnswers || ans;
        }
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
        return fd[`task${taskNum}Band`] || activeWriting?.[`task${taskNum}Band`] || '';
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

    const handleSave = () => {
        const submitData = {
            task1Band: getTaskBandValue(1),
            task2Band: getTaskBandValue(2),
            feedback: fd.feedback ?? (activeWriting?.teacherFeedback || ''),
            task1Details: fd.task1Details || activeWriting?.task1Details || null,
            task2Details: fd.task2Details || activeWriting?.task2Details || null
        };
        handleSaveFeedback(selectedId, submitData);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold opacity-50">Ma'lumotlar yuklanmoqda...</p>
        </div>
    );

    const ieltsBands = ['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'];

    return (
        <div className={`w-full h-[calc(100vh-80px)] flex overflow-hidden rounded-[24px] border ${isDark ? 'bg-[#121212] border-white/5' : 'bg-[#F8F9FA] border-gray-200'}`}>
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
                        />

                        {/* Collapsible Grading Drawer — docked in the flex column so it never covers the essay text */}
                        <div className={`shrink-0 flex flex-col border-t backdrop-blur-xl transition-all duration-300 z-20 overflow-hidden ${
                            isPanelExpanded ? 'max-h-[55vh]' : 'h-12'
                        } ${isDark ? 'bg-[#1E1E1E]/95 border-white/5 text-white' : 'bg-white/95 border-gray-200 text-slate-800 shadow-2xl'}`}>
                            
                            {/* Drawer Header Toggle */}
                            <div
                                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                                className={`shrink-0 h-12 px-6 flex items-center justify-between cursor-pointer border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Baholash va Sharh Paneli</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-150 text-gray-700'}`}>
                                        Calculated: Band {calculateOverallScoreDisplay()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <span className="text-xs font-medium">{isPanelExpanded ? 'Yashirish' : 'Ochish'}</span>
                                    {isPanelExpanded ? <CaretDown size={14} /> : <CaretUp size={14} />}
                                </div>
                            </div>

                            {/* Expanded Panel Content */}
                            {isPanelExpanded && (
                                <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                        
                                        {/* Criteria Grading Columns */}
                                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            
                                            {/* Task 1 Criteria */}
                                            {hasT1 ? (
                                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#2A2A2A]/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-center justify-between mb-4 border-b border-dashed pb-2 border-gray-300 dark:border-white/10">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Task 1 Criteria</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold opacity-75">Band:</span>
                                                            <select
                                                                value={getTaskBandValue(1)}
                                                                onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], task1Band: e.target.value } }))}
                                                                className="h-7 px-2 rounded-lg text-xs font-bold border bg-transparent outline-none cursor-pointer"
                                                            >
                                                                <option value="" className="text-black">--</option>
                                                                {ieltsBands.map(v => <option key={v} value={v} className="text-black">{v}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {[
                                                            { key: 'ta', label: 'Task Achievement (TA)' },
                                                            { key: 'cc', label: 'Coherence & Cohesion (CC)' },
                                                            { key: 'lr', label: 'Lexical Resource (LR)' },
                                                            { key: 'gra', label: 'Grammar Accuracy (GRA)' }
                                                        ].map(crit => (
                                                            <div key={crit.key} className="flex items-center justify-between gap-4">
                                                                <span className="text-xs font-medium opacity-80 truncate">{crit.label}</span>
                                                                <select
                                                                    value={getTaskDetailsValue(1, crit.key)}
                                                                    onChange={e => setTaskDetails(1, crit.key, e.target.value)}
                                                                    className="h-7 px-2 rounded-lg text-xs border bg-transparent outline-none w-20 cursor-pointer"
                                                                >
                                                                    <option value="" className="text-black">--</option>
                                                                    {['4','5','6','7','8','9'].map(v => <option key={v} value={v} className="text-black">{v}</option>)}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center border border-dashed rounded-2xl p-8 opacity-40 text-xs font-bold">
                                                    Task 1 topshirilmagan
                                                </div>
                                            )}

                                            {/* Task 2 Criteria */}
                                            {hasT2 ? (
                                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#2A2A2A]/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-center justify-between mb-4 border-b border-dashed pb-2 border-gray-300 dark:border-white/10">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-500">Task 2 Criteria</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold opacity-75">Band:</span>
                                                            <select
                                                                value={getTaskBandValue(2)}
                                                                onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], task2Band: e.target.value } }))}
                                                                className="h-7 px-2 rounded-lg text-xs font-bold border bg-transparent outline-none cursor-pointer"
                                                            >
                                                                <option value="" className="text-black">--</option>
                                                                {ieltsBands.map(v => <option key={v} value={v} className="text-black">{v}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {[
                                                            { key: 'tr', label: 'Task Response (TR)' },
                                                            { key: 'cc', label: 'Coherence & Cohesion (CC)' },
                                                            { key: 'lr', label: 'Lexical Resource (LR)' },
                                                            { key: 'gra', label: 'Grammar Accuracy (GRA)' }
                                                        ].map(crit => (
                                                            <div key={crit.key} className="flex items-center justify-between gap-4">
                                                                <span className="text-xs font-medium opacity-80 truncate">{crit.label}</span>
                                                                <select
                                                                    value={getTaskDetailsValue(2, crit.key)}
                                                                    onChange={e => setTaskDetails(2, crit.key, e.target.value)}
                                                                    className="h-7 px-2 rounded-lg text-xs border bg-transparent outline-none w-20 cursor-pointer"
                                                                >
                                                                    <option value="" className="text-black">--</option>
                                                                    {['4','5','6','7','8','9'].map(v => <option key={v} value={v} className="text-black">{v}</option>)}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center border border-dashed rounded-2xl p-8 opacity-40 text-xs font-bold">
                                                    Task 2 topshirilmagan
                                                </div>
                                            )}

                                        </div>

                                        {/* Feedback Column */}
                                        <div className="lg:col-span-4 flex flex-col gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Ustoz Mulohazalari (Feedback)</label>
                                                <textarea 
                                                    rows={4} 
                                                    value={fd.feedback ?? (activeWriting?.teacherFeedback || '')}
                                                    onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: e.target.value } }))}
                                                    placeholder="Tahrirlash va grammatik tuzatishlar bo'yicha maslahatlar yozing..."
                                                    className={`w-full px-4 py-3 rounded-2xl text-xs border outline-none resize-none transition-colors ${
                                                        isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-slate-800 focus:border-emerald-500'
                                                    }`}
                                                />
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2.5">
                                                <button 
                                                    onClick={() => handleAICheck(selectedId)}
                                                    disabled={aiLoading || !activeWriting}
                                                    className={`flex-1 h-11 border rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                                        isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                                    }`}
                                                >
                                                    {aiLoading ? (
                                                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <><Sparkle size={14} className="text-emerald-500" /> AI Check</>
                                                    )}
                                                </button>

                                                <button 
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className="flex-1 h-11 bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98]"
                                                >
                                                    {saving ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <><SendIcon size={14} /> Saqlash</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center opacity-40 font-bold">Natijalar ro'yxatidan inshoni tanlang</div>
                )}
            </div>
        </div>
    );
}
