import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, MoreVertical, Crown, Zap } from 'lucide-react';
import { useStudentSearch } from '../../../hooks/useStudentSearch';
import UserDetailPanel from '../UserDetailPanel';

const StudentsTab = ({ students, onRefresh, theme, hasMore, onLoadMore, totalCount }) => {
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [filterBand, setFilterBand] = useState('all');

    const { combinedStudents, isSearchingDb } = useStudentSearch(students, searchTerm);

    const filteredStudents = useMemo(() => {
        return combinedStudents.filter(s => {
            const matchesBand = filterBand === 'all' || s.targetBand === filterBand;
            return matchesBand;
        });
    }, [combinedStudents, filterBand]);

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
};

export default StudentsTab;
