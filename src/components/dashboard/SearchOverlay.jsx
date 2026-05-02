import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';

export default function SearchOverlay({ isOpen, onClose }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null; // Handled by header usually, but good to have
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const quickLinks = [
    { label: 'Find a Test', path: '/reading' },
    { label: 'Articles', path: '/articles' },
    { label: 'Podcasts', path: '/podcasts' },
    { label: 'Word Bank', path: '/vocabulary' },
    { label: 'My Results', path: '/my-results' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-11 left-0 w-full bg-white border-b border-zinc-100 z-50 pt-10 pb-16 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-[900px] mx-auto px-6">
            {/* Search Input Container */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative flex items-center mb-6 border-b border-zinc-100 pb-1"
            >
              <Search className="absolute left-0 text-zinc-400" size={16} strokeWidth={2} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search ielts-portal.com"
                className="w-full bg-transparent border-none py-1 pl-6 pr-4 text-[18px] font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none focus:ring-0 tracking-tight"
              />
            </motion.div>

            {/* Quick Links */}
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-5">
                <h3 className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-4">Quick Links</h3>
                <div className="flex flex-col gap-1.5">
                  {quickLinks.map((link, index) => (
                    <motion.a
                      key={index}
                      href={link.path}
                      className="flex items-center gap-2 py-0.5 text-zinc-800 hover:text-black transition-all group"
                    >
                      <svg viewBox="0 0 24 24" width="10" height="10" className="text-zinc-300 group-hover:text-black transition-colors">
                        <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
                      </svg>
                      <span className="text-[13px] font-medium tracking-tight group-hover:translate-x-1 transition-transform">{link.label}</span>
                    </motion.a>
                  ))}
                </div>
              </div>
              
              <div className="col-span-7">
                <h3 className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-4">Trending</h3>
                <div className="flex flex-wrap gap-2">
                  {['Reading Tips', 'Writing Task 2', 'Speaking', 'Mock Exam', 'Band 9'].map((topic, i) => (
                    <span key={i} className="px-3 py-1.5 bg-zinc-50 rounded-full text-[12px] font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer transition-colors">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
