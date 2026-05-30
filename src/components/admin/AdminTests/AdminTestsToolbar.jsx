import React, { useState, useRef, useEffect } from 'react';
import { 
    Search, LayoutGrid, List, Plus, FolderPlus, GitMerge, ChevronDown, 
    Folder, BookOpen, Headphones, PenTool, Mic2, Layers, Award, Edit2, Loader2 
} from 'lucide-react';

const AdminTestsToolbar = ({ 
    searchTerm, setSearchTerm, viewMode, setViewMode, 
    selectedCount, onBulkAssign, onMerge, onCreate, isDark,
    collections = [],
    filterCollection = "All",
    setFilterCollection,
    filterType = "All",
    setFilterType,
    totalTestCount = 0,
    onAddCollection,
    onEditCollection,
    onMigrate,
    isMigrating
}) => {
    const [isModuleOpen, setIsModuleOpen] = useState(false);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const moduleDropdownRef = useRef(null);
    const collectionDropdownRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(e.target)) {
                setIsModuleOpen(false);
            }
            if (collectionDropdownRef.current && !collectionDropdownRef.current.contains(e.target)) {
                setIsCollectionOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const TEST_TYPES = ["All", "Reading", "Listening", "Writing", "Speaking", "Mock"];

    const getModuleIcon = (type) => {
        switch (type) {
            case 'Reading': return <BookOpen size={14} className="text-emerald-500" />;
            case 'Listening': return <Headphones size={14} className="text-amber-500" />;
            case 'Writing': return <PenTool size={14} className="text-blue-500" />;
            case 'Speaking': return <Mic2 size={14} className="text-purple-500" />;
            case 'Mock': return <Award size={14} className="text-rose-500" />;
            default: return <Layers size={14} className="text-zinc-500 dark:text-zinc-400" />;
        }
    };

    const currentColl = collections.find(c => c.id === filterCollection);

    return (
        <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 transition-colors z-40 ${isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center gap-4 flex-1">
                {/* View Mode Toggle */}
                <div className={`flex p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><LayoutGrid size={16} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><List size={16} /></button>
                </div>

                {/* Search Box */}
                <div className="relative w-full max-w-xs group">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} size={14} />
                    <input 
                        type="text"
                        placeholder="Search tests..."
                        className={`w-full border-none pl-9 pr-4 py-1.5 rounded-lg text-sm outline-none transition-all ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-zinc-100 focus:bg-zinc-250/50'}`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="h-6 w-px bg-zinc-250 dark:bg-white/10 mx-1" />

                {/* Module Type Dropdown */}
                <div className="relative" ref={moduleDropdownRef}>
                    <button
                        onClick={() => setIsModuleOpen(!isModuleOpen)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-all select-none ${
                            isDark 
                                ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' 
                                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                        }`}
                    >
                        {getModuleIcon(filterType)}
                        <span>{filterType === 'All' ? 'All Modules' : filterType}</span>
                        <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isModuleOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isModuleOpen && (
                        <div className={`absolute top-full mt-1.5 left-0 z-50 w-48 rounded-xl border shadow-xl p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 ${
                            isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                        }`}>
                            {TEST_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setFilterType(type);
                                        setIsModuleOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                                        filterType === type 
                                            ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                            : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                    }`}
                                >
                                    {getModuleIcon(type)}
                                    {type === 'All' ? 'All Modules' : type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Collection Dropdown */}
                <div className="relative" ref={collectionDropdownRef}>
                    <button
                        onClick={() => setIsCollectionOpen(!isCollectionOpen)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-all select-none max-w-[200px] ${
                            isDark 
                                ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' 
                                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                        }`}
                    >
                        {currentColl ? (
                            <>
                                {currentColl.thumbnail ? (
                                    <img src={currentColl.thumbnail} className="w-4 h-4 rounded object-cover shrink-0" />
                                ) : (
                                    <Folder size={12} className={
                                        currentColl.type === 'listening' ? 'text-amber-500 shrink-0' :
                                        currentColl.type === 'reading' ? 'text-emerald-500 shrink-0' :
                                        currentColl.type === 'mock' ? 'text-blue-500 shrink-0' : 'text-zinc-400 shrink-0'
                                    } />
                                )}
                                <span className="truncate">{currentColl.name}</span>
                            </>
                        ) : (
                            <>
                                <Folder size={12} className="text-blue-500 shrink-0" />
                                <span>All Collections</span>
                            </>
                        )}
                        <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 shrink-0 ${isCollectionOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCollectionOpen && (
                        <div className={`absolute top-full mt-1.5 left-0 z-50 w-64 rounded-xl border shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-150 ${
                            isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                        }`}>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-0.5 space-y-0.5">
                                {/* All Tests Item */}
                                <button
                                    onClick={() => {
                                        setFilterCollection("All");
                                        setIsCollectionOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        filterCollection === 'All'
                                            ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                            : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                    }`}
                                >
                                    <span className="flex items-center gap-3"><Folder size={14} className="text-zinc-400" /> All Tests</span>
                                    <span className="text-[10px] font-bold opacity-50 bg-zinc-500/10 px-1.5 py-0.5 rounded-full">{totalTestCount}</span>
                                </button>

                                <div className="h-px bg-zinc-100 dark:bg-white/5 my-1" />

                                {collections.map(c => {
                                    const isListening = c.type === 'listening';
                                    const isReading = c.type === 'reading';
                                    const isMock = c.type === 'mock';
                                    return (
                                        <div key={c.id} className="group relative flex items-center">
                                            <button
                                                onClick={() => {
                                                    setFilterCollection(c.id);
                                                    setIsCollectionOpen(false);
                                                }}
                                                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left pr-10 ${
                                                    filterCollection === c.id
                                                        ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                        : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                                }`}
                                            >
                                                {c.thumbnail ? (
                                                    <img src={c.thumbnail} className="w-4 h-4 rounded object-cover shrink-0" />
                                                ) : (
                                                    <Folder size={14} className={
                                                        isListening ? 'text-amber-500 shrink-0' :
                                                        isReading ? 'text-emerald-500 shrink-0' :
                                                        isMock ? 'text-blue-500 shrink-0' : 'text-zinc-400 shrink-0'
                                                    } />
                                                )}
                                                <span className="truncate">{c.name}</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditCollection(c);
                                                    setIsCollectionOpen(false);
                                                }}
                                                className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-zinc-100 dark:bg-white/5 my-1" />

                            {/* Add Collection Action Button */}
                            <button
                                onClick={() => {
                                    onAddCollection();
                                    setIsCollectionOpen(false);
                                }}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-colors`}
                            >
                                <Plus size={14} /> Add Collection
                            </button>

                            {/* Migrate Button inside Collection dropdown list for admins */}
                            {onMigrate && (
                                <>
                                    <div className="h-px bg-zinc-100 dark:bg-white/5 my-1" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMigrate();
                                            setIsCollectionOpen(false);
                                        }}
                                        disabled={isMigrating}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:bg-rose-500/5 transition-colors disabled:opacity-50"
                                    >
                                        {isMigrating ? (
                                            <span className="flex items-center gap-1.5">
                                                <Loader2 size={10} className="animate-spin" /> Migrating...
                                            </span>
                                        ) : "Migrate Metadata"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Section */}
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
