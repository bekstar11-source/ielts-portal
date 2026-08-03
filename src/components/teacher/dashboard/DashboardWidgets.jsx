/**
 * O'qituvchi bosh sahifasining qo'shimcha bloklari.
 *
 * Sahifaning vizual tili buzilmasligi uchun: bitta sirt (`CARD_CLS`),
 * yupqa hairline chegara, urg'u faqat `warm-primary` da va hech qanday
 * qo'shimcha rang shkalasi yo'q — ma'lumot shakl va bo'sh joy orqali
 * farqlanadi.
 */

import React from 'react';
import { CaretRight, Warning } from '@phosphor-icons/react';
import { useTranslation } from '../../../context/LanguageContext';

export const CARD_CLS =
    'rounded-2xl border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated';

export const ROW_CLS =
    'w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-warm-surface/60 dark:hover:bg-white/5';

const SKILL_LABELS = {
    listening: 'Listening',
    reading: 'Reading',
    writing: 'Writing',
    speaking: 'Speaking',
};

/** Bo'lim sarlavhasi + o'ngdagi ixtiyoriy havola. */
export function SectionHeader({ title, actionLabel, onAction }) {
    return (
        <div className="flex items-center justify-between mb-sm">
            <h2 className="text-warm-title-sm font-medium">{title}</h2>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

/**
 * So'nggi kunlardagi faollik — yupqa ustunlar qatori.
 * Natijasiz kunlar ham ko'rinadi, shuning uchun uzilish darrov seziladi.
 */
export function ActivityStrip({ series }) {
    const { t } = useTranslation();
    const total = series.reduce((sum, d) => sum + d.count, 0);
    const max = Math.max(1, ...series.map((d) => d.count));

    return (
        <div className={`${CARD_CLS} px-5 py-4 flex items-center gap-lg`}>
            <div className="flex-shrink-0">
                <p className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft">
                    {t('teacher.dashboard.lastNDays').replace('{n}', series.length)}
                </p>
                <p className="text-[20px] leading-tight font-semibold tabular-nums mt-0.5">
                    {total} <span className="text-[13px] font-normal text-warm-muted dark:text-warm-on-dark-soft">{t('teacher.dashboard.resultsCount')}</span>
                </p>
            </div>

            <div className="flex-1 flex items-end justify-end gap-[3px] h-10 min-w-0">
                {series.map((d) => (
                    <div
                        key={d.key}
                        title={`${d.label} — ${d.count}`}
                        className="flex-1 max-w-[14px] rounded-[2px] bg-warm-hairline dark:bg-white/10 flex items-end overflow-hidden"
                        style={{ height: '100%' }}
                    >
                        <div
                            className="w-full rounded-[2px] bg-warm-primary/70 transition-[height] duration-500"
                            style={{ height: d.count ? `${Math.max(12, (d.count / max) * 100)}%` : '0%' }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Ko'nikmalar kesimidagi o'rtacha band — 0..9 shkalasida. */
export function SkillAverages({ skills, overallBand }) {
    const { t } = useTranslation();
    const hasData = skills.some((s) => s.avg !== null);

    return (
        <div className={`${CARD_CLS} px-5 py-4`}>
            <div className="flex items-baseline justify-between mb-4">
                <p className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft">
                    {t('teacher.dashboard.skillBreakdown')}
                </p>
                <p className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft">
                    {t('teacher.dashboard.overall')}{' '}
                    <span className="text-warm-ink dark:text-warm-on-dark font-semibold tabular-nums">
                        {overallBand !== null && overallBand !== undefined ? overallBand.toFixed(1) : '—'}
                    </span>
                </p>
            </div>

            {!hasData ? (
                <p className="py-6 text-center text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft">
                    {t('teacher.dashboard.noGradedResultsYet')}
                </p>
            ) : (
                <div className="space-y-3">
                    {skills.map(({ skill, avg, count }) => (
                        <div key={skill}>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <span className="text-[13px]">{SKILL_LABELS[skill] || skill}</span>
                                <span className="text-[13px] tabular-nums">
                                    {avg !== null ? avg.toFixed(1) : '—'}
                                    <span className="ml-1.5 text-[12px] text-warm-muted dark:text-warm-on-dark-soft">
                                        {count}
                                    </span>
                                </span>
                            </div>
                            <div className="h-1 rounded-full bg-warm-hairline dark:bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-warm-primary/70 transition-[width] duration-500"
                                    style={{ width: `${((avg || 0) / 9) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Bali past yoki uzoq faolsiz o'quvchilar. */
export function AttentionList({ items, onOpen }) {
    const { t } = useTranslation();
    return (
        <div className={`${CARD_CLS} overflow-hidden divide-y divide-warm-hairline dark:divide-white/10`}>
            {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft">
                    {t('teacher.dashboard.allGood')}
                </p>
            ) : (
                items.map(({ student, stats, reason, untested }) => (
                    <button key={student.id} onClick={onOpen} className={ROW_CLS}>
                        <div className="flex items-center gap-sm min-w-0">
                            <Warning size={16} className="text-warm-muted-soft flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[14px] font-medium truncate">
                                    {student.fullName || student.email || t('teacher.dashboard.unknownStudent')}
                                </p>
                                <p className="text-[12px] text-warm-muted dark:text-warm-on-dark-soft truncate">
                                    {reason}
                                    {!untested && ` · ${stats.count} ${t('teacher.dashboard.resultsCount')}`}
                                </p>
                            </div>
                        </div>
                        <CaretRight size={14} className="text-warm-muted-soft flex-shrink-0" />
                    </button>
                ))
            )}
        </div>
    );
}
