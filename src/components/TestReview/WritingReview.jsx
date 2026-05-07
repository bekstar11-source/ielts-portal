import React from 'react';
import { Lock, Zap, ArrowRight } from 'lucide-react';

const WritingReview = ({ testData, currentAnswers, resultData, isPremium }) => {
    return (
        <div className="w-full h-full flex flex-col bg-[#F5F5F7]">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12">
                <div className="max-w-[800px] mx-auto flex flex-col gap-16 pb-20">
                    {testData.writingTasks?.map(task => {
                        const answer = currentAnswers ? currentAnswers[`task${task.id}`] : "";
                        return (
                            <div key={task.id} className="flex flex-col gap-8 animate-fadeIn">
                                {/* TASK HEADER */}
                                <div className="flex flex-col items-center text-center space-y-2 mb-2">
                                    <span className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">IELTS Writing</span>
                                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{task.title}</h2>
                                </div>

                                {/* PROMPT CARD */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-100 to-gray-200"></div>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800 text-[13px] uppercase tracking-widest text-[#1d1d1f]">Question</h3>
                                        <span className="text-[11px] font-medium text-gray-500 bg-[#F5F5F7] px-3 py-1 rounded-full uppercase tracking-wider">Min {task.minWords} words</span>
                                    </div>
                                    {task.image && (
                                        <div className="w-full bg-[#fbfbfd] rounded-2xl p-4 flex justify-center border border-gray-100">
                                            <img src={task.image} className="max-w-full max-h-[300px] object-contain mix-blend-multiply" alt="Task" />
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap text-[#1d1d1f] text-[15px] leading-relaxed font-medium">{task.prompt}</div>
                                </div>

                                {/* STUDENT ANSWER CARD */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80"></div>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800 text-[13px] uppercase tracking-widest text-[#1d1d1f]">Student Answer</h3>
                                        <div className="text-[11px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                                            {((answer || "") + "").trim().split(/\s+/).filter(Boolean).length} WORDS
                                        </div>
                                    </div>
                                    <div className="whitespace-pre-wrap font-serif text-[#1d1d1f] text-[16px] leading-[1.8] min-h-[150px]">
                                        {answer || <span className="text-gray-400 italic">No answer provided.</span>}
                                    </div>
                                </div>

                                {/* AI FEEDBACK */}
                                {resultData.aiReview && resultData.aiReview[`task${task.id}`] && (
                                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-400 opacity-80"></div>
                                        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><span className="text-orange-500 text-sm">✨</span></div>
                                            <h3 className="font-semibold text-[#1d1d1f] text-sm uppercase tracking-widest">AI Evaluation {!isPremium && '(Locked)'}</h3>
                                        </div>
                                        {!isPremium ? (
                                            <div className="relative p-6 text-center">
                                                <div className="filter blur-md opacity-30 select-none pointer-events-none mb-4">
                                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mb-4 text-[#0071E3]"><Lock size={24} /></div>
                                                    <h4 className="text-lg font-bold text-[#1D1D1F] mb-2">Detailed AI Analysis</h4>
                                                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))} className="bg-[#0071E3] text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
                                                        <Zap size={16} fill="currentColor" /> Premiumga o'tish <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-2xl border border-gray-100">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-[#FBFBFD] text-gray-500 border-b border-gray-100">
                                                        <tr><th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider w-1/4">Criterion</th><th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider w-20">Band</th><th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider">Feedback</th></tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {Object.entries(resultData.aiReview[`task${task.id}`].criteria || {}).map(([key, val]) => (
                                                            <tr key={key} className={key === 'overall' ? 'bg-[#f5f5f7]' : 'hover:bg-[#FBFBFD]'}>
                                                                <td className="px-6 py-4 font-medium text-[#1d1d1f] capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                                                                <td className={`px-6 py-4 font-bold ${key === 'overall' ? 'text-rose-500 text-lg' : 'text-gray-900'}`}>{val.band || '-'}</td>
                                                                <td className={`px-6 py-4 text-[#1d1d1f] leading-relaxed ${key === 'overall' ? 'font-medium' : 'opacity-80'}`}>{val.feedback || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WritingReview;
