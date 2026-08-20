import React from "react";
import { Search, ChevronLeft, ChevronRight, ArrowLeft, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import Logo from "../common/Logo";

export default function PodcastMainHeader({
    isDark,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    searchTerm,
    setSearchTerm,
    toggleTheme
}) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const iconButton = `w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
        isDark
            ? "bg-white/5 text-warm-on-dark-soft hover:text-warm-on-dark hover:bg-white/10"
            : "bg-warm-surface text-warm-muted hover:text-warm-ink hover:bg-warm-card"
    }`;

    return (
        <div
            className={`sticky top-0 z-30 px-4 md:px-6 flex items-center gap-3 min-h-16 border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] ${
                isDark
                    ? "bg-warm-dark-elevated/85 border-white/5"
                    : "bg-white/85 border-warm-hairline"
            }`}
        >
            <div className="flex items-center gap-3 shrink-0">
                {/* Desktop: sidebar toggle */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={`hidden md:flex ${iconButton}`}
                >
                    {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
                {/* Mobile: dashboardga qaytish — avval mobil sarlavha umuman yo'q edi */}
                <button
                    onClick={() => navigate("/dashboard")}
                    aria-label={t("podcastPage.backToDashboard")}
                    className={`md:hidden ${iconButton}`}
                >
                    <ArrowLeft size={18} />
                </button>
            </div>

            <div className="flex-1 min-w-0 flex md:justify-center">
                <Logo size="md" tone={isDark ? "light" : "ink"} suffix={t("podcastPage.title")} />
            </div>

            <div className="flex justify-end items-center gap-2 shrink-0">
                <div className="w-[220px] relative hidden md:block">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted"}`}>
                        <Search size={14} />
                    </div>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label={t("podcastPage.search")}
                        placeholder={t("podcastPage.searchPlaceholder")}
                        className={`w-full rounded-full py-2 pl-9 pr-4 outline-none border transition-colors text-[13px] ${
                            isDark
                                ? "bg-white/5 text-warm-on-dark border-white/10 focus:border-warm-primary placeholder:text-warm-on-dark-soft"
                                : "bg-warm-surface text-warm-ink border-warm-hairline focus:border-warm-primary placeholder:text-warm-muted"
                        }`}
                    />
                </div>
                {/* Ikonka almashtiriladigan rejimni bildiradi (qorong'ida quyosh) —
                    avval mobil va desktop tugmalari bir-biriga teskari edi. */}
                <button
                    onClick={toggleTheme}
                    aria-label={isDark ? t("podcastPage.lightMode") : t("podcastPage.darkMode")}
                    className={iconButton}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </div>
    );
}
