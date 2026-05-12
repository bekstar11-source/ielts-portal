import React from 'react';
import { Medal, Search, Plus, Minus } from 'lucide-react';
import { calculateLevel } from '../../../utils/scoreUtils';

export const LeaderboardTable = ({ users, loading, searchTerm, setSearchTerm, onUpdatePoints, isDark }) => (
    <div className={`lg:col-span-2 rounded-[24px] border overflow-hidden flex flex-col h-[600px] transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className={`p-4 border-b flex items-center justify-between transition-colors ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
            <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider opacity-70"><Medal size={16} /> Top Students</h3>
            <div className={`flex items-center px-4 py-2 rounded-xl border transition-all ${isDark ? 'bg-black/20 border-white/5 focus-within:bg-black/40' : 'bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-blue-400'}`}>
                <Search size={14} className="opacity-40 mr-2" />
                <input
                    type="text"
                    placeholder="Search students..."
                    className="bg-transparent border-none outline-none text-xs w-40 font-medium"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading && users.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
            ) : (
                <table className="w-full text-left">
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
                        <tr>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Rank</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Student</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Points</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user, idx) => (
                            <tr key={user.id} className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                <td className="p-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                        idx === 0 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' :
                                        idx === 1 ? 'bg-zinc-400 text-white' :
                                        idx === 2 ? 'bg-orange-600 text-white' :
                                        isDark ? 'bg-white/10 text-zinc-500' : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {user.fullName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm leading-none mb-1">{user.fullName || "Ismsiz"}</p>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Level {calculateLevel(user.points)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <span className="font-mono font-black text-sm text-yellow-500">{user.points?.toLocaleString()}</span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onUpdatePoints(user.id, 100)}
                                            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                            title="+100 Points"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            onClick={() => onUpdatePoints(user.id, -100)}
                                            className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                                            title="-100 Points"
                                        >
                                            <Minus size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {!loading && users.length === 0 && (
                <div className="p-12 text-center opacity-30 text-sm italic font-medium">O'quvchi topilmadi</div>
            )}
        </div>
    </div>
);
