import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Key, LogOut, RotateCw, ArrowUpRight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function DashboardHeader({ user, userData, onKeyClick, onLogoutClick, activeTab, setActiveTab, onPremiumClick, onRefreshClick, loading }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const dropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'reading', label: 'Reading', path: '/practice?tab=reading' },
    { id: 'listening', label: 'Listening', path: '/practice?tab=listening' },
    { id: 'writing', label: 'Writing', path: '/practice?tab=writing' },
    { id: 'results', label: 'Natijalar', path: '/my-results' },
    { id: 'leaderboard', label: 'Reyting', path: '/leaderboard' },
    { id: 'vocabulary', label: 'WordBank', path: '/vocabulary' },
    { id: 'favorites', label: 'Sevimlilar', path: '/favorites' }
  ];

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <header className="h-12 w-full sticky top-0 z-[60] bg-black/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer flex items-center pr-4" onClick={() => navigate('/dashboard')}>
           <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
           </svg>
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
                }, 300); // 0.3s grace period for closing
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
                      ? 'text-white' 
                      : 'text-gray-400/80 hover:text-white'}
                  `}
                >
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Mega Menu Overlay */}
        <AnimatePresence>
          {hoveredTab === 'reading' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setHoveredTab('reading');
              }}
              onMouseLeave={() => {
                closeTimeoutRef.current = setTimeout(() => {
                  setHoveredTab(null);
                }, 300);
              }}
              className="absolute top-12 left-0 w-full bg-[#1d1d1f] border-b border-white/5 z-50 pt-10 pb-16 shadow-2xl backdrop-blur-3xl"
            >
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
                  }
                }}
                className="max-w-[980px] mx-auto px-6 grid grid-cols-12 gap-8"
              >
                {/* Column 1: Main Categories */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: -15 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  className="col-span-5 space-y-2"
                >
                  <p className="text-[12px] text-gray-500 font-medium mb-4 tracking-wide">Bo'limlarni tanlang</p>
                  <div className="flex flex-col gap-1">
                    {[
                      { label: 'Passages', id: 'passages' },
                      { label: 'Full Tests', id: 'full_test' },
                      { label: 'Sets', id: 'set' }
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          navigate(`/practice?tab=reading&section=${sub.id}`);
                          setHoveredTab(null);
                        }}
                        className="text-[24px] font-semibold text-gray-200 hover:text-white transition-all text-left tracking-tight py-1"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Column 2: Quick Links */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: -15 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  className="col-span-3 space-y-4 pt-1"
                >
                  <p className="text-[12px] text-gray-500 font-medium tracking-wide">Tezkor havolalar</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => navigate('/vocabulary')} className="text-[12px] text-gray-300 hover:text-blue-400 hover:underline transition-all text-left font-medium">Word Bank</button>
                    <button onClick={() => navigate('/favorites')} className="text-[12px] text-gray-300 hover:text-blue-400 hover:underline transition-all text-left font-medium">Saqlanganlar</button>
                    <button onClick={() => navigate('/my-results')} className="text-[12px] text-gray-300 hover:text-blue-400 hover:underline transition-all text-left font-medium">Oxirgi natijalar</button>
                  </div>
                </motion.div>

                {/* Column 3: Resources */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: -15 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  className="col-span-4 space-y-4 pt-1"
                >
                  <p className="text-[12px] text-gray-500 font-medium tracking-wide">O'rganish uchun</p>
                  <div className="flex flex-col gap-2">
                    <button className="text-[12px] text-gray-300 hover:text-blue-400 hover:underline transition-all text-left font-medium">Reading Tips & Tricks</button>
                    <button className="text-[12px] text-gray-300 hover:text-blue-400 hover:underline transition-all text-left font-medium">Vocabulary Guide</button>
                    <button className="text-[12px] text-gray-300 hover:text-blue-400 hover:underline transition-all text-left font-medium">Band Score Calculator</button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Backdrop overlay for the rest of the page */}
        <AnimatePresence>
          {hoveredTab && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onMouseEnter={() => setHoveredTab(null)}
              className="fixed inset-0 top-12 bg-black/40 backdrop-blur-sm z-40"
            />
          )}
        </AnimatePresence>

        {/* Right Section */}
        <div className="flex items-center gap-4 pl-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center group"
            >
              <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden border border-white/10 group-hover:border-white/30 transition-all">
                <img
                  src={userData?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-[#1d1d1f] border border-white/10 rounded-2xl shadow-2xl py-2 z-[100] origin-top-right backdrop-blur-2xl"
                >
                  <div className="px-5 py-4 border-b border-white/5 mb-1">
                    <p className="text-[14px] text-white font-medium truncate">{userData?.fullName || "User"}</p>
                    <p className="text-[11px] font-normal text-gray-500 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <div className="px-2 space-y-1">
                    <button
                      onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2 text-[13px] text-gray-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-3"
                    >
                      <Settings size={14} className="text-gray-500" />
                      Sozlamalar
                    </button>

                    <button
                      onClick={() => { onLogoutClick(); setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-3"
                    >
                      <LogOut size={14} />
                      Chiqish
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
