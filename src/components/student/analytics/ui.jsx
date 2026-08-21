// Analitika sahifasining umumiy qurilish bloklari.
//
// Sahifada 6 ta bo'lim bor va ularning har biri bir xil qobiqqa (sarlavha, tavsif,
// hoshiya, Pro qulfi) muhtoj. Bu qobiq har bo'limda qaytarilsa, keyinchalik bitta
// joyda o'zgargan kartochka boshqalaridan farq qilib qolardi.

import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Bo'lim ustidagi mayda katta harfli yorliq. */
export function Eyebrow({ children, className = '' }) {
  return (
    <p
      className={`text-[10px] font-black uppercase tracking-[0.16em] text-warm-muted-soft dark:text-warm-on-dark-soft ${className}`}
    >
      {children}
    </p>
  );
}

/** Sahifadagi barcha bo'limlar uchun yagona kartochka. */
export function Card({ children, className = '' }) {
  return (
    <section
      className={`bg-white dark:bg-warm-dark-elevated rounded-2xl border border-warm-hairline dark:border-white/10 shadow-[0_1px_2px_rgba(20,20,19,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

/** Kartochka sarlavhasi: ikonka + nom + izoh + o'ngdagi qo'shimcha. */
export function CardHeader({ icon: Icon, title, hint, badge, action }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 md:px-8 md:pt-8">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight text-warm-ink dark:text-warm-on-dark">
          {Icon && <Icon size={18} className="shrink-0 text-warm-primary" />}
          <span className="truncate">{title}</span>
          {badge}
        </h2>
        {hint && (
          <p className="mt-1.5 text-sm leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
            {hint}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Pro yorlig'i. */
export function ProBadge() {
  return (
    <span className="shrink-0 rounded-full bg-warm-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-warm-primary">
      Pro
    </span>
  );
}

/**
 * Pro bo'lmagan foydalanuvchiga: kontent xiralashgan holda KO'RINADI.
 *
 * Bo'limni butunlay yashirish o'quvchiga nimadan mahrumligini aytmaydi —
 * xiralashgan haqiqiy tuzilma esa aytadi.
 *
 * ⚠️ `children` sifatida HAQIQIY ma'lumot uzatilmaydi. Blur — bu faqat CSS,
 * ya'ni DOM'dagi matn ochiq qoladi va uni ko'rish uchun brauzer konsoli yetarli.
 * Har bir chaqiruv joyida namunaviy (TEASER) qatorlar berilishi shart.
 *
 * CTA tugmasi ataylab YO'Q: sahifada oltita qulflangan bo'lim bor va har birida
 * tugma bo'lsa, sahifa reklama taxtasiga aylanadi. Yagona tugma yuqoridagi
 * `UpgradeBanner` da turadi.
 */
export function ProCurtain({ title, children }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[6px] opacity-50" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-primary/10">
          <Lock size={15} className="text-warm-primary" />
        </div>
        <p className="max-w-xs text-sm font-bold text-warm-ink dark:text-warm-on-dark">{title}</p>
      </div>
    </div>
  );
}

/**
 * Pro bo'lmagan foydalanuvchi uchun sahifa boshidagi yagona tushuntirish va CTA.
 * Qulflangan bo'limlar faqat qulf belgisini ko'rsatadi — izoh shu yerda bir marta.
 */
export function UpgradeBanner({ title, subtitle, cta }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-warm-primary/20 bg-warm-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warm-primary/12">
          <Lock size={17} className="text-warm-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-warm-ink dark:text-warm-on-dark">{title}</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
            {subtitle}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/pricing')}
        className="shrink-0 rounded-xl bg-warm-primary px-5 py-2.5 text-sm font-bold text-warm-on-primary transition-colors hover:bg-warm-primary-active"
      >
        {cta}
      </button>
    </div>
  );
}

/**
 * Ma'lumot hali yig'ilmagan bo'limlar uchun.
 *
 * `have` va `need` berilsa, "ma'lumot yo'q" o'rniga PROGRESS ko'rsatiladi.
 * Farqi katta: birinchisi qulfdek tuyuladi va o'quvchi bo'limni ishlamayapti
 * deb o'ylaydi, ikkinchisi esa aniq masofani aytadi — "yana 2 ta test".
 */
export function EmptyState({ icon: Icon, title, subtitle, have, need, unitLabel }) {
  const showProgress = Number.isFinite(have) && Number.isFinite(need) && need > 0;
  const done = showProgress ? Math.min(have, need) : 0;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && <Icon size={22} className="mb-3 text-warm-muted-soft" />}
      <p className="text-sm font-semibold text-warm-body dark:text-warm-on-dark">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
        {subtitle}
      </p>

      {showProgress && (
        <div className="mt-5 w-full max-w-[16rem]">
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: need }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < done ? 'bg-warm-primary' : 'bg-warm-surface dark:bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] font-bold tabular-nums text-warm-muted dark:text-warm-on-dark-soft">
            {done} / {need}
            {unitLabel ? ` ${unitLabel}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
