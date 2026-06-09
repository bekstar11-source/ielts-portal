import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import { doc, getDoc, getDocs, query, where, collection, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Plus,
  Trash,
  MagnifyingGlass as SearchIcon,
  CaretDown,
  X,
  Users,
  Eye,
  Info,
  Calendar,
  Minus,
  Warning,
  Flame,
  ShieldWarning,
  NotePencil,
  Headphones,
  Trophy,
  ArrowsCounterClockwise
} from '@phosphor-icons/react';

const getTestIconAndColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('reading')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-blue-500/10 text-blue-500' };
    if (t.includes('listening')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-pink-500/10 text-pink-500' };
    if (t.includes('writing')) return { icon: <NotePencil size={16} weight="fill" />, colorClass: 'bg-orange-500/10 text-orange-500' };
    return { icon: <Trophy size={16} weight="fill" />, colorClass: 'bg-purple-500/10 text-purple-500' };
};

export default function TeacherTests() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    // State lists
    const [groups, setGroups] = useState([]);
    const [assignedTests, setAssignedTests] = useState([]);
    const [results, setResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [loading, setLoading] = useState(true);

    // View mode page visibility
    const [showAssignPage, setShowAssignPage] = useState(false);
    const [showMonitorPage, setShowMonitorPage] = useState(false);
    const [monitoringTest, setMonitoringTest] = useState(null);

    // Assign form states
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [searchTestQuery, setSearchTestQuery] = useState("");
    const [testTypeFilter, setTestTypeFilter] = useState("all");
    const [selectedTest, setSelectedTest] = useState(null);
    const [deadline, setDeadline] = useState("");
    const [maxAttempts, setMaxAttempts] = useState("1");
    const [teacherNote, setTeacherNote] = useState("");
    const [priority, setPriority] = useState("medium");
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (userData) {
            fetchData();
        }
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
            const querySnap = await getDocs(q);
            const fetchedGroups = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetchedGroups);

            if (!fetchedGroups.length) {
                setLoading(false);
                return;
            }

            const groupIds = fetchedGroups.map(g => g.id);

            // 2. Fetch all student profiles in these groups
            const usersQuery = query(collection(db, "users"), where("groupId", "in", groupIds));
            const usersSnap = await getDocs(usersQuery);
            const studentsList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(studentsList);

            // Get unique student IDs for results fetch
            const studentIdsArray = studentsList.map(s => s.id);

            // 3. Fetch student results (chunked to bypass 10-in Firestore limit)
            const resultsList = [];
            if (studentIdsArray.length > 0) {
                const chunks = [];
                for (let i = 0; i < studentIdsArray.length; i += 10) {
                    chunks.push(studentIdsArray.slice(i, i + 10));
                }
                for (const chunk of chunks) {
                    const q = query(collection(db, 'results'), where('userId', 'in', chunk));
                    const snap = await getDocs(q);
                    snap.docs.forEach(docSnap => {
                        resultsList.push({ id: docSnap.id, ...docSnap.data() });
                    });
                }
            }
            setResults(resultsList);

            // 4. Gather assigned tests with group details
            const testList = [];
            fetchedGroups.forEach(g => {
                const assignments = g.assignedTests || [];
                assignments.forEach(assign => {
                    testList.push({
                        ...assign,
                        groupId: g.id,
                        groupName: g.name,
                        studentIds: g.studentIds || []
                    });
                });
            });
            // Sort by assigned date descending if date exists
            testList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            setAssignedTests(testList);

            // 5. Fetch available tests metadata for assignment
            const testsSnap = await getDocs(collection(db, 'tests_metadata'));
            const testsList = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAvailableTests(testsList);

        } catch (e) {
            console.error("Error fetching data in TeacherTests:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignTest = async (e) => {
        e.preventDefault();
        if (!selectedGroupId) return alert("Iltimos, guruhni tanlang!");
        if (!selectedTest) return alert("Iltimos, testni tanlang!");

        setAssigning(true);
        try {
            const newAssignment = {
                id: selectedTest.id,
                title: selectedTest.title,
                type: selectedTest.type,
                date: new Date().toISOString(),
                deadline: deadline ? new Date(deadline).toISOString() : null,
                maxAttempts: Number(maxAttempts) || 1,
                priority: priority,
                teacherNote: teacherNote
            };

            await updateDoc(doc(db, 'groups', selectedGroupId), {
                assignedTests: arrayUnion(newAssignment)
            });

            // Create feed post for the assigned test
            try {
                await addDoc(collection(db, "feed_posts"), {
                    type: "teacher_test",
                    title: "Sizning ustozingiz vazifa tayinladi",
                    content: selectedTest.title,
                    testId: selectedTest.id,
                    testType: selectedTest.type,
                    groupId: selectedGroupId,
                    deadline: deadline ? new Date(deadline).toISOString() : null,
                    maxAttempts: Number(maxAttempts) || 1,
                    priority: priority,
                    teacherNote: teacherNote,
                    teacherId: userData.uid,
                    teacherName: userData.fullName || "Ustoz",
                    likes: [],
                    commentsCount: 0,
                    createdAt: serverTimestamp()
                });
            } catch (feedErr) {
                console.error("Error creating feed post for assigned test:", feedErr);
            }

            alert("Test muvaffaqiyatli tayinlandi! 🎯");
            setShowAssignPage(false);
            // Reset form
            setSelectedTest(null);
            setDeadline("");
            setMaxAttempts("1");
            setTeacherNote("");
            setPriority("medium");
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignTest = async (assignment) => {
        if (!window.confirm(`"${assignment.title}" testini guruhdan olib tashlamoqchimisiz?`)) return;

        try {
            // Find the original assignment object stored in the group to perform correct arrayRemove
            const targetGroup = groups.find(g => g.id === assignment.groupId);
            if (!targetGroup) return;
            const originalAssign = targetGroup.assignedTests?.find(a => a.id === assignment.id && a.date === assignment.date);
            if (!originalAssign) return;

            await updateDoc(doc(db, 'groups', assignment.groupId), {
                assignedTests: arrayRemove(originalAssign)
            });

            // Delete corresponding feed post
            try {
                const feedQuery = query(
                    collection(db, 'feed_posts'),
                    where('type', '==', 'teacher_test'),
                    where('groupId', '==', assignment.groupId),
                    where('testId', '==', assignment.id)
                );
                const feedSnap = await getDocs(feedQuery);
                const deletePromises = feedSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                await Promise.all(deletePromises);
            } catch (feedErr) {
                console.error("Error deleting feed post for unassigned test:", feedErr);
            }

            alert("Tayinlov muvaffaqiyatli olib tashlandi! 🗑️");
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi: " + err.message);
        }
    };

    const getTypeColor = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('mock') || t.includes('full')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        if (t.includes('reading')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        if (t.includes('listening')) return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
        if (t.includes('writing')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    // Filter available tests for assignment modal
    const filteredAvailableTests = availableTests.filter(t => {
        const matchesQuery = t.title?.toLowerCase().includes(searchTestQuery.toLowerCase());
        const matchesType = testTypeFilter === 'all' || t.type?.toLowerCase() === testTypeFilter.toLowerCase();
        return matchesQuery && matchesType;
    });

    if (showAssignPage) {
        return (
            <div className={`space-y-6 animate-fade-in-up text-left ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {/* Back Button and Header */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            // Reset form on back
                            setSelectedTest(null);
                            setDeadline("");
                            setMaxAttempts("1");
                            setTeacherNote("");
                            setPriority("medium");
                            setShowAssignPage(false);
                        }}
                        className={`flex items-center gap-2.5 transition-colors font-semibold text-sm group w-fit ${isDark ? 'text-gray-455 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all ${isDark ? 'bg-white/5 border-white/10 group-hover:border-white/20' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        Orqaga qaytish
                    </button>
                    
                    <div className="mt-2">
                        <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Yangi vazifa tayinlash</h1>
                        <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-gray-450' : 'text-gray-500'}`}>Guruhlar uchun yangi topshiriq tayyorlang va yuboring</p>
                    </div>
                </div>

                <form onSubmit={handleAssignTest} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Test Picker (col-span-7) */}
                    <div className={`lg:col-span-7 p-6 rounded-3xl border flex flex-col gap-5 ${
                        isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                    }`}>
                        <div className="space-y-3">
                            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                1. Testni tanlang
                            </label>
                            
                            {/* Type Filter Buttons */}
                            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-gray-100/50 dark:bg-[#2C2C2C]/50 border border-gray-200/50 dark:border-white/5">
                                {[
                                    { key: 'all', label: 'Barchasi' },
                                    { key: 'reading', label: 'Reading' },
                                    { key: 'listening', label: 'Listening' },
                                    { key: 'writing', label: 'Writing' },
                                    { key: 'mock_full', label: 'Mock' }
                                ].map(t => {
                                    const isActive = testTypeFilter === t.key;
                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setTestTypeFilter(t.key)}
                                            className={`flex-1 min-w-[70px] text-center py-2 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                isActive
                                                    ? 'bg-white dark:bg-[#1E1E1E] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/10'
                                                    : 'text-gray-500 dark:text-gray-450 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search Input */}
                            <div className="relative">
                                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Test nomini yozing..."
                                    value={searchTestQuery}
                                    onChange={e => setSearchTestQuery(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all duration-200 ${
                                        isDark 
                                            ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'
                                    }`}
                                />
                            </div>

                            {/* List of tests to select */}
                            <div className={`border rounded-2xl overflow-y-auto custom-scrollbar p-1.5 space-y-1.5 h-[380px] ${
                                isDark ? 'bg-[#2C2C2C]/50 border-white/10' : 'bg-gray-50 border-gray-205'
                            }`}>
                                {filteredAvailableTests.length > 0 ? (
                                    filteredAvailableTests.map(test => {
                                        const isSelected = selectedTest?.id === test.id;
                                        const { icon, colorClass } = getTestIconAndColor(test.type);
                                        return (
                                            <div
                                                key={test.id}
                                                onClick={() => setSelectedTest(test)}
                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                                                    isSelected 
                                                        ? (isDark ? 'bg-blue-600/15 border-blue-500 text-blue-400 font-bold' : 'bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-sm')
                                                        : (isDark ? 'border-transparent text-gray-300 hover:bg-white/5' : 'border-transparent text-gray-700 hover:bg-white')
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                                        {icon}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 text-left">
                                                        <span className="text-sm font-semibold truncate max-w-[320px]">{test.title || 'Untitled Test'}</span>
                                                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-bold tracking-wide mt-0.5">{test.type === 'mock_full' ? 'Mock Exam' : test.type}</span>
                                                    </div>
                                                </div>
                                                
                                                {isSelected && <CheckCircle size={20} weight="fill" className="text-blue-500 shrink-0" />}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs opacity-50 p-6 text-center font-semibold">Bunday test topilmadi</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Settings & Submit (col-span-5) */}
                    <div className={`lg:col-span-5 p-6 rounded-3xl border flex flex-col justify-between gap-5 min-h-[500px] ${
                        isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                    }`}>
                        <div className="space-y-4.5">
                            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                2. Sozlamalar
                            </label>

                            {/* Group Select */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Users size={14} className="text-gray-400 shrink-0" /> Guruhni tanlang
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedGroupId}
                                        onChange={e => setSelectedGroupId(e.target.value)}
                                        className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm font-semibold outline-none appearance-none cursor-pointer transition-all duration-200 ${
                                            isDark 
                                                ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                                                : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm'
                                        }`}
                                    >
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <CaretDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Deadline */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Clock size={14} className="text-gray-400 shrink-0" /> Deadline (Muddati)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none transition-all duration-200 ${
                                        isDark 
                                            ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm'
                                    }`}
                                />
                            </div>

                            {/* Max Attempts Stepper */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <ArrowsCounterClockwise size={14} className="text-gray-400 shrink-0" /> Maksimal urinishlar
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={Number(maxAttempts) <= 1}
                                        onClick={() => setMaxAttempts(prev => String(Math.max(1, Number(prev) - 1)))}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-lg active:scale-95 transition-all ${
                                            isDark 
                                                ? 'bg-[#2C2C2C] border-white/10 text-white hover:bg-white/5 disabled:opacity-40' 
                                                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-40 shadow-sm'
                                        }`}
                                    >
                                        <Minus size={16} weight="bold" />
                                    </button>
                                    <span className={`w-12 text-center text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {maxAttempts}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={Number(maxAttempts) >= 10}
                                        onClick={() => setMaxAttempts(prev => String(Math.min(10, Number(prev) + 1)))}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-lg active:scale-95 transition-all ${
                                            isDark 
                                                ? 'bg-[#2C2C2C] border-white/10 text-white hover:bg-white/5 disabled:opacity-40' 
                                                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-40 shadow-sm'
                                        }`}
                                    >
                                        <Plus size={16} weight="bold" />
                                    </button>
                                </div>
                            </div>

                            {/* Priority Level */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Warning size={14} className="text-gray-400 shrink-0" /> Muhimlik darajasi
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'low', label: 'Past', icon: <ShieldWarning size={13} className="text-emerald-500" />, activeClass: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                                        { key: 'medium', label: 'O\'rtacha', icon: <Warning size={13} className="text-amber-500" />, activeClass: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                                        { key: 'high', label: 'Yuqori', icon: <Flame size={13} className="text-rose-500" />, activeClass: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400' }
                                    ].map(item => {
                                        const isSelected = priority === item.key;
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setPriority(item.key)}
                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                                    isSelected ? item.activeClass : (isDark ? 'border-white/5 text-gray-450 bg-[#2C2C2C]/50 hover:bg-white/5' : 'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 shadow-sm')
                                                }`}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Teacher Note / Instructions */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    O'quvchilarga eslatma / izoh
                                </label>
                                <textarea
                                    value={teacherNote}
                                    onChange={e => setTeacherNote(e.target.value)}
                                    placeholder="Masalan: Testning har bir qismini diqqat bilan o'qing va yangi lug'atlarni yozib boring..."
                                    rows={3}
                                    className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none resize-none transition-all duration-200 ${
                                        isDark 
                                            ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-gray-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder-gray-400 shadow-sm'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-dashed border-gray-200 dark:border-white/10">
                            <button
                                type="submit"
                                disabled={assigning || !selectedTest}
                                className={`w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                    ${assigning || !selectedTest
                                        ? 'bg-blue-650/50 cursor-not-allowed text-white/70'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98]'
                                    }
                                `}
                            >
                                {assigning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Vazifani tayinlash"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    if (showMonitorPage && monitoringTest) {
        return (
            <div className={`space-y-6 animate-fade-in-up text-left ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {/* Back Button and Header */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            setMonitoringTest(null);
                            setShowMonitorPage(false);
                        }}
                        className={`flex items-center gap-2.5 transition-colors font-semibold text-sm group w-fit ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all ${isDark ? 'bg-white/5 border-white/10 group-hover:border-white/20' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        Orqaga qaytish
                    </button>
                    
                    <div className="mt-2">
                        <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Test monitoringi</h1>
                        <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Test: <span className="font-bold text-blue-600 dark:text-blue-400">{monitoringTest.title}</span> | Guruh: <span className="font-bold">{monitoringTest.groupName}</span>
                        </p>
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border overflow-hidden ${
                    isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs font-semibold">
                            <thead>
                                <tr className={`border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-150 bg-gray-50'}`}>
                                    <th className="py-4 px-6 rounded-l-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">O'quvchi</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Status</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Ball / Natija</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Topshirilgan Sana</th>
                                    <th className="py-4 px-6 text-center rounded-r-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Amal</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                {students.filter(s => s.groupId === monitoringTest.groupId).length > 0 ? (
                                    students.filter(s => s.groupId === monitoringTest.groupId).map(student => {
                                        // Find result for this test & student
                                        const resDoc = results.find(r => 
                                            String(r.testId).trim() === String(monitoringTest.id).trim() && 
                                            r.userId === student.id
                                        );
                                        const submitted = !!resDoc;
                                        const submitDate = resDoc?.date ? (resDoc.date.toDate ? resDoc.date.toDate() : new Date(resDoc.date)).toLocaleDateString() : "-";
                                        const score = resDoc ? (resDoc.bandScore || resDoc.score) : "-";

                                        return (
                                            <tr key={student.id} className={isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'}>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.fullName}</span>
                                                        <span className="text-[11px] text-gray-400 font-medium mt-0.5">{student.email || student.phoneNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                                                        submitted 
                                                            ? (isDark ? 'bg-emerald-500/10 text-emerald-405 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                                            : (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-55/50 text-amber-600 border-amber-200')
                                                    }`}>
                                                        {submitted ? "Topshirdi" : "Kutilmoqda"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={submitted ? "font-bold text-blue-500 font-mono text-sm" : "text-gray-400 dark:text-zinc-500"}>
                                                        {score}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center text-gray-400 dark:text-zinc-550">
                                                    {submitDate}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {submitted ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (monitoringTest.type === 'writing' || monitoringTest.type === 'mock_full') {
                                                                    navigate('/teacher/writing-review', { state: { selectedId: resDoc.id } });
                                                                } else {
                                                                    navigate(`/review/${resDoc.id}`);
                                                                }
                                                            }}
                                                            className={`px-3.5 py-1.5 rounded-xl border font-semibold hover:bg-opacity-95 active:scale-95 transition-all text-xs ${
                                                                isDark 
                                                                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/20 hover:bg-blue-600/30' 
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm'
                                                            }`}
                                                        >
                                                            Ko'rish
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-zinc-600 font-bold">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-400 dark:text-zinc-500">Guruhda talaba yo'q</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Test tayinlash</h1>
                    <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Guruhlaringizga Reading, Listening, Writing yoki Mock testlarini biriktiring va topshirish jarayonini kuzating.
                    </p>
                </div>
                
                <button
                    onClick={() => {
                        if (groups.length > 0) setSelectedGroupId(groups[0].id);
                        setShowAssignPage(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} weight="bold" />
                    Yangi test tayinlash
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-t-transparent border-blue-650 rounded-full animate-spin" />
                </div>
            ) : assignedTests.length === 0 ? (
                <div className={`rounded-3xl border p-16 text-center ${isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-150 shadow-sm'}`}>
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-400 dark:text-zinc-500 opacity-40" />
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Hozircha hech qanday test tayinlanmagan</p>
                    <p className="text-sm mt-1.5 text-gray-400 dark:text-zinc-500">Yangi test biriktirish uchun yuqoridagi tugmani bosing.</p>
                </div>
            ) : (
                /* Assigned Tests Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedTests.map((assign, i) => {
                        const isExpired = assign.deadline && new Date(assign.deadline) < new Date();
                        const typeColor = getTypeColor(assign.type);
                        
                        // Compute statistics
                        const groupStudentIds = assign.studentIds || [];
                        const groupResults = results.filter(r => 
                            String(r.testId).trim() === String(assign.id).trim() && 
                            groupStudentIds.includes(r.userId)
                        );
                        const submittedCount = new Set(groupResults.map(r => r.userId)).size;
                        const totalStudents = groupStudentIds.length;
                        const pct = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

                        return (
                            <div
                                key={`${assign.id}-${i}`}
                                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                                    isDark 
                                        ? 'bg-[#2C2C2C]/50 border-white/5 hover:border-white/10' 
                                        : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                                }`}
                                style={{
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)'
                                }}
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-4">
                                        <span className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full border ${typeColor}`}>
                                            {assign.type === 'mock_full' ? 'Mock Exam' : assign.type}
                                        </span>
                                        
                                        <button
                                            onClick={() => handleUnassignTest(assign)}
                                            className={`p-2 rounded-xl border opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all ${
                                                isDark ? 'border-white/5 text-gray-400' : 'border-gray-200 text-gray-500 bg-gray-50'
                                            }`}
                                            title="Tayinlovni o'chirish"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>

                                    <h3 className={`font-bold text-base line-clamp-2 mb-4 leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {assign.title}
                                    </h3>

                                    <div className="space-y-2.5 text-xs font-semibold text-gray-400 mb-6">
                                        <p className="flex items-center gap-2">
                                            <Users size={15} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                            <span className="text-gray-400 dark:text-zinc-550">Guruh:</span> 
                                            <span className={isDark ? 'text-gray-200 font-bold' : 'text-gray-800 font-bold'}>{assign.groupName}</span>
                                        </p>
                                        
                                        <p className="flex items-center gap-2">
                                            <Clock size={15} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                            <span className="text-gray-400 dark:text-zinc-550">Muddat:</span> 
                                            {assign.deadline ? (
                                                <span className={isExpired ? 'text-rose-500 font-bold' : (isDark ? 'text-gray-200' : 'text-gray-800')}>
                                                    {new Date(assign.deadline).toLocaleDateString()} {isExpired && "(Muddati o'tgan)"}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cheksiz muddat</span>
                                            )}
                                        </p>

                                        <p className="flex items-center gap-2">
                                            <Info size={15} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                            <span className="text-gray-400 dark:text-zinc-550">Urinishlar:</span> 
                                            <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>{assign.maxAttempts} marta</span>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    {/* Progress */}
                                    <div className="space-y-2 mb-5">
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-gray-500 dark:text-zinc-400">Topshirish</span>
                                            <span className={isDark ? 'text-white font-bold' : 'text-gray-900 font-bold'}>
                                                {submittedCount}/{totalStudents} o'quvchi ({pct}%)
                                            </span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden w-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    pct === 100 
                                                        ? 'bg-emerald-500' 
                                                        : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                                }`} 
                                                style={{ width: `${pct}%` }} 
                                            />
                                        </div>
                                    </div>

                                    {/* Action button to monitor */}
                                    <button
                                        onClick={() => {
                                            setMonitoringTest(assign);
                                            setShowMonitorPage(true);
                                        }}
                                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 active:scale-[0.98] ${
                                            isDark 
                                                ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/25' 
                                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100 shadow-sm'
                                        }`}
                                    >
                                        <Eye size={16} weight="bold" />
                                        Monitoringni ko'rish
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
        </div>
    );
}
