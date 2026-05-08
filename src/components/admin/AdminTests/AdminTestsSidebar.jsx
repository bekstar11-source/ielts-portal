import React from 'react';
import { Folder, BookOpen, Headphones, PenTool, Mic2, Layers, Plus, Edit2, Hash } from 'lucide-react';

const AdminTestsSidebar = ({ 
    collections, filterCollection, setFilterCollection, 
    filterType, setFilterType, totalTestCount, 
    onAddCollection, onEditCollection, isDark 
}) => {
    const TEST_TYPES = ["All", "Reading", "Listening", "Writing", "Speaking"];

    return (
        <aside className={`w-64 border-r flex flex-col shrink-0 overflow-y-auto transition-colors ${isDark ? 'bg-[#181818] border-white/5' : 'bg-[#fbfbfb] border-zinc-200'}`}>
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <h1 className="text-xl font-bold tracking-tight">Tests</h1>
                </div>
                
                <div className="space-y-8">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2 flex justify-between items-center">
                            Collections
                            <button onClick={onAddCollection} className="hover:text-blue-500 transition-colors"><Plus size={12} /></button>
                        </h3>
                        <nav className="space-y-0.5">
                            <button 
                                onClick={() => setFilterCollection("All")}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterCollection === 'All' ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-200 text-zinc-900') : 'text-zinc-500 hover:bg-black/5'}`}
                            >
                                <span className="flex items-center gap-3"><Folder size={16} /> All Tests</span>
                                <span className="text-[10px] font-bold opacity-40">{totalTestCount}</span>
                            </button>
                            {collections.map(c => (
                                <div key={c.id} className="group relative">
                                    <button 
                                        onClick={() => setFilterCollection(c.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterCollection === c.id ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-200 text-zinc-900') : 'text-zinc-500 hover:bg-black/5'}`}
                                    >
                                        <span className="flex items-center gap-3 truncate pr-10">
                                            <div className={`w-5 h-5 rounded overflow-hidden shrink-0 flex items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-200 border-black/5'}`}>
                                                {c.thumbnail ? <img src={c.thumbnail} className="w-full h-full object-cover" /> : <Folder size={12} className="text-zinc-400" />}
                                            </div>
                                            {c.name}
                                        </span>
                                    </button>
                                    <button onClick={() => onEditCollection(c)} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:text-blue-500 transition-all"><Edit2 size={12} /></button>
                                </div>
                            ))}
                        </nav>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2">Module Type</h3>
                        <nav className="space-y-0.5">
                            {TEST_TYPES.map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterType === type ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-200 text-zinc-900') : 'text-zinc-500 hover:bg-black/5'}`}
                                >
                                    <span className="flex items-center gap-3">
                                        {type === 'Reading' ? <BookOpen size={16} /> : 
                                         type === 'Listening' ? <Headphones size={16} /> : 
                                         type === 'Writing' ? <PenTool size={16} /> : 
                                         type === 'Speaking' ? <Mic2 size={16} /> : <Layers size={16} />}
                                        {type}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AdminTestsSidebar;
