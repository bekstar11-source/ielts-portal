import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Clock, Gift, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { clearTrialProgress } from '../../hooks/useTrialLogic';
import { track } from '../../lib/analytics';
import { SIGNUP_DISCOUNT, getPlanPrice } from '../../utils/pricing';
import { applySignupDiscount, formatSom } from '../../utils/subscription';

/** Chegirmali Standard narxi — botdagi bilan bir xil yaxlitlash orqali. */
const standardFull = getPlanPrice('standard', 'monthly');
const standardDiscounted = applySignupDiscount(standardFull, SIGNUP_DISCOUNT.percent);

/**
 * "dastlabki 1 oyiga" emas, "birinchi oyiga".
 *
 * `cycles` sozlama (hozir 1), shuning uchun matn raqamdan quriladi — lekin
 * 1 uchun sanoq shakli o'zbekchada g'aliz chiqadi.
 */
const CYCLES_LABEL = SIGNUP_DISCOUNT.cycles === 1
  ? 'birinchi oyiga'
  : `dastlabki ${SIGNUP_DISCOUNT.cycles} oyiga`;

// ⚠️ Vaqtlar `functions/trial.js` dagi `DEFAULT_CONFIG.stages` bilan mos:
// reading 1200s, listening 900s. Ilgari bu yerda "~10 daqiqa" yozilgan edi,
// serverda esa 1800s (30 daqiqa) turardi — o'quvchi kutgan vaqtidan uch
// baravar uzun taymerni ko'rardi.
const STAGES = [
  {
    icon: BookOpen,
    title: 'Reading',
    desc: 'Bitta passage, real imtihon formatida',
    time: '20 daqiqa',
  },
  {
    icon: Headphones,
    title: 'Listening',
    desc: 'Bitta section, audio bir marta ijro etiladi',
    time: '15 daqiqa',
  },
];

