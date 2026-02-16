import React from 'react';
import { Icons } from './Icons';

export default function FiltersBar({ searchQuery, setSearchQuery, filterType, setFilterType }) {
    return (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
                <Icons.Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                    type="text"
                    placeholder="Qidirish..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#0F0F0F] text-white placeholder-gray-500 focus:bg-[#1A1A1A] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm transition shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                {['all', 'reading', 'listening', 'mock', 'set'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${filterType === type ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-[#0F0F0F] text-gray-400 border-white/5 hover:bg-[#1A1A1A] hover:text-white hover:border-white/10'}`}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
}