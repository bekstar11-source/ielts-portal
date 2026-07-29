import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, PenTool, ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const packIconWrap = 'w-11 h-11 rounded-xl flex items-center justify-center bg-warm-surface dark:bg-white/5 shrink-0';

const TestPackCard = ({ icon: Icon, iconColor, title, desc, duration, onView, t }) => (
    <div className="border border-warm-hairline dark:border-white/10 rounded-2xl p-5 flex flex-col gap-4 bg-warm-canvas dark:bg-warm-dark-elevated">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-warm-ink dark:text-warm-on-dark">{title}</h3>
            <div className={packIconWrap}>
                <Icon size={19} style={{ color: iconColor }} />
            </div>
        </div>
        <p className="text-sm text-warm-muted dark:text-warm-on-dark-soft flex-grow">{desc}</p>
        <div className="flex items-center justify-between gap-3">
            <span className="bg-warm-surface dark:bg-white/5 text-warm-muted dark:text-warm-on-dark-soft text-xs font-bold px-2.5 py-1 rounded-full">
                {duration}
            </span>
            <button
                onClick={onView}
                className="flex items-center gap-1 text-sm font-bold text-warm-ink dark:text-warm-on-dark border border-warm-hairline dark:border-white/10 rounded-full px-4 py-1.5 hover:border-warm-primary dark:hover:border-warm-primary transition-colors"
            >
                {t('dashboard.viewTests')}
                <ArrowRight size={13} strokeWidth={2.5} />
            </button>
        </div>
    </div>
);

export default function CatalogDashboard({ onPremiumClick }) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const testPacks = [
        { key: 'listening', icon: Headphones, color: '#f2a918', title: t('dashboard.listening'), desc: t('dashboard.listeningPackDesc'), duration: '30 min', path: '/listening/full' },
        { key: 'reading', icon: BookOpen, color: '#31a24c', title: t('dashboard.reading'), desc: t('dashboard.readingPackDesc'), duration: '60 min', path: '/reading/full' },
        { key: 'writing', icon: PenTool, color: '#0071e3', title: t('dashboard.writing'), desc: t('dashboard.writingPackDesc'), duration: '60 min', path: '/practice?tab=writing&type=full' },
    ];

    const partPacks = [
        { key: 'listening_parts', icon: Headphones, color: '#f2a918', title: t('dashboard.listeningPartTitle'), desc: t('dashboard.listeningPartDesc'), duration: '8 min', path: '/listening/parts' },
        { key: 'reading_parts', icon: BookOpen, color: '#31a24c', title: t('dashboard.readingPartTitle'), desc: t('dashboard.readingPartDesc'), duration: '20-30 min', path: '/reading/parts' },
        { key: 'writing_parts', icon: PenTool, color: '#0071e3', title: t('dashboard.writingPartTitle'), desc: t('dashboard.writingPartDesc'), duration: '20-40 min', path: '/practice?tab=writing&type=part' },
    ];

    return (
        <div className="w-full max-w-[1100px] mx-auto px-4 md:px-6 pt-4 pb-16">
            {/* Promo banner */}
            <div className="bg-warm-ink rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-14">
                <div className="flex flex-col gap-4 max-w-lg">
                    <span className="inline-flex items-center gap-1.5 bg-warm-primary text-white font-bold text-xs px-2.5 py-1 rounded-full w-fit">
                        {t('dashboard.catalogPromoTag')}
                    </span>
                    <h2 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-normal text-white leading-tight">
                        {t('dashboard.catalogPromoTitle')}
                    </h2>
                </div>
                <button
                    onClick={onPremiumClick}
                    className="bg-warm-primary hover:bg-warm-primary-active text-white font-bold text-sm rounded-full px-7 py-3.5 shrink-0 transition-colors"
                >
                    {t('dashboard.catalogUnlock')}
                </button>
            </div>

            {/* Mock Exams */}
            <h2 className="text-warm-title-lg text-warm-ink dark:text-warm-on-dark mb-5">{t('dashboard.mockExamsHeading')}</h2>
            <div className="border border-warm-hairline dark:border-white/10 rounded-2xl p-6 md:p-8 mb-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-full bg-warm-surface dark:bg-white/5 flex items-center justify-center shrink-0 text-emerald-500">
                        <Clock size={22} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-medium text-warm-ink dark:text-warm-on-dark">{t('dashboard.mockExamCardTitle')}</h3>
                        <p className="text-sm text-warm-muted dark:text-warm-on-dark-soft leading-relaxed max-w-xl">
                            {t('dashboard.mockExamCardDesc')}
                        </p>
                        <div className="flex gap-2 flex-wrap mt-1">
                            {['2.5 hours', t('dashboard.listening'), t('dashboard.reading'), t('dashboard.writing')].map(tag => (
                                <span key={tag} className="bg-warm-surface dark:bg-white/5 border border-warm-hairline dark:border-white/10 text-warm-body dark:text-warm-on-dark-soft text-xs font-bold px-3 py-1.5 rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/mock')}
                    className="flex items-center gap-1.5 bg-warm-ink dark:bg-warm-on-dark text-white dark:text-warm-ink font-bold text-sm rounded-full px-7 py-3.5 shrink-0 hover:bg-warm-body-strong dark:hover:bg-white transition-colors"
                >
                    {t('dashboard.startMockExam')}
                    <ArrowRight size={15} strokeWidth={2.5} />
                </button>
            </div>

            {/* Test Packs */}
            <h2 className="text-warm-title-lg text-warm-ink dark:text-warm-on-dark mb-5">{t('dashboard.testPacksHeading')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
                {testPacks.map(p => (
                    <TestPackCard
                        key={p.key}
                        icon={p.icon}
                        iconColor={p.color}
                        title={p.title}
                        desc={p.desc}
                        duration={p.duration}
                        onView={() => navigate(p.path)}
                        t={t}
                    />
                ))}
            </div>

            {/* Part Practice */}
            <h2 className="text-warm-title-lg text-warm-ink dark:text-warm-on-dark mb-5">{t('dashboard.partPracticeHeading')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {partPacks.map(p => (
                    <TestPackCard
                        key={p.key}
                        icon={p.icon}
                        iconColor={p.color}
                        title={p.title}
                        desc={p.desc}
                        duration={p.duration}
                        onView={() => navigate(p.path)}
                        t={t}
                    />
                ))}
            </div>
        </div>
    );
}
