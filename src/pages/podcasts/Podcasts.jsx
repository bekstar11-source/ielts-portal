// src/pages/podcasts/Podcasts.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search as SearchIcon, Heart, Play, Disc3, ListMusic } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/LanguageContext";
import { usePodcast } from "../../context/PodcastContext";
import { usePodcastsList, usePodcastCollections } from "../../hooks/usePodcastData";
import { formatTime, getPodcastDuration } from "../../utils/podcastUtils";
import { getAllProgress } from "../../utils/podcastProgress";
import PlayerFooter from "../../components/InteractivePlayer/PlayerFooter";

// Sub-components
import PodcastSidebar from "../../components/podcasts/PodcastSidebar";
import PodcastMainHeader from "../../components/podcasts/PodcastMainHeader";
import AlbumGridItem from "../../components/podcasts/AlbumGridItem";
import EpisodeGridItem from "../../components/podcasts/EpisodeGridItem";
import PodcastBottomNav from "../../components/podcasts/PodcastBottomNav";
import { AlbumSkeleton, EpisodeSkeleton } from "../../components/podcasts/PodcastSkeletons";
import PodcastError from "../../components/podcasts/PodcastError";
import PodcastSplash from "../../components/podcasts/PodcastSplash";
import { AnimatePresence } from "framer-motion";

const VALID_TABS = ["home", "liked", "search", "library"];
const PAGE_SIZE = 12;
const EPISODE_GRID = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5";
const SECTION_TITLE = "text-[19px] md:text-[22px] font-bold tracking-tight";

// Render ichida e'lon qilinsa har bir yangilanishda qayta o'rnatilardi (miltillash).
const EmptyState = ({ icon, title, text, isDark }) => {
    const Icon = icon;
    return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-white/5" : "bg-warm-surface"}`}>
            <Icon size={26} className={isDark ? "text-warm-on-dark-soft" : "text-warm-muted"} />
        </div>
        <h3 className="font-bold text-base mb-1.5">{title}</h3>
        {text && <p className={`text-sm max-w-xs ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted"}`}>{text}</p>}
    </div>
    );
};

