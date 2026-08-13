/**
 * Guruh statistikasining vizual bloklari: tendensiya, skill kesimi va
 * band taqsimoti. Barchasi bitta rang mantig'iga tayanadi — asosiy urg'u
 * emerald, qolgani neytral kulrang.
 */

import React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../context/LanguageContext';
import { Card, SectionTitle, EmptyState } from './primitives';
import { ChartLine } from '@phosphor-icons/react';

const SKILL_LABELS = {
    reading: 'Reading',
    listening: 'Listening',
    writing: 'Writing',
    speaking: 'Speaking',
};

function TrendTooltip({ active, payload, label }) {
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div className="rounded-xl px-3 py-2 text-xs shadow-lg bg-white dark:bg-[#2a2a2d] border border-gray-200 dark:border-white/10">
            <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
            <p className="mt-1 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                {point.band?.toFixed(1)} {t('teacher.groupStats.charts.bandSuffix')}
            </p>
            <p className="text-gray-400 dark:text-gray-500">{point.count} {t('teacher.groupStats.charts.resultsSuffix')}</p>
        </div>
    );
}

export function TrendChart({ data, rangeLabel }) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    return (
        <Card className="p-5">
            <SectionTitle
                action={
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{rangeLabel}</span>
                }
            >
                {t('teacher.groupStats.charts.trendTitle')}
            </SectionTitle>

            {data.length < 2 ? (
                <div className="h-[220px] flex flex-col items-center justify-center text-center">
                    <ChartLine size={24} className="text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('teacher.groupStats.charts.needAtLeast2Days')}
                    </p>
                </div>
            ) : (
                <div className="h-[220px] -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <defs>
                                <linearGradient id="groupTrendFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="4 4"
                                vertical={false}
                                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                            />
                            <XAxis
                                dataKey="date"
                                stroke={isDark ? '#71717a' : '#9ca3af'}
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={6}
                            />
                            <YAxis
                                domain={[0, 9]}
                                ticks={[0, 3, 6, 9]}
                                stroke={isDark ? '#71717a' : '#9ca3af'}
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#10B981', strokeOpacity: 0.25 }} />
                            <Area
                                type="monotone"
                                dataKey="band"
                                stroke="#10B981"
                                strokeWidth={2}
                                fill="url(#groupTrendFill)"
                                dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
                                activeDot={{ r: 4 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}

/** Skill'lar kesimidagi o'rtacha band — 0..9 shkalasidagi yupqa chiziqlar. */
export function SkillBreakdown({ skills }) {
    const { t } = useTranslation();
    const hasData = skills.some((s) => s.avg !== null);

    return (
        <Card className="p-5">
            <SectionTitle>{t('teacher.groupStats.charts.skillsTitle')}</SectionTitle>
            {!hasData ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-10 text-center">
                    {t('teacher.groupStats.charts.noGradedResults')}
                </p>
            ) : (
                <div className="space-y-4">
                    {skills.map(({ skill, avg, count }) => (
                        <div key={skill}>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                    {SKILL_LABELS[skill]}
                                </span>
                                <span className="text-xs tabular-nums text-gray-900 dark:text-white font-semibold">
                                    {avg !== null ? avg.toFixed(1) : '—'}
                                    <span className="ml-1.5 font-normal text-[11px] text-gray-400 dark:text-gray-500">
                                        {count} {t('teacher.groupStats.charts.resultsSuffix')}
                                    </span>
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-500"
                                    style={{ width: `${((avg || 0) / 9) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

/** O'quvchilarning o'rtacha bandi bo'yicha taqsimot. */
export function BandDistribution({ buckets }) {
    const { t } = useTranslation();
    const max = Math.max(1, ...buckets.map((b) => b.count));
    const total = buckets.reduce((sum, b) => sum + b.count, 0);

    return (
        <Card className="p-5">
            <SectionTitle
                action={
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {t('teacher.groupStats.charts.studentsCount').replace('{count}', total)}
                    </span>
                }
            >
                {t('teacher.groupStats.charts.distributionTitle')}
            </SectionTitle>
            {total === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-10 text-center">
                    {t('teacher.groupStats.charts.notEnoughData')}
                </p>
            ) : (
                <div className="flex items-end gap-2 h-[150px]">
                    {buckets.map((b) => (
                        <div key={b.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <span className="text-[11px] font-semibold tabular-nums text-gray-900 dark:text-white">
                                {b.count || ''}
                            </span>
                            <div
                                className="w-full rounded-lg bg-emerald-500/70 dark:bg-emerald-500/60 transition-[height] duration-500 min-h-[3px]"
                                style={{ height: `${(b.count / max) * 100}%` }}
                            />
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                {b.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// Fayl darajasida: Leaderboards ichida e'lon qilinganda har renderda yangi tur bo'lib,
// butun ro'yxat bekorga qayta mount bo'lardi.
const Row = ({ index, name, value, tone }) => (
    <div className="flex items-center gap-3 py-2">
        <span className="w-4 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
            {index + 1}
        </span>
        <span className="flex-1 text-xs text-gray-800 dark:text-gray-100 truncate">{name}</span>
        <span className={`text-xs font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
);

/** Top-3 va eng ko'p o'sgan o'quvchilar. */
export function Leaderboards({ top, improved }) {
    const { t } = useTranslation();
    if (!top.length && !improved.length) return null;

    return (
        <Card className="p-5">
            <SectionTitle>{t('teacher.groupStats.charts.leaderboardsTitle')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{t('teacher.groupStats.charts.highestBand')}</p>
                    <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {top.length ? (
                            top.map((x, i) => (
                                <Row
                                    key={x.student.id}
                                    index={i}
                                    name={x.student.fullName || x.student.email}
                                    value={x.stats.avgBand.toFixed(1)}
                                    tone="text-gray-900 dark:text-white"
                                />
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">—</p>
                        )}
                    </div>
                </div>
                <div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{t('teacher.groupStats.charts.mostImproved')}</p>
                    <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {improved.length ? (
                            improved.map((x, i) => (
                                <Row
                                    key={x.student.id}
                                    index={i}
                                    name={x.student.fullName || x.student.email}
                                    value={`+${x.stats.delta.toFixed(1)}`}
                                    tone="text-emerald-600 dark:text-emerald-400"
                                />
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">—</p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

export { SKILL_LABELS };
