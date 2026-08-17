import React from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { TrendingUp } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { AUTH_HEADING_FONT } from './authTheme';

/**
 * Auth sahifasining o'ng ustunidagi vizual panel (lg+ ekranlarda).
 *
 * NEGA RASM EMAS, KOD: `public/` dagi tayyor rasmlar (auth-bg.png — to'q neon
 * render, landing/img*.png — begona sayt skrinshoti) issiq qog'oz temaga
 * to'g'ri kelmasdi va login sahifasi ikkiga bo'linib ko'rinardi. Bu panel
 * mahsulotning o'zini ko'rsatadi, har qanday ekranda tiniq va qo'shimcha
 * yuklanadigan bayt talab qilmaydi.
 *
 * Ichidagi raqamlar — namunaviy (demo), real foydalanuvchi ma'lumoti emas.
 */

const SKILLS = [
  { key: 'showcaseSkillListening', score: 7.5 },
  { key: 'showcaseSkillReading', score: 8.0 },
  { key: 'showcaseSkillWriting', score: 6.5 },
  { key: 'showcaseSkillSpeaking', score: 7.0 },
];

/** Sparkline nuqtalari — 0..100 (x) / 0..40 (y, yuqoriga o'sadi). */
const TREND = [4, 10, 8, 18, 15, 26, 24, 34];

export default function AuthShowcase() {
  const { t } = useTranslation();

  const path = TREND.map((v, i) => {
    const x = (i / (TREND.length - 1)) * 100;
    const y = 40 - v;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      aria-hidden="true"
      className="relative w-full aspect-[4/5] max-h-[680px] rounded-[28px] overflow-hidden
                 border border-[#E7DFD1] bg-gradient-to-b from-[#F2ECE0] to-[#EBE3D3]"
    >
      {/* Fon: sust to'r + iliq nur */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(30,27,22,0.045) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(30,27,22,0.045) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#D97757]/20 blur-3xl" />

      <div className="relative h-full flex flex-col justify-center gap-4 p-8 xl:p-10">
        {/* Band score kartasi */}
        <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 shadow-[0_10px_30px_-18px_rgba(30,27,22,0.35)]">
          <p className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#A9A395]">
            {t('auth.showcaseBandLabel')}
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span
              className="text-[52px] leading-none font-bold text-[#1E1B16] tracking-[-0.03em]"
              style={AUTH_HEADING_FONT}
            >
              7.5
            </span>
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#D97757]/10 px-2.5 py-1 text-[12px] font-semibold text-[#A34A2A]">
              <TrendingUp size={13} />
              +1.0
            </span>
          </div>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-4 w-full h-16">
            <path d={`${path} L100,40 L0,40 Z`} fill="#D97757" fillOpacity="0.10" />
            <path
              d={path}
              fill="none"
              stroke="#D97757"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="mt-1 text-[12px] font-medium text-[#938D80]">
            {t('auth.showcaseTrend')}
          </p>
        </div>

        {/* Ko'nikmalar bo'yicha taqsimot */}
        <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 space-y-3.5 shadow-[0_10px_30px_-18px_rgba(30,27,22,0.35)]">
          {SKILLS.map(({ key, score }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-[70px] shrink-0 text-[12.5px] font-semibold text-[#6B6559]">
                {t(`auth.${key}`)}
              </span>
              <span className="flex-1 h-1.5 rounded-full bg-[#F1EBE0] overflow-hidden">
                <span
                  className="block h-full rounded-full bg-[#1E1B16]"
                  style={{ width: `${(score / 9) * 100}%` }}
                />
              </span>
              <span className="w-7 text-right text-[12.5px] font-bold text-[#1E1B16] tabular-nums">
                {score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Izoh */}
        <div className="px-1 pt-1">
          <h2
            className="text-[19px] font-bold text-[#1E1B16] tracking-[-0.01em]"
            style={AUTH_HEADING_FONT}
          >
            {t('auth.showcaseTitle')}
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#6B6559]">
            {t('auth.showcaseText')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
