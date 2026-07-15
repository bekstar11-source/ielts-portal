import React from 'react';

export const TabButton = ({ id, active, onClick, icon: Icon, label, theme }) => (
    <button
        onClick={() => onClick(id)}
        className={`
            flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-bold whitespace-nowrap
            ${active === id
                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200')
                : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}
        `}
    >
        <Icon size={14} />
        <span className="hidden sm:inline">{label}</span>
    </button>
);
