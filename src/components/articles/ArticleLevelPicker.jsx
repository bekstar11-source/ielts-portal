import React from 'react';
import { motion } from 'framer-motion';
import { ARTICLE_LEVELS, ARTICLE_LEVEL_META } from '../../utils/articleLevels';

const colorClasses = {
    emerald: {
        active: 'bg-emerald-600 text-white shadow-emerald-600/25',
        idle: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
        ring: 'ring-emerald-500/40',
    },
    blue: {
        active: 'bg-blue-600 text-white shadow-blue-600/25',
        idle: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
        ring: 'ring-blue-500/40',
    },
    violet: {
        active: 'bg-violet-600 text-white shadow-violet-600/25',
        idle: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20',
        ring: 'ring-violet-500/40',
    },
};

export default function ArticleLevelPicker({ value, onChange, readTimes = {}, compact = false }) {
    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {!compact && (
                <p className="text-[13px] text-[#6B6B6B] dark:text-neutral-400 font-sans">
                    O&apos;qish darajasini tanlang — matn va lug&apos;at shu darajaga mos keladi.
                </p>
            )}
            <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-[#F2F2F2] dark:bg-neutral-900/80 border border-black/[0.04] dark:border-white/[0.06]">
                {ARTICLE_LEVELS.map((level) => {
                    const meta = ARTICLE_LEVEL_META[level];
                    const colors = colorClasses[meta.color];
                    const isActive = value === level;
                    return (
                        <button
                            key={level}
                            type="button"
                            onClick={() => onChange(level)}
                            className={`relative flex-1 min-w-[88px] px-4 py-2.5 rounded-xl text-center transition-all font-sans ${
                                isActive
                                    ? `${colors.active} shadow-lg ring-2 ${colors.ring}`
                                    : colors.idle
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="articleLevelIndicator"
                                    className="absolute inset-0 rounded-xl bg-inherit"
                                    style={{ zIndex: 0 }}
                                />
                            )}
                            <span className="relative z-10 block text-sm font-bold">{meta.label}</span>
                            {!compact && readTimes[level] && (
                                <span
                                    className={`relative z-10 block text-[10px] font-medium mt-0.5 ${
                                        isActive ? 'text-white/80' : 'opacity-70'
                                    }`}
                                >
                                    {readTimes[level]}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
