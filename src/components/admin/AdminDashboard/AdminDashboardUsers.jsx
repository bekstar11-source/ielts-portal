import React from 'react';
import { Search, Filter, Lock, Eye, Plus, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTimeStatus } from './AdminDashboardUtils';

const AdminDashboardUsers = ({ 
    users, totalCount, groups, searchTerm, setSearchTerm, 
    sortOption, setSortOption, currentPage, setCurrentPage, 
    itemsPerPage, onSelectUser, onShowGroupModal, isDark 
}) => {
    return (
        <div className={`rounded-[24px] p-6 border transition-colors ${isDark ? 'bg-[#272727] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                    O'quvchilar Boshqaruvi
                    <span className="text-[10px] font-normal text-gray-500 dark:text-white/40 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/5">
                        {users.length} / {totalCount}
                    </span>
                </h3>
                <div className="flex gap-2 w-full md:w-auto min-w-0">
                    <div className="relative group shrink-0">
                        <button className="flex items-center gap-2 bg-gray-100 dark:bg-[#303030] px-3 py-2 rounded-xl text-xs text-gray-700 dark:text-white border border-transparent dark:border-white/5 hover:bg-gray-200 dark:hover:bg-[#383838] transition">
                            <Filter className="w-4 h-4 text-gray-500 dark:text-white/50" />
                            <span>{sortOption === "fullName" ? "Alifbo" : "Sana"}</span>
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-10">
                            <button onClick={() => setSortOption("fullName")} className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5">Alifbo bo'yicha</button>
                            <button onClick={() => setSortOption("createdAt")} className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5">Ro'yxat sanasi</button>
                        </div>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-white/30" />
                        <input
                            type="text"
                            placeholder="Ism bo'yicha qidirish..."
                            className="w-full bg-gray-100 dark:bg-[#303030] border border-transparent dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition placeholder:text-gray-500 dark:placeholder:text-white/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user) => {
                    const userGroup = groups.find(g => g.studentIds && g.studentIds.includes(user.id));
                    const { status, text: timeText } = getTimeStatus(user.lastActiveAt);
                    const isOnline = status === 'online';

                    return (
                        <div key={user.id} className={`flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#303030] rounded-xl hover:bg-gray-100 dark:hover:bg-[#383838] transition border border-gray-200 dark:border-white/5 gap-3 group ${user.isBlocked ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={() => onSelectUser(user)}>
                                <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-700 dark:text-white font-bold text-xs shadow-sm">
                                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#303030] ${isOnline ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}></div>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-200 leading-tight hover:underline truncate max-w-[110px] sm:max-w-[180px] md:max-w-none">{user.fullName || "Ismsiz"}</p>
                                        {user.isBlocked && <Lock className="w-3 h-3 text-red-500 shrink-0" />}
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate">{isOnline ? "Online" : timeText}</p>
                                    {isOnline && user.currentActivity && (
                                        <p className="text-[10px] text-blue-500 animate-pulse mt-0.5 flex items-center gap-1 truncate">
                                            <Activity className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{user.currentActivity}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-bold border shrink-0 ${userGroup ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-blue-100 border-blue-200 text-blue-600'}`}>
                                    {userGroup ? userGroup.name : "Individual"}
                                </span>
                                <div className="flex gap-1.5">
                                    <button onClick={() => onSelectUser(user)} className="bg-white dark:bg-white/5 hover:bg-blue-50 text-gray-500 p-1.5 rounded-lg border border-gray-200 dark:border-white/10 transition shadow-sm"><Eye className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => onShowGroupModal(user)} className="bg-white dark:bg-white/5 hover:bg-gray-100 text-gray-700 p-1.5 rounded-lg border border-gray-200 dark:border-white/10 transition shadow-sm"><Plus className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination UI logic here would ideally be extracted too or kept simple */}
        </div>
    );
};

export default AdminDashboardUsers;
