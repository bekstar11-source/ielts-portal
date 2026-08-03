/**
 * Guruh statistikasi sahifasining qurilish bloklari.
 *
 * Butun sahifa bitta vizual tilga tayanadi: yumshoq sirt (`Card`), yupqa
 * chegara, bitta urg'u rangi (emerald) va ko'p bo'sh joy. Mavzu `dark:`
 * variantlari orqali — `isDark` ternarilari yo'q.
 */

import React from 'react';

import { useTranslation } from '../../../context/LanguageContext';

export const surface =
    'bg-white dark:bg-[#202022] border border-gray-200/80 dark:border-white/[0.06]';

export function Card({ className = '', children, ...props }) {
    return (
        <div className={`${surface} rounded-2xl ${className}`} {...props}>
            {children}
        </div>
    );
}

export function SectionTitle({ children, action }) {
    return (
        <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                {children}
            </h2>
            {action}
        </div>
    );
}

/** Bitta ko'rsatkich: qiymat + izoh. Ixtiyoriy `hint` pastda kulrang matn. */
export function StatTile({ icon: Icon, label, value, hint, tone = 'neutral' }) {
    const tones = {
        neutral: 'text-gray-400 dark:text-gray-500',
        accent: 'text-emerald-600 dark:text-emerald-400',
        warn: 'text-amber-600 dark:text-amber-400',
    };
    return (
        <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
                {Icon && <Icon size={15} weight="regular" className={tones[tone]} />}
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                    {label}
                </p>
            </div>
            <p className="text-[26px] leading-none font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums">
                {value}
            </p>
            {hint && (
                <p className="text-[11px] mt-2 text-gray-400 dark:text-gray-500 truncate">{hint}</p>
            )}
        </Card>
    );
}

/** Segmentli tanlov (vaqt oralig'i, saralash va h.k.). */
export function Segmented({ options, value, onChange, size = 'md' }) {
    const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
    return (
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-gray-100 dark:bg-white/[0.04]">
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        aria-pressed={active}
                        className={`${pad} rounded-[10px] font-medium transition-colors whitespace-nowrap ${
                            active
                                ? 'bg-white dark:bg-[#2e2e31] text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

/** Band qiymati uchun kichik yorliq. */
export function BandPill({ band, size = 'md' }) {
    if (band === null || band === undefined) {
        return <span className="text-gray-300 dark:text-gray-600 tabular-nums">—</span>;
    }
    const tone =
        band >= 7
            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10'
            : band >= 5.5
              ? 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10'
              : 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10';
    const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-sm';
    return (
        <span className={`inline-flex items-center rounded-md font-semibold tabular-nums ${pad} ${tone}`}>
            {band.toFixed(1)}
        </span>
    );
}

/** O'sish/pasayish belgisi (so'nggi 3 natija vs oldingi 3). */
export function DeltaBadge({ delta }) {
    const { t } = useTranslation();
    if (delta === null || delta === undefined || delta === 0) return null;
    const up = delta > 0;
    return (
        <span
            title={t('teacher.groupStats.deltaTooltip') || "So'nggi 3 natija oldingi 3 tasiga nisbatan"}
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            }`}
        >
            {up ? '↑' : '↓'}
            {Math.abs(delta).toFixed(1)}
        </span>
    );
}

/** Yupqa progress chizig'i (bajarilish foizi). */
export function ProgressBar({ value, className = '' }) {
    const pct = Math.max(0, Math.min(100, value || 0));
    return (
        <div className={`h-1 w-full rounded-full bg-gray-100 dark:bg-white/[0.07] overflow-hidden ${className}`}>
            <div
                className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export function Avatar({ name, size = 36 }) {
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold bg-gray-100 text-gray-600 dark:bg-white/[0.07] dark:text-gray-300"
        >
            {name?.trim()?.charAt(0)?.toUpperCase() || 'U'}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <Card className="p-10 sm:p-14 text-center">
            {Icon && (
                <Icon size={28} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            )}
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            {description && (
                <p className="text-xs mt-1.5 text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </Card>
    );
}

export function Skeleton({ className = '' }) {
    return <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.05] ${className}`} />;
}

export function PageSkeleton() {
    return (
        <div className="space-y-5">
            <Skeleton className="h-11 w-full" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[108px]" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
            </div>
            <Skeleton className="h-64" />
        </div>
    );
}

/** Sokin, ikonkasiz asosiy tugma. */
export function Button({ variant = 'ghost', className = '', children, ...props }) {
    const variants = {
        primary:
            'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
        ghost: `${surface} text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06]`,
        danger: 'bg-rose-600 text-white hover:bg-rose-500',
    };
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
