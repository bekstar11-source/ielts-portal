/**
 * Speaking "xonasi" ning vizual tili.
 *
 * Qolgan sahifalar `groupStats/primitives` dagi kulrang+emerald tilida
 * yozilgan — u yerda bu to'g'ri, chunki o'qituvchi jadval va raqamlarni
 * o'qiydi. Speaking boshqa vazifa: o'quvchi bu yerda gapiradi, shuning
 * uchun sirtlar iliq (warm tokenlar), urg'u bitta (terracotta) va
 * ogohlantirish ranglari faqat haqiqiy xato bo'lganda ishlatiladi.
 *
 * Maqsad — imtihon varaqasi emas, tinch mashg'ulot xonasi hissi. Shu
 * bilan birga bezak minimal: yupqa chegara, ko'p bo'sh joy, bitta rang.
 */

import React from 'react';

/** Xonaning asosiy sirti. */
export const roomSurface =
    'bg-white dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/[0.07]';

/** Ikkinchi darajali sirt — iqtibos, qayd, cue card. */
export const softSurface =
    'bg-warm-canvas dark:bg-white/[0.03] border border-warm-hairline-soft dark:border-white/[0.05]';

export function RoomCard({ className = '', children, ...props }) {
    return (
        <div className={`${roomSurface} rounded-[20px] ${className}`} {...props}>
            {children}
        </div>
    );
}

/** Kichik sarlavha — bo'limni e'lon qiladi, o'ziga e'tibor tortmaydi. */
export function Eyebrow({ className = '', children }) {
    return (
        <p
            className={`text-[11px] font-semibold uppercase tracking-[0.1em] text-warm-muted dark:text-warm-on-dark-soft ${className}`}
        >
            {children}
        </p>
    );
}

/** Asosiy matn rangi (sarlavhalar). */
export const inkText = 'text-warm-ink dark:text-warm-on-dark';
/** Tushuntirish matni. */
export const bodyText = 'text-warm-body dark:text-warm-on-dark-soft';
/** Eng sokin matn — izohlar, hisoblagichlar. */
export const mutedText = 'text-warm-muted dark:text-warm-on-dark-soft/70';

/** Band ballga qarab rang — iliq palitrada. */
export function bandTone(band) {
    if (band >= 7) return 'text-warm-success';
    if (band >= 5.5) return 'text-warm-primary';
    return 'text-warm-warning';
}

/** To'ldirilgan asosiy tugma. */
export function PrimaryButton({ className = '', children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/** Chegarali, sokin tugma. */
export function QuietButton({ className = '', children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-warm-hairline dark:border-white/10 text-sm font-medium text-warm-body dark:text-warm-on-dark px-4 py-2.5 hover:bg-warm-canvas dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/** Yozuvsiz, faqat matnli tugma. */
export function GhostButton({ className = '', children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-medium text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark px-3 py-1.5 border border-warm-hairline dark:border-white/10 hover:border-warm-primary/40 transition-colors ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/**
 * Xona fonidagi sokin yorug'lik. Mashg'ulot ekranining orqasida turadi —
 * sahifa "hujjat" emas, "joy" bo'lib ko'rinishi uchun. Hech qanday
 * o'zaro ta'sirga xalaqit bermaydi.
 */
export function RoomGlow({ active = false }) {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 h-72 -z-10 flex justify-center overflow-hidden"
        >
            <div
                className={`w-[36rem] h-[36rem] rounded-full blur-3xl transition-opacity duration-1000 ${
                    active
                        ? 'bg-warm-primary/[0.12] dark:bg-warm-primary/[0.16] opacity-100'
                        : 'bg-warm-primary/[0.06] dark:bg-warm-primary/[0.08] opacity-70'
                }`}
            />
        </div>
    );
}
