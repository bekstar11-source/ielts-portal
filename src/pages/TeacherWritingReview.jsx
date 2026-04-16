import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/firebase';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    collection, doc, getDoc, getDocs, query,
    where, updateDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/firebase';
import { 
    NotePencil as PenLine, 
    CheckCircle, 
    Clock, 
    CaretDown as ChevronDown, 
    MagnifyingGlass as Search, 
    User,
    Calendar,
    TextT,
    TrendUp,
    PaperPlaneTilt as SendIcon,
    ArrowLeft,
    Check
} from '@phosphor-icons/react';

export default function TeacherWritingReview() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const location = useLocation();

    const [writings, setWritings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState(location.state?.selectedId || null); 
    const [feedbackData, setFeedbackData] = useState({});
    const [saving, setSaving] = useState(false);
    const [students, setStudents] = useState([]);
    const [isCheckingAI, setIsCheckingAI] = useState(false);

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let writingResults = [];
            let allStudents = [];

            if (userData?.role === 'admin') {
                // Admin sees everything
                const resultsSnap = await getDocs(query(collection(db, 'results'), where('type', '==', 'writing')));
                const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Get unique user IDs from results
                const userIds = [...new Set(results.map(r => r.userId))];
                if (userIds.length > 0) {
                    const userChunks = [];
                    for (let i = 0; i < userIds.length; i += 10) userChunks.push(userIds.slice(i, i + 10));
                    for (const chunk of userChunks) {
                        const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
                        const snap = await getDocs(q);
                        allStudents.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                }
                writingResults = results;
            } else {
                // Teacher sees assigned groups
                const groupIds = userData?.assignedGroupIds || [];
                if (!groupIds.length) { setLoading(false); return; }

                const groupDocs = await Promise.all(groupIds.map(id => getDoc(doc(db, 'groups', id))));
                const groups = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
                const allStudentIds = [...new Set(groups.flatMap(g => g.studentIds || []))];

                if (!allStudentIds.length) { setLoading(false); return; }

                const studentChunks = [];
                for (let i = 0; i < allStudentIds.length; i += 10) studentChunks.push(allStudentIds.slice(i, i + 10));
                for (const chunk of studentChunks) {
                    const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
                    const snap = await getDocs(q);
                    allStudents.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    
                    const rq = query(collection(db, 'results'), where('userId', 'in', chunk), where('type', '==', 'writing'));
                    const rsnap = await getDocs(rq);
                    writingResults.push(...rsnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            }

            setStudents(allStudents);
            const sortedResults = writingResults.sort((a, b) => {
                const da = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : 0;
                const db = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : 0;
                return db - da;
            });
            setWritings(sortedResults);
            
            if (window.innerWidth > 1024 && sortedResults.length > 0) {
                const firstPending = sortedResults.find(w => !w.writingBand);
                setSelectedId(firstPending?.id || sortedResults[0].id);
            }
        } catch (e) {
            console.error("Error in WritingReview:", e);
        } finally {
            setLoading(false);
        }
    };

    const getStudentName = (userId) => {
        return students.find(s => s.id === userId)?.fullName || 'O\'quvchi';
    };

    const handleSaveFeedback = async (resultId) => {
        const data = feedbackData[resultId] || {};
        if (!data.task1Band || !data.task2Band) return alert("Task 1 va Task 2 bandlarini kiriting!");
        
        const t1 = parseFloat(data.task1Band);
        const t2 = parseFloat(data.task2Band);
        const raw = (t1 + 2 * t2) / 3;
        
        let overall = Math.floor(raw);
        const rem = raw - overall;
        if (rem >= 0.75) overall += 1;
        else if (rem >= 0.25) overall += 0.5;

        setSaving(true);
        try {
            await updateDoc(doc(db, 'results', resultId), {
                task1Band: t1,
                task2Band: t2,
                writingBand: overall,
                teacherFeedback: data.feedback || '',
                reviewedAt: new Date().toISOString(),
                reviewedByTeacher: userData?.uid
            });
            setWritings(prev => prev.map(w =>
                w.id === resultId
                    ? { ...w, task1Band: t1, task2Band: t2, writingBand: overall, teacherFeedback: data.feedback || '', reviewedAt: new Date().toISOString() }
                    : w
            ));
            alert("Saqlandi! ✅");
        } catch (e) {
            alert("Xato: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAICheck = async (resultId) => {
        setIsCheckingAI(true);
        try {
            const functions = getFunctions(app);
            const checkWriting = httpsCallable(functions, 'checkWriting');
            const response = await checkWriting({ resultId });
            
            const aiReview = response.data.aiReview;
            
            setFeedbackData(prev => ({
                ...prev,
                [resultId]: {
                    ...prev[resultId],
                    task1Band: aiReview.task1?.criteria?.overall?.band || "",
                    task2Band: aiReview.task2?.criteria?.overall?.band || "",
                    feedback: `Task 1: ${aiReview.task1?.criteria?.overall?.feedback || ""}\n\nTask 2: ${aiReview.task2?.criteria?.overall?.feedback || ""}`
                }
            }));

            setWritings(prev => prev.map(w =>
                w.id === resultId ? { ...w, aiReview } : w
            ));
            
            // Notification omitted, relying on UI change
        } catch (e) {
            alert("AI Error: " + e.message);
        } finally {
            setIsCheckingAI(false);
        }
    };

    const filtered = writings.filter(w => {
        const matchesFilter =
            filter === 'all' ? true :
            filter === 'pending' ? (!w.writingBand) :
            filter === 'reviewed' ? (!!w.writingBand) : true;

        const name = getStudentName(w.userId);
        return matchesFilter && (name.toLowerCase().includes(searchTerm.toLowerCase()) || (w.testTitle || '').toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const activeWriting = writings.find(w => w.id === selectedId);
    const fd = feedbackData[selectedId] || {};

    const calculateOverall = (t1, t2) => {
        if (!t1 || !t2) return "--";
        const raw = (parseFloat(t1) + 2 * parseFloat(t2)) / 3;
        let overall = Math.floor(raw);
        const rem = raw - overall;
        if (rem >= 0.75) overall += 1;
        else if (rem >= 0.25) overall += 0.5;
        return overall.toFixed(1);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold animate-pulse opacity-50">Ma'lumotlar yuklanmoqda...</p>
        </div>
    );

    return (
        <div className={`w-full h-full flex overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-[#F8F9FA]'}`}>
            
            {/* --- SIDEBAR --- */}
            <div className={`w-full lg:w-[320px] flex-shrink-0 flex flex-col border-r transition-all ${
                selectedId && 'hidden lg:flex'
            } ${isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-200 shadow-xl'}`}>
                
                {/* Sidebar Header */}
                <div className="p-4 lg:p-5 pb-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h1 className={`text-xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Submissions</h1>
                        <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase rounded-full border border-orange-100">
                            {writings.filter(w => !w.writingBand).length} Pending
                        </span>
                    </div>

                    {/* Filter Tabs */}
                    <div className={`flex p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100/80'}`}>
                        {['pending', 'reviewed', 'all'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 py-1.5 text-[11px] font-medium tracking-wide rounded-lg transition-all ${
                                    filter === f
                                        ? (isDark ? 'bg-[#333] text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm border border-gray-200/50')
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className={`flex items-center px-3 py-2 rounded-xl border transition-all ${
                        isDark ? 'bg-black/20 border-white/10 focus-within:border-gray-500' : 'bg-white border-gray-300 shadow-sm focus-within:border-gray-400'
                    }`}>
                        <Search size={14} className="text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Student or test title..."
                            className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-gray-200"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Sidebar List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-0 space-y-1.5">
                    {filtered.map((w) => {
                        const isSelected = selectedId === w.id;
                        const isReviewed = !!w.writingBand;
                        const initials = getStudentName(w.userId).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        
                        return (
                            <button
                                key={w.id}
                                onClick={() => setSelectedId(w.id)}
                                className={`w-full group text-left p-3 rounded-xl transition-all relative overflow-hidden flex items-center gap-3 ${
                                    isSelected 
                                        ? (isDark ? 'bg-[#333] text-white shadow-sm border border-white/10' : 'bg-[#FBFBFD] text-slate-900 shadow-sm border border-gray-200')
                                        : (isDark ? 'hover:bg-white/5 text-gray-400 border border-transparent' : 'hover:bg-gray-50 text-slate-600 border border-transparent')
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-full flex shrink-0 items-center justify-center font-medium text-xs relative transition-all ${
                                    isSelected ? (isDark ? 'bg-white/20' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-slate-700 shadow-inner') : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-slate-500')
                                }`}>
                                    {initials}
                                    {!isReviewed && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-gray-300'}`}>
                                        {getStudentName(w.userId)}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className={`text-[11px] truncate ${isSelected ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
                                            {w.testTitle || 'Untitled Test'}
                                        </p>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                                        <p className={`text-[10px] font-medium shrink-0 ${isSelected ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
                                            {w.date ? new Date(w.date?.seconds ? w.date.seconds * 1000 : w.date).toLocaleDateString() : 'No date'}
                                        </p>
                                    </div>
                                </div>
                                {isReviewed && (
                                    <div className={`text-sm font-bold shrink-0 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                        {w.writingBand}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- WORKSPACE --- */}
            <div className={`flex-1 flex flex-col h-full relative ${!selectedId && 'hidden lg:flex'}`}>
                {activeWriting ? (
                    <>
                        {/* Workspace Header */}
                        <div className={`px-4 py-3 lg:px-8 lg:py-3.5 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center justify-between border-b ${isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setSelectedId(null)}
                                    className="lg:hidden p-2 rounded-xl bg-gray-100 text-gray-600"
                                >
                                    <ArrowLeft size={16} weight="bold" />
                                </button>
                                
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full border border-gray-200 bg-[#FBFBFD] flex items-center justify-center text-slate-700 text-sm lg:text-base font-medium shadow-sm shrink-0">
                                        <User size={18} weight="regular" />
                                    </div>
                                    <div>
                                        <h2 className={`text-base lg:text-lg font-semibold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {getStudentName(activeWriting.userId)}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                            <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(activeWriting.date?.seconds ? activeWriting.date.seconds * 1000 : activeWriting.date).toLocaleDateString()}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-xs"><TextT size={11} /> {activeWriting.testTitle || 'General Training'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 ml-14 sm:ml-0">
                                {activeWriting && !activeWriting.writingBand && (
                                    <button 
                                        onClick={() => handleAICheck(selectedId)}
                                        disabled={isCheckingAI || activeWriting.aiReview}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shadow-sm flex gap-1.5 items-center border ${
                                            isCheckingAI ? 'bg-orange-50 text-orange-500 border-orange-200 cursor-wait' :
                                            activeWriting.aiReview ? 'bg-gray-50 text-gray-500 border-gray-200' :
                                            'bg-gradient-to-b from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white border-orange-600 shadow-sm'
                                        }`}
                                    >
                                        <span className="text-sm border-r border-white/20 pr-1.5">✨</span>
                                        {isCheckingAI ? "Checking..." : activeWriting.aiReview ? "AI Draft Ready" : "AI Draft"}
                                    </button>
                                )}
                                <div className={`px-2.5 py-1 rounded-md border ${isDark ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-gray-50 border-gray-200 text-slate-600 font-medium text-[11px]'}`}>
                                    Status: <span className={activeWriting.writingBand ? 'text-emerald-600 font-semibold ml-1' : 'text-orange-500 font-semibold ml-1'}>
                                        {activeWriting.writingBand ? 'Reviewed' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Workspace Content */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 space-y-6 lg:space-y-8 custom-scrollbar">
                            <div className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                                
                                {/* Task 1 Card */}
                                <div className={`rounded-2xl p-5 lg:p-6 border transition-all ${isDark ? 'bg-[#1F1F1F] border-white/5 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded bg-gray-100 text-slate-600 flex items-center justify-center font-bold text-xs">1</div>
                                            <h4 className={`text-base font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Task 1</h4>
                                        </div>
                                        <div className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100/50">
                                            {String(activeWriting.userAnswers?.task1 || activeWriting.task1 || activeWriting.writingAnswer || "").trim().split(/\s+/).filter(Boolean).length} words
                                        </div>
                                    </div>
                                    <div className={`text-sm lg:text-base leading-[1.8] font-serif whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        {activeWriting.userAnswers?.task1 || activeWriting.task1 || activeWriting.writingAnswer || (
                                            <span className="italic opacity-30">No submission for Task 1</span>
                                        )}
                                    </div>
                                    
                                    {/* AI Review Details Task 1 - APPLE DIZAYN (COMPACT) */}
                                    {activeWriting.aiReview && activeWriting.aiReview.task1 && (
                                        <div className="mt-6 pt-5 border-t border-dashed border-gray-200 dark:border-white/10">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                                    <span className="text-orange-500 text-[10px]">✨</span>
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs tracking-tight">AI Feedback</span>
                                            </div>

                                            {activeWriting.aiReview.task1.criteria && (
                                                <div className="mb-5 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-[#FBFBFD] dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-500">
                                                            <tr>
                                                                <th className="px-3 py-2 font-medium w-1/4">Criterion</th>
                                                                <th className="px-3 py-2 font-medium w-16">Band</th>
                                                                <th className="px-3 py-2 font-medium">Izoh (Feedback)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Task Achievement</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task1.criteria.taskAchievement?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task1.criteria.taskAchievement?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Coherence & Cohesion</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task1.criteria.coherence?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task1.criteria.coherence?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Lexical Resource</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task1.criteria.lexical?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task1.criteria.lexical?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Grammar Range</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task1.criteria.grammar?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task1.criteria.grammar?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr className="bg-gray-50 dark:bg-white/5">
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">OVERALL</td>
                                                                <td className="px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">{activeWriting.aiReview.task1.criteria.overall?.band || '-'}</td>
                                                                <td className="px-3 py-2 font-medium text-slate-800 dark:text-gray-200">{activeWriting.aiReview.task1.criteria.overall?.feedback || '-'}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            
                                            {activeWriting.aiReview.task1.grammarErrors?.length > 0 && (
                                                <div className="mb-3 flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Grammatika</span>
                                                    <div className="space-y-1.5">
                                                        {activeWriting.aiReview.task1.grammarErrors.map((err, idx) => (
                                                            <div key={idx} className="text-xs bg-[#FBFBFD] dark:bg-white/5 px-3 py-2.5 rounded-xl border border-gray-100/50 dark:border-white/5">
                                                                <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[12px]">
                                                                    <span className="line-through text-gray-400">{err.original}</span>
                                                                    <span className="text-gray-300 dark:text-gray-600 mx-0.5">→</span>
                                                                    <span className="text-orange-600 dark:text-orange-400 font-medium">{err.correction}</span>
                                                                </div>
                                                                <span className="text-[#86868B] dark:text-gray-400 text-[11px] leading-snug">{err.explanation}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {activeWriting.aiReview.task1.lexicalErrors?.length > 0 && (
                                                <div className="mb-2 flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Leksika</span>
                                                    <div className="space-y-1.5">
                                                        {activeWriting.aiReview.task1.lexicalErrors.map((err, idx) => (
                                                            <div key={idx} className="text-xs bg-[#FBFBFD] dark:bg-white/5 px-3 py-2.5 rounded-xl border border-gray-100/50 dark:border-white/5">
                                                                <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[12px]">
                                                                    <span className="line-through text-gray-400">{err.original}</span>
                                                                    <span className="text-gray-300 dark:text-gray-600 mx-0.5">→</span>
                                                                    <span className="text-orange-600 dark:text-orange-400 font-medium">{err.correction}</span>
                                                                </div>
                                                                <span className="text-[#86868B] dark:text-gray-400 text-[11px] leading-snug">{err.explanation}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {(!activeWriting.aiReview.task1.grammarErrors?.length && !activeWriting.aiReview.task1.lexicalErrors?.length) && (
                                                <p className="text-[11px] text-gray-500 font-medium mt-2 bg-[#FBFBFD] dark:bg-white/5 px-3 py-1.5 rounded-lg w-max">Xato topilmadi.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Task 2 Card */}
                                <div className={`rounded-2xl p-5 lg:p-6 border transition-all ${isDark ? 'bg-[#1F1F1F] border-white/5 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded bg-gray-100 text-slate-600 flex items-center justify-center font-bold text-xs">2</div>
                                            <h4 className={`text-base font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Task 2</h4>
                                        </div>
                                        <div className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100/50">
                                            {String(activeWriting.userAnswers?.task2 || activeWriting.task2 || "").trim().split(/\s+/).filter(Boolean).length} words
                                        </div>
                                    </div>
                                    <div className={`text-sm lg:text-base leading-[1.8] font-serif whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        {activeWriting.userAnswers?.task2 || activeWriting.task2 || (
                                            <span className="italic opacity-30">No submission for Task 2</span>
                                        )}
                                    </div>
                                    
                                    {/* AI Review Details Task 2 - APPLE DIZAYN (COMPACT) */}
                                    {activeWriting.aiReview && activeWriting.aiReview.task2 && (
                                        <div className="mt-6 pt-5 border-t border-dashed border-gray-200 dark:border-white/10">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                                    <span className="text-orange-500 text-[10px]">✨</span>
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs tracking-tight">AI Feedback</span>
                                            </div>

                                            {activeWriting.aiReview.task2.criteria && (
                                                <div className="mb-5 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-[#FBFBFD] dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-500">
                                                            <tr>
                                                                <th className="px-3 py-2 font-medium w-1/4">Criterion</th>
                                                                <th className="px-3 py-2 font-medium w-16">Band</th>
                                                                <th className="px-3 py-2 font-medium">Izoh (Feedback)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Task Response</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task2.criteria.taskAchievement?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task2.criteria.taskAchievement?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Coherence & Cohesion</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task2.criteria.coherence?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task2.criteria.coherence?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Lexical Resource</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task2.criteria.lexical?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task2.criteria.lexical?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">Grammar Range</td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{activeWriting.aiReview.task2.criteria.grammar?.band || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{activeWriting.aiReview.task2.criteria.grammar?.feedback || '-'}</td>
                                                            </tr>
                                                            <tr className="bg-gray-50 dark:bg-white/5">
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">OVERALL</td>
                                                                <td className="px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">{activeWriting.aiReview.task2.criteria.overall?.band || '-'}</td>
                                                                <td className="px-3 py-2 font-medium text-slate-800 dark:text-gray-200">{activeWriting.aiReview.task2.criteria.overall?.feedback || '-'}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            
                                            {activeWriting.aiReview.task2.grammarErrors?.length > 0 && (
                                                <div className="mb-3 flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Grammatika</span>
                                                    <div className="space-y-1.5">
                                                        {activeWriting.aiReview.task2.grammarErrors.map((err, idx) => (
                                                            <div key={idx} className="text-xs bg-[#FBFBFD] dark:bg-white/5 px-3 py-2.5 rounded-xl border border-gray-100/50 dark:border-white/5">
                                                                <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[12px]">
                                                                    <span className="line-through text-gray-400">{err.original}</span>
                                                                    <span className="text-gray-300 dark:text-gray-600 mx-0.5">→</span>
                                                                    <span className="text-orange-600 dark:text-orange-400 font-medium">{err.correction}</span>
                                                                </div>
                                                                <span className="text-[#86868B] dark:text-gray-400 text-[11px] leading-snug">{err.explanation}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {activeWriting.aiReview.task2.lexicalErrors?.length > 0 && (
                                                <div className="mb-2 flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Leksika</span>
                                                    <div className="space-y-1.5">
                                                        {activeWriting.aiReview.task2.lexicalErrors.map((err, idx) => (
                                                            <div key={idx} className="text-xs bg-[#FBFBFD] dark:bg-white/5 px-3 py-2.5 rounded-xl border border-gray-100/50 dark:border-white/5">
                                                                <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[12px]">
                                                                    <span className="line-through text-gray-400">{err.original}</span>
                                                                    <span className="text-gray-300 dark:text-gray-600 mx-0.5">→</span>
                                                                    <span className="text-orange-600 dark:text-orange-400 font-medium">{err.correction}</span>
                                                                </div>
                                                                <span className="text-[#86868B] dark:text-gray-400 text-[11px] leading-snug">{err.explanation}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {(!activeWriting.aiReview.task2.grammarErrors?.length && !activeWriting.aiReview.task2.lexicalErrors?.length) && (
                                                <p className="text-[11px] text-gray-500 font-medium mt-2 bg-[#FBFBFD] dark:bg-white/5 px-3 py-1.5 rounded-lg w-max">Xato topilmadi.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-16 shrink-0 pointer-events-none" />
                        </div>

                        {/* --- GRADING COMPONENT (MODERN TRAY) --- */}
                        <div className={`absolute bottom-0 left-0 right-0 px-3 pt-3 pb-1 lg:px-4 lg:pt-3 lg:pb-1.5 border-t backdrop-blur-xl transition-all duration-500 ${
                            isDark ? 'bg-[#1A1A1A]/90 border-white/5' : 'bg-[#FBFBFD]/95 border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]'
                        }`}>
                            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-end gap-5">
                                
                                {/* Band Selectors - Stacked Vertically */}
                                <div className="flex lg:flex-col items-end lg:items-stretch gap-2 w-full lg:w-36 shrink-0">
                                    <div className="flex gap-2 w-full">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-0.5 block">T1</label>
                                            <select
                                                value={fd.task1Band || activeWriting.task1Band || ''}
                                                onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], task1Band: e.target.value } }))}
                                                className={`w-full h-8 px-2 rounded-lg font-black text-xs outline-none transition-all shadow-sm border ${
                                                    isDark ? 'bg-[#333] border-white/10 text-white' : 'bg-white border-gray-200 hover:border-gray-300 text-slate-800'
                                                }`}
                                            >
                                                <option value="">--</option>
                                                {['3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-0.5 block">T2</label>
                                            <select
                                                value={fd.task2Band || activeWriting.task2Band || ''}
                                                onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], task2Band: e.target.value } }))}
                                                className={`w-full h-8 px-2 rounded-lg font-black text-xs outline-none transition-all shadow-sm border ${
                                                    isDark ? 'bg-[#333] border-white/10 text-white' : 'bg-white border-gray-200 hover:border-gray-300 text-slate-800'
                                                }`}
                                            >
                                                <option value="">--</option>
                                                {['3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className={`flex items-center justify-between px-3 h-8 rounded-lg border transition-all ${
                                        (fd.task1Band && fd.task2Band) || activeWriting.writingBand 
                                            ? 'bg-slate-900 border-slate-800 text-white shadow-lg' 
                                            : 'bg-transparent border-dashed border-gray-300 text-gray-400'
                                    }`}>
                                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Overall Band</span>
                                        <span className="text-xs font-black tabular-nums">
                                            {calculateOverall(fd.task1Band || activeWriting.task1Band, fd.task2Band || activeWriting.task2Band)}
                                        </span>
                                    </div>
                                </div>

                                {/* Feedback Input - Much Wider */}
                                <div className="flex-1 w-full relative">
                                    <textarea
                                        rows={3}
                                        value={fd.feedback ?? (activeWriting.teacherFeedback || '')}
                                        onChange={e => setFeedbackData(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], feedback: e.target.value } }))}
                                        placeholder="Add feedback notes or paste AI action plan..."
                                        className={`w-full px-4 py-2.5 rounded-xl outline-none text-[13px] resize-y transition-all border shadow-sm min-h-[80px] max-h-[400px] leading-relaxed ${
                                            isDark ? 'bg-[#333] border-white/10 focus:border-gray-400 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 focus:border-gray-400 text-slate-800'
                                        }`}
                                    />
                                    <div className="absolute top-3 right-3 pointer-events-none text-gray-400">
                                        <PenLine size={14} />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={() => handleSaveFeedback(selectedId)}
                                    disabled={saving}
                                    className={`w-full lg:w-auto px-6 h-10 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.95] disabled:opacity-50 shrink-0 ${
                                        isDark 
                                            ? 'bg-white text-black hover:bg-gray-100' 
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <SendIcon size={14} weight="bold" />
                                            Save Evaluation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-[64px] bg-emerald-500/5 flex items-center justify-center mb-10 border border-emerald-500/10">
                            <TrendUp size={80} className="text-emerald-500 opacity-20" weight="duotone" />
                        </div>
                        <h2 className={`text-2xl lg:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Review Workplace</h2>
                        <p className="max-w-md mt-4 text-sm lg:text-lg font-bold">Select a student submission from the sidebar to begin the evaluation process.</p>
                        <div className="mt-12 flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                            <span className="px-4 py-2 bg-white/5 rounded-full border border-white/10">Draft Mode</span>
                            <span className="text-emerald-500">Fast Evaluation</span>
                        </div>
                    </div>
                )}
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDark ? '#333' : '#E2E8F0'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDark ? '#444' : '#CBD5E1'};
                }
            `}</style>
        </div>
    );
}
