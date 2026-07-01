import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Bookmark, Layers, HelpCircle, RotateCcw, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/LanguageContext';

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
  isStandalonePage = false,
  freeOnly = false,
  setFreeOnly,
  showFreeFilter = false,
  sortOrder = 'desc',
  setSortOrder
}) {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'status' | 'passages' | 'parts' | 'types' | null
  
  const containerRef = useRef(null);
  const keepVisibleOnScroll = isStandalonePage;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > (keepVisibleOnScroll ? 120 : 380));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [keepVisibleOnScroll]);

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
    if (setFreeOnly) setFreeOnly(false);
    setOpenDropdown(null);
  };

  // Status mapping
  const statusOptions = [
    { id: 'all', label: t('practice.statusAll') },
    { id: 'completed', label: t('practice.statusCompleted') },
    { id: 'not_completed', label: t('practice.statusNotCompleted') }
  ];

  const getStatusLabel = () => {
    const found = statusOptions.find(o => o.id === selectedStatus);
    return found ? found.label : t('practice.statusAll');
  };

  const questionTypeGroups = React.useMemo(() => {
    if (activeTab === 'listening') {
      return [
        {
          title: 'COMPLETION',
          options: [
            { id: 'form_completion', label: t('practice.formCompletion'), dbTypes: ['FORM'] },
            { id: 'note_completion', label: t('practice.noteCompletion'), dbTypes: ['NOTES', 'GAP FILL'] },
            { id: 'table_completion', label: t('practice.tableCompletion'), dbTypes: ['TABLE'] },
            { id: 'flowchart_completion', label: t('practice.flowChartCompletion'), dbTypes: ['FLOW CHART'] },
            { id: 'summary_completion', label: t('practice.summaryCompletion'), dbTypes: ['SUMMARY'] },
            { id: 'sentence_completion', label: t('practice.sentenceCompletion'), dbTypes: ['SENTENCE'] }
          ]
        },
        {
          title: 'MULTIPLE CHOICE',
          options: [
            { id: 'multiple_choice', label: t('practice.multipleChoice'), dbTypes: ['MCQ'] },
            { id: 'pick_two', label: t('practice.pickTwo'), dbTypes: ['MULTI CHOICE'] },
            { id: 'short_answer', label: t('practice.shortAnswer'), dbTypes: ['SHORT ANSWER'] }
          ]
        },
        {
          title: 'MATCHING',
          options: [
            { id: 'matching', label: t('practice.matching') || 'Matching', dbTypes: ['MATCHING'] },
            { id: 'map_plan_diagram', label: t('practice.mapPlanDiagram'), dbTypes: ['MAP', 'PLAN', 'DIAGRAM'] }
          ]
        }
      ];
    }
    return [
      {
        title: 'COMPLETION',
        options: [
          { id: 'note_completion', label: t('practice.noteCompletion'), dbTypes: ['NOTES', 'GAP FILL'] },
          { id: 'table_completion', label: t('practice.tableCompletion'), dbTypes: ['TABLE'] },
          { id: 'flowchart_completion', label: t('practice.flowChartCompletion'), dbTypes: ['FLOW CHART'] },
          { id: 'summary_completion', label: t('practice.summaryCompletion'), dbTypes: ['SUMMARY'] },
          { id: 'sentence_completion', label: t('practice.sentenceCompletion'), dbTypes: ['SENTENCE'] }
        ]
      },
      {
        title: 'MULTIPLE CHOICE',
        options: [
          { id: 'multiple_choice', label: t('practice.multipleChoice'), dbTypes: ['MCQ'] },
          { id: 'pick_two', label: t('practice.pickTwo'), dbTypes: ['MULTI CHOICE'] },
          { id: 'short_answer', label: t('practice.shortAnswer'), dbTypes: ['SHORT ANSWER'] }
        ]
      },
      {
        title: 'MATCHING',
        options: [
          { id: 'matching_names', label: t('practice.matchingNames'), dbTypes: ['PARA MATCH', 'MATCHING'] },
          { id: 'matching_features', label: t('practice.matchingFeatures'), dbTypes: ['MATCHING'] },
          { id: 'matching_sentence_endings', label: t('practice.matchingSentenceEndings'), dbTypes: ['SENTENCE', 'PARA MATCH'] },
          { id: 'flow_chart_matching', label: t('practice.flowChartMatching'), dbTypes: ['FLOW CHART'] },
          { id: 'map_plan_diagram', label: t('practice.mapPlanDiagram'), dbTypes: ['MAP', 'PLAN', 'DIAGRAM'] }
        ]
      },
      {
        title: 'IDENTIFICATION & HEADINGS',
        options: [
          { id: 'true_false_ng', label: t('practice.trueFalseNg'), dbTypes: ['TRUE/FALSE/NG'] },
          { id: 'yes_no_ng', label: t('practice.yesNoNg'), dbTypes: ['YES/NO/NG'] },
          { id: 'headings', label: t('practice.headings'), dbTypes: ['HEADINGS'] }
        ]
      }
    ];
  }, [activeTab, t]);

  const getSelectedOptionsCount = () => {
    let count = 0;
    questionTypeGroups.forEach(group => {
      group.options.forEach(opt => {
        if (opt.dbTypes.some(t => selectedQuestionTypes.includes(t))) {
          count++;
        }
      });
    });
    return count;
  };

  const hasAnyFilterActive = selectedStatus !== 'all' || 
                            selectedQuestionTypes.length > 0 || 
                            (selectedPassages && selectedPassages.length > 0) || 
                            (selectedParts && selectedParts.length > 0) ||
                            freeOnly;

  return (
    <div 
      ref={containerRef}
      className={`sticky z-40 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-black/[0.04] dark:border-white/[0.05] mb-6 py-3 transition-shadow duration-300 ${
        keepVisibleOnScroll ? 'top-0 md:top-12' : 'top-[44px]'
      } ${
        keepVisibleOnScroll || !isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        keepVisibleOnScroll && isScrolled ? 'shadow-sm' : ''
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

            {/* Free tests filter checkbox (Only for free plan users) */}
            {showFreeFilter && setFreeOnly && (
              <button
                onClick={() => setFreeOnly(!freeOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all duration-200 select-none free-filter-glow ${
                  freeOnly
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-250 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                    : 'bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                  freeOnly 
                    ? 'border-amber-550 bg-amber-500 text-white' 
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950'
                }`}>
                  {freeOnly && <Check size={10} strokeWidth={3} />}
                </div>
                <span>{t('practice.freeOnly') || "Free Tests"}</span>
              </button>
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
                <span>{t('practice.filterStatus')}: {getStatusLabel()}</span>
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
                  <span>{t('practice.filterPassages')}: {selectedPassages.length > 0 ? selectedPassages.map(n => t('practice.passageNum').replace('{num}', n)).join(', ') : t('practice.statusAll')}</span>
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
                            <span>{t('practice.passageNum').replace('{num}', num)}</span>
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
                  <span>{t('practice.filterParts')}: {selectedParts.length > 0 ? selectedParts.map(p => t('practice.partNum').replace('{num}', p)).join(', ') : t('practice.statusAll')}</span>
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

            {/* Sort Order Toggle (Listening only) */}
            {activeTab === 'listening' && setSortOrder && (
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all duration-200 select-none bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                title={sortOrder === 'desc' ? 'Z → A (20, 19, 18...)' : 'A → Z (14, 15, 16...)'}
              >
                {sortOrder === 'desc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
                <span>{sortOrder === 'desc' ? 'Z → A' : 'A → Z'}</span>
              </button>
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
                <span>{getSelectedOptionsCount() > 0 ? t('practice.filterQuestionTypesCount').replace('{count}', getSelectedOptionsCount()) : `${t('practice.filterQuestionTypes')}: ${t('practice.statusAll')}`}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'types' ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openDropdown === 'types' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1.5 w-[calc(100vw-32px)] sm:w-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-6"
                  >
                    <div className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 mb-5 select-none">
                      Question Types
                    </div>
                    <div className="space-y-6">
                      {questionTypeGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-2.5">
                          <span className="text-[10px] font-bold tracking-wider text-[#7e8a9f] dark:text-zinc-500 block uppercase">
                            {group.title}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                            {group.options.map((opt) => {
                              const isSel = opt.dbTypes.some(t => selectedQuestionTypes.includes(t));
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    if (isSel) {
                                      setSelectedQuestionTypes(selectedQuestionTypes.filter(x => !opt.dbTypes.includes(x)));
                                    } else {
                                      setSelectedQuestionTypes([...selectedQuestionTypes, ...opt.dbTypes]);
                                    }
                                  }}
                                  className="flex items-center gap-3 group text-left outline-none"
                                >
                                  <div className={`w-[18px] h-[18px] rounded border flex items-center justify-center transition-all shrink-0 ${
                                    isSel 
                                      ? 'border-[#0066cc] bg-[#0066cc] text-white' 
                                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
                                  }`}>
                                    {isSel && <Check size={11} strokeWidth={3} />}
                                  </div>
                                  <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
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
                <span>{t('practice.clearFilters')}</span>
              </button>
            )}
          </div>

          {/* RIGHT: Search Input */}
          <div className="flex items-center bg-[#f5f5f7] dark:bg-zinc-800/70 hover:bg-[#e8e8ed] dark:hover:bg-zinc-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 border border-transparent rounded-lg px-3 py-1.5 transition-all duration-350 w-full lg:w-[240px] shrink-0">
            <Search size={14} className="text-gray-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder={t('practice.searchPlaceholder')} 
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
