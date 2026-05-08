import React from 'react';
import { Icons } from '../../Icons';

const ResultsFilters = ({ 
    searchTerm, setSearchTerm, typeFilter, setTypeFilter, 
    statusFilter, setStatusFilter, isDark, totalCount 
}) => {
    return (
        <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-6 mb-10">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                {/* Search */}
                <div className="relative w-full md:w-64 group">
                    <Icons.Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${isDark ? 'text-gray-600 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        className={`w-full pl-11 pr-4 py-3 rounded-2xl border-none outline-none text-sm font-medium transition-all ${isDark ? 'bg-white/5 text-white focus:bg-white/[0.08]' : 'bg-gray-100 text-gray-900 focus:bg-gray-200/50'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Type Filter */}
                <div className="relative w-full sm:w-44">
                    <Icons.Type className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`w-full pl-11 pr-10 py-3 rounded-2xl border-none outline-none appearance-none cursor-pointer text-sm font-medium transition-all ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                    >
                        <option value="all">Barcha Turlar</option>
                        <option value="reading">Reading</option>
                        <option value="listening">Listening</option>
                        <option value="writing">Writing</option>
                        <option value="speaking">Speaking</option>
                        <option value="podcast">Podcast</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="relative w-full sm:w-48">
                    <Icons.Status className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`w-full pl-11 pr-10 py-3 rounded-2xl border-none outline-none appearance-none cursor-pointer text-sm font-medium transition-all ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                    >
                        <option value="all">Barcha Statuslar</option>
                        <option value="pending">Kutilmoqda</option>
                        <option value="graded">Baholangan</option>
                        <option value="orphan">Arxiv</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col items-end">
                <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Natijalar</h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Jami {totalCount} ta yechim</p>
            </div>
        </div>
    );
};

export default ResultsFilters;
