// Vaqt o'qi — "men umuman o'syapmanmi?".
//
// Sahifadagi qolgan bo'limlar hozirgi holatni ko'rsatadi: qaysi turda pastman,
// qanday xato qilaman. Bu bo'lim yagona bo'lib HARAKATNI ko'rsatadi. Ikkinchi
// vazifasi ham bor: yuqoridagi maslahatlar ishlayotganini isbotlash — "headings
// 48% → 71%" ni ko'rgan o'quvchi keyingi haftaga ham qaytadi.
//
// Band grafigi ATAYLAB yo'q: u `/statistics` da bor va bu sahifaning vazifasi
// natijani emas, sababni ko'rsatish. Shu sabab bu yerda savol turlari kesimidagi
// aniqlik chiziladi.
//
// Ma'lumot jamlanmada allaqachon bor, ya'ni bu bo'lim bironta qo'shimcha
// Firestore o'qishi talab qilmaydi.

import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { weekKeyToMonday } from '../../../utils/isoWeek';
import { toSparklineSegments } from '../../../utils/weeklyTrend';
import { Card, CardHeader, ProBadge, ProCurtain, EmptyState } from './ui';
import { accuracyTone, formatShortDate } from './format';

/** Qulf ostidagi namunaviy qatorlar (haqiqiy ma'lumot emas). */
const TEASER = {
  overall: { first: 58, last: 74, change: 16, values: [58, null, 61, 60, 66, null, 69, 68, 72, 71, null, 74] },
  families: [
    { id: 'headings', first: 41, last: 68, change: 27, values: [41, null, 46, 44, 52, null, 58, 55, 61, 64, null, 68] },
    { id: 'true_false_ng', first: 62, last: 71, change: 9, values: [62, 60, null, 64, 63, null, 67, 66, 70, null, 69, 71] },
    { id: 'completion', first: 75, last: 82, change: 7, values: [75, 74, 78, null, 77, 80, null, 79, 81, 80, null, 82] }
  ]
};

/**
 * Chiziq uchidagi nuqta.
 *
 * `<circle>` ATAYLAB ishlatilmaydi: bu SVG `preserveAspectRatio="none"` bilan
 * chiziladi, ya'ni x o'qi konteyner kengligiga qarab o'nlab marta cho'ziladi va
 * aylana yassi tasmaga aylanib qoladi. `vectorEffect` faqat qalam enini saqlaydi,
 * geometriyani emas. Nol uzunlikdagi dumaloq uchli chiziq esa shaklini
 * geometriyadan emas, qalam enidan oladi — cho'zilishdan qat'i nazar dumaloq
 * bo'lib qoladi.
 */
