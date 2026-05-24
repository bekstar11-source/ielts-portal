import React, { useEffect, useState } from 'react';
import RoadmapTimeline from './RoadmapTimeline';

// REFACTORED COMPONENTS
import DashboardWelcome from './DashboardWelcome';
import DashboardAnalytics from './DashboardAnalytics';
import DashboardReadingCarousel from './DashboardReadingCarousel';
import DashboardArticles from './DashboardArticles';
import DashboardListeningBanner from './DashboardListeningBanner';
import DashboardListeningCarousel from './DashboardListeningCarousel';

export default function HeroSection({
    userName = "O'quvchi",
    targetBand = 7.5,
    currentBand = 0,
    previousBand = 0,
    daysRemaining = null,
    examDate = null,
    skillStats = [],
    onToggleSkill,
    usageStats = null,
    onStartTest = null,
    assignments = [],
}) {
    const [animatedCurrent, setAnimatedCurrent] = useState(0);
    const [animatedDays, setAnimatedDays] = useState(0);
    const [isListeningPaused, setIsListeningPaused] = useState(false);

    const calculatedDays = examDate
        ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
        : daysRemaining;
    const finalDays = calculatedDays ?? 0;

    useEffect(() => {
        const steps = 60;
        const stepDuration = 1500 / steps;
        let step = 0;
        const t = setInterval(() => {
            step++;
            const p = step / steps;
            setAnimatedCurrent(parseFloat((parseFloat(currentBand || 0) * p).toFixed(1)));
            setAnimatedDays(Math.round(finalDays * p));
            if (step >= steps) {
                clearInterval(t);
                setAnimatedCurrent(parseFloat(currentBand || 0));
                setAnimatedDays(finalDays);
            }
        }, stepDuration);
        return () => clearInterval(t);
    }, [currentBand, finalDays]);

    return (
        <section className="flex flex-col items-center w-full">
            <DashboardWelcome 
                userName={userName}
                targetBand={targetBand}
                currentBand={currentBand}
                finalDays={finalDays}
                animatedCurrent={animatedCurrent}
                animatedDays={animatedDays}
                skillStats={skillStats}
            />

            <DashboardAnalytics skillStats={skillStats} onToggleSkill={onToggleSkill} />

            <div className="w-full mt-8 mb-4">
                <RoadmapTimeline usageStats={usageStats} onStartTest={onStartTest} assignments={assignments} />
            </div>

            <DashboardReadingCarousel onStartTest={onStartTest} />

            <DashboardArticles />

            <DashboardListeningBanner 
                isListeningPaused={isListeningPaused} 
                setIsListeningPaused={setIsListeningPaused} 
            />
            <DashboardListeningCarousel 
                isListeningPaused={isListeningPaused} 
                onStartTest={onStartTest}
            />
        </section>
    );
}
