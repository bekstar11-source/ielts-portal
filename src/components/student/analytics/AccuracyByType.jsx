// Savol turlari kesimidagi aniqlik.
//
// Eng past aniqlikdagi turlar yuqorida turadi — sahifa ochilganda ko'z birinchi
// tushadigan joy eng muhim muammo bo'lishi kerak.

import React from 'react';
import { Target, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { Card, CardHeader, ProBadge, ProCurtain, EmptyState } from './ui';
import { accuracyTone } from './format';

/** Qulf ostida ko'rsatiladigan namunaviy qatorlar (haqiqiy ma'lumot emas). */
const TEASER_ROWS = [
  { family: 'headings', accuracy: 48, total: 22, wrong: 11, reliable: true, trend: -6 },
  { family: 'matching', accuracy: 61, total: 18, wrong: 7, reliable: true, trend: null },
  { family: 'completion', accuracy: 74, total: 40, wrong: 10, reliable: true, trend: 4 },
  { family: 'true_false_ng', accuracy: 82, total: 27, wrong: 5, reliable: true, trend: null },
  { family: 'multiple_choice', accuracy: 91, total: 33, wrong: 3, reliable: true, trend: 8 }
];

function TrendChip({ trend, t }) {
  if (trend === null || trend === undefined || Math.abs(trend) < 3) return null;

  const up = trend > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
        up ? 'bg-warm-success/10 text-warm-success' : 'bg-warm-error/10 text-warm-error'
      }`}
      title={t('analytics.trendHint')}
    >
      <Icon size={11} />
      {up ? '+' : ''}
      {trend}
    </span>
  );
}

function TypeRow({ row, t }) {
  const tone = accuracyTone(row.accuracy);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-warm-body dark:text-warm-on-dark">
          {t(`questionTypes.${row.family}`)}
        </span>
        <TrendChip trend={row.trend} t={t} />
      </div>

      <div className="col-span-2 order-last h-2 overflow-hidden rounded-full bg-warm-surface dark:bg-white/10 sm:order-none sm:col-span-1">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone.bar}`}
          style={{ width: `${Math.max(row.accuracy ?? 0, 2)}%` }}
        />
      </div>

      <div className="flex items-baseline justify-end gap-3">
        <span className={`text-sm font-bold tabular-nums ${tone.text}`}>
          {row.accuracy ?? '—'}%
        </span>
        <span className="w-24 text-right text-xs font-medium tabular-nums text-warm-muted dark:text-warm-on-dark-soft">
          {row.reliable
            ? `${row.wrong}/${row.total} ${t('analytics.wrongLabel')}`
            : t('analytics.fewQuestions')}
        </span>
      </div>
    </div>
  );
}

export default function AccuracyByType({ analytics, hasPro }) {
  const { t } = useTranslation();

  const body = (rows) => (
    <div className="space-y-5 px-6 pb-6 md:px-8 md:pb-8">
      {rows.map((row) => (
        <TypeRow key={row.family} row={row} t={t} />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={Target}
        title={t('analytics.byTypeTitle')}
        hint={t('analytics.byTypeHint')}
        badge={<ProBadge />}
      />

      {!hasPro ? (
        <ProCurtain title={t('analytics.lockedTitle')}>{body(TEASER_ROWS)}</ProCurtain>
      ) : !analytics.hasTypeData ? (
        <EmptyState
          icon={Sparkles}
          title={t('analytics.emptyTypeTitle')}
          subtitle={t('analytics.emptyTypeSubtitle')}
        />
      ) : (
        <>
          {analytics.weakest.length > 0 && (
            <div className="mx-6 mb-6 rounded-xl border border-warm-primary/15 bg-warm-primary/[0.06] p-4 md:mx-8">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-warm-primary">
                {t('analytics.focusNow')}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-warm-body dark:text-warm-on-dark">
                {analytics.weakest
                  .map((r) => `${t(`questionTypes.${r.family}`)} — ${r.accuracy}%`)
                  .join(' · ')}
              </p>
            </div>
          )}

          {body(analytics.typeRows)}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-warm-hairline px-6 py-5 dark:border-white/10 md:px-8">
            <span className="text-xs font-medium text-warm-muted dark:text-warm-on-dark-soft">
              {t('analytics.overall')}:{' '}
              <strong className="text-warm-ink dark:text-warm-on-dark">
                {analytics.overallAccuracy}%
              </strong>{' '}
              ({analytics.totalCorrect}/{analytics.totalAnswered})
            </span>
            {analytics.strongest && (
              <span className="text-xs font-medium text-warm-success">
                {t('analytics.strongest')}: {t(`questionTypes.${analytics.strongest.family}`)} (
                {analytics.strongest.accuracy}%)
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
