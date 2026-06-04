import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import { doc, getDoc, getDocs, query, where, collection, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
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
  Info
} from '@phosphor-icons/react';

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

    // Modals visibility
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showMonitorModal, setShowMonitorModal] = useState(false);
    const [monitoringTest, setMonitoringTest] = useState(null);

    // Assign form states
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [searchTestQuery, setSearchTestQuery] = useState("");
    const [testTypeFilter, setTestTypeFilter] = useState("all");
    const [selectedTest, setSelectedTest] = useState(null);
    const [deadline, setDeadline] = useState("");
    const [maxAttempts, setMaxAttempts] = useState("1");
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (userData) {
            fetchData();
        }
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const groupIds = userData?.assignedGroupIds || [];
            if (!groupIds.length) {
                setLoading(false);
                return;
            }

            // 1. Fetch group documents
            const groupDocs = await Promise.all(
                groupIds.map(id => getDoc(doc(db, 'groups', id)))
            );
            const fetchedGroups = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetchedGroups);

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
                maxAttempts: Number(maxAttempts) || 1
            };

            await updateDoc(doc(db, 'groups', selectedGroupId), {
                assignedTests: arrayUnion(newAssignment)
            });

            alert("Test muvaffaqiyatli tayinlandi! 🎯");
            setShowAssignModal(false);
            // Reset form
            setSelectedTest(null);
            setDeadline("");
            setMaxAttempts("1");
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

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Test Tayinlash</h1>
                    <p className={`text-sm mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-550'}`}>
                        Guruhlaringizga Reading, Listening, Writing yoki Mock testlarini biriktiring va topshirish jarayonini kuzating.
                    </p>
                </div>
                
                <button
                    onClick={() => {
                        if (groups.length > 0) setSelectedGroupId(groups[0].id);
                        setShowAssignModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} weight="bold" />
                    Yangi Test Tayinlash
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-t-transparent border-blue-650 rounded-full animate-spin" />
                </div>
            ) : assignedTests.length === 0 ? (
                <div className={`rounded-[32px] border p-16 text-center ${isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-150 shadow-sm'}`}>
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-450 opacity-40" />
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-955'}`}>Hozircha hech qanday test tayinlanmagan</p>
                    <p className="text-sm mt-1.5 text-gray-400">Yangi test biriktirish uchun yuqoridagi tugmani bosing.</p>
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
                                className={`rounded-[28px] border p-6 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
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
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${typeColor}`}>
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

                                    <h3 className={`font-black text-base line-clamp-2 mb-3 leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {assign.title}
                                    </h3>

                                    <div className="space-y-2 text-xs font-semibold text-gray-400 mb-5">
                                        <p className="flex items-center gap-1.5">
                                            <Users size={14} className="text-gray-455 opacity-60" />
                                            <span className="opacity-60">Guruh:</span> 
                                            <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{assign.groupName}</span>
                                        </p>
                                        
                                        <p className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-gray-455 opacity-60" />
                                            <span className="opacity-60">Muddat:</span> 
                                            {assign.deadline ? (
                                                <span className={isExpired ? 'text-rose-500 font-bold' : (isDark ? 'text-gray-200' : 'text-gray-700')}>
                                                    {new Date(assign.deadline).toLocaleDateString()} {isExpired && "(Muddati o'tgan)"}
                                                </span>
                                            ) : (
                                                <span className={isDark ? 'text-emerald-450' : 'text-emerald-700'}>Cheksiz muddat</span>
                                            )}
                                        </p>

                                        <p className="flex items-center gap-1.5">
                                            <Info size={14} className="text-gray-455 opacity-60" />
                                            <span className="opacity-60">Urinishlar:</span> 
                                            <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{assign.maxAttempts} marta</span>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    {/* Progress */}
                                    <div className="space-y-1.5 mb-5">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-550'}>Topshirish</span>
                                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{submittedCount}/{totalStudents}</span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden w-full ${isDark ? 'bg-white/5' : 'bg-gray-150'}`}>
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
                                            setShowMonitorModal(true);
                                        }}
                                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                                            isDark 
                                                ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/25' 
                                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100'
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

            {/* ASSIGN TEST MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
                    
                    <div 
                        className={`relative w-full max-w-xl rounded-[32px] border shadow-2xl overflow-hidden p-6 z-10 flex flex-col max-h-[90vh] ${
                            isDark ? 'bg-[#1E1E1E] border-white/15' : 'bg-white border-gray-250'
                        }`}
                    >
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-500/10">
                            <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Yangi Test Tayinlash</h2>
                            <button onClick={() => setShowAssignModal(false)} className={`p-2 rounded-xl hover:bg-gray-500/10 text-gray-405 transition-colors`}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignTest} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {/* Group Select */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Guruhni tanlang</label>
                                <div className="relative">
                                    <select
                                        value={selectedGroupId}
                                        onChange={e => setSelectedGroupId(e.target.value)}
                                        className={`w-full p-3 rounded-2xl border text-sm font-medium outline-none appearance-none cursor-pointer ${
                                            isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500'
                                        }`}
                                    >
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <CaretDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Search and Select Test */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Testni tanlang</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {/* Search Input */}
                                    <div className="relative flex-1 min-w-[200px]">
                                        <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-450" />
                                        <input
                                            type="text"
                                            placeholder="Test nomini yozing..."
                                            value={searchTestQuery}
                                            onChange={e => setSearchTestQuery(e.target.value)}
                                            className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                                                isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-850 focus:border-blue-500'
                                            }`}
                                        />
                                    </div>
                                    {/* Type filter */}
                                    <div className="relative min-w-[130px]">
                                        <select
                                            value={testTypeFilter}
                                            onChange={e => setTestTypeFilter(e.target.value)}
                                            className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none appearance-none cursor-pointer ${
                                                isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-850 focus:border-blue-500'
                                            }`}
                                        >
                                            <option value="all">Barcha turlar</option>
                                            <option value="reading">Reading</option>
                                            <option value="listening">Listening</option>
                                            <option value="writing">Writing</option>
                                            <option value="mock_full">Mock Exam</option>
                                        </select>
                                        <CaretDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-455 pointer-events-none" />
                                    </div>
                                </div>

                                {/* List of tests to select */}
                                <div className={`border rounded-2xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 space-y-1.5 ${
                                    isDark ? 'bg-[#2C2C2C]/50 border-white/10' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    {filteredAvailableTests.length > 0 ? (
                                        filteredAvailableTests.map(test => {
                                            const isSelected = selectedTest?.id === test.id;
                                            return (
                                                <div
                                                    key={test.id}
                                                    onClick={() => setSelectedTest(test)}
                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                                                        isSelected 
                                                            ? (isDark ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold' : 'bg-blue-50 border-blue-200 text-blue-700 font-bold')
                                                            : (isDark ? 'border-transparent text-gray-300 hover:bg-white/5' : 'border-transparent text-gray-700 hover:bg-white')
                                                    }`}
                                                >
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs truncate max-w-[320px]">{test.title || 'Untitled Test'}</span>
                                                        <span className="text-[10px] text-gray-455 uppercase font-black tracking-wider mt-0.5">{test.type === 'mock_full' ? 'Mock Exam' : test.type}</span>
                                                    </div>
                                                    
                                                    {isSelected && <CheckCircle size={18} className="text-blue-500 shrink-0" />}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs opacity-50 p-4 text-center">Bunday test topilmadi</p>
                                    )}
                                </div>
                            </div>

                            {/* Additional Settings */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Deadline */}
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Deadline (Muddati)</label>
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className={`w-full p-3 rounded-xl border text-xs font-medium outline-none ${
                                            isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500'
                                        }`}
                                    />
                                </div>

                                {/* Max attempts */}
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-505'}`}>Maksimal urinishlar soni</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={maxAttempts}
                                        onChange={e => setMaxAttempts(e.target.value)}
                                        className={`w-full p-3 rounded-xl border text-xs font-medium outline-none ${
                                            isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500'
                                        }`}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={assigning || !selectedTest}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {assigning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Tayinlash"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MONITORING MODAL */}
            {showMonitorModal && monitoringTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMonitorModal(false)} />
                    
                    <div 
                        className={`relative w-full max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden p-6 z-10 flex flex-col max-h-[85vh] ${
                            isDark ? 'bg-[#1E1E1E] border-white/15' : 'bg-white border-gray-200'
                        }`}
                    >
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-500/10">
                            <div className="min-w-0">
                                <h2 className={`text-lg font-black truncate max-w-[400px] ${isDark ? 'text-white' : 'text-gray-900'}`}>{monitoringTest.title}</h2>
                                <p className="text-xs text-gray-450 mt-0.5">Guruh: <span className="font-bold">{monitoringTest.groupName}</span></p>
                            </div>
                            <button onClick={() => setShowMonitorModal(false)} className={`p-2 rounded-xl hover:bg-gray-500/10 text-gray-405 transition-colors`}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs font-semibold">
                                <thead>
                                    <tr className={`border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-150 bg-gray-50'}`}>
                                        <th className="py-3 px-4">O'quvchi</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-center">Ball / Natija</th>
                                        <th className="py-3 px-4 text-center">Topshirilgan Sana</th>
                                        <th className="py-3 px-4 text-center">Amal</th>
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
                                                    <td className="py-3.5 px-4 font-bold">
                                                        <div className="flex flex-col">
                                                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{student.fullName}</span>
                                                            <span className="text-[10px] text-gray-450 font-medium mt-0.5">{student.email || student.phoneNumber}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${
                                                            submitted 
                                                                ? (isDark ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-250')
                                                                : (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-emerald-250')
                                                        }`}>
                                                            {submitted ? "Topshirdi" : "Kutilmoqda"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={submitted ? "font-bold text-blue-500 font-mono" : "text-gray-400"}>
                                                            {score}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center text-gray-405">
                                                        {submitDate}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        {submitted ? (
                                                            <button
                                                                onClick={() => {
                                                                    setShowMonitorModal(false);
                                                                    if (monitoringTest.type === 'writing' || monitoringTest.type === 'mock_full') {
                                                                        navigate('/teacher/writing-review', { state: { selectedId: resDoc.id } });
                                                                    } else {
                                                                        navigate(`/review/${resDoc.id}`);
                                                                    }
                                                                }}
                                                                className={`px-3 py-1 rounded-lg border font-bold hover:scale-95 transition-all ${
                                                                    isDark 
                                                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/20 hover:bg-blue-600/30' 
                                                                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                                }`}
                                                            >
                                                                Ko'rish
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 opacity-50">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-450 opacity-60">Guruhda talaba yo'q</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
