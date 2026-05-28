import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { handleUniversalNavigate } from '../../utils/navigation';

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewerModal({ stories, initialIndex, onClose, onStoryChange, user, userData, userVotes, submitVote }) {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    
    const progressInterval = useRef(null);
    const startTime = useRef(null);
    const pausedTime = useRef(null);
    const remainingTime = useRef(STORY_DURATION);

    const story = stories[currentIndex];

    const hasInteractive = story?.interactiveData && story.interactiveData.type !== 'none';
    const userVotedOption = userVotes?.[story?.id];
    const hasVoted = userVotedOption !== undefined;

    // Reset progress and timers when current index changes or vote status changes
    useEffect(() => {
        if (!story) return;
        setProgress(0);
        remainingTime.current = STORY_DURATION;
        startTime.current = Date.now();
        
        const shouldPause = hasInteractive && !hasVoted;
        setIsPaused(shouldPause);

        if (!shouldPause) {
            startTimer();
        } else {
            stopTimer();
        }

        return () => stopTimer();
    }, [currentIndex, hasVoted, hasInteractive]);

    // Handle timer
    const startTimer = () => {
        stopTimer();
        startTime.current = Date.now() - (STORY_DURATION - remainingTime.current);
        
        progressInterval.current = setInterval(() => {
            if (isPaused) return;
            
            const elapsed = Date.now() - startTime.current;
            const percentage = Math.min((elapsed / STORY_DURATION) * 100, 100);
            setProgress(percentage);

            if (elapsed >= STORY_DURATION) {
                stopTimer();
                handleNext();
            }
        }, 30);
    };

    const stopTimer = () => {
        if (progressInterval.current) {
            clearInterval(progressInterval.current);
        }
    };

    // Pause / Resume on Hold
    const handlePressStart = () => {
        // Only allow holding pause if not already paused by sticker
        if (hasInteractive && !hasVoted) return;
        setIsPaused(true);
        pausedTime.current = Date.now();
        stopTimer();
    };

    const handlePressEnd = () => {
        if (hasInteractive && !hasVoted) return;
        setIsPaused(false);
        const elapsedSincePause = Date.now() - pausedTime.current;
        startTime.current = startTime.current + elapsedSincePause;
        startTimer();
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            if (onStoryChange) onStoryChange(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            if (onStoryChange) onStoryChange(currentIndex - 1);
        } else {
            // Restart current story if it is the first one
            setProgress(0);
            remainingTime.current = STORY_DURATION;
            startTime.current = Date.now();
            startTimer();
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight') handleNext();
            else if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const handleCtaClick = (e) => {
        e.stopPropagation();
        if (!story.ctaUrl) return;
        onClose();
        handleUniversalNavigate(story.ctaUrl, navigate, { fromNewsfeed: true });
    };

    return (
        <AnimatePresence>
            <div 
                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md select-none touch-none"
                onClick={onClose}
            >
                {/* Desktop Prev Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="hidden md:flex absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Main Story Container */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full h-[100dvh] md:h-[80vh] md:max-h-[850px] md:max-w-[480px] rounded-none md:rounded-3xl bg-zinc-900 overflow-hidden flex flex-col justify-between"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={handlePressStart}
                    onMouseUp={handlePressEnd}
                    onTouchStart={handlePressStart}
                    onTouchEnd={handlePressEnd}
                >
                    {/* Top Info and Progress Bars */}
                    <div className="absolute top-0 inset-x-0 p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] bg-gradient-to-b from-black/70 to-transparent z-10">
                        {/* Progress Indicators */}
                        <div className="flex gap-1.5 mb-4">
                            {stories.map((s, idx) => (
                                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-white transition-all duration-300"
                                        style={{
                                            width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                                            transition: idx === currentIndex && isPaused ? 'none' : 'width 30ms linear'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Story Profile & Header */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-[1.5px]">
                                    <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-white font-bold">
                                        IP
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-bold">IELTS Portal Admin</h4>
                                    <p className="text-white/50 text-[10px]">{story.createdAt ? story.createdAt.toLocaleDateString() : ''}</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Left/Right Tap Zones (for mobile/easy navigation) */}
                    <div className="absolute inset-y-16 inset-x-0 flex z-0">
                        <div className="w-1/3 h-full cursor-w-resize" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                        <div className="w-2/3 h-full cursor-e-resize" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                    </div>

                    {/* Story Content Area */}
                    <div className="flex-1 flex items-center justify-center w-full h-full relative">
                        {story.mediaType === 'text' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#1e1b4b] via-[#311042] to-[#0f172a] text-center">
                                <p className="text-white text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-wrap select-none px-4">
                                    {story.text}
                                </p>
                            </div>
                        ) : story.mediaType === 'video' ? (
                            <video
                                src={story.mediaUrl}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <img
                                src={story.mediaUrl}
                                alt="Story Content"
                                className="w-full h-full object-cover select-none"
                            />
                        )}

                        {/* Interactive Sticker Overlay */}
                        {hasInteractive && (
                            <div className="absolute inset-x-6 z-20 pointer-events-auto bg-black/60 dark:bg-zinc-950/85 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 text-white select-text">
                                {/* Question */}
                                <div className="text-center">
                                    <span className="inline-block text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white mb-2 shadow-sm">
                                        {story.interactiveData.type === 'quiz' ? 'IELTS QUIZ' : 'POLL'}
                                    </span>
                                    <p className="font-bold text-sm md:text-base leading-snug text-gray-100">{story.interactiveData.question}</p>
                                </div>
                                
                                {/* Options */}
                                <div className="flex flex-col gap-2">
                                    {story.interactiveData.options.map((option, idx) => {
                                        const optionVotes = story.interactiveData.votes?.[idx] !== undefined 
                                            ? story.interactiveData.votes[idx] 
                                            : (story.interactiveData.votes?.[`${idx}`] || 0);
                                        const totalVotes = Object.values(story.interactiveData.votes || {}).reduce((a, b) => a + b, 0);
                                        const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                        
                                        const isSelected = userVotedOption === idx;
                                        const isQuiz = story.interactiveData.type === 'quiz';
                                        const isCorrect = isQuiz && story.interactiveData.correctIndex === idx;
                                        
                                        let btnStyle = "bg-white/10 border-white/10 text-white hover:bg-white/20";
                                        if (hasVoted) {
                                            if (isQuiz) {
                                                if (isCorrect) {
                                                    btnStyle = "bg-emerald-500/30 border-emerald-500 text-emerald-300 font-bold";
                                                } else if (isSelected) {
                                                    btnStyle = "bg-red-500/30 border-red-500 text-red-300 font-bold";
                                                } else {
                                                    btnStyle = "bg-white/5 border-white/5 text-white/50";
                                                }
                                            } else {
                                                // Poll
                                                if (isSelected) {
                                                    btnStyle = "bg-pink-500/30 border-pink-500 text-pink-300 font-bold";
                                                } else {
                                                    btnStyle = "bg-white/5 border-white/5 text-white/60";
                                                }
                                            }
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={hasVoted}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    submitVote(story.id, idx, isCorrect);
                                                }}
                                                className={`relative w-full overflow-hidden p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between gap-3 ${btnStyle}`}
                                            >
                                                {/* Percentage progress background */}
                                                {hasVoted && (
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                                        className={`absolute left-0 top-0 bottom-0 z-0 opacity-20 ${
                                                            isQuiz 
                                                                ? (isCorrect ? 'bg-emerald-400' : 'bg-red-400') 
                                                                : 'bg-pink-400'
                                                        }`}
                                                    />
                                                )}
                                                
                                                <span className="relative z-10 font-medium">{option}</span>
                                                {hasVoted && (
                                                    <span className="relative z-10 font-bold text-[10px]">
                                                        {percentage}%
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Overlay containing Caption and/or CTA */}
                    {(story.ctaUrl || (story.mediaType !== 'text' && story.text)) && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-24 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] md:pb-8 px-6 flex flex-col items-center justify-end gap-3 z-20 pointer-events-none">
                            {story.mediaType !== 'text' && story.text && (
                                <p className="text-white text-sm md:text-base font-medium leading-relaxed drop-shadow-md text-center max-w-sm pointer-events-auto">
                                    {story.text}
                                </p>
                            )}
                            {story.ctaUrl && (
                                <div className="pointer-events-auto">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleCtaClick}
                                        className="px-6 py-2.5 bg-white text-black font-bold rounded-full text-xs shadow-lg flex items-center gap-1.5 transition hover:bg-gray-100"
                                    >
                                        {story.ctaText || "Batafsil"}
                                        <ExternalLink size={12} />
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Desktop Next Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="hidden md:flex absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </AnimatePresence>
    );
}
