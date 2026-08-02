/**
 * O'quvchi qatori — yopiq holatda eng muhim 4 ta ma'lumot (band, o'sish,
 * natijalar soni, bajarilish), ochilganda ko'nikmalar kesimi va so'nggi
 * natijalar.
 */

import React from 'react';
import { CaretDown, Trash, Warning, MoonStars, Envelope, Phone } from '@phosphor-icons/react';
import { toDate } from '../../../utils/subscription';
import { getBandValue } from '../../../utils/teacherResults';
import { SKILLS, formatRelativeDays } from '../../../utils/groupAnalytics';
import { Avatar, BandPill, DeltaBadge, ProgressBar, surface } from './primitives';
import { SKILL_LABELS } from './GroupCharts';

function Tag({ icon: Icon, children, tone }) {
    const tones = {
        warn: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
        muted: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-white/[0.06]',
    };
    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${tones[tone]}`}
        >
            {Icon && <Icon size={10} weight="fill" />}
            {children}
        </span>
    );
}

export default function StudentRow({ student, stats, expanded, onToggle, onRemove }) {
    const name = student.fullName || student.email || 'Nomsiz';

    return (
        <div className={`${surface} rounded-2xl overflow-hidden transition-colors`}>
            <div className="flex items-center gap-2 pr-2">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={expanded}
                    className="flex-1 min-w-0 flex items-center gap-3 p-3.5 sm:p-4 text-left hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
                >
                    <Avatar name={name} />

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {name}
                            </p>
                            {stats.isLow && (
                                <Tag icon={Warning} tone="warn">
                                    Past ball
                                </Tag>
                            )}
                            {stats.isInactive && stats.count > 0 && (
                                <Tag icon={MoonStars} tone="muted">
                                    Passiv
                                </Tag>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            {student.email} · {formatRelativeDays(stats.daysSinceActive)}
                        </p>
                    </div>

                    {/* Bajarilish — faqat kengroq ekranda */}
                    {stats.completionRate !== null && (
                        <div className="hidden lg:block w-24">
                            <div className="flex justify-between text-[10px] mb-1 text-gray-400 dark:text-gray-500">
                                <span>Bajarildi</span>
                                <span className="tabular-nums">{stats.completionRate}%</span>
                            </div>
                            <ProgressBar value={stats.completionRate} />
                        </div>
                    )}

                    <div className="hidden sm:block w-14 text-right">
                        <p className="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-200">
                            {stats.count}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">natija</p>
                    </div>

                    <div className="flex items-center gap-1.5 w-[76px] justify-end">
                        <DeltaBadge delta={stats.delta} />
                        <BandPill band={stats.avgBand} />
                    </div>

                    <CaretDown
                        size={14}
                        className={`text-gray-300 dark:text-gray-600 transition-transform duration-200 ${
                            expanded ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                <button
                    type="button"
                    onClick={onRemove}
                    title="Guruhdan chiqarish"
                    aria-label={`${name} — guruhdan chiqarish`}
                    className="p-2 rounded-lg text-gray-300 dark:text-gray-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                    <Trash size={15} />
                </button>
            </div>

            {expanded && (
                <div className="px-3.5 sm:px-4 pb-4 pt-4 border-t border-gray-100 dark:border-white/[0.05] space-y-5">
                    {/* Aloqa — ilgari alohida "O'quvchilar" sahifasida ko'rinardi. */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {student.email && (
                            <a
                                href={`mailto:${student.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <Envelope size={12} /> {student.email}
                            </a>
                        )}
                        {student.phoneNumber && (
                            <a
                                href={`tel:${student.phoneNumber}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <Phone size={12} /> {student.phoneNumber}
                            </a>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {SKILLS.map((skill) => {
                            const s = stats.skills[skill];
                            return (
                                <div
                                    key={skill}
                                    className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03]"
                                >
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                        {SKILL_LABELS[skill]}
                                    </p>
                                    <p className="mt-1.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                                        {s.avg !== null ? s.avg.toFixed(1) : '—'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                        {s.count} ta
                                        {s.best !== null && ` · eng yaxshi ${s.best.toFixed(1)}`}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {stats.recentResults.length > 0 ? (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 mb-2">
                                So'nggi natijalar
                            </p>
                            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {stats.recentResults.map((r) => {
                                    const date = toDate(r.date);
                                    return (
                                        <div
                                            key={r.id}
                                            className="flex items-center justify-between gap-3 py-2.5"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-800 dark:text-gray-100 truncate">
                                                    {r.testTitle || 'Test'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
                                                    {r.type || '—'}
                                                    {date &&
                                                        ` · ${date.toLocaleDateString('en-GB')}`}
                                                </p>
                                            </div>
                                            <BandPill band={getBandValue(r)} size="sm" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Bu o'quvchi hali test topshirmagan.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
