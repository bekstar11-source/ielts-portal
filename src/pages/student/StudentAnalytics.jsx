// O'quvchi analitikasi — "qaysi savollarda xato qilyapman va nega".
//
// `/statistics` band ballari va o'sish grafigini ko'rsatadi — ya'ni NATIJANI.
// Bu sahifa esa SABABNI ko'rsatadi: qaysi savol turlari qiyin, xatolar qanday
// xarakterda (imlo / ko'plik / so'z limiti / tanlov / vaqt yetmasligi) va aynan
// qaysi javoblar noto'g'ri bo'lgan.
//
// Bo'limlar tartibi ataylab shunday: umumiy ko'rsatkich → qaysi turda → nega →
// aynan qaysi savolda → nima qilish kerak. Har bir bo'lim oldingisining "nega"
// savoliga javob beradi.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Crosshair, ListX, Clock, AlertTriangle } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { useStudentAnalytics } from '../../hooks/useStudentAnalytics';
import { getTier, isStaff } from '../../utils/subscription';

import DashboardHeader from '../../components/dashboard/DashboardHeader';
import SiteFooter from '../../components/common/SiteFooter';
import AccuracyByType from '../../components/student/analytics/AccuracyByType';
import TrendStrip from '../../components/student/analytics/TrendStrip';
import PatternBreakdown from '../../components/student/analytics/PatternBreakdown';
import MistakeLog from '../../components/student/analytics/MistakeLog';
import SkillSplit from '../../components/student/analytics/SkillSplit';
import ActionPlan from '../../components/student/analytics/ActionPlan';
import { ProCurtain, UpgradeBanner } from '../../components/student/analytics/ui';
import { accuracyTone } from '../../components/student/analytics/format';

/** Qulf ostidagi namunaviy ko'rsatkichlar (haqiqiy ma'lumot emas). */
const TEASER_TILES = [
  { key: 'accuracy', value: 71, suffix: '%', hint: '386/544' },
  { key: 'mistakes', value: 158, hint: '21' },
  { key: 'weakest', value: '48%', hint: 'headings' },
  { key: 'time', value: 34, hint: '' }
];

