import React, { useState } from 'react';
import { Icons } from './Icons';
import { Clock, HelpCircle, Zap, Diamond, Share2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ShareModal from '../common/ShareModal';

// --- STYLES FOR SET ITEMS ---
const getCardStyle = (type, isDark) => {
    const base = "relative overflow-hidden rounded-[1.5rem] p-6 border shadow-sm hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[220px] ";
    
    let colorStyle = "";
    if (isDark) {
        colorStyle = "bg-zinc-900 border-zinc-800 hover:bg-zinc-850 ";
        switch (type) {
            case 'reading': colorStyle += "hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)]"; break;
            case 'listening': colorStyle += "hover:border-purple-500/50 hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)]"; break;
            case 'writing': colorStyle += "hover:border-[#F44A22]/50 hover:shadow-[0_8px_30px_rgba(244,74,34,0.1)]"; break;
            default: colorStyle += "hover:border-zinc-700 hover:shadow-zinc-800"; break;
        }
    } else {
        colorStyle = "bg-white border-[#E4E2E3]/60 hover:bg-[#FEF8E8]/50 ";
        switch (type) {
            case 'reading': colorStyle += "hover:border-blue-300 hover:shadow-blue-100"; break;
            case 'listening': colorStyle += "hover:border-purple-300 hover:shadow-purple-100"; break;
            case 'writing': colorStyle += "hover:border-[#F44A22]/30 hover:shadow-orange-100"; break;
            default: colorStyle += "hover:border-gray-300 hover:shadow-gray-100"; break;
        }
    }
    return base + colorStyle;
};

const getBadgeStyle = (type, isDark) => {
    if (isDark) {
        switch (type) {
            case 'reading': return "text-blue-400 bg-blue-950/30 border-blue-900/50";
            case 'listening': return "text-purple-400 bg-purple-950/30 border-purple-900/50";
            case 'writing': return "text-[#F44A22] bg-orange-950/30 border-orange-900/50";
            default: return "text-zinc-400 bg-zinc-800/50 border-zinc-700";
        }
    } else {
        switch (type) {
            case 'reading': return "text-blue-600 bg-blue-50 border-blue-200";
            case 'listening': return "text-purple-600 bg-purple-50 border-purple-200";
            case 'writing': return "text-[#F44A22] bg-orange-50 border-orange-200";
            default: return "text-[#A8AAAC] bg-[#E4E2E3]/30 border-[#E4E2E3]";
        }
    }
};

const getIconColor = (type) => {
    switch(type) {
        case 'reading': return "bg-blue-500";
        case 'listening': return "bg-purple-500";
        case 'writing': return "bg-[#F44A22]";
        default: return "bg-emerald-500";
    }
};

export default function DashboardModals({
    showKeyModal, setShowKeyModal, accessKeyInput, setAccessKeyInput, handleVerifyKey, checkingKey, keyError,
    showStartConfirm, setShowStartConfirm, confirmStartTest,
    showLogoutConfirm, setShowLogoutConfirm, confirmLogout,
    selectedSet, setSelectedSet, handleStartTest, handleReview, isPro
}) {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';
    const [setSearch, setSetSearch] = useState('');
    const [shareTest, setShareTest] = useState(null);

    return (
        <>
            {/* KEY MODAL */}
            <AnimatePresence>
                {showKeyModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowKeyModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="relative bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[300px] text-center border border-[#E4E2E3]/30 z-10"
                        >
                            <div className="mx-auto w-12 h-12 bg-[#F5F5F7] rounded-xl flex items-center justify-center mb-4 shadow-sm border border-[#E4E2E3]/60">
                                <Icons.Key className="w-5 h-5 text-[#161616]" />
                            </div>
                            <h3 className="text-lg font-bold mb-0.5 text-[#161616] tracking-tight">Yangi Vazifa</h3>
                            <p className="text-[11px] font-medium text-[#A8AAAC] mb-4 px-2">O'qituvchi bergan maxsus kodni kiriting</p>
                            <input 
                                type="text" 
                                placeholder="XXXXXX" 
                                className="w-full border border-[#E4E2E3] p-2.5 rounded-xl text-center text-base font-mono font-bold uppercase tracking-widest mb-4 outline-none focus:ring-4 focus:ring-[#161616]/5 transition-all bg-[#F5F5F7] text-[#161616] focus:border-[#161616]/30 shadow-inner" 
                                value={accessKeyInput} 
                                onChange={e => setAccessKeyInput(e.target.value)} 
                            />
                            {keyError && <p className="text-red-500 text-xs mb-3 font-bold">{keyError}</p>}
                            <div className="flex gap-2.5">
                                <button 
                                    onClick={() => setShowKeyModal(false)} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-[#A8AAAC] hover:bg-[#F5F5F7] transition-all text-xs"
                                >
                                    Bekor qilish
                                </button>
                                <button 
                                    onClick={handleVerifyKey} 
                                    disabled={checkingKey} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#161616] hover:bg-black transition-all text-xs shadow-lg shadow-black/10 disabled:opacity-50"
                                >
                                    {checkingKey ? "..." : "Faollashtirish"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* START CONFIRM MODAL */}
            <AnimatePresence>
                {showStartConfirm && (
                    <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStartConfirm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="relative bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[300px] text-center border border-[#E4E2E3]/30 z-10"
                        >
                            <h3 className="text-lg font-bold mb-1 text-[#161616] tracking-tight">Testni Boshlash</h3>
                            <p className="text-xs font-medium text-[#A8AAAC] mb-5 px-2 leading-relaxed">
                                Siz testni boshlashni xoxlaysizmi?
                            </p>
                            <div className="flex gap-2.5">
                                <button 
                                    onClick={() => setShowStartConfirm(false)} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-[#A8AAAC] hover:bg-[#F5F5F7] transition-all duration-300 text-xs"
                                >
                                    Yo'q
                                </button>
                                <button 
                                    onClick={confirmStartTest} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#161616] hover:bg-black transition-all duration-300 text-xs shadow-lg shadow-black/10 active:scale-[0.98]"
                                >
                                    Ha
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* LOGOUT CONFIRM MODAL */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutConfirm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="relative bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[300px] text-center border border-[#E4E2E3]/30 z-10"
                        >
                            <h3 className="text-lg font-bold mb-1 text-[#161616] tracking-tight">Chiqish</h3>
                            <p className="text-xs font-medium text-[#A8AAAC] mb-5 px-2 leading-relaxed">Tizimdan chiqishni xohlaysizmi?</p>
                            <div className="flex gap-2.5">
                                <button 
                                    onClick={() => setShowLogoutConfirm(false)} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-[#A8AAAC] hover:bg-[#F5F5F7] transition-all text-xs"
                                >
                                    Yo'q
                                </button>
                                <button 
                                    onClick={confirmLogout} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-650 transition-all text-xs shadow-lg shadow-red-500/10 active:scale-[0.98]"
                                >
                                    Ha
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SET DETAILS MODAL */}
            <AnimatePresence>
                {selectedSet && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSet(null)}
                            className="absolute inset-0 bg-black/30 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="relative rounded-[2rem] w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border bg-white dark:bg-zinc-900 border-[#E4E2E3]/60 dark:border-zinc-800 z-10"
                        >
                            <div className="p-6 md:px-8 md:py-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 border-[#E4E2E3]/60 dark:border-zinc-800 bg-[#FEF8E8]/50 dark:bg-zinc-850">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight text-[#161616] dark:text-white">{selectedSet.title}</h3>
                                    <p className="text-sm font-medium mt-1 text-[#A8AAAC] dark:text-zinc-400">{selectedSet.totalTests} ta test mavjud</p>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative w-full sm:w-72">
                                        <input
                                            type="text"
                                            placeholder="Testni qidirish..."
                                            className="w-full text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F44A22]/30 shadow-sm transition-all bg-white dark:bg-zinc-850 border border-[#E4E2E3] dark:border-zinc-700 text-[#161616] dark:text-white placeholder:text-[#A8AAAC] focus:border-[#F44A22]/50"
                                            value={setSearch}
                                            onChange={(e) => setSetSearch(e.target.value)}
                                        />
                                        <Icons.Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#A8AAAC]" />
                                    </div>
                                    <button onClick={() => setSelectedSet(null)} className="p-2.5 rounded-xl transition-all shrink-0 bg-white dark:bg-zinc-800 hover:bg-[#FEF8E8] dark:hover:bg-zinc-750 border border-[#E4E2E3] dark:border-zinc-700 shadow-sm"><Icons.Close className="w-5 h-5 text-[#A8AAAC] dark:text-zinc-400" /></button>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {selectedSet.subTests.filter(sub => sub.title?.toLowerCase().includes(setSearch.toLowerCase())).map((sub, idx) => {
                                        const isSubDone = sub.status === 'completed';
                                        const attemptsCount = sub.attemptsCount ?? 0;
                                        const maxAttempts = sub.maxAttempts ?? 1;
                                        const canRetake = attemptsCount < maxAttempts;
                                        const isPremiumType = sub.type === 'reading' || sub.type === 'listening';
                                        const showGetAccess = !isPro && isPremiumType && !isSubDone;

                                        return (
                                            <div key={sub.id} className={getCardStyle(sub.type, isDark)}>
                                                {/* Top right faded number */}
                                                <div className="absolute -bottom-4 -right-2 text-[80px] font-black leading-none tracking-tighter mix-blend-overlay opacity-[0.04] pointer-events-none select-none text-[#161616] dark:text-white">
                                                    {(idx+1).toString().padStart(2, '0')}
                                                </div>

                                                <div className="relative z-10 flex-grow flex flex-col">
                                                    <div className="flex justify-between items-start mb-4">
                                                        {/* Colored floating icon */}
                                                        <div className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center ${getIconColor(sub.type)}`}>
                                                            {sub.type === 'reading' ? <Icons.Book className="w-5 h-5 text-white" /> : 
                                                             sub.type === 'listening' ? <Icons.Headphones className="w-5 h-5 text-white" /> :
                                                             <Icons.Pen className="w-5 h-5 text-white" />}
                                                        </div>
                                                        
                                                        {isSubDone && <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-200 dark:border-emerald-900"><Icons.Check className="w-4 h-4 text-emerald-500 font-bold" /></div>}
                                                    </div>

                                                    <h4 className="text-xl font-bold leading-snug line-clamp-2 mt-2 mb-3 text-[#161616] dark:text-white">{sub.title}</h4>

                                                    {/* Meta infos */}
                                                    <div className="mt-auto space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border border-solid ${getBadgeStyle(sub.type, isDark)}`}>
                                                                {sub.type?.toUpperCase()}
                                                            </span>
                                                            {sub.isAssignment && (
                                                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border border-solid ${attemptsCount >= maxAttempts ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : 'bg-[#E4E2E3]/30 dark:bg-zinc-800 text-[#A8AAAC] dark:text-zinc-400 border-[#E4E2E3] dark:border-zinc-700'}`}>
                                                                    {attemptsCount} / {maxAttempts} URINISH
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {sub.endDate && (
                                                            <div className="text-[11px] font-bold flex items-center gap-1.5 text-red-500">
                                                                <Clock size={12} strokeWidth={3} />
                                                                {new Date(sub.endDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric'})}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Area */}
                                                <div className="relative z-10 flex items-end justify-between border-t border-dashed mt-5 pt-4 border-[#E4E2E3] dark:border-zinc-800">
                                                    {isSubDone ? (
                                                        <>
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-widest block mb-0.5 text-[#A8AAAC] dark:text-zinc-450">Score</span>
                                                                <span className="text-3xl font-black leading-none text-[#161616] dark:text-white">{sub.result?.bandScore || sub.result?.score}</span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setShareTest(sub); 
                                                                    }}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl transition bg-white dark:bg-zinc-800 border border-[#E4E2E3] dark:border-zinc-700 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-755 text-zinc-650 dark:text-zinc-350 active:scale-95"
                                                                    title="Share"
                                                                >
                                                                    <Share2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReview(sub)}
                                                                    className="px-3 py-2 text-xs font-bold rounded-xl transition bg-[#161616]/5 dark:bg-white/10 hover:bg-[#161616]/10 dark:hover:bg-white/15 text-[#161616] dark:text-white"
                                                                >
                                                                    Tahlil
                                                                </button>
                                                                {canRetake && (
                                                                    <button onClick={() => handleStartTest(sub)} className="w-9 h-9 flex items-center justify-center rounded-xl transition bg-white dark:bg-zinc-800 border border-[#E4E2E3] dark:border-zinc-700 shadow-sm hover:bg-[#FEF8E8] dark:hover:bg-zinc-750 text-[#161616] dark:text-white">
                                                                        <Icons.Refresh className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        showGetAccess ? (
                                                            <button 
                                                                onClick={() => navigate('/pricing')} 
                                                                className="w-full py-3 rounded-xl text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[#0071e3] to-[#2997ff] text-white flex items-center justify-center gap-2 hover:brightness-110"
                                                            >
                                                                <Diamond size={16} fill="currentColor" /> Go Pro
                                                            </button>
                                                        ) : canRetake ? (
                                                            <div className="flex gap-2 w-full">
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setShareTest(sub); 
                                                                    }}
                                                                    className="w-12 py-3 rounded-xl flex items-center justify-center border border-[#E4E2E3] dark:border-zinc-700 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-755 text-zinc-650 dark:text-zinc-300 active:scale-95 transition-all shrink-0"
                                                                    title="Share"
                                                                >
                                                                    <Share2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleStartTest(sub)} className="flex-1 py-3 rounded-xl text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 bg-[#F44A22] text-white hover:bg-[#D93D1B] shadow-[#F44A22]/20">
                                                                    Start Test
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full py-3 rounded-xl text-sm font-bold text-center border border-dashed bg-[#E4E2E3]/20 dark:bg-zinc-800/20 border-[#E4E2E3] dark:border-zinc-700 text-[#A8AAAC] dark:text-zinc-450">
                                                                Urinishlar tugagan
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ShareModal
                isOpen={!!shareTest}
                onClose={() => setShareTest(null)}
                testId={shareTest?.id}
                testTitle={shareTest?.title}
                testType={shareTest?.type}
                score={shareTest?.result?.score ?? shareTest?.result?.bestScore ?? shareTest?.result?.latestScore ?? 0}
                bandScore={shareTest?.result?.bandScore ?? shareTest?.result?.bestBandScore ?? shareTest?.result?.latestBandScore}
            />
        </>
    );
}