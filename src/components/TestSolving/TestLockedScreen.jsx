import React, { useState } from "react";
import { Lock, Clock, Sparkles, ArrowLeft, ArrowRight, Award, Gift } from "lucide-react";
import PricingModal from "../dashboard/PricingModal";
import { useAuth } from "../../context/AuthContext";

const typeLabels = {
    reading: "Reading",
    listening: "Listening",
    writing: "Writing",
    speaking: "Speaking",
};

export default function TestLockedScreen({ meta, onBack }) {
    const { userData } = useAuth();
    const [showPricing, setShowPricing] = useState(false);

    const title = meta?.title || "IELTS Test";
    const type = (meta?.type || "").toLowerCase();
    const cardImage = meta?.thumbnail || (
        type === "listening" ? "/images/dashboard/listening_orange_headphones.jpg" :
        type === "reading" ? "/images/dashboard/reading_passage_yellow_card.png" :
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800"
    );
    const questionTypes = Array.isArray(meta?.questionTypes) ? meta.questionTypes.slice(0, 4) : [];

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-50 via-white to-gray-100 text-gray-800 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#0071e3]/5 via-[#0071e3]/2 to-transparent blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-gradient-to-t from-gray-200/40 to-transparent blur-[80px] pointer-events-none" />

            <button
                onClick={onBack}
                className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-all bg-white/80 border border-gray-200 px-3.5 py-2 rounded-lg backdrop-blur-sm shadow-sm hover:shadow active:scale-95 duration-200 group"
            >
                <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                Orqaga
            </button>

            <div className="max-w-[420px] w-full z-10 animate-fade-in-up">
                <div className="bg-white/90 border border-gray-200/80 rounded-2xl p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col gap-5">
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 border border-gray-200/50">
                        <img src={cardImage} alt={title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center">
                                <Lock size={22} className="text-white" />
                            </div>
                        </div>
                        {type && (
                            <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-white">
                                {typeLabels[type] || meta.type}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                            <Award size={11} />
                            Faqat obuna foydalanuvchilar uchun
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
                            {title}
                        </h1>
                    </div>

                    {(meta?.duration || meta?.difficulty) && (
                        <div className="grid grid-cols-2 gap-2 py-3 border-y border-gray-100">
                            <div className="flex flex-col gap-0.5 items-start">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Muddati</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                                    <Clock size={13} className="text-gray-400" />
                                    {meta?.duration || 60} min
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 items-start border-l border-gray-100 pl-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Daraja</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-gray-800 capitalize">
                                    <Sparkles size={13} className="text-gray-400" />
                                    {meta?.difficulty || "Medium"}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionTypes.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Savol Turlari</span>
                            <div className="flex flex-wrap gap-1.5">
                                {questionTypes.map((qt, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-gray-50 border border-gray-200/60 rounded text-[10px] font-bold text-gray-600 tracking-tight">
                                        {qt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 items-start text-left">
                        <Gift size={14} className="text-[#0071e3] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11.5px] font-bold text-blue-900">Do'stingiz sizga havola yubordimi?</span>
                            <p className="text-[11px] text-blue-700/90 leading-normal">
                                Ushbu testni va yana minglab Reading, Listening, Writing va Speaking testlarini ochish uchun obuna bo'ling.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                        <button
                            onClick={() => setShowPricing(true)}
                            className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_4px_16px_rgba(0,113,227,0.25)] hover:shadow-[0_4px_20px_rgba(0,113,227,0.35)] active:scale-[0.98] duration-200 flex items-center justify-center gap-1.5"
                        >
                            Tariflarni ko'rish
                            <ArrowRight size={14} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={onBack}
                            className="w-full text-center text-[12px] font-semibold text-gray-500 hover:text-gray-700 py-1.5"
                        >
                            Bepul testlarni ko'rish
                        </button>
                    </div>
                </div>
            </div>

            <PricingModal
                isOpen={showPricing}
                onClose={() => setShowPricing(false)}
                userName={userData?.fullName || "O'quvchi"}
            />
        </div>
    );
}
