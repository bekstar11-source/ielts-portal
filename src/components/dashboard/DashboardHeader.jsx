import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  ChevronsUpDown,
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
  Plus,
  Award
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
  const [isTeacherSectionOpen, setIsTeacherSectionOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isMac = typeof window !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

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

    const subTextClass = isMobile ? 'text-[12px] py-1' : 'text-[13px] py-1';
    const iconSize = isMobile ? 13 : 14;

    const skillRow = (Icon, iconColor, label, active, onClick) => (
      <button
        onClick={onClick}
        className={`w-full text-left px-2 py-1.5 ${subTextClass} rounded-lg transition-all duration-200 flex items-center gap-2 font-medium group ${
          active
            ? 'text-warm-primary dark:text-white bg-warm-primary/10 dark:bg-warm-primary'
            : 'text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5'
        }`}
      >
        <Icon size={iconSize} style={{ color: active ? undefined : iconColor }} className={active ? 'text-warm-primary dark:text-white' : ''} />
        {label}
      </button>
    );

    return (
      <div className={isMobile ? "mt-3 flex flex-col gap-2.5" : "mt-4 flex flex-col gap-3"}>
        {/* IELTS Group Header */}
        <div className="text-[9px] font-bold text-warm-muted-soft dark:text-warm-muted uppercase tracking-widest px-2.5 select-none">
          IELTS
        </div>

        {/* Full Tests card */}
        <div className="flex flex-col gap-1.5 bg-warm-surface dark:bg-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-2 px-1 text-[9px] font-bold text-warm-muted-soft dark:text-warm-muted uppercase tracking-widest select-none">
            <ClipboardList size={13} />
            <span>{t('dashboard.fullTests')}</span>
          </div>
          <div className="flex flex-col">
            {skillRow(BookOpen, '#31a24c', t('dashboard.reading'), isFullReadingActive, () => handleSubItemClick('/reading/full'))}
            {skillRow(Headphones, '#f2a918', t('dashboard.listening'), isFullListeningActive, () => handleSubItemClick('/listening/full'))}
            {skillRow(PenTool, '#0071e3', t('dashboard.writing'), isFullWritingActive, () => handleSubItemClick('/practice?tab=writing&type=full'))}
          </div>
        </div>

        {/* Part Tests card */}
        <div className="flex flex-col gap-1.5 bg-warm-canvas dark:bg-transparent border border-warm-hairline dark:border-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-2 px-1 text-[9px] font-bold text-warm-muted-soft dark:text-warm-muted uppercase tracking-widest select-none">
            <Layers size={13} />
            <span>{t('dashboard.partTests')}</span>
          </div>
          <div className="flex flex-col">
            {skillRow(BookOpen, '#31a24c', t('dashboard.reading'), isPartReadingActive, () => handleSubItemClick('/reading/parts'))}
            {skillRow(Headphones, '#f2a918', t('dashboard.listening'), isPartListeningActive, () => handleSubItemClick('/listening/parts'))}
            {skillRow(PenTool, '#0071e3', t('dashboard.writing'), isPartWritingActive, () => handleSubItemClick('/practice?tab=writing&type=part'))}
          </div>
        </div>

        {/* Speaking */}
        <button
          onClick={() => handleSubItemClick('/speaking-ai')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
            isSpeakingActive
              ? 'bg-warm-primary/10 dark:bg-warm-primary text-warm-primary dark:text-white'
              : 'text-warm-muted dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/5 hover:text-warm-ink dark:hover:text-warm-on-dark'
          }`}
        >
          <Mic size={15} style={{ color: isSpeakingActive ? undefined : '#e41e3f' }} className={isSpeakingActive ? 'text-warm-primary dark:text-white' : ''} />
          <span>{t('dashboard.speaking')}</span>
        </button>
      </div>
    );
  };

  const renderTeacherSection = (isMobile = false) => {
    if (userData?.role !== 'teacher') return null;

    const items = [
      { id: 't_dashboard', label: "Dashboard", path: '/teacher', icon: LayoutDashboard },
      { id: 't_mock', label: t('dashboard.mockExam') || "Mock Exam", path: '/mock', icon: Computer },
      { id: 't_tests', label: "Tayinlangan Testlar", path: '/teacher/tests', icon: BookOpen },
      { id: 't_create_writing', label: "Writing Yaratish", path: '/teacher/create-writing', icon: Plus },
      { id: 't_writing_review', label: "Writing Tekshirish", path: '/teacher/writing-review', icon: PenTool },
      { id: 't_stats', label: "Guruh Statistikasi", path: '/teacher/group-stats', icon: BarChart2 },
      { id: 't_my_results', label: "Mening Natijalarim", path: '/my-results', icon: Award },
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
          className="flex items-center gap-1.5 text-[11px] font-semibold text-warm-muted-soft dark:text-warm-on-dark-soft uppercase tracking-wider px-2.5 select-none hover:text-warm-body dark:hover:text-warm-on-dark transition-colors w-full text-left"
        >
          <span>USTOZ PANELI</span>
          <ChevronDown size={11} className={`text-warm-muted-soft dark:text-warm-on-dark-soft transition-transform duration-200 ${isTeacherSectionOpen ? '' : '-rotate-90'}`} />
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
                        : 'text-warm-body dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-warm-muted dark:text-warm-on-dark-soft group-hover:text-warm-ink dark:group-hover:text-warm-on-dark transition-colors'} />
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
    const isMock = item.id === 'mock';

    let buttonClasses = isMock
      ? 'mock-exam-shimmer'
      : active
        ? 'bg-warm-primary/10 dark:bg-warm-primary text-warm-primary dark:text-white dark:shadow-lg dark:shadow-warm-primary/20'
        : 'text-warm-muted dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/5 hover:text-warm-ink dark:hover:text-warm-on-dark';

    let iconClasses = isMock
      ? 'text-[#c5a880] transition-colors'
      : active
        ? 'text-warm-primary dark:text-white'
        : 'text-warm-muted-soft dark:text-warm-on-dark-soft';

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
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${buttonClasses}`}
      >
        <Icon size={15} strokeWidth={active ? 2.5 : 2} className={iconClasses} />
        {getLabel(item.id, item.label)}
      </button>
    );
  };

  const renderMobileMenuItem = (item) => {
    const active = isTabActive(item);
    const Icon = item.icon;
    const isMock = item.id === 'mock';

    let buttonClasses = isMock
      ? 'mock-exam-shimmer'
      : active
        ? 'bg-warm-primary/10 dark:bg-warm-primary/20 text-warm-primary dark:text-warm-primary'
        : 'text-warm-body dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/5 hover:text-warm-ink dark:hover:text-warm-on-dark';

    let iconClasses = isMock
      ? 'text-[#c5a880] transition-colors'
      : active
        ? 'text-warm-primary dark:text-warm-primary'
        : 'text-warm-muted-soft dark:text-warm-on-dark-soft';

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
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${buttonClasses}`}
      >
        <Icon size={14} className={iconClasses} />
        {getLabel(item.id, item.label)}
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
    if (item.path) {
      return location.pathname === item.path || location.pathname.startsWith(item.path);
    }
    return activeTab === item.id;
  };

  const handleNavigation = (item) => {
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
      <header className="hidden md:flex fixed top-0 left-60 right-0 h-12 bg-warm-canvas dark:bg-warm-dark border-b border-warm-hairline dark:border-white/5 items-center justify-between px-6 z-50">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[13px] font-normal text-warm-muted-soft dark:text-warm-on-dark-soft select-none">
          <span className="text-warm-body dark:text-warm-on-dark font-medium">
            {parent}
          </span>
          <span className="text-warm-hairline dark:text-white/20">/</span>
          <span className="text-warm-muted-soft dark:text-warm-on-dark-soft font-light">
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
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-muted-soft dark:text-warm-on-dark-soft transition-colors group-hover:text-warm-body dark:group-hover:text-warm-on-dark" />
            <input
              type="text"
              readOnly
              placeholder={searchPlaceholder}
              className="w-full bg-warm-surface dark:bg-warm-dark-elevated hover:bg-warm-card dark:hover:bg-white/10 text-warm-body dark:text-warm-on-dark text-xs rounded-lg pl-8 pr-12 py-1.5 outline-none cursor-pointer transition-colors border border-transparent placeholder-warm-muted-soft dark:placeholder-warm-on-dark-soft"
            />
            <kbd className="absolute right-2 text-[9px] font-normal bg-warm-canvas dark:bg-white/10 text-warm-muted-soft dark:text-warm-on-dark-soft border border-warm-hairline dark:border-white/10 px-1 py-0.5 rounded shadow-sm select-none pointer-events-none transition-colors group-hover:bg-warm-card dark:group-hover:bg-white/15">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 text-xs font-semibold select-none">
            <button
              onClick={() => setLang('en')}
              className={`transition-colors uppercase tracking-wider ${lang === 'en' ? 'text-warm-ink dark:text-warm-on-dark font-bold' : 'text-warm-muted-soft dark:text-warm-on-dark-soft font-normal hover:text-warm-body'}`}
            >
              eng
            </button>
            <span className="text-warm-hairline dark:text-white/20">/</span>
            <button
              onClick={() => setLang('uz')}
              className={`transition-colors uppercase tracking-wider ${lang === 'uz' ? 'text-warm-ink dark:text-warm-on-dark font-bold' : 'text-warm-muted-soft dark:text-warm-on-dark-soft font-normal hover:text-warm-body'}`}
            >
              uz
            </button>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 text-warm-muted dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/10 hover:text-warm-ink dark:hover:text-warm-on-dark"
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
      </header>      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-60 bg-warm-canvas dark:bg-warm-dark-elevated border-r border-warm-hairline dark:border-white/5 z-[60] flex-col justify-between select-none font-sans">
        {/* Fixed Logo Header */}
        <div className="h-14 flex items-center px-[18px] flex-shrink-0 border-b border-warm-hairline dark:border-white/5">
          <div className="cursor-pointer flex items-center gap-2.5 select-none" onClick={() => navigate('/dashboard')}>
            <div className="w-7 h-7 bg-warm-primary rounded-lg flex items-center justify-center text-white flex-shrink-0 text-xs font-black">E</div>
            <span className="text-lg tracking-tight font-normal text-warm-ink dark:text-warm-on-dark font-sans">
              eng<span className="font-bold">lev.</span>
            </span>
          </div>
        </div>

        {/* Scrollable sidebar content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-3 flex flex-col gap-4">
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
            {userData?.role !== 'teacher' && coreItems.map(renderMenuItem)}
          </div>

          {/* Teacher Section */}
          {renderTeacherSection(false)}

          {/* IELTS Section */}
          {renderIeltsSection(false)}

          {/* Resources Section */}
          <div className="mt-4">
            <div className="text-[9px] font-bold text-warm-muted-soft dark:text-warm-muted uppercase tracking-widest py-1 px-2.5 select-none">
              {t('dashboard.resources')}
            </div>
            <div className="mt-1 gap-0.5 flex flex-col">
              {resourceItems.map(renderMenuItem)}
            </div>
          </div>

          {/* Account footer group */}
          <div className="mt-4 pt-3 border-t border-warm-hairline dark:border-white/5 flex flex-col gap-2">
            {/* See what's included Plan Card */}
            {userData?.role !== 'teacher' && (
              <div
                onClick={onPremiumClick || (() => navigate('/pricing'))}
                className="border border-warm-hairline dark:border-white/5 rounded-xl p-3 bg-warm-canvas dark:bg-white/[0.02] flex items-center justify-between cursor-pointer hover:bg-warm-surface dark:hover:bg-white/5 transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0 pr-1.5">
                  <p className="text-[13px] font-semibold text-warm-ink dark:text-warm-on-dark group-hover:text-warm-ink dark:group-hover:text-warm-on-dark">{t('dashboard.upgradeTitle')}</p>
                  <p className="text-[11px] font-normal text-warm-muted-soft dark:text-warm-on-dark-soft mt-0.5">{t('dashboard.upgradeSubtitle')}</p>
                </div>
                <ChevronRight size={12} className="text-warm-muted-soft dark:text-warm-on-dark-soft shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogoutClick || logout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut size={15} className="text-red-500 shrink-0" />
              {t('dashboard.logout')}
            </button>
          </div>

          {/* BOTTOM CONTAINER (UPGRADE CARD) */}
          {!isPremium && userData?.role !== 'teacher' && (
            <div className="bg-warm-surface dark:bg-white/5 border border-warm-hairline dark:border-white/5 rounded-xl p-3.5 text-center flex flex-col items-center gap-3 mt-4 shrink-0 font-sans">
              <div className="w-8 h-8 rounded-lg bg-warm-primary/10 dark:bg-warm-primary/20 flex items-center justify-center text-warm-primary">
                <ArrowUp size={14} strokeWidth={2.5} />
              </div>
              <p className="text-[11.5px] text-warm-muted dark:text-warm-on-dark-soft font-normal leading-normal px-0.5">
                {t('dashboard.upgradePrompt')}
              </p>
              <button
                onClick={onPremiumClick || (() => navigate('/pricing'))}
                className="w-full bg-warm-primary hover:bg-warm-primary-active active:scale-95 text-white font-semibold py-1.5 rounded-lg text-xs transition-all shadow-lg shadow-warm-primary/20"
              >
                {t('dashboard.viewPlans')}
              </button>
            </div>
          )}
        </div>

        {/* Fixed Footer: Profile Widget */}
        <div className="p-2 bg-warm-canvas dark:bg-warm-dark-elevated border-t border-warm-hairline dark:border-white/5 flex-shrink-0">
          <div
            onClick={() => navigate('/settings')}
            className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-warm-surface dark:hover:bg-white/5 cursor-pointer transition-all duration-200 select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-warm-hairline dark:border-white/10 shrink-0">
                <img
                  src={userData?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userData?.fullName || 'student'}`;
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-warm-ink dark:text-warm-on-dark truncate">
                  {userData?.fullName || user?.displayName || "IELTS Candidate"}
                </span>
                <span className="text-[11px] text-warm-muted-soft dark:text-warm-on-dark-soft truncate leading-none mt-0.5">
                  {user?.email || userData?.email || ""}
                </span>
              </div>
            </div>
            <ChevronsUpDown size={13} className="text-warm-muted-soft dark:text-warm-on-dark-soft shrink-0" />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 left-0 right-0 h-12 bg-warm-canvas dark:bg-warm-dark border-b border-warm-hairline dark:border-white/5 z-[60] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark"
          >
            <Menu size={20} />
          </button>
          <div className="cursor-pointer flex items-center select-none" onClick={() => navigate('/dashboard')}>
            <span className="text-xl tracking-tight font-normal text-warm-ink dark:text-warm-on-dark font-sans">
              eng<span className="font-bold">lev.</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher for Mobile */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold select-none">
            <button
              onClick={() => setLang('en')}
              className={`transition-colors uppercase tracking-wider ${lang === 'en' ? 'text-warm-ink dark:text-warm-on-dark font-bold' : 'text-warm-muted-soft dark:text-warm-on-dark-soft font-normal hover:text-warm-body'}`}
            >
              eng
            </button>
            <span className="text-warm-hairline dark:text-white/20">/</span>
            <button
              onClick={() => setLang('uz')}
              className={`transition-colors uppercase tracking-wider ${lang === 'uz' ? 'text-warm-ink dark:text-warm-on-dark font-bold' : 'text-warm-muted-soft dark:text-warm-on-dark-soft font-normal hover:text-warm-body'}`}
            >
              uz
            </button>
          </div>

          {/* Dark / Light Mode Toggle — Mobile */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-warm-muted dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/10 transition-all"
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
            className="p-1 text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark"
          >
            <Search size={18} />
          </button>

          <div className="w-7 h-7 rounded-full overflow-hidden border border-warm-hairline dark:border-white/10" onClick={() => navigate('/settings')}>
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
              className="fixed top-0 left-0 bottom-0 w-[260px] bg-warm-canvas dark:bg-warm-dark z-[100] shadow-2xl p-3 flex flex-col justify-between overflow-y-auto md:hidden font-sans"
            >
              <div className="flex flex-col gap-3">
                {/* Close button row */}
                <div className="flex items-center justify-between pb-2 border-b border-warm-hairline dark:border-white/5">
                  <div className="cursor-pointer flex items-center select-none" onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}>
                    <span className="text-xl tracking-tight font-normal text-warm-ink dark:text-warm-on-dark font-sans">
                      eng<span className="font-bold">lev.</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-warm-muted-soft hover:text-warm-ink dark:hover:text-warm-on-dark rounded-full hover:bg-warm-surface dark:hover:bg-white/10 transition-colors"
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
                  {userData?.role !== 'teacher' && coreItems.map(renderMobileMenuItem)}
                </div>



                {/* Teacher Section */}
                {renderTeacherSection(true)}

                {/* IELTS Section */}
                {renderIeltsSection(true)}

                {/* Resources Section */}
                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-warm-muted-soft dark:text-warm-on-dark-soft uppercase tracking-wider py-1 px-2.5 select-none">
                    {t('dashboard.resources')}
                  </div>
                  <div className="mt-1 gap-1 flex flex-col">
                    {resourceItems.map(renderMobileMenuItem)}
                  </div>
                </div>

                {/* Account footer group */}
                <div className="mt-4 pt-3 border-t border-warm-hairline dark:border-white/10 flex flex-col gap-2">
                  {/* See what's included Plan Card */}
                  {userData?.role !== 'teacher' && (
                    <div
                      onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                      className="border border-warm-hairline dark:border-white/10 rounded-xl p-2.5 bg-warm-canvas dark:bg-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between cursor-pointer hover:bg-warm-surface dark:hover:bg-white/10 hover:border-warm-primary/30 dark:hover:border-warm-primary/30 transition-all duration-200 group"
                    >
                      <div className="flex-1 min-w-0 pr-1.5">
                        <p className="text-xs font-medium text-warm-ink dark:text-warm-on-dark group-hover:text-warm-ink dark:group-hover:text-warm-on-dark">{t('dashboard.upgradeTitle')}</p>
                        <p className="text-[10px] font-medium text-warm-muted-soft dark:text-warm-on-dark-soft mt-0.5 group-hover:text-warm-muted dark:group-hover:text-warm-on-dark-soft">{t('dashboard.upgradeSubtitle')}</p>
                      </div>
                      <ChevronRight size={12} className="text-warm-muted-soft shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={() => { if (onLogoutClick) onLogoutClick(); else logout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-950/50 shadow-sm"
                  >
                    <LogOut size={14} className="text-red-500 shrink-0" />
                    {t('dashboard.logout')}
                  </button>
                </div>
              </div>

              {/* BOTTOM CONTAINER (UPGRADE CARD) */}
              {!isPremium && userData?.role !== 'teacher' && (
                <div className="bg-warm-surface dark:bg-white/5 border border-warm-hairline dark:border-white/10 rounded-xl p-3 text-center flex flex-col items-center gap-2.5 mt-3">
                  <div className="w-8 h-8 rounded-full bg-warm-canvas dark:bg-white/10 flex items-center justify-center border border-warm-hairline dark:border-white/10 shadow-sm text-warm-body dark:text-warm-on-dark-soft">
                    <ArrowUp size={14} strokeWidth={2} />
                  </div>
                  <p className="text-[11.5px] text-warm-muted dark:text-warm-on-dark-soft font-medium leading-normal px-0.5">
                    {t('dashboard.upgradePrompt')}
                  </p>
                  <button
                    onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                    className="w-full bg-warm-primary hover:bg-warm-primary-active active:scale-95 text-white font-medium py-1.5 rounded-lg text-xs transition-all shadow-md shadow-warm-primary/20"
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
      <AnimatePresence>
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
