import React from 'react';
import { ChevronRight } from 'lucide-react';
import { calculateOverallBand } from '../../utils/ieltsScoring';

const MockExamResult = ({ results, onDashboard, onResults }) => {
    // Calculate overall band (average of available scores)
    const listeningBand = results?.listening?.band || 0;
    const readingBand = results?.reading?.band || 0;
    const writingBand = results?.writing?.band || 0; // Usually pending, but use 0 if not set

    // IELTS yaxlitlash qoidasi (.25 → .5, .75 → keyingi butun). Ilgari oddiy o'rtacha
    // olinardi va L=6.5 / R=7.0 uchun "6.8" chiqardi — bunday band IELTS'da yo'q.
    // Server ham aynan shu funksiyani ishlatadi, shuning uchun endi natija ekrani
    // va "My Results" bir xil qiymat ko'rsatadi.
    const overallBand = (results?.overallBand ?? calculateOverallBand([listeningBand, readingBand])).toFixed(1);

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] select-text">
            <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Exam Completed!</h2>
                    <p className="text-zinc-500 text-[15px] font-medium leading-relaxed">
                        Your responses have been submitted for evaluation.
                        <br />
                        <span className="text-zinc-400 text-sm font-normal relative inline-block">
                            Note: Your overall score will be updated after the Writing section is graded.
                            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-red-500/30"></span>
                        </span>
                    </p>
                </div>

                <div className="space-y-3 mb-10">
                    <ResultRow 
                        title="Listening" 
                        score={listeningBand.toFixed(1)} 
                        rawScore={`${results?.listening?.correct || 0} / ${results?.listening?.total || 40}`} 
                    />
                    <ResultRow 
                        title="Reading" 
                        score={readingBand.toFixed(1)} 
                        rawScore={`${results?.reading?.correct || 0} / ${results?.reading?.total || 40}`} 
                    />
                    <ResultRow 
                        title="Writing" 
                        score={writingBand > 0 ? writingBand.toFixed(1) : "—"} 
                        rawScore={writingBand > 0 ? "" : "Pending Grade"}
                        isPending={writingBand === 0}
                    />
                    <ResultRow 
                        title="Overall" 
                        score={overallBand} 
                        rawScore="Average Score"
                        isOverall={true}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                        onClick={onDashboard} 
                        className="w-full bg-zinc-900 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/10"
                    >
                        Return to Dashboard
                    </button>
                    <button 
                        onClick={onResults} 
                        className="w-full bg-white text-zinc-900 border border-zinc-200 px-6 py-4 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all active:scale-[0.98]"
                    >
                        View All Results
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultRow = ({ title, score, rawScore, isPending, isOverall }) => (
    <div className="bg-white p-5 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-zinc-100 flex items-center justify-between group hover:border-zinc-200 transition-colors">
        <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-900 tracking-[0.01em]">{title}</h3>
            <span className="text-3xl font-black text-[#e31b23] block leading-none tracking-[-0.05em]">
                {score}
            </span>
        </div>
        
        <div className="flex items-center gap-6">
            <span className={`text-[13px] font-semibold ${isPending ? 'text-amber-500' : 'text-zinc-400'}`}>
                {rawScore}
            </span>
            <ChevronRight className="text-zinc-300 group-hover:text-zinc-500 transition-colors" size={20} />
        </div>
    </div>
);

export default MockExamResult;
