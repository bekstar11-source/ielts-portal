import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Target, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useMistakeAnalysis } from '../../hooks/useMistakeAnalysis';
import { getTier, isStaff } from '../../utils/subscription';

/**
 * Savol turlari kesimidagi xatolar tahlili — Pro tarif funksiyasi.
 *
 * Standard foydalanuvchiga blok KO'RINADI (namunaviy ma'lumot bilan, xiralashtirilgan
 * holda) — bu eng kuchli upgrade sababi. Haqiqiy ma'lumot faqat Pro'da uzatiladi.
 */

/** Qulf ostida ko'rsatiladigan namunaviy qatorlar (haqiqiy ma'lumot emas). */
const TEASER_ROWS = [
  { family: 'headings', accuracy: 48, total: 22 },
  { family: 'matching', accuracy: 61, total: 18 },
  { family: 'completion', accuracy: 74, total: 40 },
  { family: 'true_false_ng', accuracy: 82, total: 27 },
  { family: 'multiple_choice', accuracy: 91, total: 33 }
];

function accuracyColor(accuracy) {
  if (accuracy === null || accuracy === undefined) return 'bg-warm-muted-soft';
  if (accuracy < 60) return 'bg-warm-error';
  if (accuracy < 75) return 'bg-warm-warning';
  return 'bg-warm-success';
}

function AccuracyRow({ label, accuracy, total, wrong, reliable, t }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-sm font-semibold text-warm-body dark:text-warm-on-dark truncate">
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-warm-surface dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${accuracyColor(accuracy)}`}
          style={{ width: `${Math.max(accuracy ?? 0, 2)}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-sm font-bold text-warm-ink dark:text-warm-on-dark tabular-nums">
        {accuracy ?? '—'}%
      </span>
      <span className="w-28 shrink-0 text-right text-xs font-medium text-warm-muted dark:text-warm-on-dark-soft tabular-nums">
        {reliable === false
          ? t('mistakeAnalysis.fewQuestions')
          : `${wrong}/${total} ${t('mistakeAnalysis.wrongLabel')}`}
      </span>
    </div>
  );
}

/** Sarlavha + Pro yorlig'i — uchala holat (qulf / bo'sh / to'liq) uchun umumiy qobiq. */
function Shell({ t, children }) {
  return (
    <div className="bg-white dark:bg-warm-dark-elevated rounded-xl p-8 shadow-sm border border-warm-hairline dark:border-white/10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-warm-ink dark:text-warm-on-dark flex items-center gap-2">
            <Target size={20} className="text-warm-primary" />
            {t('mistakeAnalysis.title')}
          </h3>
          <p className="text-sm text-warm-muted dark:text-warm-on-dark-soft mt-1 font-medium">
            {t('mistakeAnalysis.subtitle')}
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-warm-primary/10 text-warm-primary text-[10px] font-black uppercase tracking-widest">
          Pro
        </span>
      </div>
      {children}
    </div>
  );
}

export default function MistakeAnalysis({ userData, results }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const analysis = useMistakeAnalysis(results);

  const hasPro = getTier(userData) === 'pro' || isStaff(userData);

  // ── Qulflangan ko'rinish ──────────────────────────────────────────────────
  if (!hasPro) {
    return (
      <Shell t={t}>
        <div className="relative">
          <div className="space-y-4 select-none pointer-events-none blur-[5px] opacity-70" aria-hidden="true">
            {TEASER_ROWS.map((row) => (
              <AccuracyRow
                key={row.family}
                label={t(`questionTypes.${row.family}`)}
                accuracy={row.accuracy}
                total={row.total}
                wrong={Math.round((row.total * (100 - row.accuracy)) / 100)}
                reliable
                t={t}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="w-11 h-11 rounded-full bg-warm-primary/10 flex items-center justify-center mb-3">
              <Lock size={18} className="text-warm-primary" />
            </div>
            <p className="text-sm font-bold text-warm-ink dark:text-warm-on-dark max-w-xs">
              {t('mistakeAnalysis.lockedTitle')}
            </p>
            <p className="text-xs text-warm-muted dark:text-warm-on-dark-soft mt-1 max-w-sm">
              {t('mistakeAnalysis.lockedSubtitle')}
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="mt-4 px-5 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary text-sm font-bold transition-colors"
            >
              {t('mistakeAnalysis.unlockCTA')}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Ma'lumot hali yetarli emas ────────────────────────────────────────────
  if (!analysis.hasData) {
    return (
      <Shell t={t}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles size={22} className="text-warm-muted-soft mb-3" />
          <p className="text-sm font-semibold text-warm-body dark:text-warm-on-dark">
            {t('mistakeAnalysis.emptyTitle')}
          </p>
          <p className="text-xs text-warm-muted dark:text-warm-on-dark-soft mt-1 max-w-sm">
            {t('mistakeAnalysis.emptySubtitle')}
          </p>
        </div>
      </Shell>
    );
  }

  // ── To'liq ko'rinish ──────────────────────────────────────────────────────
  return (
    <Shell t={t}>
      {analysis.weakest.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-warm-primary/[0.06] border border-warm-primary/15">
          <p className="text-xs font-black uppercase tracking-widest text-warm-primary mb-2">
            {t('mistakeAnalysis.focusNow')}
          </p>
          <p className="text-sm text-warm-body dark:text-warm-on-dark font-medium leading-relaxed">
            {analysis.weakest
              .map((r) => `${t(`questionTypes.${r.family}`)} (${r.accuracy}%)`)
              .join(' · ')}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {analysis.rows.map((row) => (
          <AccuracyRow
            key={row.family}
            label={t(`questionTypes.${row.family}`)}
            accuracy={row.accuracy}
            total={row.total}
            wrong={row.wrong}
            reliable={row.reliable}
            t={t}
          />
        ))}
      </div>

      <div className="mt-6 pt-5 border-t border-warm-hairline dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-xs font-medium text-warm-muted dark:text-warm-on-dark-soft">
          {t('mistakeAnalysis.overall')}:{' '}
          <strong className="text-warm-ink dark:text-warm-on-dark">{analysis.overallAccuracy}%</strong>{' '}
          ({analysis.totalCorrect}/{analysis.totalAnswered})
        </span>
        {analysis.strongest && (
          <span className="text-xs font-medium text-warm-success flex items-center gap-1.5">
            <TrendingUp size={13} />
            {t('mistakeAnalysis.strongest')}: {t(`questionTypes.${analysis.strongest.family}`)} (
            {analysis.strongest.accuracy}%)
          </span>
        )}
      </div>
    </Shell>
  );
}
