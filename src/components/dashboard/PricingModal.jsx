import React from 'react';
import { X, Check, Zap, Star, Shield, ArrowRight, Sparkles, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

export default function PricingModal({ isOpen, onClose, userName = "O'quvchi" }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    if (!isOpen) return null;

    const plans = [
        {
            id: "standard",
            billing: "monthly",
            name: "Standard 1 Oylik",
            price: "29,000",
            period: "oyiga",
            icon: <Zap size={14} />,
            features: ["Reading & Listening", "Premium Podcastlar", "Progress tracking"],
            buttonText: "Tanlash",
            popular: false
        },
        {
            id: "standard",
            billing: "tri",
            name: "Standard 3 Oylik",
            price: "79,000",
            period: "3 oyga",
            icon: <CreditCard size={14} />,
            features: ["Barcha Standard", "3 oy cheksiz", "Arzonroq (26k/oy)"],
            buttonText: "Tanlash",
            popular: false
        },
        {
            id: "pro",
            billing: "monthly",
            name: "Pro 1 Oylik",
            price: "39,000",
            period: "oyiga",
            icon: <Shield size={14} />,
            features: ["Standard + AI Writing", "AI Speaking Examiner", "Xatolar banki"],
            buttonText: "Pro'ga o'tish",
            popular: false
        },
        {
            id: "pro",
            billing: "tri",
            name: "Pro 3 Oylik",
            price: "99,000",
            period: "3 oyga",
            icon: <Star size={14} />,
            features: ["Barcha Pro + Mock", "Personal Roadmap", "Support 24/7"],
            buttonText: "3 Oylik Pro",
            popular: true
        }
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4"
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-[#f5f5f7]/80 backdrop-blur-xl"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    className="relative w-full max-w-6xl bg-white border border-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-1.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
                    >
                        <X size={16} className="text-black/40" />
                    </button>

                    <div className="relative z-10 p-5 sm:p-8">
                        {/* Compact Title Section */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider mb-2">
                                <Sparkles size={10} /> Premium
                            </div>
                            <h2 className="text-[24px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight mb-1">
                                Bilimga investitsiya — eng yaxshi sarmoya.
                            </h2>
                            <p className="text-[13px] text-[#86868b]">
                                {userName}, Pro tarif bilan IELTS ga tayyorgarlikni yangi darajaga ko'taring.
                            </p>
                        </div>

                        {/* Extremely Compact Plans Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-none mx-auto">
                            {plans.map((plan, idx) => (
                                <div
                                    key={idx}
                                    className={`relative p-5 rounded-[20px] border transition-all duration-300 flex flex-col ${
                                        plan.popular 
                                        ? 'bg-black text-white border-black shadow-lg scale-[1.02]' 
                                        : 'bg-white text-[#1d1d1f] border-[#e5e5e5]'
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#0071e3] text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                                            ENG MASHHUR
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${plan.popular ? 'bg-white/10 text-white' : 'bg-[#f5f5f7] text-[#0071e3]'}`}>
                                            {plan.icon}
                                        </div>
                                        <h3 className="text-sm font-bold mb-0.5">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[22px] font-bold">{plan.price}</span>
                                            <span className={`text-[10px] font-medium ${plan.popular ? 'text-white/60' : 'text-[#86868b]'}`}>UZS</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-2 mb-6 flex-1">
                                        {plan.features.map((feature, fIdx) => (
                                            <li key={fIdx} className="flex items-start gap-2">
                                                <div className={`mt-1 flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-blue-50'}`}>
                                                    <Check size={7} className={plan.popular ? 'text-white' : 'text-[#0071e3]'} strokeWidth={4} />
                                                </div>
                                                <span className={`text-[11px] font-medium leading-tight ${plan.popular ? 'text-white/80' : 'text-[#424245]'}`}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => {
                                            const params = `${user?.uid || 'guest'}_${plan.id}_${plan.billing}`;
                                            window.open(`https://t.me/ielts_portal_auth_bot?start=${params}`, '_blank');
                                        }}
                                        className={`w-full py-2.5 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 group ${
                                            plan.popular 
                                            ? 'bg-white text-black hover:bg-gray-100' 
                                            : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                                        }`}
                                    >
                                        {plan.buttonText}
                                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Minimal Footer Info */}
                        <div className="mt-6 pt-4 border-t border-[#f2f2f2] text-center flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 opacity-60">
                                <div className="flex items-center gap-1 text-[10px] font-medium text-[#1d1d1f]">
                                    <CreditCard size={12} /> To'lov xavfsiz
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-[#1d1d1f]">
                                    <Zap size={12} /> Tezkor faollashtirish
                                </div>
                            </div>
                            <p className="text-[10px] text-[#86868b] flex items-center gap-3">
                                <button 
                                    onClick={() => {
                                        navigate('/pricing');
                                        onClose();
                                    }}
                                    className="text-[#0071e3] hover:underline font-bold"
                                >
                                    Batafsil ma'lumot
                                </button>
                                <span>•</span>
                                <span>To'lovdan so'ng barcha funksiyalar ochiladi.</span>
                                <span>•</span>
                                <a href="https://t.me/support" className="text-[#0071e3] hover:underline">Support</a>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
