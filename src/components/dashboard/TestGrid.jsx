import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Headphones, PenTool, Mic, Clock, HelpCircle, Play, Check, Folder, ArrowRight, Crown, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { ShineBorder } from '../ui/shine-border';

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

const TestCard = ({ test, onStart, onReview, isPremium, onUpgradeClick }) => {
    return (
        <TestCardContent test={test} onStart={onStart} onReview={onReview} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
    );
};

const TestCardContent = ({ test, onStart, onReview, isPremium, onUpgradeClick }) => {
    const { user, userData } = useAuth(); // Import useAuth
    const [hasDraft, setHasDraft] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const { type, title, duration, questionsCount, status, result, attemptsCount = 0, isStrict, endDate } = test;
    const isAssignment = !!test.isAssignment;
    const hasGroupId = userData?.groupId && userData?.groupId !== 'none';
    const maxAttempts = test.maxAttempts !== undefined ? test.maxAttempts : (hasGroupId ? (isAssignment ? 1 : Infinity) : 5);
    const canRetake = isAssignment ? (attemptsCount < maxAttempts) : true;

    // Status checks
    const isCompleted = status === 'completed';
    const isExpired = status === 'expired';
    const isUpcoming = status === 'upcoming';
    const canStart = canRetake && !isExpired && !isUpcoming;

    useEffect(() => {
        if (user && status !== 'completed' && canRetake) {
            const key = `draft_${user.uid}_${test.id}`;
            if (localStorage.getItem(key)) {
                setHasDraft(true);
            }
        }
    }, [user, test.id, status]);

    const color = getColor(type);
    const icon = getIcon(type);

    // Dynamic question types extraction
    const questionLabels = useMemo(() => {
        if (test.questionTypes && test.questionTypes.length > 0) return test.questionTypes;
        if (!test.questions || !Array.isArray(test.questions)) return [];
        
        const typeMap = {
            'mcq': 'MCQ',
            'gap_fill': 'GAP FILL',
            'notes_completion': 'NOTES',
            'summary_completion': 'SUMMARY',
            'table_completion': 'TABLE',
            'flow_chart_completion': 'FLOW CHART',
            'map_labeling': 'MAP',
            'matching': 'MATCHING',
            'true_false_not_given': 'TRUE/FALSE/NG',
            'true_false': 'TRUE/FALSE/NG',
            'tfng': 'TRUE/FALSE/NG',
            'yes_no_not_given': 'YES/NO/NG',
            'yes_no': 'YES/NO/NG',
            'ynng': 'YES/NO/NG',
            'short_answer': 'SHORT ANSWER',
            'sentence_completion': 'SENTENCE',
            'diagram_labeling': 'DIAGRAM',
            'heading_matching': 'HEADINGS',
            'paragraph_matching': 'PARA MATCH',
            'multiple_choice': 'MCQ'
        };

        const uniqueTypes = new Set();
        test.questions.forEach(q => {
            if (q.type) uniqueTypes.add(typeMap[q.type] || q.type);
        });
        return Array.from(uniqueTypes);
    }, [test.questionTypes, test.questions]);

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
        ${isPremium ? 'cursor-default' : ''}
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Top Gradient Line */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${color}-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10`} />

            {/* Background radial glow effect */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 ${theme.glow} rounded-full blur-[70px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 z-0`} />

            {/* Premium Overlay / Blur if needed ? User asked for premium badge */}
            {isPremium && (
                <div className="absolute top-4 right-4 z-[20] flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-full border border-yellow-500/20 backdrop-blur-md animate-pulse">
                    <Crown size={14} className="fill-yellow-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Premium</span>
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full justify-between">

                {/* Header */}
                <div>
                    <div className="flex justify-between items-start mb-5">
                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${theme.accent}`}>
                            {icon}
                        </div>

                        {/* Section Tag */}
                        {!isPremium && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 bg-white/5 uppercase tracking-wide ${theme.accent}`}>
                                {type}
                            </span>
                        )}
                    </div>

                    {/* To'plamdan kelganligi ko'rsatkichi */}
                    {test._fromSet && (
                        <div className="flex items-center gap-1.5 mb-2">
                            <Folder size={11} className="text-blue-400 opacity-70" />
                            <span className="text-[10px] text-blue-400 font-medium truncate">{test._fromSet}</span>
                        </div>
                    )}

                    <h3 className={`text-2xl font-semibold leading-[1.1] mb-2 text-white tracking-tight line-clamp-2 ${isPremium ? 'opacity-60' : ''}`}>
                        {title}
                    </h3>

                    {/* Savol turlari (Reading/Listening uchun) */}
                    {(type === 'reading' || type === 'listening') && (
                        <div className={`flex flex-wrap gap-1.5 mt-3 mb-1 ${isPremium ? 'opacity-40' : ''}`}>
                            {questionLabels.length > 0 ? (
                                questionLabels.slice(0, 4).map((qLabel, idx) => (
                                    <span key={idx} className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.06] text-gray-400 font-semibold whitespace-nowrap">
                                        {qLabel}
                                    </span>
                                ))
                            ) : null}
                        </div>
                    )}

                    <div className={`flex items-center gap-4 text-xs text-gray-400 mt-4 font-medium ${isPremium ? 'opacity-40' : ''}`}>
                        <div className="flex items-center gap-1.5">
                            <HelpCircle size={14} className="opacity-70" />
                            <span>{questionsCount || 40} savol</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="opacity-70" />
                            <span>{duration || 60} daqiqada</span>
                        </div>
                    </div>

                    {/* Urinishlar ko'rsatkichi */}
                    {isAssignment && (
                        <div className="mt-3 flex flex-col gap-1">
                            <div className={`text-[11px] font-bold uppercase tracking-wider ${attemptsCount >= maxAttempts ? 'text-red-400' : 'text-blue-400'}`}>
                                Urinishlar: {attemptsCount} / {maxAttempts}
                            </div>
                            {endDate && (
                                <div className="text-[11px] font-medium text-red-400 opacity-90 flex items-center gap-1.5">
                                    <Clock size={12} />
                                    Deadline: {new Date(endDate).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Action */}
                <div className="mt-6">
                    {isCompleted && !isPremium ? (
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

                    <div className="flex gap-2">
                        {isPremium ? (
                            <motion.button
                                onClick={onUpgradeClick}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
                            >
                                <Crown size={16} />
                                Premiumga o'tish
                            </motion.button>
                        ) : (
                            <>
                                {isCompleted && (
                                    <motion.button
                                        onClick={() => onReview(test)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors flex items-center justify-center"
                                    >
                                        Tahlil
                                    </motion.button>
                                )}

                                {canStart ? (
                                    <motion.button
                                        onClick={() => onStart(test)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex-1 py-3.5 rounded-xl ${theme.button} text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2`}
                                    >
                                        {isCompleted ? 'Qayta' : (hasDraft ? 'Davom' : 'Boshlash')}
                                        {!isCompleted && <Play size={16} fill="currentColor" />}
                                    </motion.button>
                                ) : (
                                    <div className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/5 text-gray-500 font-semibold text-xs transition-colors flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-center">
                                        {isCompleted && !canRetake ? "Tugallangan" : (isExpired ? "Muddati o'tgan" : (isUpcoming ? "Kutilmoqda" : "Urinishlar tugagan"))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function TestGrid({ loading, tests, onStartTest, onSelectSet, onReview, onUpgradeClick, errorMsg }) {
    const { userData } = useAuth();
    const isIndividualUser = !userData?.groupId;

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
                // Individual foydalanuvchilar uchun dastlabki 2 ta test bepul, qolganlari premium
                const isPremium = isIndividualUser && index >= 2;

                if (test.isMock) {
                    return (
                        <motion.div variants={itemVariants} key={index} className="h-full">
                            <ShineBorder
                                borderRadius={28}
                                borderWidth={1}
                                duration={10}
                                color={["#FFD700", "#FFA040", "#FFFDE7", "#FFC107"]}
                                className="relative overflow-hidden bg-[#0A0A0A] text-white p-8 shadow-2xl group h-full flex flex-col justify-between min-h-[300px] border border-white/5"
                            >
                                {/* Background Decorative Elements */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-[100px] transition-opacity duration-700 opacity-20 group-hover:opacity-40" />
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-600/5 rounded-full blur-[100px] transition-opacity duration-700 opacity-20 group-hover:opacity-40" />
                                <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500"><Check className="w-48 h-48" /></div>
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    {/* Status Section */}
                                    <div className="flex flex-col items-start gap-2.5 mb-8">
                                        <div className="px-3 py-1.5 bg-white/[0.03] backdrop-blur-md text-white/50 text-[10px] font-black rounded-lg uppercase tracking-[0.2em] border border-white/5 inline-flex items-center">
                                            Mock Exam
                                        </div>
                                        {isPremium && (
                                            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] shadow-xl shadow-yellow-500/10">
                                                <Crown size={12} fill="currentColor" />
                                                Premium
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Content Section */}
                                    <div className="mb-auto">
                                        <h3 className="text-[28px] font-black leading-[1.1] mb-2.5 tracking-tight text-white drop-shadow-sm">
                                            Full IELTS Mock
                                        </h3>
                                        <p className="text-gray-400 text-sm font-bold opacity-60 tracking-wide">
                                            Listening • Reading • Writing
                                        </p>
                                    </div>
                                    
                                    {/* Action Section */}
                                    <div className="mt-10">
                                        <button
                                            onClick={() => isPremium ? onUpgradeClick() : (test.status === 'completed' ? onReview(test) : onStartTest(test))}
                                            className={`w-full h-[54px] ${isPremium 
                                                ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-1' 
                                                : 'bg-white text-black hover:bg-gray-100'} 
                                                rounded-2xl font-bold text-[13px] transition-all duration-500 flex items-center justify-center gap-3 px-8 uppercase tracking-wider`}
                                        >
                                            {isPremium ? (
                                                <div className="flex items-center justify-center gap-2.5 w-full">
                                                    <Crown size={16} fill="currentColor" className="shrink-0" />
                                                    <span>Planni Yangilang</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 w-full">
                                                    <span>{test.status === 'completed' ? "Natijani Ko'rish" : "Imtihonni Boshlash"}</span>
                                                    {test.status !== 'completed' && <Play size={16} fill="currentColor" />}
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </ShineBorder>
                        </motion.div>
                    );
                }

                if (test.isSet) {
                    return (
                        <motion.div 
                            variants={itemVariants} 
                            key={test.id || index} 
                            onClick={() => isPremium ? onUpgradeClick() : onSelectSet(test)} 
                            className="group bg-[#181210] rounded-[28px] p-6 border border-white/5 hover:border-blue-500/30 transition cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-6 -mt-6 transition group-hover:bg-blue-500/20"></div>
                            {isPremium && (
                                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/20">
                                    <Crown size={12} />
                                </div>
                            )}
                            <div>
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <h3 className={`text-xl font-bold text-white mb-2 ${isPremium ? 'opacity-60' : ''}`}>{test.title}</h3>
                                {!isPremium && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${(test.completedTests / test.totalTests) * 100}%` }}></div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">{test.completedTests}/{test.totalTests}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex justify-between items-center text-blue-400 text-xs font-bold uppercase tracking-wider">
                                <span>{isPremium ? "Premium To'plam" : "To'plamni Ochish"}</span>
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
                        isPremium={isPremium}
                        onUpgradeClick={onUpgradeClick}
                    />
                );
            })}
        </motion.div>
    );
}