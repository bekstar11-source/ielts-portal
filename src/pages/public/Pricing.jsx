import React, { useState } from 'react';
import { Check, X, Zap, Shield, ChevronDown, BookOpen, Headphones, BarChart3, Sparkles, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardModals from '../../components/dashboard/DashboardModals';
import SiteFooter from '../../components/common/SiteFooter';
import { useTranslation } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';
import { useSeo } from '../../hooks/useSeo';
import {
  getSignupDiscount,
  discountAppliesTo,
  applySignupDiscount,
  formatSom,
} from '../../utils/subscription';
import { getPlanPrice, perMonthPrice } from '../../utils/pricing';

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const FeatureValue = ({ value }) => {
  const { t } = useTranslation();
  if (value === true) return <Check size={17} className="text-warm-primary mx-auto" strokeWidth={2.5} />;
  if (value === false) return <X size={17} className="text-warm-hairline dark:text-white/15 mx-auto" strokeWidth={2} />;
  if (value === 'Cheklangan' || value === 'Limited') return <span className="text-[13px] font-semibold text-warm-body dark:text-warm-on-dark-soft text-center block">{t('pricing.limited')}</span>;
  return <span className="text-[13px] font-semibold text-warm-body dark:text-warm-on-dark-soft text-center block">{value}</span>;
};

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');

  useSeo({
    title: "Narxlar — ENGLEV obuna tariflari",
    description:
      "ENGLEV tariflari: bepul sinov, Standard va Pro. Oylik va 3 oylik obuna, " +
      "o'quv markazlari uchun guruh tariflari.",
    path: "/pricing",
  });

  // Ilgari uid o'rniga `'guest'` yuborilardi: o'quvchi to'lovni qilib bo'lgach
  // bot `users/guest` hujjatini topolmay xato berardi. Endi avval login.
  const openPaymentBot = (planId) => {
    if (!user?.uid) {
      navigate('/login', { state: { redirectTo: '/pricing', reason: 'subscription' } });
      return;
    }
    const params = `${user.uid}_${planId}_${billing}`;
    window.open(`https://t.me/ielts_portal_auth_bot?start=${params}`, '_blank');
  };
  const [openFaq, setOpenFaq] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { t } = useTranslation();

  // ─── Ro'yxatdan o'tish chegirmasi ────────────────────────────────────────
  //
  // `discount` — taklif umuman bormi. `discountActive` — u AYNAN hozir
  // tanlangan to'lov davriga tegishlimi. Chegirma 1 oyni qoplaydi, 3 oylik
  // paket esa 3 oyni yeydi — shuning uchun u FAQAT 1 oylikda ishlaydi.
  // 3 oylik tanlangan bo'lsa narxni o'zgartirmay, ishlaydigan davrni
  // bir bosishda taklif qilamiz (eski `["tri"]` takliflarda — aksincha).
  const discount = getSignupDiscount(userData);
  const discountActive = discountAppliesTo(discount, billing);
  const discountBilling = discount?.eligibleBillings?.[0] || 'monthly';
  const altBilling = billing === 'monthly' ? 'tri' : 'monthly';
  const discountAltActive = discountAppliesTo(discount, altBilling);

  /** Kartada ko'rsatiladigan narx (chegirma hisobga olingan holda). */
  const getDisplayPrice = (plan) => {
    const base = billing === 'monthly' ? plan.monthlyPrice : plan.triPrice;
    if (!discountActive || plan.id === 'free') return { base, final: base, discounted: false };
    return { base, final: applySignupDiscount(base, discount.percent), discounted: true };
  };

  const FEATURES = [
    {
      category: 'Reading',
      icon: BookOpen,
      items: [
        { label: t('pricing.readingPassage'), free: t('pricing.freeReadingLimit'), standard: t('pricing.unlimited'), pro: t('pricing.unlimited') },
        { label: t('pricing.fullReading'), free: false, standard: false, pro: true },
        { label: t('pricing.readingSets'), free: false, standard: false, pro: true },
      ]
    },
    {
      category: 'Listening',
      icon: Headphones,
      items: [
        { label: t('pricing.listeningSection'), free: t('pricing.freeListeningLimit'), standard: t('pricing.unlimited'), pro: t('pricing.unlimited') },
        { label: t('pricing.fullListening'), free: false, standard: false, pro: true },
        { label: t('pricing.listeningSets'), free: false, standard: false, pro: true },
        { label: t('pricing.audioPlayer'), free: true, standard: true, pro: true },
      ]
    },
    {
      category: t('pricing.analytics'),
      icon: BarChart3,
      items: [
        { label: t('pricing.detailedAnalysis'), free: false, standard: true, pro: true },
        { label: t('pricing.progressStats'), free: false, standard: true, pro: true },
        { label: t('pricing.mistakeAnalysis'), free: false, standard: false, pro: true },
        { label: t('pricing.weakAreas'), free: false, standard: false, pro: true },
        { label: t('pricing.bandForecast'), free: false, standard: false, pro: true },
      ]
    },
    {
      category: t('pricing.mockPremium'),
      icon: Zap,
      items: [
        { label: t('pricing.fullMock'), free: false, standard: t('pricing.standardMockLimit'), pro: t('pricing.proMockLimit') },
        { label: t('pricing.aiWriting'), free: false, standard: t('pricing.standardWritingLimit'), pro: t('pricing.proWritingLimit') },
      ]
    },
    {
      category: t('pricing.freeContent'),
      icon: Sparkles,
      items: [
        { label: t('pricing.podcasts'), free: true, standard: true, pro: true },
        { label: t('pricing.articles'), free: true, standard: true, pro: true },
        { label: t('pricing.wordbank'), free: true, standard: true, pro: true },
      ]
    },
  ];

  const PLANS = [
    {
      id: 'free',
      name: t('common.free'),
      monthlyPrice: 0,
      triPrice: 0,
      period: t('pricing.som'),
      desc: t('pricing.freeDesc'),
      cta: t('pricing.freeCTA'),
      ctaStyle: 'border border-warm-hairline dark:border-white/15 text-warm-ink dark:text-warm-on-dark hover:bg-warm-surface dark:hover:bg-white/5',
      highlight: false,
      badge: null,
    },
    {
      id: 'standard',
      name: t('common.standard'),
      // Narxlar `src/utils/pricing.js` dan — u `functions/pricing.js` bilan
      // qo'lda sinxron bo'lgan yagona klient manbasi. Ilgari raqam shu yerda
      // qo'lda yozilgan edi va landing page'dagi nusxasi bilan mos emasdi.
      monthlyPrice: getPlanPrice('standard', 'monthly'),
      triPrice: getPlanPrice('standard', 'tri'),
      period: t('pricing.som'),
      desc: t('pricing.standardDesc'),
      cta: t('pricing.standardCTA'),
      ctaStyle: 'bg-warm-ink dark:bg-white text-white dark:text-warm-ink hover:bg-warm-body-strong dark:hover:bg-warm-canvas',
      highlight: false,
      badge: null,
    },
    {
      id: 'pro',
      name: t('common.pro'),
      monthlyPrice: getPlanPrice('pro', 'monthly'),
      triPrice: getPlanPrice('pro', 'tri'),
      period: t('pricing.som'),
      desc: t('pricing.proDesc'),
      cta: t('pricing.proCTA'),
      ctaStyle: 'bg-warm-primary text-warm-on-primary hover:bg-warm-primary-active',
      highlight: true,
      badge: t('pricing.mostPopular'),
    },
  ];

  const faqs = [
    { q: t('pricing.faq1Q'), a: t('pricing.faq1A') },
    { q: t('pricing.faq2Q'), a: t('pricing.faq2A') },
    { q: t('pricing.faq3Q'), a: t('pricing.faq3A') },
    { q: t('pricing.faq4Q'), a: t('pricing.faq4A') },
  ];

  return (
    <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans">
      {user ? (
        <DashboardHeader
          user={user}
          userData={userData}
          activeTab="pricing"
          onLogoutClick={() => setShowLogoutConfirm(true)}
        />
      ) : (
        <Navbar />
      )}

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-14 bg-warm-surface dark:bg-warm-dark-soft overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 dark:opacity-10"
          style={{ backgroundImage: 'radial-gradient(#d8cfc2 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warm-primary/10 dark:bg-warm-primary/20 border border-warm-primary/20 text-[11px] font-bold text-warm-primary uppercase tracking-wider mb-5">
            <Zap size={11} fill="currentColor" className="animate-pulse" /> Premium
          </div>
          <h1 className="text-[36px] md:text-[52px] font-bold text-warm-ink dark:text-warm-on-dark leading-[1.1] tracking-tight mb-4">
            {t('pricing.heroTitle')}
          </h1>
          <p className="text-[15px] md:text-[17px] text-warm-muted dark:text-warm-on-dark-soft font-medium max-w-xl mx-auto leading-relaxed">
            {t('pricing.heroSubtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-warm-card dark:bg-white/5 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${billing === 'monthly' ? 'bg-warm-canvas dark:bg-warm-dark-elevated shadow-sm text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setBilling('tri')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-1.5 ${billing === 'tri' ? 'bg-warm-canvas dark:bg-warm-dark-elevated shadow-sm text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}
            >
              {t('pricing.triMonthly')}
              <span className="text-[10px] bg-warm-success/15 text-warm-success font-black px-1.5 py-0.5 rounded-full">−20%</span>
            </button>
          </div>

          {/* ── Chegirma banneri ──
              Ikki holat: chegirma qo'llangan, yoki chegirma bor-u shu davrga
              tegishli emas. Ikkinchisida o'quvchini quruq qaytarmaymiz —
              bitta bosishda ishlaydigan davrga o'tkazamiz. */}
          {discount && (
            <div className="mt-5 flex flex-col items-center gap-2">
              {discountActive ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-success/10 border border-warm-success/25 text-[13px] font-bold text-warm-success">
                  <Gift size={14} />
                  {discount.percent}% chegirmangiz qo'llandi
                  <span className="opacity-70 font-semibold">
                    · {discount.daysLeft} kun qoldi
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setBilling(discountAltActive ? altBilling : discountBilling)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-success/10 border border-warm-success/25 text-[13px] font-bold text-warm-success hover:bg-warm-success/20 transition-colors"
                >
                  <Gift size={14} />
                  Sizda {discount.percent}% chegirma bor — {(discountAltActive ? altBilling : discountBilling) === 'tri' ? '3 oylik' : '1 oylik'} paketda amal qiladi
                  <span className="opacity-70">→</span>
                </button>
              )}

              {/* Chegirma bir necha oyga tarqalgan — buni AYTISH shart. Aks holda
                  o'quvchi uni bir martalik deb o'ylaydi va 2-oyda to'liq narx
                  ko'rib, obunani uzaytirmay ketadi. */}
              {discount.cyclesTotal > 1 && (
                <p className="text-[12px] font-semibold text-warm-muted dark:text-warm-on-dark-soft text-center">
                  {discount.started
                    ? `Chegirmangizdan yana ${discount.cyclesRemaining} oy qoldi — to'lovlar ketma-ket bo'lsa ${discount.percent}% saqlanadi.`
                    : `Chegirma dastlabki ${discount.cyclesTotal} oyga amal qiladi — har oylik to'lovingiz ${discount.percent}% arzon bo'ladi.`}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── PLAN CARDS ── */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              layout
              className={`relative rounded-2xl p-7 flex flex-col border ${
                plan.highlight
                  ? 'bg-warm-ink dark:bg-warm-dark-elevated border-warm-ink dark:border-warm-primary/30 text-warm-on-dark shadow-xl'
                  : 'bg-warm-canvas dark:bg-warm-dark-elevated border-warm-hairline dark:border-white/10'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warm-primary text-warm-on-primary text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-[13px] font-black uppercase tracking-widest mb-4 ${plan.highlight ? 'text-warm-primary' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}>
                  {plan.name}
                </h3>
                {(() => {
                  const { base, final, discounted } = getDisplayPrice(plan);
                  return (
                    <>
                      {discounted && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[15px] font-bold line-through ${plan.highlight ? 'text-warm-on-dark-soft' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}>
                            {formatSom(base)}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-warm-success/15 text-warm-success uppercase tracking-wider">
                            −{discount.percent}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-end gap-1">
                        <span className={`text-[42px] font-bold leading-none tracking-tighter ${plan.highlight ? 'text-warm-on-dark' : 'text-warm-ink dark:text-warm-on-dark'}`}>
                          {formatSom(final)}
                        </span>
                        <div className="mb-1.5">
                          <span className={`text-[14px] font-bold ${plan.highlight ? 'text-warm-on-dark-soft' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}> {plan.period}</span>
                          <p className={`text-[11px] font-bold ${plan.highlight ? 'text-warm-on-dark-soft' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}>
                            {billing === 'monthly' ? t('pricing.perMonth') : t('pricing.perTriMonth')}
                          </p>
                        </div>
                      </div>

                      {/* ── Oylik ekvivalent ──
                          "3 oylik −20%" yorlig'i chegirma bilan YOLG'ON
                          taqqoslash beradi: 89 000 / 3 = 29 667, chegirmali
                          1 oylik esa 24 500. Ya'ni chegirmasi bor o'quvchi
                          "arzonroq" deb 3 oylikni tanlaydi, natijada ham
                          ko'proq to'laydi, ham chegirmasini yo'qotadi
                          (u faqat 1 oylikda ishlaydi). */}
                      {billing === 'tri' && plan.id !== 'free' && (
                        <p className={`mt-1.5 text-[11px] font-bold ${plan.highlight ? 'text-warm-on-dark-soft' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}>
                          {t('pricing.perMonthEquivalent').replace('{price}', formatSom(perMonthPrice(final, 'tri')))}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <p className={`text-[13px] leading-relaxed mb-6 ${plan.highlight ? 'text-warm-on-dark-soft' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}>
                {plan.desc}
              </p>

              {(() => {
                const isCurrent = userData?.accountType === plan.id || (plan.id === 'pro' && userData?.isPro);
                const isDownGrade = plan.id === 'standard' && (userData?.accountType === 'pro' || userData?.isPro);
                const isFree = plan.id === 'free' && (!userData?.accountType || userData?.accountType === 'public');
                
                let ctaText = plan.cta;
                let isDisabled = false;
                
                if (isCurrent || (isFree && !userData?.accountType)) {
                  ctaText = t('pricing.currentPlan');
                  isDisabled = true;
                } else if (isDownGrade) {
                  ctaText = t('pricing.proExists');
                  isDisabled = true;
                }

                return (
                  <button
                    disabled={isDisabled}
                    onClick={() => {
                      if (plan.id !== 'free') {
                        openPaymentBot(plan.id);
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-[14px] transition-all mt-auto ${
                      isDisabled ? 'opacity-50 cursor-default' : 'hover:scale-[1.02] active:scale-[0.98]'
                    } ${
                      plan.highlight
                        ? 'bg-warm-primary text-warm-on-primary hover:bg-warm-primary-active'
                        : plan.ctaStyle
                    }`}
                  >
                    {ctaText}
                  </button>
                );
              })()}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── COMPARE TABLE ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-[28px] md:text-[36px] font-bold text-warm-ink dark:text-warm-on-dark tracking-tight mb-2">{t('pricing.compareTitle')}</h2>
        <p className="text-warm-muted dark:text-warm-on-dark-soft text-[15px] mb-10">{t('pricing.compareSubtitle')}</p>

        <div className="rounded-2xl border border-warm-hairline dark:border-white/10 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-4 bg-warm-surface dark:bg-white/5 border-b border-warm-hairline dark:border-white/10">
            <div className="col-span-1 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-warm-muted dark:text-warm-on-dark-soft">{t('pricing.feature')}</div>
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`px-4 py-4 text-center text-[13px] font-black tracking-wider ${
                  plan.highlight ? 'text-warm-primary' : 'text-warm-body dark:text-warm-on-dark'
                }`}
              >
                {plan.name}
                {plan.highlight && <Zap size={12} fill="currentColor" className="inline ml-1 -mt-0.5" />}
              </div>
            ))}
          </div>

          {/* Feature Rows */}
          {FEATURES.map((group, gIdx) => {
            const Icon = group.icon;
            return (
              <div key={gIdx}>
                {/* Category Header */}
                <div className="grid grid-cols-4 bg-warm-surface/60 dark:bg-white/[0.03] border-b border-warm-hairline dark:border-white/10">
                  <div className="col-span-4 px-6 py-2.5 flex items-center gap-2">
                    <Icon size={14} className="text-warm-primary" strokeWidth={2} />
                    <span className="text-[11px] font-black text-warm-muted dark:text-warm-on-dark-soft uppercase tracking-widest">{group.category}</span>
                  </div>
                </div>

                {/* Feature Items */}
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className={`grid grid-cols-4 border-b border-warm-hairline-soft dark:border-white/5 hover:bg-warm-surface/50 dark:hover:bg-white/[0.03] transition-colors ${
                      iIdx === group.items.length - 1 ? 'border-b border-warm-hairline dark:border-white/10' : ''
                    }`}
                  >
                    <div className="col-span-1 px-6 py-3.5">
                      <span className="text-[13px] text-warm-body dark:text-warm-on-dark font-medium">{item.label}</span>
                    </div>
                    <div className="px-4 py-3.5 flex items-center justify-center">
                      <FeatureValue value={item.free} />
                    </div>
                    <div className="px-4 py-3.5 flex items-center justify-center">
                      <FeatureValue value={item.standard} />
                    </div>
                    <div className="px-4 py-3.5 flex items-center justify-center">
                      <FeatureValue value={item.pro} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <h2 className="text-[24px] font-bold text-warm-ink dark:text-warm-on-dark tracking-tight mb-6">{t('pricing.faqTitle')}</h2>
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-warm-hairline dark:border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-warm-surface dark:hover:bg-white/5 transition-colors"
              >
                <span className="text-[14px] font-semibold text-warm-ink dark:text-warm-on-dark">{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-warm-muted dark:text-warm-on-dark-soft transition-transform duration-300 flex-shrink-0 ml-3 ${openFaq === idx ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-[13px] text-warm-muted dark:text-warm-on-dark-soft leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl bg-warm-ink dark:bg-warm-dark-elevated overflow-hidden px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(#cc785c 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} fill="currentColor" className="text-warm-primary" />
              <span className="text-[11px] font-black text-warm-primary uppercase tracking-widest">{t('pricing.trialBadge')}</span>
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold text-warm-on-dark leading-tight tracking-tight">
              {t('pricing.trialTitle')}
            </h2>
            <p className="text-warm-on-dark-soft text-[14px] mt-2">{t('pricing.trialSubtitle')}</p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3">
            <button
              onClick={() => openPaymentBot('pro')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary font-bold text-[15px] shadow-xl shadow-black/20 hover:scale-[1.03] active:scale-[0.97] transition-all whitespace-nowrap"
            >
              <Zap size={16} fill="currentColor" className="animate-pulse" />
              {t('pricing.proCTA')}
            </button>
            <span className="text-[11px] text-warm-on-dark-soft flex items-center gap-1.5">
              <Shield size={11} /> {t('pricing.trialFooter')}
            </span>
          </div>
        </div>
      </section>

      <DashboardModals
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        confirmLogout={logout}
      />
      <SiteFooter />
    </div>
  );
}
