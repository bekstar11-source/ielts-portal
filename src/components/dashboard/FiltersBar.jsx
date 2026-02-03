import React from 'react';
import { Icons } from './Icons';

export default function FiltersBar({ searchQuery, setSearchQuery, filterType, setFilterType }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
            <Icons.Search className="w-4 h-4 absolute left-3 top-3 text-gray-400"/>
            <input 
                type="text" 
                placeholder="Qidirish..." 
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm transition shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            {['all', 'reading', 'listening', 'mock', 'set'].map(type => (
                <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap border ${filterType === type ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
            ))}
        </div>
    </div>
  );
}