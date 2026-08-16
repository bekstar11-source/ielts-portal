import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Save, Trash2, Users, BookOpen, Plus, Search, Settings2, ChevronDown } from 'lucide-react';
import { doc, updateDoc, arrayRemove, arrayUnion, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useStudentSearch } from '../../hooks/useStudentSearch';

export default function GroupDetailPanel({ group, isOpen, onClose, onUpdate, onUpdateStudentLocal, allStudents, teachers = [] }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [activeSection, setActiveSection] = useState('students');
    const [groupName, setGroupName] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [searchStudent, setSearchStudent] = useState('');
    const [saving, setSaving] = useState(false);

    const [extraStudents, setExtraStudents] = useState({});
    const { combinedStudents: searchResults, isSearchingDb } = useStudentSearch(allStudents, searchStudent);

    useEffect(() => {
        if (group) {
            setGroupName(group.name || '');
            setSelectedTeacherId(group.teacherId || '');
        }
    }, [group?.id]);

    useEffect(() => {
        if (isOpen) {
            setActiveSection('students');
            setSearchStudent('');
        }
    }, [isOpen, group?.id]);

    // Fetch missing students
    useEffect(() => {
        if (!isOpen || !group?.studentIds) return;

        const missingIds = group.studentIds.filter(id => 
            !allStudents.find(s => s.id === id) && !extraStudents[id]
        );

        if (missingIds.length > 0) {
            const fetchMissing = async () => {
                const newExtras = { ...extraStudents };
                // Chunk IDs into batches of 30 (Firestore limit for 'in' operator)
                for (let i = 0; i < missingIds.length; i += 30) {
                    const batch = missingIds.slice(i, i + 30);
                    try {
                        const q = query(collection(db, 'users'), where('__name__', 'in', batch));
                        const snapshot = await getDocs(q);
                        snapshot.forEach(doc => {
                            newExtras[doc.id] = { id: doc.id, ...doc.data() };
                        });
                    } catch (e) {
                        console.error("Error fetching student batch:", e);
                    }
                }
                setExtraStudents(newExtras);
            };
            fetchMissing();
        }
    }, [isOpen, group, allStudents]);

    const getStudent = (id) => allStudents.find(s => s.id === id) || extraStudents[id];

    const handleSaveSettings = async () => {
        if (!groupName.trim() || !selectedTeacherId) return;
        setSaving(true);
        try {
            const teacher = teachers.find(t => t.id === selectedTeacherId);
            await updateDoc(doc(db, 'groups', group.id), {
                name: groupName,
                teacherId: selectedTeacherId,
                teacherName: teacher?.fullName || group.teacherName || 'Noma\'lum'
            });
            onUpdate();
            alert("Guruh sozlamalari saqlandi!");
        } catch (error) {
            alert("Xatolik: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm("O'quvchini guruhdan o'chirasizmi?")) return;
        try {
            await updateDoc(doc(db, 'groups', group.id), {
                studentIds: arrayRemove(studentId)
            });
            await updateDoc(doc(db, 'users', studentId), {
                studentType: 'public',
                groupId: null
            });
            onUpdateStudentLocal?.(studentId, { studentType: 'public', groupId: null });
            onUpdate();
        } catch (error) {
            alert("Xatolik: " + error.message);
        }
    };

    const handleAddStudent = async (student) => {
        const studentId = student.id;
        const previousGroupId = student.groupId;

        if (previousGroupId && previousGroupId !== group.id) {
            const confirmMove = window.confirm(
                `Bu o'quvchi allaqachon boshqa guruhga biriktirilgan. Uni shu guruhga ko'chirmoqchimisiz?`
            );
            if (!confirmMove) return;
        }

        try {
            if (previousGroupId && previousGroupId !== group.id) {
                await updateDoc(doc(db, 'groups', previousGroupId), {
                    studentIds: arrayRemove(studentId)
                });
            }
            await updateDoc(doc(db, 'groups', group.id), {
                studentIds: arrayUnion(studentId)
            });
            await updateDoc(doc(db, 'users', studentId), {
                studentType: 'group',
                groupId: group.id
            });
            onUpdateStudentLocal?.(studentId, { studentType: 'group', groupId: group.id });
            onUpdate();
        } catch (error) {
            alert("Xatolik: " + error.message);
        }
    };

    const handleRemoveAssignment = async (assignment) => {
        if (!window.confirm("Ushbu tayinlovni o'chirasizmi?")) return;
        try {
            await updateDoc(doc(db, 'groups', group.id), {
                assignedTests: arrayRemove(assignment)
            });
            onUpdate();
        } catch (error) {
            alert("Xatolik: " + error.message);
        }
    };

    if (!isOpen || !group) return null;

    // Filter students for adding
    const currentStudentIds = group?.studentIds || [];
    const searchFilteredAvailable = searchResults.filter(s => !currentStudentIds.includes(s.id));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`
                fixed inset-y-0 right-0 z-50 w-full md:w-[520px] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                ${isDark ? 'bg-[#1f1e1b] border-l border-white/10' : 'bg-white border-l border-gray-200'}
            `}>
                {/* Header */}
                <div className={`h-16 px-6 flex items-center justify-between border-b shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div className="min-w-0">
                        <h2 className={`font-bold text-lg truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{group.name}</h2>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{group.teacherName || "O'qituvchi tayinlanmagan"}</p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg transition shrink-0 ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex px-3 pt-3 gap-1 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    {[
                        { id: 'students', label: "O'quvchilar", icon: Users, count: currentStudentIds.length },
                        { id: 'assignments', label: 'Tayinlovlar', icon: BookOpen, count: (group.assignedTests || []).length },
                        { id: 'settings', label: 'Sozlamalar', icon: Settings2 },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
                                activeSection === tab.id
                                    ? (isDark ? 'border-blue-500 text-white' : 'border-blue-600 text-gray-900')
                                    : (isDark ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600')
                            }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {typeof tab.count === 'number' && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSection === tab.id ? (isDark ? 'bg-white/10' : 'bg-gray-100') : 'opacity-60'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">

                    {activeSection === 'settings' && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Guruh nomi</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#252320] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                    placeholder="Guruh nomi..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>O'qituvchi</label>
                                <div className="relative">
                                    <select
                                        value={selectedTeacherId}
                                        onChange={e => setSelectedTeacherId(e.target.value)}
                                        className={`w-full p-2.5 pr-9 rounded-xl border outline-none transition text-sm appearance-none cursor-pointer ${isDark ? 'bg-[#252320] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                    >
                                        <option value="">O'qituvchini tanlang...</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving || !groupName.trim() || !selectedTeacherId}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm font-bold mt-2"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                                Saqlash
                            </button>
                        </div>
                    )}

                    {activeSection === 'students' && (
                        <div className="space-y-4">
                            {/* O'quvchi qo'shish */}
                            <div>
                                <p className={`text-xs mb-2 font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>O'quvchi qo'shish</p>
                                <div className={`flex items-center px-3 py-2.5 mb-2 rounded-xl border ${isDark ? 'bg-[#252320] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    {isSearchingDb ? (
                                        <div className="w-3.5 h-3.5 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                                    ) : (
                                        <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Ism, email yoki telefon bo'yicha qidirish..."
                                        className="bg-transparent border-none outline-none text-sm w-full"
                                        value={searchStudent}
                                        onChange={e => setSearchStudent(e.target.value)}
                                    />
                                    {searchStudent && (
                                        <button onClick={() => setSearchStudent('')} className="p-1 rounded-md opacity-50 hover:opacity-100 shrink-0">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                {searchStudent && (
                                    <div className={`rounded-xl border max-h-52 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/5 bg-[#1f1e1b]' : 'border-gray-100 bg-white'}`}>
                                        {searchFilteredAvailable.length > 0 ? searchFilteredAvailable.map(st => (
                                            <div key={st.id} className={`flex justify-between items-center p-3 border-b last:border-0 hover:bg-white/5 transition cursor-pointer ${isDark ? 'border-white/5' : 'border-gray-100'}`} onClick={() => handleAddStudent(st)}>
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium truncate block">{st.fullName}</span>
                                                    {st.groupId && st.groupId !== group.id && (
                                                        <span className="text-[10px] text-amber-500 font-semibold">Boshqa guruhda</span>
                                                    )}
                                                </div>
                                                <Plus size={14} className="text-blue-500 shrink-0" />
                                            </div>
                                        )) : (
                                            <p className="text-xs opacity-50 p-3 text-center">Topilmadi</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Mavjud a'zolar */}
                            <div>
                                <p className={`text-xs mb-2 font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Guruh a'zolari</p>
                                <div className={`rounded-xl border divide-y ${isDark ? 'border-white/5 divide-white/5' : 'border-gray-100 divide-gray-100'}`}>
                                    {currentStudentIds.length > 0 ? currentStudentIds.map(stId => {
                                        const st = getStudent(stId);
                                        return (
                                            <div key={stId} className="flex justify-between items-center p-3">
                                                <div className="text-sm min-w-0">
                                                    <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {st?.fullName || (st ? "Noma'lum" : "Yuklanmoqda...")}
                                                    </p>
                                                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {st?.email || st?.phoneNumber || (st ? "" : stId)}
                                                    </p>
                                                </div>
                                                <button onClick={() => handleRemoveStudent(stId)} className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition shrink-0">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-xs opacity-50 p-4 text-center">Guruhda o'quvchi yo'q</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'assignments' && (
                        <div className={`rounded-xl border divide-y ${isDark ? 'border-white/5 divide-white/5' : 'border-gray-100 divide-gray-100'}`}>
                            {(group.assignedTests || []).length > 0 ? (group.assignedTests || []).map((assign, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3">
                                    <div className="text-sm min-w-0">
                                        <div className="flex gap-2 mb-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                {assign.type}
                                            </span>
                                        </div>
                                        <p className={`font-medium line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{assign.title}</p>
                                        {assign.maxAttempts && <p className="text-[10px] text-gray-500 mt-0.5">{assign.maxAttempts} marta</p>}
                                    </div>
                                    <button onClick={() => handleRemoveAssignment(assign)} className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition shrink-0">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )) : (
                                <p className="text-xs opacity-50 p-4 text-center">Tayinlovlar yo'q</p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
