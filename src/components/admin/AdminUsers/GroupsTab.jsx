import React, { useState } from 'react';
import { Plus, Users, Search, Trash2, ArrowRight, UserPlus, Clock, FolderSearch } from 'lucide-react';
import { db } from '../../../firebase/firebase';
import { addDoc, deleteDoc, doc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import GroupDetailPanel from '../GroupDetailPanel';

const GroupsTab = ({ groups, teachers, students, onRefresh, onRefreshGroups, onUpdateStudentLocal, theme }) => {
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [deletingGroupId, setDeletingGroupId] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);

    const filteredGroups = groups.filter(g =>
        g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateGroup = async () => {
        if (!newGroupName || !selectedTeacherId) return;
        setIsCreating(true);
        try {
            const teacher = teachers.find(t => t.id === selectedTeacherId);
            await addDoc(collection(db, 'groups'), {
                name: newGroupName,
                teacherId: selectedTeacherId,
                teacherName: teacher?.fullName || 'Noma\'lum',
                studentCount: 0,
                studentIds: [],
                createdAt: serverTimestamp()
            });
            setNewGroupName("");
            setSelectedTeacherId("");
            setShowCreateModal(false);
            onRefresh();
        } catch (e) { console.error(e); } finally { setIsCreating(false); }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm("Guruhni o'chirmoqchimisiz?")) return;
        setDeletingGroupId(groupId);
        try {
            const targetGroup = groups.find(g => g.id === groupId);
            if (targetGroup && targetGroup.studentIds && targetGroup.studentIds.length > 0) {
                const updatePromises = targetGroup.studentIds.map(studentId =>
                    updateDoc(doc(db, 'users', studentId), {
                        groupId: null,
                        studentType: 'public'
                    })
                );
                await Promise.all(updatePromises);
            }
            await deleteDoc(doc(db, 'groups', groupId));
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setDeletingGroupId(null);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className={`flex items-center px-4 py-2.5 rounded-xl border transition-all group w-full sm:w-80 ${isDark ? 'bg-white/5 border-white/5 focus-within:bg-white/[0.08]' : 'bg-white border-gray-200 focus-within:border-blue-400'}`}>
                    <Search size={16} className={`mr-2 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Guruhlarni qidirish..."
                        className="bg-transparent border-none outline-none text-sm w-full font-medium placeholder:text-gray-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Guruh Qo'shish
                </button>
            </div>

            {filteredGroups.length === 0 && (
                <div className={`flex-1 flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed ${isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                    <FolderSearch size={40} className="opacity-40" />
                    <p className="text-sm font-medium">
                        {searchTerm ? "Qidiruvga mos guruh topilmadi" : "Hali guruhlar mavjud emas"}
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                            Qidiruvni tozalash
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 overflow-y-auto custom-scrollbar pb-6">
                {filteredGroups.map(group => {
                    const memberPreview = (group.studentIds || [])
                        .slice(0, 3)
                        .map(id => students.find(s => s.id === id));

                    return (
                    <div
                        key={group.id}
                        className={`group relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl ${isDark ? 'bg-[#1E1E1E] border-white/5 hover:border-blue-500/30' : 'bg-white border-gray-100 hover:border-blue-200 shadow-sm'}`}
                    >
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                <Users size={24} />
                            </div>
                            <button
                                onClick={() => handleDeleteGroup(group.id)}
                                disabled={deletingGroupId === group.id}
                                className={`p-2 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all disabled:opacity-100 ${isDark ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                            >
                                {deletingGroupId === group.id
                                    ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                    : <Trash2 size={16} />}
                            </button>
                        </div>

                        <h3 className="text-lg font-black tracking-tight mb-1">{group.name}</h3>
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <span className="text-[11px] font-bold uppercase tracking-widest">{group.teacherName}</span>
                        </div>

                        <div className={`p-4 rounded-xl mb-4 flex justify-between items-center transition-colors ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">O'quvchilar</span>
                                <span className="text-lg font-black">{group.studentIds?.length || 0}</span>
                            </div>
                            <div className="flex -space-x-2">
                                {memberPreview.map((st, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-zinc-800 border-zinc-900 text-gray-300' : 'bg-gray-200 border-white text-gray-500'}`}>
                                        {st?.fullName ? st.fullName.charAt(0).toUpperCase() : '?'}
                                    </div>
                                ))}
                                {(group.studentIds?.length || 0) > 3 && (
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-zinc-800 border-zinc-900 text-blue-400' : 'bg-gray-200 border-white text-blue-600'}`}>
                                        +{(group.studentIds?.length || 0) - 3}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => { setSelectedGroup(group); setShowDetailPanel(true); }}
                            className={`w-full h-10 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <UserPlus size={14} /> Boshqarish
                        </button>
                    </div>
                    );
                })}
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className={`relative w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1E1E1E] text-white border border-white/5' : 'bg-white text-gray-900'}`}>
                        <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-6 tracking-tight">Yangi Guruh</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Guruh Nomi</label>
                                <input
                                    type="text"
                                    className={`w-full h-12 px-4 rounded-xl border outline-none font-bold transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                                    placeholder="Masalan: IELTS Morning"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1.5 block">O'qituvchi</label>
                                <select
                                    className={`w-full h-12 px-4 rounded-xl border outline-none font-bold transition appearance-none ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                                    value={selectedTeacherId}
                                    onChange={e => setSelectedTeacherId(e.target.value)}
                                >
                                    <option value="">Tanlang...</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                                </select>
                            </div>
                            {(!newGroupName.trim() || !selectedTeacherId) && (newGroupName || selectedTeacherId) && (
                                <p className="text-xs text-red-500 font-medium">Guruh nomi va o'qituvchi tanlanishi shart.</p>
                            )}
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6 sm:mt-8">
                            <button onClick={() => setShowCreateModal(false)} className={`flex-1 h-12 rounded-xl font-bold text-sm ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>Bekor qilish</button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={isCreating || !newGroupName.trim() || !selectedTeacherId}
                                className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isCreating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={18} />}
                                Yaratish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <GroupDetailPanel
                group={selectedGroup ? groups.find(g => g.id === selectedGroup.id) : null}
                isOpen={showDetailPanel}
                onClose={() => { setShowDetailPanel(false); setSelectedGroup(null); }}
                onUpdate={onRefreshGroups || onRefresh}
                onUpdateStudentLocal={onUpdateStudentLocal}
                allStudents={students}
                teachers={teachers}
            />
        </div>
    );
};

export default GroupsTab;
