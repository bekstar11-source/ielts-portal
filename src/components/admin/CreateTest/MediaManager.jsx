import React from "react";
import { getFileNameFromUrl } from "./CreateTestUtils";

const MediaManager = ({ 
    testData, setTestData, 
    audioMode, setAudioMode, 
    singleAudioUrl, handleSingleAudioUpload, handleSingleAudioUrlChange,
    partAudios, handlePartAudioUpload, handleAudioUrlChange,
    listeningPartCount,
    uploadedMaps, handleMapUpload, handleDeleteMap,
    uploading, uploadingPart, uploadProgress,
    isDark,
    onPassageTimeChange,
    onIntroDurationChange
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
                                                    <span className="text-[9px] font-bold">UP</span>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="text-xs font-bold mb-1.5 block opacity-60">Intro Countdown (soniya)</label>
                        <input
                            type="number"
                            className={`w-full h-10 px-4 rounded-xl border outline-none text-xs transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                            value={testData.introDuration !== undefined ? testData.introDuration : 10}
                            onChange={e => onIntroDurationChange && onIntroDurationChange(e.target.value)}
                            placeholder="Masalan: 10"
                            min="0"
                        />
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
                            return (
                                <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase opacity-40">Part {i + 1} Vaqti</span>
                                        {(passage.startTime || passage.endTime) && (
                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                {passage.startTime || "0:00"} - {passage.endTime || "0:00"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1">Start Time</span>
                                            <input
                                                type="text"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="0:00"
                                                value={passage.startTime || ""}
                                                onChange={e => onPassageTimeChange(i, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1">End Time</span>
                                            <input
                                                type="text"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                                                placeholder="7:30"
                                                value={passage.endTime || ""}
                                                onChange={e => onPassageTimeChange(i, 'endTime', e.target.value)}
                                            />
                                        </div>
                                    </div>
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
