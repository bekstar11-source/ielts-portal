import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, AlertCircle, Lock, Zap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { checkAnswer, isMultiAnswerType, scoreMultiAnswer } from '../../utils/ieltsScoring';
import { useTranslation } from '../../context/LanguageContext';

export default function PremiumLockedReview({
    testData,
    userAnswers = {},
    score = 0,
    bandScore = 0
}) {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'correct' | 'mistake'

    const questionsList = useMemo(() => {
        if (!testData) return [];
        
        const list = [];
        const scoredIds = new Set();

        const walk = (obj, parentType) => {
            if (!obj) return;
            const currentType = obj.type || parentType;

            const answer = obj.answer || obj.correct_answer || obj.correctAnswer || obj.correct_answer_value;
            if (obj.id && answer) {
                const idStr = String(obj.id);
                if (!scoredIds.has(idStr)) {
                    scoredIds.add(idStr);

                    // Determine correctness
                    const uAns = userAnswers[idStr] || userAnswers[obj.id] || "";
                    const isMulti = isMultiAnswerType(currentType);
                    let isCorrect = false;
                    let partialText = null;

                    if (isMulti) {
                        let weight = 1;
                        const tLower = String(currentType).toLowerCase();
                        if (tLower.includes('two') || tLower.includes('pick two')) weight = 2;
                        else if (tLower.includes('three') || tLower.includes('pick three')) weight = 3;
                        else if (tLower.includes('four') || tLower.includes('pick four')) weight = 4;
                        else if (tLower.includes('five') || tLower.includes('pick five')) weight = 5;

                        const scoreRes = scoreMultiAnswer(answer, uAns, weight);
                        isCorrect = scoreRes.matches === scoreRes.weight;
                        if (scoreRes.matches > 0 && scoreRes.matches < scoreRes.weight) {
                            partialText = `${scoreRes.matches}/${scoreRes.weight}`;
                        }
                    } else {
                        isCorrect = checkAnswer(answer, uAns);
                    }

                    list.push({
                        id: obj.id,
                        qNumber: parseInt(obj.id) || obj.id,
                        correctAnswer: answer,
                        userAnswer: uAns,
                        type: currentType || 'input',
                        questionText: obj.questionText || obj.question || obj.title || obj.label || '',
                        passageId: obj.passageId || '',
                        isCorrect,
                        partialText,
                        passageTitle: testData.passages?.find(p => String(p.id) === String(obj.passageId))?.title || ''
                    });
                }
            }

            const CONTAINER_KEYS = ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'];
            for (const key of CONTAINER_KEYS) {
                const val = obj[key];
                if (val && Array.isArray(val)) {
                    val.forEach(child => walk(child, currentType));
                } else if (val && typeof val === 'object') {
                    walk(val, currentType);
                }
            }
        };

        walk(testData);

        // Fallbacks if testData top-level questions exist
        if (testData.questions && list.length === 0) {
            testData.questions.forEach(q => walk(q, q.type));
        }

        // Sort by question number (if numeric)
        return list.sort((a, b) => {
            const aNum = parseInt(a.id);
            const bNum = parseInt(b.id);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return String(a.id).localeCompare(String(b.id));
        });
    }, [testData, userAnswers]);

    const filteredQuestions = useMemo(() => {
        return questionsList.filter(q => {
            const matchesSearch = String(q.qNumber).includes(searchTerm) || 
                                 q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 q.type.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (filterStatus === 'correct') return matchesSearch && q.isCorrect;
            if (filterStatus === 'mistake') return matchesSearch && !q.isCorrect;
            return matchesSearch;
        });
    }, [questionsList, searchTerm, filterStatus]);

    const stats = useMemo(() => {
        const total = questionsList.length;
        const correct = score;
        const mistakes = Math.max(0, total - correct);
        return { total, correct, mistakes };
    }, [questionsList, score]);

    return (
        <div className="w-full min-h-screen bg-[#f8f9fa] dark:bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 font-sans pb-24">
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* PREMIUM PROMO CARD */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative rounded-3xl overflow-hidden shadow-xl border border-indigo-100/50 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                >
                    {/* Glowing background shapes */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                    
                    {/* Upper gradient line decoration */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500" />
                    
                    <div className="p-6 sm:p-10 relative z-10">
                        {/* Title and Lock Icon */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30">
                                    <Lock size={12} className="stroke-[2.5]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mistake Review (Locked)</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    Premium orqali xatolaringiz ustida batafsil ishlang!
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
                                    Free plan foydalanuvchisi sifatida siz faqat javoblar ro'yxatini ko'ra olasiz. Xatolarni interaktiv tahlil qilish premium obunachilar uchun mavjud.
                                </p>
                            </div>
                            
                            <div className="shrink-0 flex items-center">
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
                                    className="relative group overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-650 to-blue-600 hover:from-violet-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold text-sm tracking-wide px-8 py-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
                                >
                                    <Zap size={16} fill="currentColor" className="text-yellow-300 animate-pulse" />
                                    <span>Premiumga o'tish</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* What's in Detailed Mistake Review */}
                        <div className="mt-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6">
                                BATAFSIL TAHLILDA NIMALAR MAVJUD?
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                {/* Benefit 1 */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-100/30">
                                        <span className="material-symbols-outlined text-[20px]">map</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                                            Savol joylashgan matn qismi (Interactive Mapping)
                                        </h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                            Har bir xato javob ustiga bosib, matndagi javob yashiringan joy va kalit so'zlarga darhol boring.
                                        </p>
                                    </div>
                                </div>

                                {/* Benefit 2 */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/30">
                                        <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                                            Audio transkript va sinxronizatsiya
                                        </h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                            Listening savollarida javob qismini transkriptda ko'ring va audioni aynan o'sha soniyadan boshlab tinglang.
                                        </p>
                                    </div>
                                </div>

                                {/* Benefit 3 */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100/30">
                                        <span className="material-symbols-outlined text-[20px]">translate</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                                            Mukammal ikki tildagi izohlar
                                        </h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                            Nega aynan shu javob to'g'riligini tushuntiruvchi izohlarni o'zbek va ingliz tillarida o'qing.
                                        </p>
                                    </div>
                                </div>

                                {/* Benefit 4 */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100/30">
                                        <span className="material-symbols-outlined text-[20px]">psychology</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                                            AI orqali Writing va Speaking tahlili
                                        </h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                            Insho va gapirish javoblaringiz uchun sun'iy intellektdan batafsil ballar va xatolar ustida tavsiyalarni oling.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>

                {/* QUICK STATS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-zinc-50/80 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 p-5 rounded-2xl flex flex-col shadow-sm">
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                            JAVOBLAR
                        </span>
                        <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200 mt-1">
                            {stats.correct} / {stats.total}
                        </span>
                    </div>

                    <div className="bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-5 rounded-2xl flex flex-col shadow-sm">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
                            TO'G'RI
                        </span>
                        <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                            {stats.correct}
                        </span>
                    </div>

                    <div className="bg-rose-50/30 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 p-5 rounded-2xl flex flex-col shadow-sm">
                        <span className="text-[10px] font-black text-rose-500 dark:text-rose-450 uppercase tracking-widest">
                            XATO
                        </span>
                        <span className="text-2xl font-black text-rose-600 dark:text-rose-450 mt-1">
                            {stats.mistakes}
                        </span>
                    </div>

                    <div className="bg-blue-50/30 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 p-5 rounded-2xl flex flex-col shadow-sm">
                        <span className="text-[10px] font-black text-blue-500 dark:text-blue-455 uppercase tracking-widest">
                            BAND SCORE
                        </span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                            {bandScore ? Number(bandScore).toFixed(1) : '0.0'}
                        </span>
                    </div>
                </div>

                {/* ANSWERS LIST SECTION */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-150/40 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Header bar */}
                    <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                            Javoblar ro'yxati
                        </h3>
                        
                        {/* Filters & Search */}
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {/* Search */}
                            <div className="relative w-full sm:w-60">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-[#f4f4f7] dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/25 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                                    placeholder="Qidirish..."
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                                {[
                                    { id: 'all', label: 'Barchasi' },
                                    { id: 'correct', label: "To'g'ri" },
                                    { id: 'mistake', label: 'Xatolar' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFilterStatus(f.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                            filterStatus === f.id 
                                            ? 'bg-gray-900 border-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900' 
                                            : 'bg-white dark:bg-zinc-950 text-gray-550 dark:text-zinc-400 border-zinc-205 dark:border-zinc-800 hover:bg-gray-50'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table of answers */}
                    <div className="overflow-x-auto">
                        {filteredQuestions.length > 0 ? (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-805 min-w-[600px] md:min-w-0">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-8 py-3.5 bg-gray-50/50 dark:bg-zinc-950/10 text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                                    <div className="col-span-1 flex justify-center">Savol</div>
                                    <div className="col-span-3">Savol Turi</div>
                                    <div className="col-span-3">Sizning javobingiz</div>
                                    <div className="col-span-3">To'g'ri javob</div>
                                    <div className="col-span-2 text-right">Holati</div>
                                </div>

                                {/* Table Rows */}
                                {filteredQuestions.map((q) => (
                                    <div 
                                        key={q.id}
                                        className="grid grid-cols-12 gap-4 px-8 py-4 items-center border-b border-zinc-100/60 dark:border-zinc-800/60 hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors"
                                    >
                                        {/* Q Number */}
                                        <div className="col-span-1 flex justify-center">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border ${
                                                q.isCorrect 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30'
                                            }`}>
                                                {q.qNumber}
                                            </div>
                                        </div>

                                        {/* Question Type */}
                                        <div className="col-span-3 flex flex-col">
                                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                                                {q.type.replace(/_/g, ' ').replace(/-/g, ' ')}
                                            </span>
                                            {q.passageTitle && (
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate max-w-[200px] mt-0.5">
                                                    {q.passageTitle}
                                                </span>
                                            )}
                                        </div>

                                        {/* User Answer */}
                                        <div className="col-span-3">
                                            {q.userAnswer ? (
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                    q.isCorrect 
                                                        ? 'bg-emerald-50/40 text-emerald-700 border-emerald-100/50 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/20' 
                                                        : 'bg-rose-50/40 text-rose-700 border-rose-100/50 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-900/20'
                                                }`}>
                                                    {q.userAnswer}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-zinc-400 dark:text-zinc-550 italic font-semibold">
                                                    (Javob berilmagan)
                                                </span>
                                            )}
                                        </div>

                                        {/* Correct Answer */}
                                        <div className="col-span-3">
                                            <span className="inline-block px-3 py-1 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-250 rounded-lg text-xs font-bold border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm w-fit max-w-full truncate">
                                                {q.correctAnswer}
                                            </span>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="col-span-2 flex items-center justify-end">
                                            {q.isCorrect ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50">
                                                    <CheckCircle2 size={12} className="stroke-[2.5]" />
                                                    To'g'ri
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/80 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 text-[10px] font-black uppercase tracking-wider border border-rose-100/50">
                                                    <XCircle size={12} className="stroke-[2.5]" />
                                                    {q.partialText ? `${q.partialText}` : 'Xato'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <AlertCircle size={36} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">
                                    Hech narsa topilmadi
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
