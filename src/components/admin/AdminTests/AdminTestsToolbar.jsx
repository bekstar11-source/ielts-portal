import React from 'react';
import { Search, LayoutGrid, List, Plus, FolderPlus, GitMerge } from 'lucide-react';

const AdminTestsToolbar = ({ 
    searchTerm, setSearchTerm, viewMode, setViewMode, 
    selectedCount, onBulkAssign, onMerge, onCreate, isDark 
}) => {
    return (
        <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 transition-colors ${isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center gap-4 flex-1">
                <div className={`flex p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><LayoutGrid size={16} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><List size={16} /></button>
                </div>
                <div className="relative w-full max-w-sm group">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} size={14} />
                    <input 
                        type="text"
                        placeholder="Search tests..."
                        className={`w-full border-none pl-9 pr-4 py-1.5 rounded-lg text-sm outline-none transition-all ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-zinc-100 focus:bg-zinc-200/50'}`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {selectedCount > 0 && (
                    <>
                        <button onClick={onBulkAssign} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
                            <FolderPlus size={14} /> Move
                        </button>
                        {selectedCount >= 2 && (
                            <button onClick={onMerge} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-emerald-600 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600'}`}>
                                <GitMerge size={14} /> Merge
                            </button>
                        )}
                        <div className="h-8 w-px bg-zinc-200 dark:bg-white/10 mx-1" />
                    </>
                )}
                <button onClick={onCreate} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'}`}>
                    <Plus size={14} /> Create Test
                </button>
            </div>
        </header>
    );
};

export default AdminTestsToolbar;
