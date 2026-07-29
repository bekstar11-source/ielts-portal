import React, { useRef, useState, useEffect } from "react";
import { getFileNameFromUrl, toMMSS, processTime } from "./CreateTestUtils";

const AudioSegmentPlayer = ({ index, audioUrl, startTimeStr, endTimeStr, isDark }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const progressInterval = useRef(null);

    const start = processTime(startTimeStr);
    const end = processTime(endTimeStr);

    const handleProgressClick = (e) => {
        if (!audioUrl) return;
        const audio = audioRef.current;
        if (!audio || duration <= 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        const targetRelativeTime = percentage * duration;

        audio.currentTime = start + targetRelativeTime;
        setCurrentTime(targetRelativeTime);
    };

    useEffect(() => {
        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            const total = (end > start) ? (end - start) : (audioRef.current.duration - start);
            setDuration(total > 0 && isFinite(total) ? total : 0);
        }
    }, [start, end]);

    const togglePlay = () => {
        if (!audioUrl) return;
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            // Pause all other preview audio elements to prevent overlapping
            document.querySelectorAll('audio[id^="preview-audio-"]').forEach(a => {
                if (a !== audio && !a.paused) {
                    a.pause();
                }
            });

            // Set start time only if the playback is currently outside the segment range
            if (audio.currentTime < start || audio.currentTime >= end) {
                audio.currentTime = start;
            }
            audio.play().then(() => {
                setIsPlaying(true);
                if (progressInterval.current) clearInterval(progressInterval.current);
                progressInterval.current = setInterval(() => {
                    if (audio.currentTime >= end && end > start) {
                        audio.pause();
                        clearInterval(progressInterval.current);
                    }
                    setCurrentTime(Math.max(0, audio.currentTime - start));
                }, 100);
            }).catch(e => {
                console.error("Error playing preview:", e);
            });
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (progressInterval.current) clearInterval(progressInterval.current);
    };

    const handlePlay = () => {
        setIsPlaying(true);
    };

    return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <audio 
                id={`preview-audio-${index}`}
                ref={audioRef} 
                src={audioUrl} 
                onEnded={handlePause}
                onPause={handlePause}
                onPlay={handlePlay}
                preload="metadata"
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        const total = (end > start) ? (end - start) : (audioRef.current.duration - start);
                        setDuration(total > 0 && isFinite(total) ? total : 0);
                    }
                }}
            />
            <button 
                onClick={togglePlay}
                type="button"
                disabled={!audioUrl}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ${
                    !audioUrl ? 'opacity-30 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                title={isPlaying ? "Pauza" : "Eshitib ko'rish (Preview)"}
            >
                {isPlaying ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                    <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>
            <div className="flex-1 flex items-center gap-1.5 text-[9px] font-mono tabular-nums opacity-60">
                <span>{toMMSS(currentTime)}</span>
                <div 
                    onClick={handleProgressClick}
                    className={`flex-1 h-2 -my-0.5 rounded-full relative cursor-pointer ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                >
                    <div 
                        className="h-full bg-blue-500 rounded-full pointer-events-none transition-all duration-75" 
                        style={{ width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
                    />
                </div>
                <span>{toMMSS(duration)}</span>
            </div>
        </div>
    );
};

const MediaManager = ({ 
    testData, setTestData, 
    audioMode, setAudioMode, 
    singleAudioUrl, handleSingleAudioUpload, handleSingleAudioUrlChange,
    partAudios, handlePartAudioUpload, handleAudioUrlChange,
    listeningPartCount,
    uploadedMaps, handleMapUpload, handleDeleteMap,
    uploading, uploadingPart, uploadProgress,
    isDark,
    onPassageTimeChange
}) => {
    return (
        <div className={`p-5 rounded-2xl border mb-6 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-50">Media & Fayllar</h3>
            
            {testData.type === 'listening' && (
                <>
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold opacity-60">Audio Rejimi</label>
                            <div className={`flex p-1 rounded-lg ${isDark ? 'bg-[#121212]' : 'bg-gray-100'}`}>
                                <button 
                                    onClick={() => setAudioMode('single')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${audioMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    Yagona Audio
                                </button>
                                <button 
                                    onClick={() => setAudioMode('multiple')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${audioMode === 'multiple' ? 'bg-blue-600 text-white shadow-md' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    Bo'laklangan
                                </button>
                            </div>
                        </div>

                        {audioMode === 'single' ? (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className={`flex-1 h-10 px-4 rounded-xl border outline-none text-xs ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                                        placeholder="Yagona audio URL..."
                                        value={singleAudioUrl}
                                        onChange={e => handleSingleAudioUrlChange(e.target.value)}
                                    />
                                    <label className={`h-10 px-4 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                                        <input type="file" className="hidden" accept="audio/*" onChange={handleSingleAudioUpload} />
                                        {uploading && uploadingPart === 'single' ? (
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-[10px] font-bold">Yuklash</span>
                                        )}
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(listeningPartCount)].map((_, i) => (
                                    <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className="text-[10px] font-bold uppercase opacity-40 mb-2">Part {i + 1}</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className={`flex-1 h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                                                value={partAudios[i] || ""}
                                                onChange={e => handleAudioUrlChange(e.target.value, i)}
                                                placeholder="URL..."
                                            />
                                            <label className="h-8 px-2 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-500 transition">
                                                <input type="file" className="hidden" accept="audio/*" onChange={e => handlePartAudioUpload(e, i)} />
                                                {uploading && uploadingPart === i ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </>
            )}

            {/* MAP IMAGES */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold opacity-60">Map / Diagramma Rasmlari</label>
                    <label className={`h-8 px-4 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                        <input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} />
                        {uploading && uploadingPart === 'map' ? (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="text-[10px] font-bold">Rasm qo'shish</span>
                        )}
                    </label>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {uploadedMaps.map((map, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-medium ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                            <span className="max-w-[100px] truncate">{map.name}</span>
                            <button onClick={() => handleDeleteMap(idx)} className="text-red-500 hover:opacity-70">×</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* THUMBNAIL */}
            <div className="mb-6">
                <label className="text-xs font-bold mb-1.5 block opacity-60">Thumbnail URL</label>
                <input
                    type="text"
                    className={`w-full h-10 px-4 rounded-xl border outline-none text-xs transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                    value={testData.thumbnail || ""}
                    onChange={e => setTestData({ ...testData, thumbnail: e.target.value })}
                    placeholder="Test rasmi URL manzili..."
                />
            </div>

            {/* AUDIO TIMESTAMPS MANAGER */}
            {testData.type === 'listening' && onPassageTimeChange && (
                <div className="border-t border-gray-100 dark:border-white/5 pt-5">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold opacity-60">Audio Segmentlari Vaqtlari (Passages Timestamps)</label>
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-500/5 px-2 py-0.5 rounded border border-gray-500/10">MM:SS format</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[...Array(listeningPartCount)].map((_, i) => {
                            const passage = testData.passages?.[i] || {};
                            const partAudioUrl = audioMode === 'single' ? singleAudioUrl : (partAudios[i] || passage.audio || "");
                            return (
                                <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase opacity-40">Part {i + 1} Vaqti</span>
                                        {(passage.startTime || passage.endTime || passage.extraSilentTime) && (
                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                {passage.startTime || "0:00"} - {passage.endTime || "0:00"}
                                                {passage.extraSilentTime ? ` (+${passage.extraSilentTime}s)` : ""}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1">Boshlash</span>
                                            <input
                                                type="text"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="0:00"
                                                value={passage.startTime || ""}
                                                onChange={e => onPassageTimeChange(i, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1">Tugash</span>
                                            <input
                                                type="text"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="7:30"
                                                value={passage.endTime || ""}
                                                onChange={e => onPassageTimeChange(i, 'endTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1" title="Part tugagandan keyin keyingi partgacha necha soniya sukunat qo'shilishi">Kutish (sek)</span>
                                            <input
                                                type="number"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="0"
                                                min="0"
                                                value={passage.extraSilentTime !== undefined ? passage.extraSilentTime : ""}
                                                onChange={e => onPassageTimeChange(i, 'extraSilentTime', e.target.value === "" ? "" : Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <AudioSegmentPlayer
                                        index={i}
                                        audioUrl={partAudioUrl}
                                        startTimeStr={passage.startTime || ""}
                                        endTimeStr={passage.endTime || ""}
                                        isDark={isDark}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaManager;
