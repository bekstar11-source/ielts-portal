import React, { useState } from 'react';
import { Icons } from './Icons';
import { Clock, HelpCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// --- STYLES FOR SET ITEMS ---
const getCardStyle = (type, isDark) => {
    const base = "relative overflow-hidden rounded-[1.5rem] p-6 border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[220px] backdrop-blur-xl ";
    
    let colorStyle = "";
    if (isDark) {
        colorStyle = "bg-[#2C2C2C]/60 border-white/5 hover:bg-[#2C2C2C]/80 ";
        switch (type) {
            case 'reading': colorStyle += "hover:border-blue-500/30 hover:shadow-blue-500/10"; break;
            case 'listening': colorStyle += "hover:border-purple-500/30 hover:shadow-purple-500/10"; break;
            case 'writing': colorStyle += "hover:border-orange-500/30 hover:shadow-orange-500/10"; break;
            default: colorStyle += "hover:border-white/20"; break;
        }
    } else {
        colorStyle = "bg-white/60 border-white/80 hover:bg-white/80 ";
        switch (type) {
            case 'reading': colorStyle += "hover:border-blue-300 hover:shadow-blue-500/10"; break;
            case 'listening': colorStyle += "hover:border-purple-300 hover:shadow-purple-500/10"; break;
            case 'writing': colorStyle += "hover:border-orange-300 hover:shadow-orange-500/10"; break;
            default: colorStyle += "hover:border-gray-200 mt shadow-zinc-200"; break;
        }
    }
    return base + colorStyle;
};

const getBadgeStyle = (type, isDark) => {
    switch (type) {
        case 'reading': return isDark ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-blue-600 bg-blue-50 border-blue-100";
        case 'listening': return isDark ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-purple-600 bg-purple-50 border-purple-100";
        case 'writing': return isDark ? "text-orange-400 bg-orange-500/10 border-orange-500/20" : "text-orange-600 bg-orange-50 border-orange-100";
        default: return isDark ? "text-gray-400 bg-white/5 border-white/10" : "text-gray-600 bg-gray-100 border-gray-200";
    }
};

const getIconColor = (type) => {
    switch(type) {
        case 'reading': return "bg-blue-500";
        case 'listening': return "bg-purple-500";
        case 'writing': return "bg-orange-500";
        default: return "bg-emerald-500";
    }
};

export default function DashboardModals({
    showKeyModal, setShowKeyModal, accessKeyInput, setAccessKeyInput, handleVerifyKey, checkingKey, keyError,
    showStartConfirm, setShowStartConfirm, confirmStartTest,
    showLogoutConfirm, setShowLogoutConfirm, confirmLogout,
    selectedSet, setSelectedSet, handleStartTest, handleReview
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [setSearch, setSetSearch] = useState('');

    return (
        <>
            {/* KEY MODAL */}
            {showKeyModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#18181b] p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-white/10">
                        <div className="mx-auto w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-5 shadow-sm border border-white/10"><Icons.Key className="w-6 h-6 text-white" /></div>
                        <h3 className="text-xl font-bold mb-2 text-white tracking-tight">Yangi Vazifa</h3>
                        <p className="text-sm text-gray-400 mb-6 px-4">O'qituvchi bergan maxsus kodni kiriting</p>
                        <input type="text" placeholder="XXXXXX" className="w-full border border-white/10 p-3 rounded-xl text-center text-lg font-mono font-bold uppercase tracking-widest mb-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition bg-white/5 text-white focus:bg-white/10" value={accessKeyInput} onChange={e => setAccessKeyInput(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setShowKeyModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition text-sm">Bekor qilish</button>
                            <button onClick={handleVerifyKey} disabled={checkingKey} className="flex-1 py-3 rounded-xl font-bold text-black bg-white hover:bg-gray-200 transition text-sm shadow-lg shadow-white/10">{checkingKey ? "..." : "Faollashtirish"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* START CONFIRM MODAL */}
            {showStartConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#18181b] p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-white/10">
                        <h3 className="text-xl font-bold mb-2 text-white tracking-tight">Testni Boshlash</h3>
                        <p className="text-sm text-gray-400 mb-6 px-4">Siz testni boshlashni xoxlaysizmi?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowStartConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition text-sm">Yo'q</button>
                            <button onClick={confirmStartTest} className="flex-1 py-3 rounded-xl font-bold text-black bg-white hover:bg-gray-200 transition text-sm shadow-lg shadow-white/10">Ha</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOGOUT CONFIRM MODAL */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#18181b] p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-white/10">
                        <h3 className="text-xl font-bold mb-2 text-white tracking-tight">Chiqish</h3>
                        <p className="text-sm text-gray-400 mb-6 px-4">Tizimdan chiqishni xohlaysizmi?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition text-sm">Yo'q</button>
                            <button onClick={confirmLogout} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition text-sm shadow-lg shadow-red-900/20">Ha</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SET DETAILS MODAL */}
            {selectedSet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className={`rounded-[2rem] w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border ${isDark ? 'bg-[#1E1E1E]/95 border-white/10 backdrop-blur-2xl' : 'bg-[#f7f8f9]/95 border-white/80 backdrop-blur-2xl'}`}>
                        <div className={`p-6 md:px-8 md:py-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 ${isDark ? 'border-white/10 bg-[#1E1E1E]/50' : 'border-black/5 bg-white/50'}`}>
                            <div>
                                <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedSet.title}</h3>
                                <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedSet.totalTests} ta test mavjud</p>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">{selectedSet.totalTests} ta test mavjud</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-72">
                                    <input
                                        type="text"
                                        placeholder="Testni qidirish..."
                                        className={`w-full text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500' : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'}`}
                                        value={setSearch}
                                        onChange={(e) => setSetSearch(e.target.value)}
                                    />
                                    <Icons.Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                </div>
                                <button onClick={() => setSelectedSet(null)} className={`p-2.5 rounded-xl transition-all shrink-0 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}`}><Icons.Close className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} /></button>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {selectedSet.subTests.filter(sub => sub.title?.toLowerCase().includes(setSearch.toLowerCase())).map((sub, idx) => {
                                    const isSubDone = sub.status === 'completed';
                                    const attemptsCount = sub.attemptsCount ?? 0;
                                    const maxAttempts = sub.maxAttempts ?? 1;
                                    const canRetake = attemptsCount < maxAttempts;
                                    return (
                                        <div key={sub.id} className={getCardStyle(sub.type, isDark)}>
                                            {/* Top right faded number */}
                                            <div className="absolute -bottom-4 -right-2 text-[80px] font-black leading-none tracking-tighter mix-blend-overlay opacity-10 pointer-events-none select-none">
                                                {(idx+1).toString().padStart(2, '0')}
                                            </div>

                                            <div className="relative z-10 flex-grow flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    {/* Colored floating icon */}
                                                    <div className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center ${getIconColor(sub.type)} shadow-${getIconColor(sub.type).split('-')[1]}-500/40`}>
                                                        {sub.type === 'reading' ? <Icons.Book className="w-5 h-5 text-white" /> : 
                                                         sub.type === 'listening' ? <Icons.Headphones className="w-5 h-5 text-white" /> :
                                                         <Icons.Pen className="w-5 h-5 text-white" />}
                                                    </div>
                                                    
                                                    {isSubDone && <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"><Icons.Check className="w-4 h-4 text-emerald-500 font-bold" /></div>}
                                                </div>

                                                <h4 className={`text-xl font-bold leading-snug line-clamp-2 mt-2 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{sub.title}</h4>

                                                {/* Meta infos */}
                                                <div className="mt-auto space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border border-solid ${getBadgeStyle(sub.type, isDark)}`}>
                                                            {sub.type?.toUpperCase()}
                                                        </span>
                                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border border-solid ${attemptsCount >= maxAttempts ? (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200') : (isDark ? 'bg-white/5 text-gray-300 border-white/10' : 'bg-gray-100 text-gray-600 border-gray-200')}`}>
                                                            {attemptsCount} / {maxAttempts} URINISH
                                                        </span>
                                                    </div>
                                                    
                                                    {sub.endDate && (
                                                        <div className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                                            <Clock size={12} strokeWidth={3} />
                                                            {new Date(sub.endDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric'})}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Area */}
                                            <div className={`relative z-10 flex items-end justify-between border-t border-dashed mt-5 pt-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                                {isSubDone ? (
                                                    <>
                                                        <div>
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Score</span>
                                                            <span className={`text-3xl font-black leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{sub.result?.bandScore || sub.result?.score}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleReview(sub)}
                                                                className={`px-3 py-2 text-xs font-bold rounded-xl transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/5 hover:bg-gray-900/10 text-gray-900'}`}
                                                            >
                                                                Tahlil
                                                            </button>
                                                            {canRetake && (
                                                                <button onClick={() => handleStartTest(sub)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white' : 'bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900'}`}>
                                                                    <Icons.Refresh className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    canRetake ? (
                                                        <button onClick={() => handleStartTest(sub)} className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 ${isDark ? 'bg-white text-black hover:bg-gray-200 shadow-white/10' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/20'}`}>
                                                            Start Test
                                                        </button>
                                                    ) : (
                                                        <div className={`w-full py-3 rounded-xl text-sm font-bold text-center border border-dashed ${isDark ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
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
                    </div>
                </div>
            )}
        </>
    );
}