import React from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import PracticeCard from './PracticeCard';

export default function ListeningPartsSection({
  partsSectionRef,
  filteredVirtualParts,
  activePartFilter,
  setActivePartFilter,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  handleReview,
  handleStartTest,
  setSelectedSet,
  isPro,
  isStandard,
  hasMore,
  fetchLibraryPage,
  loadingLibrary
}) {
  return (
    <div className="space-y-6" ref={partsSectionRef}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
                <h2 className="text-[32px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">Listening Parts</h2>
                <p className="text-[#86868b] dark:text-zinc-400 text-[14px]">Displaying {filteredVirtualParts.length} part practice tests</p>
            </div>

            {/* Beautiful Segmented Tab Filter */}

        </div>
        
        {filteredVirtualParts.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
                Ushbu bo'limga mos part practice testlari topilmadi.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pt-4">
                {filteredVirtualParts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
                    <PracticeCard 
                        key={test.id} 
                        test={test} 
                        isCompleted={!!test.result}
                        onReview={handleReview}
                        onStart={handleStartTest}
                        onSelectSet={setSelectedSet}
                        isPro={isPro}
                        isStandard={isStandard}
                    />
                ))}
            </div>
        )}

        {/* Pagination & Load More */}
        <div className="flex flex-col items-center gap-5 pt-10 pb-8">
            {filteredVirtualParts.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-1.5">
                    {(() => {
                        const totalPages = Math.ceil(filteredVirtualParts.length / itemsPerPage);
                        const pages = [];
                        const delta = 1; 
                        
                        for (let i = 1; i <= totalPages; i++) {
                            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                                pages.push(i);
                            } else if (i === currentPage - delta - 1 || i === currentPage + delta + 1) {
                                pages.push('...');
                            }
                        }
                        const uniquePages = pages.filter((p, i) => p !== '...' || pages[i-1] !== '...');

                        return uniquePages.map((p, i) => (
                            p === '...' ? (
                                <span key={`dots-${i}`} className="text-[#86868b] dark:text-zinc-500 px-1 text-[13px]">...</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => {
                                        setCurrentPage(p);
                                        if (partsSectionRef.current) {
                                            const yOffset = -140; 
                                            const y = partsSectionRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
                                            window.scrollTo({ top: y, behavior: 'smooth' });
                                        }
                                    }}
                                    className={`w-8 h-8 rounded-full text-[13px] font-semibold transition-all ${
                                        currentPage === p 
                                        ? 'bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-[#1d1d1f]' 
                                        : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-gray-200 dark:bg-zinc-800 dark:text-[#f5f5f7] dark:hover:bg-zinc-700'
                                    }`}
                                >
                                    {p}
                                </button>
                            )
                        ));
                    })()}
                </div>
            )}

            {hasMore && (
                <button
                    onClick={() => fetchLibraryPage()}
                    disabled={loadingLibrary}
                    className="group relative flex items-center gap-3 px-8 py-3.5 bg-[#1d1d1f] text-white rounded-full font-semibold transition-all hover:bg-black active:scale-95 disabled:opacity-50 text-[13px] shadow-sm"
                >
                    {loadingLibrary ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <>
                            Show More Tests
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            )}
        </div>
    </div>
  );
}
