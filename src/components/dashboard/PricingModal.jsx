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
            name: "Vetra Lite",
            price: "159,000",
            period: "oyiga",
            icon: <Zap className="w-6 h-6 text-blue-400" />,
            color: "blue",
            features: [
                "Barcha Reading & Listening testlari",
                "Xatolar banki va shaxsiy lug'at",
                "Cheklangan Writing AI (oyiga 5 ta)",
                "Cheklangan Speaking AI (oyiga 5 ta)"
            ],
            buttonText: "Lite Tarifni Tanlash"
        },
        {
            name: "Vetra Pro",
            price: "249,000",
            period: "oyiga",
            icon: <Star className="w-6 h-6 text-orange-400" />,
            color: "orange",
            popular: true,
            features: [
                "Barcha Full Mock Exam setlar",
                "Cheksiz Writing AI tekshiruvchisi",
                "Cheksiz Speaking AI (Real examiner)",
                "Xatolar tahlili va yechimlar",
                "Personal o'quv rejasi (Target 7.5+)"
            ],
            buttonText: "Pro Tarifni Tanlash"
        },
        {
            name: "Vetra Elite",
            price: "599,000",
            period: "3 oylik",
            icon: <Shield className="w-6 h-6 text-purple-400" />,
            color: "purple",
            features: [
                "Pro tarifning barcha imkoniyatlari",
                "Faqat 3 oylik to'lov bilan tejash",
                "24/7 Mentor yordami",
                "Writing uchun maxsus PDF qo'llanmalar",
                "Speaking mock interview (Live)"
            ],
            buttonText: "Elite Tarifni Tanlash"
        }
    ];

    const getRingColor = (color) => {
        if (color === 'orange') return 'ring-orange-500/50 shadow-[0_0_30px_rgba(255,85,32,0.2)]';
        if (color === 'blue') return 'ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]';
        if (color === 'purple') return 'ring-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]';
        return 'ring-white/10';
    };

    const getBgColor = (color) => {
        if (color === 'orange') return 'from-orange-500/20 to-transparent border-orange-500/30';
        if (color === 'blue') return 'from-blue-500/20 to-transparent border-blue-500/30';
        if (color === 'purple') return 'from-purple-500/20 to-transparent border-purple-500/30';
        return 'from-white/10 to-transparent border-white/10';
    };

    const getButtonColor = (color) => {
        if (color === 'orange') return 'bg-orange-500 hover:bg-orange-600 shadow-[0_0_15px_rgba(255,85,32,0.4)] hover:shadow-[0_0_25px_rgba(255,85,32,0.6)]';
        if (color === 'blue') return 'bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]';
        if (color === 'purple') return 'bg-purple-600 hover:bg-purple-700 shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)]';
        return 'bg-white/20 hover:bg-white/30';
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
                    className="absolute inset-0 bg-[#050505]/80 backdrop-blur-xl"
                    onClick={onClose}
                />

                <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.9, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
                    className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl"
                >
                    {/* Animated Glows inside modal */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="relative z-10 p-4 sm:p-5 md:p-6">
                        {/* Header */}
                        <div className="text-center max-w-2xl mx-auto mb-4">
                            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                                Barcha Imkoniyatlarni Ochish
                            </h2>
                            <p className="text-sm text-gray-400">
                                {userName}, {customMessage}
                            </p>
                        </div>

                        {/* Pricing Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                            {plans.map((plan, index) => (
                                <div
                                    key={index}
                                    className={`relative flex flex-col h-full bg-gradient-to-b ${getBgColor(plan.color)} border rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1 ring-1 ${plan.popular ? getRingColor(plan.color) : 'ring-white/5'}`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider py-0.5 px-3 rounded-full shadow-[0_0_15px_rgba(255,85,32,0.5)]">
                                            Eng Mashhur
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                            <div className={`p-1.5 rounded-xl bg-white/5 border border-white/10`}>
                                                {React.cloneElement(plan.icon, { className: 'w-5 h-5' })}
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-white">{plan.price}</span>
                                            <span className="text-[10px] text-gray-400 mb-1 leading-relaxed"> UZS / {plan.period}</span>
                                        </div>
                                    </div>

                                    <ul className="flex-1 space-y-2 mb-4 text-xs font-medium">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-gray-300">
                                                <CheckCircle size={14} className={`shrink-0 mt-0.5 text-${plan.color}-400`} />
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
                            <p className="text-xs text-gray-500">
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
