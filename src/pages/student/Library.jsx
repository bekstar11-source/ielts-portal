import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  BookOpen, Headphones, PenTool, Mic, ArrowRight
} from 'lucide-react';

// COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";
import LibrarySubHeader from "../../components/dashboard/LibrarySubHeader";
import SiteFooter from "../../components/common/SiteFooter";
import BottomNav from "../../components/dashboard/BottomNav";

export default function Library() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'overview';
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9f9ff] font-sans text-[#1d1d1f] selection:bg-black/5">
      <DashboardHeader
        user={user}
        userData={userData}
        activeTab="library"
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      <LibrarySubHeader activeTab={activeTab} />

      <main className="w-full pb-24 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="w-full mx-auto py-0"
          >
            {activeTab === 'overview' && (
              <LibraryOverview 
                onTabChange={(tab) => {
                  if (tab === 'reading') navigate('/reading');
                  else if (tab === 'listening') navigate('/listening');
                  else navigate(`/library?tab=${tab}`);
                }} 
              />
            )}
            
            {/* Other tabs are handled via navigation to standalone pages or specific library sub-states */}
            {activeTab !== 'overview' && (
              <div className="py-20 text-center">
                <h2 className="text-2xl font-bold capitalize">{activeTab} section</h2>
                <p className="text-zinc-500 mt-2">Loading resources...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SiteFooter />

      <DashboardModals
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        confirmLogout={logout}
      />
      
      <BottomNav 
        activeTab="library" 
        setActiveTab={(id) => {
          if (id === 'dashboard') navigate('/dashboard');
          else if (id === 'library') navigate('/library');
          else if (id === 'podcasts') navigate('/podcasts');
          else if (id === 'results') navigate('/my-results');
          else if (id === 'settings') navigate('/settings');
        }} 
      />
    </div>
  );
}

function LibraryOverview({ onTabChange }) {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-8 pb-12 px-0">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[56px] font-bold tracking-tight text-[#1d1d1f] leading-[1.07] mb-6"
          >
            IELTS
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[28px] font-normal text-[#333333] leading-[1.14] tracking-[0.196px] max-w-2xl mb-10"
          >
            Everything you need to achieve your target band score, organized and ready for you.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex gap-4 mb-10"
          >
            <button 
              onClick={() => onTabChange('reading')}
              className="bg-[#0066cc] text-white px-8 py-3 rounded-full text-[18px] font-light hover:bg-[#0071e3] transition-all active:scale-95"
            >
              Start Learning
            </button>
            <button className="border border-[#0066cc] text-[#0066cc] px-8 py-3 rounded-full text-[18px] font-light hover:bg-[#0066cc]/5 transition-all active:scale-95">
              View Sample
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full max-w-5xl shadow-[rgba(0,0,0,0.22)_3px_5px_30px] rounded-2xl overflow-hidden bg-[#f5f5f7]"
          >
            <img 
              className="w-full h-[350px] object-cover object-center" 
              src="/compact_hero_mockup.png" 
              alt="IELTS Hub Preview"
            />
          </motion.div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="bg-[#f5f5f7] py-24 -mx-6 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-[40px] font-bold text-[#1d1d1f] tracking-tight mb-4">Master Every Module.</h2>
            <p className="text-[17px] text-[#333333]">Choose your focus area and dive deep with curated materials.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModuleCard 
              title="Reading"
              description="Comprehensive practice tests with detailed answer keys and time management strategies."
              icon={<BookOpen size={24} />}
              onClick={() => onTabChange('reading')}
            />
            <ModuleCard 
              title="Listening"
              description="High-quality audio exercises across various accents and difficulty levels."
              icon={<Headphones size={24} />}
              onClick={() => onTabChange('listening')}
            />
            <ModuleCard 
              title="Writing"
              description="Sample essays, structure guides, and band 9 vocabulary banks for Task 1 and 2."
              icon={<PenTool size={24} />}
              onClick={() => onTabChange('writing')}
            />
            <ModuleCard 
              title="Speaking"
              description="Interactive mock exams and common question topics with model answers."
              icon={<Mic size={24} />}
              onClick={() => onTabChange('speaking')}
            />
          </div>
        </div>
      </section>

      {/* Product Spotlight Section */}
      <section className="bg-white py-24 px-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 px-6">
          <div className="flex-1">
            <span className="text-[21px] font-bold text-[#0066cc] mb-4 block">Personalized Prep</span>
            <h2 className="text-[34px] font-bold text-[#1d1d1f] leading-[1.47] mb-6">AI-Driven Feedback for your Writing & Speaking.</h2>
            <p className="text-[28px] font-normal text-[#333333] leading-[1.14] mb-8">Get instant band scores and detailed improvement suggestions using our proprietary linguistic analysis engine.</p>
            <button className="bg-black text-white px-8 py-3 rounded-full text-[18px] font-light hover:bg-black/80 transition-all active:scale-95">
              Learn More
            </button>
          </div>
          <div className="flex-1 w-full">
            <img 
              className="w-full rounded-2xl shadow-[rgba(0,0,0,0.22)_3px_5px_30px] object-cover h-[450px]" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDroOSCoMY_FWyURsRcp6ziiZN1yMpbPYSSnJBhVWpIP75QypLlz0IiGENdCIJqJexKSbBg0oCLIGHolI03USyLXFIuSXTiyddJOdzj1k01Ydxm7W4PqJkZKiFUnpsflsGEt1j4z4dcRtdfRkcJm9XynY7WWs6u2TLuMBxD6TvqFVvfFdyAlVCjGIm_06RrBy1P47odTfFyPMDeYE_Mr1lrI-tiUswYhakcD26Fim7ZMxUytsNaSD6u9qYjW7J8huCPgaXPK2V67hxC" 
              alt="AI Feedback Interface"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ title, description, icon, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-[#e0e0e0] p-8 rounded-xl flex flex-col items-start transition-all hover:scale-[0.98] cursor-pointer group"
    >
      <div className="w-12 h-12 rounded-lg bg-[#0066cc]/10 flex items-center justify-center mb-6 text-[#0066cc]">
        {icon}
      </div>
      <h3 className="text-[17px] font-bold text-[#1d1d1f] mb-2">{title}</h3>
      <p className="text-[17px] font-normal text-[#7a7a7a] mb-6 leading-snug">{description}</p>
      <div className="text-[#0066cc] text-[17px] font-normal flex items-center gap-1 group-hover:gap-2 transition-all">
        Explore <ArrowRight size={16} />
      </div>
    </div>
  );
}


function ResourceCard({ title, tag, image }) {
  return (
    <div className="group cursor-pointer">
      <div className="aspect-[16/10] overflow-hidden rounded-[24px] bg-zinc-100 mb-4 border border-zinc-100">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{tag}</span>
      </div>
      <h4 className="text-[17px] font-bold group-hover:text-blue-600 transition-colors">{title}</h4>
    </div>
  );
}
