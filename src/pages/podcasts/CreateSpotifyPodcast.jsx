// src/pages/podcasts/CreateSpotifyPodcast.jsx
import React, { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pause, Play } from "lucide-react";

// HOOKS
import { useCreatePodcast } from "../../hooks/useCreatePodcast";

// COMPONENTS
import { PodcastHeader } from "./components/PodcastHeader";
import { GeneralInfoSection } from "./components/GeneralInfoSection";
import { MediaAssetsSection } from "./components/MediaAssetsSection";
import { TimelineSection } from "./components/TimelineSection";
import { ProModeEditor } from "./components/ProModeEditor";

export default function CreateSpotifyPodcast() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const thumbRef = useRef(null);
    const audioRef = useRef(null);

    const {
        form, setForm,
        segments, collections,
        loading, saving,
        uploadProgress, thumbProgress,
        isProMode, setIsProMode,
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        jsonInput, setJsonInput,
        handleFileUpload, addSegment, updateSegment, deleteSegment, handleSave
    } = useCreatePodcast(editId, navigate);

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 font-sans">
            <PodcastHeader 
                navigate={navigate}
                editId={editId}
                isProMode={isProMode}
                setIsProMode={setIsProMode}
                handleSave={handleSave}
                saving={saving}
            />

            <main className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                {/* LEFT SIDEBAR */}
                <div className="lg:col-span-4 space-y-6">
                    <GeneralInfoSection 
                        form={form} 
                        setForm={setForm} 
                        collections={collections} 
                    />

                    <MediaAssetsSection 
                        form={form}
                        setForm={setForm}
                        thumbRef={thumbRef}
                        fileRef={fileRef}
                        handleFileUpload={handleFileUpload}
                        thumbProgress={thumbProgress}
                        uploadProgress={uploadProgress}
                    />

                    {/* Mini Player */}
                    {form.audioUrl && (
                        <section className="bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-800">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => {
                                        if (isPlaying) audioRef.current.pause();
                                        else audioRef.current.play();
                                        setIsPlaying(!isPlaying);
                                    }}
                                    className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:scale-105 transition-all"
                                >
                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                                </button>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-zinc-400">{formatTime(currentTime)}</span>
                                        <span className="text-[10px] font-bold text-zinc-500">{audioRef.current?.duration ? formatTime(audioRef.current.duration) : "0:00"}</span>
                                    </div>
                                    <div 
                                        className="h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const pos = (e.clientX - rect.left) / rect.width;
                                            audioRef.current.currentTime = pos * audioRef.current.duration;
                                        }}
                                    >
                                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                                <audio 
                                    ref={audioRef} 
                                    src={form.audioUrl} 
                                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                                    onEnded={() => setIsPlaying(false)}
                                    hidden 
                                />
                            </div>
                        </section>
                    )}
                </div>

                {/* RIGHT AREA */}
                <div className="lg:col-span-8">
                    {isProMode ? (
                        <ProModeEditor jsonInput={jsonInput} setJsonInput={setJsonInput} />
                    ) : (
                        <TimelineSection 
                            segments={segments}
                            addSegment={addSegment}
                            updateSegment={updateSegment}
                            deleteSegment={deleteSegment}
                            currentTime={currentTime}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
