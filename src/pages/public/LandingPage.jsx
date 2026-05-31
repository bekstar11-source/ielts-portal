import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import SiteFooter from '../../components/common/SiteFooter';
import Navbar from '../../components/common/Navbar';
import SchemaMarkup from '../../components/common/SchemaMarkup';
import { useTranslation } from '../../context/LanguageContext';
import {
  Sparkles,
  Globe,
  Settings,
  BookOpen,
  BarChart3,
  ArrowRight,
  Headphones,
  CheckCircle2,
  Plus,
  Minus,
  Award,
  Volume2,
  Layers
} from 'lucide-react';

// --- Reusable Animation Variants ---
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

// --- Mockup Window Component ---
const ImageMockup = ({ src, alt }) => {
  const isListening = alt.toLowerCase().includes('listening');
  const isReading = alt.toLowerCase().includes('reading');
  const isProgress = alt.toLowerCase().includes('progress') || alt.toLowerCase().includes('dashboard');

  return (
    <div className="relative max-w-5xl mx-auto mt-12 group">
      {/* Floating Badges */}
      {isListening && (
        <>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-10 left-[-20px] z-20 hidden lg:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-xl shadow-[0_10px_35px_rgba(99,102,241,0.08)] text-xs font-bold text-gray-800"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Interactive Audio Player</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute bottom-10 right-[-20px] z-20 hidden lg:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border border-violet-100 rounded-xl shadow-[0_10px_35px_rgba(139,92,246,0.08)] text-xs font-bold text-gray-800"
          >
            <span>Real-time Answer Sync</span>
          </motion.div>
        </>
      )}

      {isReading && (
        <>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-12 left-[-25px] z-20 hidden lg:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border border-cyan-100 rounded-xl shadow-[0_10px_35px_rgba(6,182,212,0.08)] text-xs font-bold text-gray-800"
          >
            <span>Split-Screen Passage & Questions</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute bottom-16 right-[-20px] z-20 hidden lg:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-xl shadow-[0_10px_35px_rgba(99,102,241,0.08)] text-xs font-bold text-gray-800"
          >
            <span>Built-in Text Highlighter</span>
          </motion.div>
        </>
      )}

      {isProgress && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-[20%] right-[-15px] z-20 hidden lg:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border border-violet-100 rounded-xl shadow-[0_10px_35px_rgba(139,92,246,0.08)] text-xs font-bold text-gray-800"
          >
            <span>AI Score Estimation</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute bottom-[20%] left-[-20px] z-20 hidden lg:flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-xl shadow-[0_10px_35px_rgba(99,102,241,0.08)] text-xs font-bold text-gray-800"
          >
            <span>In-depth Performance Analytics</span>
          </motion.div>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative bg-white rounded-2xl border border-gray-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 group-hover:shadow-[0_30px_70px_rgba(99,102,241,0.08)] group-hover:-translate-y-1"
      >
        {/* Browser Bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50/80 border-b border-gray-100 select-none">
          <div className="w-2 h-2 rounded-full bg-red-450"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-450"></div>
          <div className="w-2 h-2 rounded-full bg-green-455"></div>
        </div>
        <img src={src} alt={alt} className="w-full h-auto object-contain block" />
      </motion.div>
    </div>
  );
};

// --- Section Header Pill ---
const SectionPill = ({ icon: Icon, text, colorClass = "text-indigo-650 bg-indigo-50 border-indigo-200 shadow-indigo-100/50" }) => {
  const IconComponent = Icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full mb-6 border select-none shadow-sm ${colorClass}`}>
      <IconComponent size={12} /> {text}
    </div>
  );
};

// --- Hero Section ---
const Hero = () => {
  const { t } = useTranslation();

  const renderTitle = () => {
    const text = t('landing.heroTitle');
    const highlightUZ = "bitta joyda";
    const highlightEN = "in one place";
    
    const highlight = text.includes(highlightUZ) ? highlightUZ : (text.includes(highlightEN) ? highlightEN : "");
    if (!highlight) return <span>{text}</span>;
    
    const parts = text.split(highlight);
    return (
      <>
        {parts[0]}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 font-extrabold">{highlight}</span>
        {parts[1]}
      </>
    );
  };

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen pt-32 pb-20 overflow-hidden bg-white">
      {/* Indigo/Violet Glow Gradients in Background */}
      <div className="absolute left-[-200px] top-[15%] w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute right-[-200px] bottom-[10%] w-[450px] h-[450px] bg-violet-100/25 rounded-full blur-[100px] pointer-events-none z-0" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-4xl px-6 text-center z-10"
      >
        <motion.div variants={fadeInUp}>
          <SectionPill icon={Sparkles} text={t('landing.aiPowered')} colorClass="text-indigo-600 bg-indigo-50 border-indigo-200" />
        </motion.div>

        <motion.h1
          variants={fadeInUp}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1D1D1F] leading-[1.1] mb-6"
        >
          {renderTitle()}
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          className="max-w-2xl mx-auto mb-10 text-lg font-medium text-gray-500 md:text-xl leading-relaxed"
        >
          {t('landing.heroSubtitle')}
        </motion.p>

        <motion.div
          variants={fadeInUp}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link to="/login" className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white transition-all bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:scale-[1.02] active:scale-95 rounded-xl shadow-lg shadow-indigo-200/50 w-full sm:w-auto justify-center">
            {t('landing.getStarted')} <ArrowRight size={16} />
          </Link>

          <button
            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center justify-center px-8 py-3.5 text-base font-semibold text-gray-700 transition-all bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 rounded-xl w-full sm:w-auto"
          >
            {t('landing.learnMore')}
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};

// --- Features Section ---
const Features = () => {
  const { t } = useTranslation();

  const cards = [
    {
      icon: BookOpen,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
      title: t('landing.readingTests'),
      desc: t('landing.readingTestsDesc')
    },
    {
      icon: Headphones,
      iconColor: "text-violet-600 bg-violet-50 border-violet-100",
      title: t('landing.listeningTests'),
      desc: t('landing.listeningTestsDesc')
    },
    {
      icon: CheckCircle2,
      iconColor: "text-cyan-600 bg-cyan-50 border-cyan-100",
      title: t('landing.answerReview'),
      desc: t('landing.answerReviewDesc')
    }
  ];

  return (
    <section id="features" className="py-24 px-6 md:px-12 bg-white relative overflow-hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionPill icon={Globe} text={t('landing.completeExamExp')} colorClass="text-gray-800 bg-gray-50 border-gray-200" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.featuresTitle')}</h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">{t('landing.featuresSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-2xl p-8 flex flex-col items-start shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:border-indigo-200 hover:shadow-[0_15px_35px_rgba(99,102,241,0.05)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`p-3.5 rounded-xl border mb-6 transition-transform group-hover:scale-110 duration-300 ${card.iconColor}`}>
                <card.icon size={22} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors duration-300">{card.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => document.getElementById('listening-section').scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all rounded-xl"
          >
            {t('landing.seeMoreFeatures')} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
};

// --- Showcases Sections ---
const Showcases = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50/50">
      
      {/* Listening Showcase */}
      <section id="listening-section" className="py-24 px-6 md:px-12 bg-transparent relative overflow-hidden border-t border-gray-100">
        <div className="absolute left-10 top-1/4 w-[300px] h-[300px] bg-indigo-50 rounded-full blur-[80px] pointer-events-none z-0" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <SectionPill icon={Settings} text={t('landing.listeningInterface')} colorClass="text-indigo-800 bg-indigo-50 border-indigo-200" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.listeningInterface')}</h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">{t('landing.listeningInterfaceDesc')}</p>
          </div>
          <ImageMockup src="/images/landing/img3.png" alt="Listening Practice Interface" />
        </div>
      </section>

      {/* Reading Showcase */}
      <section id="reading-section" className="py-24 px-6 md:px-12 bg-white relative overflow-hidden border-t border-gray-100">
        <div className="absolute right-10 top-1/4 w-[300px] h-[300px] bg-violet-50 rounded-full blur-[80px] pointer-events-none z-0" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <SectionPill icon={BookOpen} text={t('landing.readingInterface')} colorClass="text-violet-800 bg-violet-50 border-violet-200" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.readingInterface')}</h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">{t('landing.readingInterfaceDesc')}</p>
          </div>
          <ImageMockup src="/images/landing/img5.png" alt="Reading Practice Interface" />
        </div>
      </section>

      {/* Progress Showcase */}
      <section id="progress-section" className="py-24 px-6 md:px-12 bg-transparent relative overflow-hidden border-t border-gray-100">
        <div className="absolute left-1/3 bottom-10 w-[350px] h-[350px] bg-cyan-50 rounded-full blur-[90px] pointer-events-none z-0" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <SectionPill icon={BarChart3} text={t('landing.trackProgress')} colorClass="text-cyan-800 bg-cyan-50 border-cyan-200" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.trackProgress')}</h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">{t('landing.trackProgressDesc')}</p>
          </div>
          <ImageMockup src="/images/landing/img1.png" alt="Student Progress Dashboard" />
        </div>
      </section>

    </div>
  );
};

// --- News Section ---
const NewsSection = () => {
  const { t } = useTranslation();

  const newsItems = [
    {
      badge: t('landing.aiPowered'),
      badgeColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
      title: t('landing.newsItem1Title'),
      desc: t('landing.newsItem1Desc'),
      date: "May 2026",
      icon: Award
    },
    {
      badge: "New Content",
      badgeColor: "text-violet-600 bg-violet-50 border-violet-200",
      title: t('landing.newsItem2Title'),
      desc: t('landing.newsItem2Desc'),
      date: "May 2026",
      icon: Layers
    },
    {
      badge: "Feature Boost",
      badgeColor: "text-cyan-600 bg-cyan-50 border-cyan-200",
      title: t('landing.newsItem3Title'),
      desc: t('landing.newsItem3Desc'),
      date: "April 2026",
      icon: Volume2
    }
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-white relative overflow-hidden border-t border-gray-100">
      <div className="absolute right-[-100px] top-[20%] w-[350px] h-[350px] bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <SectionPill icon={Sparkles} text="Yangiliklar" colorClass="text-indigo-600 bg-indigo-50 border-indigo-200" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.newsTitle')}</h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">{t('landing.newsSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative flex flex-col bg-white border border-gray-200/80 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{item.date}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-50/50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <IconComponent size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed flex-grow">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// --- FAQ Section ---
const FAQSection = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    { q: t('landing.faqQ1'), a: t('landing.faqA1') },
    { q: t('landing.faqQ2'), a: t('landing.faqA2') },
    { q: t('landing.faqQ3'), a: t('landing.faqA3') },
    { q: t('landing.faqQ4'), a: t('landing.faqA4') }
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="py-24 px-6 md:px-12 bg-gray-50/50 relative overflow-hidden border-t border-gray-100">
      <div className="absolute left-[-150px] bottom-[10%] w-[400px] h-[400px] bg-violet-50/70 rounded-full blur-[110px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <SectionPill icon={Globe} text="FAQ" colorClass="text-violet-600 bg-violet-50 border-violet-200" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.faqTitle')}</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">{t('landing.faqSubtitle')}</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_25px_rgba(0,0,0,0.02)]"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left font-bold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  <span className="text-base md:text-lg pr-4">{faq.q}</span>
                  <div className="p-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[300px] opacity-100 border-t border-gray-50' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-6 py-5 text-sm md:text-base text-gray-500 leading-relaxed bg-gray-50/20">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// --- Custom Bento/Utility Info ---
const UtilityInfo = () => {
  const { t } = useTranslation();

  return (
    <section className="px-6 py-24 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">{t('landing.howItWorks')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="absolute hidden md:block top-1/2 left-0 right-0 h-0.5 bg-gray-100 -translate-y-12 z-0" />
          {[1, 2, 3].map((step) => (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md">
                {step}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t(`landing.step${step}Title`)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(`landing.step${step}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Bottom Footer CTA ---
const FooterCTA = () => {
  const { t } = useTranslation();
  return (
    <section className="px-6 py-28 text-center bg-slate-950 relative overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        <h2 className="mb-8 text-4xl font-bold tracking-tight text-white md:text-5xl">
          {t('landing.startCTA')}
        </h2>
        <Link to="/login" className="px-8 py-3.5 text-base font-semibold text-indigo-900 transition-all bg-white hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 rounded-xl inline-block shadow-xl shadow-white/5">
          {t('landing.createAccount')}
        </Link>
      </motion.div>
    </section>
  );
};

// --- Main Page Component ---
export default function IELTSPortalLanding() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-200 selection:text-indigo-900">
      <SchemaMarkup />
      <Navbar />
      <Hero />
      <Features />
      <Showcases />
      <NewsSection />
      <FAQSection />
      <UtilityInfo />
      <FooterCTA />
      <SiteFooter />
    </div>
  );
}