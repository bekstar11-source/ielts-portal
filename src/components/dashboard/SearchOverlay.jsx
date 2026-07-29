import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, X, CornerDownLeft, ArrowUpDown, CornerRightDown,
  Home, UserCheck, Trophy, TrendingUp, BookOpen, Headphones, 
  PenTool, Mic, BookMarked, Settings, Map, CreditCard, Newspaper 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { useStudentData } from '../../hooks/useStudentData';
import { collection, query, where, getDocs } from 'firebase/firestore';

let globalTestsCache = null;

export default function SearchOverlay({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { user } = useAuth();
  const { userResults } = useStudentData(user);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbTests, setDbTests] = useState([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Reset states when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (globalTestsCache) {
      setDbTests(globalTestsCache);
      return;
    }

    const fetchAllTests = async () => {
      setLoadingDb(true);
      try {
        const [readingSnap, listeningSnap] = await Promise.all([
          getDocs(query(collection(db, 'tests_metadata'), where('type', '==', 'reading'))),
          getDocs(query(collection(db, 'tests_metadata'), where('type', '==', 'listening')))
        ]);

        const readingTests = readingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const listeningTests = listeningSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const allFetched = [...readingTests, ...listeningTests];
        globalTestsCache = allFetched;
        setDbTests(allFetched);
      } catch (err) {
        console.error("Error fetching tests for search:", err);
      } finally {
        setLoadingDb(false);
      }
    };

    fetchAllTests();
  }, [isOpen]);

  // Database of searchable content
  const searchableItems = useMemo(() => [
    // ── PAGES & MAIN SECTIONS ──
    {
      id: 'dashboard',
      category: 'pages',
      label: 'Home Dashboard',
      uzLabel: 'Bosh sahifa paneli',
      desc: 'Overview of your IELTS progress and main dashboard.',
      uzDesc: 'IELTS ko\'rsatkichlaringiz va asosiy ishchi stolingiz.',
      path: '/dashboard',
      icon: Home
    },
    {
      id: 'mock',
      category: 'pages',
      label: 'Mock Exam',
      uzLabel: 'Mock Imtihoni',
      desc: 'Take a realistic full IELTS exam simulation under exam conditions.',
      uzDesc: 'Haqiqiy imtihon muhitida to\'liq IELTS testini topshiring.',
      path: '/mock',
      icon: UserCheck
    },
    {
      id: 'results',
      category: 'pages',
      label: 'My Results',
      uzLabel: 'Mening natijalarim',
      desc: 'View your completed test scores, answers, and detailed analysis.',
      uzDesc: 'Topshirgan testlaringiz ballari, javoblar va batafsil tahlilni ko\'ring.',
      path: '/my-results',
      icon: Trophy
    },
    // {
    //   id: 'leaderboard',
    //   category: 'pages',
    //   label: 'Leaderboard & Ranking',
    //   uzLabel: 'Reyting va peshqadamlar',
    //   desc: 'See how you rank against other IELTS portal students.',
    //   uzDesc: 'Boshqa talabalar orasida reytingingizni va peshqadamlarni ko\'ring.',
    //   path: '/leaderboard',
    //   icon: TrendingUp
    // },
    // {
    //   id: 'roadmap',
    //   category: 'pages',
    //   label: 'Personal Study Roadmap',
    //   uzLabel: 'Shaxsiy o\'quv rejasi',
    //   desc: 'Your tailored study strategy and daily language goals.',
    //   uzDesc: 'Sizga moslashtirilgan o\'quv strategiyasi va kunlik maqsadlar.',
    //   path: '/roadmap',
    //   icon: Map
    // },
    {
      id: 'settings',
      category: 'pages',
      label: 'Settings',
      uzLabel: 'Sozlamalar',
      desc: 'Manage your profile, target band score, preferences, and language.',
      uzDesc: 'Profilingizni, maqsadli IELTS ballingizni va sozlamalarni boshqaring.',
      path: '/settings',
      icon: Settings
    },
    {
      id: 'pricing',
      category: 'pages',
      label: 'Pricing & Plans',
      uzLabel: 'Tariflar va narxlar',
      desc: 'Upgrade your account to Standard or Premium PRO for advanced AI features.',
      uzDesc: 'Sun\'iy intellekt va to\'liq imkoniyatlar uchun tarifni faollashtiring.',
      path: '/pricing',
      icon: CreditCard
    },

    // ── PRACTICE SECTIONS ──
    {
      id: 'reading_full',
      category: 'practice',
      label: 'Reading Full Tests',
      uzLabel: 'Reading To\'liq testlar',
      desc: 'Complete three passages within 60 minutes with exam interface.',
      uzDesc: '60 daqiqada 3 ta passage-dan iborat to\'liq Reading imtihoni.',
      path: '/reading/full',
      icon: BookOpen
    },
    {
      id: 'reading_parts',
      category: 'practice',
      label: 'Reading Part Practice',
      uzLabel: 'Reading qismlar bo\'yicha amaliyot',
      desc: 'Practice individual reading passages at your own pace.',
      uzDesc: 'Alohida Reading passage-larini o\'zingizga qulay vaqtda yeching.',
      path: '/reading/parts',
      icon: BookOpen
    },
    {
      id: 'listening_full',
      category: 'practice',
      label: 'Listening Full Tests',
      uzLabel: 'Listening To\'liq testlar',
      desc: 'Realistic full listening simulation with audio tracks and questions.',
      uzDesc: 'Audio va savollar bilan to\'liq Listening imtihoni simulyatsiyasi.',
      path: '/listening/full',
      icon: Headphones
    },
    {
      id: 'listening_parts',
      category: 'practice',
      label: 'Listening Section Practice',
      uzLabel: 'Listening qismlar bo\'yicha amaliyot',
      desc: 'Listen and practice specific listening sections individually.',
      uzDesc: 'Listening bo\'limlarini alohida-alohida mashq qiling.',
      path: '/listening/parts',
      icon: Headphones
    },
    {
      id: 'writing_full',
      category: 'practice',
      label: 'Writing Full Tests',
      uzLabel: 'Writing To\'liq testlar',
      desc: 'Practice both Task 1 and Task 2 under realistic conditions.',
      uzDesc: 'Task 1 va Task 2 yozma ishlarini vaqt nazorati ostida mashq qiling.',
      path: '/practice?tab=writing&type=full',
      icon: PenTool
    },
    {
      id: 'writing_parts',
      category: 'practice',
      label: 'Writing Tasks Practice',
      uzLabel: 'Writing vazifalar amaliyoti',
      desc: 'Write individual Task 1 or Task 2 essay prompts with AI evaluation.',
      uzDesc: 'Alohida Task 1 yoki Task 2 insholarini yozing va AI orqali baholang.',
      path: '/practice?tab=writing&type=part',
      icon: PenTool
    },
    {
      id: 'speaking',
      category: 'practice',
      label: 'Speaking Simulator',
      uzLabel: 'Speaking amaliyot xonasi',
      desc: 'Interactive speaking simulator with AI band score evaluations.',
      uzDesc: 'Sun\'iy intellekt orqali baholanuvchi interaktiv Speaking simulyatori.',
      path: '/practice?tab=speaking',
      icon: Mic
    },

    // ── RESOURCES ──
    {
      id: 'podcasts',
      category: 'resources',
      label: 'IELTS Listening Podcasts',
      uzLabel: 'IELTS tinglash podcastlari',
      desc: 'Improve your English comprehension with native podcasts and transcripts.',
      uzDesc: 'Mahalliy podcastlar va matnlarni eshitib tinglash mahoratingizni oshiring.',
      path: '/podcasts',
      icon: Headphones
    },
    {
      id: 'articles',
      category: 'resources',
      label: 'IELTS Reading Articles',
      uzLabel: 'IELTS o\'qish maqolalari',
      desc: 'Curated articles with translations, interactive dictionary and questions.',
      uzDesc: 'Lug\'atlar, tarjimalar va savollar bilan tayyorlangan maqolalar.',
      path: '/articles',
      icon: Newspaper
    },
    {
      id: 'vocabulary',
      category: 'resources',
      label: 'WordBank & Vocabulary',
      uzLabel: 'WordBank va Lug\'at boyligi',
      desc: 'Review, save, and practice essential high-band academic vocabulary.',
      uzDesc: 'Yuqori ball keltiruvchi akademik so\'zlarni saqlang va yodlang.',
      path: '/vocabulary',
      icon: BookMarked
    }
  ], []);

  // Filtered search results based on query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    // 1. Filter local searchableItems
    const localMatches = searchableItems.filter(item => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.uzLabel.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        item.uzDesc.toLowerCase().includes(query)
      );
    });

    const resultsList = userResults || [];

    // 2. Filter dbTests (Reading / Listening tests)
    const dbMatches = dbTests.filter(test => {
      const title = (test.title || '').toLowerCase();
      const type = (test.type || '').toLowerCase();
      const difficulty = (test.difficulty || '').toLowerCase();
      const pNum = String(test.passageNumber || test.passage_number || '');
      
      return (
        title.includes(query) ||
        type.includes(query) ||
        difficulty.includes(query) ||
        (query.includes('passage') && pNum && query.includes(pNum)) ||
        (query.includes('p') && pNum && query.includes(pNum))
      );
    }).map(test => {
      const isReading = test.type === 'reading';
      // Find if this test is completed by looking at userResults
      const attempt = resultsList.find(
        r => String(r.testId).trim() === String(test.id).trim()
      );
      
      const path = attempt ? `/review/${attempt.id}` : `/test/${test.id}`;

      return {
        id: test.id,
        category: test.type, // 'reading' or 'listening'
        label: test.title || (isReading ? 'Reading Passage' : 'Listening Test'),
        uzLabel: test.title || (isReading ? 'Reading Passage' : 'Listening Test'),
        desc: isReading 
          ? `Reading Passage • ${test.difficulty || 'Medium'} difficulty` 
          : `Listening Test • ${test.difficulty || 'Medium'} difficulty`,
        uzDesc: isReading 
          ? `Reading Passage • Qiyinchilik: ${test.difficulty || 'medium'}` 
          : `Listening Test • Qiyinchilik: ${test.difficulty || 'medium'}`,
        path,
        icon: isReading ? BookOpen : Headphones,
        isCompleted: !!attempt,
        resultId: attempt?.id || null
      };
    });

    return [...localMatches, ...dbMatches];
  }, [searchQuery, searchableItems, dbTests, userResults]);

  // Handle keyboard events (spotlight navigation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = filteredResults.length > 0 ? filteredResults.length - 1 : 4; // fallback for quick links
          const next = prev >= max ? 0 : prev + 1;
          scrollActiveItemIntoView(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = filteredResults.length > 0 ? filteredResults.length - 1 : 4;
          const next = prev <= 0 ? max : prev - 1;
          scrollActiveItemIntoView(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults.length > 0) {
          const selected = filteredResults[selectedIndex];
          if (selected) {
            navigate(selected.path);
            onClose();
          }
        } else {
          // Select default quick links when query is empty
          const quickLinks = [
            '/reading/full',
            '/listening/full',
            '/practice?tab=speaking',
            '/vocabulary'
          ];
          const path = quickLinks[selectedIndex];
          if (path) {
            navigate(path);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose, navigate]);

  // Autoscroll dynamic active item into view
  const scrollActiveItemIntoView = (index) => {
    const container = resultsContainerRef.current;
    if (!container) return;
    const items = container.querySelectorAll('.search-result-item');
    const activeItem = items[index];
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  };

  const selectAndNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      pages: lang === 'uz' ? 'Sahifalar va Bo\'limlar' : 'Pages & Sections',
      practice: lang === 'uz' ? 'Amaliyot va Imtihonlar' : 'Exam & Practice',
      resources: lang === 'uz' ? 'Foydali Resurslar' : 'Learning Resources',
      reading: lang === 'uz' ? 'Reading Passage-lar' : 'Reading Passages',
      listening: lang === 'uz' ? 'Listening Test-lar' : 'Listening Tests'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4">
      {/* Backdrop Blur overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-warm-ink/40 dark:bg-black/60 backdrop-blur-md"
      />

      {/* Spotlight Centered Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[600px] bg-warm-canvas dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[520px] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Input Field */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-warm-hairline dark:border-white/10 shrink-0">
          <Search className="text-warm-muted-soft dark:text-warm-on-dark-soft mr-3" size={17} strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={lang === 'uz' ? 'IELTS testlari yoki bo\'limlarni qidiring...' : 'Search IELTS mock tests or sections...'}
            className="w-full bg-transparent border-none text-[15px] font-medium text-warm-ink dark:text-warm-on-dark placeholder:text-warm-muted-soft dark:placeholder:text-warm-on-dark-soft focus:outline-none focus:ring-0 leading-normal p-0"
          />
          <div className="flex items-center gap-1.5 ml-2">
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedIndex(0); }}
                className="p-1 rounded-full text-warm-muted-soft dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            )}
            <span className="hidden sm:inline-block text-[10px] font-semibold bg-warm-surface dark:bg-white/10 text-warm-muted-soft dark:text-warm-on-dark-soft border border-warm-hairline dark:border-white/10 px-1.5 py-0.5 rounded shadow-sm">
              ESC
            </span>
          </div>
        </div>

        {/* Scrollable Results */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2.5 max-h-[380px] scrollbar-thin dark:scrollbar-thumb-white/10"
        >
          {/* Query is Empty - default view */}
          {!searchQuery.trim() && (
            <div className="py-2.5 px-1.5">
              {/* Quick links block */}
              <h4 className="text-[10px] text-warm-muted-soft dark:text-warm-on-dark-soft font-bold uppercase tracking-widest mb-3.5 pl-1">
                {lang === 'uz' ? 'Tavsiya etilgan havolalar' : 'Recommended Quick Links'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {[
                  { label: lang === 'uz' ? 'Reading To\'liq imtihon' : 'Reading Full Test', path: '/reading/full', icon: BookOpen, col: 'text-blue-500', bg: 'bg-blue-500/5' },
                  { label: lang === 'uz' ? 'Listening Imtihon' : 'Listening Full Test', path: '/listening/full', icon: Headphones, col: 'text-red-500', bg: 'bg-red-500/5' },
                  { label: lang === 'uz' ? 'Speaking AI simulyator' : 'Speaking AI Simulator', path: '/practice?tab=speaking', icon: Mic, col: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                  { label: lang === 'uz' ? 'Lug\'at boyligi' : 'Vocabulary WordBank', path: '/vocabulary', icon: BookMarked, col: 'text-violet-500', bg: 'bg-violet-500/5' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = selectedIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => selectAndNavigate(item.path)}
                      className={`search-result-item flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                        isActive
                          ? 'bg-warm-primary/10 border-warm-primary/30 text-warm-primary dark:bg-warm-primary/15 dark:border-warm-primary/40 dark:text-warm-primary'
                          : 'bg-warm-surface/40 hover:bg-warm-surface dark:bg-white/5 dark:hover:bg-white/10 border-warm-hairline/60 hover:border-warm-hairline dark:border-white/5 dark:hover:border-white/10 text-warm-body dark:text-warm-on-dark-soft'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                        <Icon size={16} className={item.col} />
                      </div>
                      <span className="text-[13px] font-semibold leading-tight">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Trending tags */}
              <h4 className="text-[10px] text-warm-muted-soft dark:text-warm-on-dark-soft font-bold uppercase tracking-widest mb-3 pl-1">
                {lang === 'uz' ? 'Ommabop mavzular' : 'Trending Topics'}
              </h4>
              <div className="flex flex-wrap gap-2 pl-0.5">
                {[
                  { tag: lang === 'uz' ? 'To\'liq imtihon' : 'Mock Exam', query: 'mock' },
                  { tag: 'Reading', query: 'reading' },
                  { tag: 'Listening', query: 'listening' },
                  { tag: 'Writing Task 2', query: 'writing' },
                  { tag: lang === 'uz' ? 'Tariflar' : 'Pricing', query: 'pricing' },
                  { tag: 'WordBank', query: 'vocabulary' }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearchQuery(item.query); setSelectedIndex(0); }}
                    className="px-3.5 py-1.5 bg-warm-surface dark:bg-white/5 text-[12px] font-medium text-warm-body dark:text-warm-on-dark-soft border border-warm-hairline dark:border-white/10 hover:bg-warm-card dark:hover:bg-white/10 rounded-full transition-all"
                  >
                    #{item.tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Has typing - filtering results */}
          {searchQuery.trim() && filteredResults.length > 0 && (
            <div className="space-y-4 py-1.5">
              {/* Group items dynamically by category */}
              {['pages', 'practice', 'resources', 'reading', 'listening'].map((category) => {
                const categoryItems = filteredResults.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <h4 className="text-[10px] text-warm-muted-soft dark:text-warm-on-dark-soft font-bold uppercase tracking-widest mb-2 pl-2">
                      {getCategoryLabel(category)}
                    </h4>

                    <div className="space-y-1">
                      {categoryItems.map((item) => {
                        const Icon = item.icon;
                        // Find the globally unique index of this item in the flat filtered array
                        const globalIndex = filteredResults.findIndex(r => r.id === item.id);
                        const isActive = selectedIndex === globalIndex;

                        return (
                          <div
                            key={item.id}
                            onClick={() => selectAndNavigate(item.path)}
                            className={`search-result-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                              isActive
                                ? 'bg-warm-primary/10 border-warm-primary/30 dark:bg-warm-primary/15 dark:border-warm-primary/40'
                                : 'bg-transparent border-transparent hover:bg-warm-surface dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-warm-primary/10 text-warm-primary dark:text-warm-primary'
                                  : 'bg-warm-surface dark:bg-white/5 text-warm-muted-soft dark:text-warm-on-dark-soft'
                              }`}>
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-[13.5px] font-semibold leading-normal truncate ${
                                    isActive ? 'text-warm-primary dark:text-warm-primary' : 'text-warm-ink dark:text-warm-on-dark'
                                  }`}>
                                    {lang === 'uz' ? item.uzLabel : item.label}
                                  </p>
                                  {item.isCompleted && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200/40">
                                      {lang === 'uz' ? 'Bajarilgan' : 'Completed'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-warm-muted-soft dark:text-warm-on-dark-soft truncate mt-0.5">
                                  {lang === 'uz' ? item.uzDesc : item.desc}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center ml-4 pl-1">
                              {isActive ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold bg-warm-primary/10 text-warm-primary dark:text-warm-primary border border-warm-primary/30 dark:border-warm-primary/40 px-1.5 py-0.5 rounded shadow-sm select-none pointer-events-none">
                                  {lang === 'uz' ? 'O\'tish' : 'Enter'} <CornerDownLeft size={10} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span className="text-[11px] text-warm-hairline dark:text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Search Results Found */}
          {searchQuery.trim() && filteredResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 px-4 text-center flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-warm-surface dark:bg-white/5 flex items-center justify-center text-warm-muted-soft dark:text-warm-on-dark-soft mb-4 border border-warm-hairline/60 dark:border-white/10">
                <Search size={20} />
              </div>
              <h3 className="text-[14px] font-bold text-warm-ink dark:text-warm-on-dark">
                {lang === 'uz' ? 'Hech narsa topilmadi' : 'No results found'}
              </h3>
              <p className="text-warm-muted-soft dark:text-warm-on-dark-soft text-xs max-w-xs leading-relaxed mt-1.5">
                {lang === 'uz'
                  ? `"${searchQuery}" so'zi bo'yicha hech qanday natija topilmadi. Boshqa kalit so'zlarni sinab ko'ring.`
                  : `No matches found for "${searchQuery}". Please try adjusting your keywords or search query.`}
              </p>
            </motion.div>
          )}
        </div>

        {/* Premium Status Nav Footer */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-warm-surface/50 dark:bg-white/5 border-t border-warm-hairline dark:border-white/10 text-[11px] text-warm-muted-soft dark:text-warm-on-dark-soft select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <span className="bg-warm-surface dark:bg-white/10 border border-warm-hairline dark:border-white/10 px-1 py-0.5 rounded shadow-sm font-semibold flex items-center justify-center">↑↓</span>
              {lang === 'uz' ? 'tanlash' : 'select'}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="bg-warm-surface dark:bg-white/10 border border-warm-hairline dark:border-white/10 px-1 py-0.5 rounded shadow-sm font-semibold flex items-center justify-center"><CornerDownLeft size={8} strokeWidth={3} /></span>
              {lang === 'uz' ? 'kirish' : 'open'}
            </span>
          </div>
          <span className="hidden sm:inline font-semibold opacity-90 tracking-wide">
            IELTS PORTAL SPOTLIGHT
          </span>
        </div>
      </motion.div>
    </div>
  );
}
