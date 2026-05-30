import React from 'react';
import { ChevronLeft, Loader2, BookOpen, Crown, List } from 'lucide-react';
import PracticeCard from './PracticeCard';
import { useTranslation } from '../../context/LanguageContext';

const getColDescription = (name) => {
  if (!name) return "Curated collection of high-yield IELTS reading exams.";
  const lower = name.toLowerCase();
  if (lower.includes('cambridge')) {
    return "Official Cambridge practice tests for academic preparation.";
  }
  if (lower.includes('real') || lower.includes('actual') || lower.includes('past')) {
    return "Real past exam papers gathered from actual test sessions.";
  }
  return "Specialized exam sets structured for band score improvement.";
};

export default function ReadingCollectionsSection({
  collectionsSectionRef,
  selectedCollectionId,
  setSelectedCollectionId,
  collectionTests,
  setCollectionTests,
  loadingCollectionTests,
  collectionProcessedTests,
  loadingCollections,
  collections,
  collectionCounts,
  fetchCollectionTests,
  handleReview,
  handleStartTest,
  setSelectedSet,
  isPro,
  isStandard
}) {
  const { t } = useTranslation();
  const visibleCollections = collections.filter(col => (collectionCounts[col.id] || 0) > 0);
  return (
    <div className="space-y-6 pt-12 border-t border-zinc-100" ref={collectionsSectionRef}>
        <div className="space-y-1">
            <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">{t('practice.sets') || "Collections"}</h2>
            <p className="text-[#86868b] text-[14px]">
                {selectedCollectionId 
                    ? "Kolleksiya tarkibidagi reading testlari" 
                    : "Admin tomonidan jamlangan maxsus test to'plamlari"}
            </p>
        </div>

        {selectedCollectionId ? (
            /* Active Collection View */
            <div className="space-y-8">
                {/* Back button and Collection Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-100 gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                setSelectedCollectionId(null);
                                setCollectionTests([]);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors shadow-sm text-zinc-700 active:scale-95"
                        >
                            <ChevronLeft size={16} />
                            Kolleksiyalarga Qaytish
                        </button>
                        <div className="h-6 w-px bg-zinc-200 hidden sm:block" />
                        <h3 className="text-lg font-bold text-zinc-900">
                            {collections.find(c => c.id === selectedCollectionId)?.name}
                        </h3>
                    </div>
                    <span className="text-xs font-bold text-[#0066cc] bg-[#0066cc]/5 border border-[#0066cc]/10 px-3 py-1.5 rounded-full self-start sm:self-auto">
                        {collectionTests.length} ta test
                    </span>
                </div>

                {loadingCollectionTests ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-[#0066cc] animate-spin" />
                    </div>
                ) : collectionTests.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400 text-sm bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                        Ushbu kolleksiyada hozircha reading testlari mavjud emas.
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Full Tests in Collection */}
                        {collectionProcessedTests.fullTestsList.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold text-zinc-800 tracking-tight flex items-center gap-2">
                                    <BookOpen size={20} className="text-[#0066cc]" />
                                    Full Mock Tests ({collectionProcessedTests.fullTestsList.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {collectionProcessedTests.fullTestsList.map(test => (
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
                            </div>
                        )}
                    </div>
                )}
            </div>
        ) : (
            /* Collections Grid View */
            loadingCollections ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-[#0066cc] animate-spin" />
                </div>
            ) : visibleCollections.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 text-sm bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                    Hozircha hech qanday kolleksiya mavjud emas.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {visibleCollections.map(col => {
                        const testCount = collectionCounts[col.id] || 0;
                        const colIdString = col.id ? `COL-${col.id.slice(0, 4).toUpperCase()}` : 'COL-0000';
                        return (
                            <div 
                                key={col.id}
                                onClick={() => {
                                    setSelectedCollectionId(col.id);
                                    fetchCollectionTests(col.id);
                                }}
                                className="group bg-white border border-zinc-200/80 rounded-2xl p-6 hover:border-zinc-300 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[175px] font-sans relative shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                            >
                                {/* Top Header Block: Title + Pro Badge */}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                        <h3 className="font-bold text-zinc-900 text-lg leading-tight tracking-tight group-hover:text-[#0066cc] transition-colors line-clamp-1">
                                            {col.name}
                                        </h3>
                                        <span className="text-[13px] font-medium text-zinc-400 block mt-1">
                                            Reading
                                        </span>
                                    </div>
                                    
                                    {/* PRO Badge */}
                                    <div className="flex items-center gap-1 bg-[#ffd43b] text-[#1d1d1f] font-bold text-[10.5px] px-2.5 py-1.5 rounded-[6px] select-none shrink-0 shadow-sm">
                                        <Crown size={12} className="fill-current text-[#1d1d1f]" />
                                        PRO
                                    </div>
                                </div>

                                {/* Description Block */}
                                <p className="text-zinc-500 text-[14.5px] leading-snug my-3 line-clamp-2">
                                    {col.description || getColDescription(col.name)}
                                </p>

                                {/* Footer Block: Tests Count Badge */}
                                <div className="flex items-center mt-auto">
                                    <div className="flex items-center gap-1.5 bg-[#f1f3f5] text-zinc-800 font-semibold text-[12.5px] px-3 py-1.5 rounded-lg select-none">
                                        <List size={14} className="text-zinc-500" />
                                        {testCount} tests
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
        )}
    </div>
  );
}
