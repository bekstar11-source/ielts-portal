// Reading va Listening kesimidagi aniqlik.
//
// Savol turlari ikkala bo'limda ham uchraydi (completion ham Reading'da, ham
// Listening'da), shuning uchun turlar jadvali qaysi bo'lim og'irroq kelayotganini
// ko'rsatmaydi. Bu bo'lim aynan shuni ajratadi.

import React from 'react';
import { BookOpen, Headphones } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { Card, CardHeader, ProBadge, ProCurtain } from './ui';
import { accuracyTone } from './format';

const SKILL_ICON = { reading: BookOpen, listening: Headphones };

/** Qulf ostida ko'rsatiladigan namunaviy ma'lumot (haqiqiy emas). */
const TEASER_SKILLS = [
  { skill: 'reading', tests: 12, total: 316, correct: 214, accuracy: 68 },
  { skill: 'listening', tests: 9, total: 264, correct: 201, accuracy: 76 }
];

/** Aylanma progress — ikki qiymatni yonma-yon solishtirish uchun eng ixcham shakl. */
function AccuracyDial({ accuracy }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = ((accuracy ?? 0) / 100) * circumference;
  const tone = accuracyTone(accuracy);

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-warm-surface dark:stroke-white/10"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className={`${tone.text} transition-[stroke-dasharray] duration-700 ease-out`}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-warm-ink dark:text-warm-on-dark">
          {accuracy ?? '—'}
          <span className="text-xs font-semibold text-warm-muted">%</span>
        </span>
      </div>
    </div>
  );
}

export default function SkillSplit({ analytics, hasPro }) {
  const { t } = useTranslation();

  // Pro'da ma'lumot bo'lmasa bo'lim keraksiz. Pro bo'lmaganda esa bo'lim HAR DOIM
  // ko'rinadi (xiralashgan holda) — aks holda tarifni ko'tarish nima berishi noma'lum qoladi.
  if (hasPro && (!analytics.skills || analytics.skills.length === 0)) return null;

  const body = (skills) => (
    <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 md:px-8 md:pb-8">
      {skills.map((skill) => {
        const Icon = SKILL_ICON[skill.skill] || BookOpen;
        return (
          <div
            key={skill.skill}
            className="flex items-center gap-5 rounded-xl border border-warm-hairline p-5 dark:border-white/10"
          >
            <AccuracyDial accuracy={skill.accuracy} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-warm-ink dark:text-warm-on-dark">
                <Icon size={15} className="text-warm-muted" />
                {t(`dashboard.${skill.skill}`)}
              </p>
              <p className="mt-1 text-xs font-medium tabular-nums text-warm-muted dark:text-warm-on-dark-soft">
                {skill.correct}/{skill.total} {t('analytics.correctLabel')}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-warm-muted-soft dark:text-warm-on-dark-soft">
                {skill.tests} {t('analytics.testsLabel')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={BookOpen}
        title={t('analytics.skillsTitle')}
        hint={t('analytics.skillsHint')}
        badge={<ProBadge />}
      />

      {hasPro ? (
        body(analytics.skills)
      ) : (
        <ProCurtain title={t('analytics.lockedSkillsTitle')}>{body(TEASER_SKILLS)}</ProCurtain>
      )}
    </Card>
  );
}