function Dot({ point, size, stroke }) {
  return (
    <line
      x1={point.x}
      y1={point.y}
      x2={point.x}
      y2={point.y}
      className={stroke}
      stroke="currentColor"
      strokeWidth={size}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

/**
 * Uzilishlarni HURMAT QILADIGAN sparkline.
 *
 * Mashq qilinmagan hafta `null` bo'lib keladi va chiziq o'sha joyda uziladi.
 * Nuqtalarni to'g'ridan-to'g'ri ulash eng oson yo'l bo'lardi, lekin u yolg'on
 * gapiradi: uch hafta dam olgan o'quvchi uzluksiz o'sayotgandek ko'rinadi.
 */
function Sparkline({ values, stroke }) {
  const segments = toSparklineSegments(values);
  const lastPoint = segments.length > 0 ? segments[segments.length - 1].slice(-1)[0] : null;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {/* 50% chizig'i — nuqtalarni o'qish uchun tayanch. */}
      <line
        x1="0" y1="50" x2="100" y2="50"
        className="stroke-warm-hairline dark:stroke-white/10"
        strokeWidth="1"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />

      {segments.map((segment, i) =>
        segment.length === 1 ? (
          // Yolg'iz nuqta chiziq bo'la olmaydi, lekin yo'qolib ketmasligi ham kerak.
          <Dot key={i} point={segment[0]} size={4} stroke={stroke} />
        ) : (
          <polyline
            key={i}
            points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            className={stroke}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      )}

      {/* Oxirgi nuqta ta'kidlanadi — ko'z avval "hozir qayerdaman"ni qidiradi. */}
      {lastPoint && <Dot point={lastPoint} size={6} stroke={stroke} />}
    </svg>
  );
}

/** O'zgarish belgisi. 3 foizdan kichik siljish shovqin — ko'rsatilmaydi. */
function ChangeChip({ change }) {
  if (change === null || change === undefined || Math.abs(change) < 3) return null;
  const up = change > 0;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
        up ? 'bg-warm-success/10 text-warm-success' : 'bg-warm-error/10 text-warm-error'
      }`}
    >
      {up ? '+' : ''}
      {change}
    </span>
  );
}

/** Chiziq rangi o'zgarish yo'nalishiga bog'lanadi — belgi va rang bir narsani aytadi. */
function strokeFor(change) {
  if (change >= 3) return 'text-warm-success';
  if (change <= -3) return 'text-warm-error';
  return 'text-warm-muted-soft';
}

function FamilyCell({ series, label }) {
  return (
    <div className="rounded-xl border border-warm-hairline bg-warm-canvas p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-bold text-warm-body dark:text-warm-on-dark">
          {label}
        </span>
        <ChangeChip change={series.change} />
      </div>

      <div className="mt-2.5 h-10">
        <Sparkline values={series.points.map((p) => p.value)} stroke={strokeFor(series.change)} />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2 tabular-nums">
        <span className="text-[11px] font-medium text-warm-muted-soft dark:text-warm-on-dark-soft">
          {series.first}%
        </span>
        <span className={`text-sm font-bold ${accuracyTone(series.last).text}`}>
          {series.last}%
        </span>
      </div>
    </div>
  );
}

export default function TrendStrip({ analytics, hasPro }) {
  const { t, lang } = useTranslation();
  const trend = analytics.trend;

  // Namunaviy qatorlarni haqiqiy qatorlar shakliga keltiramiz — `Sparkline` va
  // `FamilyCell` ikkala holatda bir xil kod bilan ishlaydi.
  const asSeries = (row) => ({ ...row, points: row.values.map((value) => ({ value })) });

  const overall = hasPro ? trend?.overall : asSeries(TEASER.overall);
  const families = hasPro ? trend?.families || [] : TEASER.families.map(asSeries);

  const axisLabel = (index) => {
    if (!hasPro || !trend?.keys?.length) return '';
    const monday = weekKeyToMonday(trend.keys[index]);
    return monday ? formatShortDate(monday, lang) : '';
  };

  const body = (
    <div className="px-6 pb-6 md:px-8 md:pb-8">
      {overall && (
        <div className="rounded-xl border border-warm-hairline bg-white p-4 dark:border-white/10 dark:bg-warm-dark-elevated">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-warm-muted dark:text-warm-on-dark-soft">
              {t('analytics.trendOverall')}
            </span>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className={`text-2xl font-bold ${accuracyTone(overall.last).text}`}>
                {overall.last}%
              </span>
              <ChangeChip change={overall.change} />
            </div>
          </div>

          <div className="mt-3 h-20">
            <Sparkline
              values={overall.points.map((p) => p.value)}
              stroke={strokeFor(overall.change)}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-medium tabular-nums text-warm-muted-soft dark:text-warm-on-dark-soft">
            <span>{axisLabel(0)}</span>
            <span>{t('analytics.trendWeeks')}</span>
            <span>{axisLabel(overall.points.length - 1)}</span>
          </div>
        </div>
      )}

      {families.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((series) => (
            <FamilyCell
              key={series.id}
              series={series}
              label={t(`questionTypes.${series.id}`)}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
        {t('analytics.trendNote')}
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={TrendingUp}
        title={t('analytics.trendTitle')}
        hint={t('analytics.trendHintLong')}
        badge={<ProBadge />}
      />

      {!hasPro ? (
        <ProCurtain title={t('analytics.lockedTrendTitle')}>{body}</ProCurtain>
      ) : !trend?.hasData ? (
        <EmptyState
          icon={Sparkles}
          title={t('analytics.emptyTrendTitle')}
          subtitle={t('analytics.emptyTrendSubtitle')}
        />
      ) : (
        body
      )}
    </Card>
  );
}
