import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import {
    collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { Users, BookOpen, ChartLineUp as TrendingUp, MagnifyingGlass as Search, CaretDown as ChevronDown, CaretUp as ChevronUp, Plus, Trash, Download } from '@phosphor-icons/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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

    // NEW STATES
    const [searchDbTerm, setSearchDbTerm] = useState('');
    const [dbSearchResults, setDbSearchResults] = useState([]);
    const [searchingDb, setSearchingDb] = useState(false);

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
            // Default selected group if not already set or invalid
            if (fetchedGroups.length > 0 && (!selectedGroup || !fetchedGroups.some(g => g.id === selectedGroup))) {
                setSelectedGroup(fetchedGroups[0].id);
            }

            const allStudentIds = [...new Set(fetchedGroups.flatMap(g => g.studentIds || []))];
            if (!allStudentIds.length) { 
                setStudents([]); 
                setResults([]); 
                setLoading(false); 
                return; 
            }

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
                    where('userId', 'in', chunk)
                );
                const rsnap = await getDocs(rq);
                allResults.push(...rsnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            
            const sortedResults = allResults.sort((a, b) => {
                const da = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : 0;
                const db = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : 0;
                return db - da;
            });

            setStudents(studentsData);
            setResults(sortedResults);
        } catch (e) {
            console.error("Error in TeacherGroupStats:", e);
        } finally {
            setLoading(false);
        }
    };

    const searchStudentsDb = async (e) => {
        e.preventDefault();
        if (!searchDbTerm.trim()) { setDbSearchResults([]); return; }
        setSearchingDb(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student')
            );
            const snap = await getDocs(q);
            const term = searchDbTerm.toLowerCase();
            const matched = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.fullName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
            setDbSearchResults(matched);
        } catch (error) {
            console.error("Search db error:", error);
        } finally {
            setSearchingDb(false);
        }
    };

    const handleAddStudent = async (studentId) => {
        if (!selectedGroup) return;

        // O'qituvchi obunasidagi `maxStudents` limiti — ilgari faqat tarif
        // kartochkasida yozib qo'yilgan edi, hech qayerda tekshirilmasdi.
        const sub = userData?.teacherSubscription;
        const subActive = sub && new Date(sub.validUntil) > new Date();
        if (!subActive) {
            alert("Faol guruh obunangiz yo'q. O'quvchi qo'shish uchun avval obuna xarid qiling.");
            return;
        }
        const currentCount = new Set(
            groups.flatMap(g => g.studentIds || [])
        ).size;
        if (!sub.maxStudents || currentCount >= sub.maxStudents) {
            alert(`Tarif limiti to'ldi (${currentCount}/${sub.maxStudents}). Kattaroq tarifga o'ting.`);
            return;
        }

        try {
            const groupRef = doc(db, 'groups', selectedGroup);
            await updateDoc(groupRef, {
                studentIds: arrayUnion(studentId)
            });
            const userRef = doc(db, 'users', studentId);
            await updateDoc(userRef, {
                groupId: selectedGroup,
                studentType: 'group'
            });
            setSearchDbTerm('');
            setDbSearchResults([]);
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
            const groupRef = doc(db, 'groups', selectedGroup);
            await updateDoc(groupRef, {
                studentIds: arrayRemove(studentId)
            });
            const userRef = doc(db, 'users', studentId);
            await updateDoc(userRef, {
                groupId: null,
                studentType: 'public'
            });
            alert("O'quvchi guruhdan chiqarildi!");
            fetchData();
        } catch (e) {
            alert("Xato: " + e.message);
        }
    };

    const handleExportCSV = () => {
        if (!currentGroup || filteredStudents.length === 0) return;
        
        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += "O'quvchi,Email,O'rtacha Ball,Yechilgan Testlar Soni\n";
        
        filteredStudents.forEach(s => {
            const stats = getStudentStats(s.id);
            csvContent += `"${s.fullName}","${s.email}",${stats.avgBand || "-"},${stats.count}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${currentGroup.name}_natijalari.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    // Generate Chart Data: Group progress over time
    const getChartData = () => {
        const groupResults = results
            .filter(r => currentStudentIds.includes(r.userId) && r.submittedBy !== 'teacher')
            .map(r => ({
                date: r.date ? (r.date.toDate ? r.date.toDate() : new Date(r.date)) : new Date(),
                score: parseFloat(r.bandScore || r.writingBand || r.score || 0)
            }))
            .filter(r => r.score > 0)
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
                        <div className={`p-5 rounded-[24px] border ${isDark ? 'bg-[#2C2C2C]/50 border-white/5' : 'bg-white border-gray-150 shadow-sm'}`}>
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
                    <div className={`p-5 rounded-[24px] border ${isDark ? 'bg-[#2C2C2C]/50 border-white/5' : 'bg-white border-gray-150 shadow-sm'}`}>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Guruhga yangi o'quvchi qo'shish</h4>
                        <form onSubmit={searchStudentsDb} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Foydalanuvchi ismi yoki emaili..."
                                value={searchDbTerm}
                                onChange={e => setSearchDbTerm(e.target.value)}
                                className={`flex-1 px-4 py-2 text-xs rounded-xl border outline-none ${
                                    isDark ? 'bg-[#1E1E1E] border-white/10 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-slate-800 focus:border-emerald-500'
                                }`}
                            />
                            <button
                                type="submit"
                                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                                {searchingDb ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>Qidirish</>
                                )}
                            </button>
                        </form>

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
                        {searchDbTerm && dbSearchResults.length === 0 && !searchingDb && (
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
