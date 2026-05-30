import React, { useState, useRef, useEffect } from 'react';
import { 
    Search, LayoutGrid, List, Plus, FolderPlus, GitMerge, ChevronDown, 
    Folder, BookOpen, Headphones, PenTool, Mic2, Layers, Award, Edit2, Loader2,
    Upload, Download, Trash2, Shield, Globe, Lock, ArrowUpDown, RefreshCw, Eye, Hash
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
    isMigrating,

    // New sorting and filtering props
    filterStatus = "All",
    setFilterStatus,
    filterAccess = "All",
    setFilterAccess,
    filterTag = "All",
    setFilterTag,
    allAvailableTags = [],
    sortBy = "createdAt",
    setSortBy,
    sortOrder = "desc",
    setSortOrder,

    // New actions props
    onBulkDelete,
    onBulkStatusChange,
    onBulkAccessChange,
    onImport,
    onExportJSON,
    onExportCSV,
    onOpenQuestionBank
}) => {
    const [isModuleOpen, setIsModuleOpen] = useState(false);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isAccessOpen, setIsAccessOpen] = useState(false);
    const [isTagOpen, setIsTagOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const moduleDropdownRef = useRef(null);
    const collectionDropdownRef = useRef(null);
    const statusDropdownRef = useRef(null);
    const accessDropdownRef = useRef(null);
    const tagDropdownRef = useRef(null);
    const sortDropdownRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(e.target)) {
                setIsModuleOpen(false);
            }
            if (collectionDropdownRef.current && !collectionDropdownRef.current.contains(e.target)) {
                setIsCollectionOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
                setIsStatusOpen(false);
            }
            if (accessDropdownRef.current && !accessDropdownRef.current.contains(e.target)) {
                setIsAccessOpen(false);
            }
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
                setIsTagOpen(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const TEST_TYPES = ["All", "Reading", "Listening", "Writing", "Speaking", "Mock"];

    const getModuleIcon = (type) => {
        switch (type) {
            case 'Reading': return <BookOpen size={12} className="text-emerald-500" />;
            case 'Listening': return <Headphones size={12} className="text-amber-500" />;
            case 'Writing': return <PenTool size={12} className="text-blue-500" />;
            case 'Speaking': return <Mic2 size={12} className="text-purple-500" />;
            case 'Mock': return <Award size={12} className="text-rose-500" />;
            default: return <Layers size={12} className="text-zinc-500 dark:text-zinc-400" />;
        }
    };

    const sortOptions = [
        { id: "createdAt_desc", label: "Date: Newest", field: "createdAt", order: "desc" },
        { id: "createdAt_asc", label: "Date: Oldest", field: "createdAt", order: "asc" },
        { id: "title_asc", label: "Title: A-Z", field: "title", order: "asc" },
        { id: "title_desc", label: "Title: Z-A", field: "title", order: "desc" },
        { id: "difficulty_asc", label: "Difficulty: Low-High", field: "difficulty", order: "asc" },
        { id: "difficulty_desc", label: "Difficulty: High-Low", field: "difficulty", order: "desc" }
    ];

    const currentSortOption = sortOptions.find(o => o.field === sortBy && o.order === sortOrder) || sortOptions[0];
    const currentColl = collections.find(c => c.id === filterCollection);

    return (
        <header className={`border-b flex flex-col px-6 py-3 shrink-0 transition-colors z-45 gap-3.5 ${isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-zinc-200'}`}>
            {/* Top Row: Search & Actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                    {/* View Mode Toggle */}
                    <div className={`flex p-1 rounded-lg shrink-0 ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><List size={14} /></button>
                    </div>

                    {/* Search Box */}
                    <div className="relative w-full max-w-[200px] shrink-0 group">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} size={12} />
                        <input 
                            type="text"
                            placeholder="Search tests..."
                            className={`w-full border-none pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition-all ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-zinc-100 focus:bg-zinc-200/50'}`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    {selectedCount > 0 ? (
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <button onClick={onBulkAssign} title="Guruhli ko'chirish" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <FolderPlus size={14} />
                            </button>
                            {selectedCount >= 2 && (
                                <button onClick={onMerge} title="Testlarni birlashtirish" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-emerald-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                    <GitMerge size={14} />
                                </button>
                            )}
                            <button onClick={() => onBulkStatusChange(true)} title="Public qilish" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-emerald-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Globe size={14} />
                            </button>
                            <button onClick={() => onBulkStatusChange(false)} title="Private qilish" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-zinc-700 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Lock size={14} />
                            </button>
                            <button onClick={() => onBulkAccessChange(true)} title="Bepul (Free) qilish" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-emerald-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Award size={14} />
                            </button>
                            <button onClick={() => onBulkAccessChange(false)} title="Premium (Paid) qilish" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Shield size={14} />
                            </button>
                            
                            <div className="h-5 w-px bg-zinc-250 dark:bg-white/10 mx-0.5" />
                            
                            <button onClick={onExportJSON} title="JSON formatda yuklash (Eksport)" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Download size={14} />
                            </button>
                            <button onClick={onExportCSV} title="CSV formatda ro'yxatni yuklash" className={`flex items-center justify-center p-2 rounded-lg border text-zinc-500 hover:text-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <List size={14} />
                            </button>
                            <button onClick={onBulkDelete} title="Guruhli o'chirish" className={`flex items-center justify-center p-2 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all`}>
                                <Trash2 size={14} />
                            </button>
    
                            <div className="h-5 w-px bg-zinc-250 dark:bg-white/10 mx-0.5" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 md:gap-2">
                            {/* Question Bank Trigger */}
                            <button 
                                onClick={onOpenQuestionBank}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                                }`}
                            >
                                <BookOpen size={12} className="text-blue-500" />
                                <span className="hidden sm:inline">Savollar banki</span>
                            </button>
    
                            {/* Import Button */}
                            <button 
                                onClick={onImport}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                                }`}
                            >
                                <Upload size={12} className="text-amber-500" />
                                <span className="hidden sm:inline">JSON Import</span>
                            </button>
                        </div>
                    )}
                    
                    <button onClick={onCreate} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 ${isDark ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                        <Plus size={12} />
                        <span>Create Test</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row: Filters & Sort */}
            <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 dark:border-white/5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-widest mr-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Filters:</span>

                    {/* Module Type Dropdown */}
                    <div className="relative shrink-0" ref={moduleDropdownRef}>
                        <button
                            onClick={() => setIsModuleOpen(!isModuleOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                                isDark ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                            }`}
                        >
                            {getModuleIcon(filterType)}
                            <span>{filterType === 'All' ? 'All Modules' : filterType}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${isModuleOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isModuleOpen && (
                            <div className={`absolute top-full mt-1 left-0 z-50 w-44 rounded-xl border shadow-xl p-1 space-y-0.5 animate-dropdown ${
                                isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                            }`}>
                                {TEST_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setFilterType(type);
                                            setIsModuleOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
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
                    <div className="relative shrink-0" ref={collectionDropdownRef}>
                        <button
                            onClick={() => setIsCollectionOpen(!isCollectionOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none max-w-[150px] ${
                                isDark ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                            }`}
                        >
                            {currentColl ? (
                                <>
                                    {currentColl.thumbnail ? (
                                        <img src={currentColl.thumbnail} className="w-3.5 h-3.5 rounded object-cover shrink-0" />
                                    ) : (
                                        <Folder size={10} className={
                                            currentColl.type === 'listening' ? 'text-amber-500 shrink-0' :
                                            currentColl.type === 'reading' ? 'text-emerald-500 shrink-0' :
                                            currentColl.type === 'mock' ? 'text-blue-500 shrink-0' : 'text-zinc-400 shrink-0'
                                        } />
                                    )}
                                    <span className="truncate">{currentColl.name}</span>
                                </>
                            ) : (
                                <>
                                    <Folder size={10} className="text-blue-500 shrink-0" />
                                    <span>All Collections</span>
                                </>
                            )}
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 shrink-0 ${isCollectionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isCollectionOpen && (
                            <div className={`absolute top-full mt-1 left-0 z-50 w-60 rounded-xl border shadow-xl p-1 animate-dropdown ${
                                isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                            }`}>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-0.5 space-y-0.5">
                                    <button
                                        onClick={() => {
                                            setFilterCollection("All");
                                            setIsCollectionOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            filterCollection === 'All'
                                                ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                        }`}
                                    >
                                        <span className="flex items-center gap-2"><Folder size={12} className="text-zinc-400" /> All Tests</span>
                                        <span className="text-[9px] font-bold opacity-50 bg-zinc-500/10 px-1.5 py-0.5 rounded-full">{totalTestCount}</span>
                                    </button>
                                    <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
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
                                                    className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left pr-8 ${
                                                        filterCollection === c.id
                                                            ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                            : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                                    }`}
                                                >
                                                    {c.thumbnail ? (
                                                        <img src={c.thumbnail} className="w-3.5 h-3.5 rounded object-cover shrink-0" />
                                                    ) : (
                                                        <Folder size={12} className={
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
                                                    className="absolute right-2 p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                                                >
                                                    <Edit2 size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
                                <button
                                    onClick={() => {
                                        onAddCollection();
                                        setIsCollectionOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-colors"
                                >
                                    <Plus size={12} /> Add Collection
                                </button>
                                {onMigrate && (
                                    <>
                                        <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMigrate();
                                                setIsCollectionOpen(false);
                                            }}
                                            disabled={isMigrating}
                                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:bg-rose-500/5 transition-colors disabled:opacity-50"
                                        >
                                            {isMigrating ? <Loader2 size={8} className="animate-spin" /> : "Migrate Metadata"}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="relative shrink-0" ref={statusDropdownRef}>
                        <button
                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                                isDark ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                            }`}
                        >
                            {filterStatus === 'All' ? 'All Status' : filterStatus}
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${isStatusOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isStatusOpen && (
                            <div className={`absolute top-full mt-1 left-0 z-50 w-36 rounded-xl border shadow-xl p-1 space-y-0.5 animate-dropdown ${
                                isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                            }`}>
                                {['All', 'Public', 'Private'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setFilterStatus(status);
                                            setIsStatusOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            filterStatus === status 
                                                ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                        }`}
                                    >
                                        {status === 'All' ? 'All Status' : status === 'Public' ? <Globe size={12} className="text-emerald-500" /> : <Lock size={12} className="text-zinc-400" />}
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Access Filter Dropdown */}
                    <div className="relative shrink-0" ref={accessDropdownRef}>
                        <button
                            onClick={() => setIsAccessOpen(!isAccessOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                                isDark ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                            }`}
                        >
                            {filterAccess === 'All' ? 'All Access' : filterAccess === 'Free' ? 'Free Only' : 'Paid Only'}
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${isAccessOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAccessOpen && (
                            <div className={`absolute top-full mt-1 left-0 z-50 w-36 rounded-xl border shadow-xl p-1 space-y-0.5 animate-dropdown ${
                                isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                            }`}>
                                {['All', 'Free', 'Paid'].map(access => (
                                    <button
                                        key={access}
                                        onClick={() => {
                                            setFilterAccess(access);
                                            setIsAccessOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            filterAccess === access 
                                                ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                        }`}
                                    >
                                        {access === 'All' ? 'All Access' : access === 'Free' ? <Award size={12} className="text-emerald-500" /> : <Shield size={12} className="text-blue-500" />}
                                        {access === 'All' ? 'All Access' : access === 'Free' ? 'Free Only' : 'Paid Only'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tags Filter Dropdown */}
                    <div className="relative shrink-0" ref={tagDropdownRef}>
                        <button
                            onClick={() => setIsTagOpen(!isTagOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none max-w-[150px] ${
                                isDark ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                            }`}
                        >
                            <Hash size={10} className="text-blue-500 shrink-0" />
                            <span className="truncate">{filterTag === 'All' ? 'All Tags' : `#${filterTag}`}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 shrink-0 ${isTagOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isTagOpen && (
                            <div className={`absolute top-full mt-1 left-0 z-50 w-44 rounded-xl border shadow-xl p-1 animate-dropdown ${
                                isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                            }`}>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-0.5 space-y-0.5">
                                    <button
                                        onClick={() => {
                                            setFilterTag("All");
                                            setIsTagOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            filterTag === 'All' 
                                                ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                        }`}
                                    >
                                        <Hash size={12} className="text-zinc-400" />
                                        All Tags
                                    </button>
                                    <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
                                    {allAvailableTags.length === 0 ? (
                                        <span className="text-[10px] text-zinc-400 italic p-2 block text-center">No tags found</span>
                                    ) : allAvailableTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                setFilterTag(tag);
                                                setIsTagOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left truncate ${
                                                filterTag === tag 
                                                    ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                    : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                            }`}
                                        >
                                            <span className="text-blue-500 font-extrabold text-xs">#</span>
                                            <span className="truncate">{tag}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative shrink-0" ref={sortDropdownRef}>
                        <button
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                                isDark ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                            }`}
                        >
                            <ArrowUpDown size={10} className="text-zinc-400" />
                            <span>{currentSortOption.label}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isSortOpen && (
                            <div className={`absolute top-full mt-1 left-0 z-50 w-44 rounded-xl border shadow-xl p-1 space-y-0.5 animate-dropdown ${
                                isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
                            }`}>
                                {sortOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => {
                                            setSortBy(opt.field);
                                            setSortOrder(opt.order);
                                            setIsSortOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            sortBy === opt.field && sortOrder === opt.order
                                                ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950')
                                                : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950')
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Jami: <span className="text-blue-600 dark:text-blue-400 font-black">{totalTestCount} ta test</span>
                </div>
            </div>
        </header>
    );
};

export default AdminTestsToolbar;
