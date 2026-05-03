import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function LibrarySubHeader({ activeTab, scrolledContent }) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 380);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', path: '/library?tab=overview' },
    { id: 'reading', label: 'Reading', path: '/reading' },
    { id: 'listening', label: 'Listening', path: '/listening' },
    { id: 'writing', label: 'Writing', path: '/practice?tab=writing' },
    { id: 'speaking', label: 'Speaking', path: '/practice?tab=speaking' },
  ];

  const handleTabClick = (tab) => {
    navigate(tab.path);
  };

  return (
    <div className="sticky top-12 z-[55] w-full bg-[#F5F5F7]/80 backdrop-blur-[20px] h-[52px] border-b border-black/5 flex items-center justify-center">
      <div className="w-full max-w-[1440px] px-8 flex items-center justify-between">
        <div className="relative h-10 w-64">
          <AnimatePresence mode="wait">
            {!isScrolled || !scrolledContent ? (
              <motion.span 
                key="title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 text-lg font-semibold text-black/90 font-sans flex items-center"
              >
                IELTS Resource Hub
              </motion.span>
            ) : (
              <motion.div 
                key="scrolled"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center"
              >
                {scrolledContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-6 text-sm font-sans text-black/60">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`hover:text-black transition-opacity relative py-1
                  ${activeTab === tab.id ? 'text-black font-medium' : ''}
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeLibraryTab"
                    className="absolute -bottom-[16px] left-0 right-0 h-[1px] bg-black/10"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
