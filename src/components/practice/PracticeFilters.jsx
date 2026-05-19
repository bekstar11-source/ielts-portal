import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Bookmark, Layers, HelpCircle, RotateCcw } from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';

export default function PracticeFilters({ 
  activeTab, 
  setActiveTab, 
  activeSubTab, 
  handleSubTabClick, 
  readingFilters, 
  listeningFilters,
  categories, 
  searchQuery, 
  setSearchQuery,
  handleTabClick,
  allQuestionTypes = [],
  selectedQuestionTypes = [],
  setSelectedQuestionTypes,
  selectedStatus = "all",
  setSelectedStatus,
  selectedPassages = [],
  setSelectedPassages,
  selectedParts = [],
  setSelectedParts,
  isStandalonePage = false
}) {
  const [isScrolled, setIsScrolled] = useState(() => typeof window !== 'undefined' ? window.scrollY > 380 : false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'status' | 'passages' | 'parts' | 'types' | null
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 380);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const clearFilters = () => {
    setSelectedQuestionTypes([]);
    setSelectedStatus("all");
    if (setSelectedPassages) setSelectedPassages([]);
    if (setSelectedParts) setSelectedParts([]);
    setOpenDropdown(null);
  };

  // Status mapping
  const statusOptions = [
    { id: 'all', label: 'Barchasi' },
    { id: 'completed', label: 'Yechilgan' },
    { id: 'not_completed', label: 'Yechilmagan' }
  ];

  const getStatusLabel = () => {
    const found = statusOptions.find(o => o.id === selectedStatus);
    return found ? found.label : 'Barchasi';
  };

  // Question Types mapping based on tab
  const questionTypeOptions = activeTab === 'reading' ? [
    { id: 'GAP FILL', label: 'Gap Fill' },
    { id: 'SUMMARY', label: 'Summary' },
    { id: 'DIAGRAM', label: 'Diagram' },
    { id: 'NOTES', label: 'Notes' },
    { id: 'TABLE', label: 'Table' },
    { id: 'FLOW CHART', label: 'Flow Chart' },
    { id: 'SENTENCE', label: 'Sentence' },
    { id: 'MCQ', label: 'MCQ' },
    { id: 'TRUE/FALSE/NG', label: 'True / False / NG' },
    { id: 'YES/NO/NG', label: 'Yes / No / NG' },
    { id: 'HEADINGS', label: 'Headings' },
    { id: 'MATCHING', label: 'Information Matching' },
    { id: 'PARA MATCH', label: 'Features Matching' },
  ] : [
    { id: 'FORM', label: 'Form Completion' },
    { id: 'NOTES', label: 'Note Completion' },
    { id: 'TABLE', label: 'Table Completion' },
    { id: 'FLOW CHART', label: 'Flow-chart' },
    { id: 'SUMMARY', label: 'Summary' },
    { id: 'SENTENCE', label: 'Sentence' },
    { id: 'MCQ', label: 'MCQ' },
    { id: 'MULTI CHOICE', label: 'Multiple Choice' },
    { id: 'SHORT ANSWER', label: 'Short Answer' },
    { id: 'MAP', label: 'Map Labelling' },
    { id: 'PLAN', label: 'Plan Labelling' },
    { id: 'DIAGRAM', label: 'Diagram Labelling' },
    { id: 'MATCHING', label: 'Matching' }
  ];

  const hasAnyFilterActive = selectedStatus !== 'all' || 
                            selectedQuestionTypes.length > 0 || 
                            (selectedPassages && selectedPassages.length > 0) || 
                            (selectedParts && selectedParts.length > 0);

  return (
    <div 
      ref={containerRef}
      className={`sticky top-[44px] z-45 w-full bg-white dark:bg-zinc-900 border-b border-black/[0.04] dark:border-white/[0.05] mb-6 py-3 transition-all duration-300 ${
        isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* LEFT: Subtabs & Figma Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Main Subtabs Pills (Full Test / Sets) */}
            {((activeTab === 'reading' && readingFilters && readingFilters.length > 0) ||
              (activeTab === 'listening' && listeningFilters && listeningFilters.length > 0)) && (
              <div className="bg-[#f5f5f7] dark:bg-zinc-800/80 p-1 rounded-full flex items-center shrink-0">
                <LayoutGroup id={`practice-filters-${activeTab}`}>
                  {activeTab === 'reading' && readingFilters.map((filter) => {
                    const isActive = activeSubTab === filter.id;
                    return (
                      <button 
                        key={filter.id}
                        onClick={() => handleSubTabClick(filter)}
                        className="relative px-5 py-1.5 rounded-full text-[12px] font-bold transition-colors duration-300 outline-none whitespace-nowrap"
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-[#1d1d1f] dark:bg-white rounded-full"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 ${isActive ? 'text-white dark:text-zinc-900' : 'text-[#1d1d1f] dark:text-zinc-400 hover:text-black/50 dark:hover:text-white/50'}`}>
                          {filter.label}
                        </span>
                      </button>
                    );
                  })}
                  {activeTab === 'listening' && listeningFilters.map((filter) => {
                    const isActive = activeSubTab === filter.id;
                    return (
                      <button 
                        key={filter.id}
                        onClick={() => handleSubTabClick(filter)}
                        className="relative px-5 py-1.5 rounded-full text-[12px] font-bold transition-colors duration-300 outline-none whitespace-nowrap"
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-[#1d1d1f] dark:bg-white rounded-full"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 ${isActive ? 'text-white dark:text-zinc-900' : 'text-[#1d1d1f] dark:text-zinc-400 hover:text-black/50 dark:hover:text-white/50'}`}>
                          {filter.label}
                        </span>
                      </button>
                    );
                  })}
                </LayoutGroup>
              </div>
            )}

            {/* Separator if subtabs are present */}
            {((activeTab === 'reading' && readingFilters && readingFilters.length > 0) ||
              (activeTab === 'listening' && listeningFilters && listeningFilters.length > 0)) && (
              <div className="hidden lg:block w-[1px] h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
            )}

            {/* DROPDOWN 1: Status */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('status')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all duration-200 select-none ${
                  selectedStatus !== 'all'
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Bookmark size={14} className="opacity-75" />
                <span>Status: {getStatusLabel()}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openDropdown === 'status' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1.5 w-[180px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-1"
                  >
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedStatus(opt.id);
                          setOpenDropdown(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                      >
                        <span>{opt.label}</span>
                        {selectedStatus === opt.id && <Check size={14} className="text-blue-500" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* DROPDOWN 2: Passages (Reading only) */}
            {activeTab === 'reading' && setSelectedPassages && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('passages')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all duration-200 select-none ${
                    selectedPassages.length > 0
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Layers size={14} className="opacity-75" />
                  <span>Matnlar: {selectedPassages.length > 0 ? selectedPassages.join(', ') : 'Barchasi'}</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'passages' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {openDropdown === 'passages' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 mt-1.5 w-[160px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-1"
                    >
                      {[1, 2, 3].map((num) => {
                        const isSel = selectedPassages.includes(num);
                        return (
                          <button
                            key={num}
                            onClick={() => {
                              if (isSel) {
                                setSelectedPassages(selectedPassages.filter(x => x !== num));
                              } else {
                                setSelectedPassages([...selectedPassages, num]);
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                          >
                            <span>Passage {num}</span>
                            {isSel && <Check size={14} className="text-blue-500" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* DROPDOWN 2b: Parts (Listening only) */}
            {activeTab === 'listening' && setSelectedParts && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('parts')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all duration-200 select-none ${
                    selectedParts.length > 0
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Layers size={14} className="opacity-75" />
                  <span>Partlar: {selectedParts.length > 0 ? selectedParts.map(p => `Part ${p}`).join(', ') : 'Barchasi'}</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'parts' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {openDropdown === 'parts' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 mt-1.5 w-[160px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-1"
                    >
                      {[1, 2, 3, 4].map((num) => {
                        const isSel = selectedParts.includes(num);
                        return (
                          <button
                            key={num}
                            onClick={() => {
                              if (isSel) {
                                setSelectedParts(selectedParts.filter(x => x !== num));
                              } else {
                                setSelectedParts([...selectedParts, num]);
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                          >
                            <span>Part {num}</span>
                            {isSel && <Check size={14} className="text-blue-500" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* DROPDOWN 3: Question Types */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('types')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all duration-200 select-none ${
                  selectedQuestionTypes.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <HelpCircle size={14} className="opacity-75" />
                <span>Savol Turlari: {selectedQuestionTypes.length > 0 ? `${selectedQuestionTypes.length} ta` : 'Barchasi'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'types' ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openDropdown === 'types' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1.5 w-[250px] max-h-[300px] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-1 scrollbar-thin"
                  >
                    {questionTypeOptions.map((opt) => {
                      const isSel = selectedQuestionTypes.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            if (isSel) {
                              setSelectedQuestionTypes(selectedQuestionTypes.filter(x => x !== opt.id));
                            } else {
                              setSelectedQuestionTypes([...selectedQuestionTypes, opt.id]);
                            }
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                        >
                          <span>{opt.label}</span>
                          {isSel && <Check size={14} className="text-blue-500" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clear Filters Button (If any filter is active) */}
            {hasAnyFilterActive && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 text-[12px] font-bold transition-all duration-200"
              >
                <RotateCcw size={12} />
                <span>Tozalash</span>
              </button>
            )}
          </div>

          {/* RIGHT: Search Input */}
          <div className="flex items-center bg-[#f5f5f7] dark:bg-zinc-800/70 hover:bg-[#e8e8ed] dark:hover:bg-zinc-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 border border-transparent rounded-lg px-3 py-1.5 transition-all duration-350 w-full lg:w-[240px] shrink-0">
            <Search size={14} className="text-gray-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[13px] text-[#1d1d1f] dark:text-white placeholder-gray-450 dark:placeholder-gray-500 py-0"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="text-gray-450 hover:text-black dark:hover:text-white p-0.5 rounded-full"
              >
                <X size={13} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
