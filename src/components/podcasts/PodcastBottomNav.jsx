import React from "react";
import { Home, Search, Library, Heart, Headphones } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LanguageContext";
import { useSpotlightNotice } from "../../hooks/useSpotlightNotice";

export default function PodcastBottomNav({ isDark }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { hasNew, latest } = useSpotlightNotice(user);

    const tabs = [
        { id: 'home', label: t('podcastPage.title'), icon: Headphones, path: '/podcasts' },
        { id: 'liked', label: t('podcastPage.likedPodcasts'), icon: Heart, path: '/podcasts?tab=liked' },
        { id: 'search', label: t('podcastPage.search'), icon: Search, path: '/podcasts?tab=search' },
        { id: 'library', label: t('podcastPage.yourLibrary'), icon: Library, path: '/podcasts?tab=library' },
        { id: 'dashboard', label: t('podcastPage.backToDashboard'), icon: Home, path: '/dashboard' },
    ];

    // Avval butun `pathname + search` satri solishtirilardi: qo'shimcha query
    // parametr qo'shilishi bilan (yoki albom sahifasida) hech bir tab yonmasdi.
    const isPodcastList = location.pathname === '/podcasts';
    const activeTabId = isPodcastList
        ? (new URLSearchParams(location.search).get('tab') || 'home')
        : (location.pathname.startsWith('/podcast') ? 'home' : null);

    return (
        <nav
            aria-label={t('podcastPage.title')}
            className={`md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 h-[calc(56px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] flex items-center backdrop-blur-xl border-t transition-colors duration-300 ${
                isDark
                    ? 'bg-warm-dark/90 border-white/5 text-warm-on-dark-soft'
                    : 'bg-warm-canvas/95 border-warm-hairline text-warm-muted shadow-[0_-4px_16px_rgba(0,0,0,0.04)]'
            }`}
        >
            <div className="flex items-center justify-around w-full max-w-md mx-auto">
                {tabs.map((tab) => {
                    const active = activeTabId === tab.id;
                    return (
                        <button
                            key={tab.id}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => navigate(
                                tab.id === 'dashboard' && hasNew && latest
                                    ? `/dashboard?spotlight=${latest.id}`
                                    : tab.path
                            )}
                            className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-all active:scale-95 min-w-0 ${
                                active
                                    ? 'text-warm-primary font-bold'
                                    : (isDark ? 'hover:text-warm-on-dark' : 'hover:text-warm-ink')
                            }`}
                        >
                            <span className="relative">
                                <tab.icon size={19} className={active ? 'scale-110 transition-transform' : 'transition-transform'} />
                                {tab.id === 'dashboard' && hasNew && (
                                    <span className={`absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-warm-primary ring-2 ${isDark ? 'ring-warm-dark' : 'ring-warm-canvas'}`} />
                                )}
                            </span>
                            <span className="text-[9px] tracking-tight font-medium truncate max-w-[64px]">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
