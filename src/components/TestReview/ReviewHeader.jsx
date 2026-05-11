import React, { useState } from 'react';
import { Volume2, Volume1, VolumeX, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomAudioPlayer from "../TestSolving/CustomAudioPlayer";

const ReviewHeader = ({ 
    testData, resultData, userData, 
    activeMockPart, setActiveMockPart,
    audioRefs, listeningActivePart, setAudioTime,
    volume, setVolume,
    isCommentsOpen, setIsCommentsOpen,
    onSaveGrade, isSaving,
    navigate
}) => {
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

    return (
        <header className="h-16 bg-zinc-950 text-white flex justify-between items-center px-4 sm:px-6 shrink-0 z-20 border-b border-white/5 relative">
            {/* 1. LEFT: NAVIGATION & TITLES */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(userData?.role === 'admin' || userData?.role === 'teacher' ? '/admin/results' : '/my-results')}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 group"
                >
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex flex-col min-w-0">
                    <h1 className="text-[14px] font-bold text-white tracking-tight truncate max-w-[150px] sm:max-w-[280px]">
                        {testData.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                            {resultData.userName || 'Student'}
                        </span>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                            resultData.type === 'mock_full' ? 'text-indigo-400 bg-indigo-400/10' : 'text-blue-400 bg-blue-400/10'
                        }`}>
                            {resultData.type === 'mock_full' ? 'FULL MOCK' : 'PARTIAL'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. CENTER: INTERACTIVE CONTROLS */}
            <div className="flex-1 flex justify-center items-center gap-6 px-4">
                {resultData.type === 'mock_full' && (
                    <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
                        {['listening', 'reading', 'writing', 'speaking'].map(part => (
                            <button
                                key={part}
                                onClick={() => setActiveMockPart(part)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-[11px] font-black transition-all relative ${
                                    activeMockPart === part 
                                        ? 'bg-white text-zinc-950 shadow-lg scale-105' 
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                                title={part}
                            >
                                {part.charAt(0).toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                {/* Audio Player (Listening) */}
                {(testData.type?.toLowerCase() === 'listening' || (resultData.type === 'mock_full' && activeMockPart === 'listening')) && (
                    <div className="flex items-center gap-3 flex-1 max-w-[400px]">
                        <div className="flex-1">
                            {testData.passages?.map((passage, index) => {
                                const src = passage.audio || testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file;
                                if (!src) return null;
                                return (
                                    <CustomAudioPlayer
                                        key={index}
                                        ref={el => audioRefs.current[index] = el}
                                        src={src}
                                        index={index}
                                        variant="dark"
                                        activePart={listeningActivePart}
                                        testMode="practice"
                                        setAudioTime={setAudioTime}
                                        volume={volume}
                                        startTime={passage.startTime || 0}
                                        endTime={passage.endTime || 0}
                                    />
                                );
                            })}
                            {(!testData.passages || testData.passages.length === 0) && (testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file) && (
                                <CustomAudioPlayer
                                    ref={el => audioRefs.current[0] = el}
                                    src={testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file}
                                    index={0}
                                    variant="dark"
                                    activePart={listeningActivePart}
                                    testMode="practice"
                                    setAudioTime={setAudioTime}
                                    volume={volume}
                                    startTime={0}
                                    endTime={0}
                                />
                            )}
                        </div>

                        {/* Volume */}
                        <div className="relative">
                            <button
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                                    showVolumeSlider ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                }`}
                                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                            >
                                {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                            </button>
                            <AnimatePresence>
                                {showVolumeSlider && (
                                    <>
                                        <div className="fixed inset-0 z-[100]" onClick={() => setShowVolumeSlider(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full right-0 mt-3 p-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[101] min-w-[200px]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-gray-500 w-8">{Math.round(volume * 100)}%</span>
                                                <input
                                                    type="range" min="0" max="1" step="0.01" value={volume}
                                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                    className="flex-1 accent-white h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. RIGHT: METRICS */}
            <div className="flex items-center gap-4">
                {resultData.type === 'mock_full' && (
                    <div className="hidden lg:flex items-center bg-zinc-900/80 rounded-2xl px-4 py-2 border border-white/5 divide-x divide-white/5">
                        {[
                            { key: 'listeningBand', label: 'L', color: 'text-purple-400' },
                            { key: 'readingBand', label: 'R', color: 'text-blue-400' },
                            { key: 'writing', label: 'W', color: 'text-emerald-400' },
                            { key: 'speaking', label: 'S', color: 'text-indigo-400' }
                        ].map((item) => (
                            <div key={item.key} className="px-3 flex flex-col items-center first:pl-0 last:pr-0">
                                <span className="text-[9px] font-black text-white/30 tracking-tighter uppercase mb-0.5">{item.label}</span>
                                <span className={`text-[14px] font-bold ${item.color}`}>
                                    {Number(resultData.scores?.[item.key] || 0).toFixed(1)}
                                </span>
                            </div>
                        ))}
                        {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                            <button onClick={onSaveGrade} disabled={isSaving} className="pl-3 text-zinc-500 hover:text-white transition-colors">
                                <div className={isSaving ? 'animate-spin' : ''}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                            </button>
                        )}
                    </div>
                )}

                <button
                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                    className={`h-11 px-4 rounded-xl border flex items-center gap-2 transition-all ${
                        isCommentsOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                >
                    <MessageSquare size={18} />
                    <span className="text-[11px] font-black tracking-widest hidden sm:inline">Comments</span>
                </button>

                <div className={`h-11 px-5 rounded-xl border flex items-center gap-3 ${
                    (resultData.status === 'graded' || resultData.overallBand) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black tracking-widest uppercase opacity-60">Overall</span>
                        <span className="text-lg font-black leading-tight">{resultData.overallBand || resultData.writingBand || resultData.score || "---"}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ReviewHeader;
