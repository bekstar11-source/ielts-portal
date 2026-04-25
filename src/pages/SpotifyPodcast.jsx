// src/pages/SpotifyPodcast.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Headphones, List, ChevronRight, X, CheckCircle2 } from "lucide-react";

export default function SpotifyPodcast() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const audioRef = useRef(null);
    const transcriptContainerRef = useRef(null);

    const [podcast, setPodcast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    // Questions logic
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
    const [userAnswer, setUserAnswer] = useState("");
    const [isCorrect, setIsCorrect] = useState(null);

    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isBuffering, setIsBuffering] = useState(false);

    // Combined Timeline: Text + Questions
    const combinedTimeline = useMemo(() => {
        if (!podcast) return [];
        const items = [
            ...(podcast.transcript || []).map(t => ({ ...t, type: 'text' })),
            ...(podcast.questions || []).map(q => ({ 
                time: q.time, 
                text: q.type === 'gapfill' ? q.data.text.replace(/\{\{([^}]+)\}\}/g, '____') : "❓ Savolga javob bering...", 
                type: 'question',
                questionData: q
            }))
        ];
        return items.sort((a, b) => a.time - b.time);
    }, [podcast]);

    const activeTimelineIdx = useMemo(() => {
        const idx = combinedTimeline.findIndex((item, i) => {
            const nextTime = combinedTimeline[i + 1]?.time || Infinity;
            return currentTime >= item.time && currentTime < nextTime;
        });
        return idx === -1 ? 0 : idx;
    }, [combinedTimeline, currentTime]);

    useEffect(() => {
        if (!podcastId) return;
        const fetchPodcast = async () => {
            try {
                const snap = await getDoc(doc(db, "podcasts", podcastId));
                if (snap.exists()) {
                    setPodcast({ id: snap.id, ...snap.data() });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcast();
    }, [podcastId]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (currentQuestion) return;
            if (e.code === "Space") {
                e.preventDefault();
                togglePlay();
            } else if (e.code === "ArrowRight") {
                if (audioRef.current) audioRef.current.currentTime += 5;
            } else if (e.code === "ArrowLeft") {
                if (audioRef.current) audioRef.current.currentTime -= 5;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, currentQuestion]);

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        // Check for questions (active trigger)
        if (podcast?.questions) {
            const question = podcast.questions.find(q => 
                time >= q.time && time < q.time + 0.3 && !answeredQuestions.has(q.id || q.time)
            );
            if (question && !currentQuestion) {
                audioRef.current.pause();
                setIsPlaying(false);
                setCurrentQuestion(question);
            }
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (time) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
        if (!isPlaying) togglePlay();
    };

    const changePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 0.75];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const newRate = rates[nextIdx];
        setPlaybackRate(newRate);
        if (audioRef.current) audioRef.current.playbackRate = newRate;
    };

    const submitQuestion = () => {
        let correct = false;
        if (currentQuestion.type === 'mcq') {
            correct = userAnswer === currentQuestion.data.correctIndex;
        } else {
            correct = userAnswer.toLowerCase().trim() === currentQuestion.data.answer.toLowerCase().trim();
        }
        
        setIsCorrect(correct);
        setTimeout(() => {
            setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id || currentQuestion.time]));
            setCurrentQuestion(null);
            setUserAnswer("");
            setIsCorrect(null);
            if (audioRef.current) audioRef.current.play();
            setIsPlaying(true);
        }, 1200);
    };

    if (loading) return (
        <div className="h-screen bg-white flex items-center justify-center">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-zinc-100 border-t-zinc-900 rounded-full" 
            />
        </div>
    );

    if (!podcast) return <div className="p-20 text-center text-zinc-900 bg-white h-screen font-bold">Podcast topilmadi.</div>;

    const formatTime = (time) => {
        if (isNaN(time) || time === Infinity) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-screen w-full bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-100 overflow-hidden select-none relative">
            {/* Ambient Background (Light Mode) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-zinc-100 blur-[120px]" 
                />
            </div>

            {/* Header */}
            <header className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
                        <SkipBack size={20} className="text-zinc-600" />
                    </button>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-black truncate max-w-[300px] leading-tight text-zinc-900">{podcast.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] bg-zinc-900 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">{podcast.level || "B2"}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Interactive Session</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={changePlaybackRate} className="px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-black hover:bg-zinc-200 transition-all text-zinc-900">
                        {playbackRate}x Speed
                    </button>
                    <button onClick={() => navigate('/podcasts')} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors border border-zinc-200 text-zinc-600">
                        <X size={18} />
                    </button>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Side: Visuals */}
                <div className="lg:w-[40%] flex flex-col items-center justify-center p-8 lg:p-12">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1,
                            rotate: isPlaying ? 360 : 0
                        }}
                        transition={{ 
                            scale: { duration: 0.5 },
                            rotate: { duration: 40, repeat: Infinity, ease: "linear" }
                        }}
                        className="relative w-full max-w-[380px] aspect-square"
                    >
                        <div className="absolute inset-0 rounded-full border-[10px] border-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden bg-zinc-50">
                            <img 
                                src={podcast.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"} 
                                alt={podcast.title}
                                className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-500"
                            />
                        </div>
                        {/* Center Hole */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-zinc-50 flex items-center justify-center shadow-inner">
                            <div className="w-3 h-3 bg-zinc-100 rounded-full" />
                        </div>
                    </motion.div>
                    
                    <div className="mt-8 text-center lg:text-left w-full max-w-[380px]">
                        <motion.h2 
                            key={activeTimelineIdx}
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-black mb-1 line-clamp-1 text-zinc-900"
                        >
                            {podcast.title}
                        </motion.h2>
                        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[9px]">Premium Interactive Audio</p>
                    </div>
                </div>

                {/* Right Side: Script */}
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/20 lg:border-l border-zinc-100">
                    <div className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 space-y-8 md:space-y-12">
                        {[-1, 0, 1].map(offset => {
                            const originalIdx = activeTimelineIdx + offset;
                            const item = combinedTimeline[originalIdx];
                            if (!item) return <div key={`empty-${offset}`} className="h-12 md:h-20 opacity-0" />;
                            
                            const isActive = offset === 0;
                            const isQuestion = item.type === 'question';
                            
                            return (
                                <motion.div 
                                    key={`${originalIdx}-${item.type}`}
                                    onClick={() => handleSeek(item.time)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ 
                                        opacity: isActive ? 1 : 0.2, 
                                        scale: isActive ? 1 : 0.9,
                                        y: 0,
                                        filter: isActive ? "blur(0px)" : "blur(1px)"
                                    }}
                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className={`text-center w-full px-4 cursor-pointer group relative`}
                                >
                                    <p className={`text-xl md:text-3xl font-black leading-tight tracking-tight transition-all duration-500 ${
                                        isActive ? "text-zinc-900" : "text-zinc-400"
                                    }`}>
                                        {item.text}
                                    </p>
                                    {isActive && (
                                        <div className="mt-4 flex justify-center">
                                            <div className="w-1 h-1 rounded-full bg-zinc-900 animate-pulse" />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Light Player Bar */}
            <footer className="relative z-30 bg-white border-t border-zinc-100 px-6 py-4">
                <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center gap-6">
                    {/* Progress */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-50 cursor-pointer group" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        handleSeek((x / rect.width) * duration);
                    }}>
                        <motion.div 
                            className="h-full bg-zinc-900 relative"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                        </motion.div>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-zinc-100">
                            <img src={podcast.thumbnail} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-black truncate text-zinc-900">{podcast.title}</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Englev Audio</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 col-span-2 md:col-span-1">
                        <div className="flex items-center gap-8">
                            <button className="text-zinc-300 hover:text-zinc-900 transition-all" onClick={() => handleSeek(currentTime - 10)}>
                                <SkipBack size={20} fill="currentColor" />
                            </button>
                            <button 
                                onClick={togglePlay}
                                className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                            >
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                            </button>
                            <button className="text-zinc-300 hover:text-zinc-900 transition-all" onClick={() => handleSeek(currentTime + 10)}>
                                <SkipForward size={20} fill="currentColor" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3 w-full max-w-[320px]">
                            <span className="text-[9px] font-black text-zinc-400 tabular-nums">{formatTime(currentTime)}</span>
                            <div className="flex-1 h-0.5 bg-zinc-100 rounded-full relative overflow-hidden">
                                <motion.div className="h-full bg-zinc-200" style={{ width: `${(currentTime / duration) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-black text-zinc-400 tabular-nums">{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-6">
                        <div className="flex items-center gap-3 group">
                            <button onClick={() => {
                                const newVol = volume === 0 ? 1 : 0;
                                setVolume(newVol);
                                if (audioRef.current) audioRef.current.volume = newVol;
                            }} className="text-zinc-300 hover:text-zinc-900 transition-colors">
                                {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                            <div className="w-20 h-1 bg-zinc-100 rounded-full relative cursor-pointer overflow-hidden" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const vol = Math.max(0, Math.min(1, x / rect.width));
                                setVolume(vol);
                                if (audioRef.current) audioRef.current.volume = vol;
                            }}>
                                <motion.div className="h-full bg-zinc-900" animate={{ width: `${volume * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Light Modal */}
            <AnimatePresence>
                {currentQuestion && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/60 backdrop-blur-3xl"
                    >
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            className="bg-white border border-zinc-100 p-8 md:p-12 rounded-[40px] max-w-[580px] w-full shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Podcast Challenge</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse" />
                            </div>

                            <h2 className="text-2xl md:text-3xl font-black mb-8 leading-tight text-zinc-900">
                                {currentQuestion.type === 'mcq' ? currentQuestion.data.question : "Listen and fill the gap:"}
                            </h2>

                            {currentQuestion.type === 'mcq' ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {currentQuestion.data.options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setUserAnswer(idx)}
                                            className={`w-full p-5 rounded-2xl text-left font-bold transition-all border-2 ${
                                                userAnswer === idx 
                                                ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" 
                                                : "bg-zinc-50 border-zinc-50 hover:border-zinc-200"
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${userAnswer === idx ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-600"}`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                {opt}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <p className="text-zinc-500 text-lg md:text-xl font-medium italic opacity-70 bg-zinc-50 p-6 rounded-3xl">
                                        "{currentQuestion.data.text.replace(/\{\{([^}]+)\}\}/g, '_______')}"
                                    </p>
                                    <input 
                                        autoFocus
                                        className="w-full bg-zinc-50 border-2 border-transparent p-6 rounded-3xl text-xl font-black outline-none focus:bg-white focus:border-zinc-900 transition-all"
                                        placeholder="Type answer..."
                                        value={userAnswer}
                                        onChange={e => setUserAnswer(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && submitQuestion()}
                                    />
                                </div>
                            )}

                            <button 
                                onClick={submitQuestion}
                                disabled={userAnswer === "" || isCorrect !== null}
                                className={`w-full mt-8 py-5 rounded-3xl font-black text-base transition-all flex items-center justify-center gap-3 ${
                                    isCorrect === true ? "bg-green-500 text-white" :
                                    isCorrect === false ? "bg-red-500 text-white" :
                                    "bg-zinc-900 text-white hover:opacity-90 active:scale-95"
                                }`}
                            >
                                {isCorrect === true ? <CheckCircle2 size={20} /> : null}
                                {isCorrect === null ? "Submit Answer" : isCorrect ? "Correct!" : "Incorrect"}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio Source */}
            <audio 
                ref={audioRef}
                src={podcast.audioUrl || null}
                onTimeUpdate={handleTimeUpdate}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                }}
            />

            <style dangerouslySetInnerHTML={{ __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}
