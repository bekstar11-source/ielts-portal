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
  const [isScrolled, setIsScrolled] = React.useState(() => typeof window !== 'undefined' ? window.scrollY > 380 : false);

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
    >
      <div className="max-w-[1440px] mx-auto px-6 relative">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="bg-[#f5f5f7] p-1.5 rounded-full flex items-center overflow-x-auto no-scrollbar">
            <LayoutGroup id={`practice-filters-${activeTab}`}>
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

          <div className="flex items-center justify-end w-full lg:w-auto ml-auto gap-3">
            {/* Search Input - Always Visible & Elegant */}
            <div className="flex items-center bg-[#f5f5f7] hover:bg-[#e8e8ed] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 border border-transparent rounded-full px-3.5 py-1.5 transition-all duration-300 w-full lg:w-[240px]">
              <Search size={16} className="text-gray-400 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Qidirish..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[14px] text-[#1d1d1f] placeholder-gray-400 py-0.5"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-black p-0.5 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dedicated Filters Toggle Button */}
            <button
              onClick={() => setShowQuestionFilters(!showQuestionFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 font-semibold text-[14px] shrink-0 ${
                showQuestionFilters 
                  ? 'bg-[#0066cc] border-transparent text-white shadow-md shadow-blue-500/10' 
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>Filtrlar</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${showQuestionFilters ? 'rotate-180' : ''}`} />
            </button>
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
              className="relative w-full overflow-hidden rounded-2xl z-30"
            >
              <div className="bg-[#f5f5f7]/80 backdrop-blur-md p-5 rounded-2xl mt-3 border border-black/[0.05] shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-[#0066cc]" />
                    <h3 className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">Qidiruv filtrlari</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedQuestionTypes([]);
                      setSelectedStatus("all");
                      if (setSelectedPassages) setSelectedPassages([]);
                      if (setSelectedParts) setSelectedParts([]);
                    }}
                    className="text-[12px] font-bold text-[#0066cc] hover:bg-[#0066cc]/5 px-3 py-1 rounded-full transition-all"
                  >
                    Filtrlarni tozalash
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Status & Parts/Passages Grid */}
                  <div className="flex flex-wrap gap-6 items-start">
                    {/* Status Section */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.12em] uppercase ml-1 opacity-80">Holati</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Barchasi' },
                          { id: 'completed', label: 'Yechilgan' },
                          { id: 'not_completed', label: 'Yechilmagan' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStatus(s.id)}
                            className={`text-[12px] px-3.5 py-1.5 rounded-full transition-all font-semibold border ${
                              selectedStatus === s.id 
                                ? 'bg-[#0066cc] text-white border-transparent shadow-sm' 
                                : 'bg-white text-[#1d1d1f] hover:bg-gray-100 border-black/[0.04]'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Parts Section - Listening */}
                    {activeTab === 'listening' && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.12em] uppercase ml-1 opacity-80">Partlar</h4>
                        <div className="flex flex-wrap gap-1.5">
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
                                className={`text-[12px] px-3.5 py-1.5 rounded-full transition-all font-semibold border ${
                                  isSelected 
                                    ? 'bg-[#0066cc] text-white border-transparent shadow-sm' 
                                    : 'bg-white text-[#1d1d1f] hover:bg-gray-100 border-black/[0.04]'
                                }`}
                              >
                                Part {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Passage Section - Reading */}
                    {activeTab === 'reading' && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.12em] uppercase ml-1 opacity-80">Matnlar (Passages)</h4>
                        <div className="flex flex-wrap gap-1.5">
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
                                className={`text-[12px] px-3.5 py-1.5 rounded-full transition-all font-semibold border ${
                                  isSelected 
                                    ? 'bg-[#0066cc] text-white border-transparent shadow-sm' 
                                    : 'bg-white text-[#1d1d1f] hover:bg-gray-100 border-black/[0.04]'
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

                  {/* Question Types Section */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.12em] uppercase ml-1 opacity-80">Savol Turlari</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(activeTab === 'reading' ? [
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
                      ]).map((type) => {
                        const isSelected = selectedQuestionTypes.includes(type.id);
                        return (
                          <button
                            key={type.id}
                            onClick={() => {
                              if (isSelected) setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.id));
                              else setSelectedQuestionTypes([...selectedQuestionTypes, type.id]);
                            }}
                            className={`text-[12px] px-3.5 py-1.5 rounded-full transition-all font-semibold border ${
                              isSelected 
                                ? 'bg-[#0066cc] text-white border-transparent shadow-sm' 
                                : 'bg-white text-[#1d1d1f] hover:bg-gray-100 border-black/[0.04]'
                            }`}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
