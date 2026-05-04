import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, addDoc, doc, updateDoc,
    arrayUnion, arrayRemove, query, orderBy, deleteDoc, where, getDoc, writeBatch,
    limit, startAfter, getCountFromServer
} from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../utils/logger';
import UserDetailPanel from '../components/admin/UserDetailPanel';
import GroupDetailPanel from '../components/admin/GroupDetailPanel';

// Icons
import {
    Search, Filter, UserCheck, Users, Layers, BookOpen,
    Calendar, ChevronDown, Check, X, Trash2, Plus,
    MoreVertical, Edit2, Eye, Shield, Lock, Unlock, Clock,
    Headphones, Book, PenTool, Mic, Globe, Zap, AlertCircle
} from 'lucide-react';

// Date Picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- CUSTOM STYLES ---
const customDatepickerStyles = `
  .react-datepicker-wrapper { width: 100%; }
  .react-datepicker { font-family: inherit; border-radius: 0.75rem; border: none; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .react-datepicker__header { border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
  .dark .react-datepicker { background-color: #2C2C2C; color: white; border: 1px solid rgba(255,255,255,0.1); }
  .dark .react-datepicker__header { background-color: #1E1E1E; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .dark .react-datepicker__current-month, .dark .react-datepicker__day-name { color: white; }
  .dark .react-datepicker__day { color: #e2e8f0; }
  .dark .react-datepicker__day:hover { background-color: #3b82f6; color: white; }
  .dark .react-datepicker__day--selected { background-color: #3b82f6; color: white; }
`;

// --- COMPONENTS ---

