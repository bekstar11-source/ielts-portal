import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/firebase';
import {
    collection, doc, getDoc, getDocs, query,
    where, orderBy, updateDoc
} from 'firebase/firestore';
import { NotePencil as PenLine, CheckCircle, Clock, CaretDown as ChevronDown, CaretUp as ChevronUp, MagnifyingGlass as Search, WarningCircle as AlertCircle } from '@phosphor-icons/react';

export default function TeacherWritingReview() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [writings, setWritings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // 'pending' | 'reviewed' | 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [reviewing, setReviewing] = useState({});
    const [feedbackData, setFeedbackData] = useState({});
    const [saving, setSaving] = useState(false);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const groupIds = userData?.assignedGroupIds || [];
            if (!groupIds.length) { setLoading(false); return; }

            const groupDocs = await Promise.all(groupIds.map(id => getDoc(doc(db, 'groups', id))));
            const groups = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
            const allStudentIds = [...new Set(groups.flatMap(g => g.studentIds || []))];

            if (!allStudentIds.length) { setLoading(false); return; }

            // Fetch student users for names
            const studentChunks = [];
            for (let i = 0; i < allStudentIds.length; i += 10) {
                studentChunks.push(allStudentIds.slice(i, i + 10));
            }
            let studentsData = [];
            for (const chunk of studentChunks) {
                const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
                const snap = await getDocs(q);
                studentsData.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            setStudents(studentsData);

            // Fetch writing results
            let allResults = [];
            for (const chunk of studentChunks) {
                const q = query(
                    collection(db, 'results'),
                    where('userId', 'in', chunk),
                    where('type', '==', 'writing'),
                    orderBy('date', 'desc')
                );
                const snap = await getDocs(q);
                allResults.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            setWritings(allResults);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getStudentName = (userId) => {
        return students.find(s => s.id === userId)?.fullName || 'O\'quvchi';
    };

    const handleSaveFeedback = async (resultId) => {
        const data = feedbackData[resultId] || {};
        if (!data.band) return alert("Band skorini kiriting!");
        setSaving(true);
        try {
            await updateDoc(doc(db, 'results', resultId), {
                writingBand: parseFloat(data.band),
                teacherFeedback: data.feedback || '',
                reviewedAt: new Date().toISOString(),
                reviewedByTeacher: userData?.uid
            });
            // Update local state
            setWritings(prev => prev.map(w =>
                w.id === resultId
                    ? { ...w, writingBand: parseFloat(data.band), teacherFeedback: data.feedback || '', reviewedAt: new Date().toISOString() }
                    : w
            ));
            setExpanded(null);
            setReviewing(prev => ({ ...prev, [resultId]: false }));
            alert("Saqlandi!");
        } catch (e) {
            alert("Xato: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const filtered = writings.filter(w => {
        const matchesFilter =
            filter === 'all' ? true :
            filter === 'pending' ? (!w.writingBand && !w.teacherFeedback) :
            filter === 'reviewed' ? (!!w.writingBand || !!w.teacherFeedback) : true;

        const name = getStudentName(w.userId);
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (w.testTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const pendingCount = writings.filter(w => !w.writingBand && !w.teacherFeedback).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Writing Tekshirish</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {pendingCount > 0 ? (
                            <span className="text-orange-400 font-medium">{pendingCount} ta writing tekshirishni kutmoqda</span>
                        ) : (
                            "Barcha writinglar tekshirilgan ✓"
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {['pending', 'reviewed', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                filter === f
                                    ? 'bg-emerald-600 text-white'
                                    : (isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900')
                            }`}
                        >
                            {f === 'pending' ? 'Kutmoqda' : f === 'reviewed' ? 'Tekshirilgan' : 'Barchasi'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className={`flex items-center px-3 py-2 rounded-xl border max-w-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                    type="text"
                    placeholder="O'quvchi yoki test nomi..."
                    className="bg-transparent border-none outline-none text-sm w-full"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className={`rounded-[24px] border p-12 text-center ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <PenLine size={40} className="mx-auto mb-4 opacity-30" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {filter === 'pending' ? "Kutayotgan writing yo'q" : "Writing topilmadi"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((w) => {
                        const isReviewed = !!w.writingBand || !!w.teacherFeedback;
                        const isExpanded = expanded === w.id;
                        const fd = feedbackData[w.id] || {};

                        return (
                            <div
                                key={w.id}
                                className={`rounded-[20px] border overflow-hidden transition-all ${
                                    isReviewed
                                        ? (isDark ? 'bg-[#2C2C2C] border-emerald-500/20' : 'bg-white border-emerald-200 shadow-sm')
                                        : (isDark ? 'bg-[#2C2C2C] border-orange-500/20' : 'bg-white border-orange-200 shadow-sm')
                                }`}
                            >
                                {/* Row */}
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : w.id)}
                                    className="w-full flex items-center justify-between p-4 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${isReviewed ? 'bg-emerald-600' : 'bg-orange-500'}`}>
                                            {getStudentName(w.userId).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {getStudentName(w.userId)}
                                            </p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {w.date ? new Date(w.date?.seconds ? w.date.seconds * 1000 : w.date).toLocaleDateString() : ''}
                                                <span className="mx-1">·</span>
                                                {w.testTitle || 'Writing'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isReviewed ? (
                                            <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold">
                                                <CheckCircle size={14} /> {w.writingBand} band
                                            </span>
                                        ) : (
                                            <span className="text-xs text-orange-400 font-bold">Tekshirilmagan</span>
                                        )}
                                        {isExpanded ? <ChevronUp size={16} className="opacity-40" /> : <ChevronDown size={16} className="opacity-40" />}
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className={`px-4 pb-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                        {/* Student's writing */}
                                        <div className="mt-4 space-y-3">
                                            {[{ label: 'Task 1', key: 'task1' }, { label: 'Task 2', key: 'task2' }].map(({ label, key }) => {
                                                const taskAnswer = w.answers?.[key] || w[key] || w.writingAnswer || null;
                                                return taskAnswer ? (
                                                    <div key={key}>
                                                        <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label} — O'quvchi javobi</p>
                                                        <div className={`p-3 rounded-xl text-sm leading-relaxed max-h-48 overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#1E1E1E] text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                                                            {taskAnswer}
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}

                                            {/* If writing answer is flat string */}
                                            {!w.answers && !w.task1 && !w.task2 && w.writingAnswer && (
                                                <div>
                                                    <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>O'quvchi javobi</p>
                                                    <div className={`p-3 rounded-xl text-sm leading-relaxed max-h-48 overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#1E1E1E] text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                                                        {w.writingAnswer}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Existing feedback */}
                                        {isReviewed && w.teacherFeedback && (
                                            <div className={`mt-3 p-3 rounded-xl border ${isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                                                <p className="text-xs font-bold text-emerald-500 mb-1">Teacher Fikri:</p>
                                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{w.teacherFeedback}</p>
                                            </div>
                                        )}

                                        {/* Review Form */}
                                        <div className="mt-4 space-y-3">
                                            <p className={`text-xs font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {isReviewed ? 'Baho yangilash' : 'Baho berish'}
                                            </p>
                                            <div className="flex gap-3">
                                                <div className="w-32">
                                                    <label className="text-xs opacity-50 block mb-1">Band Skori</label>
                                                    <select
                                                        value={fd.band || w.writingBand || ''}
                                                        onChange={e => setFeedbackData(prev => ({ ...prev, [w.id]: { ...prev[w.id], band: e.target.value } }))}
                                                        className={`w-full h-10 px-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-[#1E1E1E] border-white/5 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                                    >
                                                        <option value="">Tanlang</option>
                                                        {['3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(b => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs opacity-50 block mb-1">Feedback (ixtiyoriy)</label>
                                                    <textarea
                                                        rows={2}
                                                        value={fd.feedback ?? (w.teacherFeedback || '')}
                                                        onChange={e => setFeedbackData(prev => ({ ...prev, [w.id]: { ...prev[w.id], feedback: e.target.value } }))}
                                                        placeholder="O'quvchiga izoh..."
                                                        className={`w-full px-3 py-2 rounded-xl border outline-none text-sm resize-none ${isDark ? 'bg-[#1E1E1E] border-white/5 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSaveFeedback(w.id)}
                                                disabled={saving}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                                            >
                                                {saving ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <CheckCircle size={16} />
                                                )}
                                                {isReviewed ? 'Yangilash' : 'Saqlash'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
