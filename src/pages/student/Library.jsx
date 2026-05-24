import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  BookOpen, Headphones, PenTool, Mic, ArrowRight, Sparkles
} from 'lucide-react';
import { useTranslation } from "../../context/LanguageContext";

// COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";

import SiteFooter from "../../components/common/SiteFooter";
import BottomNav from "../../components/dashboard/BottomNav";

export default function Library() {
  const { user, userData, logout } = useAuth();
  const { t } = useTranslation();
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
              <LibraryOverview />
            )}
            
            {/* Other tabs are handled via navigation to standalone pages or specific library sub-states */}
            {activeTab !== 'overview' && (
              <div className="py-20 text-center">
                <h2 className="text-2xl font-bold capitalize">{activeTab} {t('library.section')}</h2>
                <p className="text-zinc-500 mt-2">{t('library.loading')}</p>
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

function LibraryOverview() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const modules = [
    {
      title: t('dashboard.reading'),
      icon: <BookOpen className="w-7 h-7 transition-transform group-hover:scale-110" />,
      path: "/reading",
      color: "hover:text-[#0066cc] hover:bg-blue-50/30 hover:border-blue-500/20"
    },
    {
      title: t('dashboard.listening'),
      icon: <Headphones className="w-7 h-7 transition-transform group-hover:scale-110" />,
      path: "/listening",
      color: "hover:text-purple-600 hover:bg-purple-50/30 hover:border-purple-500/20"
    },
    {
      title: t('dashboard.writing'),
      icon: <PenTool className="w-7 h-7 transition-transform group-hover:scale-110" />,
      path: "/practice?tab=writing",
      color: "hover:text-emerald-600 hover:bg-emerald-50/30 hover:border-emerald-500/20"
    },
    {
      title: t('dashboard.speaking'),
      icon: <Mic className="w-7 h-7 transition-transform group-hover:scale-110" />,
      path: "/practice?tab=speaking",
      color: "hover:text-amber-600 hover:bg-amber-50/30 hover:border-amber-500/20"
    }
  ];

  return (
    <div className="relative w-full max-w-[1440px] mx-auto px-6 py-12 md:py-24 overflow-hidden">
      {/* Hero Header */}
      <div className="text-center max-w-xl mx-auto space-y-2 mb-12 md:mb-16 relative z-10">
        <span className="text-[11px] font-bold tracking-wider text-black/30 uppercase">IELTS Portal</span>
        <h1 className="text-[32px] md:text-[38px] font-bold text-[#1d1d1f] tracking-tight font-sans">
          {t('library.chooseModule')}
        </h1>
      </div>

      {/* Modules Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto relative z-10 pb-16">
        {modules.map((mod) => (
          <button
            key={mod.title}
            onClick={() => navigate(mod.path)}
            className={`flex flex-col items-center justify-center bg-white border border-[#e8e8ed] rounded-2xl p-8 min-h-[190px] text-[#1d1d1f] transition-all duration-300 group cursor-pointer hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:scale-[0.98] outline-none ${mod.color}`}
          >
            <div className="w-14 h-14 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-4 text-[#86868b] transition-colors group-hover:bg-white group-hover:text-inherit border border-transparent group-hover:border-current/10">
              {mod.icon}
            </div>
            <h2 className="text-[17px] font-bold tracking-tight">{mod.title}</h2>
          </button>
        ))}
      </div>
    </div>
  );
}