const TabButton = ({ id, active, onClick, icon: Icon, label, theme }) => (
    <button
        onClick={() => onClick(id)}
        className={`
            flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-bold whitespace-nowrap
            ${active === id
                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200')
                : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}
        `}
    >
        <Icon size={14} />
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const CustomDateInput = forwardRef(({ value, onClick, placeholder, disabled, theme }, ref) => (
    <div
        onClick={!disabled ? onClick : undefined}
        ref={ref}
        className={`
            flex items-center justify-between w-full h-8 px-2 rounded-lg border transition-all cursor-pointer
            ${theme === 'dark'
                ? 'bg-[#2C2C2C] border-white/5 text-white hover:border-white/10'
                : 'bg-white border-gray-200 text-gray-900 hover:border-blue-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <span className={`text-[11px] font-bold ${!value && 'opacity-50'}`}>{value || placeholder}</span>
        <Calendar size={12} className="opacity-50" />
    </div>
));

// --- MAIN PAGE ---
export default function AdminUsers() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testSets, setTestSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMoreStudents, setHasMoreStudents] = useState(true);
    const [totalStudents, setTotalStudents] = useState(0);

    // Refresh Data
    const refreshData = async () => {
        setLoading(true);
        try {
            const [teacherSnap, g, t, s] = await Promise.all([
                getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
                getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'testSets'), orderBy('createdAt', 'desc'))),
            ]);

            // All Users (Paginated, filtered in JS for now to prevent missing users without createdAt)
            const userQuery = query(
                collection(db, 'users')
            );
            const u = await getDocs(userQuery);
            const allFetchedUsers = u.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort in JS to include users without createdAt
            allFetchedUsers.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            
            // Total Users Count (Simple)
            const countSnap = await getCountFromServer(collection(db, 'users'));
            setTotalStudents(countSnap.data().count);

            // Filter out admins/teachers in JS
            const studentList = allFetchedUsers.filter(user => user.role !== 'admin' && user.role !== 'teacher');
            setStudents(studentList);
            setLastDoc(u.docs[u.docs.length - 1]);
            setHasMoreStudents(u.docs.length === 100);

            setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setGroups(g.docs.map(d => ({ id: d.id, ...d.data() })));
            setAllTests(t.docs.map(d => ({ id: d.id, ...d.data() })));
            setTestSets(s.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const loadMoreStudents = async () => {
        if (!lastDoc || !hasMoreStudents) return;
        setLoading(true);
        try {
            const nextQuery = query(
                collection(db, 'users'),
                startAfter(lastDoc),
                limit(100)
            );
            const snap = await getDocs(nextQuery);
            const newUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Filter and append
            const newStudents = newUsers.filter(user => user.role !== 'admin' && user.role !== 'teacher');
            
            setStudents(prev => {
                const combined = [...prev, ...newStudents];
                // Optional: overall sort if preferred, but usually load more just appends
                return combined;
            });
            setLastDoc(snap.docs[snap.docs.length - 1]);
            setHasMoreStudents(snap.docs.length === 100);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { refreshData(); }, []);

    return (
        <div className={`h-full flex flex-col font-sans transition-colors duration-200 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            <style>{customDatepickerStyles}</style>

            {/* HEADER & TABS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 md:mb-4">
                <div className="flex items-center gap-3">
                    <h1 className={`text-lg md:text-xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Boshqaruv</h1>
                    <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-gray-200'} hidden sm:block`} />
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'} hidden md:block`}>Users & Groups</p>
                </div>
                <div className={`flex p-1 rounded-xl w-full sm:w-auto no-scrollbar transition-colors ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100/80 border border-gray-200/50'}`}>
                    <TabButton id="students" active={activeTab} onClick={setActiveTab} label="O'quvchilar" icon={Users} theme={theme} />
                    <TabButton id="groups" active={activeTab} onClick={setActiveTab} label="Guruhlar" icon={Layers} theme={theme} />
                    <TabButton id="assign" active={activeTab} onClick={setActiveTab} label="Tayinlash" icon={UserCheck} theme={theme} />
                    <TabButton id="sets" active={activeTab} onClick={setActiveTab} label="To'plamlar" icon={BookOpen} theme={theme} />
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <SmartUserTable 
                        students={students} 
                        onRefresh={refreshData} 
                        theme={theme} 
                        hasMore={hasMoreStudents} 
                        onLoadMore={loadMoreStudents}
                        totalCount={totalStudents}
                    />
                )}
                {activeTab === 'groups' && <GroupsTab groups={groups} students={students} teachers={teachers} onRefresh={refreshData} theme={theme} />}
                {activeTab === 'assign' && <AssignTab students={students} groups={groups} allTests={allTests} testSets={testSets} theme={theme} />}
                {activeTab === 'sets' && <SetsTab allTests={allTests} testSets={testSets} onRefresh={refreshData} theme={theme} />}
            </div>
        </div>
    );
}

// --- TAB 1: SMART USER TABLE ---
function SmartUserTable({ students, onRefresh, theme, hasMore, onLoadMore, totalCount }) {
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [filterBand, setFilterBand] = useState('all');

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = (
                s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.id?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesBand = filterBand === 'all' || s.targetBand === filterBand;
            return matchesSearch && matchesBand;
        });
    }, [students, searchTerm, filterBand]);

    return (
        <div className={`rounded-xl border h-full flex flex-col overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            {/* Toolbar (Apple Design Refined) */}
            <div className={`p-3 md:p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className={`flex items-center px-4 py-2.5 rounded-xl transition-all group ${isDark ? 'bg-white/5 focus-within:bg-white/[0.08]' : 'bg-white border border-gray-200 focus-within:border-blue-400'}`}>
                        <Search size={16} className={`mr-2 transition-colors ${isDark ? 'text-gray-600 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                        <input
                            type="text"
                            placeholder="Qidirish..."
                            className="bg-transparent border-none outline-none text-sm w-full sm:w-48 font-medium placeholder:text-gray-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={filterBand}
                            onChange={e => setFilterBand(e.target.value)}
                            className={`pl-4 pr-10 py-2.5 rounded-xl border-none outline-none appearance-none cursor-pointer text-sm font-medium transition-all ${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/[0.08]' : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'}`}
                        >
                            <option value="all">Barcha Bandlar</option>
                            {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
                <div className={`text-[11px] font-bold uppercase tracking-widest opacity-40 self-end sm:self-auto ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: {students.length} / {totalCount}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
                        <tr>
                            <th className={`py-3 px-4 md:px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>O'quvchi</th>
                            <th className={`hidden md:table-cell py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Aloqa</th>
                            <th className={`py-3 px-4 md:px-6 text-xs font-bold uppercase tracking-wider border-b text-center ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Target</th>
                            <th className={`hidden sm:table-cell py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Sana</th>
                            <th className={`py-3 px-4 md:px-6 text-xs font-bold uppercase tracking-wider border-b text-right ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50 border-gray-100'}`}>
                                <td className="py-4 px-4 md:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm shrink-0">
                                            {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-bold text-sm truncate ${student.isBlocked ? 'text-red-500 line-through' : ''}`}>{student.fullName || "Ismsiz"}</p>
                                            <p className="text-[10px] md:text-xs opacity-50 truncate">ID: {student.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden md:table-cell py-4 px-6">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs opacity-70 flex items-center gap-2"><span className="opacity-50">@</span> {student.email}</p>
                                        {student.phoneNumber && <p className="text-xs opacity-70 flex items-center gap-2"><span className="opacity-50">#</span> {student.phoneNumber}</p>}
                                    </div>
                                </td>
                                <td className="py-4 px-4 md:px-6 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold ${isDark ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            {student.targetBand || "-"}
                                        </span>
                                        {student.accountType === 'pro' && (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-tighter">
                                                <Crown size={8} fill="currentColor" /> Pro
                                            </span>
                                        )}
                                        {student.accountType === 'standard' && (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase tracking-tighter">
                                                <Zap size={8} fill="currentColor" /> Standard
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell py-4 px-6">
                                    {student.examDate ? (
                                        <span className={`text-xs font-medium px-2 py-1 rounded border ${isDark ? 'border-green-500/20 text-green-400 bg-green-500/5' : 'border-green-200 text-green-700 bg-green-50'}`}>
                                            {new Date(student.examDate).toLocaleDateString()}
                                        </span>
                                    ) : <span className="text-xs opacity-30">-</span>}
                                </td>
                                <td className="py-4 px-4 md:px-6 text-right">
                                    <button
                                        onClick={() => { setSelectedUser(student); setShowDetailPanel(true); }}
                                        className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'}`}
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredStudents.length === 0 && (
                    <div className="p-12 text-center opacity-30 text-sm">O'quvchi topilmadi</div>
                )}
            </div>

            {hasMore && (
                <div className={`p-4 border-t flex justify-center transition-colors ${isDark ? 'border-white/5 bg-[#1E1E1E]' : 'border-gray-100 bg-gray-50'}`}>

                    <button
                        onClick={onLoadMore}
                        className={`
                            px-6 py-2 rounded-xl text-sm font-bold transition-all
                            ${isDark 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
                                : 'bg-white border border-gray-200 text-blue-600 hover:bg-gray-50 shadow-sm'}
                        `}
                    >
                        Yanada ko'proq yuklash
                    </button>
                </div>
            )}

            <UserDetailPanel
                user={selectedUser}
                isOpen={showDetailPanel}
                onClose={() => setShowDetailPanel(false)}
                onUpdate={() => { onRefresh(); setShowDetailPanel(false); }}
            />
        </div>
    );
}

// --- TAB 2: GROUPS ---
function GroupsTab({ groups, students, teachers, onRefresh, theme }) {
    const isDark = theme === 'dark';
    const [name, setName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showPanel, setShowPanel] = useState(false);
    const [assigningTeacherFor, setAssigningTeacherFor] = useState(null); // group id
    const [teacherDropdown, setTeacherDropdown] = useState(''); // selected teacher uid
    const [savingTeacher, setSavingTeacher] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        await addDoc(collection(db, 'groups'), { name, studentIds: [], assignedTests: [], teacherIds: [], createdAt: new Date().toISOString() });
        setName(''); onRefresh();
    };

    const handleDelete = async (id) => {
        if (window.confirm("O'chirasizmi?")) {
            await deleteDoc(doc(db, 'groups', id));
            onRefresh();
        }
    };

    const handleAssignTeacher = async (group) => {
        if (!teacherDropdown) return alert('Ustoz tanlang');
        setSavingTeacher(true);
        try {
            // Add teacher to group's teacherIds array
            const currentTeacherIds = group.teacherIds || [];
            if (currentTeacherIds.includes(teacherDropdown)) {
                return alert('Bu ustoz allaqachon bu guruhda');
            }
            await updateDoc(doc(db, 'groups', group.id), {
                teacherIds: arrayUnion(teacherDropdown)
            });
            // Add groupId to teacher's assignedGroupIds
            await updateDoc(doc(db, 'users', teacherDropdown), {
                assignedGroupIds: arrayUnion(group.id)
            });
            setAssigningTeacherFor(null);
            setTeacherDropdown('');
            onRefresh();
        } catch (e) {
            alert('Xato: ' + e.message);
        } finally {
            setSavingTeacher(false);
        }
    };

    const handleRemoveTeacher = async (group, teacherId) => {
        if (!window.confirm("Ustozni guruhdan olib tashlaysizmi?")) return;
        try {
            await updateDoc(doc(db, 'groups', group.id), {
                teacherIds: (group.teacherIds || []).filter(id => id !== teacherId)
            });
            await updateDoc(doc(db, 'users', teacherId), {
                assignedGroupIds: (teachers.find(t => t.id === teacherId)?.assignedGroupIds || []).filter(id => id !== group.id)
            });
            onRefresh();
        } catch (e) {
            alert('Xato: ' + e.message);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
                <span className="font-bold text-sm ml-2">Jami: {groups.length} ta guruh</span>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Yangi guruh nomi..."
                        className={`flex-1 sm:w-64 h-10 px-4 text-sm rounded-xl outline-none border transition ${isDark ? 'bg-[#1E1E1E] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <button onClick={handleCreate} className="h-10 px-4 sm:px-6 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                        Qo'shish
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 custom-scrollbar">
                {groups.map(g => {
                    const groupTeachers = (g.teacherIds || []).map(tid => teachers.find(t => t.id === tid)).filter(Boolean);
                    return (
                        <div key={g.id} className={`rounded-xl border p-5 transition-all group relative ${isDark ? 'bg-[#1E1E1E] border-white/5 hover:border-blue-500/50 shadow-lg' : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'}`}>

                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg">{g.name}</h3>
                                <button onClick={() => handleDelete(g.id)} className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-red-500/10 text-red-500 rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Students</p>
                                    <p className="text-2xl font-bold text-blue-500">{g.studentIds?.length || 0}</p>
                                </div>
                                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Tests</p>
                                    <p className="text-2xl font-bold text-purple-500">{g.assignedTests?.length || 0}</p>
                                </div>
                            </div>

                            {/* Teacher Section */}
                            <div className="mb-4">
                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ustoz(lar)</p>
                                {groupTeachers.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {groupTeachers.map(t => (
                                            <div key={t.id} className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">
                                                        {t.fullName?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-semibold text-emerald-600">{t.fullName}</span>
                                                </div>
                                                <button onClick={() => handleRemoveTeacher(g, t.id)} className="text-red-400 hover:text-red-500 p-0.5 transition">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs opacity-30 italic">Ustoz tayinlanmagan</p>
                                )}

                                {/* Teacher Assignment Dropdown */}
                                {assigningTeacherFor === g.id ? (
                                    <div className="mt-2 flex gap-2">
                                        <select
                                            value={teacherDropdown}
                                            onChange={e => setTeacherDropdown(e.target.value)}
                                            className={`flex-1 h-9 px-2 text-xs rounded-xl border outline-none ${isDark ? 'bg-[#1E1E1E] border-white/5 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                        >
                                            <option value="">Ustoz tanlang...</option>
                                            {teachers.filter(t => !(g.teacherIds || []).includes(t.id)).map(t => (
                                                <option key={t.id} value={t.id}>{t.fullName}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAssignTeacher(g)}
                                            disabled={savingTeacher}
                                            className="h-9 px-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition"
                                        >
                                            {savingTeacher ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                        </button>
                                        <button
                                            onClick={() => { setAssigningTeacherFor(null); setTeacherDropdown(''); }}
                                            className={`h-9 px-2 rounded-xl text-xs transition ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setAssigningTeacherFor(g.id); setTeacherDropdown(''); }}
                                        className={`mt-2 w-full h-8 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${isDark ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                                    >
                                        <Plus size={13} /> Ustoz tayinlash
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setSelectedGroup(g); setShowPanel(true); }}
                                    className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Users size={14} /> Boshqarish
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <GroupDetailPanel
                group={selectedGroup}
                isOpen={showPanel}
                onClose={() => setShowPanel(false)}
                onUpdate={onRefresh}
                allStudents={students}
            />
        </div>
    );
}

// --- TAB 3: ASSIGN ---
function AssignTab({ students, groups, allTests, testSets, theme }) {
    const isDark = theme === 'dark';
    const { user } = useAuth();
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [subTab, setSubTab] = useState('groups');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchUser, setSearchUser] = useState('');
    const [assignmentType, setAssignmentType] = useState('test');
    const [materialTypeFilter, setMaterialTypeFilter] = useState('all');
    const [searchMaterial, setSearchMaterial] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isStrict, setIsStrict] = useState(false);
    const [noDeadline, setNoDeadline] = useState(false);
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const filteredMaterials = useMemo(() => {
        const source = assignmentType === 'test' ? allTests : testSets;
        return source.filter(item => {
            const name = assignmentType === 'test' ? item.title : item.name;
            const matchesSearch = name?.toLowerCase().includes(searchMaterial.toLowerCase());
            const matchesType = assignmentType === 'set' || materialTypeFilter === 'all' || (item.type || '').toLowerCase() === materialTypeFilter.toLowerCase();
            return matchesSearch && matchesType;
        });
    }, [allTests, testSets, assignmentType, searchMaterial, materialTypeFilter]);

    const handleAssign = async () => {
        if ((!selectedGroup && selectedStudents.length === 0) || selectedItems.length === 0 || (!noDeadline && (!startDate || !endDate))) {
            return alert("Iltimos, barcha maydonlarni to'ldiring");
        }
        const sourceList = assignmentType === 'test' ? allTests : testSets;
        try {
            const batch = writeBatch(db);
            const assignments = selectedItems.map(itemId => {
                const selectedObj = sourceList.find(item => item.id === itemId);
                if (!selectedObj) return null;
                return {
                    id: itemId,
                    type: assignmentType === 'test' ? (selectedObj.type || 'test') : 'set',
                    title: assignmentType === 'test' ? (selectedObj.title || "Nomsiz") : (selectedObj.name || "Nomsiz"),
                    startDate: noDeadline ? null : startDate.toISOString(),
                    endDate: noDeadline ? null : endDate.toISOString(),
                    status: 'assigned',
                    assignedAt: new Date().toISOString(),
                    isStrict,
                    maxAttempts: parseInt(maxAttempts) || 1
                };
            }).filter(Boolean);

            if (assignments.length === 0) return;

            if (selectedGroup) {
                await updateDoc(doc(db, 'groups', selectedGroup.id), { assignedTests: arrayUnion(...assignments) });
                logAction(user.uid, 'ASSIGN_TEST', { target: 'group', targetId: selectedGroup.id, assignments });
                const teacherIds = selectedGroup.teacherIds || [];
                if (teacherIds.length > 0) {
                    const teacherAssignments = assignments.map(a => ({ ...a, assignedByAdmin: true }));
                    teacherIds.forEach(tid => {
                        batch.update(doc(db, 'users', tid), { assignedTests: arrayUnion(...teacherAssignments) });
                    });
                    await batch.commit();
                }
            } else {
                selectedStudents.forEach(id => {
                    batch.update(doc(db, 'users', id), { assignedTests: arrayUnion(...assignments) });
                });
                await batch.commit();
                logAction(user.uid, 'ASSIGN_TEST', { target: 'students', count: selectedStudents.length, assignments });
            }
            alert("Muvaffaqiyatli tayinlandi!");
            setSelectedItems([]);
            setSelectedStudents([]);
            setSelectedGroup(null);
        } catch (e) { alert("Xatolik: " + e.message); }
    };

    const getTypeIcon = (type) => {
        switch(type?.toLowerCase()) {
            case 'listening': return <Headphones size={14} />;
            case 'reading': return <Book size={14} />;
            case 'writing': return <PenTool size={14} />;
            case 'speaking': return <Mic size={14} />;
            default: return <Layers size={14} />;
        }
    };

    return (
        <div className="relative flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-4 pb-24 md:pb-0 overflow-y-auto md:overflow-hidden p-1">
                
                {/* 1. TARGET SELECTION */}
                <div className={`col-span-12 lg:col-span-3 flex flex-col rounded-xl overflow-hidden border transition-all duration-500 ${isDark ? 'bg-[#1E1E1E]/80 border-white/5 shadow-2xl shadow-black/20' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
                    <div className={`p-3 border-b backdrop-blur-md ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-50 bg-gray-50/50'} flex justify-between items-center`}>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">1</div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Kimga?</span>
                        </div>
                        <div className={`flex p-1 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-gray-100'}`}>
                            {['groups', 'individual'].map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => { setSubTab(t); setSelectedGroup(null); setSelectedStudents([]); }} 
                                    className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all duration-300 ${subTab === t ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white text-blue-600 shadow-md') : 'opacity-40 hover:opacity-100'}`}
                                >
                                    {t === 'groups' ? 'Guruh' : 'Yakka'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 border-b">
                        <div className={`flex items-center px-3 h-10 rounded-xl border transition-all duration-300 group ${isDark ? 'bg-[#121212] border-white/5 focus-within:border-blue-500/50' : 'bg-gray-50 border-gray-100 focus-within:border-blue-400'}`}>
                            <Search size={14} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={subTab === 'groups' ? "Guruh..." : "Qidirish..."}
                                className="bg-transparent border-none outline-none text-xs w-full ml-2 placeholder:opacity-50"
                                value={searchUser}
                                onChange={e => setSearchUser(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {subTab === 'groups' ? (
                            groups.filter(g => g.name.toLowerCase().includes(searchUser.toLowerCase())).map(g => (
                                <div
                                    key={g.id}
                                    onClick={() => setSelectedGroup(g)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group overflow-hidden ${selectedGroup?.id === g.id ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50 hover:border-blue-200')}`}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedGroup?.id === g.id ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                                                <Users size={14} />
                                            </div>
                                            <span className="font-bold text-xs tracking-tight">{g.name}</span>
                                        </div>
                                        {selectedGroup?.id === g.id && <Check size={16} className="text-blue-500 animate-in zoom-in duration-300" />}
                                    </div>
                                </div>
                            ))
                        ) : (
                            students.filter(s => s.fullName?.toLowerCase().includes(searchUser.toLowerCase())).map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group overflow-hidden ${selectedStudents.includes(s.id) ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50 hover:border-blue-200')}`}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedStudents.includes(s.id) ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                <UserCheck size={14} />
                                            </div>
                                            <span className="font-bold text-xs tracking-tight">{s.fullName}</span>
                                        </div>
                                        {selectedStudents.includes(s.id) && <Check size={16} className="text-blue-500 animate-in zoom-in duration-300" />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. MATERIAL & SETTINGS */}
                <div className={`col-span-12 lg:col-span-9 flex flex-col rounded-xl overflow-hidden border transition-all duration-500 ${isDark ? 'bg-[#1E1E1E]/80 border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
                    <div className={`p-3 border-b flex flex-wrap justify-between items-center gap-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50/50 border-gray-50'}`}>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-[10px] font-bold">2</div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Nima?</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <div className={`flex p-1 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-gray-100'}`}>
                                <button onClick={() => { setAssignmentType('test'); setSearchMaterial(''); }} className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${assignmentType === 'test' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>Test</button>
                                <button onClick={() => { setAssignmentType('set'); setSearchMaterial(''); }} className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${assignmentType === 'set' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>To'plam</button>
                            </div>
                            
                            {assignmentType === 'test' && (
                                <div className="relative">
                                    <select
                                        value={materialTypeFilter}
                                        onChange={(e) => setMaterialTypeFilter(e.target.value)}
                                        className={`pl-3 pr-8 py-1.5 rounded-lg text-[9px] uppercase font-bold appearance-none cursor-pointer outline-none transition-all ${isDark ? 'bg-[#121212] text-white border border-white/5' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}
                                    >
                                        {['all', 'listening', 'reading', 'writing', 'speaking'].map(type => (
                                            <option key={type} value={type}>
                                                {type === 'all' ? 'Hammasi' : type}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                        {/* Settings - Moved up and compacted */}
                        <div className={`p-3 rounded-xl border space-y-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[10px] font-bold">3</div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Sozlamalar</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsStrict(!isStrict)} className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all ${isStrict ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-gray-500/20 opacity-50 hover:opacity-80'}`}>
                                        {isStrict ? <Zap size={12} /> : <AlertCircle size={12} />}
                                        <span className="text-[9px] font-bold uppercase">Strict</span>
                                    </button>
                                    <button onClick={() => setNoDeadline(!noDeadline)} className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all ${noDeadline ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-gray-500/20 opacity-50 hover:opacity-80'}`}>
                                        <Clock size={12} />
                                        <span className="text-[9px] font-bold uppercase">Muddatsiz</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Attempts */}
                                <div className="w-24">
                                    <label className="text-[9px] font-bold uppercase opacity-40 ml-1">Urinishlar</label>
                                    <div className={`h-8 flex items-center px-2 rounded-lg border transition-all ${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-gray-200'}`}>
                                        <input type="number" min="1" className="bg-transparent border-none outline-none w-full text-xs font-bold" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} />
                                    </div>
                                </div>

                                {/* Date Start */}
                                <div className="w-36">
                                    <label className="text-[9px] font-bold uppercase opacity-40 ml-1">Boshlanish</label>
                                    <DatePicker selected={startDate} onChange={setStartDate} showTimeSelect disabled={noDeadline} customInput={<CustomDateInput placeholder="Boshlanish" disabled={noDeadline} theme={theme} />} />
                                </div>

                                {/* Date End */}
                                <div className="w-36">
                                    <label className="text-[9px] font-bold uppercase opacity-40 ml-1 text-red-400">Tugash</label>
                                    <DatePicker selected={endDate} onChange={setEndDate} showTimeSelect disabled={noDeadline} customInput={<CustomDateInput placeholder="Deadline" disabled={noDeadline} theme={theme} />} />
                                </div>

                                {/* Search Material - Moved Here */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-[9px] font-bold uppercase opacity-40 ml-1">Material Qidirish</label>
                                    <div className={`flex items-center px-3 h-8 rounded-lg border transition-all group ${isDark ? 'bg-[#121212] border-white/5 focus-within:border-blue-500/50' : 'bg-white border-gray-100 focus-within:border-blue-400'}`}>
                                        <Search size={12} className="text-gray-400 group-focus-within:text-blue-500" />
                                        <input
                                            type="text"
                                            placeholder="Qidirish..."
                                            className="bg-transparent border-none outline-none text-xs w-full ml-2 placeholder:opacity-50 font-medium"
                                            value={searchMaterial}
                                            onChange={e => setSearchMaterial(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            <div className={`rounded-lg border overflow-hidden p-1 ${isDark ? 'bg-[#121212]/50 border-white/5' : 'bg-gray-50/50 border-gray-100'}`}>
                                <div className="max-h-[300px] overflow-y-auto p-0.5 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {filteredMaterials.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                                            className={`p-2 rounded-lg border cursor-pointer transition-all duration-300 flex justify-between items-center group ${selectedItems.includes(item.id) ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20' : (isDark ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-white bg-white hover:border-blue-100 shadow-sm')}`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center transition-all ${selectedItems.includes(item.id) ? 'bg-blue-500 text-white' : 'bg-gray-500/10 text-gray-500'}`}>
                                                    {getTypeIcon(item.type)}
                                                </div>
                                                <span className="text-[11px] font-bold truncate tracking-tight">{assignmentType === 'test' ? (item.title || "Nomsiz") : (item.name || "Nomsiz")}</span>
                                            </div>
                                            {selectedItems.includes(item.id) && <Check size={12} className="text-blue-500 ml-1 shrink-0 animate-in zoom-in duration-300" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAssign} 
                                className={`px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2`}
                            >
                                <Check size={12} />
                                <span className="text-[10px] font-bold">Tayinlash {selectedItems.length > 0 && `(${selectedItems.length})`}</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- TAB 4: SETS ---
function SetsTab({ allTests, testSets, onRefresh, theme }) {
    const isDark = theme === 'dark';
    const [name, setName] = useState('');
    const [selectedTests, setSelectedTests] = useState([]);
    const [searchTest, setSearchTest] = useState('');
    const [editingSetId, setEditingSetId] = useState(null);

    const resetForm = () => {
        setName('');
        setSelectedTests([]);
        setSearchTest('');
        setEditingSetId(null);
    };

    const handleCreateOrUpdate = async () => {
        if (!name.trim() || !selectedTests.length) return;
        try {
            if (editingSetId) {
                await updateDoc(doc(db, 'testSets', editingSetId), {
                    name,
                    testIds: selectedTests,
                    updatedAt: new Date().toISOString()
                });
                alert("To'plam yangilandi!");
            } else {
                await addDoc(collection(db, 'testSets'), {
                    name,
                    testIds: selectedTests,
                    createdAt: new Date().toISOString()
                });
                alert("To'plam yaratildi!");
            }
            resetForm();
            onRefresh();
        } catch (error) {
            console.error(error);
            alert("Xatolik yuz berdi");
        }
    };

    const handleEdit = (set) => {
        setName(set.name);
        setSelectedTests(set.testIds || []);
        setEditingSetId(set.id);
    };

    const handleDelete = async (id) => {
        if (window.confirm("O'chirasizmi?")) {
            try {
                await deleteDoc(doc(db, 'testSets', id));
                if (editingSetId === id) resetForm();
                onRefresh();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const filteredTests = allTests.filter(t =>
        t.title?.toLowerCase().includes(searchTest.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* LEFT: Create Set */}
            <div className={`rounded-xl border flex flex-col overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className={`p-4 border-b space-y-3 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <input
                        type="text"
                        placeholder="To'plam nomi..."
                        className={`w-full h-10 px-4 rounded-xl outline-none border transition ${isDark ? 'bg-[#1E1E1E] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <Search size={16} className="text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Testlarni qidirish..."
                            className="bg-transparent border-none outline-none text-sm w-full"
                            value={searchTest}
                            onChange={e => setSearchTest(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                    {filteredTests.length > 0 ? (
                        filteredTests.map(t => (
                            <div
                                key={t.id}
                                onClick={() => setSelectedTests(p => p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id])}
                                className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${selectedTests.includes(t.id)
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : (isDark ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50')
                                    }`}
                            >
                                <span className="text-sm font-medium line-clamp-1">{t.title}</span>
                                {selectedTests.includes(t.id) && <Check size={14} className="text-blue-500 shrink-0" />}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs opacity-50">Test topilmadi</div>
                    )}
                </div>

                <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'} flex gap-2`}>
                    <button
                        onClick={handleCreateOrUpdate}
                        disabled={!name.trim() || !selectedTests.length}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
                    >
                        {editingSetId ? `Yangilash (${selectedTests.length})` : `Saqlash (${selectedTests.length})`}
                    </button>
                    {editingSetId && (
                        <button
                            onClick={resetForm}
                            className={`px-4 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition flex items-center justify-center`}
                            title="Bekor qilish"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT: Existing Sets */}
            <div className={`rounded-xl border flex flex-col overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className={`p-4 border-b font-bold text-sm uppercase opacity-50 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    Mavjud To'plamlar
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {testSets.length > 0 ? (
                        testSets.map(s => (
                            <div key={s.id} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-100'} ${editingSetId === s.id ? (isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50') : ''}`}>
                                <div>
                                    <p className="font-bold text-sm">{s.name}</p>
                                    <p className="text-xs opacity-50">{s.testIds?.length || 0} ta test</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEdit(s)} className={`p-2 rounded-lg transition ${editingSetId === s.id ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-500/10'}`}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-xs opacity-50 mt-10">To'plamlar yo'q</div>
                    )}
                </div>
            </div>
        </div>
    );
}