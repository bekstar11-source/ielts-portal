import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, addDoc, doc, updateDoc,
    arrayUnion, query, orderBy, deleteDoc, where, getDoc
} from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import UserDetailPanel from '../components/admin/UserDetailPanel';

// Icons
import {
    Search, Filter, UserCheck, Users, Layers, BookOpen,
    Calendar, ChevronDown, Check, X, Trash2, Plus,
    MoreVertical, Edit2, Eye, Shield, Lock, Unlock, Clock
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
            flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium
            ${active === id
                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200')
                : (theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')}
        `}
    >
        <Icon size={16} />
        {label}
    </button>
);

const CustomDateInput = forwardRef(({ value, onClick, placeholder, disabled, theme }, ref) => (
    <div
        onClick={!disabled ? onClick : undefined}
        ref={ref}
        className={`
            flex items-center justify-between w-full h-10 px-3 rounded-xl border transition-all cursor-pointer
            ${theme === 'dark'
                ? 'bg-[#2C2C2C] border-white/5 text-white hover:border-white/10'
                : 'bg-white border-gray-200 text-gray-900 hover:border-blue-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <span className={`text-xs ${!value && 'opacity-50'}`}>{value || placeholder}</span>
        <Calendar size={14} className="opacity-50" />
    </div>
));

// --- MAIN PAGE ---
export default function AdminUsers() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testSets, setTestSets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Refresh Data
    const refreshData = async () => {
        setLoading(true);
        try {
            const [u, g, t, s] = await Promise.all([
                getDocs(query(collection(db, 'users'), where('role', '!=', 'admin'))),
                getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'testSets'), orderBy('createdAt', 'desc'))),
            ]);
            setStudents(u.docs.map(d => ({ id: d.id, ...d.data() })));
            setGroups(g.docs.map(d => ({ id: d.id, ...d.data() })));
            setAllTests(t.docs.map(d => ({ id: d.id, ...d.data() })));
            setTestSets(s.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { refreshData(); }, []);

    return (
        <div className={`h-full flex flex-col font-sans ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <style>{customDatepickerStyles}</style>

            {/* HEADER & TABS */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Foydalanuvchilar Boshqaruvi</h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>O'quvchilar, guruhlar va tayinlovlar</p>
                </div>
                <div className={`flex p-1 rounded-2xl ${isDark ? 'bg-[#2C2C2C]' : 'bg-gray-100'}`}>
                    <TabButton id="students" active={activeTab} onClick={setActiveTab} label="O'quvchilar" icon={Users} theme={theme} />
                    <TabButton id="groups" active={activeTab} onClick={setActiveTab} label="Guruhlar" icon={Layers} theme={theme} />
                    <TabButton id="assign" active={activeTab} onClick={setActiveTab} label="Tayinlash" icon={UserCheck} theme={theme} />
                    <TabButton id="sets" active={activeTab} onClick={setActiveTab} label="To'plamlar" icon={BookOpen} theme={theme} />
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-3xl">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {activeTab === 'students' && <SmartUserTable students={students} onRefresh={refreshData} theme={theme} />}
                {activeTab === 'groups' && <GroupsTab groups={groups} students={students} onRefresh={refreshData} theme={theme} />}
                {activeTab === 'assign' && <AssignTab students={students} groups={groups} allTests={allTests} testSets={testSets} theme={theme} />}
                {activeTab === 'sets' && <SetsTab allTests={allTests} testSets={testSets} onRefresh={refreshData} theme={theme} />}
            </div>
        </div>
    );
}

// --- TAB 1: SMART USER TABLE ---
function SmartUserTable({ students, onRefresh, theme }) {
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [filterBand, setFilterBand] = useState('all');

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = (s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesBand = filterBand === 'all' || s.targetBand === filterBand;
            return matchesSearch && matchesBand;
        });
    }, [students, searchTerm, filterBand]);

    return (
        <div className={`rounded-[24px] border h-full flex flex-col overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            {/* Toolbar */}
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-[#2C2C2C]' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
                        <Search size={16} className="text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Qidirish..."
                            className="bg-transparent border-none outline-none text-sm w-48"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterBand}
                        onChange={e => setFilterBand(e.target.value)}
                        className={`px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}
                    >
                        <option value="all">Barcha Bandlar</option>
                        {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-50">
                    Jami: {filteredStudents.length}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
                        <tr>
                            <th className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>O'quvchi</th>
                            <th className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Aloqa</th>
                            <th className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b text-center ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Target</th>
                            <th className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Sana</th>
                            <th className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b text-right ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50 border-gray-100'}`}>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${student.isBlocked ? 'text-red-500 line-through' : ''}`}>{student.fullName || "Ismsiz"}</p>
                                            <p className="text-xs opacity-50">ID: {student.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs opacity-70 flex items-center gap-2"><span className="opacity-50">@</span> {student.email}</p>
                                        {student.phoneNumber && <p className="text-xs opacity-70 flex items-center gap-2"><span className="opacity-50">#</span> {student.phoneNumber}</p>}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${isDark ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                        {student.targetBand || "-"}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    {student.examDate ? (
                                        <span className={`text-xs font-medium px-2 py-1 rounded border ${isDark ? 'border-green-500/20 text-green-400 bg-green-500/5' : 'border-green-200 text-green-700 bg-green-50'}`}>
                                            {new Date(student.examDate).toLocaleDateString()}
                                        </span>
                                    ) : <span className="text-xs opacity-30">-</span>}
                                </td>
                                <td className="py-4 px-6 text-right">
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
function GroupsTab({ groups, students, onRefresh, theme }) {
    const isDark = theme === 'dark';
    const [name, setName] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        await addDoc(collection(db, 'groups'), { name, studentIds: [], assignedTests: [], createdAt: new Date().toISOString() });
        setName(''); onRefresh();
    };

    const handleDelete = async (id) => {
        if (window.confirm("O'chirasizmi?")) {
            await deleteDoc(doc(db, 'groups', id));
            onRefresh();
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className={`p-4 rounded-[20px] border flex items-center justify-between shadow-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                <span className="font-bold text-sm ml-2">Jami: {groups.length} ta guruh</span>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Yangi guruh nomi..."
                        className={`w-64 h-10 px-4 text-sm rounded-xl outline-none border transition ${isDark ? 'bg-[#1E1E1E] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <button onClick={handleCreate} className="h-10 px-6 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                        Qo'shish
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 custom-scrollbar">
                {groups.map(g => (
                    <div key={g.id} className={`rounded-[24px] border p-6 transition group relative ${isDark ? 'bg-[#2C2C2C] border-white/5 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg">{g.name}</h3>
                            <button onClick={() => handleDelete(g.id)} className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-red-500/10 text-red-500 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Students</p>
                                <p className="text-2xl font-bold text-blue-500">{g.studentIds?.length || 0}</p>
                            </div>
                            <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Tests</p>
                                <p className="text-2xl font-bold text-purple-500">{g.assignedTests?.length || 0}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* Placeholder buttons - functionality would be similar to Assign tab */}
                            <button className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <Users size={14} /> Manage
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- TAB 3: ASSIGN ---
function AssignTab({ students, groups, allTests, testSets, theme }) {
    const isDark = theme === 'dark';
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [assignmentType, setAssignmentType] = useState('test');
    const [selectedItem, setSelectedItem] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [subTab, setSubTab] = useState('groups');
    const [noDeadline, setNoDeadline] = useState(false);
    const [isStrict, setIsStrict] = useState(false);

    const handleAssign = async () => {
        if ((!selectedGroup && selectedStudents.length === 0) || !selectedItem || (!noDeadline && (!startDate || !endDate))) {
            return alert("To'liq to'ldiring");
        }

        const sourceList = assignmentType === 'test' ? allTests : testSets;
        const selectedObj = sourceList.find(item => item.id === selectedItem);
        if (!selectedObj) return;

        const payload = {
            id: selectedItem,
            type: assignmentType === 'test' ? (selectedObj.type || 'test') : 'set',
            title: assignmentType === 'test' ? (selectedObj.title || "Nomsiz") : (selectedObj.name || "Nomsiz"),
            startDate: noDeadline ? null : startDate.toISOString(),
            endDate: noDeadline ? null : endDate.toISOString(),
            status: 'assigned',
            assignedAt: new Date().toISOString(),
            isStrict
        };

        try {
            if (selectedGroup) await updateDoc(doc(db, 'groups', selectedGroup.id), { assignedTests: arrayUnion(payload) });
            else await Promise.all(selectedStudents.map(id => updateDoc(doc(db, 'users', id), { assignedTests: arrayUnion(payload) })));
            alert("Tayinlandi!");
        } catch (e) { alert("Xato: " + e.message); }
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-full">
            {/* LEFT: Target Selection */}
            <div className={`col-span-12 md:col-span-4 rounded-[24px] border overflow-hidden flex flex-col ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'} flex justify-between items-center`}>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">1. Kimga?</span>
                    <div className={`flex p-1 rounded-lg ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100'}`}>
                        {['groups', 'individual'].map(t => (
                            <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-1 text-xs font-bold rounded-md transition ${subTab === t ? (isDark ? 'bg-[#2C2C2C] text-white shadow' : 'bg-white text-blue-600 shadow') : 'opacity-50'}`}>
                                {t === 'groups' ? 'Guruh' : 'Individual'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {subTab === 'groups' ? groups.map(g => (
                        <div
                            key={g.id}
                            onClick={() => setSelectedGroup(g)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${selectedGroup?.id === g.id ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50')}`}
                        >
                            <span className="font-bold text-sm">{g.name}</span>
                            {selectedGroup?.id === g.id && <Check size={14} className="text-blue-500" />}
                        </div>
                    )) : students.map(s => (
                        <div
                            key={s.id}
                            onClick={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                            className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${selectedStudents.includes(s.id) ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50')}`}
                        >
                            <span className="font-bold text-sm">{s.fullName}</span>
                            {selectedStudents.includes(s.id) && <Check size={14} className="text-blue-500" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Settings */}
            <div className={`col-span-12 md:col-span-8 rounded-[24px] border flex flex-col ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">2. Nima?</span>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                        <div className="w-1/3">
                            <label className="text-xs font-bold opacity-50 uppercase mb-2 block">Turi</label>
                            <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                <button onClick={() => setAssignmentType('test')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${assignmentType === 'test' ? 'bg-blue-600 text-white' : 'opacity-50'}`}>Test</button>
                                <button onClick={() => setAssignmentType('set')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${assignmentType === 'set' ? 'bg-blue-600 text-white' : 'opacity-50'}`}>To'plam</button>
                            </div>
                        </div>
                        <div className="w-2/3">
                            <label className="text-xs font-bold opacity-50 uppercase mb-2 block">Material</label>
                            <select
                                value={selectedItem}
                                onChange={e => setSelectedItem(e.target.value)}
                                className={`w-full h-[42px] px-3 rounded-xl border outline-none text-sm appearance-none ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <option value="">Tanlang...</option>
                                {(assignmentType === 'test' ? allTests : testSets).map(i => <option key={i.id} value={i.id}>{i.title || i.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={`border-t my-4 ${isDark ? 'border-white/5' : 'border-gray-100'}`}></div>

                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold opacity-50 uppercase">Sozlamalar</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isStrict} onChange={e => setIsStrict(e.target.checked)} className="hidden" />
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isStrict ? 'bg-red-500 border-red-500' : 'border-gray-500'}`}>{isStrict && <Check size={10} className="text-white" />}</div>
                                <span className={`text-xs font-bold ${isStrict ? 'text-red-500' : 'opacity-50'}`}>Strict Mode</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={noDeadline} onChange={e => setNoDeadline(e.target.checked)} className="hidden" />
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${noDeadline ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>{noDeadline && <Check size={10} className="text-white" />}</div>
                                <span className={`text-xs font-bold ${noDeadline ? 'text-blue-500' : 'opacity-50'}`}>Cheklovsiz</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <span className="text-xs opacity-50 mb-1 block">Boshlash</span>
                            <DatePicker
                                selected={startDate}
                                onChange={setStartDate}
                                showTimeSelect
                                disabled={noDeadline}
                                customInput={<CustomDateInput placeholder="Sanani tanlang" disabled={noDeadline} theme={theme} />}
                            />
                        </div>
                        <div>
                            <span className="text-xs opacity-50 mb-1 block text-red-400">Tugash (Deadline)</span>
                            <DatePicker
                                selected={endDate}
                                onChange={setEndDate}
                                showTimeSelect
                                disabled={noDeadline}
                                customInput={<CustomDateInput placeholder="Sanani tanlang" disabled={noDeadline} theme={theme} />}
                            />
                        </div>
                    </div>
                </div>
                <div className={`p-4 border-t mt-auto flex justify-end ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                    <button onClick={handleAssign} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95">
                        Tayinlash
                    </button>
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

    const handleCreate = async () => {
        if (!name.trim() || !selectedTests.length) return;
        await addDoc(collection(db, 'testSets'), { name, testIds: selectedTests, createdAt: new Date().toISOString() });
        setName(''); setSelectedTests([]); onRefresh();
    };

    const handleDelete = async (id) => { if (window.confirm("O'chirasizmi?")) { await deleteDoc(doc(db, 'testSets', id)); onRefresh(); } };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className={`rounded-[24px] border flex flex-col overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="p-4 border-b border-white/5">
                    <input
                        type="text"
                        placeholder="To'plam nomi..."
                        className={`w-full h-10 px-4 rounded-xl outline-none border transition ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                        value={name} onChange={e => setName(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                    {allTests.map(t => (
                        <div
                            key={t.id}
                            onClick={() => setSelectedTests(p => p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id])}
                            className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${selectedTests.includes(t.id) ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-white/5'}`}
                        >
                            <span className="text-sm font-medium">{t.title}</span>
                            {selectedTests.includes(t.id) && <Check size={14} className="text-blue-500" />}
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/5">
                    <button onClick={handleCreate} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Saqlash ({selectedTests.length})</button>
                </div>
            </div>

            <div className={`rounded-[24px] border flex flex-col overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="p-4 border-b border-white/5 font-bold text-sm uppercase opacity-50">Mavjud To'plamlar</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {testSets.map(s => (
                        <div key={s.id} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <div>
                                <p className="font-bold text-sm">{s.name}</p>
                                <p className="text-xs opacity-50">{s.testIds?.length} tests</p>
                            </div>
                            <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}