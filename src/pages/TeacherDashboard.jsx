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
    Users, BookOpen, NotePencil as PenLine,
    CaretRight as ChevronRight, WarningCircle as AlertCircle,
    Sparkle,
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

            const groupDocs = await Promise.all(
                groupIds.map(id => getDoc(doc(db, 'groups', id)))
            );
            const fetchedGroups = groupDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetchedGroups);

            let setIdsToFetch = new Set();
            fetchedGroups.forEach(g => {
                g.assignedTests?.forEach(test => {
                    if (test.type === 'set') {
                        setIdsToFetch.add(test.id);
                    }
                });
            });

            const testSetsMap = {};
            if (setIdsToFetch.size > 0) {
                const idsArray = Array.from(setIdsToFetch);
                const chunks = [];
                for (let i = 0; i < idsArray.length; i += 10) {
                    chunks.push(idsArray.slice(i, i + 10));
                }
                for (const chunk of chunks) {
                    const snap = await Promise.all(
                        chunk.map(id => getDoc(doc(db, 'testSets', id)))
                    );
                    snap.forEach(d => {
                        if (d.exists()) testSetsMap[d.id] = d.data();
                    });
                }
            }

            fetchedGroups.forEach(g => {
                let realTestCount = 0;
                g.assignedTests?.forEach(test => {
                    if (test.type === 'set' && testSetsMap[test.id]) {
                        realTestCount += testSetsMap[test.id].testIds?.length || 0;
                    } else {
                        realTestCount += 1;
                    }
                });
                g.realTestCount = realTestCount;
            });

            const totalTests = fetchedGroups.reduce((acc, g) => acc + (g.realTestCount || 0), 0);
            setAssignedTestsCount(totalTests);

            const allStudentIds = [...new Set(fetchedGroups.flatMap(g => g.studentIds || []))];

            if (allStudentIds.length > 0) {
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

                const pending = allResults.filter(r =>
                    r.type === 'writing' && !r.teacherFeedback && !r.writingBand
                );
                setPendingWritings(pending.length);
                setRecentResults(allResults.slice(0, 5));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const firstName = userData?.fullName?.split(' ')[0] || 'Ustoz';

    const statCards = [
        {
            label: 'Guruhlar',
            value: groups.length,
            icon: Users,
            bg: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(233,247,241,0.75)',
            iconBg: isDark ? 'rgba(16,185,129,0.2)' : '#D1EFE0',
            iconColor: '#10B981',
            valueColor: '#10B981',
            labelColor: isDark ? '#34D399' : '#0E9F6E',
            action: () => navigate('/teacher/group-stats'),
        },
        {
            label: 'Tayinlangan Testlar',
            value: assignedTestsCount,
            icon: BookOpen,
            bg: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(240,245,255,0.75)',
            iconBg: isDark ? 'rgba(59,130,246,0.2)' : '#DCE7FF',
            iconColor: '#3B82F6',
            valueColor: '#3B82F6',
            labelColor: isDark ? '#60A5FA' : '#2563EB',
            action: () => navigate('/teacher/tests'),
        },
        {
            label: 'Kutayotgan Writinglar',
            value: pendingWritings,
            icon: PenLine,
            bg: isDark ? 'rgba(249,115,22,0.12)' : 'rgba(255,246,237,0.75)',
            iconBg: isDark ? 'rgba(249,115,22,0.2)' : '#FFECD6',
            iconColor: '#F97316',
            valueColor: '#F97316',
            labelColor: isDark ? '#FB923C' : '#EA580C',
            action: () => navigate('/teacher/writing-review'),
        },
    ];

    // Glass card style — matches the page gradient backdrop
    const glassCard = {
        background: isDark
            ? 'rgba(44,44,44,0.7)'
            : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isDark
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid rgba(255,255,255,0.7)',
        boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.3)'
            : '0 4px 24px rgba(0,0,0,0.06)',
    };

    return (
        <div className="font-sans">
            <style>{`
                @keyframes teacherWave {
                    0%   { transform: rotate(0deg) }
                    10%  { transform: rotate(14deg) }
                    20%  { transform: rotate(-8deg) }
                    30%  { transform: rotate(14deg) }
                    40%  { transform: rotate(-4deg) }
                    50%  { transform: rotate(10deg) }
                    60%  { transform: rotate(0deg) }
                    100% { transform: rotate(0deg) }
                }
                .teacher-wave {
                    display: inline-block;
                    animation: teacherWave 2.5s infinite;
                    transform-origin: 70% 70%;
                }
            `}</style>

            {/* ── HERO ── */}
            <div className="text-center pt-12 pb-14 px-4">
                {/* Badge */}
                <div className="flex justify-center mb-6">
                    <span
                        className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
                            color: isDark ? '#f9a8d4' : '#be123c',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <Sparkle size={14} weight="fill" />
                        O'qituvchi Paneli
                    </span>
                </div>

                {/* Heading */}
                <h1
                    className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-tight"
                    style={{ color: isDark ? '#fff' : '#0a0a0a' }}
                >
                    Xush kelibsiz,<br />
                    {firstName} <span className="teacher-wave">👋</span>
                </h1>

                {/* Subtitle */}
                <p
                    className="text-base md:text-lg font-medium mb-10 max-w-md mx-auto"
                    style={{ color: isDark ? '#9CA3AF' : '#374151' }}
                >
                    Bugungi holat, guruh natijalari va yangi vazifalarni bitta joyda, tez va oson boshqaring.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={() => navigate('/teacher/create-writing')}
                        className="px-8 py-3.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                        style={{
                            background: isDark ? '#fff' : '#0a0a0a',
                            color: isDark ? '#0a0a0a' : '#fff',
                            boxShadow: isDark ? '0 8px 24px rgba(255,255,255,0.1)' : '0 8px 24px rgba(0,0,0,0.18)',
                        }}
                    >
                        Yangi vazifa yaratish
                    </button>
                    <button
                        onClick={() => navigate('/teacher/group-stats')}
                        className="px-8 py-3.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
                            color: isDark ? '#fff' : '#0a0a0a',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        Barcha guruhlar
                    </button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : groups.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-16 gap-3 rounded-[2rem]"
                    style={glassCard}
                >
                    <AlertCircle size={40} className="text-gray-400 opacity-50" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Guruh tayinlanmagan</p>
                    <p className="text-sm text-gray-400">Admin sizga guruh tayinlashini kuting</p>
                </div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                        {statCards.map((card) => (
                            <button
                                key={card.label}
                                onClick={card.action}
                                className="rounded-[2rem] p-7 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                                style={{
                                    background: card.bg,
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: isDark
                                        ? '1px solid rgba(255,255,255,0.06)'
                                        : '1px solid rgba(255,255,255,0.6)',
                                    boxShadow: isDark
                                        ? 'none'
                                        : '0 2px 12px rgba(0,0,0,0.05)',
                                }}
                            >
                                <div className="flex items-start justify-between mb-7">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: card.iconBg, color: card.iconColor }}
                                    >
                                        <card.icon size={20} weight="bold" />
                                    </div>
                                    <ChevronRight
                                        size={20}
                                        style={{ color: card.iconColor, opacity: 0.45 }}
                                        className="group-hover:opacity-100 transition-opacity"
                                    />
                                </div>
                                <p className="text-5xl font-bold mb-1.5 tracking-tight" style={{ color: card.valueColor }}>
                                    {card.value}
                                </p>
                                <p className="font-semibold text-sm" style={{ color: card.labelColor }}>
                                    {card.label}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Lower grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Guruhlar */}
                        <div className="lg:col-span-4">
                            <h2
                                className="text-[11px] font-bold uppercase tracking-widest mb-4"
                                style={{ color: isDark ? '#6B7280' : 'rgba(0,0,0,0.4)' }}
                            >
                                Mening Guruhlarim
                            </h2>
                            <div className="space-y-4">
                                {groups.map(group => (
                                    <div key={group.id} className="rounded-[2rem] p-6" style={glassCard}>
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0">
                                                {group.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {group.name}
                                                </p>
                                                <span className="text-[#10B981] text-sm font-medium flex items-center gap-1.5 mt-0.5">
                                                    <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
                                                    Faol guruh
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: "O'quvchilar", val: group.studentIds?.length || 0 },
                                                { label: 'Testlar',     val: group.realTestCount || 0 },
                                            ].map(({ label, val }) => (
                                                <div
                                                    key={label}
                                                    className="rounded-2xl p-4"
                                                    style={{
                                                        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.5)',
                                                        border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.7)',
                                                    }}
                                                >
                                                    <p className="text-xs font-medium mb-1 text-gray-500">{label}</p>
                                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Natijalar */}
                        {recentResults.length > 0 && (
                            <div className="lg:col-span-8">
                                <h2
                                    className="text-[11px] font-bold uppercase tracking-widest mb-4"
                                    style={{ color: isDark ? '#6B7280' : 'rgba(0,0,0,0.4)' }}
                                >
                                    So'nggi Natijalar
                                </h2>
                                <div className="rounded-[2rem] overflow-hidden" style={glassCard}>
                                    {recentResults.map((r, i) => (
                                        <React.Fragment key={r.id}>
                                            <div
                                                className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors"
                                                style={{ background: 'transparent' }}
                                                onClick={() => navigate('/teacher/results')}
                                                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                                        style={{
                                                            background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(240,245,255,0.8)',
                                                            color: '#3B82F6',
                                                        }}
                                                    >
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-sm mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {r.testTitle || 'Test'}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {r.date
                                                                ? new Date(r.date?.seconds ? r.date.seconds * 1000 : r.date).toLocaleDateString()
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {r.type === 'writing' && !r.writingBand && (
                                                        <span
                                                            className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                                                            style={{
                                                                background: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(255,246,237,0.9)',
                                                                color: '#F97316',
                                                            }}
                                                        >
                                                            Kutmoqda
                                                        </span>
                                                    )}
                                                    <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {r.bandScore || r.writingBand || r.score || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                            {i < recentResults.length - 1 && (
                                                <div
                                                    className="mx-5"
                                                    style={{
                                                        height: '1px',
                                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                                                    }}
                                                />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>

                                <button
                                    onClick={() => navigate('/teacher/results')}
                                    className="mt-5 text-sm font-bold flex items-center gap-1 mx-auto transition-colors"
                                    style={{ color: isDark ? '#6B7280' : 'rgba(0,0,0,0.4)' }}
                                    onMouseEnter={e => e.currentTarget.style.color = isDark ? '#fff' : '#000'}
                                    onMouseLeave={e => e.currentTarget.style.color = isDark ? '#6B7280' : 'rgba(0,0,0,0.4)'}
                                >
                                    Barchasini ko'rish <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                    </div>
                </>
            )}
        </div>
    );
}
