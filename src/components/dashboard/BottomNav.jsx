import React, { useState } from 'react';
import { Home, BookOpen, Headphones, Trophy, MoreHorizontal, User, CreditCard, Bookmark, LogOut, HelpCircle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticFeedback } from '../../utils/haptic';
import { useNavigate } from 'react-router-dom';

export default function BottomNav({ activeTab, setActiveTab }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'library', label: 'IELTS', icon: BookOpen },
    { id: 'podcasts', label: 'Audio', icon: Headphones },
    { id: 'results', label: 'Stats', icon: Trophy },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  const menuItems = [
    { id: 'wordbank', label: 'Word Bank', icon: Bookmark, path: '/wordbank' },
    { id: 'pricing', label: 'Premium Plan', icon: CreditCard, path: '/pricing' },
    { id: 'settings', label: 'My Profile', icon: User, path: '/settings' },
    { id: 'logout', label: 'Sign Out', icon: LogOut, path: null },
  ];

  const handleTabClick = (tabId) => {
    hapticFeedback('light');
    if (tabId === 'more') {
      setIsMenuOpen(!isMenuOpen);
    } else if (tabId === 'podcasts') {
      setIsMenuOpen(false);
      navigate('/podcasts', { state: { fromBottomNav: true } });
    } else {
      setIsMenuOpen(false);
      setActiveTab(tabId);
    }
  };

  const handleMenuClick = (item) => {
    hapticFeedback('medium');
    setIsMenuOpen(false);
    if (item.id === 'logout') {
      // Typically handled by a logout function passed via props or context
      // For now we assume the parent handles it or just navigating to login
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="md:hidden fixed bottom-3 left-0 right-0 z-[100] px-6 pointer-events-none">
      {/* More Menu Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto z-[-1]"
          />
        )}
      </AnimatePresence>

      {/* More Menu Content */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: -12, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-w-[280px] mx-auto bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 mb-2 pointer-events-auto shadow-2xl"
          >
            <div className="grid grid-cols-1 gap-1">
              {menuItems.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleMenuClick(item)}
                  className="flex items-center gap-4 w-full p-3 rounded-2xl hover:bg-white/10 transition-colors group active:scale-95"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
                    <item.icon size={18} strokeWidth={2} />
                  </div>
                  <span className="text-white/90 text-[14px] font-bold group-hover:text-white">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Nav Bar */}
      <motion.div 
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-[300px] mx-auto bg-black/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-full flex items-center justify-between p-1 pointer-events-auto relative z-10"
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          const isMoreActive = tab.id === 'more' && isMenuOpen;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex items-center justify-center transition-all duration-500 rounded-full h-10 
                ${isSelected || isMoreActive ? 'flex-[2.2] bg-white text-black' : 'flex-1 text-white/60 hover:text-white'}
              `}
            >
              <Icon 
                size={isSelected || isMoreActive ? 16 : 18} 
                strokeWidth={2.5}
                className={`transition-all duration-300 ${(isSelected || isMoreActive) ? 'mr-1.5' : ''}`} 
              />
              
              <AnimatePresence mode="wait">
                {(isSelected || isMoreActive) && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-[11px] font-black overflow-hidden whitespace-nowrap"
                  >
                    {tab.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
