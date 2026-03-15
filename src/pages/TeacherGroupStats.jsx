import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/firebase';
import {
    collection, doc, getDoc, getDocs, query, where, orderBy
} from 'firebase/firestore';
import { Users, BookOpen, ChartLineUp as TrendingUp, MagnifyingGlass as Search, CaretDown as ChevronDown, CaretUp as ChevronUp } from '@phosphor-icons/react';

export default function TeacherGroupStats() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'score' | 'tests'

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const groupIds = userData?.assignedGroupIds || [];
            if (!groupIds.length) { setLoading(false); return; }

            const groupDocs = await Promise.all(groupIds.map(id => getDoc(doc(db, 'groups', id))));
            const fetchedGroups = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));

            let setIdsToFetch = new Set();
            fetchedGroups.forEach(g => {
                g.assignedTests?.forEach(test => {
                    if (test.type === 'set') setIdsToFetch.add(test.id);
                });
            });

            const testSetsMap = {};
            if (setIdsToFetch.size > 0) {
                const idsArray = Array.from(setIdsToFetch);
                const chunks = [];
                for (let i = 0; i < idsArray.length; i += 10) chunks.push(idsArray.slice(i, i + 10));
                for (const chunk of chunks) {
                    const snap = await Promise.all(chunk.map(id => getDoc(doc(db, 'testSets', id))));
                    snap.forEach(d => { if (d.exists()) testSetsMap[d.id] = d.data(); });
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

            setGroups(fetchedGroups);
            if (fetchedGroups.length > 0) setSelectedGroup(fetchedGroups[0].id);

            const allStudentIds = [...new Set(fetchedGroups.flatMap(g => g.studentIds || []))];
            if (!allStudentIds.length) { setLoading(false); return; }

            // Fetch students
            const chunks = [];
            for (let i = 0; i < allStudentIds.length; i += 10) {
                chunks.push(allStudentIds.slice(i, i + 10));
            }
            let studentsData = [];
            let allResults = [];
            for (const chunk of chunks) {
                const uq = query(collection(db, 'users'), where('__name__', 'in', chunk));
                const usnap = await getDocs(uq);
                studentsData.push(...usnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const rq = query(
                    collection(db, 'results'),
                    where('userId', 'in', chunk),
                    orderBy('date', 'desc')
                );
                const rsnap = await getDocs(rq);
                allResults.push(...rsnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            setStudents(studentsData);
            setResults(allResults);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const currentGroup = groups.find(g => g.id === selectedGroup);
    const currentStudentIds = currentGroup?.studentIds || [];
    const currentStudents = students.filter(s => currentStudentIds.includes(s.id));

    const getStudentStats = (studentId) => {
        const studentResults = results.filter(r => r.userId === studentId && r.submittedBy !== 'teacher');
        const bands = studentResults.map(r => parseFloat(r.bandScore || r.writingBand || r.score || 0)).filter(n => n > 0);
        const avgBand = bands.length > 0 ? (bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(1) : null;
        const byType = {};
        studentResults.forEach(r => {
            const t = (r.type || 'other').toLowerCase();
            if (!byType[t]) byType[t] = [];
            byType[t].push(parseFloat(r.bandScore || r.writingBand || r.score || 0));
        });
        return { count: studentResults.length, avgBand, byType, recentResults: studentResults.slice(0, 5) };
    };

    const filteredStudents = currentStudents
        .filter(s => s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'name') return (a.fullName || '').localeCompare(b.fullName || '');
            const statsA = getStudentStats(a.id);
            const statsB = getStudentStats(b.id);
            if (sortBy === 'score') return parseFloat(statsB.avgBand || 0) - parseFloat(statsA.avgBand || 0);
            if (sortBy === 'tests') return statsB.count - statsA.count;
            return 0;
        });

    const typeColors = {
        reading: 'text-blue-400',
        listening: 'text-purple-400',
        writing: 'text-orange-400',
        speaking: 'text-emerald-400'
    };

    // Group summary stats
    const groupAvgBand = () => {
        const allBands = currentStudents.flatMap(s => {
            const stats = getStudentStats(s.id);
            return stats.avgBand ? [parseFloat(stats.avgBand)] : [];
        });
        if (!allBands.length) return '—';
        return (allBands.reduce((a, b) => a + b, 0) / allBands.length).toFixed(1);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Guruh Statistikasi</h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    O'quvchilarning test natijalari va o'sish dinamikasi
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : groups.length === 0 ? (
                <div className={`rounded-[24px] border p-12 text-center ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <Users size={40} className="mx-auto mb-4 opacity-30" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Guruh tayinlanmagan</p>
                </div>
            ) : (
                <>
                    {/* Group Selector + Summary */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className={`flex-1 flex gap-2 p-1 rounded-2xl ${isDark ? 'bg-[#2C2C2C]' : 'bg-gray-100'}`}>
                            {groups.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setSelectedGroup(g.id)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition ${
                                        selectedGroup === g.id
                                            ? 'bg-emerald-600 text-white shadow-lg'
                                            : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                                    }`}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    {currentGroup && (
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "O'quvchilar", value: currentStudentIds.length, icon: Users, color: 'blue' },
                                { label: "O'rtacha Band", value: groupAvgBand(), icon: TrendingUp, color: 'emerald' },
                                { label: "Tayinlangan Testlar", value: currentGroup?.realTestCount || 0, icon: BookOpen, color: 'purple' }
                            ].map(card => (
                                <div key={card.label} className={`rounded-[18px] border p-4 ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className={`mb-2 ${card.color === 'blue' ? 'text-blue-400' : card.color === 'emerald' ? 'text-emerald-400' : 'text-purple-400'}`}>
                                        <card.icon size={18} />
                                    </div>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className={`flex items-center px-3 py-2 rounded-xl border flex-1 max-w-xs ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="O'quvchi qidirish..."
                                className="bg-transparent border-none outline-none text-sm w-full"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="font-bold">Saralash:</span>
                            {[{ key: 'name', label: 'Ismi' }, { key: 'score', label: 'Ball' }, { key: 'tests', label: 'Testlar' }].map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => setSortBy(s.key)}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                                        sortBy === s.key
                                            ? 'bg-emerald-600 text-white'
                                            : (isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600')
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Students List */}
                    <div className="space-y-2">
                        {filteredStudents.length === 0 ? (
                            <div className={`rounded-[20px] border p-8 text-center ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                                <Users size={30} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm opacity-50">O'quvchi topilmadi</p>
                            </div>
                        ) : filteredStudents.map((student) => {
                            const stats = getStudentStats(student.id);
                            const isExpanded = expandedStudent === student.id;

                            return (
                                <div
                                    key={student.id}
                                    className={`rounded-[18px] border overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}
                                >
                                    <button
                                        onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                        className="w-full flex items-center justify-between p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {student.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.fullName}</p>
                                                <p className="text-xs text-gray-400">{student.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className={`text-xl font-bold ${stats.avgBand ? 'text-emerald-400' : 'opacity-30'}`}>
                                                    {stats.avgBand || '—'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">{stats.count} ta natija</p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="opacity-40" /> : <ChevronDown size={16} className="opacity-40" />}
                                        </div>
                                    </button>

                                    {/* Expanded */}
                                    {isExpanded && (
                                        <div className={`px-4 pb-4 border-t space-y-4 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                            {/* By type */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                                {['reading', 'listening', 'writing', 'speaking'].map(type => {
                                                    const typeData = stats.byType[type] || [];
                                                    const avg = typeData.length
                                                        ? (typeData.reduce((a, b) => a + b, 0) / typeData.length).toFixed(1)
                                                        : null;
                                                    return (
                                                        <div key={type} className={`p-3 rounded-xl ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-50'}`}>
                                                            <p className={`text-xs font-bold uppercase capitalize mb-1 ${typeColors[type] || 'text-gray-400'}`}>{type}</p>
                                                            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{avg || '—'}</p>
                                                            <p className="text-[10px] text-gray-400">{typeData.length} ta</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Recent results */}
                                            {stats.recentResults.length > 0 && (
                                                <div>
                                                    <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>So'nggi Natijalar</p>
                                                    <div className="space-y-1.5">
                                                        {stats.recentResults.map((r, i) => (
                                                            <div key={i} className={`flex justify-between items-center p-2.5 rounded-xl ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-50'}`}>
                                                                <div>
                                                                    <p className={`text-xs font-medium line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.testTitle || 'Test'}</p>
                                                                    <p className="text-[10px] text-gray-400 capitalize">{r.type}</p>
                                                                </div>
                                                                <span className={`font-bold text-sm ${typeColors[(r.type || '').toLowerCase()] || 'text-gray-400'}`}>
                                                                    {r.bandScore || r.writingBand || r.score || '—'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
