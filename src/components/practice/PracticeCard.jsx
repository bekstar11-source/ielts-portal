import React from 'react';
import { Crown } from 'lucide-react';

export default function PracticeCard({ test, isCompleted, onReview, onStart, onSelectSet }) {
  const isPremium = test.isMock || test.status === 'locked' || (test.type === 'mock_full');
  
  const cardImage = test.thumbnail || (
    test.type === 'reading' ? 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1000' :
    test.type === 'listening' ? 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800' :
    test.type === 'writing' ? 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800' :
    test.type === 'speaking' ? 'https://images.unsplash.com/photo-1506784926709-22f1ec395907?q=80&w=800' :
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800'
  );

  const passageLabel = test.type === 'reading' 
    ? (test.title.match(/Passage\s*(\d+)/i)?.[0] || (test.difficulty === 'easy' ? 'Passage 1' : test.difficulty === 'medium' ? 'Passage 2' : test.difficulty === 'hard' ? 'Passage 3' : 'Reading Passage'))
    : test.type === 'listening'
    ? (test.title.match(/Part\s*(\d+)|Section\s*(\d+)/i)?.[0] || (test.difficulty?.includes('1') ? 'Section 1' : test.difficulty?.includes('2') ? 'Section 2' : test.difficulty?.includes('3') ? 'Section 3' : test.difficulty?.includes('4') ? 'Section 4' : 'Listening Section'))
    : (test.type === 'mock_full' ? 'Full Mock' : 'IELTS Test');

  const handleClick = () => {
    if (isCompleted) {
      onReview(test);
    } else if (test.isSet) {
      onSelectSet(test);
    } else {
      onStart(test);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="group w-full bg-[#F6F6FA] rounded-[24px] overflow-hidden transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.008] hover:z-10 flex flex-col h-full cursor-pointer"
    >
      <div className="w-full aspect-[16/9] bg-[#f5f5f7] relative overflow-hidden">
        <img src={cardImage} alt={test.title} className="w-full h-full object-cover transition-transform duration-700" />
        {isPremium && (
          <div className="absolute top-5 left-5">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-black/5">
              <Crown size={12} className="text-[#bf953f]" />
              <span className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wide">Premium</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-7 flex flex-col flex-1">
        <h4 className="text-[11px] font-extrabold text-[#86868b] uppercase tracking-[0.12em] mb-2.5">{test.type}</h4>
        <h2 className="text-[26px] font-extrabold text-[#1d1d1f] leading-[1.1] tracking-tight mb-5 line-clamp-2">{test.title}</h2>

        {test.questionTypes && test.questionTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {test.questionTypes.slice(0, 4).map((qType, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold text-[#424245] bg-white/50 border border-black/[0.04] uppercase tracking-wide">
                {qType}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-medium text-[#86868b]">{passageLabel}</span>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="text-[15px] font-bold text-[#34c759]">Result: {test.result.score}/{test.totalQuestions || 40}</span>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#0066cc] ring-4 ring-[#0066cc]/10" />
                  <span className="text-[15px] font-bold text-[#0066cc]">Available Now</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062cc] text-white text-[15px] font-bold px-7 py-2.5 rounded-full transition-all duration-200"
          >
            {isCompleted ? 'Review' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  );
}
