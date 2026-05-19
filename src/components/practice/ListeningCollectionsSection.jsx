import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Headphones, BookOpen } from 'lucide-react';
import PracticeCard from './PracticeCard';

export default function ListeningCollectionsSection({
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
  return (
    <div className="space-y-6 pt-12 border-t border-zinc-100" ref={collectionsSectionRef}>
        <div className="space-y-1">
            <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Collections</h2>
            <p className="text-[#86868b] text-[14px]">
                {selectedCollectionId 
                    ? "Kolleksiya tarkibidagi listening testlari" 
                    : "Admin tomonidan jamlangan maxsus test to'plamlari"}
            </p>
        </div>

        {selectedCollectionId ? (
            /* Active Collection View */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        Ushbu kolleksiyada hozircha listening testlari mavjud emas.
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Parts in Collection */}
                        {collectionProcessedTests.partTestsList.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold text-zinc-800 tracking-tight flex items-center gap-2">
                                    <Headphones size={20} className="text-[#0066cc]" />
                                    Listening Parts ({collectionProcessedTests.partTestsList.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {collectionProcessedTests.partTestsList.map(test => (
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

                        {/* Full Tests in Collection */}
                        {collectionProcessedTests.fullTestsList.length > 0 && (
                            <div className="space-y-4 pt-8 border-t border-zinc-100">
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
            ) : collections.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 text-sm bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                    Hozircha hech qanday kolleksiya yaratilmagan.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                    {collections.map(col => {
                        const testCount = collectionCounts[col.id] || 0;
                        return (
                            <div 
                                key={col.id}
                                onClick={() => {
                                    setSelectedCollectionId(col.id);
                                    fetchCollectionTests(col.id);
                                }}
                                className="group relative bg-white border border-zinc-100 rounded-3xl p-6 hover:border-[#0066cc]/30 hover:shadow-2xl hover:shadow-[#0066cc]/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden h-[200px]"
                            >
                                {/* Background glow overlay */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#0066cc]/5 rounded-full blur-2xl group-hover:bg-[#0066cc]/10 transition-colors duration-300" />
                                
                                <div className="space-y-4">
                                    {/* Thumbnail or Folder Icon */}
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        {col.thumbnail ? (
                                            <img src={col.thumbnail} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <BookOpen className="w-6 h-6 text-zinc-400 group-hover:text-[#0066cc] transition-colors" />
                                        )}
                                    </div>
                                    
                                    {/* Collection Title */}
                                    <h3 className="font-bold text-zinc-800 text-base line-clamp-2 leading-snug group-hover:text-[#0066cc] transition-colors">
                                        {col.name}
                                    </h3>
                                </div>

                                {/* Bottom Info Row */}
                                <div className="flex items-center justify-between pt-4 border-t border-zinc-100/50">
                                    <span className="text-xs font-semibold text-zinc-400">
                                        {testCount} ta test
                                    </span>
                                    <span className="text-xs font-bold text-[#0066cc] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Ochish <ChevronRight size={14} />
                                    </span>
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
