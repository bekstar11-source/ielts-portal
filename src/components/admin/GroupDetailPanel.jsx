import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Save, Trash2, Users, BookOpen, Plus, Search, Check } from 'lucide-react';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function GroupDetailPanel({ group, isOpen, onClose, onUpdate, allStudents }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [groupName, setGroupName] = useState('');
    const [searchStudent, setSearchStudent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (group) {
            setGroupName(group.name || '');
        }
    }, [group]);

    const handleSaveName = async () => {
        if (!groupName.trim()) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'groups', group.id), { name: groupName });
            onUpdate();
            alert("Guruh nomi saqlandi!");
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
            onUpdate();
        } catch (error) {
            alert("Xatolik: " + error.message);
        }
    };

    const handleAddStudent = async (studentId) => {
        try {
            await updateDoc(doc(db, 'groups', group.id), {
                studentIds: arrayUnion(studentId)
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
    const currentStudentIds = group.studentIds || [];
    const availableStudents = allStudents.filter(s => !currentStudentIds.includes(s.id));
    const searchFilteredAvailable = availableStudents.filter(s =>
        s.fullName?.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchStudent.toLowerCase())
    );

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

                    {/* Guruh Nomi */}
                    <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Asosiy so'zlamalar</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                className={`flex-1 p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                placeholder="Guruh nomi..."
                            />
                            <button
                                onClick={handleSaveName}
                                disabled={saving}
                                className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
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
                                const st = allStudents.find(s => s.id === stId);
                                return (
                                    <div key={stId} className={`flex justify-between items-center p-3 border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                        <div className="text-sm">
                                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{st?.fullName || "Noma'lum"}</p>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{st?.email || ""}</p>
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
                                <Search size={14} className="text-gray-400 mr-2" />
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
                                        <div key={st.id} className={`flex justify-between items-center p-3 border-b last:border-0 hover:bg-white/5 transition cursor-pointer ${isDark ? 'border-white/5' : 'border-gray-100'}`} onClick={() => handleAddStudent(st.id)}>
                                            <span className="text-sm font-medium">{st.fullName}</span>
                                            <Plus size={14} className="text-blue-500" />
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
