import { Search, SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';

export default function PracticeFilters({ 
  activeTab, 
  setActiveTab, 
  activeSubTab, 
  handleSubTabClick, 
  readingFilters, 
  categories, 
  searchQuery, 
  setSearchQuery,
  handleTabClick,
  allQuestionTypes = [],
  selectedQuestionTypes,
  setSelectedQuestionTypes,
  selectedStatus,
  setSelectedStatus,
  selectedPassages,
  setSelectedPassages,
  showQuestionFilters,
  setShowQuestionFilters
}) {
  return (
    <div 
      className="sticky top-[44px] z-40 w-full bg-white/40 backdrop-blur-xl mb-6 py-3"
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
              <div className="bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[17px] font-bold text-[#1d1d1f]">Filters</h3>
                  <button 
                    onClick={() => {
                      setSelectedQuestionTypes([]);
                      setSelectedStatus("all");
                      setSelectedPassages([]);
                    }}
                    className="text-[12px] font-semibold text-[#0066cc] hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-x-2 gap-y-3">
                  {/* Status Section */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.08em] uppercase opacity-60">Status</h4>
                    <div className="flex flex-col gap-0.5">
                      {[
                        { id: 'all', label: 'All Status' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'not_completed', label: 'Not Completed' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStatus(s.id)}
                          className={`text-left text-[12px] px-2.5 py-1 rounded-lg transition-all ${
                            selectedStatus === s.id ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Completion Group */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.08em] uppercase opacity-60">Completion</h4>
                    <div className="flex flex-col gap-0.5">
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
                            className={`text-left text-[12px] px-2.5 py-1 rounded-lg transition-all ${
                              isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                            }`}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multiple Choice Group */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.08em] uppercase opacity-60">Multiple Choice</h4>
                    <div className="flex flex-col gap-0.5">
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
                            className={`text-left text-[12px] px-2.5 py-1 rounded-lg transition-all ${
                              isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                            }`}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matching Group */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.08em] uppercase opacity-60">Matching</h4>
                    <div className="flex flex-col gap-0.5">
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
                            className={`text-left text-[12px] px-2.5 py-1 rounded-lg transition-all ${
                              isSelected ? 'bg-[#f5f5f7] font-bold text-[#1d1d1f]' : 'text-[#424245] hover:bg-gray-50'
                            }`}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Passage Section */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[#86868b] tracking-[0.08em] uppercase opacity-60">Passage</h4>
                    <div className="flex flex-col gap-0.5">
                      {[1, 2, 3].map((p) => {
                        const isSelected = selectedPassages.includes(p);
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              if (isSelected) setSelectedPassages(selectedPassages.filter(x => x !== p));
                              else setSelectedPassages([...selectedPassages, p]);
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
