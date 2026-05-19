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
  LayoutDashboard,
  Sparkles,
  GraduationCap,
  Headphones,
  BookOpen,
  Trophy,
  Users,
  BookMarked,
  CreditCard,
  PenTool,
  Mic
} from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullTestsOpen, setIsFullTestsOpen] = useState(() => {
    return (
      location.pathname === '/reading/full' ||
      (location.pathname === '/listening' && location.search.includes('section=full_test')) ||
      (location.pathname === '/practice' && location.search.includes('type=full'))
    );
  });

  const [isPartTestsOpen, setIsPartTestsOpen] = useState(() => {
    return (
      location.pathname === '/reading/parts' ||
      (location.pathname === '/listening' && !location.search.includes('section=full_test')) ||
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { id: 'mock', label: 'Mock Exam', path: '/mock', icon: Sparkles },
    { id: 'full_tests', label: 'Full Tests', icon: GraduationCap },
    { id: 'part_tests', label: 'Part Tests', icon: GraduationCap },
    { id: 'speaking', label: 'Speaking', path: '/practice?tab=speaking', icon: Mic },
    { id: 'podcasts', label: 'Podcasts', path: '/podcasts', icon: Headphones },
    { id: 'articles', label: 'Articles', path: '/articles', icon: BookOpen },
    { id: 'results', label: 'Results', path: '/my-results', icon: Trophy },
    { id: 'leaderboard', label: 'Reyting', path: '/leaderboard', icon: Users },
    { id: 'vocabulary', label: 'WordBank', path: '/vocabulary', icon: BookMarked },
    { id: 'pricing', label: 'Pricing', path: '/pricing', icon: CreditCard },
  ];

  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';

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
      return location.pathname === '/practice' && location.search.includes('tab=speaking');
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
    if (setActiveTab && item.id) {
      setActiveTab(item.id);
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return { parent: 'Dashboard', child: 'Home' };
    if (path === '/mock') return { parent: 'Mock Exam', child: 'Tests' };
    if (path === '/reading' || path === '/reading/full' || path === '/reading/parts') return { parent: 'Practice', child: 'Reading' };
    if (path === '/listening') return { parent: 'Practice', child: 'Listening' };
    if (path === '/practice') return { parent: 'Practice', child: 'Skills' };
    if (path === '/library') return { parent: 'IELTS Practice', child: 'Library' };
    if (path === '/podcasts') return { parent: 'Podcasts', child: 'Episodes' };
    if (path === '/articles') return { parent: 'Articles', child: 'Resources' };
    if (path === '/my-results') return { parent: 'Results', child: 'Academic' };
    if (path === '/leaderboard') return { parent: 'Reyting', child: 'Leaderboard' };
    if (path === '/vocabulary') return { parent: 'WordBank', child: 'Vocabulary' };
    if (path === '/pricing') return { parent: 'Pricing', child: 'Subscriptions' };
    if (path === '/settings') return { parent: 'Settings', child: 'Preferences' };
    if (path === '/roadmap') return { parent: 'Roadmap', child: 'Strategy' };
    if (path.startsWith('/podcast/')) return { parent: 'Podcasts', child: 'Episode Player' };
    if (path.startsWith('/article/')) return { parent: 'Articles', child: 'Reader' };
    return { parent: 'Dashboard', child: 'Overview' };
  };

  const { parent, child } = getBreadcrumbs();
  const searchPlaceholder = `Search ${parent}`;

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

        {/* Right Search Input */}
        <div 
          onClick={() => setIsSearchOpen(true)}
          className="relative w-60 cursor-pointer group"
        >
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-455 dark:text-zinc-550 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-350" />
          <input
            type="text"
            readOnly
            placeholder={searchPlaceholder}
            className="w-full bg-[#f4f5f8] dark:bg-zinc-900/60 hover:bg-[#ececf0] dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none cursor-pointer transition-colors border border-transparent placeholder-zinc-450 dark:placeholder-zinc-500"
          />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-60 bg-white dark:bg-[#09090b] border-r border-zinc-200/50 dark:border-zinc-800/80 z-[60] flex-col justify-between p-3 select-none overflow-y-auto hide-scrollbar font-sans">
        <div className="flex flex-col">
          {/* Profile header */}
          <div className="relative">
            <div className="flex items-center justify-between py-0.5 mb-2">
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)} 
                className="flex items-center gap-1.5 cursor-pointer group flex-1 min-w-0"
              >
                <div className="w-6 h-6 rounded-[6px] bg-blue-600 dark:bg-blue-700 text-white font-medium text-[11px] flex items-center justify-center shrink-0 shadow-sm">
                  {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-200 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                  {userData?.fullName || "User"}
                </span>
                <ChevronDown size={12} className={`text-zinc-400 shrink-0 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                  isPremium 
                    ? 'bg-[#e8f3ff] text-[#0066cc] dark:bg-blue-950/50 dark:text-[#3894ff]' 
                    : 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>
                  {isPremium ? 'PRO' : 'Free'}
                </span>
              </div>
              
              <div className="flex items-center gap-0.5 ml-2">
                {onRefreshClick && (
                  <button 
                    onClick={onRefreshClick}
                    className={`p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shrink-0 ${loading ? 'animate-spin' : ''}`}
                    title="Yangilash"
                  >
                    <RotateCw size={12} />
                  </button>
                )}
                
                <button className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shrink-0 relative">
                  <Bell size={13} className="text-zinc-550 dark:text-zinc-400" />
                  <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-[#0066cc] rounded-full"></span>
                </button>
              </div>
            </div>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute left-0 top-10 w-[200px] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-2xl py-1.5 z-[70] p-1"
                >
                  <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{userData?.fullName || "User"}</p>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-normal text-zinc-650 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-2"
                  >
                    <Settings size={13} className="text-zinc-450" />
                    Sozlamalar
                  </button>
                  <button
                    onClick={() => { onLogoutClick(); setIsProfileOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-normal text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all flex items-center gap-2"
                  >
                    <LogOut size={13} />
                    Chiqish
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Box */}
          <div 
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-[#f4f5f8] dark:bg-zinc-900/60 hover:bg-[#ececf0] dark:hover:bg-zinc-800/80 text-zinc-455 dark:text-zinc-500 text-[12.5px] rounded-lg py-1.5 px-2.5 flex items-center gap-2 cursor-pointer transition-colors border border-transparent mb-3"
          >
            <Search size={14} className="shrink-0 text-zinc-450 dark:text-zinc-500" />
            <span className="flex-1 text-left font-normal select-none">Search</span>
            <span className="text-[9px] font-normal bg-white dark:bg-zinc-850 text-zinc-455 border border-zinc-200/50 dark:border-zinc-700/50 px-1 py-0.5 rounded shadow-sm">⌘K</span>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const active = isTabActive(item);
              const Icon = item.icon;
              if (item.id === 'full_tests' || item.id === 'part_tests') {
                const isFull = item.id === 'full_tests';
                const isOpen = isFull ? isFullTestsOpen : isPartTestsOpen;

                const isReadingActive = isFull 
                  ? (location.pathname === '/reading/full')
                  : (location.pathname === '/reading/parts');
                
                const isListeningActive = isFull
                  ? (location.pathname === '/listening' && location.search.includes('section=full_test'))
                  : (location.pathname === '/listening' && !location.search.includes('section=full_test'));
                
                const isWritingActive = isFull
                  ? (location.pathname === '/practice' && location.search.includes('writing') && location.search.includes('type=full'))
                  : (location.pathname === '/practice' && location.search.includes('writing') && location.search.includes('type=part'));

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
                        <Icon size={15} className={active ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-500 dark:text-zinc-400'} />
                        <span>{item.label}</span>
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
                            onClick={() => navigate(isFull ? '/reading/full' : '/reading/parts')}
                            className={`w-full text-left px-2.5 py-1 text-[12px] rounded-lg transition-all flex items-center gap-2 font-normal ${
                              isReadingActive
                                ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                                : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                            }`}
                          >
                            <BookOpen size={13} className={isReadingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                            Reading
                          </button>
                          <button
                            onClick={() => navigate(isFull ? '/listening?section=full_test' : '/listening?section=parts')}
                            className={`w-full text-left px-2.5 py-1 text-[12px] rounded-lg transition-all flex items-center gap-2 font-normal ${
                              isListeningActive
                                ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                                : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                            }`}
                          >
                            <Headphones size={13} className={isListeningActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                            Listening
                          </button>
                          <button
                            onClick={() => navigate(isFull ? '/practice?tab=writing&type=full' : '/practice?tab=writing&type=part')}
                            className={`w-full text-left px-2.5 py-1 text-[12px] rounded-lg transition-all flex items-center gap-2 font-normal ${
                              isWritingActive
                                ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                                : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                            }`}
                          >
                            <PenTool size={13} className={isWritingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                            Writing
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-normal transition-all ${
                    active 
                      ? 'bg-[#e8f3ff] dark:bg-blue-950/30 text-[#0066cc] dark:text-[#3894ff]' 
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Icon size={15} className={active ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-500 dark:text-zinc-400'} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* See what's included Plan Card */}
          <div 
            onClick={onPremiumClick || (() => navigate('/pricing'))}
            className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 bg-white dark:bg-zinc-900/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 group mt-3 mb-2"
          >
            <div className="flex-1 min-w-0 pr-1.5">
              <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white">See what's included</p>
              <p className="text-[11px] font-normal text-zinc-450 dark:text-zinc-500 mt-0.5 group-hover:text-zinc-550 dark:group-hover:text-zinc-400">Your plan and usage</p>
            </div>
            <ChevronRight size={12} className="text-zinc-455 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-150 dark:bg-zinc-800/50 my-1" />

          {/* Starred Collapsible Section */}
          <div className="mt-1">
            <button 
              onClick={() => setIsStarredOpen(!isStarredOpen)}
              className="flex items-center gap-1.5 text-[12.5px] font-normal text-zinc-450 dark:text-zinc-500 py-1 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left"
            >
              <ChevronRight size={10} className={`text-zinc-450 transition-transform duration-300 ${isStarredOpen ? 'rotate-90' : ''}`} />
              Starred
            </button>
            
            <AnimatePresence initial={false}>
              {isStarredOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pl-4 pr-1 space-y-1 mt-0.5"
                >
                  <button 
                    onClick={() => navigate('/practice?tab=speaking')} 
                    className="w-full text-left text-[12px] font-normal text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Speaking Practice
                  </button>
                  <button 
                    onClick={() => navigate('/roadmap')} 
                    className="w-full text-left text-[12px] font-normal text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Roadmap
                  </button>
                  <button 
                    onClick={() => navigate('/settings')} 
                    className="w-full text-left text-[12px] font-normal text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Settings
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
              Ready to go beyond this free plan? Upgrade for premium features.
            </p>
            <button 
              onClick={onPremiumClick || (() => navigate('/pricing'))}
              className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 active:scale-95 text-white font-medium py-1.5 rounded-lg text-xs transition-all shadow-md shadow-blue-500/10"
            >
              View plans
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
          <div className="cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img src="/englev-logo.png" alt="logo" className="h-8 w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-[13px] font-normal text-zinc-850 dark:text-zinc-100">ENGLEV</span>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Profile header */}
                <div className="relative">
                  <div className="flex items-center justify-between py-0.5 mb-1.5">
                    <div 
                      onClick={() => setIsProfileOpen(!isProfileOpen)} 
                      className="flex items-center gap-1.5 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="w-6 h-6 rounded-[6px] bg-blue-600 dark:bg-blue-700 text-white font-medium text-[11px] flex items-center justify-center shrink-0 shadow-sm">
                        {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <span className="text-[13px] font-medium text-zinc-750 dark:text-zinc-300 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                        {userData?.fullName || "User"}
                      </span>
                      <ChevronDown size={12} className={`text-zinc-400 shrink-0 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                        isPremium 
                          ? 'bg-[#e8f3ff] text-[#0066cc] dark:bg-blue-950/50 dark:text-[#3894ff]' 
                          : 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {isPremium ? 'PRO' : 'Free'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute left-1 top-9 w-[200px] bg-white dark:bg-zinc-900 border border-zinc-105 dark:border-zinc-800/80 rounded-xl shadow-2xl py-1.5 z-[110] p-1"
                      >
                        <div className="px-2.5 py-1.5 border-b border-zinc-50 dark:border-zinc-800 mb-1">
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{userData?.fullName || "User"}</p>
                          <p className="text-[10px] font-medium text-zinc-450 dark:text-zinc-500 truncate mt-0.5">{user?.email}</p>
                        </div>
                        <button
                          onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); setIsProfileOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-zinc-650 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-2"
                        >
                          <Settings size={13} className="text-zinc-455" />
                          Sozlamalar
                        </button>
                        <button
                          onClick={() => { onLogoutClick(); setIsMobileMenuOpen(false); setIsProfileOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all flex items-center gap-2"
                        >
                          <LogOut size={13} />
                          Chiqish
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Search Box */}
                <div 
                  onClick={() => { setIsSearchOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full bg-[#f4f5f8] dark:bg-zinc-900 hover:bg-[#ececf0] dark:hover:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 text-xs rounded-lg py-1.5 px-2.5 flex items-center gap-2 cursor-pointer transition-colors border border-transparent"
                >
                  <Search size={14} className="shrink-0" />
                  <span className="flex-1 text-left font-normal select-none">Search</span>
                </div>                {/* Menu Items */}
                <div className="flex flex-col gap-1">
                  {menuItems.map((item) => {
                    const active = isTabActive(item);
                    const Icon = item.icon;
                    if (item.id === 'full_tests' || item.id === 'part_tests') {
                      const isFull = item.id === 'full_tests';
                      const isOpen = isFull ? isFullTestsOpen : isPartTestsOpen;

                      const isReadingActive = isFull 
                        ? (location.pathname === '/reading/full')
                        : (location.pathname === '/reading/parts');
                      
                      const isListeningActive = isFull
                        ? (location.pathname === '/listening' && location.search.includes('section=full_test'))
                        : (location.pathname === '/listening' && !location.search.includes('section=full_test'));
                      
                      const isWritingActive = isFull
                        ? (location.pathname === '/practice' && location.search.includes('writing') && location.search.includes('type=full'))
                        : (location.pathname === '/practice' && location.search.includes('writing') && location.search.includes('type=part'));

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
                              <span>{item.label}</span>
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
                                  className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-2 font-normal ${
                                    isReadingActive
                                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                                  }`}
                                >
                                  <BookOpen size={12} className={isReadingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                                  Reading
                                </button>
                                <button
                                  onClick={() => { navigate(isFull ? '/listening?section=full_test' : '/listening?section=parts'); setIsMobileMenuOpen(false); }}
                                  className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-2 font-normal ${
                                    isListeningActive
                                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                                  }`}
                                >
                                  <Headphones size={12} className={isListeningActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                                  Listening
                                </button>
                                <button
                                  onClick={() => { navigate(isFull ? '/practice?tab=writing&type=full' : '/practice?tab=writing&type=part'); setIsMobileMenuOpen(false); }}
                                  className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-2 font-normal ${
                                    isWritingActive
                                      ? 'text-[#0066cc] dark:text-[#3894ff] bg-[#e8f3ff]/40 dark:bg-blue-950/20'
                                      : 'text-zinc-550 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                                  }`}
                                >
                                  <PenTool size={12} className={isWritingActive ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                                  Writing
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => { handleNavigation(item); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          active 
                            ? 'bg-[#e8f3ff] dark:bg-blue-950/40 text-[#0066cc] dark:text-[#3894ff]' 
                            : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <Icon size={14} className={active ? 'text-[#0066cc] dark:text-[#3894ff]' : 'text-zinc-400 dark:text-zinc-500'} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* See what's included Plan Card */}
                <div 
                  onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                  className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-2.5 bg-white dark:bg-zinc-900/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 group mt-1"
                >
                  <div className="flex-1 min-w-0 pr-1.5">
                    <p className="text-xs font-medium text-zinc-850 dark:text-zinc-205 group-hover:text-black dark:group-hover:text-white">See what's included</p>
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5 group-hover:text-zinc-550 dark:group-hover:text-zinc-400">Your plan and usage</p>
                  </div>
                  <ChevronRight size={12} className="text-zinc-455 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 my-1" />

                {/* Starred Collapsible Section */}
                <div>
                  <button 
                    onClick={() => setIsStarredOpen(!isStarredOpen)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1 py-1 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors w-full text-left"
                  >
                    <ChevronRight size={10} className={`transition-transform duration-300 ${isStarredOpen ? 'rotate-90' : ''}`} />
                    Starred
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isStarredOpen && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pl-4 pr-1 space-y-1 mt-0.5"
                      >
                        <button 
                          onClick={() => { navigate('/practice?tab=speaking'); setIsMobileMenuOpen(false); }} 
                          className="w-full text-left text-xs font-medium text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Speaking Practice
                        </button>
                        <button 
                          onClick={() => { navigate('/roadmap'); setIsMobileMenuOpen(false); }} 
                          className="w-full text-left text-xs font-medium text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Roadmap
                        </button>
                        <button 
                          onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} 
                          className="w-full text-left text-xs font-medium text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Settings
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
                    Ready to go beyond this free plan? Upgrade for premium features.
                  </p>
                  <button 
                    onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                    className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 active:scale-95 text-white font-medium py-1.5 rounded-lg text-xs transition-all shadow-md shadow-blue-500/10"
                  >
                    View plans
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
