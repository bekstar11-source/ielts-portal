import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { 
  collection, getDocs, addDoc, doc, updateDoc, 
  arrayUnion, query, orderBy, deleteDoc, where, getDoc 
} from 'firebase/firestore';

// Ikonkalar (FaLock qo'shildi)
import { FaUserCheck, FaUsers, FaLayerGroup, FaArrowLeft, FaSearch, FaCheck, FaTrash, FaPlus, FaTimes, FaCalendarAlt, FaChevronDown, FaEye, FaEdit, FaLock } from 'react-icons/fa';
import { MdOutlineQuiz, MdDateRange, MdTimerOff } from "react-icons/md";

// Date Picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- CUSTOM CSS ---
const customDatepickerStyles = `
  .react-datepicker-wrapper { width: 100%; }
  .react-datepicker { font-family: inherit; border: 1px solid #e2e8f0; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .react-datepicker__header { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
  .react-datepicker__day--selected { background-color: #4f46e5 !important; border-radius: 0.5rem; }
  .react-datepicker__day:hover { background-color: #e0e7ff !important; border-radius: 0.5rem; }
  .react-datepicker__triangle { display: none; }
`;

// --- UTILS ---
const scrollbarStyle = "scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 pr-1";

// --- COMPONENTS ---

// 1. Custom Date Input
const CustomDateInput = forwardRef(({ value, onClick, placeholder, disabled }, ref) => (
    <div onClick={!disabled ? onClick : undefined} ref={ref} className={`group flex items-center justify-between w-full h-10 px-3 bg-white border border-slate-200 rounded-lg transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'}`}>
        <span className={`text-sm font-medium ${value ? 'text-slate-700' : 'text-slate-400'}`}>
            {value || placeholder}
        </span>
        {!disabled && <FaCalendarAlt className="text-slate-400 group-hover:text-indigo-500 transition-colors w-3.5 h-3.5" />}
    </div>
));

