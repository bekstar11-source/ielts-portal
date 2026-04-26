// src/components/InteractivePlayer.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ChevronDown, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, 
    Volume2, VolumeX, Mic2, List as ListIcon, Expand, X, CheckCircle2 
} from "lucide-react";
import { usePodcast } from "../context/PodcastContext";

export default function InteractivePlayer({ isOpen, onClose }) {
    const { 
        currentTrack: podcast, isPlaying, setIsPlaying, 
        currentTime, duration, volume, isMuted, repeat, setRepeat, 
        shuffle, setShuffle, playbackRate, updatePlaybackRate, handleSeek, toggleMute, updateVolume, audioRef 
    } = usePodcast();

    // Questions logic
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
    const [userAnswer, setUserAnswer] = useState("");
    const [isCorrect, setIsCorrect] = useState(null);

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

    // Handle questions trigger
    useEffect(() => {
        if (podcast?.questions && !currentQuestion) {
            const question = podcast.questions.find(q => 
                currentTime >= q.time && currentTime < q.time + 0.5 && !answeredQuestions.has(q.id || q.time)
            );
            if (question) {
                setIsPlaying(false);
                setCurrentQuestion(question);
            }
        }
    }, [currentTime, podcast, answeredQuestions, currentQuestion, setIsPlaying]);

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
            setIsPlaying(true);
        }, 1200);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const onSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        handleSeek(percent * duration);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            } else if (e.code === 'ArrowRight') {
                handleSeek(Math.min(duration, currentTime + 10));
            } else if (e.code === 'ArrowLeft') {
                handleSeek(Math.max(0, currentTime - 10));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, duration, setIsPlaying, handleSeek]);

    if (!podcast) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col font-sans select-none overflow-hidden"
                >
                    {/* Header */}
                    <header className="relative z-20 px-6 py-4 flex items-center justify-between">
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white">
                            <ChevronDown size={28} />
                        </button>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Listening to</p>
                            <h1 className="text-xs font-black text-white">{podcast.title}</h1>
                        </div>
                        <div className="w-10" /> {/* Spacer */}
                    </header>

                    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden px-6 lg:px-24 py-2 gap-6">
                        {/* Left Side: Question List & Info */}
                        <div className="lg:w-[30%] flex flex-col h-full py-2 overflow-hidden">
                            <div className="flex-1 flex flex-col bg-white/[0.03] border border-white/5 rounded-[32px] overflow-hidden">
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Episode Challenges</h3>
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        {podcast.questions?.length || 0} Tasks
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                                    {podcast.questions?.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-600">
                                            <p className="text-xs font-medium italic">No interactive questions in this episode yet.</p>
                                        </div>
                                    ) : (
                                        podcast.questions?.map((q, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => handleSeek(q.time)}
                                                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-xs font-black text-zinc-500 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400 transition-all">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-zinc-300 line-clamp-1 group-hover:text-white transition-colors">
                                                            {q.type === 'mcq' ? q.data.question : 'Listening Gap-fill'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-1 h-1 rounded-full bg-zinc-700" />
                                                            <p className="text-[10px] font-bold text-zinc-600 tabular-nums">
                                                                At {formatTime(q.time)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-8 px-2">
                                <h2 className="text-2xl font-black text-white leading-none tracking-tighter mb-2">{podcast.title}</h2>
                                <div className="flex items-center gap-3">
                                    <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-[0.2em]">{podcast.level || "B2"} LEVEL</p>
                                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                    <div className="flex items-center gap-2">
                                        <Heart size={16} className="text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer" />
                                        <Mic2 size={14} className="text-zinc-500 hover:text-white cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Interactive Transcript */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white/[0.02] rounded-2xl p-6 lg:p-8 relative border border-white/5">
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4 overflow-y-auto custom-scrollbar pr-2">
                                {[-2, -1, 0, 1, 2].map(offset => {
                                    const originalIdx = activeTimelineIdx + offset;
                                    const item = combinedTimeline[originalIdx];
                                    if (!item) return <div key={`empty-${offset}`} className="h-10 opacity-0" />;
                                    const isActive = offset === 0;
                                    const isFar = Math.abs(offset) > 1;
                                    return (
                                        <motion.div 
                                            key={`${originalIdx}-${item.type}`} onClick={() => handleSeek(item.time)}
                                            initial={{ opacity: 0 }} animate={{ 
                                                opacity: isActive ? 1 : (isFar ? 0.05 : 0.15), 
                                                scale: isActive ? 1 : 0.95,
                                            }}
                                            transition={{ duration: 0.3 }} className="text-center w-full px-4 cursor-pointer"
                                        >
                                            <p className={`leading-tight tracking-tight transition-all duration-300 font-black ${isActive ? "text-xl md:text-3xl text-emerald-400" : "text-base md:text-xl text-zinc-600"}`}>
                                                {item.text}
                                            </p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </main>

                    {/* Bottom Control Section */}
                    <div className="px-6 lg:px-16 pb-10 pt-2 bg-gradient-to-t from-black to-transparent">
                        <div className="max-w-[800px] mx-auto">
                            {/* Seek Bar - Spotify Style (Between Timestamps) */}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-bold text-zinc-500 tabular-nums w-8">{formatTime(currentTime)}</span>
                                <div className="flex-1 h-[4px] bg-white/10 rounded-full group cursor-pointer flex items-center relative" onClick={onSeek}>
                                    <div className="h-full bg-white group-hover:bg-emerald-500 rounded-full relative transition-colors" style={{ width: `${(currentTime / duration) * 100 || 0}%` }}>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-500 tabular-nums w-8 text-right">{formatTime(duration)}</span>
                            </div>

                            {/* Controls - Compacted & Enhanced */}
                            <div className="flex items-center justify-between max-w-[500px] mx-auto">
                                <div className="flex items-center gap-4">
                                    <Shuffle size={18} className={`cursor-pointer transition-colors ${shuffle ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`} onClick={() => setShuffle(!shuffle)} />
                                    <button 
                                        onClick={() => {
                                            const rates = [0.5, 1, 1.25, 1.5, 2];
                                            const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                                            updatePlaybackRate(rates[nextIdx]);
                                        }}
                                        className="text-[10px] font-black w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition text-zinc-400 hover:text-white"
                                    >
                                        {playbackRate}x
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-center">
                                        <SkipBack size={24} fill="currentColor" className="text-white hover:text-emerald-400 transition-colors active:scale-90 cursor-pointer" onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} />
                                        <span className="text-[8px] font-bold text-zinc-600 mt-1">10s</span>
                                    </div>

                                    <button className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all shadow-xl active:scale-95" onClick={() => setIsPlaying(!isPlaying)}>
                                        {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
                                    </button>

                                    <div className="flex flex-col items-center">
                                        <SkipForward size={24} fill="currentColor" className="text-white hover:text-emerald-400 transition-colors active:scale-90 cursor-pointer" onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} />
                                        <span className="text-[8px] font-bold text-zinc-600 mt-1">10s</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="group flex items-center gap-2">
                                        {isMuted || volume === 0 ? <VolumeX size={18} className="text-zinc-500 cursor-pointer hover:text-white shrink-0" onClick={toggleMute} /> : <Volume2 size={18} className="text-zinc-500 cursor-pointer hover:text-white shrink-0" onClick={toggleMute} />}
                                        <div className="w-20 h-1 bg-white/10 rounded-full relative group cursor-pointer hidden sm:flex items-center">
                                            <div className="h-full bg-emerald-500 rounded-full relative" style={{ width: `${volume * 100}%` }}>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                                            </div>
                                            <input 
                                                type="range" min="0" max="1" step="0.01" value={volume} 
                                                onChange={(e) => updateVolume(parseFloat(e.target.value))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <Repeat size={18} className={`cursor-pointer transition-colors ${repeat ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`} onClick={() => setRepeat(!repeat)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Questions Modal */}
                    <AnimatePresence>
                        {currentQuestion && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/70 backdrop-blur-3xl">
                                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="bg-[#121212] border border-white/5 p-8 md:p-12 rounded-[32px] max-w-[500px] w-full shadow-2xl relative">
                                    <h2 className="text-xl md:text-2xl font-black mb-6 leading-tight text-white">{currentQuestion.type === 'mcq' ? currentQuestion.data.question : "Listen and fill the gap:"}</h2>
                                    {currentQuestion.type === 'mcq' ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {currentQuestion.data.options.map((opt, idx) => (
                                                <button key={idx} onClick={() => setUserAnswer(idx)} className={`w-full p-4 rounded-xl text-left font-bold transition-all border-2 ${userAnswer === idx ? "bg-emerald-500 text-black border-emerald-500 shadow-lg" : "bg-white/5 border-transparent hover:border-white/10"}`}>{opt}</button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-zinc-500 text-base font-medium italic bg-white/5 p-4 rounded-2xl">"{currentQuestion.data.text.replace(/\{\{([^}]+)\}\}/g, '_______')}"</p>
                                            <input autoFocus className="w-full bg-white/5 border-2 border-transparent p-4 rounded-2xl text-lg font-black outline-none focus:border-emerald-500 transition-all" placeholder="Type answer..." value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitQuestion()} />
                                        </div>
                                    )}
                                    <button onClick={submitQuestion} disabled={userAnswer === "" || isCorrect !== null} className={`w-full mt-6 py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 ${isCorrect === true ? "bg-green-500 text-white" : isCorrect === false ? "bg-red-500 text-white" : "bg-white text-black hover:opacity-90 active:scale-95"}`}>
                                        {isCorrect === true ? <CheckCircle2 size={20} /> : null}
                                        {isCorrect === null ? "Submit Answer" : isCorrect ? "Correct!" : "Incorrect"}
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <style dangerouslySetInnerHTML={{__html: `
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 999px; }
                    `}} />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
