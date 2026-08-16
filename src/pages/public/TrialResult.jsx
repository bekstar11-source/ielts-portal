import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Gift, TrendingUp, BookOpen, Headphones, ArrowRight, AlertCircle } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import { track } from '../../lib/analytics';

const STAGE_META = {
  reading: { label: 'Reading', icon: BookOpen },
  listening: { label: 'Listening', icon: Headphones },
};

/** Savol turi kalitlarini o'qiladigan matnga aylantiradi. */
function humanizeType(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TrialResult() {
  const location = useLocation();
  const navigate = useNavigate();

  // Natija `submitTrial` javobidan keladi — `trial_results` hujjatini klient
  // o'qiy olmaydi (firestore.rules). Sahifa yangilansa sessionStorage'dan
  // tiklaymiz.
  const result = useMemo(() => {
    if (location.state?.result) return location.state.result;
    try {
      return JSON.parse(sessionStorage.getItem('trialResult'));
    } catch {
      return null;
    }
  }, [location.state]);

  // ⚠️ Bu `useMemo` erta `return` dan OLDIN turishi shart — React hook'lari
  // har renderda bir xil tartibda chaqirilishi kerak, aks holda "natija yo'q"
  // holatidan natija kelgan holatga o'tishda hook tartibi buzilardi.
  //
  // Eng zaif savol turlari — natija sahifasining asosiy sotuv argumenti:
  // foydalanuvchi "nimani mashq qilishim kerak" degan javobni shu yerdan oladi.
  const weakTypes = useMemo(() => {
    const merged = {};
    (result?.modules || []).forEach((m) => {
      Object.entries(m.typeStats || {}).forEach(([type, s]) => {
        const prev = merged[type] || { total: 0, correct: 0 };
        merged[type] = { total: prev.total + s.total, correct: prev.correct + s.correct };
      });
    });
    return Object.entries(merged)
      .filter(([, s]) => s.total > 0)
      .map(([type, s]) => ({ type, ...s, rate: s.correct / s.total }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);
  }, [result]);

  // Funnel'ning "qiymat yetkazildi" nuqtasi. `weakTypes` shu yerda ham
  // yuboriladi — qaysi zaif tur ko'rsatilganda ro'yxatdan o'tish ko'proq
  // bo'lishini keyin shu bo'yicha kesib ko'ramiz.
  useEffect(() => {
    if (!result) {
      track('trial_result_missing');
      return;
    }
    track('trial_result_view', {
      band: Number(result.overallBand) || undefined,
      reward_earned: Boolean(result.rewardEarned),
      discount_percent: Number(result.discountPercent) || undefined,
      weakest_type: weakTypes[0]?.type,
    });
  }, [result, weakTypes]);

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F7F4EE]" style={{ fontFamily: "'Public Sans', sans-serif" }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-6 pt-32 text-center">
          <AlertCircle size={36} className="text-[#8a8577] mx-auto mb-4" />
          <h2 className="text-[22px] font-bold text-[#1E1B16] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Natija topilmadi
          </h2>
          <p className="text-[14px] text-[#6b6559] mb-6">
            Testni qaytadan yechib ko'ring — natija sessiya yopilganda saqlanmaydi.
          </p>
          <button
            onClick={() => navigate('/trial')}
            className="px-6 py-3 rounded-full bg-[#1E1B16] text-white font-bold text-[14px]"
          >
            Bepul testga qaytish
          </button>
        </div>
      </div>
    );
  }

  const { modules = [], overallBand, rewardEarned, discountPercent, minOverallBand } = result;

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-20" style={{ fontFamily: "'Public Sans', sans-serif" }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 pt-20">
        {/* ── Overall band ── */}
        <div className="text-center mb-10">
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-[#8a8577]">
            Umumiy natijangiz
          </span>
          <div
            className="text-[72px] font-bold leading-none text-[#1E1B16] my-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {Number(overallBand).toFixed(1)}
          </div>
          <span className="text-[14px] text-[#6b6559]">IELTS band (taxminiy)</span>
        </div>

        {/* ── Modul bo'yicha ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {modules.map((m) => {
            const meta = STAGE_META[m.stage] || { label: m.stage, icon: BookOpen };
            const Icon = meta.icon;
            return (
              <div key={m.stage} className="bg-white rounded-2xl p-5 border border-[#e5ddd0]">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-[#4A5FE8]" />
                  <span className="text-[13px] font-bold text-[#1E1B16]">{meta.label}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-[32px] font-bold leading-none text-[#1E1B16]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {Number(m.band).toFixed(1)}
                  </span>
                  <span className="text-[13px] text-[#8a8577] mb-1">
                    {m.score}/{m.totalQuestions} to'g'ri
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Zaif tomonlar ── */}
        {weakTypes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-[#e5ddd0] mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[#D97757]" />
              <h3 className="text-[15px] font-bold text-[#1E1B16]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Eng ko'p xato qilgan savol turlaringiz
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {weakTypes.map((w) => (
                <div key={w.type}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[14px] font-semibold text-[#1E1B16]">{humanizeType(w.type)}</span>
                    <span className="text-[13px] font-bold text-[#6b6559] tabular-nums">
                      {w.correct}/{w.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F7F4EE] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D97757]"
                      style={{ width: `${Math.round(w.rate * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        {rewardEarned ? (
          <div className="rounded-2xl p-6 bg-[#1E1B16] text-white">
            <div className="flex items-center gap-2 mb-3">
              <Gift size={18} className="text-[#7C93FF]" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#7C93FF]">
                Chegirma ochildi
              </span>
            </div>
            <h3 className="text-[22px] font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Tabriklaymiz — {discountPercent}% chegirmaga ega bo'ldingiz
            </h3>
            <p className="text-[14px] leading-relaxed text-white/70 mb-5">
              Chegirma obunangizning dastlabki <b className="text-white/90">3 oyiga</b> amal
              qiladi — 1 oylik tanlasangiz ham har oy shu narxda to'laysiz. Ro'yxatdan
              o'tganingizdan so'ng hisobingizga biriktiriladi va natijangiz saqlanib qoladi.
            </p>
            <Link
              to="/register"
              onClick={() => track('trial_register_click', {
                variant: 'discount',
                band: Number(overallBand) || undefined,
                discount_percent: Number(discountPercent) || undefined,
              })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#1E1B16] font-bold text-[14px] hover:bg-[#F7F4EE] transition-colors"
            >
              Ro'yxatdan o'tish va chegirmani olish <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-6 bg-white border border-[#e5ddd0]">
            <h3 className="text-[20px] font-bold text-[#1E1B16] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Band {Number(minOverallBand).toFixed(1)} gacha{' '}
              {(Number(minOverallBand) - Number(overallBand)).toFixed(1)} ball qoldi
            </h3>
            <p className="text-[14px] leading-relaxed text-[#6b6559] mb-5">
              Yuqoridagi zaif savol turlari bo'yicha maqsadli mashq qilsangiz, bu
              farqni yopish real. Platformada har bir tur uchun alohida mashqlar,
              xatolar tahlili va to'liq mock imtihonlar bor.
            </p>
            <Link
              to="/register"
              onClick={() => track('trial_register_click', {
                variant: 'no_discount',
                band: Number(overallBand) || undefined,
              })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E1B16] text-white font-bold text-[14px] hover:bg-black transition-colors"
            >
              Bepul ro'yxatdan o'tish <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
