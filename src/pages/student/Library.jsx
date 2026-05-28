import React, { useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BookOpen, Headphones, ChevronRight, ArrowLeft, PenTool, Mic } from 'lucide-react';
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
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const sections = [
    {
      id: 'reading',
      title: t('dashboard.reading') || 'Reading',
      icon: BookOpen,
      color: 'blue',
      options: [
        { label: t('dashboard.fullTests') || 'Full Tests', desc: '60 mins · 3 passages · 40 qs', path: '/reading/full' },
        { label: t('dashboard.partTests') || 'Part Tests', desc: '13 mins · 1 passage · 13 qs', path: '/reading/parts' }
      ]
    },
    {
      id: 'listening',
      title: t('dashboard.listening') || 'Listening',
      icon: Headphones,
      color: 'purple',
      options: [
        { label: t('dashboard.fullTests') || 'Full Tests', desc: '30 mins · 4 sections · 40 qs', path: '/listening/full' },
        { label: t('dashboard.partTests') || 'Part Tests', desc: '7-10 mins · 1 part · 10 qs', path: '/listening/parts' }
      ]
    },
    {
      id: 'writing',
      title: t('dashboard.writing') || 'Writing',
      icon: PenTool,
      color: 'emerald',
      options: [
        { label: t('library.writingTask1') || 'Task 1 (Report)', desc: '20 mins · 150 words report', path: '/practice?tab=writing' },
        { label: t('library.writingTask2') || 'Task 2 (Essay)', desc: '40 mins · 250 words essay', path: '/practice?tab=writing' }
      ]
    },
    {
      id: 'speaking',
      title: t('dashboard.speaking') || 'Speaking',
      icon: Mic,
      color: 'orange',
      options: [
        { label: t('library.speakingAi') || 'Speaking AI', desc: 'Interactive AI examiner feedback', path: '/speaking-ai' },
        { label: t('library.speakingPractice') || 'Speaking Practice', desc: 'Record and practice speech cards', path: '/speaking-practice' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] font-sans text-zinc-900 dark:text-[#f5f5f7] antialiased transition-colors duration-200 pb-24 md:pb-12">
      <DashboardHeader
        user={user}
        userData={userData}
        activeTab="library"
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      <main className="max-w-md mx-auto px-4 py-6 md:py-10">
        {/* Minimalist Go Back */}
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-1.5 mb-5 text-zinc-550 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors text-xs font-semibold"
        >
          <ArrowLeft size={14} />
          <span>{t('roadmap.backToDashboard') || 'Back'}</span>
        </button>

        {/* Title and Intro */}
        <div className="mb-5">
          <span className="text-[9px] font-bold tracking-widest text-[#0066cc] dark:text-[#3894ff] uppercase">
            IELTS Practice
          </span>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {t('library.chooseModule') || 'Library'}
          </h1>
        </div>

        {/* Minimalistic Small Divs Layout */}
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            
            const colorThemes = {
              blue: {
                bg: 'bg-blue-500/5 dark:bg-blue-500/10',
                border: 'border-blue-500/20 dark:border-blue-500/30',
                text: 'text-blue-600 dark:text-blue-400',
              },
              purple: {
                bg: 'bg-purple-500/5 dark:bg-purple-500/10',
                border: 'border-purple-500/20 dark:border-purple-500/30',
                text: 'text-purple-600 dark:text-purple-400',
              },
              emerald: {
                bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
                border: 'border-emerald-500/20 dark:border-emerald-500/30',
                text: 'text-emerald-600 dark:text-emerald-400',
              },
              orange: {
                bg: 'bg-orange-500/5 dark:bg-orange-500/10',
                border: 'border-orange-500/20 dark:border-orange-500/30',
                text: 'text-orange-600 dark:text-orange-400',
              }
            }[section.color];

            return (
              <div 
                key={section.id}
                className="bg-white dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg p-4 shadow-sm"
              >
                {/* Header Category */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded border ${colorThemes.bg} ${colorThemes.border} ${colorThemes.text}`}>
                    <Icon size={15} />
                  </div>
                  <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100">
                    {section.title}
                  </h2>
                </div>

                {/* Sub Options in Small Divs */}
                <div className="grid grid-cols-2 gap-3">
                  {section.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(opt.path)}
                      className="flex flex-col justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/30 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 transition-all text-left active:scale-[0.98]"
                    >
                      <div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                          {opt.label}
                        </span>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-450 mt-0.5 block leading-tight">
                          {opt.desc}
                        </span>
                      </div>
                      <div className="flex justify-end w-full mt-2">
                        <ChevronRight size={12} className="text-zinc-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <SiteFooter />

      <DashboardModals
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        confirmLogout={logout}
      />
      
      <BottomNav activeTab="library" />
    </div>
  );
}
