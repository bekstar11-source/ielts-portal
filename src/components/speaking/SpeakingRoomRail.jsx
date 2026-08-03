/**
 * Speaking xonasining chap ustuni.
 *
 * Mavzular soni o'sganda (30, 100+) ro'yxat uzayadi, lekin bu ustun
 * o'zgarmaydi: partlar orasida o'tish, to'liq suhbat tugmasi va shu
 * paytgacha yig'ilgan band bir joyda, sticky turadi.
 */

import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

const PART_LABEL = {
    uz: {
        1: { name: 'Part 1', hint: 'Suhbat' },
        2: { name: 'Part 2', hint: 'Cue card' },
        3: { name: 'Part 3', hint: 'Muhokama' },
    },
    en: {
        1: { name: 'Part 1', hint: 'Interview' },
        2: { name: 'Part 2', hint: 'Cue card' },
        3: { name: 'Part 3', hint: 'Discussion' },
    },
};

/**
 * @param {{
 *   lang?: 'uz'|'en', c: Record<string, any>,
 *   parts: Array<{ part: number, count: number }>,
 *   activePart: number|null,
 *   onSelectPart: (part: number) => void,
 *   onBack: () => void,
 *   onStartMock: () => void,
 *   overallBand: number|null,
 *   answerCount: number,
 * }} props
 */
export default function SpeakingRoomRail({
    lang = 'uz',
    c,
    parts,
    activePart,
    onSelectPart,
    onBack,
    onStartMock,
    overallBand,
    answerCount,
}) {
    const labels = PART_LABEL[lang] || PART_LABEL.uz;
    // Band 0–9 shkalasida — chiziq shuning ulushi.
    const bandPercent = overallBand ? Math.min(100, (overallBand / 9) * 100) : 0;

    return (
        <aside className="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-warm-hairline dark:border-white/[0.08] bg-warm-surface/60 dark:bg-white/[0.02] px-5 py-7 sticky top-12 self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2.5 text-[13px] text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark transition-colors mb-7"
            >
                <ArrowLeft size={15} />
                <span>{c.backHome}</span>
            </button>

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warm-muted dark:text-warm-on-dark-soft/70 mb-3">
                {c.badge}
            </p>

            <nav className="flex flex-col gap-0.5 mb-6">
                {parts.map(({ part, count }) => {
                    const isActive = activePart === part;
                    return (
                        <button
                            key={part}
                            type="button"
                            onClick={() => onSelectPart(part)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] border-l-2 text-left transition-colors ${isActive
                                ? 'border-warm-primary bg-warm-primary/[0.13]'
                                : 'border-transparent hover:bg-warm-ink/[0.04] dark:hover:bg-white/[0.04]'
                                }`}
                        >
                            <span
                                className={`flex-1 min-w-0 truncate text-sm ${isActive
                                    ? 'font-medium text-warm-primary'
                                    : 'text-warm-body dark:text-warm-on-dark-soft'
                                    }`}
                            >
                                {labels[part].name} · {labels[part].hint}
                            </span>
                            <span
                                className={`text-xs tabular-nums ${isActive ? 'text-warm-primary/70' : 'text-warm-muted dark:text-warm-on-dark-soft/60'
                                    }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <button
                type="button"
                onClick={onStartMock}
                className="text-left rounded-[11px] border border-warm-primary/30 bg-warm-primary/[0.08] hover:border-warm-primary hover:bg-warm-primary/[0.16] px-4 py-3.5 mb-6 transition-colors"
            >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-warm-primary mb-2">
                    <Sparkles size={11} />
                    {c.mockBadge}
                </span>
                <p className="text-[14.5px] leading-snug text-warm-ink dark:text-warm-on-dark mb-2">
                    {c.mockTitleShort}
                </p>
                <p className="text-[13px] font-semibold text-warm-primary">{c.begin} →</p>
            </button>

            <div className="h-px bg-warm-hairline dark:bg-white/[0.08] mb-4" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warm-muted dark:text-warm-on-dark-soft/70 mb-3.5">
                {c.bandSoFar}
            </p>
            <div className="flex items-baseline gap-2.5">
                <span className="font-serif-display text-[38px] leading-none text-warm-ink dark:text-warm-on-dark">
                    {overallBand ? overallBand.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-warm-muted dark:text-warm-on-dark-soft/60">
                    {c.answers(answerCount)}
                </span>
            </div>
            <div className="h-0.5 bg-warm-ink/10 dark:bg-white/10 mt-2.5">
                <div className="h-0.5 bg-warm-primary transition-all" style={{ width: `${bandPercent}%` }} />
            </div>

            <div className="flex-1" />
            <p className="mt-8 text-xs leading-relaxed text-warm-muted/80 dark:text-warm-on-dark-soft/50">
                {c.railNote}
            </p>
        </aside>
    );
}
