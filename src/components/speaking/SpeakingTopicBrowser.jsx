/**
 * Speaking xonasining mavzular ro'yxati.
 *
 * Ro'yxat o'sishga mo'ljallangan: qidiruv, holat bo'yicha filtr, part
 * bo'limlari yopiladi/ochiladi va bir bo'limda birdaniga cheklangan
 * miqdordagi mavzu ko'rsatiladi ("yana N ko'rsatish"). Shu tufayli 12 ta
 * mavzuda ham, 100+ da ham sahifa bir xil o'qiladi.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { MagnifyingGlass, Minus, Plus } from '@phosphor-icons/react';

const PAGE_SIZE = 6;

const PART_HINT = {
    uz: {
        1: 'Tanishuv va suhbat',
        2: 'Cue card · 1 daq tayyorgarlik, 2 daq gapirish',
        3: 'Muhokama',
    },
    en: {
        1: 'Introduction & interview',
        2: 'Cue card · 1 min prep, 2 min talk',
        3: 'Discussion',
    },
};

/** "2 kun oldin" / "2 days ago" — oxirgi urinish qachonligi. */
function relativeTime(date, lang) {
    if (!date) return null;
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (lang === 'en') {
        if (days <= 0) return 'today';
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
    }
    if (days <= 0) return 'bugun';
    if (days === 1) return 'kecha';
    if (days < 7) return `${days} kun oldin`;
    if (days < 30) return `${Math.floor(days / 7)} hafta oldin`;
    return `${Math.floor(days / 30)} oy oldin`;
}

/** Mavzuning ko'rinadigan sarlavhasi — Part 2 da cue card savolining o'zi. */
function topicHeadline(topic) {
    if (topic.part === 2) return topic.questions[0]?.text || topic.title;
    return topic.title;
}

function TopicRow({ topic, stat, lang, c, onStart }) {
    const last = relativeTime(stat?.lastAt, lang);
    const serif = topic.part === 2;

    return (
        <button
            type="button"
            onClick={() => onStart(topic)}
            className="flex items-center gap-3.5 text-left px-4 py-3.5 rounded-[10px] border border-warm-hairline dark:border-white/[0.08] bg-white dark:bg-warm-dark-elevated hover:border-warm-primary/50 hover:bg-warm-canvas dark:hover:bg-white/[0.05] transition-colors"
        >
            <span className="flex-1 min-w-0">
                <span
                    className={`block text-warm-ink dark:text-warm-on-dark mb-1 ${serif ? 'font-serif-display text-[19px] leading-snug' : 'text-[16px]'
                        }`}
                >
                    {topicHeadline(topic)}
                </span>
                <span className="block text-[12.5px] text-warm-muted dark:text-warm-on-dark-soft/60">
                    {c.questions(topic.questions.length)}
                    {' · '}
                    {last ? c.lastAttempt(last) : c.notStarted}
                    {topic.authorName ? ` · ${topic.authorName}` : ''}
                </span>
            </span>
            <span
                className={`shrink-0 text-[13px] tabular-nums ${stat?.band != null
                    ? 'font-semibold text-warm-primary'
                    : 'text-warm-muted/60 dark:text-warm-on-dark-soft/40'
                    }`}
            >
                {stat?.band != null ? stat.band.toFixed(1) : '—'}
            </span>
        </button>
    );
}

/**
 * @param {{
 *   topics: Array<object>, statsByTopic: Record<string, object>,
 *   lang?: 'uz'|'en', c: Record<string, any>,
 *   parts: number[], openParts: Record<number, boolean>,
 *   onTogglePart: (part: number) => void,
 *   onStart: (topic: object) => void,
 *   query: string, onQueryChange: (value: string) => void,
 *   filter: string, onFilterChange: (value: string) => void,
 * }} props
 */
