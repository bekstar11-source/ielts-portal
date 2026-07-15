import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, MoreVertical, Crown, Zap, Loader2 } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { useStudentSearch } from '../../../hooks/useStudentSearch';
import UserDetailPanel from '../UserDetailPanel';

const StudentsTab = ({ students, groups = [], onRefresh, onUpdateLocal, theme, hasMore, onLoadMore, totalCount }) => {
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [filterBand, setFilterBand] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkGroupId, setBulkGroupId] = useState("");
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { combinedStudents, isSearchingDb } = useStudentSearch(students, searchTerm);

    const groupById = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);

    const filteredStudents = useMemo(() => {
        return combinedStudents.filter(s => {
            const matchesBand = filterBand === 'all' || s.targetBand === filterBand;
            const matchesGroup = filterGroup === 'all'
                || (filterGroup === 'none' ? !s.groupId : s.groupId === filterGroup);
            return matchesBand && matchesGroup;
        });
    }, [combinedStudents, filterBand, filterGroup]);

    const isAllSelected = filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredStudents.length;

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = (checked) => {
        setSelectedIds(checked ? filteredStudents.map(s => s.id) : []);
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            await onLoadMore();
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleBulkAddToGroup = async () => {
        if (!bulkGroupId || selectedIds.length === 0) return;
        const targetGroup = groupById.get(bulkGroupId);
        if (!targetGroup) return;

        const conflicting = selectedIds
            .map(id => students.find(s => s.id === id))
            .filter(s => s?.groupId && s.groupId !== bulkGroupId);

        if (conflicting.length > 0) {
            const ok = window.confirm(
                `${conflicting.length} ta o'quvchi allaqachon boshqa guruhda. Ularni "${targetGroup.name}" guruhiga ko'chirishni xohlaysizmi?`
            );
            if (!ok) return;
        }

        setIsBulkProcessing(true);
        try {
            for (const id of selectedIds) {
                const student = students.find(s => s.id === id);
                const prevGroupId = student?.groupId;
                if (prevGroupId && prevGroupId !== bulkGroupId) {
                    await updateDoc(doc(db, 'groups', prevGroupId), { studentIds: arrayRemove(id) });
                }
                await updateDoc(doc(db, 'groups', bulkGroupId), { studentIds: arrayUnion(id) });
                await updateDoc(doc(db, 'users', id), { studentType: 'group', groupId: bulkGroupId });
            }
            setSelectedIds([]);
            setBulkGroupId("");
            onRefresh();
        } catch (e) {
            alert("Xatolik: " + e.message);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkBlockToggle = async (block) => {
        if (selectedIds.length === 0) return;
        const ok = window.confirm(
            block ? `${selectedIds.length} ta o'quvchini bloklaysizmi?` : `${selectedIds.length} ta o'quvchini blokdan chiqarasizmi?`
        );
        if (!ok) return;

        setIsBulkProcessing(true);
        try {
            await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'users', id), { isBlocked: block })));
            selectedIds.forEach(id => onUpdateLocal?.(id, { isBlocked: block }));
            setSelectedIds([]);
        } catch (e) {
            alert("Xatolik: " + e.message);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    return (
        <div className={`rounded-xl border h-full flex flex-col overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            {/* Toolbar */}
            <div className={`p-3 md:p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className={`flex items-center px-4 py-2.5 rounded-xl transition-all group ${isDark ? 'bg-white/5 focus-within:bg-white/[0.08]' : 'bg-white border border-gray-200 focus-within:border-blue-400'}`}>
                        {isSearchingDb ? (
                            <div className="w-4 h-4 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                        ) : (
                            <Search size={16} className={`mr-2 shrink-0 transition-colors ${isDark ? 'text-gray-600 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                        )}
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
                    <div className="relative">
                        <select
                            value={filterGroup}
                            onChange={e => setFilterGroup(e.target.value)}
                            className={`pl-4 pr-10 py-2.5 rounded-xl border-none outline-none appearance-none cursor-pointer text-sm font-medium transition-all max-w-[180px] ${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/[0.08]' : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'}`}
                        >
                            <option value="all">Barcha Guruhlar</option>
                            <option value="none">Guruhsiz</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
                <div className={`text-[11px] font-bold uppercase tracking-widest opacity-40 self-end sm:self-auto ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: {students.length} / {totalCount}
                </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.length > 0 && (
                <div className={`px-3 md:px-4 py-2.5 border-b flex flex-wrap items-center gap-3 transition-colors ${isDark ? 'border-white/5 bg-blue-500/10' : 'border-blue-100 bg-blue-50'}`}>
                    <span className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{selectedIds.length} ta tanlandi</span>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={bulkGroupId}
                            onChange={e => setBulkGroupId(e.target.value)}
                            className={`px-3 py-1.5 rounded-lg border-none outline-none text-xs font-medium ${isDark ? 'bg-white/10 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                        >
                            <option value="">Guruh tanlang...</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <button
                            onClick={handleBulkAddToGroup}
                            disabled={!bulkGroupId || isBulkProcessing}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition"
                        >
                            Guruhga qo'shish
                        </button>
                        <button
                            onClick={() => handleBulkBlockToggle(true)}
                            disabled={isBulkProcessing}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition disabled:opacity-40"
                        >
                            Bloklash
                        </button>
                        <button
                            onClick={() => handleBulkBlockToggle(false)}
                            disabled={isBulkProcessing}
                            className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 text-xs font-bold transition disabled:opacity-40"
                        >
                            Blokdan chiqarish
                        </button>
                        {isBulkProcessing && <Loader2 size={14} className="animate-spin opacity-60" />}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
                        <tr>
                            <th className={`w-10 py-3 pl-4 md:pl-6 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                <input
                                    type="checkbox"
                                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                    checked={isAllSelected}
                                    onChange={e => toggleSelectAll(e.target.checked)}
                                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                                />
                            </th>
                            <th className={`py-3 px-4 md:px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>O'quvchi</th>
                            <th className={`hidden md:table-cell py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Aloqa</th>
                            <th className={`hidden lg:table-cell py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Guruh</th>
                            <th className={`py-3 px-4 md:px-6 text-xs font-bold uppercase tracking-wider border-b text-center ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Target</th>
                            <th className={`hidden sm:table-cell py-3 px-6 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Sana</th>
                            <th className={`py-3 px-4 md:px-6 text-xs font-bold uppercase tracking-wider border-b text-right ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50 border-gray-100'}`}>
                                <td className="py-4 pl-4 md:pl-6">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(student.id)}
                                        onChange={() => toggleSelect(student.id)}
                                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                                    />
                                </td>
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
                                <td className="hidden lg:table-cell py-4 px-6">
                                    {student.groupId ? (
                                        <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold truncate max-w-[140px] ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                            {groupById.get(student.groupId)?.name || "Noma'lum guruh"}
                                        </span>
                                    ) : <span className="text-xs opacity-30">Guruhsiz</span>}
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
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className={`
                            px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-60
                            ${isDark
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                : 'bg-white border border-gray-200 text-blue-600 hover:bg-gray-50 shadow-sm'}
                        `}
                    >
                        {isLoadingMore && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Yanada ko'proq yuklash
                    </button>
                </div>
            )}

            <UserDetailPanel
                user={selectedUser}
                isOpen={showDetailPanel}
                onClose={() => setShowDetailPanel(false)}
                onUpdate={(id, patch) => {
                    if (onUpdateLocal && patch) onUpdateLocal(id, patch);
                    else onRefresh();
                    setShowDetailPanel(false);
                }}
            />
        </div>
    );
};

export default StudentsTab;
