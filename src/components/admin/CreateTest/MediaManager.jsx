import React, { useRef, useState, useEffect } from "react";
import { toMMSS, processTime } from "./CreateTestUtils";
import PartWaveformEditor from "./PartWaveformEditor";
import { getCdnUrl } from "../../../utils/cdnUtils";

const AudioSegmentPlayer = ({ index, audioUrl, startTimeStr, endTimeStr, isDark, onMark }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [absTime, setAbsTime] = useState(0);      // audio faylidagi haqiqiy pozitsiya
    const [fileDuration, setFileDuration] = useState(0);
    // "Belgilash rejimi" — butun audio bo'ylab yurib, vaqtlarni playhead'dan olish uchun
    const [markMode, setMarkMode] = useState(false);
    const progressInterval = useRef(null);

    const start = processTime(startTimeStr);
    const end = processTime(endTimeStr);

    const segmentDuration = (end > start)
        ? (end - start)
        : (fileDuration > start ? fileDuration - start : 0);
    const viewDuration = markMode ? fileDuration : segmentDuration;
    const viewTime = markMode ? absTime : Math.max(0, absTime - start);

    useEffect(() => {
        return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
    }, []);

    const handleProgressClick = (e) => {
        const audio = audioRef.current;
        if (!audioUrl || !audio || viewDuration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const target = markMode ? pct * fileDuration : start + pct * segmentDuration;
        audio.currentTime = target;
        setAbsTime(target);
    };

    const startTicker = (audio) => {
        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = setInterval(() => {
            if (!markMode && end > start && audio.currentTime >= end) {
                audio.pause();
                clearInterval(progressInterval.current);
            }
            setAbsTime(audio.currentTime);
        }, 100);
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audioUrl || !audio) return;

        if (isPlaying) { audio.pause(); return; }

        document.querySelectorAll('audio[id^="preview-audio-"]').forEach(a => {
            if (a !== audio && !a.paused) a.pause();
        });

        if (!markMode && (audio.currentTime < start || (end > start && audio.currentTime >= end))) {
            audio.currentTime = start;
        }
        audio.play().then(() => {
            setIsPlaying(true);
            startTicker(audio);
        }).catch(e => console.error("Error playing preview:", e));
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (progressInterval.current) clearInterval(progressInterval.current);
    };

    const mark = (field) => {
        const audio = audioRef.current;
        if (!audio || !onMark) return;
        onMark(field, toMMSS(Math.floor(audio.currentTime)));
    };

    const markBtn = `h-6 px-2 rounded-lg border text-[9px] font-black transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600'}`;

    return (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
                <audio
                    id={`preview-audio-${index}`}
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handlePause}
                    onPause={handlePause}
                    onPlay={() => setIsPlaying(true)}
                    preload="metadata"
                    onLoadedMetadata={() => {
                        const d = audioRef.current?.duration;
                        setFileDuration(Number.isFinite(d) ? d : 0);
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
                    <span>{toMMSS(viewTime)}</span>
                    <div
                        onClick={handleProgressClick}
                        className={`flex-1 h-2 -my-0.5 rounded-full relative cursor-pointer ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    >
                        {/* Belgilash rejimida joriy segment ko'k yo'lakcha bilan ko'rsatiladi */}
                        {markMode && fileDuration > 0 && end > start && (
                            <div
                                className="absolute inset-y-0 bg-blue-500/25 rounded-full pointer-events-none"
                                style={{ left: `${(start / fileDuration) * 100}%`, width: `${((end - start) / fileDuration) * 100}%` }}
                            />
                        )}
                        <div
                            className="h-full bg-blue-500 rounded-full pointer-events-none transition-all duration-75"
                            style={{ width: `${viewDuration > 0 ? Math.min(100, (viewTime / viewDuration) * 100) : 0}%` }}
                        />
                    </div>
                    <span>{toMMSS(viewDuration)}</span>
                </div>
            </div>

            {onMark && (
                <div className="flex items-center gap-1.5 mt-2">
                    <button
                        type="button"
                        onClick={() => setMarkMode(m => !m)}
                        disabled={!audioUrl}
                        title="Butun audio bo'ylab yurib, vaqtlarni playhead'dan belgilash"
                        className={`h-6 px-2 rounded-lg border text-[9px] font-black transition active:scale-95 disabled:opacity-30 ${
                            markMode
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : (isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600')
                        }`}
                    >
                        Belgilash
                    </button>
                    {markMode && (
                        <>
                            <button type="button" onClick={() => mark('startTime')} className={markBtn} title="Joriy vaqtni boshlanish deb belgilash">
                                ⇤ Boshlanish
                            </button>
                            <button type="button" onClick={() => mark('endTime')} className={markBtn} title="Joriy vaqtni tugash deb belgilash">
                                Tugash ⇥
                            </button>
                            <span className="text-[9px] font-mono opacity-40 ml-auto">{toMMSS(Math.floor(absTime))}</span>
                        </>
                    )}
                </div>
            )}
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
    // Map/diagramma faqat reading va listening testlarida ishlatiladi —
    // writing/speaking uchun bu blok shunchaki shovqin edi.
    const showMaps = testData.type === 'reading' || testData.type === 'listening';
    const hasAnyAudio = audioMode === 'single' ? !!singleAudioUrl : Object.values(partAudios || {}).some(Boolean);

    return (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Media & Fayllar</h3>
                {uploading ? (
                    <span className="flex items-center gap-2 text-[9px] font-black text-blue-500">
                        <span className="w-16 h-1 rounded-full bg-blue-500/15 overflow-hidden">
                            <span className="block h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress || 0}%` }} />
                        </span>
                        {uploadProgress || 0}%
                    </span>
                ) : testData.type === 'listening' && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${hasAnyAudio ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {hasAnyAudio ? 'Audio bor' : 'Audio yo\'q'}
                    </span>
                )}
            </div>

            {testData.type === 'listening' && (
                <>
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold opacity-60">Audio Rejimi</label>
                            <div className={`flex p-1 rounded-lg ${isDark ? 'bg-[#181715]' : 'bg-gray-100'}`}>
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
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            className={`w-full h-10 pl-4 pr-9 rounded-xl border outline-none text-xs transition focus:border-blue-500 ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                                            placeholder="Yagona audio URL..."
                                            value={singleAudioUrl}
                                            onChange={e => handleSingleAudioUrlChange(e.target.value)}
                                        />
                                        {singleAudioUrl && (
                                            <svg className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </div>
                                    <label className={`h-10 px-4 shrink-0 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition ${isDark ? 'border-white/5' : 'border-gray-200'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="file" className="hidden" accept="audio/*" onChange={handleSingleAudioUpload} disabled={uploading} />
                                        {uploading && uploadingPart === 'single' ? (
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-[10px] font-bold">Yuklash</span>
                                        )}
                                    </label>
                                </div>
                                {singleAudioUrl && (
                                    <audio src={getCdnUrl(singleAudioUrl)} controls preload="none" className="w-full h-8" />
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(listeningPartCount)].map((_, i) => (
                                    <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold uppercase opacity-40">Part {i + 1}</p>
                                            <span className={`w-1.5 h-1.5 rounded-full ${partAudios[i] ? 'bg-green-500' : 'bg-gray-400/40'}`} title={partAudios[i] ? "Audio biriktirilgan" : "Audio yo'q"} />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className={`flex-1 h-8 px-2 rounded-lg border outline-none text-[10px] transition focus:border-blue-500 ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}
                                                value={partAudios[i] || ""}
                                                onChange={e => handleAudioUrlChange(e.target.value, i)}
                                                placeholder="URL..."
                                            />
                                            <label className={`h-8 px-2 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-500 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title={`Part ${i + 1} audiosini yuklash`}>
                                                <input type="file" className="hidden" accept="audio/*" onChange={e => handlePartAudioUpload(e, i)} disabled={uploading} />
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
            {showMaps && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-xs font-bold opacity-60 block">Map / Diagramma Rasmlari</span>
                            <span className="text-[10px] opacity-35">Yuklangan rasm map_labeling savoliga avtomatik biriktiriladi</span>
                        </div>
                        <label className={`h-8 px-4 shrink-0 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                            <input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} disabled={uploading} />
                            {uploading && uploadingPart === 'map' ? (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="text-[10px] font-bold">+ Rasm</span>
                            )}
                        </label>
                    </div>

                    {uploadedMaps.length === 0 ? (
                        <div className={`rounded-xl border border-dashed p-3 text-center text-[10px] opacity-40 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            Hozircha rasm yuklanmagan
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {uploadedMaps.map((map, idx) => (
                                <div key={idx} className={`flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg border text-[10px] font-medium ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    <img src={map.url} alt="" className="w-7 h-7 rounded object-cover bg-black/10" />
                                    <a href={map.url} target="_blank" rel="noreferrer" className="max-w-[110px] truncate hover:text-blue-500" title={map.name}>{map.name}</a>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMap(idx)}
                                        aria-label="Rasmni o'chirish"
                                        className="w-4 h-4 flex items-center justify-center rounded text-red-500 hover:bg-red-500/10"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* THUMBNAIL */}
            <div className="mb-6">
                <label htmlFor="test-thumbnail" className="text-xs font-bold mb-1.5 block opacity-60">Thumbnail URL</label>
                <div className="flex gap-2">
                    <input
                        id="test-thumbnail"
                        type="text"
                        className={`flex-1 h-10 px-4 rounded-xl border outline-none text-xs transition ${isDark ? 'bg-[#181715] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={testData.thumbnail || ""}
                        onChange={e => setTestData({ ...testData, thumbnail: e.target.value })}
                        placeholder="Test rasmi URL manzili..."
                    />
                    {testData.thumbnail && (
                        <img
                            src={testData.thumbnail}
                            alt="Thumbnail"
                            className={`w-10 h-10 rounded-xl object-cover border ${isDark ? 'border-white/5' : 'border-gray-200'}`}
                            onError={e => { e.currentTarget.style.opacity = '0.2'; }}
                        />
                    )}
                </div>
            </div>

            {/* AUDIO TIMESTAMPS MANAGER */}
            {testData.type === 'listening' && onPassageTimeChange && (
                <div className="border-t border-gray-100 dark:border-white/5 pt-5">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold opacity-60">Audio Segmentlari Vaqtlari (Passages Timestamps)</label>
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-500/5 px-2 py-0.5 rounded border border-gray-500/10">MM:SS · yoki "Belgilash" bilan playhead'dan oling</span>
                    </div>
                    {/* Yagona audio rejimida to'lqin ustida region surib belgilash mumkin */}
                    {audioMode === 'single' && singleAudioUrl && (
                        <div className="mb-3">
                            <PartWaveformEditor
                                key={singleAudioUrl}
                                audioUrl={getCdnUrl(singleAudioUrl)}
                                passages={testData.passages || []}
                                partCount={listeningPartCount}
                                onChange={(i, patch) => onPassageTimeChange(i, patch)}
                                isDark={isDark}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[...Array(listeningPartCount)].map((_, i) => {
                            const passage = testData.passages?.[i] || {};
                            const partAudioUrl = audioMode === 'single' ? singleAudioUrl : (partAudios[i] || passage.audio || "");
                            return (
                                <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase opacity-40">Part {i + 1} Vaqti</span>
                                        {(passage.startTime || passage.endTime || passage.extraSilentTime) && (
                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                {passage.startTime || "0:00"} - {passage.endTime || "0:00"}
                                                {passage.extraSilentTime ? ` (+${passage.extraSilentTime}s)` : ""}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1">Boshlash</span>
                                            <input
                                                type="text"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="0:00"
                                                value={passage.startTime || ""}
                                                onChange={e => onPassageTimeChange(i, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1">Tugash</span>
                                            <input
                                                type="text"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="7:30"
                                                value={passage.endTime || ""}
                                                onChange={e => onPassageTimeChange(i, 'endTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1" title="Part tugagandan keyin keyingi partgacha necha soniya sukunat qo'shilishi">Kutish (sek)</span>
                                            <input
                                                type="number"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="0"
                                                min="0"
                                                value={passage.extraSilentTime !== undefined ? passage.extraSilentTime : ""}
                                                onChange={e => onPassageTimeChange(i, 'extraSilentTime', e.target.value === "" ? "" : Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <AudioSegmentPlayer
                                        index={i}
                                        audioUrl={getCdnUrl(partAudioUrl)}
                                        startTimeStr={passage.startTime || ""}
                                        endTimeStr={passage.endTime || ""}
                                        isDark={isDark}
                                        onMark={(field, value) => onPassageTimeChange(i, field, value)}
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

export default React.memo(MediaManager);
