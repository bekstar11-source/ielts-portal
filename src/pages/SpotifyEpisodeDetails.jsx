import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { 
    Play, Pause, Download, PlusCircle, MoreHorizontal, 
    ChevronLeft, HelpCircle, FileText, ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePodcast } from "../context/PodcastContext";
import LazyImage from "../components/common/LazyImage";
import InteractivePlayer from "../components/InteractivePlayer";

export default function SpotifyEpisodeDetails() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { playTrack, currentTrack, setCurrentTrack, isPlaying, setIsPlaying, currentTime, duration, handleSeek } = usePodcast();
    
    const [podcast, setPodcast] = useState(null);
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMoreDesc, setShowMoreDesc] = useState(false);
    const [scrollOpacity, setScrollOpacity] = useState(0);
    const [openSection, setOpenSection] = useState(null); // 'exercises' or 'transcript'
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchPodcastAndAlbum = async () => {
            try {
                const podSnap = await getDoc(doc(db, "podcasts", podcastId));
                if (podSnap.exists()) {
                    const podData = { id: podSnap.id, ...podSnap.data() };
                    setPodcast(podData);
                    
                    if (podData.collectionId && podData.collectionId !== "None") {
                        const albumSnap = await getDoc(doc(db, "podcast_collections", podData.collectionId));
                        if (albumSnap.exists()) {
                            setAlbum(albumSnap.data());
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcastAndAlbum();
    }, [podcastId]);

    const getPodcastDuration = (p) => {
        if (p.duration && p.duration > 0) return p.duration;
        let maxTime = 0;
        if (p.transcript && Array.isArray(p.transcript)) {
            p.transcript.forEach(s => { if (s.time > maxTime) maxTime = s.time; });
        }
        if (p.questions && Array.isArray(p.questions)) {
            p.questions.forEach(q => { if (q.time > maxTime) maxTime = q.time; });
        }
        return maxTime > 0 ? maxTime + 10 : 0;
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0 min 0 sec";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        if (m > 0) return `${m} min ${s} sec`;
        return `${s} sec`;
    };

    const getPodcastDate = (p) => {
        try {
            const date = p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : new Date());
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return "Apr 26";
        }
    };

    const handlePlay = () => {
        if (podcast.mediaType === 'youtube' || podcast.mediaType === 'video') {
            // For Video/YouTube podcasts, open the interactive player
            if (currentTrack?.id !== podcast.id) {
                setCurrentTrack(podcast);
            }
            setIsExpanded(true);
            setIsPlaying(false); // Let user press play inside to avoid browser blocking
            return;
        }

        // For Audio podcasts
        if (currentTrack?.id === podcast.id) {
            setIsPlaying(!isPlaying);
        } else {
            playTrack(podcast);
        }
    };

    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        // Fade in header starting almost immediately
        const opacity = Math.min(1, Math.max(0, scrollTop / 120));
        setScrollOpacity(opacity);
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!podcast) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Podcast topilmadi.</div>;
    }

    const isPlayingThis = currentTrack?.id === podcast.id && isPlaying;
    
    // Sort questions and transcript by time
    const exercises = podcast.questions || [];
    const vocabulary = podcast.transcript || []; // Treating transcript as vocab for now or we can extract words if needed.

    return (
        <div onScroll={handleScroll} className="h-screen w-full bg-black text-white flex flex-col font-sans select-none overflow-y-auto custom-scrollbar relative">
            {/* Top Black Header */}
            <div className="sticky top-0 z-50 bg-[#121212] px-6 md:px-10 py-4 flex items-center gap-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-zinc-400 hover:text-white transition shrink-0">
                    <ChevronLeft size={22} />
                </button>
                <h2 className="text-xl font-black truncate text-white">Podcast Episode</h2>
            </div>

            {/* Scroll Animated Header (Slides out from under Top Header) */}
            <div 
                className="fixed top-[65px] left-0 w-full z-40 px-6 md:px-10 py-3 flex items-center gap-4 border-b border-white/5 shadow-2xl"
                style={{ 
                    backgroundColor: `#08504B`,
                    opacity: scrollOpacity, 
                    pointerEvents: scrollOpacity > 0.3 ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease-out'
                }}
            >
                <button 
                    onClick={handlePlay}
                    className="w-10 h-10 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-lg shrink-0"
                >
                    {isPlayingThis ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
                </button>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-black truncate text-white tracking-tight">{podcast.title}</h2>
                    <p className="text-[11px] text-white/60 font-medium leading-none mt-0.5">Now playing</p>
                </div>
            </div>

            {/* Header section with gradient */}
            <div className="bg-gradient-to-b from-[#08504B] to-[#121212] pt-6 pb-6 px-6 md:px-10 relative">
                
                <div className="mt-2 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#3e82d5]"></div>
                        <span className="text-white text-sm font-semibold">New Podcast Episode</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight mb-4">
                        {podcast.title}
                    </h1>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden shadow-lg">
                            {podcast.thumbnail ? (
                                <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : album?.thumbnail ? (
                                <LazyImage src={album.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : null}
                        </div>
                        <span className="text-white font-bold text-lg">{album?.name || "Official Podcast"}</span>
                    </div>
                </div>
            </div>

            {/* Content section */}
            <div className="px-6 md:px-10 pb-32">
                {/* Date and time left */}
                <div className="flex items-center gap-2 mb-6 mt-8 text-[#a7a7a7] text-sm font-medium">
                    <span>{getPodcastDate(podcast)} • {formatTime(getPodcastDuration(podcast))} left</span>
                    <div className="w-24 h-1 bg-white/20 rounded-full ml-2 overflow-hidden">
                        <div className="h-full bg-white rounded-full w-0"></div> {/* Can be updated based on progress later */}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-6 mb-10">
                    <button 
                        onClick={handlePlay}
                        className="w-14 h-14 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-xl"
                    >
                        {isPlayingThis ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} className="ml-1" />}
                    </button>
                    <button className="w-8 h-8 rounded-full border border-[#a7a7a7] flex items-center justify-center text-[#a7a7a7] hover:text-white hover:border-white transition-colors">
                        <Download size={16} />
                    </button>
                    <PlusCircle size={32} strokeWidth={1} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                    <MoreHorizontal size={32} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                </div>

                {/* Description */}
                <div className="mb-10 max-w-3xl">
                    <h2 className="text-xl font-bold text-white mb-4">Episode Description</h2>
                    <div className="text-[#a7a7a7] text-[15px] leading-relaxed whitespace-pre-wrap">
                        {showMoreDesc ? podcast.description : (podcast.description?.substring(0, 250) + (podcast.description?.length > 250 ? "..." : ""))}
                        {podcast.description && podcast.description.length > 250 && (
                            <button onClick={() => setShowMoreDesc(!showMoreDesc)} className="text-white font-bold ml-2 hover:underline">
                                {showMoreDesc ? "Show less" : "Show more"}
                            </button>
                        )}
                    </div>
                    {album && (
                        <button 
                            onClick={() => navigate(`/podcast/album/${podcast.collectionId}`)}
                            className="mt-6 px-4 py-1.5 border border-white/30 rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-all"
                        >
                            See all episodes
                        </button>
                    )}
                </div>

                <hr className="border-white/10 mb-10" />

                {/* Vocabulary & Exercises in Accordions */}
                <div className="max-w-3xl space-y-4">
                    {/* Exercises Accordion */}
                    {exercises.length > 0 && (
                        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                            <button 
                                onClick={() => setOpenSection(openSection === 'exercises' ? null : 'exercises')}
                                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <HelpCircle size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-lg font-bold text-white leading-none">Interactive Exercises</h2>
                                        <p className="text-xs text-[#a7a7a7] mt-1">{exercises.length} challenges available</p>
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: openSection === 'exercises' ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown size={20} className="text-[#a7a7a7]" />
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {openSection === 'exercises' && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-6 pt-2 space-y-4 border-t border-white/5">
                                            {exercises.map((ex, i) => (
                                                <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                                            {ex.type === 'mcq' ? 'Multiple Choice' : 'Gap-fill'}
                                                        </span>
                                                        <span className="text-[10px] text-[#a7a7a7] bg-black/40 px-2 py-1 rounded font-mono">
                                                            {formatTime(ex.time)}
                                                        </span>
                                                    </div>
                                                    <p className="text-white font-medium text-base mb-4">
                                                        {ex.type === 'mcq' ? ex.data.question : "Listen and fill the gap"}
                                                    </p>
                                                    
                                                    {ex.type === 'mcq' && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {ex.data.options.map((opt, oIdx) => (
                                                                <div key={oIdx} className="bg-white/5 p-3 rounded-lg text-sm text-[#a7a7a7] border border-transparent">
                                                                    {opt}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {ex.type === 'gapfill' && (
                                                        <div className="bg-white/5 p-4 rounded-lg text-sm text-[#a7a7a7] italic border-l-2 border-emerald-500/50">
                                                            "{ex.data.text.replace(/\{\{([^}]+)\}\}/g, '_______')}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Transcript Accordion */}
                    {vocabulary.length > 0 && (
                        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                            <button 
                                onClick={() => setOpenSection(openSection === 'transcript' ? null : 'transcript')}
                                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <FileText size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-lg font-bold text-white leading-none">Transcript / Vocabulary</h2>
                                        <p className="text-xs text-[#a7a7a7] mt-1">Full episode text available</p>
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: openSection === 'transcript' ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown size={20} className="text-[#a7a7a7]" />
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {openSection === 'transcript' && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-8 pt-2 border-t border-white/5">
                                            <div className="space-y-5 mt-4">
                                                {vocabulary.map((v, i) => (
                                                    <div key={i} className="flex gap-4 group">
                                                        <div className="text-[10px] text-[#a7a7a7] font-mono pt-1 w-12 shrink-0 group-hover:text-emerald-400 transition-colors">
                                                            {formatTime(v.time)}
                                                        </div>
                                                        <p className="text-[15px] text-white/80 leading-relaxed group-hover:text-white transition-colors">
                                                            {v.text}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            <InteractivePlayer isOpen={isExpanded} onClose={() => setIsExpanded(false)} />

            {/* Global Footer Player (Spotify Style) */}
            {currentTrack && (
                <div className="h-[95px] bg-black border-t border-white/5 px-6 flex items-center justify-between z-50 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 w-full transition-all duration-500">
                    <div className="flex items-center gap-4 w-[30%] min-w-[280px]">
                        {/* Mini Video Preview for YouTube Podcasts */}
                        {currentTrack.mediaType === 'youtube' ? (
                            <div className="w-16 h-10 rounded bg-black overflow-hidden shadow-lg border border-white/10 shrink-0 relative group/mini cursor-pointer" onClick={() => setIsExpanded(true)}>
                                <iframe 
                                    className="w-[140%] h-[140%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none scale-110"
                                    src={`https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&origin=${window.location.origin}`}
                                    title="Mini Video"
                                    frameBorder="0"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover/mini:bg-transparent transition-colors flex items-center justify-center">
                                    <ChevronDown size={16} className="text-white opacity-0 group-hover/mini:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-14 h-14 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden relative group cursor-pointer shadow-2xl" onClick={() => setIsExpanded(true)}>
                                <LazyImage src={currentTrack.thumbnail || null} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                            </div>
                        )}
                        <div className="hidden sm:block truncate pr-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
                            <p className="text-[14px] font-black truncate text-white leading-tight">{currentTrack.title}</p>
                            <p className="text-[11px] text-[#a7a7a7] font-bold uppercase tracking-wider">{currentTrack.level || "B2"} Podcast</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center max-w-[650px] w-full px-4">
                        <div className="flex items-center gap-7 mb-3">
                            <button 
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all shadow-lg active:scale-95" 
                                onClick={() => {
                                    const isVideo = currentTrack?.mediaType === 'youtube' || currentTrack?.mediaType === 'video';
                                    if (!isPlaying && isVideo) {
                                        setIsExpanded(true);
                                    }
                                    setIsPlaying(!isPlaying);
                                }}
                            >
                                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 w-full">
                            <span className="text-[11px] text-[#a7a7a7] font-black w-8 text-right tabular-nums">{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                            <div className="flex-1 h-[4px] bg-[#4d4d4d] rounded-full group cursor-pointer flex items-center" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const percent = (e.clientX - rect.left) / rect.width;
                                handleSeek(percent * duration);
                            }}>
                                <div className="h-full bg-white group-hover:bg-[#1ed760] rounded-full relative transition-colors" style={{ width: `${(currentTime / duration) * 100 || 0}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                                </div>
                            </div>
                            <span className="text-[11px] text-[#a7a7a7] font-black w-8 tabular-nums">{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-5 w-[30%] min-w-[200px] text-[#a7a7a7]">
                        {/* Empty space for layout balance */}
                    </div>
                </div>
            )}
        </div>
    );
}
