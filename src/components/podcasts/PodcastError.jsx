import React from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";

export default function PodcastError({ message, onRetry, isDark }) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className={`flex flex-col items-center justify-center p-8 md:p-10 text-center min-h-[360px] rounded-2xl border transition-colors ${
            isDark
                ? 'bg-white/[0.04] border-white/5 text-warm-on-dark'
                : 'bg-white border-warm-hairline text-warm-ink shadow-sm'
        }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${isDark ? 'bg-warm-error/15 text-warm-error' : 'bg-warm-error/10 text-warm-error'}`}>
                <AlertCircle size={26} />
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-2">{t('common.error')}</h2>
            <p className={`max-w-md mb-7 text-sm leading-relaxed ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>
                {message || "We couldn't load the podcasts. Please check your internet connection and try again."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary text-sm font-semibold rounded-full transition-colors active:scale-95"
                    >
                        <RefreshCcw size={16} />
                        {t('common.retry', 'Try again')}
                    </button>
                )}
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors active:scale-95 border ${
                        isDark
                            ? 'border-white/15 text-warm-on-dark hover:bg-white/5'
                            : 'border-warm-hairline text-warm-ink hover:bg-warm-surface'
                    }`}
                >
                    <Home size={16} />
                    {t('podcastPage.backToDashboard')}
                </button>
            </div>
        </div>
    );
}
