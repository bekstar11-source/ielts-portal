import React from 'react';
import { X, CheckCircle, Zap, Star, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PricingModal({ isOpen, onClose, userName = "O'quvchi", source = "general" }) {
    const modalRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // source prop can be used to customize the message based on what the user clicked
    let customMessage = "IELTS da yuqori natijaga erishish uchun barcha funksiyalarni oching.";
    if (source === "practice") customMessage = "Barcha yopiq testlarni yechish va analiz qilish uchun Premium tarifga o'ting.";
    if (source === "speaking") customMessage = "AI Examiner bilan cheksiz Speaking mashq qilish uchun Premium kerak.";
    if (source === "writing") customMessage = "Yozgan essey va xatlaringizni bandlarga ajratib tekshirish uchun Premium sotib oling.";

    const plans = [
        {
            name: "Daily Pass",
            price: "2,900",
            period: "kuniga",
            icon: <Zap className="w-6 h-6 text-yellow-500" />,
            color: "yellow",
            features: [
                "Barcha testlar (1 kun)",
                "AI Evaluation (1 kun)",
                "Xatolar banki (1 kun)",
                "Tezkor kirish"
            ],
            buttonText: "Sotib olish"
        },
        {
            name: "10-Day Sprint",
            price: "19,000",
            period: "10 kunga",
            icon: <Star className="w-6 h-6 text-[#F44A22]" />,
            color: "orange",
            popular: true,
            features: [
                "10 kunlik to'liq reja",
                "Barcha Reading & Listening",
                "Writing & Speaking (Cheksiz)",
                "Roadmap progress tracking"
            ],
            buttonText: "Sprintni Boshlash"
        },
        {
            name: "Monthly Pro",
            price: "29,000",
            period: "oyiga",
            icon: <Shield className="w-6 h-6 text-blue-500" />,
            color: "blue",
            features: [
                "30 kun cheksiz foydalanish",
                "Barcha Full Mock Examlar",
                "Xatolar tahlili va yechimlar",
                "Personal o'quv rejasi"
            ],
            buttonText: "Pro Tarifni Tanlash"
        }
    ];

    const getRingColor = (color) => {
        if (color === 'orange') return 'ring-[#F44A22]/30 shadow-lg shadow-[#F44A22]/10';
        if (color === 'blue') return 'ring-blue-400/30 shadow-lg shadow-blue-400/10';
        if (color === 'purple') return 'ring-purple-400/30 shadow-lg shadow-purple-400/10';
        if (color === 'yellow') return 'ring-yellow-400/30 shadow-lg shadow-yellow-400/10';
        return 'ring-[#E4E2E3]';
    };

    const getBgColor = (color) => {
        if (color === 'orange') return 'from-[#F44A22]/5 to-transparent border-[#F44A22]/20';
        if (color === 'blue') return 'from-blue-50 to-transparent border-blue-200';
        if (color === 'purple') return 'from-purple-50 to-transparent border-purple-200';
        if (color === 'yellow') return 'from-yellow-50 to-transparent border-yellow-200';
        return 'from-[#FEF8E8] to-transparent border-[#E4E2E3]';
    };

    const getButtonColor = (color) => {
        if (color === 'orange') return 'bg-[#F44A22] hover:bg-[#D93D1B] shadow-lg shadow-[#F44A22]/20';
        if (color === 'blue') return 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20';
        if (color === 'purple') return 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20';
        if (color === 'yellow') return 'bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/20';
        return 'bg-[#161616] hover:bg-[#2a2a2a]';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4"
            >
                {/* Backdrop Blur */}
                <div
                    className="absolute inset-0 bg-black/30 backdrop-blur-xl"
                    onClick={onClose}
                />

                <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.9, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
                    className="relative w-full max-w-5xl bg-white border border-[#E4E2E3]/60 rounded-3xl shadow-2xl"
                >
                    {/* Subtle glows */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F44A22]/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-400/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-2 bg-[#E4E2E3]/30 hover:bg-[#E4E2E3]/60 border border-[#E4E2E3]/60 rounded-full text-[#A8AAAC] hover:text-[#161616] transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="relative z-10 p-4 sm:p-5 md:p-6">
                        {/* Header */}
                        <div className="text-center max-w-2xl mx-auto mb-4">
                            <h2 className="text-2xl md:text-3xl font-bold text-[#161616] tracking-tight mb-2">
                                Barcha Imkoniyatlarni Ochish
                            </h2>
                            <p className="text-sm text-[#A8AAAC]">
                                {userName}, {customMessage}
                            </p>
                        </div>

                        {/* Pricing Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                            {plans.map((plan, index) => (
                                <div
                                    key={index}
                                    className={`relative flex flex-col h-full bg-gradient-to-b ${getBgColor(plan.color)} border rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1 ring-1 ${plan.popular ? getRingColor(plan.color) : 'ring-[#E4E2E3]/60'}`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F44A22] text-white text-[10px] font-bold uppercase tracking-wider py-0.5 px-3 rounded-full shadow-lg shadow-[#F44A22]/30">
                                            Eng Mashhur
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-bold text-[#161616]">{plan.name}</h3>
                                            <div className="p-1.5 rounded-xl bg-[#FEF8E8] border border-[#E4E2E3]/60">
                                                {React.cloneElement(plan.icon, { className: 'w-5 h-5' })}
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-[#161616]">{plan.price}</span>
                                            <span className="text-[10px] text-[#A8AAAC] mb-1 leading-relaxed"> UZS / {plan.period}</span>
                                        </div>
                                    </div>

                                    <ul className="flex-1 space-y-2 mb-4 text-xs font-medium">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[#161616]/80">
                                                <CheckCircle size={14} className={`shrink-0 mt-0.5 ${plan.color === 'orange' ? 'text-[#F44A22]' : plan.color === 'blue' ? 'text-blue-500' : 'text-purple-500'}`} />
                                                <span className="leading-tight">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => window.open('https://t.me/your_bot_username', '_blank')}
                                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-[13px] text-white transition-all flex items-center justify-center gap-2 group ${getButtonColor(plan.color)}`}
                                    >
                                        {plan.buttonText}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-[#A8AAAC]">
                                To'lov bot orqali avtomatik amalga oshiriladi (Click, Payme, Uzcard, Humo). <br className="hidden sm:block" />
                                To'lov qilinganidan so'ng hisobingiz darhol Premiumga o'zgaradi.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