function StatTile({ icon: Icon, label, value, suffix, tone, hint }) {
  return (
    <div className="rounded-2xl border border-warm-hairline bg-white p-5 dark:border-white/10 dark:bg-warm-dark-elevated">
      <div className="flex items-center gap-2 text-warm-muted dark:text-warm-on-dark-soft">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p
        className={`mt-3 text-3xl font-bold tracking-tight tabular-nums ${
          tone || 'text-warm-ink dark:text-warm-on-dark'
        }`}
      >
        {value}
        {suffix && <span className="ml-0.5 text-base font-semibold text-warm-muted">{suffix}</span>}
      </p>
      {hint && (
        <p className="mt-1 truncate text-xs font-medium text-warm-muted dark:text-warm-on-dark-soft">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function StudentAnalytics() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { t } = useTranslation();

  const hasPro = getTier(userData) === 'pro' || isStaff(userData);

  // Pro bo'lmaganda barcha bo'limlar namunaviy ma'lumot bilan qulflanadi — haqiqiy
  // jamlanmani yuklash shunchaki behuda Firestore o'qishi bo'lardi.
  //
  // Bu sahifa ataylab `useStudentData` ni CHAQIRMAYDI: u 50 ta natija hujjatini
  // va butun podcast urinishlari ro'yxatini olib kelardi, analitikaga esa
  // ularning hech biri kerak emas — hammasi jamlanmada.
  const analytics = useStudentAnalytics(user, hasPro);

  const loading = analytics.loading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-canvas dark:bg-warm-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-warm-hairline border-t-warm-primary dark:border-white/10 dark:border-t-warm-primary" />
      </div>
    );
  }

  const weakest = analytics.weakest[0] || null;
  const overallTone = accuracyTone(analytics.overallAccuracy).text;

  // `totalWrong` aniqlik foizi bilan bitta manbadan (typeStats) keladi — ikkalasi mos
  // bo'lishi kerak. typeStats yozilmagan eski natijalarda esa tasniflangan xatolar
  // sanog'i yagona manba (u ham jamlanmada — ro'yxatning o'zi kechroq yuklanadi).
  const mistakeCount = analytics.totalAnswered > 0 ? analytics.totalWrong : analytics.totalMistakes;

  // Pro bo'lmaganda kartochkalarga NAMUNAVIY sonlar beriladi. Blur — bu faqat CSS:
  // haqiqiy qiymat uzatilsa, u DOM'da ochiq qolib, qulfni ma'nosiz qilardi.
  const tiles = hasPro
    ? [
        {
          icon: Crosshair,
          label: t('analytics.kpiAccuracy'),
          value: analytics.overallAccuracy ?? '—',
          suffix: analytics.overallAccuracy !== null ? '%' : '',
          tone: overallTone,
          hint:
            analytics.totalAnswered > 0
              ? `${analytics.totalCorrect}/${analytics.totalAnswered} ${t('analytics.correctLabel')}`
              : t('analytics.noDataYet')
        },
        {
          icon: ListX,
          label: t('analytics.kpiMistakes'),
          value: mistakeCount,
          hint: `${analytics.testsAnalyzed} ${t('analytics.testsLabel')}`
        },
        {
          icon: AlertTriangle,
          label: t('analytics.kpiWeakest'),
          value: weakest ? `${weakest.accuracy}%` : '—',
          tone: weakest ? accuracyTone(weakest.accuracy).text : undefined,
          hint: weakest ? t(`questionTypes.${weakest.family}`) : t('analytics.noWeakSpot')
        },
        {
          icon: Clock,
          label: t('analytics.kpiAvgTime'),
          value: analytics.avgMinutes ?? '—',
          suffix: analytics.avgMinutes !== null ? t('analytics.minutesShort') : '',
          hint: t('analytics.kpiAvgTimeHint')
        }
      ]
    : [
        {
          icon: Crosshair,
          label: t('analytics.kpiAccuracy'),
          value: TEASER_TILES[0].value,
          suffix: '%',
          hint: `${TEASER_TILES[0].hint} ${t('analytics.correctLabel')}`
        },
        {
          icon: ListX,
          label: t('analytics.kpiMistakes'),
          value: TEASER_TILES[1].value,
          hint: `${TEASER_TILES[1].hint} ${t('analytics.testsLabel')}`
        },
        {
          icon: AlertTriangle,
          label: t('analytics.kpiWeakest'),
          value: TEASER_TILES[2].value,
          hint: t(`questionTypes.${TEASER_TILES[2].hint}`)
        },
        {
          icon: Clock,
          label: t('analytics.kpiAvgTime'),
          value: TEASER_TILES[3].value,
          suffix: t('analytics.minutesShort'),
          hint: t('analytics.kpiAvgTimeHint')
        }
      ];

  const kpiGrid = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-canvas font-sans selection:bg-warm-primary selection:text-white dark:bg-warm-dark">
      <DashboardHeader user={user} userData={userData} />

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        {/* Sarlavha */}
        <header className="analytics-fade">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group mb-5 inline-flex items-center gap-1 text-sm font-medium text-warm-muted transition-colors hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            {t('analytics.back')}
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-warm-ink dark:text-warm-on-dark md:text-4xl">
                {t('analytics.title')}
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
                {t('analytics.subtitle')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/statistics')}
              className="shrink-0 self-start rounded-xl border border-warm-hairline bg-white px-4 py-2.5 text-sm font-semibold text-warm-body transition-colors hover:bg-warm-surface dark:border-white/10 dark:bg-warm-dark-elevated dark:text-warm-on-dark-soft dark:hover:bg-white/5 md:self-auto"
            >
              {t('analytics.toProgress')}
            </button>
          </div>
        </header>

        {/* Pro bo'lmaganda: yagona tushuntirish va CTA. Quyidagi bo'limlar faqat qulf belgisi bilan. */}
        {!hasPro && (
          <div className="analytics-fade mt-8" style={{ animationDelay: '0.05s' }}>
            <UpgradeBanner
              title={t('analytics.bannerTitle')}
              subtitle={t('analytics.bannerSubtitle')}
              cta={t('analytics.unlockCTA')}
            />
          </div>
        )}

        {/* Umumiy ko'rsatkichlar */}
        <div className="analytics-fade mt-6 md:mt-8" style={{ animationDelay: '0.08s' }}>
          {hasPro ? (
            kpiGrid
          ) : (
            <ProCurtain title={t('analytics.lockedKpiTitle')}>{kpiGrid}</ProCurtain>
          )}
        </div>

        {/* Bo'limlar */}
        <div className="mt-6 space-y-5 md:mt-8 md:space-y-6">
          <div className="analytics-fade" style={{ animationDelay: '0.1s' }}>
            <AccuracyByType analytics={analytics} hasPro={hasPro} />
          </div>

          <div className="analytics-fade" style={{ animationDelay: '0.13s' }}>
            <TrendStrip analytics={analytics} hasPro={hasPro} />
          </div>

          <div className="analytics-fade" style={{ animationDelay: '0.16s' }}>
            <PatternBreakdown analytics={analytics} hasPro={hasPro} />
          </div>

          <div className="analytics-fade" style={{ animationDelay: '0.2s' }}>
            <MistakeLog analytics={analytics} hasPro={hasPro} />
          </div>

          <div className="analytics-fade" style={{ animationDelay: '0.25s' }}>
            <SkillSplit analytics={analytics} hasPro={hasPro} />
          </div>

          <div className="analytics-fade" style={{ animationDelay: '0.3s' }}>
            <ActionPlan analytics={analytics} hasPro={hasPro} />
          </div>
        </div>

        {analytics.error && (
          <p className="mt-6 text-xs text-warm-muted dark:text-warm-on-dark-soft">
            {t('analytics.loadError')}
          </p>
        )}
      </main>

      <SiteFooter />

      <style>{`
        @keyframes analytics-fade {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .analytics-fade {
          animation: analytics-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .analytics-fade { animation: none; }
        }
      `}</style>
    </div>
  );
}
