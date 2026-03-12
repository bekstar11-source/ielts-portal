import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/firebase';
import {
    collection, doc, getDoc, getDocs, query,
    where, orderBy, limit
} from 'firebase/firestore';
import {
    Users, BookOpen, NotePencil as PenLine, ChartBar as BarChart2,
    CaretRight as ChevronRight, Clock, CheckCircle, WarningCircle as AlertCircle
} from '@phosphor-icons/react';

export default function TeacherDashboard() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [groups, setGroups] = useState([]);
    const [pendingWritings, setPendingWritings] = useState(0);
    const [assignedTestsCount, setAssignedTestsCount] = useState(0);
    const [recentResults, setRecentResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const groupIds = userData?.assignedGroupIds || [];
            if (!groupIds.length) { setLoading(false); return; }

            // Fetch groups
            const groupDocs = await Promise.all(
                groupIds.map(id => getDoc(doc(db, 'groups', id)))
            );
            const fetchedGroups = groupDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetchedGroups);

            // Count assigned tests across all groups
            const totalTests = fetchedGroups.reduce((acc, g) => acc + (g.assignedTests?.length || 0), 0);
            setAssignedTestsCount(totalTests);

            // Fetch all student IDs from groups
            const allStudentIds = [...new Set(fetchedGroups.flatMap(g => g.studentIds || []))];

            if (allStudentIds.length > 0) {
                // Get recent results for pending writing checks
                const chunks = [];
                for (let i = 0; i < allStudentIds.length; i += 10) {
                    chunks.push(allStudentIds.slice(i, i + 10));
                }
                let allResults = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'results'),
                        where('userId', 'in', chunk),
                        orderBy('date', 'desc'),
                        limit(50)
                    );
                    const snap = await getDocs(q);
                    allResults.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }

                // Count pending writings (writing type, no teacherFeedback)
                const pending = allResults.filter(r =>
                    r.type === 'writing' && !r.teacherFeedback && !r.writingBand
                );
                setPendingWritings(pending.length);

                // Recent 5 results
                setRecentResults(allResults.slice(0, 5));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            label: "Guruhlar",
            value: groups.length,
            icon: Users,
            color: "emerald",
            action: () => navigate('/teacher/group-stats')
        },
        {
            label: "Tayinlangan Testlar",
            value: assignedTestsCount,
            icon: BookOpen,
            color: "blue",
            action: () => navigate('/teacher/tests')
        },
        {
            label: "Kutayotgan Writinglar",
            value: pendingWritings,
            icon: PenLine,
            color: "orange",
            action: () => navigate('/teacher/writing-review')
        },
    ];

    const colorMap = {
        emerald: {
            bg: isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200',
            icon: 'text-emerald-400',
            value: 'text-emerald-400'
        },
        blue: {
            bg: isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
            icon: 'text-blue-400',
            value: 'text-blue-400'
        },
        orange: {
            bg: isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200',
            icon: 'text-orange-400',
            value: 'text-orange-400'
        }
    };

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Xush kelibsiz, {userData?.fullName?.split(' ')[0] || 'Ustoz'} 👋
                </h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Bugungi holat va guruh natijalari
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : groups.length === 0 ? (
                <div className={`rounded-[24px] border p-12 text-center ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <AlertCircle size={40} className="mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Guruh tayinlanmagan</p>
                    <p className="text-sm mt-1 text-gray-400">Admin sizga guruh tayinlashini kuting</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {statCards.map((card) => {
                            const colors = colorMap[card.color];
                            return (
                                <button
                                    key={card.label}
                                    onClick={card.action}
                                    className={`rounded-[20px] border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${colors.bg}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
                                            <card.icon size={20} className={colors.icon} />
                                        </div>
                                        <ChevronRight size={16} className="opacity-40" />
                                    </div>
                                    <p className={`text-3xl font-bold ${colors.value}`}>{card.value}</p>
                                    <p className={`text-xs mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Groups */}
                    <div>
                        <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Mening Guruhlarim
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groups.map(group => (
                                <div
                                    key={group.id}
                                    className={`rounded-[20px] border p-5 ${isDark ? 'bg-[#2C2C2C] border-white/5 hover:border-emerald-500/30' : 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm'} transition-all`}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                                            {group.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{group.name}</p>
                                            <p className="text-xs text-emerald-500 font-medium">Faol guruh</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`p-3 rounded-xl ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-50'}`}>
                                            <p className="text-xs opacity-50 mb-1">O'quvchilar</p>
                                            <p className="text-xl font-bold text-blue-400">{group.studentIds?.length || 0}</p>
                                        </div>
                                        <div className={`p-3 rounded-xl ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-50'}`}>
                                            <p className="text-xs opacity-50 mb-1">Testlar</p>
                                            <p className="text-xl font-bold text-purple-400">{group.assignedTests?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Results */}
                    {recentResults.length > 0 && (
                        <div>
                            <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                So'nggi Natijalar
                            </h2>
                            <div className={`rounded-[20px] border overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                                {recentResults.map((r, i) => (
                                    <div
                                        key={r.id}
                                        className={`flex items-center justify-between p-4 ${i < recentResults.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-gray-100') : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                <BookOpen size={14} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {r.testTitle || 'Test'}
                                                </p>
                                                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                    <Clock size={9} />
                                                    {r.date ? new Date(r.date?.seconds ? r.date.seconds * 1000 : r.date).toLocaleDateString() : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {r.type === 'writing' && !r.writingBand && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold">Kutmoqda</span>
                                            )}
                                            <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {r.bandScore || r.writingBand || r.score || '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
