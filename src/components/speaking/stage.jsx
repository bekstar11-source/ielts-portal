/**
 * Speaking sahnasining vizual tili.
 *
 * `ui.jsx` — mavzular ro'yxati uchun: oq qog'oz, iliq kul rang, yorug' xona.
 * Bu fayl boshqa vazifani bajaradi. Javob berish paytida ekranda faqat bitta
 * ish qolishi kerak — gapirish. Shuning uchun sahna doim qorong'i (mavzu
 * sozlamasidan qat'i nazar): qorong'i fonda savol va tirik yorug'likdan
 * boshqa hech narsa e'tibor tortmaydi.
 *
 * Ranglar shu yerda literal — bu tokenlashtirilgan interfeys emas, bitta
 * ekranning atayin tanlangan qorong'i muhiti.
 */

import React from 'react';

/** Sahnaning asosiy urg'u rangi. */
export const EMBER = '#F0894A';
/** Yorug'roq urg'u — matn va raqamlar uchun. */
export const EMBER_LIGHT = '#F0A165';
/** Ijobiy signal. */
export const SAGE = '#8FC79C';

/** Holat nuqtasining rangi. */
export function statusDot(mode) {
    if (mode === 'user') return EMBER;
    if (mode === 'ai') return EMBER_LIGHT;
    return 'rgba(255,255,255,.35)';
}

/** MM:SS. */
export function formatTime(seconds) {
    const safe = Math.max(0, Math.round(seconds || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Sahnadagi kichik sarlavha. */
export function StageLabel({ className = '', tone = 'muted', children }) {
    const color =
        tone === 'ember'
            ? 'text-[#F0A165]/85'
            : tone === 'bright'
              ? 'text-white/70'
              : 'text-white/40';
    return (
        <p className={`text-[10.5px] font-medium uppercase tracking-[0.14em] ${color} ${className}`}>
            {children}
        </p>
    );
}

/** Sokin, shishasimon tugma — sahnadagi ikkinchi darajali amallar. */
export function StageButton({ className = '', children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 h-[46px] px-5 rounded-full border border-white/[0.13] bg-white/[0.04] text-[13px] font-normal text-white/76 hover:bg-white/[0.12] hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/** Cho'g' rangidagi asosiy tugma. */
export function EmberButton({ className = '', children, ...props }) {
    return (
        <button
            type="button"
            style={{
                background: 'radial-gradient(130% 130% at 20% 20%,#FFD494,#E9591F 78%)',
                boxShadow: '0 10px 28px rgba(233,89,31,.38)',
            }}
            className={`inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full text-[13.5px] font-medium text-white hover:brightness-[1.07] transition-[filter] disabled:opacity-50 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/** Yumaloq belgi — suhbatdosh yoki tartib raqami. */
export function Pip({ tone = 'ember', className = '', children }) {
    const styles =
        tone === 'ember'
            ? 'bg-[#F0894A]/20 text-[#F0A165]'
            : 'bg-white/[0.08] text-white/50';
    return (
        <span
            className={`shrink-0 grid place-items-center rounded-full font-mono text-[10px] font-medium ${styles} ${className}`}
        >
            {children}
        </span>
    );
}

/**
 * Bitta mezon: nomi, ball va to'ldirilgan chiziq.
 * Chiziq band ballni 9 ga nisbatan ko'rsatadi.
 */
export function BandBar({ label, band, tone = EMBER }) {
    const value = typeof band === 'number' ? band : 0;
    return (
        <div className="grid gap-[5px]">
            <div className="flex justify-between text-[12px] text-white/70">
                <span>{label}</span>
                <span style={{ color: EMBER_LIGHT }} className="tabular-nums">
                    {value.toFixed(1)}
                </span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.09] overflow-hidden">
                <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.min(100, (value / 9) * 100)}%`, background: tone }}
                />
            </div>
        </div>
    );
}

/** Ijobiy chip — saqlab qolishga arziydigan ibora. */
export function KeepChip({ children }) {
    return (
        <span className="rounded-full border border-[#4E8D5B]/30 bg-[#4E8D5B]/10 px-[11px] py-1.5 text-[12px] text-[#8FC79C]">
            {children}
        </span>
    );
}

/** Ogohlantiruvchi chip — kuzatib borish kerak bo'lgan narsa. */
export function WatchChip({ children }) {
    return (
        <span className="rounded-full border border-[#FFBE78]/28 bg-[#FFBE78]/12 px-[11px] py-1.5 text-[12px] text-[#FFC891]">
            {children}
        </span>
    );
}

/**
 * O'ng ustun — "rail". Katta ekranda sahna yonida turadi, kichikda
 * sahnaning ostiga tushadi.
 */
export function Rail({ className = '', children }) {
    return (
        <aside
            className={`bg-[#0F0B08] border-t lg:border-t-0 lg:border-l border-white/[0.07] grid grid-rows-[auto_1fr_auto] min-h-0 ${className}`}
        >
            {children}
        </aside>
    );
}

/** Rail ning yuqori va quyi bo'limlari — bir xil ichki bo'shliq. */
export function RailTop({ className = '', children }) {
    return (
        <div className={`px-[22px] pt-5 pb-3.5 border-b border-white/[0.06] ${className}`}>
            {children}
        </div>
    );
}

export function RailBody({ className = '', children }) {
    return (
        <div
            className={`stage-scrollbar px-[22px] py-5 grid content-start gap-5 min-h-0 overflow-y-auto ${className}`}
        >
            {children}
        </div>
    );
}

export function RailBottom({ className = '', children }) {
    return (
        <div className={`px-[22px] pt-[18px] pb-[22px] border-t border-white/[0.06] grid gap-3 ${className}`}>
            {children}
        </div>
    );
}
