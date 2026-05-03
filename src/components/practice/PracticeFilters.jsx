import React from 'react';
import { Search, SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react';
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
  selectedQuestionTypes,
  setSelectedQuestionTypes,
  selectedStatus,
  setSelectedStatus,
  selectedPassages = [],
  setSelectedPassages,
  selectedParts = [],
  setSelectedParts,
  showQuestionFilters,
  setShowQuestionFilters
}) {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 380);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={`sticky top-[44px] z-40 w-full bg-white/40 backdrop-blur-xl mb-6 py-3 transition-all duration-300 ${
        isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onMouseLeave={() => setShowQuestionFilters(false)}
    >
      <div className="max-w-[1440px] mx-auto px-6 relative">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="bg-[#f5f5f7] p-1.5 rounded-full flex items-center overflow-x-auto no-scrollbar">
            <LayoutGroup id="practice-filters">
              {activeTab === 'reading' ? (
                readingFilters.map((filter) => {
                  const isActive = activeSubTab === filter.id;
                  return (
                    <button 
                      key={filter.id}
                      onClick={() => handleSubTabClick(filter)}
                      className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="active-sub-pill"
                          className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                        {filter.label}
                      </span>
                    </button>
                  );
                })
              ) : activeTab === 'listening' ? (
                listeningFilters?.map((filter) => {
                  const isActive = activeSubTab === filter.id;
                  return (
                    <button 
                      key={filter.id}
                      onClick={() => handleSubTabClick(filter)}
                      className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="active-sub-pill"
                          className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                        {filter.label}
                      </span>
                    </button>
                  );
                })
              ) : (
                categories.map((cat) => {
                  const isActive = activeTab === cat.id;
                  return (
                    <button 
                      key={cat.id}
                      onClick={() => handleTabClick(cat.id)}
                      className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="active-pill"
                          className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })
              )}
            </LayoutGroup>
          </div>

          <div className="flex items-center justify-end w-full lg:w-auto ml-auto">
            <motion.div 
              layout
              className={`flex items-center bg-[#f5f5f7] rounded-full overflow-hidden transition-all duration-300 ${
                showQuestionFilters ? 'w-full lg:w-[320px] bg-white ring-1 ring-black/5 shadow-md' : 'w-[42px] h-[42px] hover:bg-gray-200 cursor-pointer'
              }`}
              onClick={() => {
                if (!showQuestionFilters) setShowQuestionFilters(true);
              }}
            >
              <div className="flex items-center h-full px-3 min-w-[42px] justify-center">
                <Search size={18} className={`${showQuestionFilters ? 'text-[#0066cc]' : 'text-[#1d1d1f]'}`} />
              </div>
              
              {showQuestionFilters && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 flex items-center pr-2"
                >
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Testlarni qidirish..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[14px] text-[#1d1d1f] placeholder-gray-400 py-2"
                  />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuestionFilters(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors mr-1"
                  >
                    <X size={18} className="text-[#1d1d1f]" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Question Type Filters Dropdown */}
        <AnimatePresence>
          {showQuestionFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.5 }}
              className="absolute left-0 right-0 top-full overflow-hidden rounded-3xl"
            >
              <div className="bg-white/95 backdrop-blur-2xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.15)] border border-black/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#0066cc]" />
                    <h3 className="text-[19px] font-bold text-[#1d1d1f] tracking-tight">Advanced Filters</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedQuestionTypes([]);
                      setSelectedStatus("all");
                      if (setSelectedPassages) setSelectedPassages([]);
                      if (setSelectedParts) setSelectedParts([]);
                    }}
                    className="text-[13px] font-bold text-[#0066cc] hover:bg-[#0066cc]/5 px-3 py-1.5 rounded-full transition-all"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-8">
                  {/* Status Section */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Status</h4>
                    <div className="flex flex-col gap-1">
                      {[
                        { id: 'all', label: 'All Status' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'not_completed', label: 'Not Completed' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStatus(s.id)}
                          className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                            selectedStatus === s.id ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeTab === 'reading' ? (
                    <>
                      {/* Reading: Completion Group */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Completion</h4>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'GAP FILL', label: 'Gap Fill' },
                            { id: 'SUMMARY', label: 'Summary' },
                            { id: 'DIAGRAM', label: 'Diagram' },
                            { id: 'NOTES', label: 'Notes' },
                            { id: 'TABLE', label: 'Table' },
                            { id: 'FLOW CHART', label: 'Flow Chart' },
                            { id: 'SENTENCE', label: 'Sentence' }
                          ].map((type) => {
                            const isSelected = selectedQuestionTypes.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                onClick={() => {
                                  if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                                  else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reading: Multiple Choice Group */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Multiple Choice</h4>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'MCQ', label: 'MCQ' },
                            { id: 'TRUE/FALSE/NG', label: 'True / False / NG' },
                            { id: 'YES/NO/NG', label: 'Yes / No / NG' }
                          ].map((type) => {
                            const isSelected = selectedQuestionTypes.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                onClick={() => {
                                  if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                                  else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reading: Matching Group */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Matching</h4>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'HEADINGS', label: 'Headings' },
                            { id: 'MATCHING', label: 'Information' },
                            { id: 'PARA MATCH', label: 'Features' },
                          ].map((type) => {
                            const isSelected = selectedQuestionTypes.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                onClick={() => {
                                  if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                                  else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Listening: Completion Group */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Completion</h4>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'FORM', label: 'Form Completion' },
                            { id: 'NOTES', label: 'Note Completion' },
                            { id: 'TABLE', label: 'Table Completion' },
                            { id: 'FLOW CHART', label: 'Flow-chart' },
                            { id: 'SUMMARY', label: 'Summary' },
                            { id: 'SENTENCE', label: 'Sentence' }
                          ].map((type) => {
                            const isSelected = selectedQuestionTypes.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                onClick={() => {
                                  if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                                  else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Listening: Choice & Identification */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Multiple Choice</h4>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'MCQ', label: 'MCQ' },
                            { id: 'MULTI CHOICE', label: 'Multiple Choice' },
                            { id: 'SHORT ANSWER', label: 'Short Answer' }
                          ].map((type) => {
                            const isSelected = selectedQuestionTypes.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                onClick={() => {
                                  if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                                  else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Listening: Visual & Matching */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Mapping</h4>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'MAP', label: 'Map Labelling' },
                            { id: 'PLAN', label: 'Plan Labelling' },
                            { id: 'DIAGRAM', label: 'Diagram Labelling' },
                            { id: 'MATCHING', label: 'Matching' }
                          ].map((type) => {
                            const isSelected = selectedQuestionTypes.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                onClick={() => {
                                  if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                                  else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Listening: Parts Section */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.15em] uppercase opacity-60 ml-2">Parts</h4>
                        <div className="flex flex-col gap-1">
                          {[1, 2, 3, 4].map((p) => {
                            const isSelected = selectedParts.includes(p);
                            return (
                              <button
                                key={p}
                                onClick={() => {
                                  if (setSelectedParts) {
                                    if (isSelected) setSelectedParts(selectedParts.filter(x => x !== p));
                                    else setSelectedParts([...selectedParts, p]);
                                  }
                                }}
                                className={`text-left text-[13px] px-3 py-2 rounded-xl transition-all ${
                                  isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                                }`}
                              >
                                Part {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Passage Section - Only for Reading */}
                  {activeTab === 'reading' && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.08em] uppercase opacity-60">Passage</h4>
                      <div className="flex flex-col gap-0.5">
                        {[1, 2, 3].map((p) => {
                          const isSelected = selectedPassages?.includes(p);
                          return (
                            <button
                              key={p}
                              onClick={() => {
                                if (setSelectedPassages) {
                                  if (isSelected) setSelectedPassages(selectedPassages.filter(x => x !== p));
                                  else setSelectedPassages([...selectedPassages, p]);
                                }
                              }}
                              className={`text-left text-[12px] px-2.5 py-1.5 rounded-lg transition-all ${
                                isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                              }`}
                            >
                              Passage {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
