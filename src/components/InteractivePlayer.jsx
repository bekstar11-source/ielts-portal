// src/components/InteractivePlayer.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { usePodcast } from "../context/PodcastContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, addDoc, query, where, getDocs, limit, serverTimestamp, orderBy } from "firebase/firestore";

// Sub-components
import PlayerHeader from "./InteractivePlayer/PlayerHeader";
import PlayerFooter from "./InteractivePlayer/PlayerFooter";
import MediaSection from "./InteractivePlayer/MediaSection";
import TaskSection from "./InteractivePlayer/TaskSection";

// Hooks
import { useYouTubeBridge } from "./InteractivePlayer/useYouTubeBridge";

export default function InteractivePlayer({ isOpen, onClose }) {
    const { playTrack, currentTrack: podcast, setCurrentTrack, isPlaying, setIsPlaying, currentTime, setCurrentTime, duration, setDuration, volume, isMuted, playbackRate, handleSeek, toggleMute, updateVolume, audioRef } = usePodcast();
    const { user, userData } = useAuth();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [answers, setAnswers] = useState({});
    const [attempts, setAttempts] = useState({}); 
    const [showResults, setShowResults] = useState({}); 
    const [initialScore, setInitialScore] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Check if student belongs to a group
    const isGrouped = !!(userData?.groupId && userData.groupId !== 'none');
    
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const playerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isTasksVisible, setIsTasksVisible] = useState(true);

    // YouTube Bridge Logic
    const { ytPlayerRef, handleYoutubeSeek, syncYoutubeState } = useYouTubeBridge(
        podcast, 
        isOpen, 
        setIsPlaying, 
        setCurrentTime, 
        setDuration,
        currentTime
    );

    // Sync YouTube playback state with context
    useEffect(() => {
        syncYoutubeState(isPlaying);
    }, [isPlaying, syncYoutubeState]);

    // Handle Seeks/Skips
    const handleMediaSeek = (time) => {
        handleSeek(time); 
        handleYoutubeSeek(time);
    };

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleMediaSeek(target);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            playerRef.current.requestFullscreen().catch(err => {
                console.error(`Error: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Load previous result on mount (only for grouped students)
    useEffect(() => {
        if (!user || !podcast?.id || !isOpen || !isGrouped) return;

        const fetchResult = async () => {
            try {
                const q = query(
                    collection(db, "podcastResults"),
                    where("userId", "==", user.uid),
                    where("podcastId", "==", podcast.id),
                    orderBy("createdAt", "asc"),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setInitialScore(querySnapshot.docs[0].data());
                }
            } catch (e) {
                console.error("Error fetching result:", e);
            }
        };

        fetchResult();
    }, [user, podcast?.id, isOpen]);

    const savePodcastResult = async (finalAnswers) => {
        if (!user || !podcast?.id || initialScore || isSaving || !isGrouped) return;

        setIsSaving(true);
        try {
            const allQuestions = podcast.questions || [];
            let correctCount = 0;
            allQuestions.forEach(q => {
                const userVal = String(finalAnswers[q.time] || "").toLowerCase().trim();
                const correctVal = String(q.data.answer || q.data.correctIndex).toLowerCase().trim();
                if (userVal === correctVal) correctCount++;
            });

            const resultData = {
                userId: user.uid,
                userEmail: user.email,
                userName: userData?.fullName || user.displayName || "Unknown",
                groupId: userData?.groupId || "none",
                podcastId: podcast.id,
                podcastTitle: podcast.title,
                score: correctCount,
                total: allQuestions.length,
                percentage: allQuestions.length > 0 ? (correctCount / allQuestions.length) * 100 : 0,
                answers: finalAnswers,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "podcastResults"), resultData);
            setInitialScore(resultData);
        } catch (e) {
            console.error("Error saving result:", e);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    // Combined Timeline for Script
    const combinedTimeline = useMemo(() => {
        if (!podcast || !podcast.transcript) return [];
        return [...podcast.transcript]
            .map(t => ({ ...t, type: 'text' }))
            .sort((a, b) => a.time - b.time);
    }, [podcast]);

    const activeTimelineIdx = useMemo(() => {
        const idx = combinedTimeline.findIndex((item, i) => {
            const nextTime = combinedTimeline[i + 1]?.time || Infinity;
            return currentTime >= item.time && currentTime < nextTime;
        });
        return idx === -1 ? 0 : idx;
    }, [combinedTimeline, currentTime]);

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (!podcast) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    ref={playerRef}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className={`fixed inset-0 z-[100] flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-[#050505] text-white' : 'bg-white text-zinc-900'} ${isFullscreen ? 'p-0' : ''}`}
                >
                    {!isFullscreen && (
                        <PlayerHeader 
                            isDark={isDark}
                            toggleTheme={toggleTheme}
                            isFullscreen={isFullscreen}
                            toggleFullscreen={toggleFullscreen}
                            onClose={onClose}
                            currentStep={currentStep}
                            setCurrentStep={setCurrentStep}
                        />
                    )}

                    <main className={`flex-1 overflow-hidden relative ${isFullscreen && (podcast.mediaType === 'youtube' || podcast.mediaType === 'video') ? '' : 'grid grid-cols-1 lg:grid-cols-12'}`}>
                        <MediaSection 
                            isDark={isDark}
                            podcast={podcast}
                            isFullscreen={isFullscreen}
                            toggleFullscreen={toggleFullscreen}
                            isTasksVisible={isTasksVisible}
                            setIsTasksVisible={setIsTasksVisible}
                            combinedTimeline={combinedTimeline}
                            activeTimelineIdx={activeTimelineIdx}
                            handleSeek={handleMediaSeek}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            audioRef={audioRef}
                        />

                        <TaskSection 
                            isDark={isDark}
                            podcast={podcast}
                            isFullscreen={isFullscreen}
                            isTasksVisible={isTasksVisible}
                            setIsTasksVisible={setIsTasksVisible}
                            currentStep={currentStep}
                            setCurrentStep={setCurrentStep}
                            answers={answers}
                            setAnswers={setAnswers}
                            attempts={attempts}
                            setAttempts={setAttempts}
                            showResults={showResults}
                            setShowResults={setShowResults}
                            initialScore={initialScore}
                            savePodcastResult={savePodcastResult}
                            isGrouped={isGrouped}
                        />
                    </main>

                    {!isFullscreen && (
                        <PlayerFooter 
                            isDark={isDark}
                            podcast={podcast}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            handleMediaSkip={handleMediaSkip}
                            handleMediaSeek={handleMediaSeek}
                            formatTime={formatTime}
                            currentStep={currentStep}
                        />
                    )}

                    <style dangerouslySetInnerHTML={{__html: `
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 999px; }
                        
                        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slide-in-from-right { from { transform: translateX(20px); } to { transform: translateX(0); } }
                        .animate-in { animation: fade-in 0.5s ease-out, slide-in-from-right 0.5s ease-out; }
                    `}} />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
