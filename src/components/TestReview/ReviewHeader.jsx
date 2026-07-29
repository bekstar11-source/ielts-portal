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

    const hasAudioPlayer = testData.type?.toLowerCase() === 'listening' || (resultData.type === 'mock_full' && activeMockPart === 'listening');
    const overallValue = resultData.type === 'mock_full'
        ? (resultData.overallBand || resultData.bandScore ? Number(resultData.overallBand || resultData.bandScore).toFixed(1) : "---")
        : (resultData.bandScore || resultData.writingBand || resultData.score ? Number(resultData.bandScore || resultData.writingBand || resultData.score).toFixed(1) : "---");

    return (
        <header className="bg-white text-gray-900 shrink-0 z-20 border-b border-gray-100 relative shadow-sm">
            {/* ROW 1: IDENTITY & SCORES */}
            <div className="h-16 flex justify-between items-center px-4 sm:px-6 gap-4">
                {/* LEFT: NAVIGATION & TITLES */}
                <div className="flex items-center gap-3 min-w-0">
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
                        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all active:scale-95 group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#e31b23] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1 className="text-[14px] font-semibold text-gray-900 tracking-tight truncate max-w-[160px] sm:max-w-[320px]">
                            {testData.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                                {resultData.userName || 'Student'}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                {resultData.type === 'mock_full' ? 'Full Mock' : 'Partial'}
                            </span>
                            {testData.tags && testData.tags.length > 0 && testData.tags.map((tag, idx) => (
                                <span key={idx} className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: SCORES */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {resultData.type === 'mock_full' && (
                        <div className="hidden lg:flex items-center gap-1.5">
                            {[
                                { key: 'listeningBand', label: 'L' },
                                { key: 'readingBand', label: 'R' },
                                { key: 'writingBand',   label: 'W' },
                                { key: 'speakingBand',  label: 'S' }
                            ].map((item) => {
                                const baseKey = item.key.replace('Band', '');
                                const val = resultData.scores?.[item.key] ?? resultData.scores?.[baseKey] ?? resultData[item.key] ?? resultData[baseKey];
                                const display = (val !== undefined && val !== null) ? Number(val).toFixed(1) : "---";
                                return (
                                    <div key={item.key} className="w-12 h-12 flex flex-col items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                                        <span className="text-[9px] font-semibold text-gray-400 tracking-wide uppercase leading-none">{item.label}</span>
                                        <span className="text-[14px] font-semibold text-gray-900 leading-none mt-1">
                                            {display}
                                        </span>
                                    </div>
                                );
                            })}
                            {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                                <button
                                    onClick={onSaveGrade}
                                    disabled={isSaving}
                                    title="Recalculate scores"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#e31b23] hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
                                >
                                    <div className={isSaving ? 'animate-spin' : ''}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="h-12 px-4 rounded-xl bg-red-50/70 border border-red-100 flex flex-col items-center justify-center min-w-[76px]">
                        <span className="text-[8px] font-semibold tracking-widest uppercase text-[#e31b23]/70 leading-none">Overall</span>
                        <span className="text-[19px] font-bold leading-none text-[#e31b23] mt-1">
                            {overallValue}
                        </span>
                    </div>
                </div>
            </div>

            {/* ROW 2: CONTROLS TOOLBAR */}
            <div className="h-14 flex items-center justify-between gap-4 px-4 sm:px-6 bg-gray-50/60 border-t border-gray-100">
                {/* LEFT: Mock part switcher */}
                <div className="flex items-center shrink-0">
                    {resultData.type === 'mock_full' ? (
                        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            {['listening', 'reading', 'writing', 'speaking'].map(part => (
                                <button
                                    key={part}
                                    onClick={() => setActiveMockPart(part)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md text-[12px] font-semibold transition-all ${
                                        activeMockPart === part
                                            ? 'bg-[#e31b23] text-white shadow-sm'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                                    title={part}
                                >
                                    {part.charAt(0).toUpperCase()}
                                </button>
                            ))}
                        </div>
                    ) : <div />}
                </div>

                {/* CENTER: Audio player */}
                <div className="flex-1 flex justify-center min-w-0 px-2 lg:px-6">
                    {hasAudioPlayer && (
                        <div className="flex items-center gap-2 w-full max-w-5xl">
                            <div className="flex-1 min-w-0">
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
                                            isPlayingPart={listeningActivePart === index}
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
                                        isPlayingPart={listeningActivePart === 0}
                                        testMode="practice"
                                        setAudioTime={setAudioTime}
                                        volume={volume}
                                        startTime={0}
                                        endTime={0}
                                    />
                                )}
                            </div>

                            {/* Volume */}
                            <div className="relative shrink-0">
                                <button
                                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                                        showVolumeSlider ? 'bg-[#e31b23] text-white' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
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

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {isPremium && testData.type?.toLowerCase() !== 'speaking' && testData.type?.toLowerCase() !== 'writing' && (
                        <button
                            onClick={() => setIsAnswersListOpen(!isAnswersListOpen)}
                            className={`h-9 px-3.5 rounded-lg border flex items-center gap-2 transition-all ${
                                isAnswersListOpen ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <List size={16} />
                            <span className="text-[12px] font-semibold tracking-tight hidden sm:inline">
                                {t('testSolving.viewDetailedAnswers') || 'Answers List'}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                        className={`h-9 px-3.5 rounded-lg border flex items-center gap-2 transition-all ${
                            isCommentsOpen ? 'bg-[#e31b23] border-[#e31b23] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <MessageSquare size={16} />
                        <span className="text-[12px] font-semibold tracking-tight hidden sm:inline">Comments</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default ReviewHeader;
