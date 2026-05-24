import React from 'react';
import PracticeCard from './PracticeCard';

export default function ListeningFullTestsSection({
  filteredFullTests,
  fullTestSectionRef,
  handleReview,
  handleStartTest,
  setSelectedSet,
  isPro,
  isStandard
}) {
  return (
    filteredFullTests.length > 0 && (
        <div className="space-y-4 pt-10 border-t border-zinc-100" ref={fullTestSectionRef}>
            <div className="space-y-1">
                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Full Tests</h2>
                <p className="text-[#86868b] text-[14px]">Displaying {filteredFullTests.length} full length mock tests</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 pt-4">
                {filteredFullTests.map((test) => (
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
    )
  );
}
