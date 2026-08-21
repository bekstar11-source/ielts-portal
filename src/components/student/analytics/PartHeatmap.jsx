// Testning qayerida qulayapman — passage va bo'limlar kesimi.
//
// Savol turlari kesimi "qaysi ko'nikma yetishmayapti" deb aytadi. Bu bo'lim
// boshqa savolga javob beradi va ikkalasi bir-birini almashtira olmaydi: bir xil
// savol turi P1 da 90%, P3 da 45% bo'lishi mumkin, va bu bilim emas, chidamlilik
// yoki vaqt muammosi.
//
// Kartochka oxirida VAQT TAQSIMOTI turadi: javoblarning test davomiyligi bo'ylab
// qanday tarqalgani. U ham xuddi shu savolga javob beradi — "qayerda qulayapman" —
// faqat o'lchov o'qi joy emas, vaqt. Alohida bo'lim ochmaslik ataylab: sahifa
// allaqachon uzun va ikkala ma'lumot birga o'qilganda kuchliroq.
//
// KATAKLARNING O'ZI YETARLI EMAS. "P3 eng past" — bu deyarli har bir o'quvchida
// shunday, chunki P3 eng qiyin qilib tuzilgan. Shuning uchun kataklar ostida
// XULOSA qatori turadi va u faqat o'quvchining o'z o'rtachasidan sezilarli
// og'ish bo'lgandagina chiqadi.

import React from 'react';
import { LayoutGrid, Sparkles, Clock } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { Card, CardHeader, ProBadge, ProCurtain, EmptyState } from './ui';
import { accuracyTone } from './format';

/** Qulf ostidagi namunaviy ma'lumot (haqiqiy emas). */
const TEASER = {
  rows: [
    {
      skill: 'reading',
      parts: [
        { index: 1, total: 13, accuracy: 82, reliable: true },
        { index: 2, total: 13, accuracy: 69, reliable: true },
        { index: 3, total: 14, accuracy: 54, reliable: true }
      ],
      insight: null
    },
    {
      skill: 'listening',
      parts: [
        { index: 1, total: 10, accuracy: 61, reliable: true },
        { index: 2, total: 10, accuracy: 80, reliable: true },
        { index: 3, total: 10, accuracy: 74, reliable: true },
        { index: 4, total: 10, accuracy: 45, reliable: true }
      ],
      insight: { kind: 'finalDrop', part: 4, gap: 20 }
    }
  ]
};

const TEASER_TIMING = {
  tests: 6,
  rushedTests: 4,
  ranOutTests: 2,
  shares: [21, 22, 23, 34],
  hasRushHabit: true,
  hasRanOutHabit: false
};

/** Reading'da "P", Listening'da "S" — o'quvchi materiallarda shu belgilarni ko'radi. */
const PART_PREFIX = { reading: 'P', listening: 'S' };

