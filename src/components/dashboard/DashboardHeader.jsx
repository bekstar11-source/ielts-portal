import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Settings, 
  LogOut, 
  ArrowUp, 
  X, 
  Menu,
  RotateCw,
  Home,
  Computer,
  GraduationCap,
  Headphones,
  BookOpen,
  Newspaper,
  BarChart2,
  TrendingUp,
  BookMarked,
  CreditCard,
  PenTool,
  Mic,
  Layers,
  ClipboardList,
  Moon,
  Sun,
  LayoutDashboard,
  FilePlus,
  Plus
} from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function DashboardHeader({ 
  user, 
  userData, 
  onLogoutClick, 
  activeTab, 
  setActiveTab, 
  onPremiumClick, 
  onRefreshClick, 
  loading 
}) {
  const { t, lang, setLang } = useTranslation();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const getLabel = (id, fallback) => {
    const keyMap = {
      dashboard: 'home',
      mock: 'mockExam',
      results: 'results',
      leaderboard: 'ranking',
      full_tests: 'fullTests',
      part_tests: 'partTests',
      speaking: 'speaking',
      podcasts: 'podcasts',
      articles: 'articles',
      vocabulary: 'vocabulary',
      pricing: 'pricing',
      logout: 'logout'
    };
    const key = keyMap[id];
    return key ? t(`dashboard.${key}`) : fallback;
  };
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(true);
  const [isPracticeOpen, setIsPracticeOpen] = useState(true);
  const [isResourcesOpen, setIsResourcesOpen] = useState(true);
  const [isIeltsOpen, setIsIeltsOpen] = useState(true);
  const [isTeacherSectionOpen, setIsTeacherSectionOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isMac = typeof window !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const [isFullTestsOpen, setIsFullTestsOpen] = useState(() => {
    return (
      location.pathname === '/reading/full' ||
      location.pathname === '/listening/full' ||
      (location.pathname === '/practice' && location.search.includes('type=full'))
    );
  });

  const [isPartTestsOpen, setIsPartTestsOpen] = useState(() => {
    return (
      location.pathname === '/reading/parts' ||
      location.pathname === '/listening/parts' ||
      (location.pathname === '/practice' && location.search.includes('type=part')) ||
      location.pathname === '/library'
    );
  });

  useEffect(() => {
    // Add layout shift class to body when sidebar is active
    document.body.classList.add('student-sidebar-active');
    return () => {
      document.body.classList.remove('student-sidebar-active');
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const coreItems = [
    { id: 'mock', label: 'Mock Exam', path: '/mock', icon: Computer },
    { id: 'results', label: 'Results', path: '/my-results', icon: BarChart2 },
    // { id: 'leaderboard', label: 'Reyting', path: '/leaderboard', icon: TrendingUp },
  ];

  const practiceItems = [
    { id: 'full_tests', label: 'Full Tests', icon: ClipboardList },
    { id: 'part_tests', label: 'Part Tests', icon: Layers },
    { id: 'speaking', label: 'Speaking', path: '/speaking-ai', icon: Mic },
  ];

  const resourceItems = [
    { id: 'podcasts', label: 'Podcasts', path: '/podcasts', icon: Headphones, iconColor: 'text-red-500' },
    { id: 'articles', label: 'Articles', path: '/articles', icon: Newspaper, iconColor: 'text-emerald-500' },
    { id: 'vocabulary', label: 'WordBank', path: '/vocabulary', icon: BookMarked, iconColor: 'text-violet-500' },
    { id: 'pricing', label: 'Pricing', path: '/pricing', icon: CreditCard, iconColor: 'text-amber-500' },
  ];

  const renderIeltsSection = (isMobile = false) => {
    const isFullReadingActive = location.pathname === '/reading/full';
    const isFullListeningActive = location.pathname === '/listening/full';
    const isFullWritingActive = location.pathname.startsWith('/practice') && location.search.includes('tab=writing') && location.search.includes('type=full');
    
    const isPartReadingActive = location.pathname === '/reading/parts';
    const isPartListeningActive = location.pathname === '/listening/parts';
    const isPartWritingActive = location.pathname.startsWith('/practice') && location.search.includes('tab=writing') && location.search.includes('type=part');

    const isSpeakingActive = location.pathname === '/speaking-ai';

    const handleSubItemClick = (path) => {
      navigate(path);
      if (isMobile) {
        setIsMobileMenuOpen(false);
      }
    };

    const textClass = isMobile ? 'text-[12px]' : 'text-[13px]';
    const subTextClass = isMobile ? 'text-[12px] py-1' : 'text-[13px] py-1';
    const iconSize = isMobile ? 13 : 14;

    return (
      <div className={isMobile ? "mt-3 flex flex-col gap-2.5" : "mt-4 flex flex-col gap-3"}>
        {/* IELTS Group Header */}
        <button
          onClick={() => setIsIeltsOpen(!isIeltsOpen)}
          className="flex items-center gap-1.5 text-[13px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-widest px-2.5 select-none hover:text-zinc-950 dark:hover:text-white transition-colors w-full text-left"
        >
          <span>IELTS</span>
          <ChevronDown size={11} className={`text-zinc-400 dark:text-zinc-550 transition-transform duration-200 ${isIeltsOpen ? '' : '-rotate-90'}`} />
        </button>

        <AnimatePresence initial={false}>
          {isIeltsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`overflow-hidden flex flex-col ${isMobile ? "gap-2.5" : "gap-3"}`}
            >
              {/* To'liq testlar (Full Tests) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                  <ClipboardList size={13} className="text-zinc-400 dark:text-zinc-550" />
                  <span>{t('dashboard.fullTests')}</span>
                </div>
                
                <div className="pl-3.5 ml-3.5 border-l border-zinc-200 dark:border-zinc-800/80 mt-1 space-y-0.5 flex flex-col">
                  <button
                    onClick={() => handleSubItemClick('/reading/full')}
                    className={`w-full text-left px-2 py-1 ${subTextClass} rounded-lg transition-all flex items-center gap-2 font-normal group ${
                      isFullReadingActive
                        ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <BookOpen size={iconSize} className={isFullReadingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    {t('dashboard.reading')}
                  </button>
                  <button
                    onClick={() => handleSubItemClick('/listening/full')}
                    className={`w-full text-left px-2 py-1 ${subTextClass} rounded-lg transition-all flex items-center gap-2 font-normal group ${
                      isFullListeningActive
                        ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <Headphones size={iconSize} className={isFullListeningActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    {t('dashboard.listening')}
                  </button>
                  <button
                    onClick={() => handleSubItemClick('/practice?tab=writing&type=full')}
                    className={`w-full text-left px-2 py-1 ${subTextClass} rounded-lg transition-all flex items-center gap-2 font-normal group ${
                      isFullWritingActive
                        ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <PenTool size={iconSize} className={isFullWritingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    {t('dashboard.writing')}
                  </button>
                </div>
              </div>

              {/* Qisqa testlar (Part Tests) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                  <Layers size={13} className="text-zinc-400 dark:text-zinc-555" />
                  <span>{t('dashboard.partTests')}</span>
                </div>
                
                <div className="pl-3.5 ml-3.5 border-l border-zinc-200 dark:border-zinc-800/80 mt-1 space-y-0.5 flex flex-col">
                  <button
                    onClick={() => handleSubItemClick('/reading/parts')}
                    className={`w-full text-left px-2 py-1 ${subTextClass} rounded-lg transition-all flex items-center gap-2 font-normal group ${
                      isPartReadingActive
                        ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <BookOpen size={iconSize} className={isPartReadingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    {t('dashboard.reading')}
                  </button>
                  <button
                    onClick={() => handleSubItemClick('/listening/parts')}
                    className={`w-full text-left px-2 py-1 ${subTextClass} rounded-lg transition-all flex items-center gap-2 font-normal group ${
                      isPartListeningActive
                        ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <Headphones size={iconSize} className={isPartListeningActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    {t('dashboard.listening')}
                  </button>
                  <button
                    onClick={() => handleSubItemClick('/practice?tab=writing&type=part')}
                    className={`w-full text-left px-2 py-1 ${subTextClass} rounded-lg transition-all flex items-center gap-2 font-normal group ${
                      isPartWritingActive
                        ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <PenTool size={iconSize} className={isPartWritingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    {t('dashboard.writing')}
                  </button>
                </div>
              </div>

              {/* Speaking */}
              <div className="flex flex-col">
                <button
                  onClick={() => handleSubItemClick('/speaking-ai')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${textClass} font-normal transition-all ${
                    isSpeakingActive
                      ? 'bg-[#e8f3ff] dark:bg-blue-950/30 text-[#0066cc] dark:text-[#3894ff]'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Mic size={15} className={isSpeakingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-550 dark:text-zinc-400'} />
                  <span>{t('dashboard.speaking')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderTeacherSection = (isMobile = false) => {
    if (userData?.role !== 'teacher') return null;

    const items = [
      { id: 't_dashboard', label: "Dashboard", path: '/teacher', icon: LayoutDashboard },
      { id: 't_tests', label: "Tayinlangan Testlar", path: '/teacher/tests', icon: BookOpen },
      { id: 't_create_writing', label: "Writing Yaratish", path: '/teacher/create-writing', icon: Plus },
      { id: 't_writing_review', label: "Writing Tekshirish", path: '/teacher/writing-review', icon: PenTool },
      { id: 't_stats', label: "Guruh Statistikasi", path: '/teacher/group-stats', icon: BarChart2 },
      { id: 't_results', label: "Barcha Natijalar", path: '/teacher/results', icon: ClipboardList },
      { id: 't_subscription', label: "Obuna & To'lovlar", path: '/teacher/subscription', icon: CreditCard }
    ];

    const handleItemClick = (path) => {
      navigate(path);
      if (isMobile) {
        setIsMobileMenuOpen(false);
      }
    };

    const textClass = isMobile ? 'text-[12px]' : 'text-[13px]';
    const subTextClass = isMobile ? 'text-[12px] py-1' : 'text-[13px] py-1';
    const iconSize = isMobile ? 13 : 14;

    return (
      <div className={isMobile ? "mt-3 flex flex-col gap-2.5" : "mt-4 flex flex-col gap-3"}>
        <button
          onClick={() => setIsTeacherSectionOpen(!isTeacherSectionOpen)}
          className="flex items-center gap-1.5 text-[13px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-widest px-2.5 select-none hover:text-zinc-950 dark:hover:text-white transition-colors w-full text-left"
        >
          <span>USTOZ PANELI</span>
          <ChevronDown size={11} className={`text-zinc-450 dark:text-zinc-500 transition-transform duration-200 ${isTeacherSectionOpen ? '' : '-rotate-90'}`} />
        </button>

        <AnimatePresence initial={false}>
          {isTeacherSectionOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`overflow-hidden flex flex-col ${isMobile ? "gap-2.5" : "gap-1 mt-1 pl-1"}`}
            >
              {items.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path === '/teacher' && location.pathname === '/teacher/');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.path)}
                    className={`w-full text-left px-2.5 py-1.5 ${textClass} rounded-lg transition-all flex items-center gap-2.5 font-normal group ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-550 dark:text-zinc-455 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMenuItem = (item) => {
    const active = isTabActive(item);
    const Icon = item.icon;
    
    if (item.id === 'full_tests' || item.id === 'part_tests') {
      const isOpen = item.id === 'full_tests' ? isFullTestsOpen : isPartTestsOpen;
      const isFull = item.id === 'full_tests';

      const isReadingActive = location.pathname.startsWith('/reading') && 
        ((isFull && location.pathname.includes('/full')) || (!isFull && location.pathname.includes('/parts')));
      
      const isListeningActive = location.pathname.startsWith('/listening') && 
        ((isFull && location.search.includes('full_test')) || (!isFull && location.search.includes('parts')));

      const isWritingActive = location.pathname.startsWith('/practice') && location.search.includes('tab=writing') && 
        ((isFull && location.search.includes('type=full')) || (!isFull && location.search.includes('type=part')));

      return (
        <div key={item.id} className="flex flex-col">
          <button
            onClick={() => handleNavigation(item)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-normal transition-all ${
              active 
                ? 'bg-[#e8f3ff] dark:bg-blue-950/30 text-[#0066cc] dark:text-[#3894ff]' 
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon size={15} className={active ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-550 dark:text-zinc-400'} />
              <span>{getLabel(item.id, item.label)}</span>
            </div>
            <ChevronRight 
              size={11} 
              className={`text-zinc-450 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
            />
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pl-5 pr-1 mt-0.5 space-y-1 flex flex-col"
              >
                <button
                  onClick={() => navigate(isFull ? '/reading/full' : '/reading/parts')}
                  className={`w-full text-left px-2.5 py-1 text-[12px] rounded-lg transition-all flex items-center gap-2 font-normal group ${
                    isReadingActive
                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <BookOpen size={13} className={isReadingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                  {t('dashboard.reading')}
                </button>
                <button
                  onClick={() => navigate(isFull ? '/listening/full' : '/listening/parts')}
                  className={`w-full text-left px-2.5 py-1 text-[12px] rounded-lg transition-all flex items-center gap-2 font-normal group ${
                    isListeningActive
                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <Headphones size={13} className={isListeningActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                  {t('dashboard.listening')}
                </button>
                <button
                  onClick={() => navigate(isFull ? '/practice?tab=writing&type=full' : '/practice?tab=writing&type=part')}
                  className={`w-full text-left px-2.5 py-1 text-[12px] rounded-lg transition-all flex items-center gap-2 font-normal group ${
                    isWritingActive
                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <PenTool size={13} className={isWritingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                  {t('dashboard.writing')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    const isMock = item.id === 'mock';

    let buttonClasses = active 
      ? 'bg-[#e8f3ff] dark:bg-blue-950/30 text-[#0066cc] dark:text-[#3894ff]' 
      : (isMock
          ? 'bg-blue-50/40 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 hover:bg-blue-50/70 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
        );
    
    let iconClasses = active 
      ? 'text-[#0066cc] dark:text-[#3894ff]' 
      : (isMock ? 'text-blue-500 dark:text-[#3894ff]' : 'text-zinc-550 dark:text-zinc-400');

    if (item.iconColor) {
      if (active) {
        if (item.id === 'podcasts') {
          buttonClasses = 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400';
          iconClasses = 'text-red-500';
        } else if (item.id === 'articles') {
          buttonClasses = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400';
          iconClasses = 'text-emerald-500';
        } else if (item.id === 'vocabulary') {
          buttonClasses = 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400';
          iconClasses = 'text-violet-500';
        } else if (item.id === 'pricing') {
          buttonClasses = 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400';
          iconClasses = 'text-amber-500';
        }
      } else {
        iconClasses = item.iconColor;
      }
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-normal transition-all relative overflow-hidden ${
          isMock ? 'mock-pulse-glow' : ''
        } ${buttonClasses}`}
      >
        <Icon size={15} className={iconClasses} />
        {getLabel(item.id, item.label)}
        {isMock && (
          <div className="absolute inset-0 w-full h-full overflow-hidden rounded-lg pointer-events-none">
            <div className="shimmer-sweep absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent skew-x-[-20deg]" />
          </div>
        )}
      </button>
    );
  };

  const renderMobileMenuItem = (item) => {
    const active = isTabActive(item);
    const Icon = item.icon;
    
    if (item.id === 'full_tests' || item.id === 'part_tests') {
      const isOpen = item.id === 'full_tests' ? isFullTestsOpen : isPartTestsOpen;
      const isFull = item.id === 'full_tests';

      const isReadingActive = location.pathname.startsWith('/reading') && 
        ((isFull && location.pathname.includes('/full')) || (!isFull && location.pathname.includes('/parts')));
      
      const isListeningActive = location.pathname.startsWith('/listening') && 
        ((isFull && location.search.includes('full_test')) || (!isFull && location.search.includes('parts')));

      const isWritingActive = location.pathname.startsWith('/practice') && location.search.includes('tab=writing') && 
        ((isFull && location.search.includes('type=full')) || (!isFull && location.search.includes('type=part')));

      return (
        <div key={item.id} className="flex flex-col">
          <button
            onClick={() => handleNavigation(item)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active 
                ? 'bg-[#e8f3ff] dark:bg-blue-950/40 text-[#0066cc] dark:text-[#3894ff]' 
                : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon size={14} className={active ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
              <span>{getLabel(item.id, item.label)}</span>
            </div>
            <ChevronRight 
              size={11} 
              className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
            />
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pl-5 pr-1 mt-0.5 space-y-1 flex flex-col"
              >
                <button
                  onClick={() => { navigate(isFull ? '/reading/full' : '/reading/parts'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-2 font-normal group ${
                    isReadingActive
                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <BookOpen size={12} className={isReadingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                  {t('dashboard.reading')}
                </button>
                <button
                  onClick={() => { navigate(isFull ? '/listening/full' : '/listening/parts'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-2 font-normal group ${
                    isListeningActive
                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <Headphones size={12} className={isListeningActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                  {t('dashboard.listening')}
                </button>
                <button
                  onClick={() => { navigate(isFull ? '/practice?tab=writing&type=full' : '/practice?tab=writing&type=part'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-2 font-normal group ${
                    isWritingActive
                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <PenTool size={12} className={isWritingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors'} />
                  {t('dashboard.writing')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    const isMock = item.id === 'mock';

    let buttonClasses = active 
      ? 'bg-[#e8f3ff] dark:bg-blue-950/40 text-[#0066cc] dark:text-[#3894ff]' 
      : (isMock
          ? 'bg-blue-50/40 dark:bg-zinc-900/30 text-zinc-650 dark:text-zinc-400 hover:bg-blue-50/70 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white'
          : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
        );
    
    let iconClasses = active 
      ? 'text-[#0066cc] dark:text-[#3894ff]' 
      : (isMock ? 'text-blue-500 dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500');

    if (item.iconColor) {
      if (active) {
        if (item.id === 'podcasts') {
          buttonClasses = 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400';
          iconClasses = 'text-red-500';
        } else if (item.id === 'articles') {
          buttonClasses = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-[#10b981]';
          iconClasses = 'text-emerald-500';
        } else if (item.id === 'vocabulary') {
          buttonClasses = 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-[#8b5cf6]';
          iconClasses = 'text-violet-500';
        } else if (item.id === 'pricing') {
          buttonClasses = 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-[#f59e0b]';
          iconClasses = 'text-amber-500';
        }
      } else {
        iconClasses = item.iconColor;
      }
    }

    return (
      <button
        key={item.id}
        onClick={() => { handleNavigation(item); setIsMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
          isMock ? 'mock-pulse-glow' : ''
        } ${buttonClasses}`}
      >
        <Icon size={14} className={iconClasses} />
        {getLabel(item.id, item.label)}
        {isMock && (
          <div className="absolute inset-0 w-full h-full overflow-hidden rounded-lg pointer-events-none">
            <div className="shimmer-sweep absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent skew-x-[-20deg]" />
          </div>
        )}
      </button>
    );
  };

  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium' ||
                    userData?.role === 'admin' || userData?.role === 'teacher';

  const isTabActive = (item) => {
    if (item.id === 'dashboard') {
      return activeTab === 'dashboard' || location.pathname === '/dashboard';
    }
    if (item.id === 'full_tests') {
      return !location.search.includes('tab=speaking') && (
        location.pathname === '/reading/full' ||
        (location.pathname === '/listening' && location.search.includes('section=full_test')) ||
        (location.pathname === '/practice' && location.search.includes('type=full'))
      );
    }
    if (item.id === 'part_tests') {
      return !location.search.includes('tab=speaking') && (
        location.pathname === '/reading/parts' ||
        (location.pathname === '/listening' && !location.search.includes('section=full_test')) ||
        (location.pathname === '/practice' && location.search.includes('type=part')) ||
        location.pathname === '/library'
      );
    }
    if (item.id === 'speaking') {
      return location.pathname === '/speaking-ai';
    }
    if (item.path) {
      return location.pathname === item.path || location.pathname.startsWith(item.path);
    }
    return activeTab === item.id;
  };

  const handleNavigation = (item) => {
    if (item.id === 'full_tests') {
      setIsFullTestsOpen(!isFullTestsOpen);
      return;
    }
    if (item.id === 'part_tests') {
      setIsPartTestsOpen(!isPartTestsOpen);
      return;
    }
    if (item.id === 'logout') {
      if (onLogoutClick) {
        onLogoutClick();
      } else {
        logout();
      }
      return;
    }
    if (setActiveTab && item.id) {
      setActiveTab(item.id);
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    let parentKey = 'home';
    let childKey = 'overview';

    if (path === '/dashboard') {
      parentKey = 'home';
      childKey = 'overview';
    } else if (path === '/mock') {
      parentKey = 'mockExam';
      childKey = 'tests';
    } else if (path === '/reading' || path === '/reading/full' || path === '/reading/parts') {
      parentKey = 'practice';
      childKey = 'reading';
    } else if (path === '/listening') {
      parentKey = 'practice';
      childKey = 'listening';
    } else if (path === '/practice') {
      parentKey = 'practice';
      childKey = 'skills';
    } else if (path === '/library') {
      parentKey = 'practice';
      childKey = 'library';
    } else if (path === '/podcasts') {
      parentKey = 'podcasts';
      childKey = 'episodes';
    } else if (path === '/articles') {
      parentKey = 'articles';
      childKey = 'resources';
    } else if (path === '/my-results') {
      parentKey = 'results';
      childKey = 'academic';
    } else if (path === '/leaderboard') {
      parentKey = 'ranking';
      childKey = 'leaderboard';
    } else if (path === '/vocabulary') {
      parentKey = 'vocabulary';
      childKey = 'vocabulary';
    } else if (path === '/pricing') {
      parentKey = 'pricing';
      childKey = 'subscriptions';
    } else if (path === '/settings') {
      parentKey = 'settings';
      childKey = 'preferences';
    } else if (path === '/roadmap') {
      parentKey = 'roadmap';
      childKey = 'strategy';
    } else if (path.startsWith('/podcast/')) {
      parentKey = 'podcasts';
      childKey = 'episodePlayer';
    } else if (path.startsWith('/article/')) {
      parentKey = 'articles';
      childKey = 'reader';
    }

    return { 
      parent: t(`dashboard.${parentKey}`), 
      child: t(`dashboard.${childKey}`) 
    };
  };

  const { parent, child } = getBreadcrumbs();
  const searchPlaceholder = t('dashboard.searchPlaceholder');

  return (
    <>
      {/* Desktop Content Header */}
      <header className="hidden md:flex fixed top-0 left-60 right-0 h-12 bg-white dark:bg-[#09090b] border-b border-zinc-200/50 dark:border-zinc-800/80 items-center justify-between px-6 z-50">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[13px] font-normal text-zinc-400 dark:text-zinc-550 select-none">
          <span className="text-zinc-650 dark:text-zinc-300 font-medium">
            {parent}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="text-zinc-450 dark:text-zinc-500 font-light">
            {child}
          </span>
        </div>

        {/* Right Header Section */}
        <div className="flex items-center gap-4">
          {/* Right Search Input */}
          <div 
            onClick={() => setIsSearchOpen(true)}
            className="relative w-60 cursor-pointer group flex items-center"
          >
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-455 dark:text-zinc-550 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-350" />
            <input
              type="text"
              readOnly
              placeholder={searchPlaceholder}
              className="w-full bg-[#f4f5f8] dark:bg-zinc-900/60 hover:bg-[#ececf0] dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-200 text-xs rounded-lg pl-8 pr-12 py-1.5 outline-none cursor-pointer transition-colors border border-transparent placeholder-zinc-450 dark:placeholder-zinc-500"
            />
            <kbd className="absolute right-2 text-[9px] font-normal bg-white dark:bg-zinc-800 text-zinc-450 dark:text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50 px-1 py-0.5 rounded shadow-sm select-none pointer-events-none transition-colors group-hover:bg-[#ececf0] dark:group-hover:bg-zinc-700">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 text-xs font-semibold select-none">
            <button
              onClick={() => setLang('en')}
              className={`transition-colors uppercase tracking-wider ${lang === 'en' ? 'text-zinc-950 dark:text-white font-bold' : 'text-zinc-400 dark:text-zinc-500 font-normal hover:text-zinc-650'}`}
            >
              eng
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <button
              onClick={() => setLang('uz')}
              className={`transition-colors uppercase tracking-wider ${lang === 'uz' ? 'text-zinc-950 dark:text-white font-bold' : 'text-zinc-400 dark:text-zinc-500 font-normal hover:text-zinc-650'}`}
            >
              uz
            </button>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Sun size={15} className="text-amber-400" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Moon size={15} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-60 bg-white dark:bg-[#09090b] border-r border-zinc-200/50 dark:border-zinc-800/80 z-[60] flex-col justify-between p-3 select-none overflow-y-auto hide-scrollbar font-sans">
        <div className="flex flex-col">
          {/* Logo header */}
          <div className="flex items-center pt-0.5 pb-2 mb-3 px-1.5 border-b border-zinc-200/50 dark:border-zinc-800/80">
            <div className="cursor-pointer flex items-center select-none" onClick={() => navigate('/dashboard')}>
              <span className="text-2xl tracking-tight font-normal text-zinc-900 dark:text-zinc-50 font-sans">
                eng<span className="font-bold">lev.</span>
              </span>
            </div>
          </div>


          
          {/* Core Items (Home, Mock Exam, Results, Reyting) */}
          <div className="flex flex-col gap-1">
            {userData?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 mb-1"
              >
                <GraduationCap size={15} className="text-amber-500" />
                <span>Admin Panel</span>
              </button>
            )}
            {coreItems.map(renderMenuItem)}
          </div>

          {/* Teacher Section */}
          {renderTeacherSection(false)}

          {/* IELTS Section */}
          {renderIeltsSection(false)}

          {/* Resources Section Collapsible */}
          <div className="mt-4">
            <button 
              onClick={() => setIsResourcesOpen(!isResourcesOpen)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1 px-2.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left select-none"
            >
              {t('dashboard.resources')}
              <ChevronDown size={11} className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isResourcesOpen ? '' : '-rotate-90'}`} />
            </button>
            
            <AnimatePresence initial={false}>
              {isResourcesOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-1 gap-1 flex flex-col"
                >
                  {resourceItems.map(renderMenuItem)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* See what's included Plan Card */}
          <div 
            onClick={onPremiumClick || (() => navigate('/pricing'))}
            className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 bg-white dark:bg-zinc-900/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 group mt-4 mb-2"
          >
            <div className="flex-1 min-w-0 pr-1.5">
              <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white">{t('dashboard.upgradeTitle')}</p>
              <p className="text-[11px] font-normal text-zinc-450 dark:text-zinc-550 mt-0.5 group-hover:text-zinc-550 dark:group-hover:text-zinc-400">{t('dashboard.upgradeSubtitle')}</p>
            </div>
            <ChevronRight size={12} className="text-zinc-455 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogoutClick || logout}
            className="w-full mt-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-950/50 shadow-sm"
          >
            <LogOut size={15} className="text-red-500 shrink-0" />
            {t('dashboard.logout')}
          </button>

          {/* Divider */}
          <div className="h-px bg-zinc-150 dark:bg-zinc-800/50 my-1" />

          {/* Starred Collapsible Section */}
          <div className="mt-4">
            <button 
              onClick={() => setIsStarredOpen(!isStarredOpen)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1 px-2.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left select-none"
            >
              {t('dashboard.starred')}
              <ChevronDown size={11} className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isStarredOpen ? '' : '-rotate-90'}`} />
            </button>
            
            <AnimatePresence initial={false}>
              {isStarredOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-1 mt-1 flex flex-col"
                >
                  <button 
                    onClick={() => navigate('/speaking-ai')} 
                    className="w-full text-left text-[13px] font-normal text-zinc-700 dark:text-zinc-300 py-1.5 px-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white transition-all flex items-center gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ml-1 mr-0.5"></span>
                    {t('dashboard.speaking')}
                  </button>
                  {/* <button 
                    onClick={() => navigate('/roadmap')} 
                    className="w-full text-left text-[13px] font-normal text-zinc-700 dark:text-zinc-300 py-1.5 px-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white transition-all flex items-center gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 ml-1 mr-0.5"></span>
                    {t('dashboard.roadmap')}
                  </button> */}
                  <button 
                    onClick={() => navigate('/settings')} 
                    className="w-full text-left text-[13px] font-normal text-zinc-700 dark:text-zinc-300 py-1.5 px-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white transition-all flex items-center gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1 mr-0.5"></span>
                    {t('dashboard.settings')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* BOTTOM CONTAINER (UPGRADE CARD) */}
        {!isPremium && (
          <div className="bg-[#f4f5f8] dark:bg-zinc-900/70 border border-zinc-200/10 dark:border-zinc-800/40 rounded-xl p-3.5 text-center flex flex-col items-center gap-3 mt-4 shrink-0 font-sans">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm text-zinc-700 dark:text-zinc-300">
              <ArrowUp size={14} strokeWidth={2} />
            </div>
            <p className="text-[11.5px] text-zinc-650 dark:text-zinc-400 font-normal leading-normal px-0.5">
              {t('dashboard.upgradePrompt')}
            </p>
            <button 
              onClick={onPremiumClick || (() => navigate('/pricing'))}
              className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 active:scale-95 text-white font-medium py-1.5 rounded-lg text-xs transition-all shadow-md shadow-blue-500/10"
            >
              {t('dashboard.viewPlans')}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 left-0 right-0 h-12 bg-white dark:bg-[#09090b] border-b border-zinc-100 dark:border-zinc-900/80 z-[60] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          >
            <Menu size={20} />
          </button>
          <div className="cursor-pointer flex items-center select-none" onClick={() => navigate('/dashboard')}>
            <span className="text-xl tracking-tight font-normal text-zinc-900 dark:text-zinc-50 font-sans">
              eng<span className="font-bold">lev.</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher for Mobile */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold select-none">
            <button
              onClick={() => setLang('en')}
              className={`transition-colors uppercase tracking-wider ${lang === 'en' ? 'text-zinc-950 dark:text-white font-bold' : 'text-zinc-400 dark:text-zinc-500 font-normal hover:text-zinc-650'}`}
            >
              eng
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <button
              onClick={() => setLang('uz')}
              className={`transition-colors uppercase tracking-wider ${lang === 'uz' ? 'text-zinc-950 dark:text-white font-bold' : 'text-zinc-400 dark:text-zinc-500 font-normal hover:text-zinc-650'}`}
            >
              uz
            </button>
          </div>

          {/* Dark / Light Mode Toggle — Mobile */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span
                  key="sun-m"
                  initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Sun size={18} className="text-amber-400" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon-m"
                  initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Moon size={18} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          >
            <Search size={18} />
          </button>
          
          <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800" onClick={() => navigate('/settings')}>
            <img
              src={userData?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[260px] bg-white dark:bg-[#09090b] z-[100] shadow-2xl p-3 flex flex-col justify-between overflow-y-auto md:hidden font-sans"
            >
              <div className="flex flex-col gap-3">
                {/* Close button row */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
                  <div className="cursor-pointer flex items-center select-none" onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}>
                    <span className="text-xl tracking-tight font-normal text-zinc-900 dark:text-zinc-50 font-sans">
                      eng<span className="font-bold">lev.</span>
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>


                {/* Core Items (Home, Mock Exam, Results, Reyting) */}
                <div className="flex flex-col gap-1">
                  {userData?.role === 'admin' && (
                    <button
                      onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 mb-1"
                    >
                      <GraduationCap size={14} className="text-amber-500" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  {coreItems.map(renderMobileMenuItem)}
                </div>

                {/* Teacher Section */}
                {renderTeacherSection(true)}

                {/* IELTS Section */}
                {renderIeltsSection(true)}

                {/* Resources Section Collapsible */}
                <div className="mt-3">
                  <button 
                    onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1 px-2.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left select-none"
                  >
                    {t('dashboard.resources')}
                    <ChevronDown size={11} className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isResourcesOpen ? '' : '-rotate-90'}`} />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isResourcesOpen && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-1 gap-1 flex flex-col"
                      >
                        {resourceItems.map(renderMobileMenuItem)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* See what's included Plan Card */}
                <div 
                  onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                  className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-2.5 bg-white dark:bg-zinc-900/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 group mt-4 mb-2"
                >
                  <div className="flex-1 min-w-0 pr-1.5">
                    <p className="text-xs font-medium text-zinc-850 dark:text-zinc-205 group-hover:text-black dark:group-hover:text-white">{t('dashboard.upgradeTitle')}</p>
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5 group-hover:text-zinc-555 dark:group-hover:text-zinc-400">{t('dashboard.upgradeSubtitle')}</p>
                  </div>
                  <ChevronRight size={12} className="text-zinc-455 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => { if (onLogoutClick) onLogoutClick(); else logout(); setIsMobileMenuOpen(false); }}
                  className="w-full mt-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-950/50 shadow-sm"
                >
                  <LogOut size={14} className="text-red-500 shrink-0" />
                  {t('dashboard.logout')}
                </button>

                {/* Divider */}
                <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 my-1" />

                {/* Starred Collapsible Section */}
                <div className="mt-3">
                  <button 
                    onClick={() => setIsStarredOpen(!isStarredOpen)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1 px-2.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left select-none"
                  >
                    {t('dashboard.starred')}
                    <ChevronDown size={11} className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isStarredOpen ? '' : '-rotate-90'}`} />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isStarredOpen && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-1 mt-1 flex flex-col"
                      >
                        <button 
                          onClick={() => { navigate('/speaking-ai'); setIsMobileMenuOpen(false); }} 
                          className="w-full text-left text-xs font-medium text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                          {t('dashboard.speaking')}
                        </button>
                        {/* <button 
                          onClick={() => { navigate('/roadmap'); setIsMobileMenuOpen(false); }} 
                          className="w-full text-left text-xs font-medium text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                          {t('dashboard.roadmap')}
                        </button> */}
                        <button 
                          onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} 
                          className="w-full text-left text-xs font-medium text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          {t('dashboard.settings')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* BOTTOM CONTAINER (UPGRADE CARD) */}
              {!isPremium && (
                <div className="bg-[#f4f5f8] dark:bg-zinc-900/80 border border-zinc-200/20 dark:border-zinc-800/50 rounded-xl p-3 text-center flex flex-col items-center gap-2.5 mt-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm text-zinc-700 dark:text-zinc-300">
                    <ArrowUp size={14} strokeWidth={2} />
                  </div>
                  <p className="text-[11.5px] text-zinc-550 dark:text-zinc-400 font-medium leading-normal px-0.5">
                    {t('dashboard.upgradePrompt')}
                  </p>
                  <button 
                    onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                    className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 active:scale-95 text-white font-medium py-1.5 rounded-lg text-xs transition-all shadow-md shadow-blue-500/10"
                  >
                    {t('dashboard.viewPlans')}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
