import React, { useState, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
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
  ClipboardList,
  Moon,
  Sun,
  LayoutDashboard,
  FilePlus,
  Plus,
  Award,
  Users
} from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getTier, canAccessPremiumContent } from '../../utils/subscription';
import { useSpotlightNotice } from '../../hooks/useSpotlightNotice';

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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isMac = typeof window !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

  useEffect(() => {
    // Add layout shift class to body when sidebar is active
    document.body.classList.add('student-sidebar-active');
    document.body.classList.toggle('student-sidebar-collapsed', isCollapsed);
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    return () => {
      document.body.classList.remove('student-sidebar-active');
      document.body.classList.remove('student-sidebar-collapsed');
    };
  }, [isCollapsed]);

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

  // Bosh sahifadagi o'qilmagan e'lon — sidebar/Bell'dagi qizil nuqta.
  const { hasNew: hasNewSpotlight, latest: latestSpotlight } = useSpotlightNotice(user);
  const spotlightPath = latestSpotlight ? `/dashboard?spotlight=${latestSpotlight.id}` : '/dashboard';

  const coreItems = [
    // Ilgari bosh sahifaga faqat logotip orqali qaytish mumkin edi — desktopda
    // bu ko'rinmas yo'l edi, shuning uchun aniq punkt qo'shildi.
    { id: 'dashboard', label: 'Bosh sahifa', path: '/dashboard', icon: Home },
    { id: 'mock', label: 'Mock Exam', path: '/mock', icon: Computer },
    { id: 'results', label: 'Results', path: '/my-results', icon: BarChart2 },
    // { id: 'leaderboard', label: 'Reyting', path: '/leaderboard', icon: TrendingUp },
  ];

  const resourceItems = [
    { id: 'podcasts', label: 'Podcasts', path: '/podcasts', icon: Headphones },
    { id: 'articles', label: 'Articles', path: '/articles', icon: Newspaper },
    { id: 'vocabulary', label: 'WordBank', path: '/vocabulary', icon: BookMarked },
    { id: 'pricing', label: 'Pricing', path: '/pricing', icon: CreditCard },
  ];

  const renderIeltsSection = (isMobile = false, isCollapsed = false) => {
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

    const subTextClass = 'text-sm';
    const iconSize = isMobile ? 16 : 18;

    const skillRow = (Icon, label, active, onClick) => (
      isCollapsed ? (
        <button
          onClick={onClick}
          title={label}
          className={`w-full flex items-center justify-center py-2 rounded-lg transition-all duration-200 ${
            active
              ? 'text-warm-primary dark:text-white bg-[#F0EAE0] dark:bg-warm-primary'
              : 'text-warm-muted-soft dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5'
          }`}
        >
          <Icon size={iconSize} strokeWidth={2} />
        </button>
      ) : (
        <button
          onClick={onClick}
          className={`w-full text-left px-sm py-1.5 ${subTextClass} rounded-lg transition-all duration-200 flex items-center gap-2.5 group ${
            active
              ? 'text-warm-primary dark:text-white bg-[#F0EAE0] dark:bg-warm-primary font-semibold'
              : 'text-warm-body dark:text-warm-on-dark-soft font-medium hover:text-warm-ink dark:hover:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5'
          }`}
        >
          <Icon size={iconSize} strokeWidth={2} className={active ? 'text-warm-primary dark:text-white' : 'text-warm-muted-soft dark:text-warm-on-dark-soft'} />
          {label}
        </button>
      )
    );

    const sectionLabel = (label) => (
      <div className="text-xs font-medium text-warm-muted-soft dark:text-warm-muted px-sm mb-1.5 select-none">
        {label}
      </div>
    );

    if (isCollapsed) {
      return (
        <div className="mt-3.5 flex flex-col gap-xxs">
          {skillRow(BookOpen, t('dashboard.reading'), isFullReadingActive, () => handleSubItemClick('/reading/full'))}
          {skillRow(Headphones, t('dashboard.listening'), isFullListeningActive, () => handleSubItemClick('/listening/full'))}
          {skillRow(PenTool, t('dashboard.writing'), isFullWritingActive, () => handleSubItemClick('/practice?tab=writing&type=full'))}
          <div className="h-px bg-warm-hairline dark:bg-white/10 my-1" />
          {skillRow(BookOpen, t('dashboard.reading'), isPartReadingActive, () => handleSubItemClick('/reading/parts'))}
          {skillRow(Headphones, t('dashboard.listening'), isPartListeningActive, () => handleSubItemClick('/listening/parts'))}
          {skillRow(PenTool, t('dashboard.writing'), isPartWritingActive, () => handleSubItemClick('/practice?tab=writing&type=part'))}
          <div className="h-px bg-warm-hairline dark:bg-white/10 my-1" />
          {skillRow(Mic, t('dashboard.speaking'), isSpeakingActive, () => handleSubItemClick('/speaking-ai'))}
        </div>
      );
    }

    return (
      <div className="mt-3.5 flex flex-col gap-3.5">
        {/* Full Tests */}
        <div>
          {sectionLabel(t('dashboard.fullTests'))}
          <div className="flex flex-col gap-xxs">
            {skillRow(BookOpen, t('dashboard.reading'), isFullReadingActive, () => handleSubItemClick('/reading/full'))}
            {skillRow(Headphones, t('dashboard.listening'), isFullListeningActive, () => handleSubItemClick('/listening/full'))}
            {skillRow(PenTool, t('dashboard.writing'), isFullWritingActive, () => handleSubItemClick('/practice?tab=writing&type=full'))}
          </div>
        </div>

        {/* Part Tests */}
        <div>
          {sectionLabel(t('dashboard.partTests'))}
          <div className="flex flex-col gap-xxs">
            {skillRow(BookOpen, t('dashboard.reading'), isPartReadingActive, () => handleSubItemClick('/reading/parts'))}
            {skillRow(Headphones, t('dashboard.listening'), isPartListeningActive, () => handleSubItemClick('/listening/parts'))}
            {skillRow(PenTool, t('dashboard.writing'), isPartWritingActive, () => handleSubItemClick('/practice?tab=writing&type=part'))}
          </div>
        </div>

        {/* Speaking */}
        {skillRow(Mic, t('dashboard.speaking'), isSpeakingActive, () => handleSubItemClick('/speaking-ai'))}
      </div>
    );
  };

  const renderTeacherSection = (isMobile = false, isCollapsed = false) => {
    if (userData?.role !== 'teacher') return null;

    const items = [
      { id: 't_dashboard', label: "Dashboard", path: '/teacher', icon: LayoutDashboard },
      { id: 't_mock', label: t('dashboard.mockExam') || "Mock Exam", path: '/mock', icon: Computer },
      { id: 't_tests', label: "Tayinlangan Testlar", path: '/teacher/tests', icon: BookOpen },
      { id: 't_create_writing', label: "Writing Yaratish", path: '/teacher/create-writing', icon: Plus },
      { id: 't_writing_review', label: "Writing Tekshirish", path: '/teacher/writing-review', icon: PenTool },
      { id: 't_speaking_review', label: "Speaking Tekshirish", path: '/teacher/speaking-review', icon: Mic },
      { id: 't_stats', label: "Guruh Statistikasi", path: '/teacher/group-stats', icon: BarChart2 },
      { id: 't_students', label: "O'quvchilar", path: '/teacher/group-stats?view=students', icon: Users },
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

    const iconSize = isMobile ? 16 : 18;

    // "Guruh statistikasi" va "O'quvchilar" bitta sahifaning ikki ko'rinishi —
    // shuning uchun faqat pathname yetarli emas, `?view=` ham solishtiriladi.
    const isTeacherItemActive = (item) => {
      const [path, search] = item.path.split('?');
      if (location.pathname !== path) {
        return item.path === '/teacher' && location.pathname === '/teacher/';
      }
      const currentView = new URLSearchParams(location.search).get('view');
      const itemView = new URLSearchParams(search || '').get('view');
      return (currentView || null) === (itemView || null);
    };

    if (isCollapsed) {
      return (
        <div className="mt-lg flex flex-col gap-xxs">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = isTeacherItemActive(item);
            return (
              <button
                key={item.id}
                title={item.label}
                onClick={() => handleItemClick(item.path)}
                className={`w-full flex items-center justify-center py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-warm-primary dark:text-white bg-[#F0EAE0] dark:bg-warm-primary'
                    : 'text-warm-muted-soft dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5'
                }`}
              >
                <Icon size={iconSize} strokeWidth={2} className={isActive ? 'text-warm-primary dark:text-white' : 'text-warm-muted-soft dark:text-warm-on-dark-soft'} />
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="mt-lg flex flex-col gap-sm">
        <button
          onClick={() => setIsTeacherSectionOpen(!isTeacherSectionOpen)}
          className="flex items-center gap-xs text-xs font-medium text-warm-muted-soft dark:text-warm-muted px-sm select-none hover:text-warm-body dark:hover:text-warm-on-dark transition-colors w-full text-left"
        >
          <span>Ustoz paneli</span>
          <ChevronDown size={13} className={`text-warm-muted-soft dark:text-warm-on-dark-soft transition-transform duration-200 ${isTeacherSectionOpen ? '' : '-rotate-90'}`} />
        </button>

        <AnimatePresence initial={false}>
          {isTeacherSectionOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden flex flex-col gap-xxs"
            >
              {items.map(item => {
                const Icon = item.icon;
                const isActive = isTeacherItemActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.path)}
                    className={`w-full text-left ${isMobile ? 'px-sm' : 'px-3'} py-1.5 text-sm rounded-lg transition-all duration-200 flex items-center gap-2.5 group ${
                      isActive
                        ? 'text-warm-primary dark:text-white bg-[#F0EAE0] dark:bg-warm-primary font-semibold'
                        : 'text-warm-body dark:text-warm-on-dark-soft font-medium hover:text-warm-ink dark:hover:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={iconSize} strokeWidth={2} className={isActive ? 'text-warm-primary dark:text-white' : 'text-warm-muted-soft dark:text-warm-on-dark-soft group-hover:text-warm-ink dark:group-hover:text-warm-on-dark transition-colors'} />
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

  const renderMenuItem = (item, isCollapsed = false) => {
    const active = isTabActive(item);
    const Icon = item.icon;
    const isMock = item.id === 'mock';
    const label = getLabel(item.id, item.label);

    let buttonClasses = isMock
      ? 'mock-exam-shimmer font-semibold'
      : active
        ? 'bg-[#F0EAE0] dark:bg-warm-primary text-warm-primary dark:text-white font-semibold dark:shadow-lg dark:shadow-warm-primary/20'
        : 'text-warm-body dark:text-warm-on-dark-soft font-medium hover:bg-warm-surface dark:hover:bg-white/5 hover:text-warm-ink dark:hover:text-warm-on-dark';

    let iconClasses = isMock
      ? 'text-[#c5a880] transition-colors'
      : active
        ? 'text-warm-primary dark:text-white'
        : 'text-warm-muted-soft dark:text-warm-on-dark-soft';

    return (
      <button
        key={item.id}
        title={isCollapsed ? label : undefined}
        onClick={() => handleNavigation(item)}
        className={`w-full flex items-center rounded-lg text-sm transition-all duration-200 ${isCollapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-1.5'} ${buttonClasses}`}
      >
        <span className="relative flex-shrink-0">
          <Icon size={18} strokeWidth={2} className={iconClasses} />
          {item.id === 'dashboard' && hasNewSpotlight && isCollapsed && (
            <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-warm-primary ring-2 ring-warm-canvas dark:ring-warm-dark-elevated" />
          )}
        </span>
        {!isCollapsed && label}
        {item.id === 'dashboard' && hasNewSpotlight && !isCollapsed && (
          <span className="ml-auto rounded-full bg-warm-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Yangi
          </span>
        )}
      </button>
    );
  };

  const renderMobileMenuItem = (item) => {
    const active = isTabActive(item);
    const Icon = item.icon;
    const isMock = item.id === 'mock';

    let buttonClasses = isMock
      ? 'mock-exam-shimmer font-semibold'
      : active
        ? 'bg-[#F0EAE0] dark:bg-warm-primary/20 text-warm-primary dark:text-warm-primary font-semibold'
        : 'text-warm-body dark:text-warm-on-dark-soft font-medium hover:bg-warm-surface dark:hover:bg-white/5 hover:text-warm-ink dark:hover:text-warm-on-dark';

    let iconClasses = isMock
      ? 'text-[#c5a880] transition-colors'
      : active
        ? 'text-warm-primary dark:text-warm-primary'
        : 'text-warm-muted-soft dark:text-warm-on-dark-soft';

    return (
      <button
        key={item.id}
        onClick={() => { handleNavigation(item); setIsMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-2.5 px-sm py-1.5 rounded-lg text-sm transition-all ${buttonClasses}`}
      >
        <Icon size={16} strokeWidth={2} className={iconClasses} />
        {getLabel(item.id, item.label)}
        {item.id === 'dashboard' && hasNewSpotlight && (
          <span className="ml-auto rounded-full bg-warm-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Yangi
          </span>
        )}
      </button>
    );
  };

  // Tarif obuna MUDDATI bilan hisoblanadi (utils/subscription) — ilgari
  // bu yerda faqat bayroqlar o'qilib, muddati o'tgan obuna ham amal qilardi.
  const tier = getTier(userData);
  const isPro = tier === 'pro';
  const isStandard = tier === 'standard';
  const isPremium = canAccessPremiumContent(userData);

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
    // Yangi e'lon bo'lsa — bosh sahifaga o'sha slaydga yo'naltirib kiramiz.
    if (item.id === 'dashboard' && hasNewSpotlight) {
      navigate(spotlightPath);
      return;
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
      <header className={`hidden md:flex fixed top-0 right-0 h-12 bg-warm-canvas dark:bg-warm-dark border-b border-warm-hairline dark:border-white/5 items-center justify-between px-lg z-50 transition-[left] duration-200 ${isCollapsed ? 'left-[72px]' : 'left-60'}`}>
        {/* Breadcrumbs */}
        <div className="flex items-center gap-xs text-[13px] font-normal text-warm-muted-soft dark:text-warm-on-dark-soft select-none">
          <span className="text-warm-body dark:text-warm-on-dark font-medium">
            {parent}
          </span>
          <span className="text-warm-hairline dark:text-white/20">/</span>
          <span className="text-warm-muted-soft dark:text-warm-on-dark-soft font-light">
            {child}
          </span>
        </div>

        {/* Right Header Section */}
        <div className="flex items-center gap-md">
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

          {/* E'lonlar qo'ng'irog'i — bosh sahifadagi spotlightga olib boradi */}
          <button
            onClick={() => navigate(spotlightPath)}
            title={hasNewSpotlight ? `Yangi e'lon: ${latestSpotlight?.title}` : "Bosh sahifadagi e'lonlar"}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 text-warm-muted dark:text-warm-on-dark-soft hover:bg-warm-surface dark:hover:bg-white/10 hover:text-warm-ink dark:hover:text-warm-on-dark"
          >
            <Bell size={15} />
            {hasNewSpotlight && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warm-primary ring-2 ring-warm-canvas dark:ring-warm-dark animate-pulse" />
            )}
          </button>

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
      <aside className={`hidden md:flex fixed top-0 left-0 bottom-0 bg-warm-canvas dark:bg-warm-dark-elevated border-r border-warm-hairline dark:border-white/5 z-[60] flex-col justify-between select-none font-sans transition-[width] duration-200 ${isCollapsed ? 'w-[72px]' : 'w-60'}`}>
        {/* Collapse / Expand toggle */}
        <button
          onClick={() => setIsCollapsed(v => !v)}
          title={isCollapsed ? "Sidebar'ni ochish" : "Sidebar'ni yopish"}
          className="absolute -right-3 top-[22px] w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 shadow-md text-warm-muted-soft dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark hover:border-warm-primary/30 transition-all z-10"
        >
          <ChevronLeft size={14} className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Fixed Logo Header */}
        <div className={`h-14 flex items-center flex-shrink-0 ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <div className="cursor-pointer flex items-center gap-2 select-none" onClick={() => navigate('/dashboard')}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-warm-primary flex-shrink-0">
              <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58172 0 0 3.58172 0 8V20C0 24.4183 3.58172 28 8 28H20C24.4183 28 28 24.4183 28 20V8C28 3.58172 24.4183 0 20 0H8ZM14 20C17.3137 20 20 17.3137 20 14C20 10.6863 17.3137 8 14 8C10.6863 8 8 10.6863 8 14C8 17.3137 10.6863 20 14 20Z" fill="currentColor"/>
            </svg>
            {!isCollapsed && (
              <span className="text-[22px] tracking-tight font-bold text-warm-ink dark:text-warm-on-dark font-sans">
                Englev
              </span>
            )}
          </div>
        </div>

        {/* Scrollable sidebar content */}
        <div className={`flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3.5 ${isCollapsed ? 'px-2 py-sm' : 'p-sm'}`}>
          <div className="flex flex-col gap-xxs">
            {userData?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                title={isCollapsed ? 'Admin Panel' : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-semibold transition-all bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 mb-xxs ${isCollapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-1.5'}`}
              >
                <GraduationCap size={18} className="text-amber-500 flex-shrink-0" />
                {!isCollapsed && <span>Admin Panel</span>}
              </button>
            )}
            {userData?.role !== 'teacher' && coreItems.map((item) => renderMenuItem(item, isCollapsed))}
          </div>

          {/* Teacher Section */}
          {renderTeacherSection(false, isCollapsed)}

          {/* IELTS Section */}
          {renderIeltsSection(false, isCollapsed)}

          {/* Resources Section */}
          <div className="mt-3.5">
            {!isCollapsed && (
              <div className="text-xs font-medium text-warm-muted-soft dark:text-warm-muted px-sm mb-1.5 select-none">
                {t('dashboard.resources')}
              </div>
            )}
            <div className="gap-xxs flex flex-col">
              {resourceItems.map((item) => renderMenuItem(item, isCollapsed))}
            </div>
          </div>

          {/* Account footer group */}
          <div className="mt-md pt-sm border-t border-warm-hairline dark:border-white/5 flex flex-col gap-xs">
            {/* See what's included Plan Card */}
            {userData?.role !== 'teacher' && (
              isCollapsed ? (
                <button
                  onClick={onPremiumClick || (() => navigate('/pricing'))}
                  title={t('dashboard.upgradeTitle')}
                  className="w-full flex items-center justify-center py-2 rounded-lg border border-warm-hairline dark:border-white/5 bg-warm-canvas dark:bg-white/[0.02] hover:bg-warm-surface dark:hover:bg-white/5 transition-all duration-200"
                >
                  <ArrowUp size={16} className="text-warm-primary" />
                </button>
              ) : (
                <div
                  onClick={onPremiumClick || (() => navigate('/pricing'))}
                  className="border border-warm-hairline dark:border-white/5 rounded-xl p-sm bg-warm-canvas dark:bg-white/[0.02] flex items-center justify-between cursor-pointer hover:bg-warm-surface dark:hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="flex-1 min-w-0 pr-xs">
                    <p className="text-[13px] font-semibold text-warm-ink dark:text-warm-on-dark group-hover:text-warm-ink dark:group-hover:text-warm-on-dark">{t('dashboard.upgradeTitle')}</p>
                    <p className="text-[11px] font-normal text-warm-muted-soft dark:text-warm-on-dark-soft mt-xxs">{t('dashboard.upgradeSubtitle')}</p>
                  </div>
                  <ChevronRight size={12} className="text-warm-muted-soft dark:text-warm-on-dark-soft shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )
            )}

            {/* Logout Button */}
            <button
              onClick={onLogoutClick || logout}
              title={isCollapsed ? t('dashboard.logout') : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 ${isCollapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-1.5'}`}
            >
              <LogOut size={18} className="text-red-500 shrink-0" />
              {!isCollapsed && t('dashboard.logout')}
            </button>
          </div>

          {/* BOTTOM CONTAINER (UPGRADE CARD) */}
          {!isCollapsed && !isPremium && userData?.role !== 'teacher' && (
            <div className="bg-warm-surface dark:bg-white/5 border border-warm-hairline dark:border-white/5 rounded-xl p-sm text-center flex flex-col items-center gap-sm mt-md shrink-0 font-sans">
              <div className="w-8 h-8 rounded-lg bg-warm-primary/10 dark:bg-warm-primary/20 flex items-center justify-center text-warm-primary">
                <ArrowUp size={14} strokeWidth={2.5} />
              </div>
              <p className="text-[11.5px] text-warm-muted dark:text-warm-on-dark-soft font-normal leading-normal px-xxs">
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
        <div className="p-xs bg-warm-canvas dark:bg-warm-dark-elevated border-t border-warm-hairline dark:border-white/5 flex-shrink-0">
          <div
            onClick={() => navigate('/settings')}
            title={isCollapsed ? (userData?.fullName || user?.displayName || "Profil") : undefined}
            className={`flex items-center rounded-xl hover:bg-warm-surface dark:hover:bg-white/5 cursor-pointer transition-all duration-200 select-none ${isCollapsed ? 'justify-center p-xs' : 'justify-between gap-xs p-xs'}`}
          >
            <div className={`flex items-center min-w-0 ${isCollapsed ? '' : 'gap-xs'}`}>
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
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-warm-ink dark:text-warm-on-dark truncate">
                    {userData?.fullName || user?.displayName || "IELTS Candidate"}
                  </span>
                  <span className="text-[11px] text-warm-muted-soft dark:text-warm-on-dark-soft truncate leading-none mt-xxs">
                    {user?.email || userData?.email || ""}
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronsUpDown size={13} className="text-warm-muted-soft dark:text-warm-on-dark-soft shrink-0" />}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 left-0 right-0 h-12 bg-warm-canvas dark:bg-warm-dark border-b border-warm-hairline dark:border-white/5 z-[60] flex items-center justify-between px-md">
        <div className="flex items-center gap-sm">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark"
          >
            <Menu size={20} />
          </button>
          <div className="cursor-pointer flex items-center gap-1.5 select-none" onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-warm-primary flex-shrink-0">
              <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58172 0 0 3.58172 0 8V20C0 24.4183 3.58172 28 8 28H20C24.4183 28 28 24.4183 28 20V8C28 3.58172 24.4183 0 20 0H8ZM14 20C17.3137 20 20 17.3137 20 14C20 10.6863 17.3137 8 14 8C10.6863 8 8 10.6863 8 14C8 17.3137 10.6863 20 14 20Z" fill="currentColor"/>
            </svg>
            <span className="text-xl tracking-tight font-bold text-warm-ink dark:text-warm-on-dark font-sans">
              Englev
            </span>
          </div>
        </div>

        <div className="flex items-center gap-sm">
          {/* E'lonlar qo'ng'irog'i — Mobile */}
          <button
            onClick={() => navigate(spotlightPath)}
            className="relative p-1 text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark"
            aria-label="E'lonlar"
          >
            <Bell size={18} />
            {hasNewSpotlight && (
              <span className="absolute right-0 top-0.5 h-2 w-2 rounded-full bg-warm-primary ring-2 ring-warm-canvas dark:ring-warm-dark animate-pulse" />
            )}
          </button>

          {/* Language Switcher for Mobile */}
          <div className="flex items-center gap-xs text-[11px] font-semibold select-none">
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
              className="fixed top-0 left-0 bottom-0 w-[260px] bg-warm-canvas dark:bg-warm-dark z-[100] shadow-2xl p-sm flex flex-col justify-between overflow-y-auto md:hidden font-sans"
            >
              <div className="flex flex-col gap-sm">
                {/* Close button row */}
                <div className="flex items-center justify-between pb-xs">
                  <div className="cursor-pointer flex items-center gap-2 select-none" onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}>
                    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-warm-primary flex-shrink-0">
                      <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58172 0 0 3.58172 0 8V20C0 24.4183 3.58172 28 8 28H20C24.4183 28 28 24.4183 28 20V8C28 3.58172 24.4183 0 20 0H8ZM14 20C17.3137 20 20 17.3137 20 14C20 10.6863 17.3137 8 14 8C10.6863 8 8 10.6863 8 14C8 17.3137 10.6863 20 14 20Z" fill="currentColor"/>
                    </svg>
                    <span className="text-xl tracking-tight font-bold text-warm-ink dark:text-warm-on-dark font-sans">
                      Englev
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
                <div className="flex flex-col gap-xxs">
                  {userData?.role === 'admin' && (
                    <button
                      onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-xs px-sm py-xs rounded-lg text-xs font-semibold transition-all bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 mb-xxs"
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
                <div className="mt-3.5">
                  <div className="text-xs font-medium text-warm-muted-soft dark:text-warm-on-dark-soft px-sm mb-1.5 select-none">
                    {t('dashboard.resources')}
                  </div>
                  <div className="gap-xxs flex flex-col">
                    {resourceItems.map(renderMobileMenuItem)}
                  </div>
                </div>

                {/* Account footer group */}
                <div className="mt-md pt-sm border-t border-warm-hairline dark:border-white/10 flex flex-col gap-xs">
                  {/* See what's included Plan Card */}
                  {userData?.role !== 'teacher' && (
                    <div
                      onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                      className="border border-warm-hairline dark:border-white/10 rounded-xl p-sm bg-warm-canvas dark:bg-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between cursor-pointer hover:bg-warm-surface dark:hover:bg-white/10 hover:border-warm-primary/30 dark:hover:border-warm-primary/30 transition-all duration-200 group"
                    >
                      <div className="flex-1 min-w-0 pr-xs">
                        <p className="text-xs font-medium text-warm-ink dark:text-warm-on-dark group-hover:text-warm-ink dark:group-hover:text-warm-on-dark">{t('dashboard.upgradeTitle')}</p>
                        <p className="text-[10px] font-medium text-warm-muted-soft dark:text-warm-on-dark-soft mt-xxs group-hover:text-warm-muted dark:group-hover:text-warm-on-dark-soft">{t('dashboard.upgradeSubtitle')}</p>
                      </div>
                      <ChevronRight size={12} className="text-warm-muted-soft shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={() => { if (onLogoutClick) onLogoutClick(); else logout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-xs px-sm py-xs rounded-lg text-xs font-semibold transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-950/50 shadow-sm"
                  >
                    <LogOut size={14} className="text-red-500 shrink-0" />
                    {t('dashboard.logout')}
                  </button>
                </div>
              </div>

              {/* BOTTOM CONTAINER (UPGRADE CARD) */}
              {!isPremium && userData?.role !== 'teacher' && (
                <div className="bg-warm-surface dark:bg-white/5 border border-warm-hairline dark:border-white/10 rounded-xl p-sm text-center flex flex-col items-center gap-xs mt-sm">
                  <div className="w-8 h-8 rounded-full bg-warm-canvas dark:bg-white/10 flex items-center justify-center border border-warm-hairline dark:border-white/10 shadow-sm text-warm-body dark:text-warm-on-dark-soft">
                    <ArrowUp size={14} strokeWidth={2} />
                  </div>
                  <p className="text-[11.5px] text-warm-muted dark:text-warm-on-dark-soft font-medium leading-normal px-xxs">
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
