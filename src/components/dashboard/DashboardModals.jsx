import React from 'react';
import { Icons } from './Icons';

// --- STYLES FOR SET ITEMS ---
const getCardStyle = (type) => {
    switch (type) {
        case 'reading': return "bg-zinc-900 border-white/5 hover:border-blue-500/30 hover:shadow-lg shadow-sm group";
        case 'listening': return "bg-zinc-900 border-white/5 hover:border-purple-500/30 hover:shadow-lg shadow-sm group";
        case 'writing': return "bg-zinc-900 border-white/5 hover:border-orange-500/30 hover:shadow-lg shadow-sm group";
        default: return "bg-zinc-900 border-white/5 hover:border-white/20 hover:shadow-lg shadow-sm group";
    }
};

const getBadgeStyle = (type) => {
    switch (type) {
        case 'reading': return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
        case 'listening': return "text-purple-400 bg-purple-500/10 border border-purple-500/20";
        case 'writing': return "text-orange-400 bg-orange-500/10 border border-orange-500/20";
        default: return "text-gray-400 bg-white/5 border border-white/10";
    }
};

// 🔥 PROPSGA "handleReview" QO'SHILDI
export default function DashboardModals({
    showKeyModal, setShowKeyModal, accessKeyInput, setAccessKeyInput, handleVerifyKey, checkingKey, keyError,
    showStartConfirm, setShowStartConfirm, confirmStartTest,
    showLogoutConfirm, setShowLogoutConfirm, confirmLogout,
    selectedSet, setSelectedSet, handleStartTest, handleReview
}) {
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#18181b] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-white/10">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#18181b] z-10">
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">{selectedSet.title}</h3>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">{selectedSet.totalTests} ta test mavjud</p>
                            </div>
                            <button onClick={() => setSelectedSet(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><Icons.Close className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="p-5 overflow-y-auto bg-[#18181b]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {selectedSet.subTests.map(sub => {
                                    const isSubDone = sub.status === 'completed';
                                    return (
                                        <div key={sub.id} className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition flex flex-col justify-between h-40 ${getCardStyle(sub.type)}`}>
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getBadgeStyle(sub.type)}`}>{sub.type}</span>
                                                {isSubDone && <Icons.Check className="w-4 h-4 text-green-500" />}
                                            </div>

                                            <h4 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">{sub.title}</h4>

                                            <div className="flex items-end justify-between border-t border-white/5 pt-3 mt-2">
                                                {isSubDone ? (
                                                    <>
                                                        <div className="cursor-pointer" title="Score">
                                                            <span className="text-[9px] font-bold text-gray-500 uppercase block">Score</span>
                                                            <span className="text-xl font-bold text-white">{sub.result.bandScore || sub.result.score}</span>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            {/* 🔥 SET ICHIDAGI REVIEW TUGMASI */}
                                                            <button
                                                                onClick={() => handleReview(sub)}
                                                                className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-lg text-gray-300 transition"
                                                                title="Tahlilni ko'rish"
                                                            >
                                                                Tahlil
                                                            </button>

                                                            <button onClick={() => handleStartTest(sub)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10" title="Qayta ishlash">
                                                                <Icons.Refresh className="w-3.5 h-3.5 text-gray-400" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleStartTest(sub)} className="w-full bg-white text-black border border-transparent py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition">
                                                        Start
                                                    </button>
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