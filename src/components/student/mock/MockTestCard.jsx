/**
 * Bitta mock imtihon kartasi — ikkita ko'rinishda:
 *   `upcoming` — boshlash va sana belgilash,
 *   `past`     — natija (band'lar) va to'liq hisobotga o'tish.
 *
 * Ikkalasi ham bir xil sirt va hairline chegara ustida quriladi; rang faqat
 * bitta — `warm-primary`. Ilgari karta faqat oq fonda ishlardi va tungi
 * rejimda matn ko'rinmay qolardi.
 */

import React from 'react';
import toast from 'react-hot-toast';
import {
    CalendarBlank, Monitor, MapPin, CaretRight, Clock, Copy,
    IdentificationCard, Buildings, User, CheckCircle,
} from '@phosphor-icons/react';
import {
    CARD_CLS, MUTED_CLS, buildTrfNumber, formatBand, formatDate,
    mockSortDate, scheduleLabel, toDate,
} from './mockHelpers';

const SKILLS = [
    { key: 'listeningBand', labelKey: 'myResults.categories.listening' },
    { key: 'readingBand', labelKey: 'myResults.categories.reading' },
    { key: 'writingBand', labelKey: 'myResults.categories.writing' },
    { key: 'speakingBand', labelKey: 'myResults.categories.speaking' },
];

const TONE_CLS = {
    accent: 'text-warm-primary',
    warning: 'text-warm-warning',
    muted: 'text-warm-muted dark:text-warm-on-dark-soft',
};

/** Kichik "label / value" ustuni — meta ma'lumot uchun. */
function Meta({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5 min-w-0">
            <Icon size={16} className="mt-0.5 shrink-0 text-warm-muted dark:text-warm-on-dark-soft" />
            <div className="min-w-0">
                <p className={`text-[12px] ${MUTED_CLS}`}>{label}</p>
                <p className="text-[13px] font-medium truncate">{value}</p>
            </div>
        </div>
    );
}

