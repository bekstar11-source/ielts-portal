import { Play, Pause, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import { formatTime, getPodcastDuration, getPodcastDate } from "../../utils/podcastUtils";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LanguageContext";

export default function EpisodeListItem({
    p,
    album,
    isDark,
    currentTrack,
    isPlaying,
    playTrack,
    setIsPlaying,
    setIsExpanded,
    setCurrentTrack
}) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { likedPodcasts, toggleLike } = usePodcast();
    const isLiked = likedPodcasts.includes(p?.id);
    const navigate = useNavigate();
    const isPlayingThis = currentTrack?.id === p.id && isPlaying;
    const isActiveThis = currentTrack?.id === p.id;

    const openEpisode = () => {
        setCurrentTrack(p);
        setIsExpanded(true);
    };

    // Avval bu tugma ham faqat trekni tanlab qo'yardi: Pause ikonkasi ko'rinib
    // tursa ham bosilganda ijro holati o'zgarmasdi.
    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isActiveThis) {
            setIsPlaying?.(!isPlaying);
        } else if (playTrack) {
            playTrack(p);
        } else {
            setCurrentTrack(p);
            setIsPlaying?.(true);
        }
        setIsExpanded(true);
    };

    // Mehmon foydalanuvchida `toggleLike` jimgina hech nima qilmasdi
    const handleLikeClick = (e) => {
        e.stopPropagation();
        if (!user?.uid) {
            navigate('/auth/login');
            return;
        }
        toggleLike(user.uid, p.id);
    };

    const mutedText = isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted';

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={p.title}
            onClick={openEpisode}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEpisode();
                }
            }}
            className={`group flex gap-4 p-4 -mx-4 rounded-xl cursor-pointer transition-colors border-b last:border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-primary ${
                isDark
                    ? `hover:bg-white/5 border-white/5 ${isActiveThis ? 'bg-white/5' : ''}`
                    : `hover:bg-warm-surface border-warm-hairline ${isActiveThis ? 'bg-warm-surface' : ''}`
            }`}
        >
            <div className="relative shrink-0">
                <LazyImage src={p.thumbnail} alt="" className="w-[96px] h-[96px] md:w-[112px] md:h-[112px] rounded-lg object-cover" />
                {isPlayingThis && (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center rounded-lg">
                        <div className="w-3 h-3 flex items-end gap-[2px]">
                            <motion.div animate={{ height: [3, 10, 3] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-warm-primary rounded-t-sm" />
                            <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-warm-primary rounded-t-sm" />
                            <motion.div animate={{ height: [5, 12, 5] }} transition={{ repeat: Infinity, duration: 0.9 }} className="w-1 bg-warm-primary rounded-t-sm" />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
                <h4 className={`font-semibold text-[15px] leading-snug mb-1 transition-colors ${
                    isActiveThis ? 'text-warm-primary' : (isDark ? 'text-warm-on-dark' : 'text-warm-ink')
                } group-hover:text-warm-primary`}>
                    {p.title}
                </h4>
                {album?.name && (
                    <span className={`text-[12px] font-medium mb-2 ${mutedText}`}>{album.name}</span>
                )}
                <p className={`text-[13px] line-clamp-2 leading-snug mb-3 pr-4 ${mutedText}`}>
                    {p.description || ''}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={handleLikeClick}
                            aria-pressed={isLiked}
                            aria-label={isLiked ? t('podcastPage.unlike') : t('podcastPage.like')}
                            className={`transition-colors active:scale-110 ${isLiked ? 'text-warm-primary' : `${mutedText} hover:text-warm-primary`}`}
                        >
                            <Heart size={17} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 1.8} />
                        </button>
                        <span className={`text-[12px] font-medium tabular-nums truncate ${mutedText}`}>
                            {getPodcastDate(p)} • {formatTime(getPodcastDuration(p))}
                        </span>
                    </div>
                    <button
                        onClick={handlePlayClick}
                        aria-label={`${isPlayingThis ? t('podcastPage.pause') : t('podcastPage.play')}: ${p.title}`}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary transition-all hover:scale-105 active:scale-95 shrink-0 shadow-sm"
                    >
                        {isPlayingThis ? <Pause fill="currentColor" size={14} /> : <Play fill="currentColor" size={14} className="ml-0.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
