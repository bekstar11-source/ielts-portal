import React, { useState } from 'react';
import { Check, X, Zap, Shield, ChevronDown, BookOpen, Headphones, PenTool, Mic, BarChart3, Trophy, MessageCircle, Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardModals from '../components/dashboard/DashboardModals';
import SiteFooter from '../components/common/SiteFooter';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    category: 'Reading',
    icon: BookOpen,
    items: [
      { label: 'Reading Passage testlar', free: 'Cheklangan', standard: true, pro: true },
      { label: 'Full Reading testlar', free: false, standard: true, pro: true },
      { label: 'Reading Sets (to\'plam)', free: false, standard: true, pro: true },
      { label: 'Natijalarni tahlili', free: true, standard: true, pro: true },
    ]
  },
  {
    category: 'Listening',
    icon: Headphones,
    items: [
      { label: 'Listening Section testlar', free: 'Cheklangan', standard: true, pro: true },
      { label: 'Listening Sets (to\'plam)', free: false, standard: true, pro: true },
      { label: 'Audio player & Progress', free: true, standard: true, pro: true },
    ]
  },
  {
    category: 'Study Roadmap',
    icon: Trophy,
    items: [
      { label: '7 kunlik Study Route', free: true, standard: true, pro: true },
      { label: 'Full Personal Roadmap', free: false, standard: false, pro: true },
      { label: 'Daily Goals & Tasks', free: true, standard: true, pro: true },
    ]
  },
  {
    category: 'AI & Premium',
    icon: Zap,
    items: [
      { label: 'AI Writing Evaluation', free: false, standard: false, pro: true },
      { label: 'AI Speaking Examiner', free: false, standard: false, pro: true },
      { label: 'Full Mock Exam (L+R+W+S)', free: false, standard: false, pro: true },
      { label: 'Interactive Podcasts', free: false, standard: true, pro: true },
    ]
  },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '0',
    triPrice: '0',
    period: 'so\'m',
    desc: 'IELTS ga ilk qadam. Limited Reading/Listening va 7 kunlik Study Route.',
    cta: 'Hozir boshlash',
    ctaStyle: 'border border-zinc-200 text-zinc-800 hover:bg-zinc-50',
    highlight: false,
    badge: null,
  },
  {
    id: 'standard',
    name: 'Standard',
    monthlyPrice: '29 000',
    triPrice: '79 000',
    period: 'so\'m',
    desc: 'Reading, Listening va Podcast testlariga to\'liq kirish imkoniyati.',
    cta: 'Standard olish',
    ctaStyle: 'bg-zinc-900 text-white hover:bg-black',
    highlight: false,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: '39 000',
    triPrice: '99 000',
    period: 'so\'m',
    desc: 'AI imkoniyatlari bilan IELTS ga to\'liq va professional tayyorgarlik.',
    cta: 'Pro\'ga o\'tish',
    ctaStyle: 'bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white shadow-lg shadow-blue-500/25 hover:brightness-110',
    highlight: true,
    badge: 'Eng mashhur',
  },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const FeatureValue = ({ value }) => {
  if (value === true) return <Check size={17} className="text-[#0071e3] mx-auto" strokeWidth={2.5} />;
  if (value === false) return <X size={17} className="text-zinc-200 mx-auto" strokeWidth={2} />;
  return <span className="text-[13px] font-semibold text-zinc-700 text-center block">{value}</span>;
};

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { user, logout, userData } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const faqs = [
    {
      q: 'To\'lov qanday amalga oshiriladi?',
      a: 'To\'lov Telegram bot orqali amalga oshiriladi. To\'lovdan so\'ng akkauntingiz avtomatik ravishda faollashtiriladi.'
    },
    {
      q: 'Obuna bekor qilinsa nima bo\'ladi?',
      a: 'Obuna muddati tugagach, siz Free rejimga o\'tasiz. Barcha natijalar va progress saqlanib qoladi.'
    },
    {
      q: 'Standard va Pro farqi nima?',
      a: 'Standard tarifda Reading, Listening va Podcast funksiyalari mavjud. Pro tarifda bunga qo\'shimcha AI Writing baholash, AI Speaking Examiner va Full Mock Exam ham kiradi.'
    },
    {
      q: '3 oylik tarifda qanday tejash bor?',
      a: 'Standard: oylik 29 000 × 3 = 87 000 so\'m, 3 oylik tarif 79 000 so\'m — 8 000 so\'m tejaladi. Pro: oylik 39 000 × 3 = 117 000 so\'m, 3 oylik 99 000 so\'m — 18 000 so\'m tejaladi.'
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <DashboardHeader
        user={user}
        userData={userData}
        activeTab="pricing"
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-14 bg-[#fafafa] overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-[#0071e3] uppercase tracking-wider mb-5">
            <Zap size={11} fill="currentColor" className="animate-pulse" /> Premium
          </div>
          <h1 className="text-[36px] md:text-[52px] font-bold text-[#1d1d1f] leading-[1.1] tracking-tight mb-4">
            O'z darajangizga mos<br/>tarifni tanlang.
          </h1>
          <p className="text-[15px] md:text-[17px] text-zinc-500 font-medium max-w-xl mx-auto leading-relaxed">
            IELTS 7+ ballga erishish uchun kerakli barcha asboblar bir joyda.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-zinc-100 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${billing === 'monthly' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}
            >
              Oylik
            </button>
            <button
              onClick={() => setBilling('tri')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-1.5 ${billing === 'tri' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}
            >
              3 Oylik
              <span className="text-[10px] bg-green-100 text-green-700 font-black px-1.5 py-0.5 rounded-full">−20%</span>
            </button>
          </div>
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
                  ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-2xl shadow-blue-500/20'
                  : 'bg-white border-zinc-200'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ffcc00] text-black text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-[13px] font-black uppercase tracking-widest mb-4 ${plan.highlight ? 'text-blue-200' : 'text-zinc-400'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1">
                  <span className={`text-[42px] font-bold leading-none tracking-tighter ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>
                    {billing === 'monthly' ? plan.monthlyPrice : plan.triPrice}
                  </span>
                  <div className="mb-1.5">
                    <span className={`text-[14px] font-bold ${plan.highlight ? 'text-blue-200' : 'text-zinc-400'}`}> {plan.period}</span>
                    <p className={`text-[11px] font-bold ${plan.highlight ? 'text-blue-200' : 'text-zinc-400'}`}>
                      {billing === 'monthly' ? '/ oyiga' : '/ 3 oyga'}
                    </p>
                  </div>
                </div>
              </div>

              <p className={`text-[13px] leading-relaxed mb-6 ${plan.highlight ? 'text-blue-100' : 'text-zinc-500'}`}>
                {plan.desc}
              </p>

              <button
                onClick={() => {
                  if (plan.id !== 'free') window.open('https://t.me/your_bot_username', '_blank');
                }}
                className={`w-full py-3 rounded-xl font-bold text-[14px] transition-all hover:scale-[1.02] active:scale-[0.98] mt-auto ${
                  plan.highlight
                    ? 'bg-white text-[#0071e3] hover:bg-blue-50'
                    : plan.ctaStyle
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── COMPARE TABLE ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-[28px] md:text-[36px] font-bold text-zinc-900 tracking-tight mb-2">Tariflarni solishtirish</h2>
        <p className="text-zinc-400 text-[15px] mb-10">Qaysi funksiyalar qaysi tarifda mavjudligini ko'ring.</p>

        <div className="rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-4 bg-zinc-50 border-b border-zinc-100">
            <div className="col-span-1 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-zinc-400">Funksiya</div>
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`px-4 py-4 text-center text-[13px] font-black tracking-wider ${
                  plan.highlight ? 'text-[#0071e3]' : 'text-zinc-700'
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
                <div className="grid grid-cols-4 bg-zinc-50/60 border-b border-zinc-100">
                  <div className="col-span-4 px-6 py-2.5 flex items-center gap-2">
                    <Icon size={14} className="text-zinc-400" strokeWidth={2} />
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{group.category}</span>
                  </div>
                </div>

                {/* Feature Items */}
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className={`grid grid-cols-4 border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors ${
                      iIdx === group.items.length - 1 ? 'border-b border-zinc-100' : ''
                    }`}
                  >
                    <div className="col-span-1 px-6 py-3.5">
                      <span className="text-[13px] text-zinc-700 font-medium">{item.label}</span>
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
        <h2 className="text-[24px] font-bold text-zinc-900 tracking-tight mb-6">Tez-tez beriladigan savollar</h2>
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-zinc-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
              >
                <span className="text-[14px] font-semibold text-zinc-900">{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-zinc-400 transition-transform duration-300 flex-shrink-0 ml-3 ${openFaq === idx ? 'rotate-180' : ''}`}
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
                    <p className="px-5 pb-4 text-[13px] text-zinc-500 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl bg-zinc-900 overflow-hidden px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(#4f9eff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} fill="#2997ff" className="text-[#2997ff]" />
              <span className="text-[11px] font-black text-[#2997ff] uppercase tracking-widest">7 kunlik sinov</span>
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-tight tracking-tight">
              Bugun professional<br/>tayyorgarlikni boshlang.
            </h2>
            <p className="text-zinc-400 text-[14px] mt-2">Kredit karta talab qilinmaydi. Istalgan vaqt bekor qilish mumkin.</p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3">
            <button
              onClick={() => window.open('https://t.me/your_bot_username', '_blank')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white font-bold text-[15px] shadow-xl shadow-blue-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all whitespace-nowrap"
            >
              <Zap size={16} fill="currentColor" className="animate-pulse" />
              Pro'ga o'tish
            </button>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Shield size={11} /> Xavfsiz to'lov · Tezkor faollashtirish
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
