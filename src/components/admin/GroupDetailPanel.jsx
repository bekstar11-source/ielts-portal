import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Save, Trash2, Users, BookOpen, Plus, Search, Check } from 'lucide-react';
import { doc, updateDoc, arrayRemove, arrayUnion, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useStudentSearch } from '../../hooks/useStudentSearch';

export default function GroupDetailPanel({ group, isOpen, onClose, onUpdate, allStudents, teachers = [] }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

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
    }, [group]);

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
                fixed inset-y-0 right-0 z-50 w-full md:w-[480px] shadow-2xl transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                ${isDark ? 'bg-[#1E1E1E] border-l border-white/10' : 'bg-white border-l border-gray-200'}
            `}>
                {/* Header */}
                <div className={`h-16 px-6 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Guruhni Boshqarish</h2>
                    <button onClick={onClose} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="h-[calc(100vh-64px)] overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Guruh Nomi va O'qituvchi */}
                    <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Asosiy so'zlamalar</h4>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                className={`w-full p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                placeholder="Guruh nomi..."
                            />
                            <select
                                value={selectedTeacherId}
                                onChange={e => setSelectedTeacherId(e.target.value)}
                                className={`w-full p-2.5 rounded-xl border outline-none transition text-sm appearance-none ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                            >
                                <option value="">O'qituvchini tanlang...</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                            </select>
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving || !groupName.trim() || !selectedTeacherId}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm font-bold"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                                Saqlash
                            </button>
                        </div>
                    </div>

                    {/* O'quvchilar Ro'yxati */}
                    <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Users size={14} /> O'quvchilar ({currentStudentIds.length})
                        </h4>

                        <div className={`rounded-xl border max-h-48 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/5 bg-[#2C2C2C]' : 'border-gray-100 bg-gray-50'}`}>
                            {currentStudentIds.length > 0 ? currentStudentIds.map(stId => {
                                const st = getStudent(stId);
                                return (
                                    <div key={stId} className={`flex justify-between items-center p-3 border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                        <div className="text-sm">
                                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {st?.fullName || (st ? "Noma'lum" : "Yuklanmoqda...")}
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {st?.email || st?.phoneNumber || (st ? "" : stId)}
                                            </p>
                                        </div>
                                        <button onClick={() => handleRemoveStudent(stId)} className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            }) : (
                                <p className="text-xs opacity-50 p-4 text-center">Guruhda o'quvchi yo'q</p>
                            )}
                        </div>

                        {/* O'quvchi qo'shish */}
                        <div className="pt-2">
                            <p className={`text-xs mb-2 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>O'quvchi qo'shish:</p>
                            <div className={`flex items-center px-3 py-2 mb-2 rounded-xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                {isSearchingDb ? (
                                    <div className="w-3.5 h-3.5 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                                ) : (
                                    <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                                )}
                                <input
                                    type="text"
                                    placeholder="O'quvchini qidirish..."
                                    className="bg-transparent border-none outline-none text-xs w-full"
                                    value={searchStudent}
                                    onChange={e => setSearchStudent(e.target.value)}
                                />
                            </div>
                            {searchStudent && (
                                <div className={`rounded-xl border max-h-40 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/5 bg-[#1E1E1E]' : 'border-gray-100 bg-white'}`}>
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
                    </div>

                    {/* Tayinlovlar Ro'yxati */}
                    <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <BookOpen size={14} /> Tayinlovlar ({(group.assignedTests || []).length})
                        </h4>

                        <div className={`rounded-xl border max-h-48 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/5 bg-[#2C2C2C]' : 'border-gray-100 bg-gray-50'}`}>
                            {(group.assignedTests || []).length > 0 ? (group.assignedTests || []).map((assign, idx) => (
                                <div key={idx} className={`flex justify-between items-center p-3 border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                    <div className="text-sm">
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
                    </div>

                </div>
            </div>
        </>
    );
}
