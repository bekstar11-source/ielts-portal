import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Clock, Gift, Loader2, ArrowRight } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { clearTrialProgress } from '../../hooks/useTrialLogic';
import { track } from '../../lib/analytics';

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
    time: '~10 daqiqa',
  },
];

export default function TrialIntro() {
  const navigate = useNavigate();
  const { startGuestSession } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { track('trial_intro_view'); }, []);

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

  return (
    <div className="min-h-screen bg-[#F7F4EE]" style={{ fontFamily: "'Public Sans', sans-serif" }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-20">
        <span className="inline-block text-[12px] font-bold uppercase tracking-[.08em] text-[#D97757] mb-4">
          Ro'yxatdan o'tmasdan
        </span>

        <h1
          className="text-[36px] md:text-[44px] font-bold leading-[1.1] text-[#1E1B16] mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Darajangizni 30 daqiqada aniqlang
        </h1>

        <p className="text-[16px] leading-relaxed text-[#6b6559] mb-10">
          Ikkita qisqa bo'lim — Reading va Listening. Natijangiz real IELTS band
          shkalasi bo'yicha hisoblanadi va qaysi savol turlarida qiynalayotganingizni
          ko'rsatadi.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {STAGES.map((s, i) => (
            <div
              key={s.title}
              className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-[#e5ddd0]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#4A5FE8]/10 flex items-center justify-center shrink-0">
                <s.icon size={20} className="text-[#4A5FE8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#8a8577]">{i + 1}-bosqich</span>
                </div>
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

        <div className="flex items-start gap-3 bg-[#4A5FE8]/[0.07] border border-[#4A5FE8]/20 rounded-2xl p-5 mb-8">
          <Gift size={18} className="text-[#4A5FE8] shrink-0 mt-0.5" />
          <p className="text-[14px] leading-relaxed text-[#1E1B16]">
            Testni yakunlaganingizdan so'ng natijangiz va zaif tomonlaringiz tahlili
            ochiladi. Natijangizga qarab ro'yxatdan o'tishda <b>chegirma</b> taklif
            qilinishi mumkin.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[14px] text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#1E1B16] text-white font-bold text-[15px] hover:bg-black transition-colors disabled:opacity-60"
        >
          {starting ? (
            <><Loader2 size={18} className="animate-spin" /> Tayyorlanmoqda...</>
          ) : (
            <>Bepul testni boshlash <ArrowRight size={18} /></>
          )}
        </button>

        <p className="text-center text-[13px] text-[#8a8577] mt-4">
          Karta ma'lumoti ham, email ham so'ralmaydi.
        </p>
      </div>
    </div>
  );
}
