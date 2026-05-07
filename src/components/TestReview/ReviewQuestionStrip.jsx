import React from 'react';
import { MessageSquare } from 'lucide-react';

const ReviewQuestionStrip = ({ resultData, testData, setIsCommentsOpen }) => {
    return (
        <div className="bg-white border-b border-gray-100 px-4 py-1.5 flex items-center justify-between shadow-sm z-[5]">
            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap hidden sm:inline mr-2">Results:</span>
                <div className="flex flex-wrap gap-1 max-h-[26px]">
                    {Object.entries(resultData.answers || {}).slice(0, 40).map(([qId, val], idx) => {
                        const q = testData.questions?.find(q => String(q.id) === String(qId));
                        const ans = q?.answer || q?.correct_answer || q?.correctAnswer || q?.correct_answer_value;
                        const isCorrect = String(ans || "").toLowerCase() === String(val || "").toLowerCase();
                        return (
                            <div
                                key={qId}
                                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] flex items-center justify-center text-[8px] sm:text-[9px] font-black transition-all ${
                                    isCorrect ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-100'
                                }`}
                            >
                                {idx + 1}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">{resultData.score || 0} Correct</span>
                </div>

                <button 
                    onClick={() => setIsCommentsOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all active:scale-95 shadow-sm"
                >
                    <MessageSquare size={13} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Comments</span>
                </button>
            </div>
        </div>
    );
};

export default ReviewQuestionStrip;