export default function SpeakingTopicBrowser({
    topics,
    statsByTopic,
    lang = 'uz',
    c,
    parts,
    openParts,
    onTogglePart,
    onStart,
    query,
    onQueryChange,
    filter,
    onFilterChange,
}) {
    // Bo'lim ichida nechta mavzu ochilgani — "yana ko'rsatish" har bir part
    // uchun alohida hisoblanadi.
    const [shown, setShown] = useState({});
    const showMore = useCallback((part) => {
        setShown((prev) => ({ ...prev, [part]: (prev[part] || PAGE_SIZE) + PAGE_SIZE }));
    }, []);

    const hints = PART_HINT[lang] || PART_HINT.uz;

    // Filtr sanoqlari qidiruvdan keyin, lekin holat filtridan oldin
    // hisoblanadi — chiplardagi raqamlar tanlangan chipdan qat'i nazar
    // to'g'ri qoladi.
    const searched = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return topics;
        return topics.filter((topic) => {
            if (topic.title?.toLowerCase().includes(q)) return true;
            if (topic.description?.toLowerCase().includes(q)) return true;
            return topic.questions.some((question) => question.text?.toLowerCase().includes(q));
        });
    }, [topics, query]);

    const counts = useMemo(() => {
        let fresh = 0;
        let started = 0;
        let weak = 0;
        searched.forEach((topic) => {
            const stat = statsByTopic[topic.id];
            if (!stat) fresh += 1;
            else {
                started += 1;
                if (stat.band != null && stat.band < 6) weak += 1;
            }
        });
        return { all: searched.length, fresh, started, weak };
    }, [searched, statsByTopic]);

    const filtered = useMemo(() => {
        if (filter === 'all') return searched;
        return searched.filter((topic) => {
            const stat = statsByTopic[topic.id];
            if (filter === 'fresh') return !stat;
            if (filter === 'started') return Boolean(stat);
            if (filter === 'weak') return stat?.band != null && stat.band < 6;
            return true;
        });
    }, [searched, statsByTopic, filter]);

    const chips = [
        { id: 'all', label: c.filterAll, count: counts.all },
        { id: 'fresh', label: c.filterFresh, count: counts.fresh },
        { id: 'started', label: c.filterStarted, count: counts.started },
        { id: 'weak', label: c.filterWeak, count: counts.weak },
    ];

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <label className="relative flex-1 sm:max-w-[300px]">
                    <MagnifyingGlass
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted dark:text-warm-on-dark-soft/50"
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder={c.searchPlaceholder}
                        className="w-full h-[38px] pl-9 pr-3 rounded-[10px] text-[13.5px] bg-warm-canvas dark:bg-white/[0.05] border border-warm-hairline dark:border-white/10 text-warm-ink dark:text-warm-on-dark placeholder:text-warm-muted dark:placeholder:text-warm-on-dark-soft/50 focus:outline-none focus:border-warm-primary/50 transition-colors"
                    />
                </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-warm-hairline dark:border-white/[0.09]">
                {chips.map((chip) => {
                    const isActive = filter === chip.id;
                    return (
                        <button
                            key={chip.id}
                            type="button"
                            onClick={() => onFilterChange(chip.id)}
                            className={`px-3.5 py-1.5 rounded-full text-[12.5px] transition-colors ${isActive
                                ? 'bg-warm-primary text-warm-on-primary font-semibold'
                                : 'border border-warm-hairline dark:border-white/[0.12] text-warm-body dark:text-warm-on-dark-soft hover:border-warm-primary/40'
                                }`}
                        >
                            {chip.label} {chip.count}
                        </button>
                    );
                })}
                <span className="ml-auto hidden sm:block text-[12.5px] text-warm-muted dark:text-warm-on-dark-soft/50">
                    {c.sortLabel}
                </span>
            </div>

            {filtered.length === 0 && (
                <p className="py-14 text-center text-sm text-warm-muted dark:text-warm-on-dark-soft/60">
                    {c.emptyResult}
                </p>
            )}

            {parts.map((part) => {
                const partTopics = filtered.filter((topic) => topic.part === part);
                if (partTopics.length === 0) return null;

                const isOpen = openParts[part];
                const visibleCount = shown[part] || PAGE_SIZE;
                const visible = isOpen ? partTopics.slice(0, visibleCount) : partTopics.slice(0, 1);
                const hidden = partTopics.length - visible.length;

                return (
                    <section key={part} id={`speaking-part-${part}`} className="scroll-mt-24">
                        <button
                            type="button"
                            onClick={() => onTogglePart(part)}
                            className="w-full flex items-center gap-3 pt-6 pb-3 md:sticky md:top-12 z-10 bg-warm-canvas dark:bg-warm-dark"
                        >
                            <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-warm-ink dark:text-warm-on-dark/80">
                                Part {part}
                            </span>
                            <span className="hidden sm:block text-[13px] text-warm-muted dark:text-warm-on-dark-soft/60">
                                {hints[part]}
                            </span>
                            <span className="flex-1 h-px bg-warm-hairline dark:bg-white/[0.08]" />
                            <span className="text-[12.5px] text-warm-muted dark:text-warm-on-dark-soft/60">
                                {c.topicCount(partTopics.length)}
                            </span>
                            <span className="flex items-center gap-1 text-[12.5px] text-warm-body dark:text-warm-on-dark-soft">
                                {isOpen ? <Minus size={12} /> : <Plus size={12} />}
                                {isOpen ? c.collapse : c.expand}
                            </span>
                        </button>

                        <div className={isOpen ? 'grid md:grid-cols-2 gap-2 md:gap-x-3.5' : 'grid gap-2'}>
                            {visible.map((topic) => (
                                <TopicRow
                                    key={topic.id}
                                    topic={topic}
                                    stat={statsByTopic[topic.id]}
                                    lang={lang}
                                    c={c}
                                    onStart={onStart}
                                />
                            ))}
                        </div>

                        {hidden > 0 && (
                            <button
                                type="button"
                                onClick={() => (isOpen ? showMore(part) : onTogglePart(part))}
                                className="w-full mt-2 py-3 rounded-[10px] border border-dashed border-warm-hairline dark:border-white/[0.14] text-[13.5px] text-warm-body dark:text-warm-on-dark-soft hover:border-warm-primary/50 hover:text-warm-primary transition-colors"
                            >
                                {c.showMore(hidden)}
                            </button>
                        )}
                    </section>
                );
            })}
        </>
    );
}
