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
            price: "35,000",
            period: "oyiga",
            icon: <Zap size={14} />,
            features: ["Reading & Listening", "Premium Podcastlar", "3 ta Mock imtihon"],
            buttonText: "Tanlash",
            popular: false
        },
        {
            id: "standard",
            billing: "tri",
            name: "Standard 3 Oylik",
            price: "89,000",
            period: "3 oyga",
            icon: <CreditCard size={14} />,
            features: ["Barcha Standard", "Premium Podcastlar", "3 ta Mock imtihon"],
            buttonText: "Tanlash",
            popular: false
        },
        {
            id: "pro",
            billing: "monthly",
            name: "Pro 1 Oylik",
            price: "49,000",
            period: "oyiga",
            icon: <Shield size={14} />,
            features: ["Standard + 5 ta Mock", "Personal Roadmap", "Xatolar banki"],
            buttonText: "Pro'ga o'tish",
            popular: false
        },
        {
            id: "pro",
            billing: "tri",
            name: "Pro 3 Oylik",
            price: "129,000",
            period: "3 oyga",
            icon: <Star size={14} />,
            features: ["Barcha Pro + 5 ta Mock", "Personal Roadmap", "Support 24/7"],
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
                    className="fixed inset-0 bg-warm-surface/80 dark:bg-warm-dark/80 backdrop-blur-xl"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    className="relative w-full max-w-6xl bg-warm-canvas dark:bg-warm-dark-elevated border border-warm-canvas dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 rounded-full transition-colors"
                    >
                        <X size={16} className="text-black/40 dark:text-white/60" />
                    </button>

                    <div className="relative z-10 p-5 sm:p-8">
                        {/* Compact Title Section */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warm-primary/10 dark:bg-warm-primary/20 text-warm-primary text-[9px] font-bold uppercase tracking-wider mb-2">
                                <Sparkles size={10} /> Premium
                            </div>
                            <h2 className="text-[24px] sm:text-[30px] font-bold text-warm-ink dark:text-warm-on-dark tracking-tight mb-1">
                                Bilimga investitsiya — eng yaxshi sarmoya.
                            </h2>
                            <p className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft">
                                {userName}, Pro tarif bilan IELTS ga tayyorgarlikni yangi darajaga ko'taring.
                            </p>
                        </div>

                        {/* Extremely Compact Plans Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-none mx-auto">
                            {plans.map((plan, idx) => (
                                <div
                                    key={idx}
                                    className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col ${
                                        plan.popular
                                        ? 'bg-warm-ink dark:bg-white text-white dark:text-warm-ink border-warm-ink dark:border-white shadow-lg scale-[1.02]'
                                        : 'bg-warm-canvas dark:bg-warm-dark-elevated text-warm-ink dark:text-warm-on-dark border-warm-hairline dark:border-white/10'
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-warm-primary text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                                            ENG MASHHUR
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${plan.popular ? 'bg-white/10 dark:bg-warm-ink/10 text-white dark:text-warm-ink' : 'bg-warm-surface dark:bg-white/5 text-warm-primary'}`}>
                                            {plan.icon}
                                        </div>
                                        <h3 className="text-sm font-bold mb-0.5">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[22px] font-bold">{plan.price}</span>
                                            <span className={`text-[10px] font-medium ${plan.popular ? 'text-white/60 dark:text-warm-ink/60' : 'text-warm-muted dark:text-warm-on-dark-soft'}`}>UZS</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-2 mb-6 flex-1">
                                        {plan.features.map((feature, fIdx) => (
                                            <li key={fIdx} className="flex items-start gap-2">
                                                <div className={`mt-1 flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center ${plan.popular ? 'bg-white/20 dark:bg-warm-ink/20' : 'bg-warm-primary/10 dark:bg-warm-primary/20'}`}>
                                                    <Check size={7} className={plan.popular ? 'text-white dark:text-warm-ink' : 'text-warm-primary'} strokeWidth={4} />
                                                </div>
                                                <span className={`text-[11px] font-medium leading-tight ${plan.popular ? 'text-white/80 dark:text-warm-ink/80' : 'text-warm-body dark:text-warm-on-dark-soft'}`}>
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
                                            ? 'bg-warm-canvas dark:bg-warm-ink text-warm-ink dark:text-white hover:bg-warm-surface dark:hover:bg-warm-body-strong'
                                            : 'bg-warm-primary text-white hover:bg-warm-primary-active'
                                        }`}
                                    >
                                        {plan.buttonText}
                                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Minimal Footer Info */}
                        <div className="mt-6 pt-4 border-t border-warm-hairline dark:border-white/10 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 opacity-60">
                                <div className="flex items-center gap-1 text-[10px] font-medium text-warm-ink dark:text-warm-on-dark">
                                    <CreditCard size={12} /> To'lov xavfsiz
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-warm-ink dark:text-warm-on-dark">
                                    <Zap size={12} /> Tezkor faollashtirish
                                </div>
                            </div>
                            <p className="text-[10px] text-warm-muted dark:text-warm-on-dark-soft flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        navigate('/pricing');
                                        onClose();
                                    }}
                                    className="text-warm-primary hover:underline font-bold"
                                >
                                    Batafsil ma'lumot
                                </button>
                                <span>•</span>
                                <span>To'lovdan so'ng barcha funksiyalar ochiladi.</span>
                                <span>•</span>
                                <a href="https://t.me/support" className="text-warm-primary hover:underline">Support</a>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
