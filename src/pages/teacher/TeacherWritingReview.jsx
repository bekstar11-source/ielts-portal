import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWritingReview } from '../../hooks/useWritingReview';

// Components
import WritingReviewSidebar from '../../components/admin/WritingReview/WritingReviewSidebar';
import WritingReviewWorkspace from '../../components/admin/WritingReview/WritingReviewWorkspace';
import { PaperPlaneTilt as SendIcon } from '@phosphor-icons/react';

export default function TeacherWritingReview() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { 
        writings, students, loading, saving, handleSaveFeedback 
    } = useWritingReview(userData);

    const [selectedId, setSelectedId] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackData, setFeedbackData] = useState({});

    const activeWriting = writings.find(w => w.id === selectedId);
    const fd = feedbackData[selectedId] || {};

    const calculateOverall = (t1, t2) => {
        if (!t1 || !t2) return "--";
        const raw = (parseFloat(t1) + 2 * parseFloat(t2)) / 3;
        let overall = Math.floor(raw);
        const rem = raw - overall;
        if (rem >= 0.75) overall += 1;
        else if (rem >= 0.25) overall += 0.5;
        return overall.toFixed(1);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold opacity-50">Ma'lumotlar yuklanmoqda...</p>
        </div>
    );

    return (
        <div className={`w-full h-full flex overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-[#F8F9FA]'}`}>
            <WritingReviewSidebar 
                writings={writings} students={students} filter={filter} setFilter={setFilter}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedId={selectedId} setSelectedId={setSelectedId} isDark={isDark}
            />

            <div className="flex-1 flex flex-col h-full relative">
                {activeWriting ? (
                    <>
                        <WritingReviewWorkspace 
                            activeWriting={activeWriting} 
                            studentName={students.find(s => s.id === activeWriting.userId)?.fullName || 'O\'quvchi'}
                            isDark={isDark}
                        />

                        {/* Grading Tray */}
                        <div className={`absolute bottom-0 left-0 right-0 px-4 py-3 border-t backdrop-blur-xl ${isDark ? 'bg-[#1A1A1A]/90 border-white/5' : 'bg-[#FBFBFD]/95 border-gray-200 shadow-lg'}`}>
                            <div className="max-w-6xl mx-auto flex items-end gap-5">
                                <div className="flex gap-2 w-48 shrink-0">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Task 1</label>
                                        <select 
                                            value={fd.task1Band || activeWriting.task1Band || ''}
                                            onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], task1Band: e.target.value } }))}
                                            className="w-full h-8 px-2 rounded-lg text-xs border outline-none"
                                        >
                                            <option value="">--</option>
                                            {['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Task 2</label>
                                        <select 
                                            value={fd.task2Band || activeWriting.task2Band || ''}
                                            onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], task2Band: e.target.value } }))}
                                            className="w-full h-8 px-2 rounded-lg text-xs border outline-none"
                                        >
                                            <option value="">--</option>
                                            {['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <textarea 
                                        rows={2} 
                                        value={fd.feedback ?? (activeWriting.teacherFeedback || '')}
                                        onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: e.target.value } }))}
                                        placeholder="Add feedback..."
                                        className="w-full px-4 py-2 rounded-xl text-sm border outline-none"
                                    />
                                </div>

                                <button 
                                    onClick={() => handleSaveFeedback(selectedId, fd)}
                                    disabled={saving}
                                    className="px-6 h-10 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                                >
                                    {saving ? "Saving..." : <><SendIcon size={14} /> Save Evaluation</>}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center opacity-40 font-bold">Select a submission to review</div>
                )}
            </div>
        </div>
    );
}
