import React from "react";
import { Mic2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import LazyImage from "../common/LazyImage";

export default function AlbumGridItem({ col, isDark, episodeCount }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const open = () => navigate(`/podcast/album/${col.id}`);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={col.name}
            onClick={open}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
            className={`p-3 rounded-xl border transition-colors duration-200 cursor-pointer group flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-primary ${
                isDark
                    ? 'bg-white/[0.04] border-white/5 hover:bg-white/[0.08]'
                    : 'bg-white border-warm-hairline hover:border-warm-primary/40 hover:shadow-md'
            }`}
        >
            <div className={`relative aspect-square w-full rounded-lg mb-3 overflow-hidden flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-warm-card'}`}>
                {col.thumbnail ? (
                    <LazyImage src={col.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Mic2 size={40} className={isDark ? 'text-white/20' : 'text-warm-muted-soft'} />
                )}
                <div className="absolute bottom-2 right-2 w-10 h-10 bg-warm-primary text-warm-on-primary rounded-full flex items-center justify-center shadow-lg opacity-100 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200">
                    <Play size={18} fill="currentColor" stroke="currentColor" className="ml-0.5" />
                </div>
            </div>
            <h3 className={`font-semibold text-[14px] leading-snug line-clamp-1 mb-0.5 transition-colors group-hover:text-warm-primary ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>
                {col.name}
            </h3>
            <p className={`text-[11px] line-clamp-2 leading-snug ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>
                {col.description || t('podcastPage.episodesCount', { count: episodeCount || 0 })}
            </p>
        </div>
    );
}
