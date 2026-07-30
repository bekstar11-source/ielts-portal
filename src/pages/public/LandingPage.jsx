import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import SchemaMarkup from '../../components/common/SchemaMarkup';

// --- Hero Section ---


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
    <span style={{ display: 'inline-block', height: '74px', overflow: 'hidden', verticalAlign: 'bottom', margin: '0 4px' }}>
      <span style={{ display: 'block', transition: 'transform .6s cubic-bezier(.65,0,.35,1)', transform: `translateY(-${index * 74}px)` }}>
        {words.map((w, i) => (
          <span key={i} style={{ display: 'block', height: '74px', lineHeight: '74px', color: '#4A5FE8' }}>
            {w}
          </span>
        ))}
      </span>
    </span>
  );
};

// --- Hero Section ---
const Hero = () => {
  return (
    <section style={{ background: '#F7F4EE', fontFamily: "'Public Sans', sans-serif", paddingBottom: '100px' }}>
      
      <div style={{ padding: '96px 64px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '26px' }}>
        <span style={{ font: "600 13px 'Public Sans', sans-serif", letterSpacing: '.08em', color: '#D97757', textTransform: 'uppercase' }}>
          Sun'iy intellekt asosida IELTS tayyorgarligi
        </span>
        
        <h1 style={{ margin: 0, maxWidth: '900px', font: "700 64px/1.1 'Space Grotesk', sans-serif", color: '#1E1B16' }}>
          IELTS
          <AnimatedWords />
          bo'yicha aniq natijaga erishing
        </h1>
        
        <p style={{ margin: 0, maxWidth: '620px', font: "400 18px/1.6 'Public Sans', sans-serif", color: '#6b6559' }}>
          Englev — Reading, Listening va to'liq Mock Exam'larni real imtihon formatida onlayn mashq qildiruvchi platforma. Har bir xatoni aniq tahlil qiling va band ballingizni oshirish uchun shaxsiy reja oling.
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '6px' }}>
          <Link to="/login" style={{ padding: '14px 30px', borderRadius: '999px', border: 'none', background: '#1E1B16', color: '#fff', font: "600 15px 'Public Sans', sans-serif", cursor: 'pointer', textDecoration: 'none' }}>
            Ro'yxatdan o'tish
          </Link>
          <Link to="/login" style={{ font: "600 15px 'Public Sans', sans-serif", color: '#1E1B16', textDecoration: 'none' }}>
            Bepul mock test →
          </Link>
        </div>
      </div>

      <div style={{ position: 'relative', width: 'calc(100% - 128px)', height: '600px', margin: '0 auto 0', borderRadius: '24px', overflow: 'hidden', background: 'linear-gradient(135deg, #7C93FF 0%, #4A5FE8 55%, #242A93 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 2px, transparent 2px 10px)' }}></div>
        
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ font: "14px 'Courier New', monospace", color: 'rgba(255,255,255,.75)' }}>
            // platforma skrinshoti — rasmni shu yerga tashlang
          </span>
        </div>
        
        <div style={{ position: 'absolute', left: '56px', top: '56px', background: 'rgba(255,255,255,.96)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 12px 30px rgba(0,0,0,.2)', maxWidth: '260px' }}>
          <span style={{ font: "600 13px 'Public Sans', sans-serif", color: '#8a8577' }}>Reading · Passage 2</span>
          <span style={{ font: "600 15px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>13/13 to'g'ri javob</span>
        </div>
        
        <div style={{ position: 'absolute', right: '56px', bottom: '56px', background: 'rgba(255,255,255,.96)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 12px 30px rgba(0,0,0,.2)' }}>
          <span style={{ font: "600 13px 'Public Sans', sans-serif", color: '#8a8577' }}>Mock Exam yakunlandi</span>
          <span style={{ font: "600 15px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>Band 7.5</span>
        </div>
        
        <div style={{ position: 'absolute', right: '28px', bottom: '28px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <span style={{ width: '4px', height: '14px', background: '#fff', borderRadius: '1px' }}></span>
          <span style={{ width: '4px', height: '14px', background: '#fff', borderRadius: '1px' }}></span>
        </div>
      </div>
    </section>
  );
};

// --- Logos ---
const Logos = () => {
  const logos = ["Cambridge", "IDP", "British Council", "Oxford", "IELTS", "Macmillan"];
  return (
    <div style={{ background: '#10102A', padding: '56px 64px', textAlign: 'center', fontFamily: "'Public Sans', sans-serif" }}>
      <span style={{ font: "600 13px 'Public Sans', sans-serif", letterSpacing: '.06em', color: '#A6A8C4', textTransform: 'uppercase' }}>O'zbekiston bo'ylab til markazlari ishonch bildirgan</span>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '28px', flexWrap: 'wrap' }}>
        {logos.map(logo => (
          <div key={logo} style={{ padding: '12px 22px', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px' }}>
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
    <div style={{ padding: '72px 64px', display: 'flex', justifyContent: 'center', gap: 0, fontFamily: "'Public Sans', sans-serif", background: '#F7F4EE' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: 'center', padding: '0 56px', borderRight: i < stats.length - 1 ? '1px solid rgba(30,27,22,.1)' : 'none' }}>
          <div style={{ font: "700 44px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>{s.value}</div>
          <div style={{ font: "400 14px 'Public Sans', sans-serif", color: '#6b6559', marginTop: '8px', maxWidth: '200px' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
};

// --- Features ---
const FeaturesHTML = () => {
  return (
    <div style={{ background: '#10102A', padding: '110px 64px', display: 'flex', flexDirection: 'column', gap: '88px', fontFamily: "'Public Sans', sans-serif" }}>
      <h2 style={{ margin: 0, textAlign: 'center', font: "700 40px 'Space Grotesk', sans-serif", color: '#fff' }}>Har bir modul uchun alohida yondashuv</h2>

      <div style={{ display: 'flex', gap: '80px', alignItems: 'center' }}>
        <div style={{ width: '440px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h3 style={{ margin: 0, font: "700 26px 'Space Grotesk', sans-serif", color: '#fff' }}>Reading: har bir javobni asoslab bering</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Band 5 dan 9 gacha real Cambridge formatidagi matnlar</span></div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Har bir noto'g'ri javob uchun matndan aynan qaysi qatorda javob borligi ko'rsatiladi</span></div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>O'qish tezligi va vaqt boshqaruvi bo'yicha statistika</span></div>
        </div>
        <div style={{ flex: 1, height: '340px', borderRadius: '20px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #7C93FF 0%, #4A5FE8 55%, #242A93 100%)' }}>
          <div style={{ position: 'absolute', left: '40px', right: '40px', top: '40px', background: 'rgba(255,255,255,.95)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ height: '10px', width: '100%', background: '#e7e4da', borderRadius: '4px' }}></div>
            <div style={{ height: '10px', width: '92%', background: '#e7e4da', borderRadius: '4px' }}></div>
            <div style={{ height: '10px', width: '96%', background: '#e7e4da', borderRadius: '4px' }}></div>
            <div style={{ height: '1px', background: 'rgba(0,0,0,.08)', margin: '8px 0' }}></div>
            <div style={{ height: '9px', width: '80%', background: '#f3d2c2', borderRadius: '4px' }}></div>
            <div style={{ height: '9px', width: '70%', background: '#e7e4da', borderRadius: '4px' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '80px', alignItems: 'center', flexDirection: 'row-reverse' }}>
        <div style={{ width: '440px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h3 style={{ margin: 0, font: "700 26px 'Space Grotesk', sans-serif", color: '#fff' }}>Listening: talaffuz va tezlikka o'rganing</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>4 ta qism, turli aksentlar — Britan, Avstraliya, Amerika</span></div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Har bir savolni qayta tinglab, transkriptdan tekshiring</span></div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Eshitib tushunish tezligingiz vaqt bo'yicha kuzatiladi</span></div>
        </div>
        <div style={{ flex: 1, height: '340px', borderRadius: '20px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #7C93FF 0%, #4A5FE8 55%, #242A93 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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

      <div style={{ display: 'flex', gap: '80px', alignItems: 'center' }}>
        <div style={{ width: '440px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h3 style={{ margin: 0, font: "700 26px 'Space Grotesk', sans-serif", color: '#fff' }}>Mock Exam: real imtihon holatida sinang</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Reading + Listening to'liq 2 soat 40 daqiqalik format</span></div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Imtihondan so'ng batafsil band ball tahlili</span></div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D97757', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span><span style={{ font: "400 15px/1.6 'Public Sans', sans-serif", color: '#A6A8C4' }}>Zaif tomonlaringiz bo'yicha keyingi hafta uchun reja</span></div>
        </div>
        <div style={{ flex: 1, height: '340px', borderRadius: '20px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #7C93FF 0%, #4A5FE8 55%, #242A93 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'conic-gradient(#fff 0% 68%, rgba(255,255,255,.25) 68% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '118px', height: '118px', borderRadius: '50%', background: '#242A93', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ font: "700 19px 'Space Grotesk', sans-serif", color: '#fff' }}>01:58:32</span>
              <span style={{ font: "400 11px 'Public Sans', sans-serif", color: '#A6A8C4' }}>Reading + Listening</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Testimonials ---
const Testimonials = () => {
  return (
    <div style={{ padding: '100px 64px', display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center', background: '#F7F4EE', fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{ width: '460px', padding: '36px', borderRadius: '16px', background: '#EFEBE2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <span style={{ font: "700 44px/1 'Space Grotesk', sans-serif", color: '#D97757' }}>"</span>
        <p style={{ margin: 0, font: "500 18px/1.5 'Space Grotesk', sans-serif", color: '#1E1B16' }}>Englev'dagi Mock Exam'lar aynan haqiqiy imtihondagidek his qildi. 6 haftada 6.5 dan 7.5 ballga chiqdim.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'repeating-linear-gradient(45deg, #d8d3c6 0 4px, #cfc9ba 4px 8px)' }}></span><div><div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#1E1B16' }}>Dilnoza R.</div><div style={{ font: "400 12px 'Public Sans', sans-serif", color: '#8a8577' }}>Englev talabasi</div></div></div>
      </div>
      <div style={{ width: '460px', padding: '36px', borderRadius: '16px', background: '#EFEBE2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <span style={{ font: "700 44px/1 'Space Grotesk', sans-serif", color: '#D97757' }}>"</span>
        <p style={{ margin: 0, font: "500 18px/1.5 'Space Grotesk', sans-serif", color: '#1E1B16' }}>Reading bo'limidagi izohlar tufayli qaysi savol turida ko'proq xato qilishimni tushunib, strategiyamni o'zgartirdim.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'repeating-linear-gradient(45deg, #d8d3c6 0 4px, #cfc9ba 4px 8px)' }}></span><div><div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#1E1B16' }}>Javlon M.</div><div style={{ font: "400 12px 'Public Sans', sans-serif", color: '#8a8577' }}>Englev talabasi</div></div></div>
      </div>
    </div>
  );
};

// --- Pricing ---
const Pricing = () => {
  const pricingBasicFeatures = ["Reading va Listening mashqlari", "Cheklangan mock examlar", "Asosiy tahlil"];
  const pricingStandardFeatures = ["Barcha mashqlar", "Cheksiz mock examlar", "To'liq AI tahlili", "Shaxsiy o'quv rejasi"];
  const pricingProFeatures = ["Standard barcha imkoniyatlar", "Haftalik mentor bilan muloqot", "Writing tekshiruvi (AI + Mentor)", "Speaking mock session"];

  return (
    <div style={{ background: '#F7F4EE', padding: '0 64px 110px', fontFamily: "'Public Sans', sans-serif" }}>
      <h2 style={{ margin: 0, textAlign: 'center', font: "700 40px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>Har bir bosqich uchun mos tarif</h2>
      <p style={{ margin: '16px auto 0', maxWidth: '520px', textAlign: 'center', font: "400 17px/1.6 'Public Sans', sans-serif", color: '#6b6559' }}>Istalgan vaqt bekor qilish mumkin — uzoq muddatli shartnoma yo'q.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '56px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ width: '320px', borderRadius: '14px', padding: '32px 28px', background: '#fff', border: '1px solid rgba(30,27,22,.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#8a8577' }}>Boshlang'ich</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}><span style={{ font: "700 36px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>149 000</span><span style={{ font: "500 14px 'Public Sans', sans-serif", color: '#8a8577' }}>so'm/oy</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pricingBasicFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e7e4da', flexShrink: 0, marginTop: '2px', color: '#8a8577', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ font: "400 13px 'Public Sans', sans-serif", color: '#4a4638', lineHeight: 1.5 }}>{f}</span></div>
            ))}
          </div>
          <button style={{ marginTop: 'auto', padding: '13px', borderRadius: '9px', border: '1px solid rgba(30,27,22,.15)', background: 'transparent', color: '#1E1B16', font: "600 13px 'Public Sans', sans-serif", cursor: 'pointer' }}>Tanlash</button>
        </div>
        <div style={{ width: '320px', borderRadius: '14px', padding: '32px 28px', background: '#1E1B16', border: '2px solid #D97757', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: '#D97757', color: '#fff', font: "600 11px 'Public Sans', sans-serif", padding: '6px 14px', borderRadius: '999px' }}>Eng ommabop</span>
          <div>
            <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#A6A8C4' }}>Standart</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}><span style={{ font: "700 36px 'Space Grotesk', sans-serif", color: '#fff' }}>299 000</span><span style={{ font: "500 14px 'Public Sans', sans-serif", color: '#A6A8C4' }}>so'm/oy</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pricingStandardFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#D97757', flexShrink: 0, marginTop: '2px', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ font: "400 13px 'Public Sans', sans-serif", color: '#A6A8C4', lineHeight: 1.5 }}>{f}</span></div>
            ))}
          </div>
          <button style={{ marginTop: 'auto', padding: '13px', borderRadius: '9px', border: 'none', background: '#D97757', color: '#fff', font: "600 13px 'Public Sans', sans-serif", cursor: 'pointer' }}>Tanlash</button>
        </div>
        <div style={{ width: '320px', borderRadius: '14px', padding: '32px 28px', background: '#fff', border: '1px solid rgba(30,27,22,.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#8a8577' }}>Pro + Mentor</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}><span style={{ font: "700 36px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>549 000</span><span style={{ font: "500 14px 'Public Sans', sans-serif", color: '#8a8577' }}>so'm/oy</span></div>
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
    <div style={{ background: '#EFEBE2', padding: '100px 64px', fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 40px', textAlign: 'center', font: "700 36px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>Ko'p so'raladigan savollar</h2>
        {faqs.map((f, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} style={{ borderBottom: '1px solid rgba(30,27,22,.1)', padding: '24px 0' }}>
              <div onClick={() => setOpenIndex(isOpen ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '16px' }}>
                <span style={{ font: "600 17px 'Space Grotesk', sans-serif", color: '#1E1B16' }}>{f.q}</span>
                <span style={{ font: "400 20px 'Public Sans', sans-serif", color: '#8a8577', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .3s ease', flexShrink: 0 }}>⌄</span>
              </div>
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
  return (
    <div style={{ background: '#10102A', padding: '96px 64px 56px', color: '#fff', fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <h2 style={{ margin: 0, font: "700 36px 'Space Grotesk', sans-serif" }}>Bugun birinchi mock testingizni bepul topshiring</h2>
        <Link to="/login" style={{ padding: '14px 30px', borderRadius: '999px', border: 'none', background: '#fff', color: '#10102A', font: "600 15px 'Public Sans', sans-serif", cursor: 'pointer', textDecoration: 'none' }}>Bepul boshlash</Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,.1)', margin: '72px 0 48px' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '48px', flexWrap: 'wrap' }}>
        <div style={{ maxWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '7px', background: '#D97757' }}></span>
            <span style={{ font: "700 18px 'Space Grotesk', sans-serif", color: '#fff' }}>Englev</span>
          </div>
          <p style={{ font: "400 14px/1.6 'Public Sans', sans-serif", color: '#A6A8C4', marginTop: '14px' }}>Sun'iy intellekt asosidagi IELTS Reading, Listening va Mock Exam tayyorgarlik platformasi.</p>
        </div>
        <div><div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#fff', marginBottom: '16px' }}>Mahsulot</div><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><Link to="/reading" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Reading</Link><Link to="/listening" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Listening</Link><Link to="/mock-exam" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Mock Exam</Link><Link to="/pricing" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Narxlar</Link></div></div>
        <div><div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#fff', marginBottom: '16px' }}>Kompaniya</div><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><Link to="/about" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Biz haqimizda</Link><Link to="/blog" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Blog</Link><Link to="/contact" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Aloqa</Link></div></div>
        <div><div style={{ font: "600 14px 'Public Sans', sans-serif", color: '#fff', marginBottom: '16px' }}>Yordam</div><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><Link to="/faq" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>FAQ</Link><Link to="/support" style={{ font: "400 14px 'Public Sans', sans-serif", color: '#A6A8C4', textDecoration: 'none' }}>Qo'llab-quvvatlash</Link></div></div>
      </div>
      <div style={{ marginTop: '64px', font: "400 13px 'Public Sans', sans-serif", color: '#6f7191' }}>© 2026 Englev. Barcha huquqlar himoyalangan.</div>
    </div>
  );
};

// --- Main Page Component ---
export default function IELTSPortalLanding() {
  return (
    <div style={{ background: '#F7F4EE', minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
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