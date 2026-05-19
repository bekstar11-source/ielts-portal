import React from 'react';
import { ChevronRight, Crown, Zap, BookOpen, FileText, Diamond } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReadingSetCard({ set, index, isCompleted, onReview, onSelectSet, isPro, isStandard }) {
  const navigate = useNavigate();
  const accentColors = ['bg-[#0a84ff]', 'bg-[#bf5af2]', 'bg-[#30d158]', 'bg-[#ff9f0a]'];
  const subCount = set.subTests?.length || 3;
  const glowColor = accentColors[index % accentColors.length];

  const canAccess = isPro || isStandard;
  const showGetAccess = !canAccess && !isCompleted;

  const handleClick = () => {
    if (isCompleted) {
      onReview(set);
    } else if (showGetAccess) {
      navigate('/pricing');
    } else {
      onSelectSet(set);
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-white min-h-[440px] flex flex-col cursor-default group transition-all duration-700 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_25px_50px_rgb(0,0,0,0.12)] border border-black/[0.03]"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5f5f7] to-white opacity-100 transition-opacity duration-700" />
      
      {/* Subtle Corner Glow */}
      <div className={`absolute -top-32 -right-32 w-96 h-96 ${glowColor} rounded-full blur-[100px] opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-700`} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-10">
        <div className="absolute top-6 right-6">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-black/5">
            <Crown size={12} className="text-[#bf953f]" />
            <span className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wide">Premium Set</span>
          </div>
        </div>
        
        <h3 className="text-[#1d1d1f] text-[32px] font-semibold leading-[1.15] tracking-tight mb-5 line-clamp-2">
          {set.title}
        </h3>
        
        {set.questionTypes?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {set.questionTypes.slice(0, 3).map((qt, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-md text-[10px] font-semibold text-[#1d1d1f] bg-black/5 backdrop-blur-md border border-black/5 tracking-wider capitalize">
                {qt}
              </span>
            ))}
          </div>
        )}
        
        {/* Sub-tests List */}
        {set.subTests?.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            {set.subTests.slice(0, 6).map((sub, sIdx) => (
              <div key={sIdx} className="flex items-center gap-3 group/item">
                <span className="text-[11px] font-bold text-[#86868b] min-w-[20px] tabular-nums">
                  {String(sIdx + 1).padStart(2, '0')}
                </span>
                <span className="text-[14px] font-medium text-[#1d1d1f]/80 truncate group-hover/item:text-[#1d1d1f] transition-colors">
                  {sub.title || 'Passage'}
                </span>
              </div>
            ))}
            {set.subTests.length > 6 && (
              <div className="text-[12px] font-medium text-[#86868b] mt-1 pl-[32px]">
                + yana {set.subTests.length - 6} ta passage
              </div>
            )}
          </div>
        )}
        
        <div className="mt-auto pt-4 border-t border-black/5">
          {showGetAccess ? (
            <button 
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
            >
              <Zap size={16} fill="currentColor" className="animate-pulse" /> Go Pro
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between opacity-60 mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1d1d1f]">
                    <BookOpen size={12} strokeWidth={2.5} />
                    {set.subTests?.length || 0} Passages
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1d1d1f]">
                    <FileText size={12} strokeWidth={2.5} />
                    {set.totalQuestions || (set.subTests?.length * 13) || 40} Questions
                  </div>
                </div>
                {isCompleted ? (
                  <span className="text-[#30d158] text-[15px] font-medium">
                    Score: {set.result?.score ?? set.result?.bestScore ?? set.result?.latestScore ?? 0}/{set.totalQuestions || 40}
                  </span>
                ) : (
                  <span className="text-[15px] font-medium text-[#86868b]">
                    Not started
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleClick(); }}
                  className="text-white text-[14px] font-bold px-6 py-2.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] transition-all duration-300 shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  View Set
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
