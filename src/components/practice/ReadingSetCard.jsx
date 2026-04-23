import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ReadingSetCard({ set, index, isCompleted, onReview, onSelectSet }) {
  const accentColors = ['bg-[#0a84ff]', 'bg-[#bf5af2]', 'bg-[#30d158]', 'bg-[#ff9f0a]'];
  const subCount = set.subTests?.length || 3;
  const glowColor = accentColors[index % accentColors.length];

  return (
    <div
      onClick={() => isCompleted ? onReview(set) : onSelectSet(set)}
      className="relative rounded-[32px] overflow-hidden bg-white min-h-[440px] flex flex-col cursor-pointer group hover:scale-[1.015] transition-transform duration-700 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-black/[0.03]"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5f5f7] to-white opacity-100 transition-opacity duration-700" />
      
      {/* Subtle Corner Glow */}
      <div className={`absolute -top-32 -right-32 w-96 h-96 ${glowColor} rounded-full blur-[100px] opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-700`} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-10">
        <p className="text-[#86868b] text-[11px] font-semibold uppercase tracking-[0.2em] mb-4">
          Reading Set &middot; {subCount} passage
        </p>
        
        <h3 className="text-[#1d1d1f] text-[32px] font-semibold leading-[1.15] tracking-tight mb-5 line-clamp-2">
          {set.title}
        </h3>
        
        {set.questionTypes?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {set.questionTypes.slice(0, 3).map((qt, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-full text-[10px] font-semibold text-[#1d1d1f] bg-black/5 backdrop-blur-md border border-black/5 uppercase tracking-wider">
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
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5">
          {isCompleted ? (
            <span className="text-[#30d158] text-[15px] font-medium">
              Score: {set.result?.score}/{set.totalQuestions || 40}
            </span>
          ) : (
            <span className="text-[#86868b] text-[15px] font-medium">
              Not started
            </span>
          )}
          
          <span className={`${isCompleted ? 'text-[#30d158]' : 'text-[#0a84ff]'} text-[15px] font-medium flex items-center gap-1.5 group-hover:gap-2.5 transition-all`}>
            {isCompleted ? 'Review' : 'Start Set'} <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </div>
  );
}
