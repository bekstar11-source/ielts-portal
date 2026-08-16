import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import SchemaMarkup from '../../components/common/SchemaMarkup';
import { track } from '../../lib/analytics';
import Logo from '../../components/common/Logo';

// --- Responsive styles (desktop = base, media queries adapt tablet/mobile) ---
const responsiveCSS = `
.lp {
  --pad-x: 64px;
  --h1: 64px;
  --wh: 74px;
  --h2: 40px;
  --h3: 26px;
  overflow-x: hidden;
}
.lp-h1 { margin: 0; max-width: 900px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: var(--h1); line-height: 1.1; color: #1E1B16; }
.lp-h2 { margin: 0; text-align: center; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: var(--h2); }
.lp-h3 { margin: 0; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: var(--h3); color: #fff; }

.lp-words { display: inline-block; height: var(--wh); overflow: hidden; vertical-align: bottom; margin: 0 4px; }
.lp-words-track { display: block; transition: transform .6s cubic-bezier(.65,0,.35,1); transform: translateY(calc(var(--idx) * var(--wh) * -1)); }
.lp-words-track > span { display: block; height: var(--wh); line-height: var(--wh); color: #4A5FE8; }

.lp-section { padding-left: var(--pad-x); padding-right: var(--pad-x); }
.lp-hero-copy { padding: 96px var(--pad-x) 100px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 26px; }
.lp-hero-visual { position: relative; width: calc(100% - var(--pad-x) * 2); height: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background: linear-gradient(135deg, #7C93FF 0%, #4A5FE8 55%, #242A93 100%); }
.lp-cta-row { display: flex; align-items: center; gap: 24px; margin-top: 6px; }

.lp-stats { padding: 72px var(--pad-x); display: flex; justify-content: center; background: #F7F4EE; }
.lp-stat { text-align: center; padding: 0 56px; }
.lp-stat + .lp-stat { border-left: 1px solid rgba(30,27,22,.1); }
.lp-stat-value { font: 700 44px 'Space Grotesk', sans-serif; color: #1E1B16; }

.lp-feature-row { display: flex; gap: 80px; align-items: center; }
.lp-feature-row.reverse { flex-direction: row-reverse; }
.lp-feature-copy { width: 440px; flex-shrink: 0; display: flex; flex-direction: column; gap: 22px; }
.lp-feature-visual { flex: 1; height: 340px; border-radius: 20px; position: relative; overflow: hidden; background: linear-gradient(135deg, #7C93FF 0%, #4A5FE8 55%, #242A93 100%); }

.lp-card { width: 460px; max-width: 100%; }
.lp-price-card { width: 320px; max-width: 100%; }

.lp-footer-cols { display: flex; justify-content: space-between; gap: 48px; flex-wrap: wrap; }

@media (max-width: 1024px) {
  .lp { --pad-x: 40px; --h1: 48px; --wh: 56px; --h2: 34px; --h3: 23px; }
  .lp-hero-copy { padding-top: 72px; padding-bottom: 72px; }
  .lp-hero-visual { height: 420px; }
  .lp-feature-row, .lp-feature-row.reverse { flex-direction: column; gap: 32px; align-items: stretch; }
  .lp-feature-copy { width: 100%; }
  .lp-feature-visual { width: 100%; height: 280px; }
}

@media (max-width: 640px) {
  .lp { --pad-x: 20px; --h1: 32px; --wh: 40px; --h2: 26px; --h3: 20px; }
  .lp-hero-copy { padding-top: 48px; padding-bottom: 44px; gap: 18px; }
  .lp-hero-visual { height: 260px; border-radius: 16px; }
  .lp-hero-visual .lp-float { position: static !important; }
  .lp-hero-floats { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 16px; gap: 8px; }
  .lp-cta-row { flex-direction: column; align-items: stretch; width: 100%; gap: 12px; }
  .lp-cta-row > a { text-align: center; }
  .lp-stats { flex-direction: column; gap: 28px; padding: 44px var(--pad-x); }
  .lp-stat { padding: 0; }
  .lp-stat + .lp-stat { border-left: none; border-top: 1px solid rgba(30,27,22,.1); padding-top: 28px; }
  .lp-stat-value { font-size: 34px; }
  .lp-pad-y-lg { padding-top: 56px !important; padding-bottom: 56px !important; }
  .lp-feature-visual { height: 220px; }
  .lp-footer-cols { gap: 28px; }
  .lp-footer-cols > div { flex: 1 1 40%; }
}
`;