// 2. Tab Button
const TabButton = ({ id, active, onClick, icon, label }) => (
    <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 h-9 rounded-lg transition-all text-sm font-medium ${active === id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
        {icon} {label}
    </button>
);

// --- MODAL 1: GROUP MEMBERS ---
const GroupMembersModal = ({ group, allStudents, onClose, onSave }) => {
    const [selectedIds, setSelectedIds] = useState(group.studentIds || []);
    const [searchTerm, setSearchTerm] = useState("");

    const toggleStudent = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const filteredStudents = allStudents.filter(s => s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl h-[70vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="h-14 px-5 border-b flex justify-between items-center bg-white">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{group.name} a'zolari</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FaTimes/></button>
                </div>
                <div className="p-3 border-b bg-slate-50">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400"/>
                        <input type="text" placeholder="Qidirish..." className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-2 ${scrollbarStyle}`}>
                    {filteredStudents.map(student => {
                        const isSelected = selectedIds.includes(student.id);
                        return (
                            <div key={student.id} onClick={() => toggleStudent(student.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>{isSelected && <FaCheck className="w-2.5 h-2.5 text-white"/>}</div>
                                <div className="text-sm">
                                    <span className="font-semibold text-slate-700">{student.fullName}</span>
                                    <span className="text-slate-400 text-xs ml-2">{student.email}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 h-9 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">Bekor qilish</button>
                    <button onClick={() => onSave(group.id, selectedIds)} className="px-4 h-9 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition active:scale-95">Saqlash ({selectedIds.length})</button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL 2: GROUP ASSIGNED TESTS ---
const GroupTestsModal = ({ group, onClose, onRemoveTest }) => {
    const assignedTests = group.assignedTests || [];

    const formatDate = (dateString) => {
        if (!dateString) return "Cheklovsiz";
        return new Date(dateString).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="h-14 px-5 border-b flex justify-between items-center bg-white">
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{group.name} - Biriktirilgan Testlar</h2>
                        <p className="text-xs text-slate-400">{assignedTests.length} ta material</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FaTimes/></button>
                </div>
                <div className={`flex-1 overflow-y-auto p-4 ${scrollbarStyle} bg-slate-50`}>
                    {assignedTests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                            <MdOutlineQuiz className="w-12 h-12 mb-2"/>
                            <p className="text-sm">Hozircha testlar yo'q</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignedTests.map((test, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-indigo-300 transition group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${test.type === 'set' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                {test.type === 'set' ? "To'plam" : "Test"}
                                            </span>
                                            <h3 className="font-bold text-slate-700 text-sm">{test.title}</h3>
                                            {test.isStrict && <FaLock className="text-red-500 w-3 h-3 ml-1" title="Majburiy Rejim" />}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if(window.confirm(`Rostdan ham "${test.title}" ni bu guruhdan o'chirmoqchimisiz?`)) {
                                                    onRemoveTest(group.id, index);
                                                }
                                            }}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition"
                                            title="O'chirish"
                                        >
                                            <FaTrash className="w-4 h-4"/>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <MdDateRange className="text-green-500"/>
                                            <span>Boshlash: <b>{formatDate(test.startDate)}</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <MdDateRange className="text-red-500"/>
                                            <span>Tugash: <b>{formatDate(test.endDate)}</b></span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 pt-2 border-t border-dashed mt-1 flex justify-between">
                                        <span>ID: {test.id}</span>
                                        <span>Tayinlandi: {formatDate(test.assignedAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-white flex justify-end">
                    <button onClick={onClose} className="px-6 h-9 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-black transition shadow-sm">Yopish</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const AdminUsers = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('assign'); 
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testSets, setTestSets] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        try {
            const [u, g, t, s] = await Promise.all([
                getDocs(query(collection(db, 'users'), where('role', '!=', 'admin'))),
                getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'testSets'), orderBy('createdAt', 'desc'))),
            ]);
            setStudents(u.docs.map(d => ({id: d.id, ...d.data()})));
            setGroups(g.docs.map(d => ({id: d.id, ...d.data()})));
            setAllTests(t.docs.map(d => ({id: d.id, ...d.data()})));
            setTestSets(s.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { refreshData(); }, []);

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
            <style>{customDatepickerStyles}</style>
            
            <header className="bg-white border-b border-slate-200 h-14 flex-none z-20">
                <div className="max-w-[1600px] mx-auto h-full px-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/admin')} className="text-slate-500 hover:text-slate-800 transition"><FaArrowLeft className="w-4 h-4"/></button>
                        <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <FaUserCheck className="text-indigo-600"/> Tayinlash Paneli
                        </h1>
                        <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
                        <div className="flex bg-slate-100/50 p-1 rounded-lg">
                            <TabButton id="assign" active={activeTab} onClick={setActiveTab} label="Tayinlash" />
                            <TabButton id="groups" active={activeTab} onClick={setActiveTab} label="Guruhlar" />
                            <TabButton id="sets" active={activeTab} onClick={setActiveTab} label="To'plamlar" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative max-w-[1600px] mx-auto w-full p-4">
                {loading && <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
                {activeTab === 'assign' && <AssignTab students={students} groups={groups} allTests={allTests} testSets={testSets} />}
                {activeTab === 'groups' && <GroupsTab groups={groups} students={students} onRefresh={refreshData} />}
                {activeTab === 'sets' && <SetsTab allTests={allTests} testSets={testSets} onRefresh={refreshData} />}
            </div>
        </div>
    );
};

