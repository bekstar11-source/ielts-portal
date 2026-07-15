import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardModals from '../../components/dashboard/DashboardModals';

export default function SpeakingAi() {
    const { user, userData, logout } = useAuth();
    const { lang } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    return (
        <div className={`min-h-screen transition-colors duration-500 flex flex-col selection:bg-blue-500/20 ${
            isDark ? 'bg-black text-white' : 'bg-[#F5F5F7] text-zinc-900'
        } font-sans`}>
            {/* Dashboard Header */}
            <DashboardHeader
                user={user}
                userData={userData}
                activeTab="speaking"
                onLogoutClick={() => setShowLogoutConfirm(true)}
            />

            {/* Mobile Header */}
            <header className={`w-full border-b px-6 py-3 sticky top-0 z-50 md:hidden ${
                isDark ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className={`p-2 rounded-full transition-colors ${
                            isDark ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-50 text-zinc-500 hover:text-black'
                        }`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="font-bold text-sm">Speaking with AI</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl w-full mx-auto relative overflow-hidden">
                {/* Back button for desktop */}
                <div className="absolute top-6 left-6 hidden md:block">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className={`flex items-center gap-2 transition-all group font-bold text-sm ${
                            isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'
                        }`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${
                            isDark ? 'group-hover:bg-white/10' : 'group-hover:bg-black/5'
                        }`}>
                            <ArrowLeft size={18} />
                        </div>
                        <span>{lang === 'uz' ? "Bosh sahifaga qaytish" : "Back to Dashboard"}</span>
                    </button>
                </div>

                {/* Animated Background Glow */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className={`w-96 h-96 rounded-full blur-[120px] opacity-20 transition-colors duration-500 ${
                        isDark ? 'bg-blue-600/30' : 'bg-blue-400/20'
                    }`} />
                </div>

                <div className="text-center space-y-8 max-w-lg z-10">
                    {/* ROBOT ANIMATION */}
                    <div className="relative flex flex-col items-center justify-center h-64">
                        {/* Pedestal Glow */}
                        <motion.div 
                            animate={{ 
                                scale: [0.9, 1.1, 0.9],
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className={`absolute bottom-4 w-32 h-4 rounded-full blur-md ${
                                isDark ? 'bg-blue-500/20' : 'bg-blue-400/20'
                            }`}
                        />

                        {/* Floating Robot */}
                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative flex flex-col items-center"
                        >
                            {/* Sparks / Particles */}
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-4 -right-4 text-blue-400"
                            >
                                <Sparkles size={20} />
                            </motion.div>

                            {/* Robot Body Container */}
                            <div className={`w-40 h-40 rounded-full flex items-center justify-center p-6 shadow-2xl relative border ${
                                isDark 
                                    ? 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-white/10 shadow-blue-500/10' 
                                    : 'bg-gradient-to-b from-white to-zinc-50 border-zinc-200 shadow-blue-500/5'
                            }`}>
                                {/* Sleek Robot Face SVG */}
                                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                    {/* Ears/Antennas */}
                                    <rect x="15" y="42" width="6" height="16" rx="3" fill={isDark ? "#3f3f46" : "#cbd5e1"} />
                                    <rect x="79" y="42" width="6" height="16" rx="3" fill={isDark ? "#3f3f46" : "#cbd5e1"} />
                                    
                                    {/* Main Head Plate */}
                                    <rect x="24" y="24" width="52" height="52" rx="16" fill={isDark ? "#1f1f23" : "#f1f5f9"} stroke={isDark ? "#3f3f46" : "#cbd5e1"} strokeWidth="4" />
                                    
                                    {/* Antenna Top */}
                                    <line x1="50" y1="24" x2="50" y2="10" stroke={isDark ? "#3f3f46" : "#cbd5e1"} strokeWidth="4" />
                                    <circle cx="50" cy="8" r="4" fill="#3b82f6" />
                                    
                                    {/* Eyes Visor Screen */}
                                    <rect x="32" y="38" width="36" height="16" rx="8" fill={isDark ? "#18181b" : "#1e293b"} />
                                    
                                    {/* Glowing Eyes */}
                                    <motion.circle 
                                        cx="42" 
                                        cy="46" 
                                        r="3.5" 
                                        fill="#3b82f6" 
                                        animate={{ scaleY: [1, 0.1, 1] }} 
                                        transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                                    />
                                    <motion.circle 
                                        cx="58" 
                                        cy="46" 
                                        r="3.5" 
                                        fill="#3b82f6" 
                                        animate={{ scaleY: [1, 0.1, 1] }} 
                                        transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                                    />

                                    {/* Robot Mouth Grid / Sound Display */}
                                    <path d="M42 62H58" stroke={isDark ? "#3b82f6" : "#2563eb"} strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                        </motion.div>
                    </div>

                    {/* TEXT LABELS */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-500 dark:text-blue-400">
                            <Sparkles size={12} className="animate-pulse" />
                            {lang === 'uz' ? "Yangi Imkoniyat" : "New Feature"}
                        </div>

                        <h2 className="text-3xl font-extrabold tracking-tight">
                            Speaking with AI
                        </h2>
                        
                        <p className={`text-sm md:text-base font-semibold leading-relaxed ${
                            isDark ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                            {lang === 'uz' 
                                ? "Sun'iy intellekt orqali IELTS Speaking ko'nikmasini rivojlantirish moduli ishlab chiqilmoqda. Tez orada bu sahifada real vaqt rejimida AI bilan muloqot qilishingiz mumkin bo'ladi!"
                                : "The module to practice IELTS Speaking with our advanced AI is currently under development. Soon you'll be able to have real-time speaking mock exams directly on this page!"
                            }
                        </p>
                    </div>

                    {/* SOUNDWAVE VISUALIZER */}
                    <div className="flex items-center justify-center gap-1.5 h-12">
                        {[1.8, 2.5, 1.2, 3.2, 2.0, 1.5, 2.8, 1.0, 2.3, 1.7, 3.0, 1.2, 1.9].map((val, idx) => (
                            <motion.div
                                key={idx}
                                animate={{
                                    scaleY: [1, val, 1]
                                }}
                                transition={{
                                    duration: 1.2 + (idx * 0.05),
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className={`w-1 rounded-full ${
                                    idx % 3 === 0 ? 'bg-blue-500' : idx % 3 === 1 ? 'bg-sky-450' : 'bg-indigo-500'
                                }`}
                                style={{ height: '16px', transformOrigin: 'center' }}
                            />
                        ))}
                    </div>

                    {/* COMING SOON BADGE */}
                    <div className="pt-4">
                        <span className={`px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase border ${
                            isDark 
                                ? 'bg-zinc-900 border-white/5 text-zinc-300' 
                                : 'bg-white border-zinc-200 text-zinc-700 shadow-sm'
                        }`}>
                            {lang === 'uz' ? "Tez Kunda" : "Coming Soon"}
                        </span>
                    </div>
                </div>
            </main>

            {/* Logout Modal */}
            <DashboardModals
                showLogoutConfirm={showLogoutConfirm}
                setShowLogoutConfirm={setShowLogoutConfirm}
                confirmLogout={logout}
            />
        </div>
    );
}
