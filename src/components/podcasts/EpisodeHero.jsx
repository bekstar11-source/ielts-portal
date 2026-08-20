import React from "react";
import LazyImage from "../common/LazyImage";
import { useTranslation } from "../../context/LanguageContext";

// Avval hero qat'iy to'q-yashil gradient bilan chizilardi — sahifaning qolgan
// qismi yorug' rejimda bo'lsa ham bu blok qorong'i bo'lib turardi.
export default function EpisodeHero({ podcast, album, isDark }) {
    const { t } = useTranslation();

    return (
        <div
            className="pt-8 pb-8 px-6 md:px-10 relative"
            style={{
                background: isDark
                    ? 'linear-gradient(to bottom, #252320, #181715)'
                    : 'linear-gradient(to bottom, #f5f0e8, #faf9f5)'
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-warm-primary" />
                <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>
                    {t('podcastPage.episode')}
                </span>
            </div>

            <h1 className={`text-2xl md:text-4xl font-bold tracking-tight leading-tight mb-5 ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>
                {podcast.title}
            </h1>

            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 ${isDark ? 'bg-white/5' : 'bg-warm-card'}`}>
                    {podcast.thumbnail ? (
                        <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : album?.thumbnail ? (
                        <LazyImage src={album.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : null}
                </div>
                <span className={`font-semibold text-[14px] truncate ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>
                    {album?.name || t('podcastPage.title')}
                </span>
            </div>
        </div>
    );
}
