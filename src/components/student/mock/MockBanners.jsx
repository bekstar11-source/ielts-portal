import React from 'react';
import { KeyRound, Sparkles, AlertCircle, Loader2, ShoppingBag, ChevronRight } from 'lucide-react';

export default function MockBanners({ 
    lang, handleVerifyKey, mockKey, setMockKey, loading, success, error, navigate 
}) {
    return (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Banner: Key Verification */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#1f0b0d] text-white p-8 border border-[#2a0f11] shadow-md flex flex-col justify-between min-h-[280px]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                    <KeyRound size={20} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight">
                                    {lang === 'uz' ? "Mock Key orqali kirish" : "Enter Mock Exam Key"}
                                </h3>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed font-semibold">
                                {lang === 'uz' 
                                    ? "Sizda faollashtirish kaliti bormi? Uni quyida kiriting va IELTS on Computer mock imtihonini boshlang."
                                    : "Do you have an activation key? Enter it below to unlock and start your IELTS on Computer mock exam."
                                }
                            </p>
                        </div>

                        <form onSubmit={handleVerifyKey} className="space-y-3 mt-6 relative z-10">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={mockKey}
                                    onChange={(e) => setMockKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX"
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-black uppercase tracking-[0.2em] text-white outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40 transition-all placeholder:tracking-normal placeholder:font-semibold placeholder:text-zinc-500"
                                />
                                {error && (
                                    <p className="text-red-400 text-[11px] font-bold mt-2 flex items-center gap-1.5 animate-pulse">
                                        <AlertCircle size={14} /> {error}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !mockKey.trim() || success}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 ${
                                    success ? 'bg-green-600 text-white' : 'bg-[#e31b23] hover:bg-[#c4151c] text-white shadow-red-950/20'
                                }`}
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : success ? (
                                    <>
                                        <Sparkles size={18} />
                                        {lang === 'uz' ? "Muvaffaqiyatli faollashtirildi!" : "Successfully Activated!"}
                                    </>
                                ) : (
                                    lang === 'uz' ? "Imtihonni faollashtirish" : "Activate & Unlock Exam"
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Banner: Mock Purchase Catalog */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#1f160d] text-white p-8 border border-[#2d1f11] shadow-md flex flex-col justify-between min-h-[280px]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <ShoppingBag size={20} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight">
                                    {lang === 'uz' ? "Mock Testlar Katalogi" : "Mock Exams Store"}
                                </h3>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed font-semibold">
                                {lang === 'uz'
                                    ? "Reading, Listening, Writing va Speaking bo'limlarini o'z ichiga olgan rasmiy formatdagi to'liq imtihon simulyatsiyalarini sotib oling."
                                    : "Purchase complete full-length exam simulations containing authentic Reading, Listening, Writing and Speaking modules."
                                }
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {['Reading', 'Listening', 'Writing'].map((skill) => (
                                    <span key={skill} className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-3 relative z-10">
                            <div className="flex items-baseline justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    {lang === 'uz' ? "Jami narxi:" : "Total Price:"}
                                </span>
                                <span className="text-lg font-black text-amber-400">
                                    30 000 UZS
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/mock-buy')}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#e31b23] hover:bg-[#c4151c] text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 active:scale-[0.98] group"
                            >
                                {lang === 'uz' ? "Katalogga o'tish" : "Go to Store"}
                                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </section>
    );
}