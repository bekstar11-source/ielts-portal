import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Wrench } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

// Speaking AI vaqtincha o'chirilganda ko'rsatiladigan ekran. Route saqlanib
// qoladi (eski havolalar 404 bermasin), lekin ichida faqat shu xabar turadi.
const COPY = {
    uz: {
        badge: 'Speaking xonasi',
        title: 'Speaking vaqtincha ishlamayapti',
        lead: "Bo'limni yaxshilash ustida ishlayapmiz. Tez orada yana ochamiz — shu vaqt ichida Reading, Listening va Writing mashqlari odatdagidek ishlaydi.",
        back: 'Bosh sahifaga qaytish',
    },
    en: {
        badge: 'Speaking room',
        title: 'Speaking is temporarily unavailable',
        lead: 'We are improving this section and will bring it back shortly. Reading, Listening and Writing practice work as usual in the meantime.',
        back: 'Back to Dashboard',
    },
};

export default function SpeakingAiUnavailable() {
    const navigate = useNavigate();
    const { lang } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const c = COPY[lang] || COPY.uz;

    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-center px-6 font-sans transition-colors duration-500 ${
                isDark ? 'bg-warm-dark text-warm-on-dark' : 'bg-warm-canvas text-warm-ink'
            }`}
        >
            <div
                className={`w-full max-w-md rounded-2xl border p-8 text-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-warm-hairline'
                }`}
            >
                <div
                    className={`mx-auto mb-5 w-12 h-12 rounded-full flex items-center justify-center ${
                        isDark ? 'bg-white/10' : 'bg-warm-surface'
                    }`}
                >
                    <Wrench size={20} className="text-warm-primary" />
                </div>

                <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-3 ${
                        isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'
                    }`}
                >
                    <Mic size={13} />
                    {c.badge}
                </div>

                <h1 className="text-xl font-semibold mb-2.5">{c.title}</h1>
                <p className={`text-sm leading-relaxed mb-7 ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'}`}>
                    {c.lead}
                </p>

                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-warm-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <ArrowLeft size={16} />
                    {c.back}
                </button>
            </div>
        </div>
    );
}