export default function TrialIntro() {
  const navigate = useNavigate();
  const { startGuestSession } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  // ── Sticky CTA ──
  // Asosiy tugma birinchi ekranda turadi, lekin o'quvchi bosqichlar va
  // chegirma shartlarini o'qib pastga tushganda u ko'rinmay qoladi. Panel
  // aynan SHU paytda chiqadi: sahifaning har qanday nuqtasida boshlash bir
  // bosishda qoladi va o'quvchi tugmani qidirib yuqoriga qaytmaydi.
  const ctaRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    track('trial_intro_view');
  }, []);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        // `top < 0` sharti muhim: panel faqat tugma YUQORIGA chiqib
        // ketganda kerak. Usiz u sahifa ochilishida ham (tugma hali
        // pastda bo'lganda) bir zumga chaqnab ketardi.
        setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    // Bosilish paytida yuboramiz, sessiya ochilishini kutmasdan: "necha kishi
    // boshlashga URINDI" va "necha kishida sessiya ochildi" ikki xil raqam.
    track('trial_start');
    try {
      // Eski (tugallanmagan) urinish qolib ketgan bo'lsa tozalaymiz — aks holda
      // yangi trial oldingi javoblar bilan aralashib ketardi.
      clearTrialProgress();
      await startGuestSession();
      navigate('/trial/reading');
    } catch (err) {
      console.error('Guest sessiyani boshlashda xatolik:', err);
      track('trial_start_error', { reason: err?.code || err?.message });
      setError("Sessiyani boshlab bo'lmadi. Sahifani yangilab qayta urinib ko'ring.");
      setStarting(false);
    }
  };

  // Ikkala tugma bitta holatni ko'rsatadi (yuklanish, o'chirilganlik) —
  // matn bir joyda tursin, ikki nusxa bir-biridan uzoqlashib ketmasin.
  const btnLabel = starting ? (
    <><Loader2 size={18} className="animate-spin" /> Tayyorlanmoqda...</>
  ) : (
    <>Bepul testni boshlash <ArrowRight size={18} /></>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE]" style={{ fontFamily: "'Public Sans', sans-serif" }}>
      <Navbar />

      {/* `pb-32`: sticky panel oxirgi blokni to'sib qo'ymasin. */}
      <div className="max-w-2xl mx-auto px-6 pt-20 md:pt-24 pb-32">
        <span className="inline-block text-[12px] font-bold uppercase tracking-[.08em] text-[#D97757] mb-3">
          Ro'yxatdan o'tmasdan
        </span>

        <h1
          className="text-[32px] md:text-[42px] font-bold leading-[1.1] text-[#1E1B16] mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Darajangizni 35 daqiqada aniqlang
        </h1>

        <p className="text-[15px] md:text-[16px] leading-relaxed text-[#6b6559] mb-6">
          Ikkita qisqa bo'lim — Reading va Listening. Natijangiz real IELTS band
          shkalasi bo'yicha hisoblanadi va qaysi savol turlarida qiynalayotganingizni
          ko'rsatadi.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[14px] text-red-700">
            {error}
          </div>
        )}

        {/* ── Asosiy CTA sarlavhadan keyin ──
            Ilgari u sahifaning ENG PASTIDA — ikkita bosqich kartasi va
            chegirma blokidan keyin turardi, ya'ni birinchi ekranda umuman
            ko'rinmasdi. Test yechishga kelgan odam nima qilishini bilish
            uchun scroll qilishi kerak emas; tafsilotlar tugmadan PASTDA
            qoladi va faqat shubhalanganlarga kerak bo'ladi. */}
        <button
          ref={ctaRef}
          onClick={handleStart}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#1E1B16] text-white font-bold text-[15px] hover:bg-black transition-colors disabled:opacity-60"
        >
          {btnLabel}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-[#8a8577] mt-3 mb-9">
          <ShieldCheck size={14} className="shrink-0" />
          Karta ma'lumoti ham, email ham so'ralmaydi.
        </p>

        <div className="flex flex-col gap-3 mb-4">
          {STAGES.map((s, i) => (
            <div
              key={s.title}
              className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#e5ddd0]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#4A5FE8]/10 flex items-center justify-center shrink-0">
                <s.icon size={20} className="text-[#4A5FE8]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-[#8a8577]">{i + 1}-bosqich</span>
                <h3 className="text-[16px] font-bold text-[#1E1B16]">{s.title}</h3>
                <p className="text-[13px] text-[#6b6559]">{s.desc}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#8a8577] shrink-0">
                <Clock size={14} />
                {s.time}
              </div>
            </div>
          ))}
        </div>

        {/* ── Mukofot ANIQ aytiladi ──
            Eski matn "natijangizga qarab ... chegirma taklif qilinishi mumkin"
            deb yozilgan edi. Lekin `config/trial.minOverallBand` = 0, ya'ni
            chegirma natijaga emas, testni YAKUNLASHGA beriladi — shartli
            qilib ko'rsatish yagona mukofotni bekorga kuchsizlantirardi. */}
        <div className="flex items-start gap-3 bg-[#4A5FE8]/[0.07] border border-[#4A5FE8]/20 rounded-2xl p-4 md:p-5">
          <Gift size={18} className="text-[#4A5FE8] shrink-0 mt-0.5" />
          <div className="text-[14px] leading-relaxed text-[#1E1B16]">
            <b>Testni yakunlaganingizda {SIGNUP_DISCOUNT.percent}% chegirma ochiladi</b> —
            obunangizning {CYCLES_LABEL} amal qiladi: Standard tarif{' '}
            <b>{formatSom(standardDiscounted)} so'm/oy</b>{' '}
            (to'liq narxi {formatSom(standardFull)} so'm).
            <p className="mt-1.5 text-[13px] text-[#6b6559]">
              Natijangiz va eng ko'p xato qilgan savol turlaringiz tahlili ham
              darhol ochiladi. Chegirma ro'yxatdan o'tganingizdan keyin{' '}
              {SIGNUP_DISCOUNT.days} kun amal qiladi.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sticky CTA paneli ──
          `translate-y-full` bilan yashiriladi (display emas): shunda chiqishi
          silliq bo'ladi. Yashirin holatda `pointer-events-none` va
          `tabIndex={-1}` — aks holda ko'rinmayotgan tugma Tab bilan fokus
          olib, klaviatura foydalanuvchisini adashtirardi. */}
      <div
        aria-hidden={!showSticky}
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out ${
          showSticky ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        style={{
          background: 'rgba(247,244,238,.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(30,27,22,.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-4">
          {/* Telefon ekranida matn tashlab yuboriladi — tor joyda tugmaning
              o'zi muhimroq. */}
          <div className="hidden sm:block flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1E1B16]">Bepul · 35 daqiqa</p>
            <p className="text-[12px] text-[#8a8577] truncate">
              Yakunlasangiz {SIGNUP_DISCOUNT.percent}% chegirma ochiladi
            </p>
          </div>
          <button
            onClick={handleStart}
            disabled={starting}
            tabIndex={showSticky ? 0 : -1}
            className="flex-1 sm:flex-none sm:min-w-[260px] flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#1E1B16] text-white font-bold text-[15px] hover:bg-black transition-colors disabled:opacity-60"
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
