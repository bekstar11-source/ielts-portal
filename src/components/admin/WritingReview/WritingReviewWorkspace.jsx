import React from 'react';
import { User, Calendar, TextT } from '@phosphor-icons/react';

const WritingReviewWorkspace = ({ activeWriting, studentName, isDark }) => {
    if (!activeWriting) return null;

    // Robust answer extraction
    const getAnswers = (res) => {
        // 1. Try top-level userAnswers or writingAnswers
        let ans = res.userAnswers || res.writingAnswers || {};
        
        // 2. Try attempts array (newest structure)
        if (res.attempts && Array.isArray(res.attempts) && res.attempts.length > 0) {
            const lastAttempt = res.attempts[res.attempts.length - 1];
            if (lastAttempt.userAnswers || lastAttempt.writingAnswers) {
                ans = lastAttempt.userAnswers || lastAttempt.writingAnswers || ans;
            }
        }

        // 3. Try details field (mock exams)
        if (res.details?.writingAnswers) {
            ans = res.details.writingAnswers || ans;
        }

        // 4. Try legacy task1/task2/writingAnswer top-level fields
        if (!ans.task1 && res.task1) ans.task1 = res.task1;
        if (!ans.task1 && res.writingAnswer) ans.task1 = res.writingAnswer;
        if (!ans.task2 && res.task2) ans.task2 = res.task2;

        return ans;
    };

    const answers = getAnswers(activeWriting);
    const task1Content = answers.task1 || "";
    const task2Content = answers.task2 || "";

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className={`px-8 py-3.5 flex items-center justify-between border-b ${isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-gray-200 bg-[#FBFBFD] flex items-center justify-center text-slate-700 text-base font-medium shadow-sm">
                        <User size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{studentName}</h2>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(activeWriting.date?.seconds ? activeWriting.date.seconds * 1000 : activeWriting.date).toLocaleDateString()}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="flex items-center gap-1"><TextT size={11} /> {activeWriting.testTitle || 'General Training'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Task 1 */}
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-[#1F1F1F] border-white/5 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                            <h4 className="text-base font-semibold">Task 1</h4>
                            <span className="text-[11px] text-gray-500">{task1Content.trim().split(/\s+/).filter(Boolean).length} words</span>
                        </div>
                        <div className="text-base leading-[1.8] font-serif whitespace-pre-wrap text-slate-700 dark:text-gray-300">
                            {task1Content || <span className="italic opacity-30">No submission</span>}
                        </div>
                    </div>

                    {/* Task 2 */}
                    <div className={`rounded-2xl p-6 border ${isDark ? 'bg-[#1F1F1F] border-white/5 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                            <h4 className="text-base font-semibold">Task 2</h4>
                            <span className="text-[11px] text-gray-500">{task2Content.trim().split(/\s+/).filter(Boolean).length} words</span>
                        </div>
                        <div className="text-base leading-[1.8] font-serif whitespace-pre-wrap text-slate-700 dark:text-gray-300">
                            {task2Content || <span className="italic opacity-30">No submission</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WritingReviewWorkspace;
