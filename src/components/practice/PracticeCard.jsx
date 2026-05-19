import React, { useState } from 'react';
import { Crown, Zap, FileText, Clock, BookOpen, Diamond, Share2, Headphones, PenTool, Mic, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { hapticFeedback } from '../../utils/haptic';
import ShareModal from '../common/ShareModal';

export default function PracticeCard({ test, isCompleted, onReview, onStart, onSelectSet, isPro, isStandard }) {
  const navigate = useNavigate();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isPremium = test.isMock || test.status === 'locked' || (test.type === 'mock_full') || test.type === 'reading' || test.type === 'listening';
  
  const isListeningPart = test.type === 'listening' && (test.title?.toLowerCase().includes('part') || test.partNumber || !test.title?.toLowerCase().includes('full'));
  const isListeningFull = test.type === 'listening' && test.title?.toLowerCase().includes('full');
  const isReadingPassage = test.type === 'reading' && (test.title?.toLowerCase().includes('passage') || !test.title?.toLowerCase().includes('full'));
  const isReadingFull = test.type === 'reading' && test.title?.toLowerCase().includes('full');

  // Prioritize totalQuestions from test object (calculated in useStudentData hook)
  const questionCount = test.totalQuestions || (() => {
    const countUniqueIds = (items) => {
      if (!items || !Array.isArray(items)) return 0;
      const ids = new Set();
      const extract = (obj) => {
        if (!obj) return;
        // Check if it's an individual question item
        if (obj.id && !isNaN(parseInt(obj.id))) {
          ids.add(parseInt(obj.id));
        }
        // Recurse into common nested structures
        if (Array.isArray(obj.items)) obj.items.forEach(extract);
        if (Array.isArray(obj.questions)) obj.questions.forEach(extract);
        if (Array.isArray(obj.groups)) obj.groups.forEach(extract);
      };
      items.forEach(extract);
      return ids.size;
    };

    if (test.questions) {
      const count = countUniqueIds(test.questions);
      if (count > 0) return count;
    }
    if (test.sections) {
      const count = countUniqueIds(test.sections);
      if (count > 0) return count;
    }
    
    return (test.questions?.length) || 
      (isListeningFull || isReadingFull ? 40 : 
       isListeningPart ? 10 : 
       isReadingPassage ? 13 : 13);
  })();

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

  const derivedQuestionTypes = (() => {
    // 1. If it has parts (Listening virtual parts in metadata), aggregate them
    const aggregated = new Set();
    if (test.parts && typeof test.parts === 'object') {
      Object.values(test.parts).forEach(p => {
        if (p.qTypes && Array.isArray(p.qTypes)) {
          p.qTypes.forEach(t => aggregated.add(t));
        }
      });
    }
    if (test.passages && typeof test.passages === 'object') {
      Object.values(test.passages).forEach(p => {
        if (p.qTypes && Array.isArray(p.qTypes)) {
          p.qTypes.forEach(t => aggregated.add(t));
        }
      });
    }
    if (aggregated.size > 0) return Array.from(aggregated);

    // 2. Fallback to existing test.questionTypes
    if (test.questionTypes && test.questionTypes.length > 0) {
      return test.questionTypes;
    }

    // 3. Fallback to parsing questions/sections (for full test object if loaded)
    const types = new Set();
    const mapType = (t) => {
      if (!t) return null;
      const lower = t.toLowerCase();
      if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection') || lower.includes('pick_')) return 'Multiple Choice';
      if (lower.includes('matching_headings')) return 'Matching Headings';
      if (lower.includes('true_false') || lower.includes('yes_no')) return 'TFNG/YNNG';
      if (lower.includes('matching')) return 'Matching';
      if (lower.includes('table')) return 'Table Completion';
      if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary') || lower.includes('form')) return 'Completion';
      if (lower.includes('flow_chart') || lower.includes('flowchart')) return 'Flow Chart';
      if (lower.includes('map_labeling') || lower.includes('diagram')) return 'Map/Diagram';
      if (lower.includes('short_answer')) return 'Short Answer';
      return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const qArray = test.questions || [];
    qArray.forEach(q => {
      if (q.type) { const m = mapType(q.type); if (m) types.add(m); }
      if (q.items) q.items.forEach(it => { if (it.type) { const m = mapType(it.type); if (m) types.add(m); } });
      if (q.questions) q.questions.forEach(it => { if (it.type) { const m = mapType(it.type); if (m) types.add(m); } });
      if (q.groups) q.groups.forEach(g => { if (g.type) { const m = mapType(g.type); if (m) types.add(m); } });
    });

    const sArray = test.sections || [];
    sArray.forEach(s => {
      (s.questions || []).forEach(q => {
        if (q.type) { const m = mapType(q.type); if (m) types.add(m); }
      });
    });

    return Array.from(types);
  })();

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

  const hasThumbnail = test.thumbnail && !test.thumbnail.includes('reading_passage_yellow') && !test.thumbnail.includes('dashboard/reading_passage');

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        hapticFeedback('light');
        handleClick();
      }}
      className="group w-full bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden transition-all duration-[400ms] hover:shadow-lg flex flex-col h-full cursor-pointer border border-zinc-200/80 dark:border-zinc-800/80"
    >
      {/* Top Visual Section */}
      <div className="relative aspect-[1.5/1] w-full overflow-hidden rounded-t-2xl bg-[#f5f5f7] dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900">
        {hasThumbnail ? (
          <img src={test.thumbnail} alt={test.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
          <div className="flex justify-between items-center">
            <span className="px-2.5 py-0.5 rounded bg-black/25 backdrop-blur-md text-white/90 text-[10px] font-bold tracking-wide uppercase border border-white/10">
              {passageLabel}
            </span>
            <div className="flex gap-1.5">
              {isPremium && (
                <span className="px-2.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-sm">
                  <Crown size={9} fill="currentColor" /> PRO
                </span>
              )}
              {isCompleted && (
                <span className="px-2.5 py-0.5 rounded bg-[#34c759] text-white text-[10px] font-bold tracking-wide uppercase shadow-sm">
                  Done
                </span>
              )}
            </div>
          </div>
          
          {/* Big Typography inside mockup */}
          <div className="my-auto z-10 pr-2">
            <h3 className="text-[17px] md:text-[19px] font-extrabold leading-tight tracking-tight text-white line-clamp-2 drop-shadow-lg">
              {test.title}
            </h3>
          </div>
          
          {/* Tags */}
          {derivedQuestionTypes && derivedQuestionTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 opacity-90 transition-opacity">
              {derivedQuestionTypes.slice(0, 2).map((qType, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-white/15 backdrop-blur-md text-white text-[9px] font-semibold tracking-wide border border-white/5 uppercase">
                  {qType}
                </span>
              ))}
            </div>
          )}
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
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[12.5px] flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Zap size={12} fill="currentColor" /> Go Pro
            </button>
          ) : (
            <div className="flex gap-2">
              {isCompleted && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onReview(test); }}
                  className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-[12px] border border-white/20 active:scale-95 transition-all"
                >
                  Review
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); isCompleted ? onStart(test) : handleClick(); }}
                className="px-4 py-1.5 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 font-bold text-[12px] shadow-md active:scale-95 transition-all flex items-center gap-1"
              >
                {isCompleted ? 'Retake' : 'Start'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info Section (Figma Community Style) */}
      <div className="p-4 bg-white dark:bg-zinc-950 flex-1">
        {/* Text Content */}
        <div className="w-full">
          <h4 className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-150 group-hover:text-[#0066cc] dark:group-hover:text-[#3894ff] transition-colors line-clamp-1 leading-snug">
            {test.title}
          </h4>
          <div className="text-[11px] text-zinc-450 dark:text-zinc-500 mt-1 flex items-center flex-wrap gap-1.5 font-medium">
            <span>by ENGLEV</span>
            <span className="text-zinc-300 dark:text-zinc-800 select-none">•</span>
            <span className="flex items-center gap-0.5">
              <FileText size={11} className="text-zinc-450 dark:text-zinc-500" />
              {questionCount} Savol
            </span>
            <span className="text-zinc-300 dark:text-zinc-800 select-none">•</span>
            <span className="flex items-center gap-0.5">
              <Clock size={11} className="text-zinc-450 dark:text-zinc-500" />
              {duration}m
            </span>
            {isCompleted && (
              <>
                <span className="text-zinc-300 dark:text-zinc-800 select-none">•</span>
                <span className="text-[#34c759] font-bold">
                  Result: {test.result.score}/{test.result.totalQuestions || test.totalQuestions || 40}
                </span>
                <span className="text-zinc-300 dark:text-zinc-800 select-none">•</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onReview(test); }} 
                  className="text-[#0071e3] hover:underline font-bold"
                >
                  Review
                </button>
                <span className="text-zinc-300 dark:text-zinc-800 select-none">•</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onStart(test); }} 
                  className="text-zinc-500 hover:text-zinc-700 font-bold"
                >
                  Retake
                </button>
              </>
            )}
          </div>
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
}
