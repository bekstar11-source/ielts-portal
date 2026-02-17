import React, { useState, useEffect } from 'react';
import { BookOpen, Headphones, PenTool, Mic, Clock, HelpCircle, Play, Check, Folder, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

// --- STYLES & VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 120, damping: 14 }
    },
};

// --- HELPER FUNCTIONS ---
const getIcon = (type) => {
    switch (type) {
        case 'reading': return <BookOpen size={20} />;
        case 'listening': return <Headphones size={20} />;
        case 'writing': return <PenTool size={20} />;
        case 'speaking': return <Mic size={20} />;
        default: return <BookOpen size={20} />;
    }
};

const getColor = (type) => {
    switch (type) {
        case 'reading': return 'blue';
        case 'listening': return 'purple';
        case 'writing': return 'orange';
        case 'speaking': return 'emerald';
        default: return 'orange';
    }
};

const TestCard = ({ test, onStart, onReview }) => {
    return (
        <TestCardContent test={test} onStart={onStart} onReview={onReview} />
    );
};

const TestCardContent = ({ test, onStart, onReview }) => {
    const { user } = useAuth(); // Import useAuth
    const [hasDraft, setHasDraft] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const { type, title, duration, questionsCount, status, result } = test;

    useEffect(() => {
        if (user && status !== 'completed') {
            const key = `draft_${user.uid}_${test.id}`;
            if (localStorage.getItem(key)) {
                setHasDraft(true);
            }
        }
    }, [user, test.id, status]);

    const color = getColor(type);
    const icon = getIcon(type);
    const isCompleted = status === 'completed';
    // const progress = isCompleted ? 100 : 0; 

    // Color mapping
    const colorStyles = {
        orange: {
            accent: "text-orange-400",
            glow: "bg-orange-500",
            border: "group-hover:border-orange-500/30",
            button: "bg-orange-500 hover:bg-orange-600"
        },
        purple: {
            accent: "text-purple-400",
            glow: "bg-purple-500",
            border: "group-hover:border-purple-500/30",
            button: "bg-purple-600 hover:bg-purple-700"
        },
        emerald: {
            accent: "text-emerald-400",
            glow: "bg-emerald-500",
            border: "group-hover:border-emerald-500/30",
            button: "bg-emerald-600 hover:bg-emerald-700"
        },
        blue: {
            accent: "text-blue-400",
            glow: "bg-blue-500",
            border: "group-hover:border-blue-500/30",
            button: "bg-blue-600 hover:bg-blue-700"
        }
    };

    const theme = colorStyles[color] || colorStyles.orange;

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.3 } }}
            className={`
        relative group p-5 rounded-[28px] 
        bg-[#181210] border border-white/5 
        shadow-lg
        ${theme.border}
        overflow-hidden
        flex flex-col
        h-full
        min-h-[260px]
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Top Gradient Line */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${color}-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10`} />

            {/* Background radial glow effect */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 ${theme.glow} rounded-full blur-[70px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 z-0`} />

            <div className="relative z-10 flex flex-col h-full justify-between">

                {/* Header */}
                <div>
                    <div className="flex justify-between items-start mb-5">
                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${theme.accent}`}>
                            {icon}
                        </div>

                        {/* Section Tag */}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 bg-white/5 uppercase tracking-wide ${theme.accent}`}>
                            {type}
                        </span>
                    </div>

                    <h3 className="text-2xl font-semibold leading-[1.1] mb-2 text-white tracking-tight line-clamp-2">
                        {title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-4 font-medium">
                        <div className="flex items-center gap-1.5">
                            <HelpCircle size={14} className="opacity-70" />
                            <span>{questionsCount || 40} savol</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="opacity-70" />
                            <span>{duration || 60} daqiqada</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Action */}
                <div className="mt-6">
                    {isCompleted ? (
                        <div className="mb-4">
                            <div className="flex justify-between text-[10px] font-medium text-gray-400 mb-1.5">
                                <span>Natija</span>
                                <span className="text-white font-bold">{result?.bandScore || result?.score} Ball</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `100%` }}
                                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                    className={`h-full rounded-full ${theme.glow}`}
                                ></motion.div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-2"></div>
                    )}

                    <motion.button
                        onClick={() => isCompleted ? onReview(test) : onStart(test)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
            w-full py-3.5 rounded-xl flex items-center justify-center gap-2 
            text-white font-semibold text-sm transition-colors duration-300
            ${isCompleted ? 'bg-white/10 hover:bg-white/20' : theme.button}
          `}>
                        {isCompleted ? 'Tahlilni Ko\'rish' : (hasDraft ? 'Davom ettirish' : 'Boshlash')}
                        {!isCompleted && <Play size={16} fill="currentColor" />}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default function TestGrid({ loading, tests, onStartTest, onSelectSet, onReview, errorMsg }) {
    if (loading) return <div className="text-center py-20 text-gray-400 text-sm animate-pulse">Yuklanmoqda...</div>;
    if (errorMsg) return <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm font-medium border border-red-500/20">{errorMsg}</div>;

    return (
        <motion.div
            key={tests.map(t => t.id).join(',')}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
            {tests.map((test, index) => {
                // Mock va Set kartalari uchun alohida dizayn kerak bo'lsa, shu yerda ajratish mumkin.
                // Hozircha oddiy TestCard ishlatamiz.

                if (test.isMock) {
                    return (
                        <motion.div variants={itemVariants} key={index} className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-gray-900 to-black text-white p-6 shadow-xl border border-white/10 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Check className="w-32 h-32" /></div>
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded mb-3 uppercase tracking-wider border border-yellow-500/20">Mock Exam</span>
                                    <h3 className="text-2xl font-bold leading-tight mb-1">Full IELTS Mock</h3>
                                    <p className="text-gray-400 text-xs">Listening • Reading • Writing</p>
                                </div>
                                <div className="mt-8">
                                    <button
                                        onClick={() => test.status === 'completed' ? onReview(test) : onStartTest(test)}
                                        className="w-full bg-white text-black hover:bg-gray-200 py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                                    >
                                        {test.status === 'completed' ? "Natijani Ko'rish" : "Imtihonni Boshlash"}
                                        {test.status !== 'completed' && <Play size={16} fill="currentColor" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                }

                if (test.isSet) {
                    return (
                        <motion.div variants={itemVariants} key={test.id || index} onClick={() => onSelectSet(test)} className="group bg-[#181210] rounded-[28px] p-6 border border-white/5 hover:border-blue-500/30 transition cursor-pointer flex flex-col justify-between h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-6 -mt-6 transition group-hover:bg-blue-500/20"></div>
                            <div>
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{test.title}</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(test.completedTests / test.totalTests) * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">{test.completedTests}/{test.totalTests}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-between items-center text-blue-400 text-xs font-bold uppercase tracking-wider">
                                <span>To'plamni Ochish</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.div>
                    );
                }

                return (
                    <TestCard
                        key={test.id || index}
                        test={test}
                        onStart={onStartTest}
                        onReview={onReview}
                    />
                );
            })}
        </motion.div>
    );
}