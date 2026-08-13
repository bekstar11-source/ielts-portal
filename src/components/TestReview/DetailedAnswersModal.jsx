import React, { useState, useMemo } from 'react';
import { X, Search, CheckCircle2, XCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkAnswer, isMultiAnswerType, scoreMultiAnswer, evaluateTest, calculateBandScore, isChoiceQuestionType, getAnswerKey, getMultiSelectCount, getQuestionWeight, resolveOptionDisplay } from '../../utils/ieltsScoring';
import { useTranslation } from '../../context/LanguageContext';

export default function DetailedAnswersModal({
    isOpen,
    onClose,
    testData,
    userAnswers = {},
    score,
    bandScore,
    onJumpToQuestion
}) {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'correct' | 'mistake'

    const questionsList = useMemo(() => {
        if (!testData) return [];
        
        const list = [];
        const scoredIds = new Set();

        const walk = (obj, parentType, currentOptions = null) => {
            if (!obj) return;
            const currentType = obj.type || parentType;
            const options = obj.options || currentOptions;
            // `options` bo'lgan guruh variant-tanlash guruhi hisoblanadi (map_labeling,
            // options'li flow_chart) — evaluateTest ham aynan shu qoidaga tayanadi.
            const hasOptions = Array.isArray(options) && options.length > 0;

            // MULTI-ANSWER GURUHI: butun guruh bir marta baholanadi.
            // Ilgari har bir savol alohida tekshirilardi, lekin SelectionBox javoblarni
            // alifbo tartibida slotlarga yozadi — shuning uchun to'g'ri tanlangan javoblar
            // ham modalda "xato" bo'lib ko'rinardi (ball esa to'g'ri berilgan edi).
            if (isMultiAnswerType(obj.type) && !obj.id) {
                const groupItems = [];
                const collectItems = (o) => {
                    if (!o || typeof o !== 'object') return;
                    if (o.id && getAnswerKey(o) !== undefined) groupItems.push(o);
                    ['questions', 'items', 'rows', 'groups', 'cells', 'content', 'parts'].forEach(sk => {
                        if (o[sk] && Array.isArray(o[sk])) o[sk].forEach(collectItems);
                        else if (o[sk] && typeof o[sk] === 'object') collectItems(o[sk]);
                    });
                };
                collectItems(obj);

                if (groupItems.length > 0) {
                    const allCorrect = groupItems.map(i => getAnswerKey(i)).join(', ');
                    const allUser = groupItems.map(i => userAnswers[String(i.id)] || "").join(', ');
                    let weight = getMultiSelectCount(currentType);
                    if (!weight) {
                        weight = groupItems.reduce((sum, i) => sum + getQuestionWeight(i.id), 0) || groupItems.length;
                    }
                    const scoreRes = scoreMultiAnswer(allCorrect, allUser, weight);
                    const ids = groupItems.map(i => i.id);

                    list.push({
                        id: ids.join(', '),
                        qNumber: ids.join(', '),
                        correctAnswer: allCorrect,
                        userAnswer: allUser.replace(/(^|,\s*)(?=,|$)/g, '').trim(),
                        type: currentType || 'selection',
                        questionText: obj.questionText || obj.question || obj.title || '',
                        passageId: obj.passageId || '',
                        isCorrect: scoreRes.matches === scoreRes.weight,
                        partialText: (scoreRes.matches > 0 && scoreRes.matches < scoreRes.weight)
                            ? `${scoreRes.matches}/${scoreRes.weight}` : null,
                        passageTitle: testData.passages?.find(p => String(p.id) === String(obj.passageId))?.title || ''
                    });

                    groupItems.forEach(i => scoredIds.add(String(i.id)));
                    return; // guruh ichiga qayta kirmaymiz
                }
            }

            const answer = getAnswerKey(obj);
            if (obj.id && answer !== undefined) {
                const idStr = String(obj.id);
                if (!scoredIds.has(idStr)) {
                    scoredIds.add(idStr);

                    // Determine correctness
                    const uAns = userAnswers[idStr] || userAnswers[obj.id] || "";
                    const isMulti = isMultiAnswerType(currentType) || idStr.includes('-') || idStr.includes(',');
                    let isCorrect = false;
                    let partialText = null;

                    if (isMulti) {
                        const weight = getMultiSelectCount(currentType) || getQuestionWeight(idStr);

                        const scoreRes = scoreMultiAnswer(answer, uAns, weight);
                        isCorrect = scoreRes.matches === scoreRes.weight;
                        if (scoreRes.matches > 0 && scoreRes.matches < scoreRes.weight) {
                            partialText = `${scoreRes.matches}/${scoreRes.weight}`;
                        }
                    } else {
                        isCorrect = checkAnswer(answer, uAns, isChoiceQuestionType(currentType) || hasOptions, hasOptions ? options : null);
                    }

                    // Resolve answer and user answer from letter to full text if matching
                    let displayCorrectAnswer = answer;
                    let displayUserAnswer = uAns;
                    const isMatchingType = currentType && String(currentType).toLowerCase().includes('matching') && !String(currentType).toLowerCase().includes('headings');

                    // "Choose from the list" (summary/note/flow completion) turlarida talaba
                    // ro'yxatdan SO'Z tanlaydi, kalit esa "B" harfi bo'lishi mumkin — ikkalasini
                    // ham so'z ko'rinishida ko'rsatamiz, aks holda javob ABCD harfi bo'lib chiqardi.
                    if (hasOptions && !isChoiceQuestionType(currentType)) {
                        displayCorrectAnswer = resolveOptionDisplay(answer, options) || answer;
                        displayUserAnswer = resolveOptionDisplay(uAns, options) || uAns;
                    }

                    if (isMatchingType && options && options.length > 0) {
                        const resolveText = (val) => {
                            if (!val) return "";
                            const valList = String(val).split(/[\/|,]/).map(a => a.trim()).filter(Boolean);
                            return valList.map(v => {
                                const foundIdx = options.findIndex((o, idx) => {
                                    const l = (o.label || String.fromCharCode(65 + idx));
                                    return String(l).trim().toLowerCase() === String(v).trim().toLowerCase();
                                });
                                if (foundIdx !== -1) {
                                    const opt = options[foundIdx];
                                    const optText = opt.text || opt.label || opt.content || (typeof opt === 'string' ? opt : "");
                                    const textStr = String(optText).trim();
                                    return textStr.replace(/^\s*[A-Z][\.\)\-]\s+/, '').trim() || textStr;
                                }
                                return v;
                            }).join(' / ');
                        };

                        if (answer) displayCorrectAnswer = resolveText(answer);
                        if (uAns) displayUserAnswer = resolveText(uAns);
                    }

                    list.push({
                        id: obj.id,
                        qNumber: parseInt(obj.id) || obj.id,
                        correctAnswer: displayCorrectAnswer,
                        userAnswer: displayUserAnswer,
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
                    val.forEach(child => walk(child, currentType, options));
                } else if (val && typeof val === 'object') {
                    walk(val, currentType, options);
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

    const { computedScore, computedTotal } = useMemo(() => {
        if (!testData || !userAnswers) return { computedScore: 0, computedTotal: 0 };
        const res = evaluateTest(testData, userAnswers);
        return {
            computedScore: res.correctCount,
            computedTotal: res.totalQ
        };
    }, [testData, userAnswers]);

    // MUHIM: ball va umumiy savol soni HAR DOIM bir manbadan olinadi.
    // Ilgari ball serverdan, total esa shu yerdagi hisobdan olinardi — ikkalasi farq qilsa
    // "35/38" kabi noto'g'ri nisbat va xato soni chiqardi.
    const scoreNum = score !== undefined && score !== null ? Number(score) : NaN;
    const hasComputed = computedTotal > 0;
    const displayScore = hasComputed ? computedScore : (!isNaN(scoreNum) ? scoreNum : 0);
    const displayTotal = hasComputed ? computedTotal : (questionsList.length || 40);

    const bandScoreNum = bandScore !== undefined && bandScore !== null ? Number(bandScore) : NaN;
    const displayBandScore = useMemo(() => {
        const calculated = calculateBandScore(displayScore, testData?.type, displayTotal);
        if (calculated !== null && calculated !== undefined && calculated > 0) {
            return calculated;
        }
        if (!isNaN(bandScoreNum) && bandScoreNum > 0) {
            return bandScoreNum;
        }
        return 0;
    }, [bandScoreNum, displayScore, testData?.type, displayTotal]);

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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-150 dark:border-zinc-800 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden font-sans"
                >
                    {/* Header */}
                    <div className="px-5 py-3 md:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-[20px]">analytics</span>
                            </div>
                            <div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                                    {t('testSolving.detailedAnswersTitle') || 'Javoblar Tahlili'}
                                </h3>
                                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 font-medium">
                                    {testData?.title || 'Practice Test'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-550 dark:text-zinc-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="px-5 py-2.5 md:px-6 bg-zinc-50/20 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-850 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                {t('testSolving.answers') || 'Javoblar'}
                            </span>
                            <span className="text-base font-black text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {displayScore} / {displayTotal}
                            </span>
                        </div>
                        
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100/60 dark:border-emerald-900/30 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                                {t('testSolving.correct') || 'To\'g\'ri'}
                            </span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {displayScore}
                            </span>
                        </div>

                        <div className="bg-rose-50/40 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100/60 dark:border-rose-900/30 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-rose-500 dark:text-rose-455 uppercase tracking-wider">
                                {t('testSolving.mistake') || 'Xato'}
                            </span>
                            <span className="text-base font-black text-rose-500 dark:text-rose-400 mt-0.5">
                                {Math.max(0, displayTotal - displayScore)}
                            </span>
                        </div>

                        <div className="bg-blue-50/40 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100/60 dark:border-blue-900/30 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-blue-500 dark:text-blue-455 uppercase tracking-wider">
                                {t('testSolving.bandScore') || 'Band Score'}
                            </span>
                            <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                                {displayBandScore ? Number(displayBandScore).toFixed(1) : '0.0'}
                            </span>
                        </div>
                    </div>

                    {/* Toolbar (Search & Filter) */}
                    <div className="px-5 py-2.5 md:px-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-3 bg-zinc-50/10">
                        {/* Search Input */}
                        <div className="relative w-full sm:flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                                placeholder={t('myResults.searchPlaceholder') || 'Qidirish...'}
                            />
                        </div>

                        {/* Status Filters */}
                        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                            {[
                                { id: 'all', label: t('myResults.categories.all') || 'Barchasi' },
                                { id: 'correct', label: t('testSolving.correct') || 'To\'g\'ri' },
                                { id: 'mistake', label: t('testSolving.mistake') || 'Xatolar' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterStatus(f.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                                        filterStatus === f.id 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm' 
                                        : 'bg-white dark:bg-zinc-950 text-zinc-550 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Questions Table/List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {filteredQuestions.length > 0 ? (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {/* Table Header - Hidden on mobile */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 bg-zinc-50/50 dark:bg-zinc-950/10 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                                    <div className="col-span-1">{t('testSolving.questionNum') || 'Savol'}</div>
                                    <div className="col-span-3">{t('testSolving.questionType') || 'Savol Turi'}</div>
                                    <div className="col-span-3">{t('testSolving.yourAnswer') || 'Sizning javobingiz'}</div>
                                    <div className="col-span-3">{t('testSolving.correctAnswer') || 'To\'g\'ri javob'}</div>
                                    <div className="col-span-2 text-right">{t('testSolving.status') || 'Holati'}</div>
                                </div>

                                {/* Table Body */}
                                {filteredQuestions.map((q) => {
                                    return (
                                        <div 
                                            key={q.id}
                                            className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 md:px-8 py-4 items-center hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors"
                                        >
                                            {/* Question Number */}
                                            <div className="col-span-1 flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                                                    q.isCorrect 
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                                }`}>
                                                    {q.qNumber}
                                                </div>
                                                <span className="md:hidden text-xs font-bold text-zinc-400">
                                                    Part {q.passageTitle ? q.passageTitle : (parseInt(q.passageId) || q.passageId || '1')}
                                                </span>
                                            </div>

                                            {/* Question Type */}
                                            <div className="col-span-3 flex flex-col">
                                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                                                    {q.type.replace(/_/g, ' ').replace(/-/g, ' ')}
                                                </span>
                                                {q.passageTitle && (
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-[200px]">
                                                        {q.passageTitle}
                                                    </span>
                                                )}
                                            </div>

                                            {/* User Answer */}
                                            <div className="col-span-3 flex flex-col">
                                                <span className="md:hidden text-[10px] text-zinc-400 uppercase font-black tracking-wider mb-0.5">
                                                    {t('testSolving.yourAnswer') || 'Sizning javobingiz'}
                                                </span>
                                                <span className={`text-xs font-bold break-all ${
                                                    q.isCorrect 
                                                        ? 'text-emerald-700 dark:text-emerald-400' 
                                                        : q.userAnswer 
                                                            ? 'text-rose-700 dark:text-rose-400' 
                                                            : 'text-zinc-400 italic'
                                                }`}>
                                                    {q.userAnswer || `(${t('testSolving.noAnswer') || 'Javob berilmagan'})`}
                                                </span>
                                            </div>

                                            {/* Correct Answer */}
                                            <div className="col-span-3 flex flex-col">
                                                <span className="md:hidden text-[10px] text-zinc-400 uppercase font-black tracking-wider mb-0.5">
                                                    {t('testSolving.correctAnswer') || 'To\'g\'ri javob'}
                                                </span>
                                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 break-all bg-zinc-50 dark:bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-150/40 dark:border-zinc-800/40 w-fit md:w-full">
                                                    {q.correctAnswer}
                                                </span>
                                            </div>

                                            {/* Status and Action */}
                                            <div className="col-span-2 flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0">
                                                {/* Status Badge */}
                                                <div className="flex items-center gap-1.5">
                                                    {q.isCorrect ? (
                                                        <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 uppercase tracking-wide">
                                                            <CheckCircle2 size={14} className="stroke-[2.5]" />
                                                            {t('testSolving.correct') || 'To\'g\'ri'}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[11px] font-black text-rose-600 uppercase tracking-wide">
                                                            <XCircle size={14} className="stroke-[2.5]" />
                                                            {q.partialText ? `${q.partialText}` : (t('testSolving.mistake') || 'Xato')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Go to question button (only if onJumpToQuestion is provided) */}
                                                {onJumpToQuestion && (
                                                    <button
                                                        onClick={() => {
                                                            onJumpToQuestion(q);
                                                            onClose();
                                                        }}
                                                        className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-850 flex items-center gap-1 border border-blue-200/50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all"
                                                        title={t('testSolving.jumpToQuestion') || 'Savolga o\'tish'}
                                                    >
                                                        <span className="hidden sm:inline">
                                                            {t('testSolving.jumpToQuestion') || 'O\'tish'}
                                                        </span>
                                                        <ArrowRight size={12} className="stroke-[2.5]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <AlertCircle size={32} className="text-zinc-300 dark:text-zinc-650 mb-3" />
                                <p className="text-zinc-550 dark:text-zinc-400 text-sm font-medium">
                                    {t('myResults.noResults') || 'Hech narsa topilmadi'}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
