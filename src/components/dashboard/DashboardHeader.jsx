import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Key, LogOut, RotateCw, ArrowUpRight, Settings, Search, Zap, Crown } from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function DashboardHeader({ user, userData, onKeyClick, onLogoutClick, activeTab, setActiveTab, onPremiumClick, onRefreshClick, loading }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const dropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'reading', label: 'Reading', path: '/practice?tab=reading' },
    { id: 'listening', label: 'Listening', path: '/practice?tab=listening' },
    { id: 'writing', label: 'Writing', path: '/practice?tab=writing' },
    { id: 'speaking', label: 'Speaking', path: '/practice?tab=speaking' },
    { id: 'podcasts', label: 'Podcasts', path: '/podcasts' },
    { id: 'pricing', label: 'Pricing', path: '/pricing' },
    { id: 'results', label: 'Natijalar', path: '/my-results' },
    { id: 'leaderboard', label: 'Reyting', path: '/leaderboard' },
  ];

  const isPro = userData?.isPro || userData?.isPremium || userData?.accountType === 'premium' || userData?.accountType === 'pro';

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <>
      {/* Top Edge Blur Effect (Frosted Vignette) - Positioned behind header */}
      <div 
        className="fixed top-0 left-0 right-0 h-10 z-[50] pointer-events-none"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)'
        }}
      />
      
    <header className={`h-12 w-full sticky top-0 z-[60] transition-all duration-500 ${
      isScrolled 
        ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200/50 shadow-sm' 
        : 'bg-white border-b border-zinc-100'
    }`}>
      <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer flex items-center pr-6 transition-transform hover:scale-105 active:scale-95" onClick={() => navigate('/dashboard')}>
           <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg transform -rotate-6 group hover:rotate-0 transition-all duration-500">
             <Zap size={18} className="text-white fill-current" />
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center justify-center gap-6 md:gap-10 h-full flex-1 overflow-x-auto hide-scrollbar">
          {menuItems.map((item) => {
            const isTabActive = activeTab === item.id;
            const hasMegaMenu = item.id === 'reading';

            const handleMouseEnter = () => {
              if (hasMegaMenu) {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                
                hoverTimeoutRef.current = setTimeout(() => {
                  setHoveredTab(item.id);
                }, 500);
              }
            };

            const handleMouseLeave = () => {
              if (hasMegaMenu) {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                
                closeTimeoutRef.current = setTimeout(() => {
                  setHoveredTab(null);
                }, 200);
              }
            };

            return (
              <div 
                key={item.id} 
                className="h-full flex items-center"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleNavigation(item)}
                  className={`relative flex items-center text-[12px] font-normal tracking-tight transition-all duration-300 whitespace-nowrap
                    ${isTabActive || hoveredTab === item.id
                      ? 'text-black' 
                      : 'text-black/60 hover:text-black'}
                  `}
                >
                  {item.label}
                  {(isTabActive || hoveredTab === item.id) && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-black"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              </div>
            );
          })}
          
          {/* Search Button */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center text-black/40 hover:text-black transition-all duration-300 transform hover:scale-110"
            title="Search (⌘K)"
          >
            <Search size={15} strokeWidth={2} />
          </button>
        </nav>

        {/* Mega Menu Overlay */}
        <AnimatePresence>
          {hoveredTab === 'reading' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setHoveredTab('reading');
              }}
              onMouseLeave={() => {
                closeTimeoutRef.current = setTimeout(() => {
                  setHoveredTab(null);
                }, 200);
              }}
              className="absolute top-11 left-0 w-full bg-white border-b border-zinc-100 z-50 pt-10 pb-16 shadow-2xl"
            >
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05, delayChildren: 0.05 }
                  }
                }}
                className="max-w-[1100px] mx-auto px-6 grid grid-cols-12 gap-12"
              >
                {/* Column 1: Main Categories */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
                  }}
                  className="col-span-5 space-y-4"
                >
                  <p className="text-[11px] text-black/40 font-normal tracking-tight">Reading Bo'limlari</p>
                  <div className="flex flex-col gap-1">
                    {[
                      { label: 'Passages', id: 'passages' },
                      { label: 'Full Tests', id: 'full_test' },
                      { label: 'Sets', id: 'set' }
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          navigate(`/reading?section=${sub.id}`);
                          setHoveredTab(null);
                        }}
                        className="text-[22px] font-medium text-black hover:text-black/70 transition-all text-left tracking-tight py-0.5"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Column 2: Quick Links */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
                  }}
                  className="col-span-3 space-y-4 pt-1"
                >
                  <p className="text-[11px] text-black/40 font-normal tracking-tight">Tezkor</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => navigate('/practice?tab=speaking')} className="text-[13px] text-black font-medium hover:text-black/60 transition-all text-left">Speaking</button>
                    <button onClick={() => navigate('/podcasts')} className="text-[13px] text-black font-medium hover:text-black/60 transition-all text-left">Podcasts</button>
                    <button onClick={() => navigate('/articles')} className="text-[13px] text-black font-medium hover:text-black/60 transition-all text-left">Articles</button>
                    <button onClick={() => navigate('/vocabulary')} className="text-[13px] text-black font-medium hover:text-black/60 transition-all text-left">Word Bank</button>
                  </div>
                </motion.div>

                {/* Column 3: Resources */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
                  }}
                  className="col-span-4 space-y-4 pt-1"
                >
                  <p className="text-[11px] text-black/40 font-normal tracking-tight">Resurslar</p>
                  <div className="flex flex-col gap-2">
                    <button className="text-[13px] text-black font-medium hover:text-black/60 transition-all text-left">Reading Tips & Tricks</button>
                    <button className="text-[13px] text-black font-medium hover:text-black/60 transition-all text-left">Band Calculator</button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Backdrop overlay */}
        <AnimatePresence>
          {(hoveredTab || isSearchOpen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onMouseEnter={() => {
                setHoveredTab(null);
                setIsSearchOpen(false);
              }}
              onClick={() => {
                setHoveredTab(null);
                setIsSearchOpen(false);
              }}
              className="fixed inset-0 top-11 bg-black/5 backdrop-blur-[2px] z-40"
            />
          )}
        </AnimatePresence>

        {/* Right Section */}
        <div className="flex items-center gap-3 pl-4">
          {!isPro && (
            <button 
              onClick={() => navigate('/pricing')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white text-[11px] font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Zap size={12} fill="currentColor" className="animate-pulse" />
              Go Pro
            </button>
          )}

          {isPro && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-600 text-[10px] font-black uppercase tracking-wider">
              <Crown size={10} fill="currentColor" />
              PRO
            </div>
          )}

          <div className="h-4 w-px bg-zinc-200 hidden md:block mx-1"></div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center group gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200 group-hover:border-zinc-400 transition-all duration-300">
                <img
                  src={userData?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-white border border-zinc-100 rounded-3xl shadow-2xl py-2 z-[100] origin-top-right backdrop-blur-2xl"
                >
                  <div className="px-5 py-4 border-b border-zinc-50 mb-1">
                    <p className="text-[14px] text-zinc-900 font-bold truncate">{userData?.fullName || "User"}</p>
                    <p className="text-[11px] font-medium text-zinc-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <div className="px-2 space-y-1">
                    <button
                      onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-black rounded-2xl transition-all flex items-center gap-3"
                    >
                      <Settings size={16} className="text-zinc-400" />
                      Sozlamalar
                    </button>

                    <button
                      onClick={() => { onLogoutClick(); setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center gap-3"
                    >
                      <LogOut size={16} />
                      Chiqish
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
    </>
  );
}
