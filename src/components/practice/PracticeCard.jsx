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
import { getRequiredTier, tierAllowsTest } from '../../utils/subscription';

// Preload Set 1 thumbnail image for instant rendering across all cards
if (typeof window !== 'undefined') {
  const preloadImg = new Image();
  preloadImg.src = "https://firebasestorage.googleapis.com/v0/b/ielts-portal-v1.firebasestorage.app/o/thumbnails%2FGemini_Generated_Image_vx0h6mvx0h6mvx0h-squished.webp?alt=media&token=03a2fab5-c0db-46c9-af03-dd556fb08fde";
}

const PracticeCard = React.memo(function PracticeCard({ test, isCompleted, onReview, onStart, onSelectSet, passageNumber: passageNumberProp }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { userData } = useAuth();
  const hasGroupId = userData?.groupId && userData?.groupId !== 'none';
  const isAssignment = !!test.isAssignment;
  const attemptsCount = test.attemptsCount || 0;
  const maxAttempts = test.maxAttempts || 1;
  const disableRetake = hasGroupId && isAssignment && (attemptsCount >= maxAttempts);
  
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

  // Kerakli tarif — server bilan bir xil qoidadan (`utils/subscription`):
  // full/to'plam → Pro, part → kolleksiyaning admin belgilagan darajasi.
  const requiredTier = getRequiredTier(test, test.partNumber);

  const canAccess = (() => {
    if (userData?.isPremium) return true;
    if (isAssignment) return true;
    return tierAllowsTest(userData, test, test.partNumber);
  })();

  const handleClick = () => {
    if (isCompleted) {
      onReview(test);
    } else if (test.isSet) {
      onSelectSet(test);
    } else if (!canAccess) {
      navigate('/pricing');
    } else {
      onStart(test);
    }
  };

  const showGetAccess = !canAccess && !isCompleted && !test.isSet;

  const derivedQuestionTypes = deriveQuestionTypesForCard(test);

  const isWarmCard = test.type === 'reading' || test.type === 'listening';

  // Warm design-system themes for reading/listening thumbnails (ported from the imported dc.html mockup)
  const CARD_GRADIENT_THEMES = [
    { grad: 'from-warm-dark to-warm-dark-elevated', badge: 'bg-warm-canvas/15 text-warm-canvas', tag: 'bg-warm-canvas/10 text-warm-canvas' },
    { grad: 'from-warm-primary to-warm-primary-active', badge: 'bg-white/20 text-white', tag: 'bg-white/15 text-white' },
    { grad: 'from-warm-accent-amber to-warm-primary', badge: 'bg-warm-ink/25 text-white', tag: 'bg-warm-ink/15 text-white' },
    { grad: 'from-warm-accent-teal to-[#3d8a7a]', badge: 'bg-warm-ink/25 text-white', tag: 'bg-warm-ink/15 text-white' },
  ];

  const getCardTheme = (id, title) => {
    let hash = 0;
    const str = (id || '') + (title || '');
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CARD_GRADIENT_THEMES[Math.abs(hash) % CARD_GRADIENT_THEMES.length];
  };

  const cardTheme = isWarmCard ? getCardTheme(test.id || '', test.title) : null;

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
      className={`group w-full overflow-hidden transition-all duration-[400ms] hover:shadow-lg flex flex-col h-full cursor-pointer border ${
        isWarmCard
          ? 'bg-warm-canvas dark:bg-warm-dark-elevated rounded-xl border-warm-hairline dark:border-white/10'
          : 'bg-white dark:bg-zinc-950 rounded-[32px] border-[#dee3e9] dark:border-zinc-800/80'
      }`}
    >
      {/* Top Visual Section */}
      <div className={`relative aspect-[1.75/1] w-full overflow-hidden ${isWarmCard ? 'bg-warm-surface dark:bg-warm-dark' : 'bg-[#f1f4f7] dark:bg-zinc-900'}`}>
        {hasVisual ? (
          <img src={cardImage} alt={test.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <>
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${isWarmCard ? cardTheme.grad : getGradient(test.id || '', test.title)} opacity-90 transition-transform duration-700 group-hover:scale-105`} />

            {isWarmCard ? (
              /* Grain Noise Texture */
              <div
                className="absolute inset-0 opacity-[0.35] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
              />
            ) : (
              /* Decorative Grid Pattern */
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
            )}
          </>
        )}

        {/* Inner Content of Visual Section */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between text-white select-none">
          {/* Top Row with Badges */}
          <div className="flex justify-between items-start">
            <span className={`px-3 py-1 rounded-full backdrop-blur-md text-[11px] font-bold tracking-wide uppercase whitespace-nowrap shrink-0 ${isWarmCard ? cardTheme.badge : 'bg-[#0a1317]/55 text-white'}`}>
              {passageLabel}
            </span>
            <div className="flex gap-1.5 flex-wrap justify-end max-w-[60%]">
              {/* Yorliq kerakli tarifni ko'rsatadi. Muhimi: "standard" kolleksiya
                  ichidagi FULL test ham PRO deb belgilanadi — chunki uni faqat Pro
                  ishlaydi. Ilgari yorliq to'g'ridan-to'g'ri `collectionAccessTier`
                  dan olinardi va bunday kartada "STANDARD" deb yozilib qolardi. */}
              {requiredTier === 'pro' ? (
                <span className="px-2.5 py-1 rounded-full bg-[#f7b928] text-[#0a1317] text-[11px] font-bold tracking-wide flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm">
                  <Crown size={9} fill="currentColor" /> PRO
                </span>
              ) : requiredTier === 'standard' ? (
                <span className="px-2.5 py-1 rounded-full bg-[#0064e0] text-white text-[11px] font-bold tracking-wide flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm">
                  <Zap size={9} fill="currentColor" /> STANDARD
                </span>
              ) : (test.isFree || test.collectionAccessTier === 'free') ? (
                <span className="px-2.5 py-1 rounded-full bg-[#31a24c] text-white text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0 shadow-sm">
                  FREE
                </span>
              ) : null}
              {isCompleted && (
                <span className="px-2.5 py-1 rounded-full bg-[#31a24c] text-white text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0 shadow-sm">
                  {t('practice.statusCompleted')}
                </span>
              )}
            </div>
          </div>
          

          
          <QuestionTypeTags
            types={derivedQuestionTypes}
            {...(isWarmCard ? {
              tagClassName: `px-3 py-1 rounded-full ${cardTheme.tag} backdrop-blur-md text-[10px] font-bold tracking-wide uppercase shadow-sm`,
              moreButtonClassName: `px-3 py-1 rounded-full ${cardTheme.tag} backdrop-blur-md text-[10px] font-bold tracking-wide uppercase shadow-sm opacity-90 hover:opacity-100 transition-opacity`,
            } : {})}
          />
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
      <div className={`p-[18px] flex-1 flex flex-col gap-2 ${isWarmCard ? 'bg-warm-canvas dark:bg-warm-dark-elevated' : 'bg-white dark:bg-zinc-950'}`}>
        <h4 className={`text-[20px] font-medium leading-[1.3] transition-colors line-clamp-1 ${
          isWarmCard
            ? 'text-warm-ink dark:text-warm-on-dark group-hover:text-warm-primary'
            : 'text-[#0a1317] dark:text-zinc-100 group-hover:text-[#0066cc] dark:group-hover:text-[#3894ff]'
        }`}>
          {test.title}
        </h4>
        <div className={`text-[14px] leading-[1.43] tracking-[-0.14px] flex items-center flex-wrap gap-1.5 ${isWarmCard ? 'text-warm-muted dark:text-warm-on-dark-soft' : 'text-[#5d6c7b] dark:text-zinc-400'}`}>
          <span className="flex items-center gap-1">
            <FileText size={14} className={isWarmCard ? 'text-warm-muted dark:text-warm-on-dark-soft' : 'text-[#5d6c7b] dark:text-zinc-400'} />
            {t('practice.questionsCount').replace('{count}', questionCount)}
          </span>
          {test.collectionName && (
            <span className={`px-2 py-0.5 rounded-[6px] font-bold text-[12px] ${isWarmCard ? 'bg-warm-surface dark:bg-white/5 text-warm-muted dark:text-warm-on-dark-soft' : 'bg-[#f1f4f7] dark:bg-zinc-900 text-[#5d6c7b] dark:text-zinc-400'}`}>
              {test.collectionName}
            </span>
          )}
          {isCompleted && (
            <>
              <span className="select-none">•</span>
              <span className={`font-bold ${isWarmCard ? 'text-warm-success' : 'text-[#31a24c]'}`}>
                {t('practice.result')}: {test.result.score}/{test.result.totalQuestions || test.totalQuestions || 40}
              </span>
              <span className="select-none">•</span>
              <button
                onClick={(e) => { e.stopPropagation(); onReview(test); }}
                className={isWarmCard ? 'text-warm-primary hover:underline' : 'text-[#385898] dark:text-[#3894ff] hover:underline'}
              >
                {t('practice.review')}
              </button>
              {!disableRetake && (
                <>
                  <span className="select-none">•</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStart(test); }}
                    className={isWarmCard ? 'text-warm-primary hover:underline' : 'text-[#385898] dark:text-[#3894ff] hover:underline'}
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