// --- TAB 1: ASSIGN (YANGILANGAN: STRICT MODE) ---
const AssignTab = ({ students, groups, allTests, testSets }) => {
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [assignmentType, setAssignmentType] = useState('test');
    const [selectedItem, setSelectedItem] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [subTab, setSubTab] = useState('groups');
    
    // 🔥 NEW STATES
    const [noDeadline, setNoDeadline] = useState(false);
    const [isStrict, setIsStrict] = useState(false); // Majburiy rejim

    const targetLabel = useMemo(() => {
        if (selectedGroup) return { text: selectedGroup.name, count: selectedGroup.studentIds?.length || 0 };
        if (selectedStudents.length) return { text: `${selectedStudents.length} ta o'quvchi`, count: selectedStudents.length };
        return null;
    }, [selectedGroup, selectedStudents]);

    const handleAssign = async () => {
        if (!targetLabel || !selectedItem || (!noDeadline && (!startDate || !endDate))) {
            return alert("Iltimos, barcha maydonlarni to'ldiring.");
        }
        
        const sourceList = assignmentType === 'test' ? allTests : testSets;
        const selectedObj = sourceList.find(item => item.id === selectedItem);

        if (!selectedObj) return alert("Xatolik: Tanlangan material topilmadi.");

        const payload = { 
            id: selectedItem, 
            type: assignmentType === 'test' ? (selectedObj.type || 'test') : 'set',
            title: assignmentType === 'test' ? (selectedObj.title || "Nomsiz") : (selectedObj.name || "Nomsiz"),
            questionsCount: selectedObj.questions?.length || 0,
            startDate: noDeadline ? null : startDate.toISOString(), 
            endDate: noDeadline ? null : endDate.toISOString(), 
            status: 'assigned', 
            assignedAt: new Date().toISOString(),
            isStrict: isStrict // 🔥 Yangi maydon bazaga ketadi
        };

        try {
            if (selectedGroup) await updateDoc(doc(db, 'groups', selectedGroup.id), { assignedTests: arrayUnion(payload) });
            else await Promise.all(selectedStudents.map(id => updateDoc(doc(db, 'users', id), { assignedTests: arrayUnion(payload) })));
            alert("Muvaffaqiyatli tayinlandi! ✅");
            setSelectedItem(''); setStartDate(null); setEndDate(null); setNoDeadline(false); setIsStrict(false);
        } catch (e) { alert("Xatolik: " + e.message); }
    };

    const filteredStudents = students.filter(s => s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="grid grid-cols-12 gap-4 h-full">
            <div className="col-span-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
                <div className="h-12 border-b flex items-center px-4 bg-slate-50 justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">1. Qabul qiluvchi</span>
                    <div className="flex bg-slate-200/50 p-0.5 rounded-md">
                        {['groups', 'individual'].map(t => (
                            <button key={t} onClick={() => { setSubTab(t); setSelectedGroup(null); setSelectedStudents([]); }} className={`px-3 py-1 text-xs font-bold rounded transition ${subTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                                {t === 'groups' ? 'Guruh' : 'O\'quvchi'}
                            </button>
                        ))}
                    </div>
                </div>
                {subTab === 'individual' && (
                    <div className="p-2 border-b"><input type="text" placeholder="Qidirish..." className="w-full h-8 px-3 text-sm bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-indigo-400" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                )}
                <div className={`flex-1 overflow-y-auto p-2 space-y-1 ${scrollbarStyle}`}>
                    {subTab === 'groups' ? groups.map(g => (
                        <div key={g.id} onClick={() => { setSelectedGroup(g); setSelectedStudents([]); }} className={`flex justify-between items-center px-3 py-2.5 rounded-md border cursor-pointer transition ${selectedGroup?.id === g.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                            <div><p className={`text-sm font-semibold ${selectedGroup?.id === g.id ? 'text-indigo-700' : 'text-slate-700'}`}>{g.name}</p><p className="text-xs text-slate-400">{g.studentIds?.length} o'quvchi</p></div>
                            {selectedGroup?.id === g.id && <FaCheck className="text-indigo-600 w-3 h-3"/>}
                        </div>
                    )) : filteredStudents.map(s => {
                        const active = selectedStudents.includes(s.id);
                        return (
                            <div key={s.id} onClick={() => setSelectedStudents(prev => active ? prev.filter(x => x !== s.id) : [...prev, s.id])} className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition ${active ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>{active && <FaCheck className="w-2 h-2 text-white"/>}</div>
                                <div className="truncate"><p className="text-sm font-medium text-slate-700">{s.fullName}</p><p className="text-[10px] text-slate-400">{s.email}</p></div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="col-span-8 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-fit">
                <div className="h-12 border-b flex items-center px-5 bg-slate-50 justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">2. Sozlamalar</span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{targetLabel ? targetLabel.text : "Tanlanmagan"}</span>
                </div>

                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Turi</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg h-10 border border-slate-200">
                                <button onClick={() => setAssignmentType('test')} className={`flex-1 text-xs font-bold rounded-md transition ${assignmentType === 'test' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Test</button>
                                <button onClick={() => setAssignmentType('set')} className={`flex-1 text-xs font-bold rounded-md transition ${assignmentType === 'set' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>To'plam</button>
                            </div>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Materialni tanlang</label>
                            <div className="relative">
                                <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-700 appearance-none cursor-pointer">
                                    <option value="">-- Tanlang --</option>
                                    {(assignmentType === 'test' ? allTests : testSets).map(i => (<option key={i.id} value={i.id}>{i.title || i.name}</option>))}
                                </select>
                                <FaChevronDown className="absolute right-3 top-3.5 text-slate-400 text-xs pointer-events-none"/>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* 🔥 SANA VA CHEKLOVSIZ MODE */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Test Vaqti va Holati</label>
                            
                            <div className="flex gap-4">
                                {/* Majburiy Rejim */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition ${isStrict ? 'bg-red-600 border-red-600' : 'bg-white border-slate-300'}`}>
                                        {isStrict && <FaCheck className="text-white w-2.5 h-2.5"/>}
                                    </div>
                                    <input type="checkbox" checked={isStrict} onChange={e => setIsStrict(e.target.checked)} className="hidden"/>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-red-600 select-none flex items-center gap-1">
                                        <FaLock className="w-3 h-3"/> Majburiy (Strict)
                                    </span>
                                </label>

                                {/* Muddat yo'q checkboxi */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition ${noDeadline ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                        {noDeadline && <FaCheck className="text-white w-2.5 h-2.5"/>}
                                    </div>
                                    <input type="checkbox" checked={noDeadline} onChange={e => setNoDeadline(e.target.checked)} className="hidden"/>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 select-none flex items-center gap-1">
                                        <MdTimerOff className="w-3.5 h-3.5"/> Muddat yo'q
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <p className="text-[10px] text-slate-400 mb-1">Boshlanish</p>
                                <DatePicker 
                                    selected={startDate} 
                                    onChange={setStartDate} 
                                    showTimeSelect 
                                    timeFormat="HH:mm" 
                                    timeIntervals={15} 
                                    dateFormat="dd.MM.yyyy, HH:mm" 
                                    disabled={noDeadline} 
                                    customInput={<CustomDateInput placeholder={noDeadline ? "Cheklovsiz" : "Sanani tanlang"} disabled={noDeadline} />} 
                                />
                            </div>
                            <div>
                                <p className="text-[10px] text-red-300 mb-1">Tugash (Deadline)</p>
                                <DatePicker 
                                    selected={endDate} 
                                    onChange={setEndDate} 
                                    showTimeSelect 
                                    timeFormat="HH:mm" 
                                    timeIntervals={15} 
                                    dateFormat="dd.MM.yyyy, HH:mm" 
                                    disabled={noDeadline} 
                                    customInput={<CustomDateInput placeholder={noDeadline ? "Cheklovsiz" : "Sanani tanlang"} disabled={noDeadline} />} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 border-t flex justify-end items-center gap-4">
                    <p className="text-xs text-slate-400 font-medium">{targetLabel ? `${targetLabel.count} ta o'quvchiga yuboriladi` : ''}</p>
                    <button onClick={handleAssign} disabled={!targetLabel || !selectedItem || (!noDeadline && (!startDate || !endDate))} className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-sm transition active:scale-95 flex items-center gap-2">
                        <FaCheck/> Tayinlash
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- TAB 2: GROUPS (O'ZGARMADI) ---
const GroupsTab = ({ groups, students, onRefresh }) => {
    const [name, setName] = useState('');
    const [editingGroup, setEditingGroup] = useState(null);
    const [viewingTestsGroup, setViewingTestsGroup] = useState(null);
    const [editingNameId, setEditingNameId] = useState(null);
    const [editNameValue, setEditNameValue] = useState("");

    const handleCreate = async () => { if(!name.trim()) return; await addDoc(collection(db, 'groups'), { name, studentIds: [], assignedTests: [], createdAt: new Date().toISOString() }); setName(''); onRefresh(); };
    const handleDelete = async (id) => { if(window.confirm("O'chirasizmi?")) { await deleteDoc(doc(db, 'groups', id)); onRefresh(); } };
    
    const handleRemoveTest = async (groupId, testIndex) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const currentTests = groupSnap.data().assignedTests || [];
                const updatedTests = currentTests.filter((_, index) => index !== testIndex);
                await updateDoc(groupRef, { assignedTests: updatedTests });
                onRefresh();
                setViewingTestsGroup(prev => ({ ...prev, assignedTests: updatedTests }));
            }
        } catch (e) { alert("Xatolik: " + e.message); }
    };

    const handleRenameGroup = async (groupId) => {
        if (!editNameValue.trim()) return;
        try {
            await updateDoc(doc(db, 'groups', groupId), { name: editNameValue });
            setEditingNameId(null);
            onRefresh();
        } catch (e) { alert("Xatolik: " + e.message); }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between">
                <span className="font-bold text-slate-700 text-sm ml-2">{groups.length} ta guruh mavjud</span>
                <div className="flex gap-2">
                    <input type="text" placeholder="Guruh nomi..." className="w-64 h-9 px-3 text-sm border rounded-lg outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)}/>
                    <button onClick={handleCreate} className="h-9 px-4 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700">Qo'shish</button>
                </div>
            </div>
            <div className={`grid grid-cols-3 gap-4 overflow-y-auto pb-10 ${scrollbarStyle}`}>
                {groups.map(g => (
                    <div key={g.id} className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition group">
                        <div className="flex justify-between items-start mb-3">
                            {editingNameId === g.id ? (
                                <div className="flex items-center gap-2 w-full mr-2">
                                    <input autoFocus className="w-full h-7 px-2 text-sm border border-indigo-300 rounded outline-none focus:ring-1 focus:ring-indigo-500" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameGroup(g.id)} />
                                    <button onClick={() => handleRenameGroup(g.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><FaCheck/></button>
                                    <button onClick={() => setEditingNameId(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><FaTimes/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group/title">
                                    <h3 className="font-bold text-slate-800 text-sm">{g.name}</h3>
                                    <button onClick={() => { setEditingNameId(g.id); setEditNameValue(g.name); }} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover/title:opacity-100 transition p-1"><FaEdit className="w-3 h-3"/></button>
                                </div>
                            )}
                            <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-500"><FaTrash className="w-3.5 h-3.5"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div onClick={() => setEditingGroup(g)} className="bg-slate-50 p-2 rounded text-center cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition"><p className="text-xs text-slate-500">O'quvchi</p><p className="text-sm font-bold text-indigo-600">{g.studentIds?.length || 0}</p></div>
                            <div onClick={() => setViewingTestsGroup(g)} className="bg-slate-50 p-2 rounded text-center cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition"><p className="text-xs text-slate-500">Testlar</p><p className="text-sm font-bold text-indigo-600">{g.assignedTests?.length || 0}</p></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingGroup(g)} className="flex-1 h-9 border border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg text-xs transition flex items-center justify-center gap-1"><FaUsers /> A'zolar</button>
                            <button onClick={() => setViewingTestsGroup(g)} className="flex-1 h-9 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-lg text-xs transition flex items-center justify-center gap-1"><FaEye /> Testlar</button>
                        </div>
                    </div>
                ))}
            </div>
            {editingGroup && <GroupMembersModal group={editingGroup} allStudents={students} onClose={() => setEditingGroup(null)} onSave={async (gid, sids) => { await updateDoc(doc(db, 'groups', gid), { studentIds: sids }); onRefresh(); setEditingGroup(null); }} />}
            {viewingTestsGroup && <GroupTestsModal group={viewingTestsGroup} onClose={() => setViewingTestsGroup(null)} onRemoveTest={handleRemoveTest} />}
        </div>
    );
};

// --- TAB 3: SETS (O'ZGARMADI) ---
const SetsTab = ({ allTests, testSets, onRefresh }) => {
    const [name, setName] = useState('');
    const [selectedTests, setSelectedTests] = useState([]);
    const [search, setSearch] = useState('');
    const handleCreate = async () => { if(!name.trim() || !selectedTests.length) return; await addDoc(collection(db, 'testSets'), { name, testIds: selectedTests, createdAt: new Date().toISOString() }); setName(''); setSelectedTests([]); onRefresh(); };
    const handleDelete = async (id) => { if(window.confirm("O'chirasizmi?")) { await deleteDoc(doc(db, 'testSets', id)); onRefresh(); } };

    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-slate-50 flex flex-col gap-2">
                    <input type="text" placeholder="To'plam nomi..." className="w-full h-9 px-3 text-sm border rounded-lg outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)} />
                    <input type="text" placeholder="Test qidirish..." className="w-full h-8 px-3 text-xs bg-white border rounded-lg" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className={`flex-1 overflow-y-auto p-2 space-y-1 ${scrollbarStyle}`}>
                    {allTests.filter(t => t.title.toLowerCase().includes(search.toLowerCase())).map(t => (
                        <label key={t.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${selectedTests.includes(t.id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                            <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={() => setSelectedTests(p => p.includes(t.id) ? p.filter(x => x!==t.id) : [...p, t.id])} className="w-4 h-4 rounded text-indigo-600" />
                            <span className="text-sm text-slate-700 truncate font-medium">{t.title}</span>
                        </label>
                    ))}
                </div>
                <div className="p-3 border-t"><button onClick={handleCreate} className="w-full h-9 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700">Saqlash ({selectedTests.length})</button></div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-slate-50 font-bold text-slate-700 text-xs uppercase">Mavjud To'plamlar</div>
                <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${scrollbarStyle}`}>
                    {testSets.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 border rounded-lg hover:shadow-sm bg-white">
                            <div><p className="font-bold text-slate-800 text-sm">{s.name}</p><p className="text-xs text-slate-500">{s.testIds?.length} ta test</p></div>
                            <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500"><FaTrash className="w-3.5 h-3.5"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;