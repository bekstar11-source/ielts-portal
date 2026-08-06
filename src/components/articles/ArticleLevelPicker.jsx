import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ARTICLE_LEVELS, ARTICLE_LEVEL_META, formatReadTimeLabel } from '../../utils/articleLevels';
import { useTranslation } from '../../context/LanguageContext';

/**
 * Daraja tanlagich — segmented control.
 * Rang palitrasi o'qish sahifasining `--r-*` o'zgaruvchilaridan olinadi
 * (boshqa joyda ishlatilsa, fallback qiymatlar ishlaydi).
 */
export default function ArticleLevelPicker({ value, onChange, readTimes = {}, compact = false }) {
    const { t } = useTranslation();
    const containerRef = useRef(null);

    // Chap/o'ng strelkalar bilan darajani almashtirish (radiogroup xulq-atvori)
    const handleKeyDown = (event) => {
        const keys = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
        const delta = keys[event.key];
        if (!delta) return;
        event.preventDefault();
        const index = ARTICLE_LEVELS.indexOf(value);
        const next = ARTICLE_LEVELS[(index + delta + ARTICLE_LEVELS.length) % ARTICLE_LEVELS.length];
        onChange(next);
        containerRef.current?.querySelector(`[data-level="${next}"]`)?.focus();
    };

    return (
        <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
            {!compact && (
                <p
                    className="text-[13px] font-sans"
                    style={{ color: 'var(--r-muted, #6B6B6B)' }}
                    id="article-level-picker-label"
                >
                    {t('articles.chooseReadingLevel') || "O'qish darajasini tanlang — matn va lug'at shu darajaga moslashadi."}
                </p>
            )}
            <div
                ref={containerRef}
                role="radiogroup"
                aria-labelledby={compact ? undefined : 'article-level-picker-label'}
                aria-label={compact ? (t('articles.readingLevel') || "O'qish darajasi") : undefined}
                onKeyDown={handleKeyDown}
                className="grid grid-cols-3 gap-1 p-1 rounded-2xl border"
                style={{
                    backgroundColor: 'var(--r-surface, #F2F2F2)',
                    borderColor: 'var(--r-hairline, rgba(0,0,0,0.06))',
                }}
            >
                {ARTICLE_LEVELS.map((level) => {
                    const meta = ARTICLE_LEVEL_META[level];
                    const isActive = value === level;
                    const readTime = formatReadTimeLabel(readTimes[level]);
                    return (
                        <button
                            key={level}
                            data-level={level}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            tabIndex={isActive ? 0 : -1}
                            title={meta.title}
                            onClick={() => onChange(level)}
                            className={`relative rounded-xl text-center transition-colors font-sans focus-visible:outline-none focus-visible:ring-2 ${
                                compact ? 'px-3 py-1.5' : 'px-3 py-2'
                            }`}
                            style={{
                                color: isActive ? 'var(--r-accent, #1a7f4b)' : 'var(--r-muted, #6B6B6B)',
                                ['--tw-ring-color']: 'var(--r-focus, rgba(26,127,75,0.45))',
                            }}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="articleLevelIndicator"
                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                    aria-hidden
                                    className="absolute inset-0 rounded-xl shadow-sm"
                                    style={{
                                        backgroundColor: 'var(--r-paper, #ffffff)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                                        border: '1.5px solid var(--r-accent, #1a7f4b)',
                                    }}
                                />
                            )}
                            <span className={`relative block ${compact ? 'text-[13px]' : 'text-[14px]'} font-bold tracking-tight`}>
                                {meta.label}
                            </span>
                            {!compact && readTime && (
                                <span className="relative block text-[11px] font-medium mt-0.5 tabular-nums opacity-80">
                                    {readTime}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
