import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import {
    collection, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy
} from 'firebase/firestore';
import { FaArrowLeft, FaFlag, FaTrash, FaCheck, FaUndo } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

export default function AdminReports() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'resolved'
    const [processingId, setProcessingId] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'testComments'),
                where('isReport', '==', true),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleToggleResolved = async (report) => {
        setProcessingId(report.id);
        try {
            const nextStatus = report.status === 'resolved' ? 'pending' : 'resolved';
            await updateDoc(doc(db, 'testComments', report.id), { status: nextStatus });
            setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: nextStatus } : r));
        } catch (error) {
            alert('Xatolik: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Haqiqatan ham bu xabarni o'chirmoqchimisiz?")) return;
        try {
            await deleteDoc(doc(db, 'testComments', id));
            setReports(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            alert('Xatolik: ' + error.message);
        }
    };

    const visibleReports = reports.filter(r => {
        if (filter === 'pending') return r.status !== 'resolved';
        if (filter === 'resolved') return r.status === 'resolved';
        return true;
    });

    return (
        <div className={`min-h-full font-sans p-4 md:p-6 transition-colors duration-200 ${isDark ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-6 md:mb-8">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <button onClick={() => navigate('/admin')} className={`p-2 shrink-0 rounded-xl transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                            <FaArrowLeft />
                        </button>
                        <div className="min-w-0">
                            <h1 className={`text-lg md:text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <FaFlag className="text-orange-500" />
                                Test Xabarlari
                            </h1>
                            <p className={`${isDark ? 'text-white/40' : 'text-gray-500'} text-xs md:text-sm`}>
                                O'quvchilar tomonidan yuborilgan xato/kamchilik haqidagi xabarlar
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-5">
                    {[
                        { id: 'pending', label: 'Ko\'rilmagan' },
                        { id: 'resolved', label: 'Hal qilingan' },
                        { id: 'all', label: 'Barchasi' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                filter === f.id
                                    ? (isDark ? 'bg-white text-black border-white' : 'bg-blue-600 text-white border-blue-600')
                                    : (isDark ? 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className={`text-center py-10 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Yuklanmoqda...</div>
                    ) : visibleReports.length === 0 ? (
                        <div className={`text-center py-20 rounded-3xl border border-dashed transition-colors ${isDark ? 'bg-[#1f1e1b] border-white/5 text-white/30' : 'bg-white border-gray-200 text-gray-400'}`}>
                            Hozircha xabarlar mavjud emas.
                        </div>
                    ) : (
                        visibleReports.map((item) => {
                            const isResolved = item.status === 'resolved';
                            return (
                                <div key={item.id} className={`p-4 sm:p-5 rounded-2xl border flex justify-between items-start gap-2 group transition ${isDark ? 'bg-[#1f1e1b] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                    <div className="flex gap-3 sm:gap-4 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-lg transition-colors ${isResolved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            <FaFlag />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className={`font-bold text-sm sm:text-base break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {item.userName || 'Student'}
                                                </h3>
                                                {item.qNumber != null && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded border uppercase font-bold bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                        {item.qNumber}-savol
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${isResolved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                                    {isResolved ? 'Hal qilingan' : "Ko'rilmagan"}
                                                </span>
                                            </div>
                                            <p className={`text-sm whitespace-pre-wrap break-words ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{item.text}</p>
                                            <p className={`text-xs mt-2 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                                                {item.testId ? `Test: ${item.testId}` : ''}
                                                {item.createdAt?.seconds ? ` • ${new Date(item.createdAt.seconds * 1000).toLocaleString()}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleToggleResolved(item)}
                                            disabled={processingId === item.id}
                                            className={`p-2 rounded-lg transition ${isResolved
                                                ? (isDark ? 'text-white/40 hover:text-orange-400 hover:bg-orange-500/10' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50')
                                                : (isDark ? 'text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50')}`}
                                            title={isResolved ? 'Qayta ochish' : 'Hal qilindi deb belgilash'}
                                        >
                                            {isResolved ? <FaUndo /> : <FaCheck />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className={`p-2 rounded-lg transition ${isDark ? 'text-white/20 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                            title="O'chirish"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
