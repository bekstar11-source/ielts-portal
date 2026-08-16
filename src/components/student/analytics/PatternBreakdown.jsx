// Xatoning SABABI kesimidagi tahlil.
//
// "Matching Headings da 48%" — muammoni ko'rsatadi, yechimni emas. Bu bo'lim
// xatolarni sababiga qarab ajratadi (imlo / ko'plik / so'z limiti / tanlov /
// javobsiz / tushunmagan), chunki har bir sabab butunlay boshqa mashqni talab qiladi.
//
// "Deyarli to'g'ri" ulushi alohida ta'kidlanadi: agar xatolarning yarmi imlo bo'lsa,
// o'quvchi Reading ni emas, yozilishni mashq qilishi kerak — bu band ni eng tez
// ko'taradigan yo'l.

import React from 'react';
import { Stethoscope, Sparkles } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { Card, CardHeader, ProBadge, ProCurtain, EmptyState } from './ui';

/** Har bir sabab uchun rang — "deyarli to'g'ri"lar iliq, mazmuniy xatolar qizil. */
const PATTERN_TONE = {
  spelling: 'bg-warm-accent-amber',
  singular_plural: 'bg-warm-warning',
  word_form: 'bg-warm-accent-teal',
  extra_words: 'bg-warm-primary',
  wrong_option: 'bg-warm-error',
  no_answer: 'bg-warm-muted-soft',
  off_target: 'bg-warm-body'
};

const TEASER_ROWS = [
  { pattern: 'spelling', count: 14, share: 32, nearMiss: true },
  { pattern: 'wrong_option', count: 11, share: 25, nearMiss: false },
  { pattern: 'off_target', count: 8, share: 18, nearMiss: false },
  { pattern: 'singular_plural', count: 6, share: 14, nearMiss: true },
  { pattern: 'no_answer', count: 5, share: 11, nearMiss: false }
];

function PatternRow({ row, t }) {
  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex w-12 shrink-0 flex-col items-center pt-0.5">
        <span className="text-xl font-bold leading-none tabular-nums text-warm-ink dark:text-warm-on-dark">
          {row.count}
        </span>
        <span className="mt-1 text-[10px] font-semibold tabular-nums text-warm-muted-soft dark:text-warm-on-dark-soft">
          {row.share}%
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-warm-ink dark:text-warm-on-dark">
            {t(`mistakePatterns.${row.pattern}.label`)}
          </span>
          {row.nearMiss && (
            <span className="rounded-md bg-warm-success/10 px-1.5 py-0.5 text-[10px] font-bold text-warm-success">
              {t('analytics.nearMissTag')}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
          {t(`mistakePatterns.${row.pattern}.advice`)}
        </p>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-warm-surface dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              PATTERN_TONE[row.pattern] || 'bg-warm-muted-soft'
            }`}
            style={{ width: `${Math.max(row.share, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PatternBreakdown({ analytics, hasPro }) {
  const { t } = useTranslation();
  const { patterns } = analytics;

  const body = (rows) => (
    <div className="divide-y divide-warm-hairline px-6 pb-6 dark:divide-white/10 md:px-8 md:pb-8">
      {rows.map((row) => (
        <PatternRow key={row.pattern} row={row} t={t} />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={Stethoscope}
        title={t('analytics.patternsTitle')}
        hint={t('analytics.patternsHint')}
        badge={<ProBadge />}
      />

      {!hasPro ? (
        <ProCurtain title={t('analytics.lockedPatternsTitle')}>{body(TEASER_ROWS)}</ProCurtain>
      ) : patterns.total === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t('analytics.emptyMistakesTitle')}
          subtitle={t('analytics.emptyMistakesSubtitle')}
        />
      ) : (
        <>
          {patterns.nearMissShare !== null && patterns.nearMissShare >= 25 && (
            <div className="mx-6 mb-6 rounded-xl border border-warm-success/20 bg-warm-success/[0.07] p-4 md:mx-8">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-warm-success">
                {t('analytics.quickWin')}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-warm-body dark:text-warm-on-dark">
                {t('analytics.nearMissLead')}{' '}
                <strong className="text-warm-ink dark:text-warm-on-dark">
                  {patterns.nearMissShare}%
                </strong>{' '}
                ({patterns.nearMissCount}/{patterns.total}) — {t('analytics.nearMissTail')}
              </p>
            </div>
          )}

          {body(patterns.rows)}
        </>
      )}
    </Card>
  );
}
