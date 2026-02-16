import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Headphones, PenTool, Mic, TrendingUp, Activity } from 'lucide-react';

const SkillCard = ({ skill, score, icon: Icon, color, delay }) => {
    // Color configurations for enhanced glow
    const colors = {
        blue: {
            bg: "from-blue-500/10 to-transparent",
            border: "border-blue-500/20",
            text: "text-blue-400",
            glow: "shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_-10px_rgba(59,130,246,0.5)]",
            bar: "bg-blue-500",
            iconBg: "bg-blue-500/20"
        },
        purple: {
            bg: "from-purple-500/10 to-transparent",
            border: "border-purple-500/20",
            text: "text-purple-400",
            glow: "shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_50px_-10px_rgba(168,85,247,0.5)]",
            bar: "bg-purple-500",
            iconBg: "bg-purple-500/20"
        },
        orange: {
            bg: "from-orange-500/10 to-transparent",
            border: "border-orange-500/20",
            text: "text-orange-400",
            glow: "shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_-10px_rgba(249,115,22,0.5)]",
            bar: "bg-orange-500",
            iconBg: "bg-orange-500/20"
        },
        emerald: {
            bg: "from-emerald-500/10 to-transparent",
            border: "border-emerald-500/20",
            text: "text-emerald-400",
            glow: "shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)]",
            bar: "bg-emerald-500",
            iconBg: "bg-emerald-500/20"
        }
    };

    const theme = colors[color];
    const percentage = (score / 9) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay, duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl bg-[#0F0F0F] border ${theme.border} p-5 ${theme.glow} transition-all duration-500 group`}
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-50`} />

            {/* Content */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${theme.iconBg} ${theme.text}`}>
                        <Icon size={20} />
                    </div>
                    <span className="text-2xl font-bold text-white">{score}</span>
                </div>

                <h3 className="text-gray-400 text-sm font-medium mb-3">{skill}</h3>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: delay + 0.3 }}
                        className={`h-full ${theme.bar} shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default function QuickAnalytics({ stats }) {
    // Agar stats kelmasa, bo'sh array qaytaradi yoki userga "Ma'lumot yo'q" deb chiqishi mumkin.
    // Hozircha default mock data o'rniga tashqaridan kelgan datani ishlatamiz.

    // Fallback if no stats provided (for safety/demo)
    const displayStats = stats || [
        { name: "Reading", score: 0, icon: BookOpen, color: "blue" },
        { name: "Listening", score: 0, icon: Headphones, color: "purple" },
        { name: "Writing", score: 0, icon: PenTool, color: "orange" },
        { name: "Speaking", score: 0, icon: Mic, color: "emerald" },
    ];

    return (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
                <Activity className="text-vetra-orange" size={20} />
                <h2 className="text-xl font-bold text-white">Statistika</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {displayStats.map((skill, index) => (
                    <SkillCard
                        key={skill.name}
                        {...skill}
                        delay={index * 0.1}
                    />
                ))}
            </div>
        </div>
    );
}
