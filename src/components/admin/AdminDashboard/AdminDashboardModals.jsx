import React from 'react';
import { X, Lock, Plus, ClipboardList, CheckCircle } from 'lucide-react';

export const UserDetailModal = ({ user, onClose, onBlock, onUpdateType, isDark }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-100'}`}>
                <div className="p-6 border-b flex justify-between items-center border-gray-100 dark:border-white/5">
                    <h2 className="text-xl font-bold">O'quvchi Profili</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                            {user.fullName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{user.fullName || "Ismsiz"}</h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => onBlock(user.id, user.isBlocked)} className={`p-4 rounded-2xl border font-bold text-sm transition-all ${user.isBlocked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white border-transparent'}`}>
                            {user.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
                        </button>
                        <button onClick={() => {}} className="p-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20">Xabar yuborish</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const GroupSelectionModal = ({ user, groups, onClose, onAdd, processing, isDark }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-100'}`}>
                <div className="p-6 border-b flex justify-between items-center border-gray-100 dark:border-white/5">
                    <h2 className="text-xl font-bold">Guruhga Qo'shish</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-3">
                    {groups.map(group => (
                        <button 
                            key={group.id}
                            onClick={() => onAdd(user.id, group.id)}
                            disabled={processing}
                            className={`w-full p-4 rounded-2xl border text-left font-bold text-sm transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-transparent'}`}
                        >
                            {group.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
