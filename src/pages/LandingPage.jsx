// src/pages/LandingPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // 🔥 ROUTING ULANDI
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  BarChart3, 
  Key, 
  Zap, 
  ArrowRight, 
  Menu,
  X,
  Play,
  Volume2,
  FileText,
  Headphones,
  Users,
  Award
} from 'lucide-react';

// --- Reusable Animation Components ---
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// --- Navbar Component with Mobile Menu ---
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-white/80 border-b border-white/20 supports-[backdrop-filter]:bg-white/60"
      >
        <div className="text-xl font-semibold tracking-tight text-gray-900 cursor-pointer z-50">
          IELTS Portal
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {/* 🔥 Login Link */}
          <Link to="/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-black">
            Kirish
          </Link>
          {/* 🔥 Register Link (Loginga yo'naltirildi) */}
          <Link to="/login" className="px-5 py-2 text-sm font-medium text-white transition-transform bg-black rounded-full hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
            Ro'yxatdan o'tish
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="md:hidden p-2 text-gray-600 z-50"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md md:hidden space-y-8"
          >
            <a href="#" className="text-2xl font-medium text-gray-900" onClick={() => setIsOpen(false)}>Asosiy</a>
            <a href="#features" className="text-2xl font-medium text-gray-900" onClick={() => setIsOpen(false)}>Xususiyatlar</a>
            <hr className="w-12 border-gray-300" />
            
            {/* 🔥 Mobile Links */}
            <Link to="/login" className="text-xl font-medium text-gray-600" onClick={() => setIsOpen(false)}>
                Kirish
            </Link>
            <Link to="/login" className="px-8 py-3 text-lg font-medium text-white bg-black rounded-full shadow-xl" onClick={() => setIsOpen(false)}>
              Ro'yxatdan o'tish
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Social Proof Component ---
const Stats = () => (
  <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-12 py-6 border-y border-gray-200/50 bg-white/30 backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Users size={20} /></div>
      <div>
        <p className="text-2xl font-bold text-gray-900">10,000+</p>
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Faol O'quvchilar</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-yellow-100 rounded-full text-yellow-600"><Award size={20} /></div>
      <div>
        <p className="text-2xl font-bold text-gray-900">7.5</p>
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">O'rtacha Ball</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle2 size={20} /></div>
      <div>
        <p className="text-2xl font-bold text-gray-900">98%</p>
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Tavsiya qiladi</p>
      </div>
    </div>
  </div>
);

const Hero = () => {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen pt-32 pb-16 overflow-hidden md:pt-40">
      
      {/* Optimized Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-200/40 rounded-full blur-[80px] mix-blend-multiply"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[80px] mix-blend-multiply"
        />
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-4xl px-6 text-center z-10"
      >
        <motion.h1 
          variants={fadeInUp}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-[#1D1D1F] leading-[1.1] mb-6 relative"
        >
          <span className="relative z-10">IELTS dan yuqori ball olishning eng zamonaviy usuli.</span>
        </motion.h1>
        
        <motion.p 
          variants={fadeInUp}
          className="max-w-2xl mx-auto mb-10 text-xl font-medium text-gray-600 md:text-2xl leading-relaxed relative z-10"
        >
          Real imtihon muhiti, sun'iy intellekt yordamida chuqur tahlil va aniq natijalar.
        </motion.p>
        
        <motion.div 
          variants={fadeInUp}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row relative z-10"
        >
          {/* 🔥 Boshlash Linki */}
          <Link to="/login" className="flex items-center gap-2 px-8 py-4 text-lg font-medium text-white transition-all bg-black rounded-full hover:bg-gray-800 hover:scale-105 shadow-xl shadow-black/20 w-full sm:w-auto justify-center">
            Boshlash <ArrowRight size={18} />
          </Link>
          
          <button 
            onClick={() => document.getElementById('mockups').scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-8 py-4 text-lg font-medium text-black transition-all bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 backdrop-blur-sm bg-white/80 w-full sm:w-auto justify-center"
          >
            Namuna ko'rish
          </button>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="w-full mt-16 z-10 relative"
      >
        <Stats />
      </motion.div>
    </section>
  );
};

