import React from "react";
import { Home, Search, Library, ChevronLeft, List as ListIcon, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import LazyImage from "../common/LazyImage";
import { SidebarSkeleton } from "./PodcastSkeletons";

export default function PodcastSidebar({
    isDark,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    loading,
    collections,
    podcasts,
    activeTab,
    setCurrentTrack,
    setIsExpanded
}) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const panel = isDark
        ? "bg-warm-dark-elevated border-white/5"
        : "bg-white border-warm-hairline shadow-sm";
    const rowIdle = isDark
        ? "text-warm-on-dark-soft hover:text-warm-on-dark hover:bg-white/5"
        : "text-warm-muted hover:text-warm-ink hover:bg-warm-surface";
    const rowActive = "text-warm-primary font-semibold";
    const titleText = isDark ? "text-warm-on-dark" : "text-warm-ink";
    const subText = isDark ? "text-warm-on-dark-soft" : "text-warm-muted";

    const navRow = (active) =>
        `flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-4"} w-full px-2 py-2 rounded-lg cursor-pointer transition-colors ${
            active ? rowActive : rowIdle
        }`;

    return (
        <div className={`hidden md:flex flex-col gap-2 shrink-0 transition-all duration-300 overflow-x-hidden ${isSidebarCollapsed ? 'w-[72px]' : 'w-[280px]'}`}>
            <nav className={`${panel} rounded-2xl border p-3 flex flex-col gap-1`}>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={navRow(false)}
                        title={t('podcastPage.backToDashboard')}
                    >
                        <Home size={22} strokeWidth={2.2} />
                        {!isSidebarCollapsed && <span className="font-semibold text-[14px]">{t('podcastPage.backToDashboard')}</span>}
                    </button>
                    {!isSidebarCollapsed && (
                        <button
                            onClick={() => setIsSidebarCollapsed(true)}
                            aria-label="Collapse sidebar"
                            className={`p-1.5 rounded-full shrink-0 transition-colors ${rowIdle}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>
                {/* Avval bu qator shunchaki matn edi — bosilganda hech narsa bo'lmasdi */}
                <button
                    onClick={() => navigate('/podcasts?tab=search')}
                    className={navRow(activeTab === 'search')}
                    title={t('podcastPage.search')}
                >
                    <Search size={22} strokeWidth={2.2} />
                    {!isSidebarCollapsed && <span className="font-semibold text-[14px]">{t('podcastPage.search')}</span>}
                </button>
                <button
                    onClick={() => navigate('/podcasts?tab=library')}
                    className={navRow(activeTab === 'library')}
                    title={t('podcastPage.yourLibrary')}
                >
                    <Library size={22} strokeWidth={2.2} />
                    {!isSidebarCollapsed && <span className="font-semibold text-[14px] truncate">{t('podcastPage.yourLibrary')}</span>}
                </button>
            </nav>

            <div className={`${panel} rounded-2xl border flex-1 flex flex-col overflow-hidden`}>
                <div className="px-3 pt-3">
                    <button
                        onClick={() => navigate('/podcasts?tab=liked')}
                        className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} w-full p-2 rounded-lg cursor-pointer transition-colors ${
                            activeTab === 'liked'
                                ? (isDark ? 'bg-white/10' : 'bg-warm-surface')
                                : (isDark ? 'hover:bg-white/5' : 'hover:bg-warm-surface')
                        }`}
                        title={t('podcastPage.likedPodcasts')}
                    >
                        <div className="w-11 h-11 rounded-lg bg-warm-primary flex-shrink-0 flex items-center justify-center">
                            <Heart size={18} fill="currentColor" className="text-warm-on-primary" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="overflow-hidden text-left">
                                <p className={`font-semibold truncate text-[13px] leading-tight ${titleText}`}>{t('podcastPage.likedPodcasts')}</p>
                                <p className={`text-[11px] truncate mt-0.5 ${subText}`}>{t('podcastPage.episodes')}</p>
                            </div>
                        )}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-2 space-y-1 custom-scrollbar">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <SidebarSkeleton key={i} isDark={isDark} />)
                    ) : (
                        <>
                            {collections.length > 0 && !isSidebarCollapsed && (
                                <p className={`px-2 mb-2 mt-3 text-[10px] font-bold uppercase tracking-widest ${subText}`}>{t('podcastPage.albums')}</p>
                            )}
                            {collections.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => navigate(`/podcast/album/${c.id}`)}
                                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} w-full p-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-warm-surface'}`}
                                    title={c.name}
                                >
                                    <div className={`w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-warm-card'}`}>
                                        {c.thumbnail ? (
                                            <LazyImage src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <ListIcon size={18} className={subText} />
                                        )}
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="overflow-hidden text-left">
                                            <p className={`font-semibold truncate text-[13px] leading-tight ${titleText}`}>{c.name}</p>
                                            <p className={`text-[11px] truncate mt-0.5 ${subText}`}>{t('podcastPage.album')}</p>
                                        </div>
                                    )}
                                </button>
                            ))}

                            {podcasts.length > 0 && (
                                <div className={`my-3 border-t ${isDark ? 'border-white/5' : 'border-warm-hairline'}`} />
                            )}
                            {!isSidebarCollapsed && podcasts.length > 0 && (
                                <p className={`px-2 mb-2 text-[10px] font-bold uppercase tracking-widest ${subText}`}>{t('podcastPage.newEpisodes')}</p>
                            )}
                            {podcasts.slice(0, 8).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
                                        if (isVideoDisplay) {
                                            setCurrentTrack(p);
                                            setIsExpanded(true);
                                        } else {
                                            navigate(`/podcast/spotify/${p.id}`);
                                        }
                                    }}
                                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} w-full p-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-warm-surface'}`}
                                    title={p.title}
                                >
                                    <div className={`w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden ${isDark ? 'bg-white/5' : 'bg-warm-card'}`}>
                                        <LazyImage src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="overflow-hidden text-left">
                                            <p className={`font-semibold truncate text-[13px] leading-tight ${titleText}`}>{p.title}</p>
                                            <p className={`text-[11px] truncate mt-0.5 ${subText}`}>{p.level ? `${p.level} • ` : ''}{t('podcastPage.episode')}</p>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
