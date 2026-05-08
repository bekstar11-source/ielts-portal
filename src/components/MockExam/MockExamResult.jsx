import React from 'react';

const MockExamResult = ({ results, onDashboard, onResults }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans select-text">
            <div className="bg-white p-8 md:p-12 rounded-[32px] shadow-2xl text-center max-w-3xl w-full border border-gray-100 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                     <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-2 tracking-tight">Exam Completed!</h2>
                <p className="text-gray-500 mb-10 font-medium text-lg">Your responses have been submitted for evaluation.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                    <ScoreCard title="Listening" score={results?.listening.band} correct={results?.listening.correct} total={results?.listening.total} color="blue" />
                    <ScoreCard title="Reading" score={results?.reading.band} correct={results?.reading.correct} total={results?.reading.total} color="emerald" />
                    <div className="bg-purple-50/50 border border-purple-100/50 rounded-[28px] p-6 flex flex-col items-center gap-3">
                        <span className="text-purple-600 font-black uppercase tracking-widest text-[10px]">Writing</span>
                        <div className="animate-pulse flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                            <div className="w-2 h-2 rounded-full bg-purple-400 animation-delay-200"></div>
                            <div className="w-2 h-2 rounded-full bg-purple-400 animation-delay-400"></div>
                        </div>
                        <span className="text-[11px] text-purple-400 font-bold tracking-tight uppercase">Pending Grade</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={onDashboard} className="flex-1 bg-gray-900 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">Return to Dashboard</button>
                    <button onClick={onResults} className="flex-1 bg-white text-gray-900 border border-gray-200 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-gray-400 transition-all active:scale-95">View All Results</button>
                </div>
            </div>
        </div>
    );
};

const ScoreCard = ({ title, score, correct, total, color }) => (
    <div className={`bg-${color}-50/50 border border-${color}-100/50 rounded-[28px] p-6 flex flex-col items-center gap-3`}>
        <span className={`text-${color}-600 font-black uppercase tracking-widest text-[10px]`}>{title}</span>
        <div className="flex flex-col items-center">
            <span className={`text-5xl font-black text-${color}-900 leading-none mb-1`}>{score?.toFixed(1) || "0.0"}</span>
            <span className={`text-xs text-${color}-400 font-bold tracking-tight`}>BAND SCORE</span>
        </div>
        <div className={`mt-2 text-${color}-700/60 font-bold bg-${color}-100/40 py-1.5 px-4 rounded-full text-xs`}>{correct} / {total} correct</div>
    </div>
);

export default MockExamResult;
