import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

const WritingReviewSidebar = ({ 
    writings, students, filter, setFilter, searchTerm, setSearchTerm, selectedId, setSelectedId, isDark 
}) => {
    const getStudentName = (userId) => students.find(s => s.id === userId)?.fullName || 'O\'quvchi';

    const filtered = writings.filter(w => {
        const matchesFilter = filter === 'all' ? true : filter === 'pending' ? (!w.writingBand) : (!!w.writingBand);
        const name = getStudentName(w.userId);
        return matchesFilter && (name.toLowerCase().includes(searchTerm.toLowerCase()) || (w.testTitle || '').toLowerCase().includes(searchTerm.toLowerCase()));
    });

    return (
        <div className={`w-full lg:w-[320px] flex-shrink-0 flex flex-col border-r transition-all ${selectedId && 'hidden lg:flex'} ${isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-200 shadow-xl'}`}>
            <div className="p-5 pb-3 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold tracking-tight">Submissions</h1>
                    <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase rounded-full border border-orange-100">
                        {writings.filter(w => !w.writingBand).length} Pending
                    </span>
                </div>

                <div className={`flex p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100/80'}`}>
                    {['pending', 'reviewed', 'all'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${filter === f ? (isDark ? 'bg-[#333] text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm border border-gray-200/50') : 'text-gray-500 hover:text-gray-700'}`}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-300 shadow-sm'}`}>
                    <MagnifyingGlass size={14} className="text-gray-400 mr-2" />
                    <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-xs w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-0 space-y-1.5">
                {filtered.map((w) => {
                    const isSelected = selectedId === w.id;
                    const initials = getStudentName(w.userId).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                        <button key={w.id} onClick={() => setSelectedId(w.id)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSelected ? (isDark ? 'bg-[#333] text-white border border-white/10' : 'bg-[#FBFBFD] text-slate-900 border border-gray-200') : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            <div className={`w-9 h-9 rounded-full flex shrink-0 items-center justify-center font-medium text-xs relative ${isDark ? 'bg-white/5' : 'bg-gray-100 text-slate-500'}`}>
                                {initials}
                                {!w.writingBand && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold truncate">{getStudentName(w.userId)}</h3>
                                <p className="text-[11px] text-gray-400 truncate">{w.testTitle || 'Untitled'}</p>
                            </div>
                            {w.writingBand && <div className="text-sm font-bold text-emerald-500">{w.writingBand}</div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WritingReviewSidebar;
