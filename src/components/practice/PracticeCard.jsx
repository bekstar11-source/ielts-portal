import React from 'react';
import { Crown, Zap, FileText, Clock, BookOpen, Diamond } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { hapticFeedback } from '../../utils/haptic';

export default function PracticeCard({ test, isCompleted, onReview, onStart, onSelectSet, isPro, isStandard }) {
  const navigate = useNavigate();
  const isPremium = test.isMock || test.status === 'locked' || (test.type === 'mock_full') || test.type === 'reading' || test.type === 'listening';
  
  const isListeningPart = test.type === 'listening' && (test.title?.toLowerCase().includes('part') || test.partNumber || !test.title?.toLowerCase().includes('full'));
  const isListeningFull = test.type === 'listening' && test.title?.toLowerCase().includes('full');
  const isReadingPassage = test.type === 'reading' && (test.title?.toLowerCase().includes('passage') || !test.title?.toLowerCase().includes('full'));
  const isReadingFull = test.type === 'reading' && test.title?.toLowerCase().includes('full');

  // Prioritize totalQuestions from test object (calculated in useStudentData hook)
  const questionCount = test.totalQuestions || 
    (test.questions?.length) || 
    (test.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0)) ||
    (isListeningFull || isReadingFull ? 40 : 
     isListeningPart ? 10 : 
     isReadingPassage ? 13 : 13);

  const duration = test.duration || 
    (test.type === 'reading' ? (isReadingFull ? 60 : 20) : 
     test.type === 'listening' ? (isListeningFull ? 40 : 10) : 
     test.type === 'writing' ? 60 : 60);

  const cardImage = test.thumbnail || (
    test.type === 'reading' ? '/images/dashboard/reading_passage_yellow_card.png' :
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

  const canAccess = isPro || (isStandard && (test.type === 'reading' || test.type === 'listening' || test.type === 'podcasts'));

  const handleClick = () => {
    if (isCompleted) {
      onReview(test);
    } else if (test.isSet) {
      onSelectSet(test);
    } else if (!canAccess && isPremium) {
      navigate('/pricing');
    } else {
      onStart(test);
    }
  };

  const showGetAccess = !canAccess && isPremium && !isCompleted && !test.isSet;

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        hapticFeedback('light');
        handleClick();
      }}
      className="group w-full bg-[#F6F6FA] rounded-xl overflow-hidden transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:shadow-lg hover:border-black/10 flex flex-col h-full cursor-pointer shadow-sm border border-black/5"
    >
      <div className="w-full aspect-[4/3] bg-[#f5f5f7] relative overflow-hidden">
        <img src={cardImage} alt={test.title} className="w-full h-full object-cover transition-transform duration-700" />
        {isPremium && (
          <div className="absolute top-4 left-4">
            <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-black/5">
              {test.type === 'reading' || test.type === 'listening' ? (
                <Zap size={10} className="text-blue-500" />
              ) : (
                <Crown size={10} className="text-[#bf953f]" />
              )}
              <span className="text-[9px] font-bold text-[#1d1d1f] uppercase tracking-wide">
                {test.type === 'reading' || test.type === 'listening' ? 'Standard' : 'Premium'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-4 opacity-50">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wider">
            <BookOpen size={11} strokeWidth={2.5} />
            {passageLabel}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wider">
            <FileText size={11} strokeWidth={2.5} />
            {questionCount} savol
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wider">
            <Clock size={11} strokeWidth={2.5} />
            {duration} min
          </div>
        </div>

        <h2 className="text-[20px] font-extrabold text-[#1d1d1f] leading-[1.2] tracking-tight mb-4 line-clamp-2">{test.title}</h2>

        {test.questionTypes && test.questionTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {test.questionTypes.slice(0, 4).map((qType, idx) => (
              <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-[10.5px] font-bold text-[#424245] bg-white/50 border border-black/[0.04] tracking-wide capitalize">
                {qType}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-black/[0.04]">
          {showGetAccess ? (
            <button 
              onClick={(e) => { e.stopPropagation(); hapticFeedback('medium'); handleClick(); }}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
            >
              <Zap size={16} fill="currentColor" className="animate-pulse" /> Go Pro
            </button>
          ) : (
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <span className="text-[14px] font-bold text-[#34c759]">Result: {test.result.score}/{test.result.totalQuestions || test.totalQuestions || 40}</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0066cc]" />
                      <span className="text-[13px] font-bold text-[#0066cc]">Available</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isCompleted && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); hapticFeedback('light'); onReview(test); }}
                    className="text-[#0071e3] bg-blue-50 text-[14px] font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition-all duration-300 shadow-sm active:scale-95 flex items-center justify-center gap-2"
                  >
                    Review
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); hapticFeedback('light'); isCompleted ? onStart(test) : handleClick(); }}
                  className="text-white text-[14px] font-bold px-6 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] transition-all duration-300 shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  {isCompleted ? 'Retake' : 'Start'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
