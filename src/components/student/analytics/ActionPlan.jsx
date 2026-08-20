// Tahlildan kelib chiqadigan aniq qadamlar + takrorlanayotgan xatolar.
//
// Sahifadagi eng katta xavf — o'quvchi raqamlarni ko'rib, nima qilishni bilmasdan
// chiqib ketishi. Bu bo'lim yuqoridagi barcha raqamlarni 2–3 ta bajariladigan
// jumlaga aylantiradi va mashq sahifasiga olib boradi.
//
// Qadamlar YOZILGAN TARTIBDA emas, ta'siriga qarab tuziladi: avval "deyarli to'g'ri"
// xatolar (eng tez natija), keyin eng kuchsiz savol turi, so'ng vaqt boshqaruvi.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Repeat, ArrowRight } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { Card, CardHeader, Eyebrow, ProBadge, ProCurtain } from './ui';

/** Qulf ostidagi namunaviy reja (haqiqiy tahlil emas). */
const TEASER_STEPS = [
  'Imlo va so‘z shakli mashqidan boshlang — xatolaringizning katta qismi shundan.',
  'Eng kuchsiz turlarga alohida mashq ajrating: haftada kamida 2 ta topshiriq.',
  'Savollarning bir qismi javobsiz qolyapti — vaqt taqsimotini mashq qiling.'
];
const TEASER_REPEATED = ['government', 'children', 'temperature', 'library'];

/**
 * Tahlil natijasidan qadamlar ro'yxatini quradi.
 * Har bir qadam faqat uni asoslaydigan ma'lumot bo'lgandagina qo'shiladi —
 * "umumiy maslahat" berilmaydi, aks holda ro'yxatga ishonch yo'qoladi.
 */
function buildSteps(analytics, t) {
  const steps = [];
  const { patterns, weakest, skills, totalMistakes } = analytics;

  if (patterns.nearMissShare !== null && patterns.nearMissShare >= 25) {
    steps.push({
      text: `${t('analytics.stepNearMissA')} ${patterns.nearMissShare}% ${t('analytics.stepNearMissB')}`
    });
  }

  // NOT GIVEN tuzog'i. Ataylab kuchsiz turlar ro'yxatidan OLDIN turadi: u
  // "shu turni ko'proq ishlang" degan umumiy maslahat emas, aniq qoida beradi
  // va IELTS'da eng ko'p ball yeydigan xato aynan shu.
  const ngOverclaim = patterns.counts?.ng_overclaim || 0;
  const ngMissed = patterns.counts?.ng_missed || 0;
  if (ngOverclaim + ngMissed >= 4) {
    const rule = ngOverclaim >= ngMissed
      ? t('analytics.stepNgOverclaim')
      : t('analytics.stepNgMissed');
    steps.push({ text: `${ngOverclaim + ngMissed} ${t('analytics.stepNgLead')} ${rule}` });
  }

  if (weakest.length > 0) {
    const names = weakest.map((r) => t(`questionTypes.${r.family}`)).join(', ');
    steps.push({ text: `${t('analytics.stepWeakA')} ${names} — ${t('analytics.stepWeakB')}` });
  }

  const blanks = patterns.counts?.no_answer || 0;
  if (patterns.total > 0 && blanks / patterns.total >= 0.15) {
    steps.push({ text: t('analytics.stepTiming') });
  }

  if (patterns.counts?.wrong_option >= 5) {
    steps.push({ text: t('analytics.stepOptions') });
  }

  // Ikkala bo'lim ham ishlangan va farq sezilarli bo'lsa — orqada qolganini ta'kidlaymiz.
  if (skills.length === 2) {
    const [a, b] = skills;
    if (a.accuracy !== null && b.accuracy !== null && Math.abs(a.accuracy - b.accuracy) >= 10) {
      const behind = a.accuracy < b.accuracy ? a : b;
      steps.push({
        text: `${t('analytics.stepSkillA')} ${t(`dashboard.${behind.skill}`)} (${behind.accuracy}%) — ${t('analytics.stepSkillB')}`
      });
    }
  }

  // Zaxira qadam jamlanmadagi songa tayanadi, `mistakes` ro'yxatiga emas: u
  // kechiktirilgan yuklanadi va foydalanuvchi "Xatolar jurnali"gacha
  // aylantirmaguncha bo'sh bo'ladi.
  if (steps.length === 0 && totalMistakes > 0) {
    steps.push({ text: t('analytics.stepFallback') });
  }

  return steps;
}

export default function ActionPlan({ analytics, hasPro }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps = hasPro ? buildSteps(analytics, t) : TEASER_STEPS.map((text) => ({ text }));
  const repeated = hasPro
    ? analytics.repeated
    : TEASER_REPEATED.map((word, i) => ({ correctText: word, count: 3 - (i % 2) }));

  // Pro'da asoslangan qadam topilmasa, bo'lim ko'rsatilmaydi — bo'sh reja
  // "tavsiya" bo'lib ko'rinadi va ro'yxatga ishonchni yo'qotadi.
  if (hasPro && steps.length === 0 && repeated.length === 0) return null;

  const body = (
    <div className="px-6 pb-6 md:px-8 md:pb-8">
      {steps.length > 0 && (
        <ol className="space-y-3.5">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warm-primary/10 text-xs font-bold text-warm-primary">
                {index + 1}
              </span>
              <p className="text-sm font-medium leading-relaxed text-warm-body dark:text-warm-on-dark">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      )}

      {repeated.length > 0 && (
        <div className="mt-7 border-t border-warm-hairline pt-6 dark:border-white/10">
          <Eyebrow>{t('analytics.repeatedTitle')}</Eyebrow>
          <p className="mt-1.5 text-xs text-warm-muted dark:text-warm-on-dark-soft">
            {t('analytics.repeatedHint')}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {repeated.map((row) => (
              <span
                key={row.correctText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-warm-hairline bg-warm-canvas px-2.5 py-1.5 text-xs font-semibold text-warm-body dark:border-white/10 dark:bg-white/5 dark:text-warm-on-dark"
              >
                {row.correctText}
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warm-warning">
                  <Repeat size={10} />
                  {row.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {hasPro && (
        <button
          type="button"
          onClick={() => navigate('/practice')}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-warm-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-warm-on-dark dark:text-warm-dark dark:hover:bg-white"
        >
          {t('analytics.practiceCTA')}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={ListChecks}
        title={t('analytics.planTitle')}
        hint={t('analytics.planHint')}
        badge={<ProBadge />}
      />

      {hasPro ? body : <ProCurtain title={t('analytics.lockedPlanTitle')}>{body}</ProCurtain>}
    </Card>
  );
}