function PartCell({ part, skill, t }) {
  const tone = accuracyTone(part.accuracy);
  const empty = part.total === 0;

  return (
    <div
      className={`flex-1 rounded-xl border p-3 text-center ${
        empty
          ? 'border-dashed border-warm-hairline bg-transparent dark:border-white/10'
          : 'border-warm-hairline bg-white dark:border-white/10 dark:bg-warm-dark-elevated'
      }`}
      title={empty ? t('analytics.partNotDone') : `${part.total - part.wrong}/${part.total}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-warm-muted-soft">
        {PART_PREFIX[skill] || ''}
        {part.index}
      </p>

      <p className={`mt-1.5 text-xl font-bold tabular-nums ${empty ? 'text-warm-muted-soft' : tone.text}`}>
        {empty ? '—' : `${part.accuracy}%`}
      </p>

      {/* Rang foizni beradi, chiziq esa namuna hajmini eslatib turadi:
          10 tadan 6 tasi va 40 tadan 24 tasi bir xil rangda, lekin bir xil
          vaznda emas. */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-warm-surface dark:bg-white/10">
        {!empty && (
          <div
            className={`h-full rounded-full ${tone.bar} ${part.reliable ? '' : 'opacity-40'}`}
            style={{ width: `${Math.max(part.accuracy, 3)}%` }}
          />
        )}
      </div>

      <p className="mt-1.5 text-[10px] font-medium tabular-nums text-warm-muted dark:text-warm-on-dark-soft">
        {empty ? t('analytics.partNotDoneShort') : `${part.total} ${t('analytics.questionsShort')}`}
      </p>
    </div>
  );
}

function SkillRow({ row, t }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-warm-ink dark:text-warm-on-dark">
          {t(`dashboard.${row.skill}`)}
        </span>
      </div>

      <div className="mt-2.5 flex gap-2">
        {row.parts.map((part) => (
          <PartCell key={part.index} part={part} skill={row.skill} t={t} />
        ))}
      </div>

      {row.insight && (
        <p className="mt-2.5 rounded-lg border border-warm-warning/20 bg-warm-warning/[0.07] px-3 py-2 text-xs font-medium leading-relaxed text-warm-body dark:text-warm-on-dark">
          <strong className="text-warm-ink dark:text-warm-on-dark">
            {PART_PREFIX[row.skill]}
            {row.insight.part}
          </strong>{' '}
          {t(`analytics.insight.${row.insight.kind}`).replace('{gap}', row.insight.gap)}
        </p>
      )}
    </div>
  );
}

/** Javoblarning test davomiyligi bo'ylab taqsimoti. */
function TimingStrip({ timing, t }) {
  return (
    <div className="border-t border-warm-hairline pt-5 dark:border-white/10">
      <p className="inline-flex items-center gap-2 text-sm font-bold text-warm-ink dark:text-warm-on-dark">
        <Clock size={15} className="text-warm-primary" />
        {t('analytics.timingTitle')}
      </p>

      <div className="mt-3 flex gap-1.5">
        {timing.shares.map((share, index) => {
          // Oxirgi chorak ko'zga tashlanadi: aynan u yerdagi to'planish
          // "vaqt yetmadi" degan da'voning belgisi.
          const isLast = index === timing.shares.length - 1;
          const heavy = isLast && share >= 30;
          return (
            <div key={index} className="flex-1">
              <div className="h-12 overflow-hidden rounded-lg bg-warm-surface dark:bg-white/10">
                <div
                  className={`h-full w-full origin-bottom rounded-lg transition-transform duration-700 ease-out ${
                    heavy ? 'bg-warm-warning' : 'bg-warm-primary/45'
                  }`}
                  style={{ transform: `scaleY(${Math.max(share, 2) / 100})` }}
                />
              </div>
              <p className="mt-1.5 text-center text-[10px] font-bold tabular-nums text-warm-muted dark:text-warm-on-dark-soft">
                {share}%
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-1 flex justify-between text-[10px] font-medium text-warm-muted-soft">
        <span>{t('analytics.timingStart')}</span>
        <span>{t('analytics.timingEnd')}</span>
      </p>

      {(timing.hasRushHabit || timing.hasRanOutHabit) && (
        <p className="mt-3 rounded-lg border border-warm-warning/20 bg-warm-warning/[0.07] px-3 py-2 text-xs font-medium leading-relaxed text-warm-body dark:text-warm-on-dark">
          {t(timing.hasRanOutHabit ? 'analytics.timingRanOut' : 'analytics.timingRushed')
            .replace('{count}', timing.hasRanOutHabit ? timing.ranOutTests : timing.rushedTests)
            .replace('{tests}', timing.tests)}
        </p>
      )}
    </div>
  );
}

export default function PartHeatmap({ analytics, hasPro }) {
  const { t } = useTranslation();
  const heatmap = hasPro ? analytics.partHeatmap : TEASER;
  const timing = hasPro ? analytics.timing : TEASER_TIMING;

  const body = (
    <div className="space-y-6 px-6 pb-6 md:px-8 md:pb-8">
      {(heatmap?.rows || []).map((row) => (
        <SkillRow key={row.skill} row={row} t={t} />
      ))}

      {timing && <TimingStrip timing={timing} t={t} />}

      <p className="text-[11px] leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
        {t('analytics.partNote')}
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={LayoutGrid}
        title={t('analytics.partTitle')}
        hint={t('analytics.partHint')}
        badge={<ProBadge />}
      />

      {!hasPro ? (
        <ProCurtain title={t('analytics.lockedPartTitle')}>{body}</ProCurtain>
      ) : !heatmap?.hasData && !timing ? (
        <EmptyState
          icon={Sparkles}
          title={t('analytics.emptyPartTitle')}
          subtitle={t('analytics.emptyPartSubtitle')}
        />
      ) : (
        body
      )}
    </Card>
  );
}
