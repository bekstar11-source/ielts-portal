import React from 'react';
import { Volume2 } from 'lucide-react';

const SpeakingReview = ({ 
    testData, currentAnswers, resultData, isPremium,
    isAdminOrTeacher, adminScore, setAdminScore,
    adminFeedback, setAdminFeedback, onSaveGrade, isSaving
}) => {
    // CurrentAnswers for speaking is usually the audio URL
    const audioUrl = typeof currentAnswers === 'string' ? currentAnswers : currentAnswers?.audio || currentAnswers?.url;

    return (
        <div className="w-full h-full flex flex-col bg-[#F5F5F7] p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-2xl mx-auto w-full space-y-8 pb-20">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 text-indigo-600">
                        <Volume2 size={32} />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">Speaking Test Review</h2>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">Student Recording</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center gap-6">
                    {audioUrl ? (
                        <div className="w-full space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Playback Control</p>
                            <audio controls src={audioUrl} className="w-full" />
                        </div>
                    ) : (
                        <div className="py-12 text-center opacity-30 italic">No recording found</div>
                    )}
                </div>

                {/* TEACHER GRADING PANEL */}
                {isAdminOrTeacher ? (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                <span className="text-indigo-600 text-sm">🎙️</span>
                            </div>
                            <h3 className="font-bold text-[#1d1d1f] text-sm uppercase tracking-widest">Baholash va Sharh</h3>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Speaking Band Score</label>
                            <select
                                value={adminScore || ""}
                                onChange={(e) => setAdminScore(e.target.value)}
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-[#F5F5F7] text-sm font-semibold text-gray-800 outline-none focus:border-indigo-500 transition cursor-pointer"
                            >
                                <option value="">-- Band Tanlang --</option>
                                {['0.0','1.0','2.0','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-gray-405 uppercase tracking-wider">Ustoz Mulohazalari (Feedback)</label>
                            <textarea
                                rows={4}
                                value={adminFeedback || ""}
                                onChange={(e) => setAdminFeedback(e.target.value)}
                                placeholder="O'quvchining nutqi bo'yicha talaffuz, ravonlik va grammatika bo'yicha tavsiyalaringizni yozing..."
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-[#F5F5F7] text-sm outline-none resize-none transition focus:border-indigo-500 text-gray-800"
                            />
                        </div>

                        <button
                            onClick={onSaveGrade}
                            disabled={isSaving}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 transition active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSaving ? "Saqlanmoqda..." : "Baholashni Saqlash"}
                        </button>
                    </div>
                ) : (
                    resultData.feedback && (
                        <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-70">Teacher Feedback</h3>
                            <p className="text-lg font-medium leading-relaxed">{resultData.feedback}</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default SpeakingReview;
