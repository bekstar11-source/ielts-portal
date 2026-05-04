import React from 'react';
import { Play, ArrowRight, Crown, Zap, BookOpen, FileText, Clock, Diamond } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FullReadingCard({ test, isCompleted, onReview, onStart, isPro, isStandard }) {
  const navigate = useNavigate();
  const passages = test.title?.split('/').map(s => s.trim()) || [test.title];

  const canAccess = isPro || isStandard;

  const handleClick = () => {
    if (isCompleted) {
      onReview(test);
    } else if (!canAccess) {
      navigate('/pricing');
    } else {
      onStart(test);
    }
  };

  const showGetAccess = !canAccess && !isCompleted;

  return (
    <div className="flex-shrink-0 w-[320px] md:w-[480px]">
      <div
        onClick={handleClick}
        className={`relative w-full aspect-[1.2/1] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] shadow-lg hover:shadow-2xl hover:-translate-y-1 ${showGetAccess ? 'bg-gradient-to-br from-[#0071e3] to-[#00a2ff]' : 'bg-gradient-to-br from-[#0071e3] via-[#0071e3] to-[#00a2ff]'}`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        
        <div className="relative h-full p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase">
                Full Test
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white text-[#0071e3] text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                <Crown size={10} className="text-[#bf953f]" /> Premium
              </span>
              {isCompleted && (
                <span className="px-2.5 py-1 rounded-full bg-[#34c759]/20 backdrop-blur-md text-[#34c759] text-[10px] font-bold tracking-wider uppercase border border-[#34c759]/30">
                  Completed
                </span>
              )}
            </div>

            <h2 className="text-white text-[24px] md:text-[28px] font-bold leading-tight tracking-tight max-w-[80%]">
              {passages.length > 1
                ? passages.map((p, i) => (
                    <span key={i}>
                      {p}
                      {i < passages.length - 1 && (
                        <span className="opacity-40 font-light"> / </span>
                      )}
                    </span>
                  ))
                : test.title
              }
            </h2>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-white/70 text-[12px] font-bold">
                <BookOpen size={14} strokeWidth={2.5} />
                3 Passages
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-[12px] font-bold">
                <FileText size={14} strokeWidth={2.5} />
                40 Questions
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-[12px] font-bold">
                <Clock size={14} strokeWidth={2.5} />
                60 Mins
              </div>
              {isCompleted && (
                <div className="w-full pt-2">
                  <p className="text-white text-[18px] font-bold">
                    Score: {test.result?.score}/40
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {showGetAccess ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/pricing'); }}
                    className="bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white px-12 py-2 rounded-lg font-bold text-[15px] flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/25"
                  >
                    <Zap size={16} fill="currentColor" className="animate-pulse" />
                    Go Pro
                  </button>
              ) : (
                <span className="text-white text-[14px] font-bold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1.5">
                  {isCompleted ? 'Review' : 'Start Now'}
                </span>
              )}
              <div className="w-12 h-12 rounded-full bg-white text-[#0071e3] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                {isCompleted ? <ArrowRight size={20} /> : <Play size={20} className="fill-current ml-1" />}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </div>
  );
}