// --- Animated Word Slider ---
const AnimatedWords = () => {
  const words = ["Reading", "Listening", "Mock Exam"];
  const [index, setIndex] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [words.length]);

  return (
    <span className="lp-words" style={{ '--idx': index }}>
      <span className="lp-words-track">
        {words.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </span>
    </span>
  );
};

// --- Hero Section ---
const Hero = () => {
  return (
    <section style={{ background: '#F7F4EE', fontFamily: "'Public Sans', sans-serif", paddingBottom: '100px' }}>

      <div className="lp-hero-copy">
        <span style={{ font: "600 13px 'Public Sans', sans-serif", letterSpacing: '.08em', color: '#D97757', textTransform: 'uppercase' }}>
          Sun'iy intellekt asosida IELTS tayyorgarligi
        </span>

        <h1 className="lp-h1">
          IELTS
          <AnimatedWords />
          bo'yicha aniq natijaga erishing
        </h1>

        <p style={{ margin: 0, maxWidth: '620px', font: "400 17px/1.6 'Public Sans', sans-serif", color: '#6b6559' }}>
          Englev — Reading, Listening va to'liq Mock Exam'larni real imtihon formatida onlayn mashq qildiruvchi platforma. Har bir xatoni aniq tahlil qiling va band ballingizni oshirish uchun shaxsiy reja oling.
        </p>

        {/* CTA ierarxiyasi ATAYLAB shunday: sovuq trafik uchun BIRLAMCHI taklif —
            ro'yxatdan o'tishni talab qilmaydigan trial (/trial). Ro'yxatdan
            o'tish esa ikkilamchi havola: u allaqachon ishonch hosil qilgan
            odam uchun. Teskarisi reklamadan kelgan mehmonni darvozadayoq
            to'xtatib qo'yadi. */}
        <div className="lp-cta-row">
          <Link
            to="/trial"
            onClick={() => track('trial_cta_click', { placement: 'hero' })}
            style={{ padding: '14px 30px', borderRadius: '999px', border: 'none', background: '#1E1B16', color: '#fff', font: "600 15px 'Public Sans', sans-serif", cursor: 'pointer', textDecoration: 'none' }}
          >
            Bepul darajangizni aniqlang →
          </Link>
          <Link
            to="/login"
            onClick={() => track('register_cta_click', { placement: 'hero' })}
            style={{ padding: '12px 0', font: "600 15px 'Public Sans', sans-serif", color: '#1E1B16', textDecoration: 'none' }}
          >
            Ro'yxatdan o'tish
          </Link>
        </div>

        <p style={{ margin: '-8px 0 0', font: "400 14px 'Public Sans', sans-serif", color: '#8a8577' }}>
          30 daqiqa · ro'yxatdan o'tmasdan · karta ma'lumoti so'ralmaydi
        </p>
      </div>

      <div className="lp-hero-visual">
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 2px, transparent 2px 10px)' }}></div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', textAlign: 'center' }}>
          <span style={{ font: "14px 'Courier New', monospace", color: 'rgba(255,255,255,.75)' }}>
            // platforma skrinshoti — rasmni shu yerga tashlang
          </span>
        </div>

        <div className="lp-hero-floats">
          <div className="lp-float" style={{ position: 'absolute', left: '56px', top: '56px', background: 'rgba(255,255,255,.96)', borderRadius: '14px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 12px 30px rgba(0,0,0,.2)', maxWidth: '260px' }}>
            <span style={{ font: "600 12px 'Public Sans', sans-serif", color: '#8a8577' }}>Reading · Passage 2</span>
            <span style={{ font: "600 14px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>13/13 to'g'ri javob</span>
          </div>

          <div className="lp-float" style={{ position: 'absolute', right: '56px', bottom: '56px', background: 'rgba(255,255,255,.96)', borderRadius: '14px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 12px 30px rgba(0,0,0,.2)', alignSelf: 'flex-end' }}>
            <span style={{ font: "600 12px 'Public Sans', sans-serif", color: '#8a8577' }}>Mock Exam yakunlandi</span>
            <span style={{ font: "600 14px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>Band 7.5</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Logos ---
const Logos = () => {
  const logos = ["Cambridge", "IDP", "British Council", "Oxford", "IELTS", "Macmillan"];
  return (
    <div className="lp-section lp-pad-y-lg" style={{ background: '#10102A', paddingTop: '56px', paddingBottom: '56px', textAlign: 'center', fontFamily: "'Public Sans', sans-serif" }}>
      <span style={{ font: "600 13px 'Public Sans', sans-serif", letterSpacing: '.06em', color: '#A6A8C4', textTransform: 'uppercase' }}>O'zbekiston bo'ylab til markazlari ishonch bildirgan</span>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
        {logos.map(logo => (
          <div key={logo} style={{ padding: '10px 18px', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px' }}>
            <span style={{ font: "600 14px 'Space Grotesk', sans-serif", color: '#A6A8C4' }}>{logo}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Stats ---
const Stats = () => {
  const stats = [
    { value: "15k+", label: "Foydalanuvchilar" },
    { value: "2.5M+", label: "Bajarilgan savollar" },
    { value: "7.5", label: "O'rtacha band ball" }
  ];
  return (
    <div className="lp-stats" style={{ fontFamily: "'Public Sans', sans-serif" }}>
      {stats.map((s, i) => (
        <div key={i} className="lp-stat">
          <div className="lp-stat-value">{s.value}</div>
          <div style={{ font: "400 14px 'Public Sans', sans-serif", color: '#6b6559', marginTop: '8px' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
};

// --- Features ---
const FeatureBullet = ({ children }) => (
  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span>
    <span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>{children}</span>
  </div>
);

const FeaturesHTML = () => {
  return (
    <div className="lp-section lp-pad-y-lg" style={{ background: '#10102A', paddingTop: '110px', paddingBottom: '110px', display: 'flex', flexDirection: 'column', gap: '72px', fontFamily: "'Public Sans', sans-serif" }}>
      <h2 className="lp-h2" style={{ color: '#fff' }}>Har bir modul uchun alohida yondashuv</h2>

      <div className="lp-feature-row">
        <div className="lp-feature-copy">
          <h3 className="lp-h3">Reading: har bir javobni asoslab bering</h3>
          <FeatureBullet>Band 5 dan 9 gacha real Cambridge formatidagi matnlar</FeatureBullet>
          <FeatureBullet>Har bir noto'g'ri javob uchun matndan aynan qaysi qatorda javob borligi ko'rsatiladi</FeatureBullet>
          <FeatureBullet>O'qish tezligi va vaqt boshqaruvi bo'yicha statistika</FeatureBullet>
        </div>
        <div className="lp-feature-visual">
          <div style={{ position: 'absolute', left: '8%', right: '8%', top: '40px', background: 'rgba(255,255,255,.95)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ height: '10px', width: '100%', background: '#e7e4da', borderRadius: '4px' }}></div>
            <div style={{ height: '10px', width: '92%', background: '#e7e4da', borderRadius: '4px' }}></div>
            <div style={{ height: '10px', width: '96%', background: '#e7e4da', borderRadius: '4px' }}></div>
            <div style={{ height: '1px', background: 'rgba(0,0,0,.08)', margin: '8px 0' }}></div>
            <div style={{ height: '9px', width: '80%', background: '#f3d2c2', borderRadius: '4px' }}></div>
            <div style={{ height: '9px', width: '70%', background: '#e7e4da', borderRadius: '4px' }}></div>
          </div>
        </div>
      </div>

      <div className="lp-feature-row reverse">
        <div className="lp-feature-copy">
          <h3 className="lp-h3">Listening: talaffuz va tezlikka o'rganing</h3>
          <FeatureBullet>4 ta qism, turli aksentlar — Britan, Avstraliya, Amerika</FeatureBullet>
          <FeatureBullet>Har bir savolni qayta tinglab, transkriptdan tekshiring</FeatureBullet>
          <FeatureBullet>Eshitib tushunish tezligingiz vaqt bo'yicha kuzatiladi</FeatureBullet>
        </div>
        <div className="lp-feature-visual" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '26px', background: 'rgba(255,255,255,.55)', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '52px', background: 'rgba(255,255,255,.7)', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '74px', background: 'rgba(255,255,255,.85)', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '40px', background: 'rgba(255,255,255,.6)', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '90px', background: '#fff', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '56px', background: 'rgba(255,255,255,.7)', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '34px', background: 'rgba(255,255,255,.55)', borderRadius: '3px' }}></span>
          <span style={{ width: '6px', height: '68px', background: 'rgba(255,255,255,.8)', borderRadius: '3px' }}></span>
        </div>
      </div>

      <div className="lp-feature-row">
        <div className="lp-feature-copy">
          <h3 className="lp-h3">Mock Exam: real imtihon holatida sinang</h3>
          <FeatureBullet>Reading + Listening to'liq 2 soat 40 daqiqalik format</FeatureBullet>
          <FeatureBullet>Imtihondan so'ng batafsil band ball tahlili</FeatureBullet>
          <FeatureBullet>Zaif tomonlaringiz bo'yicha keyingi hafta uchun reja</FeatureBullet>
        </div>
        <div className="lp-feature-visual" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '150px', height: '150px', maxWidth: '40vw', maxHeight: '40vw', borderRadius: '50%', background: 'conic-gradient(#fff 0% 68%, rgba(255,255,255,.25) 68% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '78%', height: '78%', borderRadius: '50%', background: '#242A93', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ font: "700 19px 'Space Grotesk', sans-serif", color: '#fff' }}>01:58:32</span>
              <span style={{ font: "400 11px 'Public Sans', sans-serif", color: '#A6A8C4', textAlign: 'center' }}>Reading + Listening</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Testimonials ---
const TestimonialCard = ({ text, name }) => (
  <div className="lp-card" style={{ padding: '32px', borderRadius: '16px', background: '#EFEBE2', display: 'flex', flexDirection: 'column', gap: '18px' }}>
    <span style={{ font: "700 44px/1 'Space Grotesk', sans-serif", color: '#D97757' }}>"</span>
    <p style={{ margin: 0, font: "500 17px/1.5 'Space Grotesk', sans-serif", color: '#1E1B16' }}>{text}</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: 'repeating-linear-gradient(45deg, #d8d3c6 0 4px, #cfc9ba 4px 8px)' }}></span>
      <div>
        <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#1E1B16' }}>{name}</div>
        <div style={{ font: "400 12px 'Public Sans', sans-serif", color: '#8a8577' }}>Englev talabasi</div>
      </div>
    </div>
  </div>
);

const Testimonials = () => {
  return (
    <div className="lp-section lp-pad-y-lg" style={{ paddingTop: '100px', paddingBottom: '100px', display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', background: '#F7F4EE', fontFamily: "'Public Sans', sans-serif" }}>
      <TestimonialCard
        text="Englev'dagi Mock Exam'lar aynan haqiqiy imtihondagidek his qildi. 6 haftada 6.5 dan 7.5 ballga chiqdim."
        name="Dilnoza R."
      />
      <TestimonialCard
        text="Reading bo'limidagi izohlar tufayli qaysi savol turida ko'proq xato qilishimni tushunib, strategiyamni o'zgartirdim."
        name="Javlon M."
      />
    </div>
  );
};

// --- Pricing ---
const Pricing = () => {
  const pricingBasicFeatures = ["Reading va Listening mashqlari", "Cheklangan mock examlar", "Asosiy tahlil"];
  const pricingStandardFeatures = ["Barcha mashqlar", "Cheksiz mock examlar", "To'liq AI tahlili", "Shaxsiy o'quv rejasi"];
  const pricingProFeatures = ["Standard barcha imkoniyatlar", "Haftalik mentor bilan muloqot", "Writing tekshiruvi (AI + Mentor)", "Speaking mock session"];

  return (
    <div className="lp-section" style={{ background: '#F7F4EE', paddingBottom: '90px', fontFamily: "'Public Sans', sans-serif" }}>
      <h2 className="lp-h2" style={{ color: '#1E1B16' }}>Har bir bosqich uchun mos tarif</h2>
      <p style={{ margin: '16px auto 0', maxWidth: '520px', textAlign: 'center', font: "400 16px/1.6 'Public Sans', sans-serif", color: '#6b6559' }}>Istalgan vaqt bekor qilish mumkin — uzoq muddatli shartnoma yo'q.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '48px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div className="lp-price-card" style={{ borderRadius: '14px', padding: '28px 24px', background: '#fff', border: '1px solid rgba(30,27,22,.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#8a8577' }}>Boshlang'ich</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}><span style={{ font: "700 32px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>149 000</span><span style={{ font: "500 14px 'Public Sans', sans-serif", color: '#8a8577' }}>so'm/oy</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pricingBasicFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e7e4da', flexShrink: 0, marginTop: '2px', color: '#8a8577', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ font: "400 13px 'Public Sans', sans-serif", color: '#4a4638', lineHeight: 1.5 }}>{f}</span></div>
            ))}
          </div>
          <button style={{ marginTop: 'auto', padding: '13px', borderRadius: '9px', border: '1px solid rgba(30,27,22,.15)', background: 'transparent', color: '#1E1B16', font: "600 13px 'Public Sans', sans-serif", cursor: 'pointer' }}>Tanlash</button>
        </div>
        <div className="lp-price-card" style={{ borderRadius: '14px', padding: '28px 24px', background: '#1E1B16', border: '2px solid #D97757', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: '#D97757', color: '#fff', font: "600 11px 'Public Sans', sans-serif", padding: '6px 14px', borderRadius: '999px' }}>Eng ommabop</span>
          <div>
            <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#A6A8C4' }}>Standart</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}><span style={{ font: "700 32px 'Space Grotesk', sans-serif", color: '#fff' }}>299 000</span><span style={{ font: "500 14px 'Public Sans', sans-serif", color: '#A6A8C4' }}>so'm/oy</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pricingStandardFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#D97757', flexShrink: 0, marginTop: '2px', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ font: "400 13px 'Public Sans', sans-serif", color: '#A6A8C4', lineHeight: 1.5 }}>{f}</span></div>
            ))}
          </div>
          <button style={{ marginTop: 'auto', padding: '13px', borderRadius: '9px', border: 'none', background: '#D97757', color: '#fff', font: "600 13px 'Public Sans', sans-serif", cursor: 'pointer' }}>Tanlash</button>
        </div>
        <div className="lp-price-card" style={{ borderRadius: '14px', padding: '28px 24px', background: '#fff', border: '1px solid rgba(30,27,22,.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#8a8577' }}>Pro + Mentor</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}><span style={{ font: "700 32px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>549 000</span><span style={{ font: "500 14px 'Public Sans', sans-serif", color: '#8a8577' }}>so'm/oy</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pricingProFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e7e4da', flexShrink: 0, marginTop: '2px', color: '#8a8577', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ font: "400 13px 'Public Sans', sans-serif", color: '#4a4638', lineHeight: 1.5 }}>{f}</span></div>
            ))}
          </div>
          <button style={{ marginTop: 'auto', padding: '13px', borderRadius: '9px', border: '1px solid rgba(30,27,22,.15)', background: 'transparent', color: '#1E1B16', font: "600 13px 'Public Sans', sans-serif", cursor: 'pointer' }}>Tanlash</button>
        </div>
      </div>
    </div>
  );
};

// --- FAQ Section ---
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: "Bepul sinab ko'rsam bo'ladimi?", a: "Ha, tizimdan ro'yxatdan o'tganingizda sizga ilk mock exam va bir qator reading, listening mashqlari bepul taqdim etiladi." },
    { q: "Band ball qanday hisoblanadi?", a: "Englev platformasi real IELTS baholash tizimi asosida ishlaydi. Har bir noto'g'ri javob tekshirilib, umumiy band ballingiz chiqarib beriladi." },
    { q: "To'lovni istalgan payt bekor qilsam bo'ladimi?", a: "Albatta, hech qanday uzoq muddatli shartnomalar yo'q. Istalgan vaqtda tarifingizni o'zgartirishingiz yoki bekor qilishingiz mumkin." },
    { q: "Writing va Speaking ham bormi?", a: "Tez orada Writing va Speaking modullari ham sun'iy intellekt orqali tekshirish imkoniyati bilan qo'shiladi." }
  ];

  return (
    <div className="lp-section lp-pad-y-lg" style={{ background: '#EFEBE2', paddingTop: '100px', paddingBottom: '100px', fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h2 className="lp-h2" style={{ color: '#1E1B16', marginBottom: '32px' }}>Ko'p so'raladigan savollar</h2>
        {faqs.map((f, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} style={{ borderBottom: '1px solid rgba(30,27,22,.1)', padding: '20px 0' }}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '16px' }}
              >
                <span style={{ font: "600 16px/1.4 'Space Grotesk', sans-serif", color: '#1E1B16' }}>{f.q}</span>
                <span style={{ font: "400 20px 'Public Sans', sans-serif", color: '#8a8577', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .3s ease', flexShrink: 0 }}>⌄</span>
              </button>
              {isOpen && (
                <p style={{ margin: '14px 0 0', font: "400 15px/1.6 'Public Sans', sans-serif", color: '#6b6559' }}>{f.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Footer ---
const FooterHTML = () => {
  const linkStyle = { font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' };
  const headStyle = { font: "600 14px 'Public Sans', sans-serif", color: '#fff', marginBottom: '16px' };
  const colStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };

  return (
    <div className="lp-section" style={{ background: '#10102A', paddingTop: '80px', paddingBottom: '48px', color: '#fff', fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <h2 className="lp-h2">Darajangizni bugun bepul aniqlang</h2>
        <Link
          to="/trial"
          onClick={() => track('trial_cta_click', { placement: 'footer' })}
          style={{ padding: '14px 30px', borderRadius: '999px', border: 'none', background: '#fff', color: '#10102A', font: "600 15px 'Public Sans', sans-serif", cursor: 'pointer', textDecoration: 'none' }}
        >
          Bepul testni boshlash
        </Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,.1)', margin: '56px 0 40px' }}></div>
      <div className="lp-footer-cols">
        <div style={{ maxWidth: '280px' }}>
          <Logo size={22} tone="light" />
          <p style={{ font: "400 14px/1.6 'Public Sans', sans-serif", color: '#A6A8C4', marginTop: '14px' }}>Sun'iy intellekt asosidagi IELTS Reading, Listening va Mock Exam tayyorgarlik platformasi.</p>
        </div>
        <div>
          <div style={headStyle}>Mahsulot</div>
          <div style={colStyle}>
            <Link to="/reading" style={linkStyle}>Reading</Link>
            <Link to="/listening" style={linkStyle}>Listening</Link>
            <Link to="/mock-exam" style={linkStyle}>Mock Exam</Link>
            <Link to="/pricing" style={linkStyle}>Narxlar</Link>
          </div>
        </div>
        <div>
          <div style={headStyle}>Kompaniya</div>
          <div style={colStyle}>
            <Link to="/about" style={linkStyle}>Biz haqimizda</Link>
            <Link to="/blog" style={linkStyle}>Blog</Link>
            <Link to="/contact" style={linkStyle}>Aloqa</Link>
          </div>
        </div>
        <div>
          <div style={headStyle}>Yordam</div>
          <div style={colStyle}>
            <Link to="/faq" style={linkStyle}>FAQ</Link>
            <Link to="/support" style={linkStyle}>Qo'llab-quvvatlash</Link>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '48px', font: "400 13px 'Public Sans', sans-serif", color: '#6f7191' }}>© 2026 Englev. Barcha huquqlar himoyalangan.</div>
    </div>
  );
};

// --- Main Page Component ---
export default function IELTSPortalLanding() {
  // Funnel'ning eng yuqori nuqtasi — reklama CPC'sini shu bilan solishtiramiz.
  useEffect(() => { track('landing_view'); }, []);

  return (
    <div className="lp" style={{ background: '#F7F4EE', minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
      <style>{responsiveCSS}</style>
      <SchemaMarkup />
      <Navbar />
      <Hero />
      <Logos />
      <Stats />
      <FeaturesHTML />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FooterHTML />
    </div>
  );
}
