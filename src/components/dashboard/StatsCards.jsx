import React from 'react';

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center h-24">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Jami Testlar</span>
            <span className="text-3xl font-bold text-gray-900 tracking-tight">{stats.total}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center h-24">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Tugatildi</span>
            <span className="text-3xl font-bold text-gray-900 tracking-tight">{stats.completed}</span>
        </div>
        <div className="col-span-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between h-24 relative overflow-hidden">
            <div className="z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">O'rtacha Natija</span>
                <span className="text-3xl font-bold text-gray-900 tracking-tight">{stats.avg}</span>
            </div>
        </div>
    </div>
  );
}