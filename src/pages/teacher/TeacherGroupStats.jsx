import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Users, BookOpen, ChartLineUp as TrendingUp, MagnifyingGlass as Search, CaretDown as ChevronDown, CaretUp as ChevronUp, Trash, Download } from '@phosphor-icons/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { toDate } from '../../utils/subscription';
import { getBandValue, collectStudentIds, chunkIds } from '../../utils/teacherResults';
import { canAddStudent, addStudentToGroup, removeStudentFromGroup } from '../../utils/groupMembership';
import { useStudentSearch } from '../../hooks/useStudentSearch';

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

    // Yangi o'quvchi qidirish — indekslangan prefiks so'rovlari.
    // Ilgari bu yerda butun `users` kolleksiyasi yuklanib, filtrlash brauzerda
    // bajarilardi (bazadagi har bir foydalanuvchi uchun 1 ta o'qish).
    const [searchDbTerm, setSearchDbTerm] = useState('');
    const { combinedStudents: dbSearchResults, isSearchingDb: searchingDb } =
        useStudentSearch([], searchDbTerm);

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
            const querySnap = await getDocs(q);
            const fetchedGroups = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!fetchedGroups.length) { setLoading(false); return; }

            const setIdsToFetch = new Set();
            fetchedGroups.forEach(g => {
                g.assignedTests?.forEach(test => {
                    if (test.type === 'set') setIdsToFetch.add(test.id);
                });
            });

            const testSetsMap = {};
            if (setIdsToFetch.size > 0) {
                const snaps = await Promise.all(
                    [...setIdsToFetch].map(id => getDoc(doc(db, 'testSets', id)))
                );
                snaps.forEach(d => { if (d.exists()) testSetsMap[d.id] = d.data(); });
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
            // Default selected group if not already set or invalid
            if (fetchedGroups.length > 0 && (!selectedGroup || !fetchedGroups.some(g => g.id === selectedGroup))) {
                setSelectedGroup(fetchedGroups[0].id);
            }

            const allStudentIds = collectStudentIds(fetchedGroups);
            if (!allStudentIds.length) {
                setStudents([]);
                setResults([]);
                return;
            }

            // Fetch students
            const studentsData = [];
            const allResults = [];
            for (const chunk of chunkIds(allStudentIds)) {
                const [usnap, rsnap] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk))),
                    getDocs(query(collection(db, 'results'), where('userId', 'in', chunk))),
                ]);
                studentsData.push(...usnap.docs.map(d => ({ id: d.id, ...d.data() })));
                allResults.push(...rsnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            // Eng yangisi birinchi. (Ilgari bu yerdagi `const db` firebase
            // `db` ini soya qilardi — xato bermasa ham, xavfli edi.)
            allResults.sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));

            setStudents(studentsData);
            setResults(allResults);
        } catch (e) {
            console.error("Error in TeacherGroupStats:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (studentId) => {
        if (!selectedGroup) return;

        const allowed = canAddStudent(userData, groups);
        if (!allowed.ok) {
            alert(allowed.reason);
            return;
        }

        try {
            await addStudentToGroup(selectedGroup, studentId);
            setSearchDbTerm('');
            alert("O'quvchi guruhga qo'shildi!");
            fetchData();
        } catch (e) {
            alert("Xato: " + e.message);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!selectedGroup) return;
        if (!window.confirm("O'quvchini guruhdan o'chirmoqchimisiz?")) return;
        try {
            await removeStudentFromGroup(selectedGroup, studentId);
            alert("O'quvchi guruhdan chiqarildi!");
            fetchData();
        } catch (e) {
            alert("Xato: " + e.message);
        }
    };

    const handleExportCSV = () => {
        if (!currentGroup || filteredStudents.length === 0) return;
        
        // Ismda qo'shtirnoq bo'lsa CSV ustunlari siljib ketmasligi uchun
        // qo'shtirnoqni ikkilantiramiz.
        const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

        const rows = [["O'quvchi", 'Email', "O'rtacha Ball", 'Yechilgan Testlar Soni']];
        filteredStudents.forEach(s => {
            const stats = getStudentStats(s.id);
            rows.push([s.fullName, s.email, stats.avgBand || '-', stats.count]);
        });

        const csvContent = '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${currentGroup.name}_natijalari.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const currentGroup = groups.find(g => g.id === selectedGroup);
    const currentStudentIds = currentGroup?.studentIds || [];
    const currentStudents = students.filter(s => currentStudentIds.includes(s.id));

    /**
     * Har bir o'quvchi uchun statistika BIR MARTA hisoblanadi.
     * Ilgari `getStudentStats` saralash komparatorining ichida chaqirilardi —
     * ya'ni har taqqoslashda butun `results` massivi qaytadan filtrlanardi.
     *
     * Band o'rtachasiga faqat haqiqiy IELTS band (0–9) qo'shiladi: `score`
     * maydoni "32/40" yoki "32" bo'lishi mumkin va ilgari `parseFloat` uni
     * 32 band deb hisoblab, o'rtachani buzardi.
     */
    const statsByStudent = useMemo(() => {
        const map = new Map();
        for (const r of results) {
            if (r.submittedBy === 'teacher') continue;
            if (!map.has(r.userId)) map.set(r.userId, []);
            map.get(r.userId).push(r);
        }

        const out = new Map();
        for (const [studentId, studentResults] of map) {
            const bands = studentResults.map(getBandValue).filter(n => n !== null);
            const byType = {};
            for (const r of studentResults) {
                const band = getBandValue(r);
                if (band === null) continue;
                const t = (r.type || 'other').toLowerCase();
                (byType[t] = byType[t] || []).push(band);
            }
            out.set(studentId, {
                count: studentResults.length,
                avgBand: bands.length > 0 ? (bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(1) : null,
                byType,
                recentResults: studentResults.slice(0, 5),
            });
        }
        return out;
    }, [results]);

    const EMPTY_STATS = { count: 0, avgBand: null, byType: {}, recentResults: [] };
    const getStudentStats = (studentId) => statsByStudent.get(studentId) || EMPTY_STATS;

    const filteredStudents = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return currentStudents
            .filter(s => !term
                || s.fullName?.toLowerCase().includes(term)
                || s.email?.toLowerCase().includes(term))
            .sort((a, b) => {
                if (sortBy === 'name') return (a.fullName || '').localeCompare(b.fullName || '');
                const statsA = statsByStudent.get(a.id) || EMPTY_STATS;
                const statsB = statsByStudent.get(b.id) || EMPTY_STATS;
                if (sortBy === 'score') return parseFloat(statsB.avgBand || 0) - parseFloat(statsA.avgBand || 0);
                if (sortBy === 'tests') return statsB.count - statsA.count;
                return 0;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStudents, searchTerm, sortBy, statsByStudent]);

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

    // Generate Chart Data: Group progress over time
    const getChartData = () => {
        const memberIds = new Set(currentStudentIds);
        const groupResults = results
            .filter(r => memberIds.has(r.userId) && r.submittedBy !== 'teacher')
            .map(r => ({ date: toDate(r.date) || new Date(), score: getBandValue(r) }))
            .filter(r => r.score !== null)
            .sort((a, b) => a.date - b.date);

        if (groupResults.length === 0) return [];

        const chartDataMap = {};
        groupResults.forEach(r => {
            const key = r.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }).replace(/\//g, '.');
            if (!chartDataMap[key]) {
                chartDataMap[key] = { date: key, scores: [] };
            }
            chartDataMap[key].scores.push(r.score);
        });

        return Object.values(chartDataMap).map(item => {
            const avg = item.scores.reduce((a, b) => a + b, 0) / item.scores.length;
            return {
                date: item.date,
                "O'rtacha Ball": parseFloat(avg.toFixed(1))
            };
        }).slice(-10); // Show last 10 trend days
    };

    const chartData = getChartData();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Guruh Statistikasi</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        O'quvchilarning test natijalari va o'sish dinamikasi
                    </p>
                </div>
                {currentGroup && filteredStudents.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className={`flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                            isDark 
                                ? 'bg-zinc-800 border-white/5 text-gray-200 hover:bg-zinc-700' 
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
                        }`}
                    >
                        <Download size={14} /> CSV Eksport qilish
                    </button>
                )}
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
                        <div className={`flex-1 flex flex-wrap gap-2 p-1 rounded-2xl ${isDark ? 'bg-[#2C2C2C]' : 'bg-gray-100'}`}>
                            {groups.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setSelectedGroup(g.id)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition min-w-[120px] ${
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    {/* Recharts Progress Chart */}
                    {chartData.length > 0 && (
                        <div className={`p-5 rounded-[24px] border ${isDark ? 'bg-[#2C2C2C]/50 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Guruh o'rtacha o'sish tendensiyasi</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                        <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis domain={[0, 9]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickCount={10} />
                                        <Tooltip contentStyle={{ background: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#eee', borderRadius: '10px' }} />
                                        <Area type="monotone" dataKey="O'rtacha Ball" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorAvg)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className={`flex items-center px-3 py-2.5 rounded-xl border w-full sm:max-w-xs ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="O'quvchi qidirish..."
                                className="bg-transparent border-none outline-none text-xs w-full"
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

                    {/* Add student widget */}
                    <div className={`p-5 rounded-[24px] border ${isDark ? 'bg-[#2C2C2C]/50 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Guruhga yangi o'quvchi qo'shish</h4>
                        <div className="relative flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Foydalanuvchi ismi, emaili yoki telefoni..."
                                value={searchDbTerm}
                                onChange={e => setSearchDbTerm(e.target.value)}
                                className={`flex-1 px-4 py-2 text-xs rounded-xl border outline-none ${
                                    isDark ? 'bg-[#1E1E1E] border-white/10 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-slate-800 focus:border-emerald-500'
                                }`}
                            />
                            {searchingDb && (
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            )}
                        </div>

                        {/* Search Database Results */}
                        {dbSearchResults.length > 0 && (
                            <div className={`mt-3 border rounded-xl divide-y max-h-40 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/5 divide-white/5' : 'border-gray-100 divide-gray-100 bg-white'}`}>
                                {dbSearchResults.map(student => {
                                    const inGroup = currentStudentIds.includes(student.id);
                                    return (
                                        <div key={student.id} className="flex items-center justify-between p-3">
                                            <div className="text-xs">
                                                <p className="font-bold">{student.fullName}</p>
                                                <p className="opacity-60 text-[10px] mt-0.5">{student.email}</p>
                                            </div>
                                            {inGroup ? (
                                                <span className="text-[10px] font-bold text-gray-400">Guruhda bor</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddStudent(student.id)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all"
                                                >
                                                    Qo'shish
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {searchDbTerm.trim().length >= 2 && dbSearchResults.length === 0 && !searchingDb && (
                            <p className="text-[11px] text-red-500 mt-2">Hech qanday o'quvchi topilmadi.</p>
                        )}
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
                                    <div className="w-full flex items-center justify-between p-4 text-left">
                                        <button
                                            onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                            className="flex-1 flex items-center justify-between pr-4"
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

                                        {/* Remove Student Button */}
                                        <button
                                            onClick={() => handleRemoveStudent(student.id)}
                                            title="O'quvchini guruhdan o'chirish"
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>

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
