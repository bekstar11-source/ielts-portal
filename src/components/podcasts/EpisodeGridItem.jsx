import React, { useState } from "react";
import { Play, Pause, Heart, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LanguageContext";
import ShareModal from "../common/ShareModal";
import { formatTime, getPodcastDuration } from "../../utils/podcastUtils";

const DIFF_COLORS = {
    easy: "bg-warm-success",
    medium: "bg-warm-accent-teal",
    hard: "bg-warm-accent-amber",
    super_hard: "bg-warm-error",
};

export default function EpisodeGridItem({
    p,
    isDark,
    currentTrack,
    isPlaying,
    setIsExpanded,
    playTrack,
    setCurrentTrack,
    setIsPlaying
}) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { likedPodcasts, toggleLike } = usePodcast();
    const isLiked = likedPodcasts.includes(p?.id);
    const navigate = useNavigate();
    const [isShareOpen, setIsShareOpen] = useState(false);
    // Sessiya davomidagi o'zgarish. Avval `likesCount + (isLiked ? 1 : 0)` yozilgan edi —
    // bu bazadagi son allaqachon foydalanuvchi like'ini o'z ichiga olgani uchun ikki marta sanardi.
    const [likeDelta, setLikeDelta] = useState(0);
    if (!p) return null;
    const isPlayingThis = currentTrack?.id === p.id && isPlaying;

    const openEpisode = () => {
        setCurrentTrack(p);
        setIsExpanded(true);
    };

    // Play tugmasi haqiqatan ijro etsin (avval faqat trekni tanlab, expand qilardi —
    // Pause ikonkasi ko'rinsa ham bosilganda hech nima o'zgarmasdi)
    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (playTrack) {
            playTrack(p);
        } else {
            setCurrentTrack(p);
            setIsPlaying?.(true);
        }
        setIsExpanded(true);
    };

    const handleLikeClick = (e) => {
        e.stopPropagation();
        if (!user?.uid) {
            navigate('/login');
            return;
        }
        setLikeDelta((d) => d + (isLiked ? -1 : 1));
        toggleLike(user.uid, p.id);
    };

    const likeCount = Math.max(0, (p.likesCount || 0) + likeDelta);
    const episodeDuration = getPodcastDuration(p);
    const mutedText = isDark ? "text-warm-on-dark-soft" : "text-warm-muted";

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={p.title}
            onClick={openEpisode}
            // Karta faqat sichqoncha bilan ochilardi — klaviatura foydalanuvchisi uchun yopiq edi
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEpisode();
                }
            }}
            className={`group rounded-xl p-3 cursor-pointer relative flex flex-col transition-colors duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-primary ${
                isDark
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/5'
                    : 'bg-white border-warm-hairline hover:border-warm-primary/40 hover:shadow-md'
            }`}
        >
            <div className="relative aspect-square w-full mb-3 rounded-lg overflow-hidden bg-warm-card dark:bg-white/5">
                <LazyImage src={p.thumbnail} alt="" className="w-full h-full object-cover" />

                {/* Level Badge */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white shadow-sm ${DIFF_COLORS[p.difficulty] || 'bg-warm-primary'}`}>
                    {p.level || "IELTS"}
                </div>

                {/* Play Button Overlay — mobil qurilmada hover yo'q, shuning uchun doim ko'rinadi */}
                <button
                    type="button"
                    onClick={handlePlayClick}
                    aria-label={`${isPlayingThis ? t('podcastPage.pause') : t('podcastPage.play')}: ${p.title}`}
                    className={`absolute bottom-2 right-2 w-10 h-10 bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isPlayingThis ? 'opacity-100' : 'opacity-100 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus-within:opacity-100'
                    }`}
                >
                    {isPlayingThis
                        ? <Pause size={18} fill="currentColor" stroke="currentColor" />
                        : <Play size={18} fill="currentColor" stroke="currentColor" className="ml-0.5" />}
                </button>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
                <div className="min-w-0">
                    <h3 className={`font-semibold text-[13px] leading-snug line-clamp-2 transition-colors ${
                        isDark ? 'text-warm-on-dark' : 'text-warm-ink'
                    } group-hover:text-warm-primary`}>
                        {p.title}
                    </h3>
                    {/* `p.duration` — soniyalardagi son; avval xom holda "912" deb chiqardi */}
                    <p className={`text-[11px] font-medium mt-0.5 tabular-nums ${mutedText}`}>
                        {episodeDuration > 0 ? formatTime(episodeDuration) : '—'}
                    </p>
                </div>
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleLikeClick}
                        aria-pressed={isLiked}
                        aria-label={isLiked ? t('podcastPage.unlike') : t('podcastPage.like')}
                        className={`flex items-center gap-1 py-1 pr-1 rounded-full transition-colors active:scale-110 ${
                            isLiked ? 'text-warm-primary' : `${mutedText} hover:text-warm-primary`
                        }`}
                    >
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                        <span className="text-[11px] font-semibold tabular-nums">{likeCount}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsShareOpen(true);
                        }}
                        className={`p-1 rounded-full transition-colors active:scale-110 ${mutedText} hover:text-warm-primary`}
                        aria-label={t('podcastPage.share')}
                        title={t('podcastPage.share')}
                    >
                        <Share2 size={14} />
                    </button>
                </div>
            </div>

            {/* ShareModal portalda chizilsa ham React hodisalari shu kartaga ko'tariladi —
                to'xtatilmasa modal ichidagi har bir klik pleyerni ham ochib yuborardi. */}
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <ShareModal
                    isOpen={isShareOpen}
                    onClose={() => setIsShareOpen(false)}
                    testId={p.id}
                    testTitle={p.title}
                    testType="podcast"
                />
            </div>
        </div>
    );
}
