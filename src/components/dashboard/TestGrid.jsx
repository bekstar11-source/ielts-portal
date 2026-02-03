import React from 'react';
import { Icons } from './Icons';

// --- STYLES ---
const getCardStyle = (type) => {
    switch (type) {
        case 'reading': return "bg-gradient-to-br from-white to-blue-50/50 border-blue-100 hover:border-blue-200 hover:shadow-blue-100";
        case 'listening': return "bg-gradient-to-br from-white to-purple-50/50 border-purple-100 hover:border-purple-200 hover:shadow-purple-100";
        case 'writing': return "bg-gradient-to-br from-white to-orange-50/50 border-orange-100 hover:border-orange-200 hover:shadow-orange-100";
        default: return "bg-gradient-to-br from-white to-slate-50/80 border-slate-200 hover:border-slate-300";
    }
};

const getBadgeStyle = (type) => {
    switch (type) {
        case 'reading': return "text-blue-600 bg-blue-50";
        case 'listening': return "text-purple-600 bg-purple-50";
        case 'writing': return "text-orange-600 bg-orange-50";
        default: return "text-slate-600 bg-slate-100";
    }
};

const isUrgent = (endDate) => {
    if (!endDate) return false;
    const now = new Date();
    const end = new Date(endDate);
    const diffHours = (end - now) / 1000 / 60 / 60;
    return diffHours > 0 && diffHours < 24;
};

// 🔥 PROPSGA "onReview" QO'SHILDI
export default function TestGrid({ loading, tests, onStartTest, onSelectSet, onReview, errorMsg }) {
  if (loading) return <div className="text-center py-20 text-gray-400 text-sm animate-pulse">Yuklanmoqda...</div>;
  if (errorMsg) return <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tests.map((test, index) => {
            const isUrgentCase = test.assignmentInfo?.endDate && isUrgent(test.assignmentInfo.endDate) && test.status !== 'completed';
            
            // --- MOCK CARD ---
            if (test.isMock) {
                return (
                    <div key={index} className="relative overflow-hidden rounded-2xl bg-gray-900 text-white p-6 shadow-xl hover:scale-[1.01] transition duration-300 cursor-default">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Icons.Check className="w-24 h-24"/></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded mb-3 uppercase tracking-wider">Mock Exam</span>
                                <h3 className="text-2xl font-bold leading-tight mb-1">Full IELTS Mock</h3>
                                <p className="text-gray-400 text-xs">Listening • Reading • Writing</p>
                            </div>
                            <div className="mt-6">
                                {test.status === 'completed' ? (
                                    <div className="flex gap-2">
                                        {/* 🔥 MOCK NATIJA TUGMASI ULANDI */}
                                        <button onClick={() => onReview(test)} className="flex-1 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-xs font-bold transition">Natija</button>
                                        <button onClick={() => onStartTest(test)} className="flex-1 bg-white text-black hover:bg-gray-100 py-2.5 rounded-xl text-xs font-bold transition">Qayta</button>
                                    </div>
                                ) : (
                                    <button onClick={() => onStartTest(test)} className="w-full bg-white text-black hover:bg-gray-100 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                                        Boshlash <Icons.Play className="w-3 h-3"/>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }

            // --- SET CARD ---
            if (test.isSet) {
                return (
                    <div key={test.id || index} onClick={() => onSelectSet(test)} className="group bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-full relative overflow-hidden bg-gradient-to-br from-white to-gray-50/50">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-bl-full -mr-4 -mt-4 transition group-hover:bg-blue-50/50"></div>
                        <div>
                            <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition shadow-sm">
                                <Icons.Folder className="w-5 h-5"/>
                            </div>
                            <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight leading-snug mb-1 line-clamp-1">{test.title}</h3>
                            <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">{test.completedTests} / {test.totalTests} tugatildi</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex -space-x-1">
                                {[...Array(Math.min(3, test.totalTests))].map((_, i) => <div key={i} className="w-5 h-5 rounded-full bg-gray-200 border-2 border-white"></div>)}
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 group-hover:underline">Ochish &rarr;</span>
                        </div>
                    </div>
                );
            }

            // --- INDIVIDUAL TEST ---
            const isDone = test.status === 'completed';
            
            return (
                <div key={test.id || index} className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition flex flex-col justify-between h-full relative group ${getCardStyle(test.type)} ${isUrgentCase ? 'ring-2 ring-red-400 border-red-400' : ''}`}>
                    {isUrgentCase && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1"><Icons.Fire className="w-3 h-3"/> 24h</div>}
                    
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${getBadgeStyle(test.type)}`}>{test.type}</span>
                            {isDone && <span className="text-green-600 bg-white/80 p-1 rounded-full shadow-sm"><Icons.Check className="w-4 h-4"/></span>}
                        </div>
                        <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight leading-snug mb-2 line-clamp-2">{test.title}</h3>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                            {test.assignmentInfo?.endDate ? `Deadline: ${new Date(test.assignmentInfo.endDate).toLocaleDateString()}` : 'Muddatsiz'}
                        </p>
                    </div>

                    <div className="mt-6 flex items-end justify-between border-t border-gray-200/50 pt-4">
                        {isDone ? (
                            <>
                                {/* 🔥 TEST NATIJA QISMI (Bosiladigan qilindi) */}
                                <div 
                                    onClick={() => onReview(test)} 
                                    className="cursor-pointer group-hover:opacity-80 transition"
                                    title="Tahlilni ko'rish"
                                >
                                    <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5 flex items-center gap-1">
                                        NATIJA <span className="text-[8px] bg-gray-100 text-gray-500 px-1 rounded hover:bg-gray-200 transition">TAHLIL &rarr;</span>
                                    </span>
                                    <span className="text-3xl font-bold text-gray-900 tracking-tighter leading-none">{test.result.bandScore || test.result.score}</span>
                                </div>

                                <button onClick={() => onStartTest(test)} className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition shadow-sm group-hover:scale-110" title="Qayta ishlash">
                                    <Icons.Refresh className="w-4 h-4 text-gray-600"/>
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => onStartTest(test)} 
                                disabled={test.status === 'expired'}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${test.status === 'expired' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'}`}
                            >
                                {test.status === 'expired' ? "Yopilgan" : "Boshlash"}
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
}