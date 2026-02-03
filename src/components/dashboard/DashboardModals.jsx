import React from 'react';
import { Icons } from './Icons';

// --- STYLES FOR SET ITEMS ---
const getCardStyle = (type) => {
    switch (type) {
        case 'reading': return "bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg shadow-sm group";
        case 'listening': return "bg-white border-slate-100 hover:border-purple-200 hover:shadow-lg shadow-sm group";
        case 'writing': return "bg-white border-slate-100 hover:border-orange-200 hover:shadow-lg shadow-sm group";
        default: return "bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg shadow-sm group";
    }
};

const getBadgeStyle = (type) => {
    switch (type) {
        case 'reading': return "text-blue-600 bg-blue-50 border border-blue-100";
        case 'listening': return "text-purple-600 bg-purple-50 border border-purple-100";
        case 'writing': return "text-orange-600 bg-orange-50 border border-orange-100";
        default: return "text-slate-600 bg-slate-100 border border-slate-100";
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
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center ring-1 ring-gray-100">
                    <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-5 shadow-sm border border-gray-100"><Icons.Key className="w-6 h-6 text-gray-800"/></div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 tracking-tight">Yangi Vazifa</h3>
                    <p className="text-sm text-gray-500 mb-6 px-4">O'qituvchi bergan maxsus kodni kiriting</p>
                    <input type="text" placeholder="XXXXXX" className="w-full border border-gray-200 p-3 rounded-xl text-center text-lg font-mono font-bold uppercase tracking-widest mb-4 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition bg-gray-50 focus:bg-white" value={accessKeyInput} onChange={e => setAccessKeyInput(e.target.value)} />
                    <div className="flex gap-3">
                        <button onClick={() => setShowKeyModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition text-sm">Bekor qilish</button>
                        <button onClick={handleVerifyKey} disabled={checkingKey} className="flex-1 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition text-sm shadow-lg shadow-gray-200">{checkingKey ? "..." : "Faollashtirish"}</button>
                    </div>
                </div>
            </div>
        )}

        {/* START CONFIRM MODAL */}
        {showStartConfirm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center ring-1 ring-gray-100">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 tracking-tight">Testni Boshlash</h3>
                    <p className="text-sm text-gray-500 mb-6 px-4">Siz testni boshlashni xoxlaysizmi?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowStartConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition text-sm">Yo'q</button>
                        <button onClick={confirmStartTest} className="flex-1 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition text-sm shadow-lg shadow-gray-200">Ha</button>
                    </div>
                </div>
            </div>
        )}

        {/* LOGOUT CONFIRM MODAL */}
        {showLogoutConfirm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center ring-1 ring-gray-100">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 tracking-tight">Chiqish</h3>
                    <p className="text-sm text-gray-500 mb-6 px-4">Do you want to exit?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition text-sm">Yo'q</button>
                        <button onClick={confirmLogout} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition text-sm shadow-lg shadow-gray-200">Ha</button>
                    </div>
                </div>
            </div>
        )}

        {/* SET DETAILS MODAL */}
        {selectedSet && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-gray-200">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{selectedSet.title}</h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedSet.totalTests} ta test mavjud</p>
                        </div>
                        <button onClick={() => setSelectedSet(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><Icons.Close className="w-5 h-5 text-gray-600"/></button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto bg-gray-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedSet.subTests.map(sub => {
                                const isSubDone = sub.status === 'completed';
                                return (
                                    <div key={sub.id} className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition flex flex-col justify-between h-40 ${getCardStyle(sub.type)}`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getBadgeStyle(sub.type)}`}>{sub.type}</span>
                                            {isSubDone && <Icons.Check className="w-4 h-4 text-green-600"/>}
                                        </div>
                                        
                                        <h4 className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">{sub.title}</h4>
                                        
                                        <div className="flex items-end justify-between border-t border-gray-200/50 pt-3 mt-2">
                                            {isSubDone ? (
                                                <>
                                                    <div className="cursor-pointer" title="Score">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Score</span>
                                                        <span className="text-xl font-bold text-gray-900">{sub.result.bandScore || sub.result.score}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1">
                                                        {/* 🔥 SET ICHIDAGI REVIEW TUGMASI */}
                                                        <button 
                                                            onClick={() => handleReview(sub)}
                                                            className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded-lg text-gray-600 transition"
                                                            title="Tahlilni ko'rish"
                                                        >
                                                            Tahlil
                                                        </button>

                                                        <button onClick={() => handleStartTest(sub)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50" title="Qayta ishlash">
                                                            <Icons.Refresh className="w-3.5 h-3.5 text-gray-600"/>
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <button onClick={() => handleStartTest(sub)} className="w-full bg-white text-gray-900 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition">
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