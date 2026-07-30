import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../context/LanguageContext';

// Icons for the hero's pill badges, ported 1:1 from the imported dc.html mockup
const HeroBadgeIcon = ({ icon, color }) => {
  switch (icon) {
    case 'check':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
          <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'question':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
          <text x="8" y="11.5" fontSize="9" textAnchor="middle" fill={color} fontFamily="Inter">?</text>
        </svg>
      );
    case 'list':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="3" y="2" width="10" height="12" rx="1.5" stroke={color} strokeWidth="1.5" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'card':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="3.5" y="3" width="9" height="11" rx="1.2" stroke={color} strokeWidth="1.5" />
          <rect x="5.5" y="1.5" width="5" height="2.5" rx="0.6" fill={color} />
        </svg>
      );
    default:
      return null;
  }
};

const HeroPill = ({ badge, align }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: badge.delay }}
    className={`flex items-center gap-2.5 bg-warm-canvas dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 rounded-full px-4 py-2 w-max shadow-sm ${align === 'end' ? 'self-end' : 'self-start'}`}
  >
    <HeroBadgeIcon icon={badge.icon} color={badge.color} />
    <span className="text-[13px] font-medium text-warm-ink dark:text-warm-on-dark whitespace-nowrap">{badge.text}</span>
  </motion.div>
);

// Center icon for the hero: open book for reading, headphones for listening — line-art to match the pill icons
const HeroCenterIcon = ({ isReading }) => (
  isReading ? (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none" className="shrink-0">
      <path d="M13 3v20M13 3c-2.5 2-6 2.5-9 2v16c3 0.5 6.5 0 9-2M13 3c2.5 2 6 2.5 9 2v16c-3 0.5-6.5 0-9-2" stroke="#cc785c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none" className="shrink-0">
      <path d="M4 14v-1a9 9 0 0 1 18 0v1" stroke="#cc785c" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="2" y="14" width="6" height="8" rx="2" stroke="#cc785c" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="18" y="14" width="6" height="8" rx="2" stroke="#cc785c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
);

export default function PracticeHero({ activeTab, totalCount, filteredCount, subType }) {
  const { t } = useTranslation();

  // Support both reading and listening
  if (activeTab !== 'reading' && activeTab !== 'listening') return null;

  const isReading = activeTab === 'reading';
  const suffix = subType === 'parts' ? ' (Parts)' : subType === 'full' ? ' (Full)' : '';

  const leftBadges = isReading
    ? [
        { text: 'True / False / NG', icon: 'check', color: '#5db872', delay: 0.15 },
        { text: 'Multiple Choice', icon: 'question', color: '#cc785c', delay: 0.3 },
      ]
    : [
        { text: 'Matching', icon: 'check', color: '#5db872', delay: 0.15 },
        { text: 'Multiple Choice', icon: 'question', color: '#cc785c', delay: 0.3 },
      ];
  const rightBadges = isReading
    ? [
        { text: 'Matching Headings', icon: 'list', color: '#cc785c', delay: 0.2 },
        { text: 'Gap Fill', icon: 'card', color: '#e8a55a', delay: 0.35 },
      ]
    : [
        { text: 'Map / Plan / Diagram', icon: 'list', color: '#cc785c', delay: 0.2 },
        { text: 'Gap Fill', icon: 'card', color: '#e8a55a', delay: 0.35 },
      ];

  const titleText = isReading ? t('practice.heroTitle') : t('practice.heroTitleListening');
  const subtitleText = isReading ? t('practice.heroSubtitle') : t('practice.heroSubtitleListening');

  return (
    <div className="w-full bg-warm-surface dark:bg-warm-dark-elevated border-b border-warm-hairline dark:border-white/5">
      <div className="max-w-[1440px] mx-auto px-6 py-10 md:py-14 flex items-center justify-between gap-8">
        <div className="hidden lg:flex flex-col gap-4 shrink-0">
          {leftBadges.map((b, i) => <HeroPill key={`l-${i}`} badge={b} align="start" />)}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-2.5 max-w-[560px] mx-auto"
        >
          <div className="flex items-center gap-3">
            <HeroCenterIcon isReading={isReading} />
            <h1 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold tracking-tight text-warm-ink dark:text-warm-on-dark">
              {titleText}{suffix}
            </h1>
          </div>
          <p className="text-warm-body-sm md:text-warm-body-md text-warm-muted dark:text-warm-on-dark-soft leading-relaxed">
            {subtitleText}
          </p>
        </motion.div>

        <div className="hidden lg:flex flex-col gap-4 items-end shrink-0">
          {rightBadges.map((b, i) => <HeroPill key={`r-${i}`} badge={b} align="end" />)}
        </div>
      </div>
    </div>
  );
}