// --- New Section: Interactive Test Mockups ---
const TestMockups = () => {
  return (
    <section id="mockups" className="py-24 px-6 md:px-12 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">Haqiqiy Imtihon Muhiti</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Reading va Listening bo'limlari xuddi rasmiy imtihondagidek ko'rinishda.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Reading Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-[2rem] blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
             <div className="relative bg-white border border-gray-200 rounded-[1.5rem] shadow-2xl overflow-hidden h-[500px] flex flex-col">
                {/* Browser Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                   <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                   </div>
                   <div className="ml-4 px-3 py-1 bg-white rounded-md border border-gray-200 text-xs text-gray-400 flex items-center gap-2">
                      <FileText size={12} /> ielts-portal.com/reading/test-1
                   </div>
                </div>
                
                {/* Reading Interface */}
                <div className="flex flex-1 overflow-hidden">
                   {/* Left: Text Passage */}
                   <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto bg-gray-50/50">
                      <h4 className="font-bold text-gray-900 text-lg mb-4">The History of Silk</h4>
                      <p className="text-xs leading-relaxed text-gray-600 mb-3 text-justify">
                         Silk is a natural protein fiber, some forms of which can be woven into textiles. The protein fiber of silk is composed mainly of fibroin and is produced by certain insect larvae to form cocoons. The best-known silk is obtained from the cocoons of the larvae of the mulberry silkworm Bombyx mori reared in captivity (sericulture).
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 mb-3 text-justify">
                         The shimmering appearance of silk is due to the triangular prism-like structure of the silk fibre, which allows silk cloth to refract incoming light at different angles, thus producing different colors.
                      </p>
                      <div className="h-20 w-full bg-gray-200/50 rounded animate-pulse mt-4"></div>
                   </div>
                   
                   {/* Right: Questions */}
                   <div className="w-1/2 p-6 overflow-y-auto bg-white">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-xs font-bold text-red-500">Time left: 58:20</span>
                         <span className="text-xs font-medium text-gray-400">Part 1</span>
                      </div>
                      
                      <div className="space-y-6">
                         <div>
                            <p className="text-sm font-medium text-gray-800 mb-2">1. Silk is produced by:</p>
                            <div className="space-y-2">
                               <div className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-100 transition-all">
                                  <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                                  <span className="text-xs text-gray-600">Spider webs</span>
                               </div>
                               <div className="flex items-center gap-2 p-2 rounded bg-blue-50 border border-blue-200 cursor-pointer">
                                  <div className="w-4 h-4 rounded-full border-4 border-blue-600"></div>
                                  <span className="text-xs text-gray-900 font-medium">Insect larvae</span>
                               </div>
                               <div className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-100 transition-all">
                                  <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                                  <span className="text-xs text-gray-600">Plant fibers</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="mt-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2"><FileText className="text-blue-600"/> Reading Practice</h3>
                <p className="text-gray-500 text-sm mt-2">Split-screen interfeysi, matnni belgilash (highlight) imkoniyati.</p>
             </div>
          </motion.div>

          {/* Listening Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
             <div className="absolute -inset-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-[2rem] blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
             <div className="relative bg-white border border-gray-200 rounded-[1.5rem] shadow-2xl overflow-hidden h-[500px] flex flex-col">
                {/* Browser Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                   <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                   </div>
                   <div className="ml-4 px-3 py-1 bg-white rounded-md border border-gray-200 text-xs text-gray-400 flex items-center gap-2">
                      <Headphones size={12} /> ielts-portal.com/listening/test-4
                   </div>
                </div>

                {/* Listening Interface */}
                <div className="flex flex-col flex-1 p-8 bg-white relative">
                   {/* Audio Player */}
                   <div className="bg-[#1D1D1F] rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden text-white">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
                               <Play size={18} fill="black" />
                            </div>
                            <div>
                               <p className="text-sm font-bold">Section 2: University Tour</p>
                               <p className="text-xs text-gray-400">Audio playing...</p>
                            </div>
                         </div>
                         <Volume2 size={20} className="text-gray-400" />
                      </div>
                      
                      {/* Waveform Visualization */}
                      <div className="flex items-center gap-1 h-12 justify-center mb-2">
                         {[...Array(30)].map((_, i) => (
                            <motion.div 
                               key={i}
                               animate={{ height: [10, Math.random() * 40 + 10, 10] }}
                               transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                               className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full opacity-80"
                            />
                         ))}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-700 h-1 rounded-full mt-2 overflow-hidden">
                         <motion.div 
                            initial={{ width: "0%" }}
                            whileInView={{ width: "45%" }}
                            transition={{ duration: 20, ease: "linear" }}
                            className="h-full bg-blue-500"
                         />
                      </div>
                   </div>

                   {/* Questions Area */}
                   <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                      <div>
                         <p className="text-sm font-semibold text-gray-900 mb-3">Questions 11-14</p>
                         <p className="text-xs text-gray-500 italic mb-4">Choose the correct letter, A, B or C.</p>
                         
                         <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                            <p className="text-sm text-gray-800 mb-3 font-medium">11. What is the main purpose of the library renovation?</p>
                            <div className="space-y-2">
                               <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-blue-500"></div>
                                  <span className="text-sm text-gray-600 group-hover:text-gray-900">A. To increase seating capacity</span>
                               </label>
                               <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-blue-500"></div>
                                  <span className="text-sm text-gray-600 group-hover:text-gray-900">B. To add more computer terminals</span>
                               </label>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="mt-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2"><Headphones className="text-purple-600"/> Listening Practice</h3>
                <p className="text-gray-500 text-sm mt-2">Yuqori sifatli audio va real vaqt rejimidagi savollar.</p>
             </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

const BentoGrid = () => {
  return (
    <section id="features" className="px-6 py-24 bg-[#F5F5F7] md:px-12 relative z-10 border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Nega aynan biz?</h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:auto-rows-[300px]">
          
          {/* Card 1 - Large */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="group relative md:col-span-2 overflow-hidden bg-white rounded-3xl p-8 flex flex-col justify-between cursor-default shadow-sm border border-gray-100"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-10 -translate-y-4">
                <CheckCircle2 size={200} />
             </div>
            <div className="z-10">
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-blue-600 rounded-full shadow-lg shadow-blue-500/30">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Full Mock Exams</h3>
              <p className="text-lg font-medium text-gray-600">Reading, Listening va Writing bo'limlari xuddi real imtihondagidek.</p>
            </div>
            <div className="mt-8 bg-gray-50 backdrop-blur-md rounded-xl p-4 w-full max-w-xs border border-gray-200 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700">Simulyatsiya faol</span>
                </div>
            </div>
          </motion.div>

          {/* Card 2 - Analytics */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-3xl p-8 flex flex-col justify-between overflow-hidden cursor-default shadow-sm border border-gray-100"
          >
            <div className="z-10">
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30">
                <BarChart3 size={24} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Chuqur Tahlil</h3>
              <p className="font-medium text-gray-600">Har bir testdan so'ng xatolaringizni ko'rib chiqing.</p>
            </div>
            {/* Visual Abstract Graph */}
            <div className="flex items-end gap-2 h-24 mt-4 opacity-80">
                <motion.div 
                  initial={{ height: "10%" }} 
                  whileInView={{ height: "100%" }} 
                  transition={{ duration: 1, delay: 0.2 }}
                  className="w-1/4 bg-indigo-300 rounded-t-lg" 
                />
                <motion.div 
                  initial={{ height: "10%" }} 
                  whileInView={{ height: "50%" }} 
                  transition={{ duration: 1, delay: 0.3 }}
                  className="w-1/4 bg-indigo-300 rounded-t-lg" 
                />
                <motion.div 
                  initial={{ height: "10%" }} 
                  whileInView={{ height: "75%" }} 
                  transition={{ duration: 1, delay: 0.4 }}
                  className="w-1/4 bg-indigo-400 rounded-t-lg" 
                />
                <motion.div 
                  initial={{ height: "10%" }} 
                  whileInView={{ height: "90%" }} 
                  transition={{ duration: 1, delay: 0.5 }}
                  className="w-1/4 bg-indigo-600 rounded-t-lg" 
                />
            </div>
          </motion.div>

          {/* Card 3 - Access Keys */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-3xl p-8 flex flex-col justify-between cursor-default group shadow-sm border border-gray-100"
          >
            <div>
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-orange-500 rounded-full shadow-lg shadow-orange-500/30">
                <Key size={24} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Maxsus Kodlar</h3>
              <p className="font-medium text-gray-600">O'qituvchingiz bergan kalit (Access Key) orqali yopiq testlarga kiring.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="bg-gray-50 px-4 py-2 rounded-lg font-mono text-xs text-gray-400 border border-gray-200 group-hover:border-orange-200 transition-colors">
                 XXX-XXX-XXX
              </div>
            </div>
          </motion.div>

          {/* Card 4 - Speed (Span 2 to balance) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="md:col-span-2 bg-[#1D1D1F] text-white rounded-3xl p-8 flex flex-row items-center justify-between relative overflow-hidden cursor-default shadow-lg"
          >
            <div className="z-10 max-w-md">
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-black bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/20">
                <Zap size={24} />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Tez va Qulay</h3>
              <p className="text-lg font-medium text-gray-400">Hech qanday qotishlarsiz, yuqori tezlikdagi interfeys.</p>
            </div>
            {/* Speed lines effect */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-yellow-500/10 to-transparent skew-x-12 transform origin-bottom-right"></div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

const Workflow = () => {
  const steps = [
    { title: "Ro'yxatdan o'ting", desc: "Shaxsiy kabinet yarating" },
    { title: "Testni tanlang", desc: "Yoki Access Key kiriting" },
    { title: "Natijani oling", desc: "Avtomatik tekshirish va tahlil" }
  ];

  return (
    <section className="px-6 py-32 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto">
        <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mb-20 text-3xl font-bold text-center text-gray-900 md:text-4xl"
        >
            Bu qanday ishlaydi?
        </motion.h2>

        <div className="relative flex flex-col justify-between gap-12 md:gap-8 md:flex-row">
            {/* Connecting Line (Desktop) */}
            <div className="absolute hidden w-full h-0.5 transform -translate-y-1/2 bg-gray-200 top-[26px] md:block z-0" />

            {steps.map((step, index) => (
                <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                    className="relative z-10 flex flex-col items-center text-center group"
                >
                    <div className="flex items-center justify-center w-14 h-14 mb-6 text-xl font-bold text-white transition-all duration-300 bg-black border-4 border-white rounded-full group-hover:scale-110 group-hover:bg-blue-600 shadow-xl">
                        {index + 1}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h4>
                    <p className="text-base text-gray-500">{step.desc}</p>
                </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
};

const FooterCTA = () => (
    <section className="px-6 py-32 text-center bg-black">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
        >
            <h2 className="mb-8 text-4xl font-bold tracking-tight text-white md:text-6xl">
                Tayyorgarlikni bugun boshlang.
            </h2>
            {/* 🔥 Hisob ochish Linki */}
            <Link to="/login" className="px-8 py-4 text-lg font-medium text-black transition-transform bg-white rounded-full hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] inline-block">
                Hisob ochish
            </Link>
        </motion.div>
    </section>
)

const Footer = () => (
    <footer className="px-6 py-12 bg-gray-50 border-t border-gray-200 text-sm font-medium text-gray-500">
        <div className="flex flex-col items-center justify-between max-w-6xl mx-auto gap-4 md:flex-row">
            <p>© 2026 IELTS Portal. Barcha huquqlar himoyalangan.</p>
            <div className="flex gap-6">
                <a href="#" className="hover:text-black transition-colors">Biz haqimizda</a>
                <a href="#" className="hover:text-black transition-colors">Aloqa</a>
                <a href="#" className="hover:text-black transition-colors">Maxfiylik siyosati</a>
            </div>
        </div>
    </footer>
)

// --- Main Layout Component ---

export default function IELTSPortalLanding() {
  return (
    <div className="min-h-screen font-sans bg-[#F5F5F7] selection:bg-black selection:text-white">
      <Navbar />
      <Hero />
      <TestMockups />
      <BentoGrid />
      <Workflow />
      <FooterCTA />
      <Footer />
    </div>
  );
}