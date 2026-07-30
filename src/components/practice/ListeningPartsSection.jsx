import React from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import PracticeCard from './PracticeCard';
import { useTranslation } from '../../context/LanguageContext';

export default function ListeningPartsSection({
  partsSectionRef,
  filteredVirtualParts,
  activePartFilter,
  setActivePartFilter,
  visibleCount,
  handleShowMore,
  handleReview,
  handleStartTest,
  setSelectedSet,
  isPro,
  isStandard,
  hasMore,
  loadingLibrary
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6" ref={partsSectionRef}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-warm-hairline dark:border-white/10 pb-4">
            <div className="space-y-1">
                <h2 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold text-warm-ink dark:text-warm-on-dark tracking-tight">Listening Parts</h2>
                <p className="text-warm-muted dark:text-warm-on-dark-soft text-[14px]">Displaying {filteredVirtualParts.length} part practice tests</p>
            </div>

            {/* Beautiful Segmented Tab Filter */}

        </div>

        {filteredVirtualParts.length === 0 ? (
            <div className="text-center py-20 text-warm-muted-soft dark:text-warm-muted text-sm">
                Ushbu bo'limga mos part practice testlari topilmadi.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pt-4">
                {filteredVirtualParts.slice(0, visibleCount).map((test) => (
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

        {/* Show More Button */}
        {(filteredVirtualParts.length > visibleCount || hasMore) && (
            <div className="flex justify-center items-center pt-10 pb-8">
                <button
                    onClick={handleShowMore}
                    disabled={loadingLibrary}
                    className="group relative flex items-center gap-3 px-8 py-3.5 bg-warm-ink hover:bg-black dark:bg-warm-on-dark dark:hover:bg-white dark:text-warm-ink text-white rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50 text-[13px] shadow-sm"
                >
                    {loadingLibrary ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <>
                            {t('practice.showMore') || "Show More"}
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        )}
    </div>
  );
}