export default function Podcasts() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const queryParams = new URLSearchParams(location.search);
    const rawTab = queryParams.get("tab") || "home";
    // Noma'lum `?tab=` qiymati bilan sahifa bo'm-bo'sh qolmasin
    const currentTab = VALID_TABS.includes(rawTab) ? rawTab : "home";

    const [showSplash, setShowSplash] = useState(
        () => !sessionStorage.getItem("podcast_splash_shown") && !!location.state?.fromBottomNav
    );

    // sessionStorage yozuvi render paytida emas, effektda — StrictMode'da useState
    // initializer ikki marta chaqiriladi va splash umuman ko'rinmay qolardi.
    useEffect(() => {
        if (!showSplash) return;
        sessionStorage.setItem("podcast_splash_shown", "true");
        const timer = setTimeout(() => setShowSplash(false), 2400);
        return () => clearTimeout(timer);
    }, [showSplash]);

    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    const {
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying,
        currentTime, duration, handleSeek, playTrack,
        setIsExpanded, isExpanded,
        likedPodcasts, setQueue
    } = usePodcast();

    // Data Hooks
    const { podcasts, loading: podcastsLoading, error: podcastsError, retry: retryPodcasts } = usePodcastsList();
    const { collections, loading: collectionsLoading, error: collectionsError, retry: retryCollections } = usePodcastCollections();

    const loading = podcastsLoading || collectionsLoading;
    const error = podcastsError || collectionsError;
    const handleRetry = () => {
        retryPodcasts();
        retryCollections();
    };

    // Local State
    const [searchTerm, setSearchTerm] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeLevel, setActiveLevel] = useState("all");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [libraryFilter, setLibraryFilter] = useState("all"); // all | albums | episodes

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const levels = useMemo(() => {
        const set = new Set(podcasts.map(p => p.level).filter(Boolean));
        return ["all", ...Array.from(set).sort()];
    }, [podcasts]);

    // Daraja filtri faqat asosiy ro'yxatga tegishli — qidiruv natijalari
    // jimgina kesilib qolmasligi uchun qidiruvda level hisobga olinmaydi.
    const matchesSearch = useCallback((p) => {
        if (!normalizedSearch) return true;
        return (
            p.title?.toLowerCase().includes(normalizedSearch) ||
            p.description?.toLowerCase().includes(normalizedSearch) ||
            p.level?.toLowerCase().includes(normalizedSearch)
        );
    }, [normalizedSearch]);

    const filteredPodcasts = useMemo(() => podcasts.filter(p => {
        if (activeLevel !== "all" && p.level !== activeLevel) return false;
        return matchesSearch(p);
    }), [podcasts, activeLevel, matchesSearch]);

    const searchResults = useMemo(
        () => (normalizedSearch ? podcasts.filter(matchesSearch) : []),
        [podcasts, normalizedSearch, matchesSearch]
    );

    // Filtr o'zgarganda "yana ko'rsatish" hisobi boshidan boshlanadi — aks holda
    // avvalgi filtrdan qolgan katta son yangi ro'yxatga ham qo'llanardi.
    // (Effekt emas, render paytida tuzatish — React'ning "prop o'zgarganda
    // state'ni tiklash" naqshi: qo'shimcha render sikli bo'lmaydi.)
    const filterKey = `${activeLevel}|${normalizedSearch}`;
    const [lastFilterKey, setLastFilterKey] = useState(filterKey);
    if (lastFilterKey !== filterKey) {
        setLastFilterKey(filterKey);
        setVisibleCount(PAGE_SIZE);
    }

    // Header'dagi qidiruv maydoni har bir bo'limda ishlaydi — avval u faqat bosh
    // ro'yxatga ta'sir qilardi, "Yoqtirganlar"da esa yozgan matn hech nima qilmasdi.
    const likedEpisodes = useMemo(
        () => podcasts.filter(p => likedPodcasts.includes(p.id) && matchesSearch(p)),
        [podcasts, likedPodcasts, matchesSearch]
    );

    const libraryEpisodes = useMemo(() => podcasts.filter(matchesSearch), [podcasts, matchesSearch]);
    const libraryCollections = useMemo(() => {
        if (!normalizedSearch) return collections;
        return collections.filter(c =>
            c.name?.toLowerCase().includes(normalizedSearch) ||
            c.description?.toLowerCase().includes(normalizedSearch)
        );
    }, [collections, normalizedSearch]);

    // Boshlangan, lekin tugallanmagan epizodlar — "davom ettirish" uchun.
    // `isExpanded` bog'liqlik sifatida: pleyer yopilgach ro'yxat yangilanadi.
    const inProgressEpisodes = useMemo(() => {
        if (podcasts.length === 0) return [];
        const progress = getAllProgress();
        return podcasts
            .filter(p => {
                const entry = progress[p.id];
                return entry && !entry.completed && entry.time > 15;
            })
            .sort((a, b) => (progress[b.id].updatedAt || 0) - (progress[a.id].updatedAt || 0))
            .slice(0, 6)
            .map(p => ({ ...p, _progress: progress[p.id] }));
        // `isExpanded` ataylab: progress localStorage'dan pleyer yopilganda qayta o'qiladi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [podcasts, isExpanded]);

    // Navbat — shu tufayli pleyerdagi "keyingi/oldingi", shuffle va repeat ishlaydi
    useEffect(() => {
        setQueue(filteredPodcasts);
    }, [filteredPodcasts, setQueue]);

    const episodeGridProps = {
        isDark,
        currentTrack,
        isPlaying,
        setCurrentTrack,
        setIsPlaying,
        setIsExpanded,
        playTrack,
    };

    const surface = isDark
        ? "bg-warm-dark-elevated border-white/5"
        : "bg-white border-warm-hairline";
    const mutedText = isDark ? "text-warm-on-dark-soft" : "text-warm-muted";
    const chipBase = isDark
        ? "bg-white/5 text-warm-on-dark hover:bg-white/10"
        : "bg-warm-surface text-warm-body hover:bg-warm-card";

    const sectionTitle = SECTION_TITLE;
    const episodeGrid = EPISODE_GRID;

    return (
        <>
            <AnimatePresence>
                {showSplash && <PodcastSplash />}
            </AnimatePresence>

            <div className={`h-[100dvh] w-full flex flex-col font-sans overflow-hidden transition-colors duration-300 ${
                isDark ? "bg-warm-dark text-warm-on-dark" : "bg-warm-canvas text-warm-ink"
            } ${showSplash ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <div className="flex-1 flex overflow-hidden p-0 md:p-2 md:gap-2">
                    {/* Left Sidebar (desktop) */}
                    <PodcastSidebar
                        isDark={isDark}
                        isSidebarCollapsed={isSidebarCollapsed}
                        setIsSidebarCollapsed={setIsSidebarCollapsed}
                        loading={loading}
                        collections={collections}
                        podcasts={podcasts}
                        activeTab={currentTab}
                        setCurrentTrack={setCurrentTrack}
                        setIsExpanded={setIsExpanded}
                    />

                    {/* Main Content */}
                    <div className={`flex-1 md:rounded-2xl overflow-y-auto flex flex-col relative custom-scrollbar md:border transition-colors duration-300 ${surface}`}>
                        {/* Header endi mobilda ham ko'rinadi — avval mobil foydalanuvchida
                            sarlavha ham, orqaga qaytish yo'li ham yo'q edi. */}
                        <PodcastMainHeader
                            isDark={isDark}
                            isSidebarCollapsed={isSidebarCollapsed}
                            setIsSidebarCollapsed={setIsSidebarCollapsed}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            toggleTheme={toggleTheme}
                        />

                        <div className="px-4 md:px-8 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] pt-5 md:pt-6">
                            {error ? (
                                <div className="mt-6">
                                    <PodcastError isDark={isDark} onRetry={handleRetry} />
                                </div>
                            ) : currentTab === "library" ? (
                                /* ---------------------------------------------- Library */
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight mb-5">{t("podcastPage.yourLibrary")}</h1>

                                    <div className="flex gap-2 mb-6">
                                        {[
                                            { id: "all", label: t("podcastPage.showAll") },
                                            { id: "albums", label: t("podcastPage.albums") },
                                            { id: "episodes", label: t("podcastPage.episodes") },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setLibraryFilter(f.id)}
                                                aria-pressed={libraryFilter === f.id}
                                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                                    libraryFilter === f.id
                                                        ? "bg-warm-primary text-warm-on-primary"
                                                        : chipBase
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {loading ? (
                                        <div className={episodeGrid}>
                                            {Array(6).fill(0).map((_, i) => <AlbumSkeleton key={i} isDark={isDark} />)}
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {libraryFilter !== "episodes" && libraryCollections.length > 0 && (
                                                <section>
                                                    <h2 className={`${sectionTitle} mb-4`}>{t("podcastPage.albums")}</h2>
                                                    <div className={episodeGrid}>
                                                        {libraryCollections.map(c => (
                                                            <AlbumGridItem
                                                                key={c.id}
                                                                col={c}
                                                                isDark={isDark}
                                                                episodeCount={podcasts.filter(p => p.collectionId === c.id).length}
                                                            />
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {libraryFilter !== "albums" && libraryEpisodes.length > 0 && (
                                                <section>
                                                    <h2 className={`${sectionTitle} mb-4`}>{t("podcastPage.episodes")}</h2>
                                                    <div className={episodeGrid}>
                                                        {libraryEpisodes.slice(0, 12).map(p => (
                                                            <EpisodeGridItem key={p.id} p={p} {...episodeGridProps} />
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {(libraryFilter === "albums" ? libraryCollections.length === 0
                                                : libraryFilter === "episodes" ? libraryEpisodes.length === 0
                                                : libraryCollections.length === 0 && libraryEpisodes.length === 0) && (
                                                <EmptyState isDark={isDark} icon={ListMusic} title={t("podcastPage.emptyLibrary")} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : currentTab === "liked" ? (
                                /* ------------------------------------------------ Liked */
                                <div>
                                    <div className="flex items-center gap-4 mb-7">
                                        <div className="w-16 h-16 rounded-2xl bg-warm-primary flex items-center justify-center shadow-md shrink-0">
                                            <Heart fill="currentColor" className="text-warm-on-primary" size={28} />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold tracking-tight">{t("podcastPage.likedPodcasts")}</h1>
                                            <p className={`text-xs font-medium mt-0.5 ${mutedText}`}>
                                                {t("podcastPage.episodesCount", { count: likedEpisodes.length })}
                                            </p>
                                        </div>
                                    </div>

                                    {likedEpisodes.length > 0 ? (
                                        <div className={episodeGrid}>
                                            {likedEpisodes.map(p => (
                                                <EpisodeGridItem key={p.id} p={p} {...episodeGridProps} />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            isDark={isDark}
                                            icon={Heart}
                                            title={t("podcastPage.noLikedTitle")}
                                            text={t("podcastPage.noLikedText")}
                                        />
                                    )}
                                </div>
                            ) : currentTab === "search" ? (
                                /* ----------------------------------------------- Search */
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight mb-5">{t("podcastPage.search")}</h1>
                                    <div className="relative mb-8 max-w-2xl">
                                        <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedText}`} size={18} />
                                        <input
                                            autoFocus
                                            type="search"
                                            aria-label={t("podcastPage.search")}
                                            placeholder={t("podcastPage.searchLong")}
                                            className={`w-full py-3 pl-11 pr-4 rounded-xl text-sm font-medium outline-none border transition-colors ${
                                                isDark
                                                    ? "bg-white/5 border-white/10 text-warm-on-dark placeholder:text-warm-on-dark-soft focus:border-warm-primary"
                                                    : "bg-warm-surface border-warm-hairline text-warm-ink placeholder:text-warm-muted focus:border-warm-primary"
                                            }`}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {normalizedSearch ? (
                                        <div>
                                            <h2 className={`${sectionTitle} mb-4`}>
                                                {t("podcastPage.results", { count: searchResults.length })}
                                            </h2>
                                            {searchResults.length > 0 ? (
                                                <div className={episodeGrid}>
                                                    {searchResults.slice(0, 24).map(p => (
                                                        <EpisodeGridItem key={p.id} p={p} {...episodeGridProps} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className={`text-sm ${mutedText}`}>
                                                    {t("podcastPage.noResultsFor", { query: searchTerm.trim() })}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        /* Avval bu yerda ishlamaydigan, o'ylab topilgan kategoriyalar
                                           ("Live Events", "Made For You") turardi. Endi haqiqiy albomlar. */
                                        <div>
                                            <h2 className={`${sectionTitle} mb-4`}>{t("podcastPage.browseAll")}</h2>
                                            {collections.length > 0 ? (
                                                <div className={episodeGrid}>
                                                    {collections.map(c => (
                                                        <AlbumGridItem
                                                            key={c.id}
                                                            col={c}
                                                            isDark={isDark}
                                                            episodeCount={podcasts.filter(p => p.collectionId === c.id).length}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState isDark={isDark} icon={Disc3} title={t("podcastPage.noAlbums")} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* ------------------------------------------------- Home */
                                <>
                                    {/* Level Filter Pills — faqat bosh ko'rinishda ma'noga ega */}
                                    {levels.length > 1 && (
                                        <div className="flex items-center gap-2 mb-7 overflow-x-auto pb-2 no-scrollbar">
                                            {levels.map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setActiveLevel(level)}
                                                    aria-pressed={activeLevel === level}
                                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                                        activeLevel === level
                                                            ? "bg-warm-primary text-warm-on-primary"
                                                            : chipBase
                                                    }`}
                                                >
                                                    {level === "all" ? t("podcastPage.allLevels") : level}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Davom ettirish — tugallanmagan epizodlar */}
                                    {inProgressEpisodes.length > 0 && (
                                        <section className="mb-10">
                                            <h2 className={`${sectionTitle} mb-4`}>{t("podcastPage.continueListening")}</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                                {inProgressEpisodes.map((p) => {
                                                    const total = p._progress.duration || getPodcastDuration(p);
                                                    const pctDone = total > 0 ? Math.min(100, (p._progress.time / total) * 100) : 0;
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => { playTrack(p); setIsExpanded(true); }}
                                                            className={`text-left flex items-center gap-3 p-2 pr-4 rounded-xl border transition-colors active:scale-[0.99] ${
                                                                isDark
                                                                    ? "bg-white/5 border-white/5 hover:bg-white/10"
                                                                    : "bg-warm-surface border-warm-hairline hover:bg-warm-card"
                                                            }`}
                                                        >
                                                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-warm-card-strong dark:bg-white/10 relative">
                                                                {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />}
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                    <Play size={16} fill="white" className="text-white" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] font-semibold truncate">{p.title}</p>
                                                                <p className={`text-[11px] font-medium mb-1.5 tabular-nums ${mutedText}`}>
                                                                    {total > 0
                                                                        ? t("podcastPage.timeLeft", { time: formatTime(Math.max(0, total - p._progress.time)) })
                                                                        : t("podcastPage.resume")}
                                                                </p>
                                                                <div className={`h-1 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-warm-card-strong"}`}>
                                                                    <div className="h-full bg-warm-primary rounded-full" style={{ width: `${pctDone}%` }} />
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {/* Collections / Albums Section */}
                                    <section className="mb-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className={sectionTitle}>{t("podcastPage.officialAlbums")}</h2>
                                            {collections.length > 0 && (
                                                <button
                                                    onClick={() => navigate("/podcasts?tab=library")}
                                                    className={`text-xs font-semibold hover:underline ${mutedText}`}
                                                >
                                                    {t("podcastPage.showAll")}
                                                </button>
                                            )}
                                        </div>

                                        {loading ? (
                                            <div className={episodeGrid}>
                                                {Array(6).fill(0).map((_, i) => <AlbumSkeleton key={i} isDark={isDark} />)}
                                            </div>
                                        ) : collections.length === 0 ? (
                                            <EmptyState isDark={isDark} icon={Disc3} title={t("podcastPage.noAlbums")} />
                                        ) : (
                                            <div className={episodeGrid}>
                                                {collections.map((col) => (
                                                    <AlbumGridItem
                                                        key={col.id}
                                                        col={col}
                                                        isDark={isDark}
                                                        episodeCount={podcasts.filter(p => p.collectionId === col.id).length}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    {/* Episodes Section */}
                                    <section className="mb-10">
                                        <h2 className={`${sectionTitle} mb-4`}>{t("podcastPage.newEpisodes")}</h2>

                                        {loading ? (
                                            <div className={episodeGrid}>
                                                {Array(5).fill(0).map((_, i) => <EpisodeSkeleton key={i} isDark={isDark} />)}
                                            </div>
                                        ) : filteredPodcasts.length === 0 ? (
                                            <div className="text-center py-12">
                                                <p className={`font-semibold mb-3 text-sm ${mutedText}`}>
                                                    {normalizedSearch || activeLevel !== "all"
                                                        ? t("podcastPage.noMatch")
                                                        : t("podcastPage.noEpisodes")}
                                                </p>
                                                {(normalizedSearch || activeLevel !== "all") && (
                                                    <button
                                                        onClick={() => { setSearchTerm(""); setActiveLevel("all"); }}
                                                        className="px-5 py-2 rounded-full bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary text-xs font-semibold transition-colors"
                                                    >
                                                        {t("podcastPage.clearFilters")}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={episodeGrid}>
                                                {filteredPodcasts.slice(0, visibleCount).map((p) => (
                                                    <EpisodeGridItem key={p.id} p={p} {...episodeGridProps} />
                                                ))}
                                            </div>
                                        )}

                                        {!loading && filteredPodcasts.length > visibleCount && (
                                            <div className="flex justify-center mt-8">
                                                <button
                                                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                                    className={`px-6 py-2 rounded-full text-sm font-semibold border transition-colors ${
                                                        isDark
                                                            ? "border-white/15 text-warm-on-dark hover:border-white/40"
                                                            : "border-warm-hairline text-warm-body hover:border-warm-muted"
                                                    }`}
                                                >
                                                    {t("podcastPage.showMore", { count: filteredPodcasts.length - visibleCount })}
                                                </button>
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Global Footer Player (Unified) */}
                {currentTrack && (
                    <PlayerFooter
                        isDark={isDark}
                        podcast={currentTrack}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        handleMediaSkip={handleMediaSkip}
                        handleMediaSeek={handleSeek}
                        formatTime={formatTime}
                        onExpand={() => setIsExpanded(true)}
                        isFixed={true}
                        hasBottomNav={true}
                    />
                )}

                <style dangerouslySetInnerHTML={{__html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 20, 19, 0.12)'}; border-radius: 9999px; }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}} />

                {!isExpanded && <PodcastBottomNav isDark={isDark} />}
            </div>
        </>
    );
}
