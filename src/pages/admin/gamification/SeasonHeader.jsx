import React from 'react';

export const SeasonHeader = ({ title, onReset, isDark }) => (
    <div className={`p-6 rounded-[24px] border col-span-1 lg:col-span-3 flex justify-between items-center ${isDark ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-white/5' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-sm'}`}>
        <div>
            <h3 className="font-bold text-lg mb-1 tracking-tight">{title}</h3>
            <p className="opacity-60 text-sm font-medium">Ends on Sunday at 23:59</p>
        </div>
        <button
            onClick={() => {
                if (window.confirm("Haqiqatan ham mavsumni yangilamoqchimisiz? Barcha o'quvchilar ballari 0 bo'ladi.")) {
                    onReset();
                }
            }}
            className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/30 transition-all active:scale-95"
        >
            Reset Season
        </button>
    </div>
);
