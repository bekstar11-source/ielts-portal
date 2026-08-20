import React from "react";
import { List as ListIcon } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import LazyImage from "../common/LazyImage";

export default function AlbumHero({ album, podcasts, isDark, dominantColor }) {
    const { t } = useTranslation();

    return (
        <div
            className="px-6 md:px-8 pt-8 md:pt-12 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 shrink-0 transition-colors duration-300"
            style={{
                background: isDark
                    ? `linear-gradient(to bottom, ${dominantColor}, #181715)`
                    : `linear-gradient(to bottom, ${dominantColor}, #faf9f5)`
            }}
        >
            <div className={`w-40 h-40 sm:w-48 sm:h-48 shadow-[0_12px_40px_rgba(0,0,0,0.25)] rounded-2xl overflow-hidden shrink-0 flex items-center justify-center ${isDark ? 'bg-warm-dark-elevated' : 'bg-warm-card'}`}>
                {album?.thumbnail ? (
                    <LazyImage src={album.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : podcasts[0]?.thumbnail ? (
                    <LazyImage src={podcasts[0].thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <ListIcon size={56} className={isDark ? 'text-white/20' : 'text-warm-muted-soft'} />
                )}
            </div>
            <div className="flex flex-col items-center md:items-start min-w-0 w-full">
                <span className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>
                    {t('podcastPage.album')}
                </span>
                {/* Avval `truncate` sarlavhaning pastki qismini ham kesib tashlardi */}
                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3 line-clamp-2 text-center md:text-left ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>
                    {album?.name || t('podcastPage.album')}
                </h1>
                {album?.description && (
                    <p className={`text-[13px] font-medium mb-3 line-clamp-2 max-w-2xl text-center md:text-left ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'}`}>
                        {album.description}
                    </p>
                )}
                <p className={`text-[12px] font-semibold ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>
                    {t('podcastPage.episodesCount', { count: podcasts.length })}
                </p>
            </div>
        </div>
    );
}
