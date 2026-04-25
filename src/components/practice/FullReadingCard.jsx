import React from 'react';
import { Play } from 'lucide-react';

export default function FullReadingCard({ test, index, isCompleted, onReview, onStart, onSelectSet }) {
  // Curated Apple-aesthetic reading images
  const defaultImages = [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=900',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=900',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=900',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=900',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900',
  ];
  
  const cardImage = test.thumbnail || defaultImages[index % defaultImages.length];
  const passages = test.title?.split('/').map(s => s.trim()) || [test.title];

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
    <div className="flex-shrink-0 w-[260px] md:w-[300px]">
      <div
        onClick={handleClick}
        className="relative w-full aspect-[3/5.5] rounded-[24px] overflow-hidden cursor-pointer group hover:scale-[1.005] hover:z-10 transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
      >
        {/* Full-bleed image */}
        <img
          src={cardImage}
          alt={test.title}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Top gradient — ensures text over bright images */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />

        {/* Bottom gradient — ensures status & button readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top text content */}
        <div className="absolute top-0 left-0 right-0 px-6 pt-7">
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
            Full Reading
          </p>
          <h2 className="text-white text-[20px] font-bold leading-[1.3] tracking-tight">
            {passages.length > 1
              ? passages.map((p, i) => (
                  <span key={i}>
                    {p}
                    {i < passages.length - 1 && (
                      <span className="text-white/35"> · </span>
                    )}
                  </span>
                ))
              : test.title
            }
          </h2>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-7 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            {/* Question type badges */}
            {test.questionTypes && test.questionTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {test.questionTypes.slice(0, 4).map((qType, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold text-white/80 bg-white/10 backdrop-blur-sm border border-white/15 uppercase tracking-wide"
                  >
                    {qType}
                  </span>
                ))}
              </div>
            )}
            {isCompleted ? (
              <span className="text-[#34c759] text-[13px] font-bold">
                Result: {test.result?.score}/{test.totalQuestions || 40}
              </span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80 ring-[3px] ring-white/20" />
                  <span className="text-white/80 text-[13px] font-semibold">Available Now</span>
                </div>
                <span className="text-white/40 text-[11px] font-medium">3 Passages · Full Test</span>
              </>
            )}
          </div>

          {/* Frosted glass Play button */}
          <div 
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="w-10 h-10 flex-shrink-0 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            <Play size={14} className="text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
