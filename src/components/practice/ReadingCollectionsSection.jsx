import React from 'react';
import { ChevronLeft, Loader2, BookOpen, Crown, List, Zap, Sparkles } from 'lucide-react';
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
    <div className="space-y-6 pt-12 border-t border-warm-hairline dark:border-white/10" ref={collectionsSectionRef}>
        <div className="space-y-1">
            <h2 className="text-[32px] font-semibold text-warm-ink dark:text-warm-on-dark tracking-tight">{t('practice.sets') || "Collections"}</h2>
            <p className="text-warm-muted dark:text-warm-on-dark-soft text-[14px]">
                {selectedCollectionId
                    ? "Kolleksiya tarkibidagi reading testlari"
                    : "Admin tomonidan jamlangan maxsus test to'plamlari"}
            </p>
        </div>

        {selectedCollectionId ? (
            /* Active Collection View */
            <div className="space-y-8">
                {/* Back button and Collection Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-warm-surface dark:bg-white/5 p-4 rounded-2xl border border-warm-hairline dark:border-white/10 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setSelectedCollectionId(null);
                                setCollectionTests([]);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-warm-canvas dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 rounded-xl font-bold text-sm hover:bg-warm-surface dark:hover:bg-white/10 transition-colors shadow-sm text-warm-body dark:text-warm-on-dark-soft active:scale-95"
                        >
                            <ChevronLeft size={16} />
                            Kolleksiyalarga Qaytish
                        </button>
                        <div className="h-6 w-px bg-warm-hairline dark:bg-white/10 hidden sm:block" />
                        <h3 className="text-lg font-bold text-warm-ink dark:text-warm-on-dark">
                            {collections.find(c => c.id === selectedCollectionId)?.name}
                        </h3>
                    </div>
                    <span className="text-xs font-bold text-warm-primary bg-warm-primary/5 border border-warm-primary/10 px-3 py-1.5 rounded-full self-start sm:self-auto">
                        {collectionTests.length} ta test
                    </span>
                </div>

                {loadingCollectionTests ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-warm-primary animate-spin" />
                    </div>
                ) : collectionTests.length === 0 ? (
                    <div className="text-center py-20 text-warm-muted-soft dark:text-warm-muted text-sm bg-warm-surface/50 dark:bg-white/5 rounded-2xl border border-dashed border-warm-hairline dark:border-white/10">
                        Ushbu kolleksiyada hozircha reading testlari mavjud emas.
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Full Tests in Collection */}
                        {collectionProcessedTests.fullTestsList.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold text-warm-body-strong dark:text-warm-on-dark tracking-tight flex items-center gap-2">
                                    <BookOpen size={20} className="text-warm-primary" />
                                    Full Mock Tests ({collectionProcessedTests.fullTestsList.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    <Loader2 className="w-8 h-8 text-warm-primary animate-spin" />
                </div>
            ) : visibleCollections.length === 0 ? (
                <div className="text-center py-20 text-warm-muted-soft dark:text-warm-muted text-sm bg-warm-surface/50 dark:bg-white/5 rounded-2xl border border-dashed border-warm-hairline dark:border-white/10">
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
                                className="group bg-warm-canvas dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 rounded-2xl p-6 hover:border-warm-primary/30 dark:hover:border-white/20 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[175px] font-sans relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                            >
                                {/* White gradient glow */}
                                <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
                                {/* Grain Noise Texture */}
                                <div
                                    className="absolute inset-0 opacity-[0.35] mix-blend-overlay pointer-events-none"
                                    style={{
                                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                                    }}
                                />

                                {/* Top Header Block: Title + Access Badge */}
                                <div className="relative flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                        <h3 className="font-bold text-warm-ink dark:text-warm-on-dark text-lg leading-tight tracking-tight group-hover:text-warm-primary transition-colors line-clamp-1">
                                            {col.name}
                                        </h3>
                                        <span className="text-[13px] font-medium text-warm-muted-soft dark:text-warm-muted block mt-1">
                                            Reading
                                        </span>
                                    </div>

                                    {/* Dynamic Access Badge */}
                                    {(!col.accessTier || col.accessTier === 'pro') && (
                                        <div className="flex items-center gap-1 bg-[#ffd43b] text-[#1d1d1f] font-bold text-[10.5px] px-2.5 py-1.5 rounded-[6px] select-none shrink-0 shadow-sm">
                                            <Crown size={12} className="fill-current text-[#1d1d1f]" />
                                            PRO
                                        </div>
                                    )}
                                    {col.accessTier === 'standard' && (
                                        <div className="flex items-center gap-1 bg-blue-600 text-white font-bold text-[10.5px] px-2.5 py-1.5 rounded-[6px] select-none shrink-0 shadow-sm">
                                            <Zap size={12} className="fill-current text-white" />
                                            STANDARD
                                        </div>
                                    )}
                                    {col.accessTier === 'free' && (
                                        <div className="flex items-center gap-1 bg-emerald-500 text-white font-bold text-[10.5px] px-2.5 py-1.5 rounded-[6px] select-none shrink-0 shadow-sm">
                                            <Sparkles size={12} className="fill-current text-white" />
                                            FREE
                                        </div>
                                    )}
                                </div>

                                {/* Description Block */}
                                <p className="relative text-warm-muted dark:text-warm-on-dark-soft text-[14.5px] leading-snug my-3 line-clamp-2">
                                    {col.description || getColDescription(col.name)}
                                </p>

                                {/* Footer Block: Tests Count Badge */}
                                <div className="relative flex items-center mt-auto">
                                    <div className="flex items-center gap-1.5 bg-warm-surface dark:bg-white/5 text-warm-body dark:text-warm-on-dark-soft font-semibold text-[12.5px] px-3 py-1.5 rounded-lg select-none">
                                        <List size={14} className="text-warm-muted dark:text-warm-on-dark-soft" />
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
