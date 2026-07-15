import React, { useState } from 'react';
import { Crown, Zap, FileText, Clock, BookOpen, Diamond, Share2, Headphones, PenTool, Mic, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { hapticFeedback } from '../../utils/haptic';
import ShareModal from '../common/ShareModal';
import { useTranslation } from '../../context/LanguageContext';
import { deriveQuestionTypesForCard, getActualQuestionCount, getPassageNum } from '../../utils/TestUtils';
import QuestionTypeTags from './QuestionTypeTags';
import { useAuth } from '../../context/AuthContext';

// Preload Set 1 thumbnail image for instant rendering across all cards
if (typeof window !== 'undefined') {
  const preloadImg = new Image();
  preloadImg.src = "https://firebasestorage.googleapis.com/v0/b/ielts-portal-v1.firebasestorage.app/o/thumbnails%2FGemini_Generated_Image_vx0h6mvx0h6mvx0h-squished.webp?alt=media&token=03a2fab5-c0db-46c9-af03-dd556fb08fde";
}

const PracticeCard = React.memo(function PracticeCard({ test, isCompleted, onReview, onStart, onSelectSet, isPro, isStandard, passageNumber: passageNumberProp }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { userData } = useAuth();
  const hasGroupId = userData?.groupId && userData?.groupId !== 'none';
  const isAssignment = !!test.isAssignment;
  const attemptsCount = test.attemptsCount || 0;
  const maxAttempts = test.maxAttempts || 1;
  const disableRetake = hasGroupId && isAssignment && (attemptsCount >= maxAttempts);
  
  const isPremium = (() => {
    if (test.collectionAccessTier === 'free') return false;
    if (test.collectionAccessTier === 'standard' || test.collectionAccessTier === 'pro') return true;
    return (test.isMock || test.status === 'locked' || (test.type === 'mock_full') || test.type === 'reading' || test.type === 'listening') && !test.isFree;
  })();
  
  const isListeningPart = test.type === 'listening' && (test.title?.toLowerCase().includes('part') || test.partNumber || !test.title?.toLowerCase().includes('full'));
  const isListeningFull = test.type === 'listening' && test.title?.toLowerCase().includes('full');
  const isReadingPassage = test.type === 'reading' && (test.title?.toLowerCase().includes('passage') || !test.title?.toLowerCase().includes('full'));
  const isReadingFull = test.type === 'reading' && test.title?.toLowerCase().includes('full');

  const questionCount = getActualQuestionCount(test);

  const duration = test.duration || 
    (test.type === 'reading' ? (isReadingFull ? 60 : 20) : 
     test.type === 'listening' ? (isListeningFull ? 40 : 10) : 
     test.type === 'writing' ? 60 : 60);

  const isSet1Listening = test.type === 'listening' && (
    (test.collectionName && String(test.collectionName).toLowerCase().trim() === 'set 1') ||
    (test.collectionId && String(test.collectionId).toLowerCase().trim() === 'set 1')
  );

  const cardImage = isSet1Listening
    ? "https://firebasestorage.googleapis.com/v0/b/ielts-portal-v1.firebasestorage.app/o/thumbnails%2FGemini_Generated_Image_vx0h6mvx0h6mvx0h-squished.webp?alt=media&token=03a2fab5-c0db-46c9-af03-dd556fb08fde"
    : (test.thumbnail || (
        test.type === 'listening'
          ? '/images/dashboard/listening_orange_headphones.jpg'
          : test.type === 'reading'
          ? '/images/dashboard/reading_passage_yellow_card.png'
          : test.type === 'writing'
          ? 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'
          : test.type === 'speaking'
          ? 'https://images.unsplash.com/photo-1506784926709-22f1ec395907?q=80&w=800'
          : 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800'
      ));

  const hasVisual = isSet1Listening || (
                    typeof test.thumbnail === 'string' && 
                    test.thumbnail.trim() !== '' && 
                    !test.thumbnail.includes('reading_passage_yellow') && 
                    !test.thumbnail.includes('listening_orange_headphones'));

  const pNum = getPassageNum(test, passageNumberProp);

  const passageLabel = test.type === 'reading' 
    ? (pNum ? `Passage ${pNum}` : 'Reading Passage')
    : test.type === 'listening'
    ? (test.title.match(/Part\s*(\d+)|Section\s*(\d+)/i)?.[0] || (test.difficulty?.includes('1') ? 'Section 1' : test.difficulty?.includes('2') ? 'Section 2' : test.difficulty?.includes('3') ? 'Section 3' : test.difficulty?.includes('4') ? 'Section 4' : 'Listening Section'))
    : (test.type === 'mock_full' ? 'Full Mock' : 'IELTS Test');

  const canAccess = (() => {
    if (test.collectionAccessTier === 'free') return true;
    if (test.collectionAccessTier === 'standard') return isStandard || isPro;
    if (test.collectionAccessTier === 'pro') return isPro;
    return isPro || (isStandard && (test.type === 'reading' || test.type === 'listening' || test.type === 'podcasts'));
  })();

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

  const derivedQuestionTypes = deriveQuestionTypesForCard(test);

  const getGradient = (id, title) => {
    let hash = 0;
    const str = (id || '') + (title || '');
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 5;
    const gradients = [
      'from-[#6366f1] via-[#8b5cf6] to-[#ec4899]', // Indigo to Pink
      'from-[#3b82f6] to-[#8b5cf6]',               // Blue to Purple
      'from-[#ec4899] to-[#f43f5e]',               // Pink to Rose
      'from-[#f59e0b] to-[#ef4444]',               // Amber to Red
      'from-[#10b981] to-[#3b82f6]',               // Emerald to Blue
    ];
    return gradients[index];
  };

  const getBadgeStyles = () => {
    switch (test.type) {
      case 'reading':
        return 'bg-blue-500/10 text-[#0066cc] dark:text-[#3894ff] border-blue-500/20';
      case 'listening':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'writing':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'speaking':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
    }
  };

  const getSkillIcon = () => {
    switch (test.type) {
      case 'reading':
        return <BookOpen size={16} strokeWidth={2.5} />;
      case 'listening':
        return <Headphones size={16} strokeWidth={2.5} />;
      case 'writing':
        return <PenTool size={16} strokeWidth={2.5} />;
      case 'speaking':
        return <Mic size={16} strokeWidth={2.5} />;
      default:
        return <FileText size={16} strokeWidth={2.5} />;
    }
  };


  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        hapticFeedback('light');
        handleClick();
      }}
      className="group w-full bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden transition-all duration-[400ms] hover:shadow-lg flex flex-col h-full cursor-pointer border border-[#dee3e9] dark:border-zinc-800/80"
    >
      {/* Top Visual Section */}
      <div className="relative aspect-[1.75/1] w-full overflow-hidden bg-[#f1f4f7] dark:bg-zinc-900">
        {hasVisual ? (
          <img src={cardImage} alt={test.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <>
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(test.id || '', test.title)} opacity-90 transition-transform duration-700 group-hover:scale-105`} />
            
            {/* Decorative Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
          </>
        )}
        
        {/* Inner Content of Visual Section */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between text-white select-none">
          {/* Top Row with Badges */}
          <div className="flex justify-between items-start">
            <span className="px-3 py-1 rounded-full bg-[#0a1317]/55 backdrop-blur-md text-white text-[11px] font-bold tracking-wide uppercase whitespace-nowrap shrink-0">
              {passageLabel}
            </span>
            <div className="flex gap-1.5 flex-wrap justify-end max-w-[60%]">
              {test.collectionAccessTier === 'free' || (test.isFree && !test.collectionAccessTier) ? (
                <span className="px-2.5 py-1 rounded-full bg-[#31a24c] text-white text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0 shadow-sm">
                  FREE
                </span>
              ) : test.collectionAccessTier === 'standard' ? (
                <span className="px-2.5 py-1 rounded-full bg-[#0064e0] text-white text-[11px] font-bold tracking-wide flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm">
                  <Zap size={9} fill="currentColor" /> STANDARD
                </span>
              ) : test.collectionAccessTier === 'pro' || (isPremium && !test.collectionAccessTier) ? (
                <span className="px-2.5 py-1 rounded-full bg-[#f7b928] text-[#0a1317] text-[11px] font-bold tracking-wide flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm">
                  <Crown size={9} fill="currentColor" /> PRO
                </span>
              ) : null}
              {isCompleted && (
                <span className="px-2.5 py-1 rounded-full bg-[#31a24c] text-white text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0 shadow-sm">
                  {t('practice.statusCompleted')}
                </span>
              )}
            </div>
          </div>
          

          
          <QuestionTypeTags types={derivedQuestionTypes} />
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2.5">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              hapticFeedback('light'); 
              setIsShareOpen(true); 
            }}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 active:scale-95 transition-all flex items-center justify-center"
            title="Share"
          >
            <Share2 size={15} />
          </button>
          
          {showGetAccess ? (
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/pricing'); }}
              className="px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[12.5px] flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Zap size={12} fill="currentColor" /> Go Pro
            </button>
          ) : (
            <div className="flex gap-2.5">
              {isCompleted && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReview(test); }}
                  className="px-6 py-3 rounded-full bg-white/90 hover:bg-white text-[#1c1e21] font-bold text-[13px] active:scale-95 transition-all"
                >
                  {t('practice.review')}
                </button>
              )}
              {(!isCompleted || !disableRetake) && (
                <button
                  onClick={(e) => { e.stopPropagation(); isCompleted ? onStart(test) : handleClick(); }}
                  className="px-7 py-3.5 rounded-full bg-[#0a1317] text-white hover:bg-black font-bold text-[13px] shadow-md active:scale-95 transition-all flex items-center gap-1"
                >
                  {isCompleted ? t('practice.retake') : t('practice.start')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info Section */}
      <div className="p-[18px] bg-white dark:bg-zinc-950 flex-1 flex flex-col gap-2">
        <h4 className="text-[20px] font-medium leading-[1.3] text-[#0a1317] dark:text-zinc-100 group-hover:text-[#0066cc] dark:group-hover:text-[#3894ff] transition-colors line-clamp-1">
          {test.title}
        </h4>
        <div className="text-[14px] leading-[1.43] tracking-[-0.14px] text-[#5d6c7b] dark:text-zinc-400 flex items-center flex-wrap gap-1.5">
          <span className="flex items-center gap-1">
            <FileText size={14} className="text-[#5d6c7b] dark:text-zinc-400" />
            {t('practice.questionsCount').replace('{count}', questionCount)}
          </span>
          {test.collectionName && (
            <span className="px-2 py-0.5 rounded-[6px] bg-[#f1f4f7] dark:bg-zinc-900 text-[#5d6c7b] dark:text-zinc-400 font-bold text-[12px]">
              {test.collectionName}
            </span>
          )}
          {isCompleted && (
            <>
              <span className="select-none">•</span>
              <span className="text-[#31a24c] font-bold">
                {t('practice.result')}: {test.result.score}/{test.result.totalQuestions || test.totalQuestions || 40}
              </span>
              <span className="select-none">•</span>
              <button
                onClick={(e) => { e.stopPropagation(); onReview(test); }}
                className="text-[#385898] dark:text-[#3894ff] hover:underline"
              >
                {t('practice.review')}
              </button>
              {!disableRetake && (
                <>
                  <span className="select-none">•</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStart(test); }}
                    className="text-[#385898] dark:text-[#3894ff] hover:underline"
                  >
                    {t('practice.retake')}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        testId={test.id || test.testId}
        testTitle={test.title}
        testType={test.type}
        score={isCompleted ? (test.result?.score ?? test.result?.bestScore ?? test.result?.latestScore ?? 0) : null}
        bandScore={isCompleted ? (test.result?.bandScore ?? test.result?.bestBandScore ?? test.result?.latestBandScore) : null}
      />
    </motion.div>
  );
});

export default PracticeCard;
