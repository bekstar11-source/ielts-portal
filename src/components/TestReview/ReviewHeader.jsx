import React, { useState } from 'react';
import { Volume2, Volume1, VolumeX, MessageSquare, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomAudioPlayer from "../TestSolving/CustomAudioPlayer";
import { useTranslation } from '../../context/LanguageContext';

const ReviewHeader = ({ 
    testData, resultData, userData, 
    activeMockPart, setActiveMockPart,
    audioRefs, listeningActivePart, setAudioTime,
    volume, setVolume,
    isCommentsOpen, setIsCommentsOpen,
    onSaveGrade, isSaving,
    navigate,
    fromNewsfeed = false,
    isAnswersListOpen,
    setIsAnswersListOpen,
    isPremium,
    from = null
}) => {
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const { t } = useTranslation();

    return (
        <header className="h-16 bg-white text-gray-900 flex justify-between items-center px-4 sm:px-6 shrink-0 z-20 border-b border-gray-100 relative shadow-sm">
            {/* 1. LEFT: NAVIGATION & TITLES */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        if (fromNewsfeed) {
                            navigate('/dashboard');
                        } else if (from) {
                            navigate(from);
                        } else {
                            navigate(userData?.role === 'admin' || userData?.role === 'teacher' ? '/admin/results' : '/my-results');
                        }
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all active:scale-95 group"
                >
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#e31b23] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex flex-col min-w-0">
                    <h1 className="text-[14px] font-semibold text-gray-900 tracking-tight truncate max-w-[150px] sm:max-w-[280px]">
                        {testData.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                            {resultData.userName || 'Student'}
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                            {resultData.type === 'mock_full' ? 'FULL MOCK' : 'PARTIAL'}
                        </span>
                        {testData.tags && testData.tags.length > 0 && (
                            <>
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                <div className="flex items-center gap-1 flex-wrap">
                                    {testData.tags.map((tag, idx) => (
                                        <span key={idx} className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-250">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. CENTER: INTERACTIVE CONTROLS */}
            <div className="flex-1 flex justify-center items-center gap-6 px-4">
                {resultData.type === 'mock_full' && (
                    <div className="flex bg-gray-50/80 p-1 rounded-xl border border-gray-100 shadow-inner">
                        {['listening', 'reading', 'writing', 'speaking'].map(part => (
                            <button
                                key={part}
                                onClick={() => setActiveMockPart(part)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-[12px] font-semibold transition-all relative ${
                                    activeMockPart === part 
                                        ? 'bg-white text-gray-900 shadow-md border border-gray-100 scale-[1.02]' 
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
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
                    <div className="flex items-center gap-3 flex-1 max-w-[650px]">
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
                                        variant="light"
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
                                    variant="light"
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
                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all shadow-sm ${
                                    showVolumeSlider ? 'bg-[#e31b23] text-white border-[#e31b23]' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
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
                                            className="absolute top-full right-0 mt-3 p-4 bg-white border border-gray-200 rounded-xl shadow-xl z-[101] min-w-[200px]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-gray-400 w-8">{Math.round(volume * 100)}%</span>
                                                <input
                                                    type="range" min="0" max="1" step="0.01" value={volume}
                                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                    className="flex-1 accent-[#e31b23] h-1 bg-gray-100 rounded-full appearance-none cursor-pointer"
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
                    <div className="hidden lg:flex items-center bg-gray-50/50 rounded-xl px-4 py-2 border border-gray-100 divide-x divide-gray-200 shadow-sm">
                        {[
                            { key: 'listeningBand', label: 'L' },
                            { key: 'readingBand', label: 'R' },
                            { key: 'writingBand',   label: 'W' },
                            { key: 'speakingBand',  label: 'S' }
                        ].map((item) => {
                            return (
                                <div key={item.key} className="px-3.5 flex flex-col items-center first:pl-0 last:pr-0">
                                    <span className="text-[9px] font-semibold text-gray-400 tracking-tight uppercase mb-0.5">{item.label}</span>
                                    <span className="text-[15px] font-semibold text-gray-900 leading-none">
                                        {(() => {
                                            const baseKey = item.key.replace('Band', '');
                                            const val = resultData.scores?.[item.key] ?? resultData.scores?.[baseKey] ?? resultData[item.key] ?? resultData[baseKey];
                                            return (val !== undefined && val !== null) ? Number(val).toFixed(1) : "---";
                                        })()}
                                    </span>
                                </div>
                            );
                        })}
                        {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                            <button onClick={onSaveGrade} disabled={isSaving} className="pl-3.5 text-gray-400 hover:text-[#e31b23] transition-colors">
                                <div className={isSaving ? 'animate-spin' : ''}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                            </button>
                        )}
                    </div>
                )}

                {isPremium && testData.type?.toLowerCase() !== 'speaking' && testData.type?.toLowerCase() !== 'writing' && (
                    <button
                        onClick={() => setIsAnswersListOpen(!isAnswersListOpen)}
                        className={`h-9 px-4 rounded-md border flex items-center gap-2 transition-all shadow-sm ${
                            isAnswersListOpen ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <List size={18} />
                        <span className="text-[12px] font-semibold tracking-tight hidden sm:inline">
                            {t('testSolving.viewDetailedAnswers') || 'Answers List'}
                        </span>
                    </button>
                )}

                <button
                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                    className={`h-9 px-4 rounded-md border flex items-center gap-2 transition-all shadow-sm ${
                        isCommentsOpen ? 'bg-[#e31b23] border-[#e31b23] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <MessageSquare size={18} />
                    <span className="text-[12px] font-semibold tracking-tight hidden sm:inline">Comments</span>
                </button>

                <div className="h-9 px-4 rounded-md border border-gray-200 bg-white flex items-center gap-2 shadow-sm min-w-[85px]">
                    <div className="flex flex-col items-center w-full">
                        <span className="text-[8px] font-semibold tracking-widest uppercase text-gray-400 mb-0.5">Overall</span>
                        <span className="text-[18px] font-bold leading-none text-[#e31b23]">
                            {resultData.type === 'mock_full' 
                                ? (resultData.overallBand || resultData.bandScore ? Number(resultData.overallBand || resultData.bandScore).toFixed(1) : "---")
                                : (resultData.bandScore || resultData.writingBand || resultData.score ? Number(resultData.bandScore || resultData.writingBand || resultData.score).toFixed(1) : "---")
                            }
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ReviewHeader;
