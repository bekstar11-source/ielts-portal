import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Headphones, PenTool, Mic, TrendingUp, Activity } from 'lucide-react';

const SkillCard = ({ skill, score, icon: Icon, color, delay }) => {
    // Color configurations for white theme
    const colors = {
        blue: {
            bg: "from-blue-50 to-transparent",
            border: "border-blue-100",
            text: "text-blue-600",
            glow: "shadow-sm hover:shadow-md hover:shadow-blue-100",
            bar: "bg-blue-500",
            iconBg: "bg-blue-50"
        },
        purple: {
            bg: "from-purple-50 to-transparent",
            border: "border-purple-100",
            text: "text-purple-600",
            glow: "shadow-sm hover:shadow-md hover:shadow-purple-100",
            bar: "bg-purple-500",
            iconBg: "bg-purple-50"
        },
        orange: {
            bg: "from-orange-50 to-transparent",
            border: "border-orange-100",
            text: "text-[#F44A22]",
            glow: "shadow-sm hover:shadow-md hover:shadow-orange-100",
            bar: "bg-[#F44A22]",
            iconBg: "bg-orange-50"
        },
        emerald: {
            bg: "from-emerald-50 to-transparent",
            border: "border-emerald-100",
            text: "text-emerald-600",
            glow: "shadow-sm hover:shadow-md hover:shadow-emerald-100",
            bar: "bg-emerald-500",
            iconBg: "bg-emerald-50"
        }
    };

    const theme = colors[color];
    const percentage = (score / 9) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay, duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl bg-white border ${theme.border} p-5 ${theme.glow} transition-all duration-500 group`}
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-50`} />

            {/* Content */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.text} border ${theme.border}`}>
                        <Icon size={22} />
                    </div>
                    <span className="text-3xl font-display text-[#161616] tracking-tighter">{score}</span>
                </div>

                <h3 className="text-[#A8AAAC] text-xs font-bold uppercase tracking-widest mb-4 font-sans">{skill}</h3>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-[#E4E2E3]/60 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: delay + 0.3 }}
                        className={`h-full ${theme.bar} rounded-full`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default function QuickAnalytics({ stats, onUpgradeAction }) {
    // Fallback if no stats provided (for safety/demo)
    const displayStats = stats || [
        { name: "Reading", score: 0, icon: BookOpen, color: "blue" },
        { name: "Listening", score: 0, icon: Headphones, color: "purple" },
        { name: "Writing", score: 0, icon: PenTool, color: "orange" },
        { name: "Speaking", score: 0, icon: Mic, color: "emerald" },
    ];

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="text-vetra-orange" size={20} />
                    <h2 className="text-xl font-bold text-vetra-midnight">Statistika</h2>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-vetra-stone uppercase tracking-widest">
                    <TrendingUp size={14} />
                    Haftalik O'sish
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {displayStats.map((skill, index) => (
                    <SkillCard
                        key={skill.name}
                        skill={skill.name}
                        score={skill.score}
                        icon={skill.icon}
                        color={skill.color}
                        delay={index * 0.1}
                    />
                ))}
            </div>

            {/* BLURRED DETAILED ANALYSIS SECTION */}
            <div className="relative overflow-hidden rounded-3xl border border-[#E4E2E3]/60 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-[#161616]">Chuqurlashtirilgan Tahlil</h3>
                        <p className="text-sm text-[#A8AAAC]">Zaif tomonlaringiz va rivojlanish kerak bo'lgan yo'nalishlar</p>
                    </div>
                    <div className="px-3 py-1 bg-vetra-orange/5 text-vetra-orange rounded-full text-xs font-bold border border-vetra-orange/10 uppercase tracking-widest">
                        AI Insights
                    </div>
                </div>

                {/* The Blurred Content Container */}
                <div className="relative">
                    {/* Dummy content that will be blurred */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pointer-events-none select-none filter blur-[8px] opacity-30">
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-[#161616] uppercase tracking-widest">Eng zaif savol turlari</h4>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span>Question Type {i}</span>
                                        <span>{10 + i * 5}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#E4E2E3] rounded-full">
                                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${10 + i * 5}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="w-32 h-32 rounded-full border-[12px] border-[#E4E2E3] border-t-vetra-orange rotate-45"></div>
                        </div>
                    </div>

                    {/* The Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center px-6">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 border border-[#E4E2E3]/60">
                            <Activity className="w-8 h-8 text-vetra-orange" />
                        </div>
                        <h4 className="text-xl font-bold text-[#161616] mb-2 tracking-tight">
                            Zaif tomonlaringizni bilib olish uchun Premiumga ulaning
                        </h4>
                        <p className="text-sm text-[#555555] mb-6 max-w-sm">
                            Siz qaysi savol turlarida (masalan, TFNG) ko'p xato qilayotganingizni AI aniqlaydi.
                        </p>
                        <button 
                            onClick={onUpgradeAction}
                            className="bg-[#161616] hover:bg-black text-white px-8 py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-black/20 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Tahlilni ochish
                        </button>
                    </div>
                </div>

                {/* Diagonal lines background effect for blurred area */}
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
            </div>
        </div>
    );
}