export default function MockTestCard({ test, tab, t, lang, userData, onStart, onSchedule, onReview }) {
    if (tab === 'past') {
        const isGraded = test.resultStatus === 'graded';
        const scores = test.scores || {};
        const trfNumber = buildTrfNumber(test, userData?.fullName);
        const takenAt = formatDate(mockSortDate(test), lang);

        const copyTrf = async () => {
            try {
                await navigator.clipboard.writeText(trfNumber);
                toast.success(t('mock.copied'));
            } catch {
                // Clipboard API HTTPS'siz muhitda yoki ruxsatsiz ishlamaydi —
                // jimgina yutib yubormay, foydalanuvchiga aytamiz.
                toast.error(t('mock.copyFailed'));
            }
        };

        return (
            <article className={`${CARD_CLS} overflow-hidden`}>
                <header className="px-5 py-4 border-b border-warm-hairline dark:border-white/10 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h3 className="text-warm-title-sm font-medium truncate">
                            {test.title || 'IELTS on Computer Academic'}
                        </h3>
                        <p className={`text-[12px] mt-0.5 ${MUTED_CLS}`}>{t('mock.completedOn')}: {takenAt}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium ${isGraded ? 'text-warm-success' : 'text-warm-warning'}`}>
                        {isGraded ? <CheckCircle size={14} weight="fill" /> : <Clock size={14} />}
                        {isGraded ? t('mock.resultReady') : t('mock.resultPending')}
                    </span>
                </header>

                <div className="px-5 py-4 border-b border-warm-hairline dark:border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Meta icon={User} label={t('mock.testTakerName')} value={userData?.fullName || t('mock.candidate')} />
                    <Meta icon={Buildings} label={t('mock.centreName')} value="Englev" />
                    <Meta icon={CalendarBlank} label={t('mock.testDate')} value={takenAt} />
                    <div className="flex items-start gap-2.5 min-w-0">
                        <IdentificationCard size={16} className="mt-0.5 shrink-0 text-warm-muted dark:text-warm-on-dark-soft" />
                        <div className="min-w-0">
                            <p className={`text-[12px] ${MUTED_CLS}`}>{t('mock.trfNumber')}</p>
                            <button
                                type="button"
                                onClick={copyTrf}
                                className="text-[13px] font-medium truncate flex items-center gap-1.5 hover:text-warm-primary transition-colors"
                            >
                                <span className="truncate">{trfNumber}</span>
                                <Copy size={13} className="shrink-0" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {!isGraded ? (
                        <div className="rounded-xl border border-warm-hairline dark:border-white/10 px-5 py-8 text-center">
                            <Clock size={22} className="mx-auto text-warm-warning" />
                            <p className="mt-3 text-[15px] font-medium">{t('mock.processingResults')}</p>
                            <p className={`mt-1 text-[13px] max-w-md mx-auto ${MUTED_CLS}`}>{t('mock.processingDesc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={onReview}
                                className="w-full rounded-xl border border-warm-hairline dark:border-white/10 px-5 py-4 flex items-center justify-between text-left transition-colors hover:bg-warm-surface/60 dark:hover:bg-white/5"
                            >
                                <div>
                                    <p className={`text-[12px] ${MUTED_CLS}`}>{t('mock.overall')}</p>
                                    <p className="text-[32px] leading-none font-semibold tabular-nums mt-1 text-warm-primary">
                                        {formatBand(test.bandScore)}
                                    </p>
                                </div>
                                <CaretRight size={18} className={MUTED_CLS} />
                            </button>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {SKILLS.map((skill) => {
                                    const base = skill.key.replace('Band', '');
                                    const value = scores[skill.key] ?? scores[base] ?? test[skill.key] ?? test[base];
                                    return (
                                        <button
                                            key={skill.key}
                                            type="button"
                                            onClick={onReview}
                                            className="rounded-xl border border-warm-hairline dark:border-white/10 px-4 py-3 text-left transition-colors hover:bg-warm-surface/60 dark:hover:bg-white/5"
                                        >
                                            <p className={`text-[12px] ${MUTED_CLS}`}>{t(skill.labelKey)}</p>
                                            <p className="text-[22px] leading-tight font-semibold tabular-nums mt-0.5">
                                                {formatBand(value)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="px-5 py-3 border-t border-warm-hairline dark:border-white/10 flex items-center justify-between gap-4">
                    <div className={`flex items-center gap-4 text-[12px] ${MUTED_CLS}`}>
                        <span className="flex items-center gap-1.5"><Monitor size={14} />{t('mock.computer')}</span>
                        <span className="hidden sm:flex items-center gap-1.5"><MapPin size={14} />{t('mock.officialCenter')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onReview}
                        className="text-[13px] font-medium text-warm-primary hover:underline flex items-center gap-1"
                    >
                        {t('mock.viewFullReport')}
                        <CaretRight size={14} />
                    </button>
                </footer>
            </article>
        );
    }

    const scheduled = toDate(test.scheduledDate);
    const badge = scheduleLabel(scheduled, t, lang);

    return (
        <article className={`${CARD_CLS} p-5`}>
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-warm-title-sm font-medium">
                            {test.title || 'IELTS CD Academic Full Mock'}
                        </h3>
                        <span className="text-[12px] font-medium px-2 py-0.5 rounded-full border border-warm-hairline dark:border-white/10 text-warm-primary">
                            {t('mock.unlocked')}
                        </span>
                        <span className={`text-[12px] font-medium ${TONE_CLS[badge.tone]}`}>{badge.text}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Meta
                            icon={CalendarBlank}
                            label={t('mock.scheduledDate')}
                            value={scheduled ? formatDate(scheduled, lang, { day: 'numeric', month: 'short', year: 'numeric' }) : t('mock.flexible')}
                        />
                        <Meta icon={Monitor} label={t('mock.testFormat')} value={t('mock.officialComputer')} />
                        <Meta icon={MapPin} label={t('mock.location')} value={t('mock.onlineExamCenter')} />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onStart}
                        className="rounded-xl px-6 py-3 text-[14px] font-medium bg-warm-primary text-warm-on-primary transition-colors hover:bg-warm-primary-active flex items-center justify-center gap-1.5"
                    >
                        {t('mock.startExam')}
                        <CaretRight size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={onSchedule}
                        className="rounded-xl px-6 py-3 text-[14px] font-medium border border-warm-hairline dark:border-white/10 transition-colors hover:bg-warm-surface dark:hover:bg-white/5"
                    >
                        {scheduled ? t('mock.reschedule') : t('mock.schedule')}
                    </button>
                </div>
            </div>
        </article>
    );
}
