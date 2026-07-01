import React, { useState, useRef, useEffect } from 'react';
import {
    Search, LayoutGrid, List, Plus, FolderPlus, GitMerge, ChevronDown,
    Folder, BookOpen, Headphones, PenTool, Mic2, Layers, Award, Edit2, Loader2,
    Upload, Download, Trash2, Shield, Globe, Lock, ArrowUpDown, RefreshCw, Eye, Hash
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const AdminTestsToolbar = ({
    searchTerm, setSearchTerm, viewMode, setViewMode,
    selectedCount, onBulkAssign, onMerge, onCreate,
    collections = [],
    filterCollection = "All",
    setFilterCollection,
    filterType = "All",
    setFilterType,
    totalTestCount = 0,
    mergedCount = 0,
    onAddCollection,
    onEditCollection,
    onMigrate,
    isMigrating,
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
    onBulkDelete,
    onBulkStatusChange,
    onBulkAccessChange,
    onImport,
    onExportJSON,
    onExportCSV,
    onOpenQuestionBank
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Single dropdown state: which dropdown is open, or null
    const [openDropdown, setOpenDropdown] = useState(null);
    const containerRef = useRef(null);

    const toggleDropdown = (name) => setOpenDropdown(prev => prev === name ? null : name);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const closeDropdown = () => setOpenDropdown(null);

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

    const dropdownBase = `absolute top-full mt-1 left-0 z-50 rounded-xl border shadow-xl p-1 animate-dropdown ${
        isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
    }`;
    const dropdownItemBase = `w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left`;
    const dropdownItemActive = isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950';
    const dropdownItemInactive = isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950';
    const filterBtnClass = (isActive) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
        isActive
            ? isDark
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                : 'bg-blue-50 border-blue-300 text-blue-700'
            : isDark
                ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'
                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
    }`;

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
                    <div className="relative w-full max-w-[200px] shrink-0">
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
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            <button onClick={onBulkAssign} title="Guruhli ko'chirish" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-blue-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <FolderPlus size={13} />
                                <span className="hidden sm:inline">Ko'chir</span>
                            </button>
                            {selectedCount >= 2 && (
                                <button onClick={onMerge} title="Testlarni birlashtirish" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-emerald-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                    <GitMerge size={13} />
                                    <span className="hidden sm:inline">Birlashtir</span>
                                </button>
                            )}
                            <button onClick={() => onBulkStatusChange(true)} title="Public qilish" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-emerald-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Globe size={13} />
                                <span className="hidden sm:inline">Public</span>
                            </button>
                            <button onClick={() => onBulkStatusChange(false)} title="Private qilish" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-zinc-700 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Lock size={13} />
                                <span className="hidden sm:inline">Private</span>
                            </button>
                            <button onClick={() => onBulkAccessChange(true)} title="Bepul (Free) qilish" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-emerald-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Globe size={13} className="text-emerald-500" />
                                <span className="hidden sm:inline">Free</span>
                            </button>
                            <button onClick={() => onBulkAccessChange(false)} title="Premium (Paid) qilish" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-blue-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Shield size={13} className="text-blue-500" />
                                <span className="hidden sm:inline">Premium</span>
                            </button>

                            <div className="h-5 w-px bg-zinc-250 dark:bg-white/10 mx-0.5" />

                            <button onClick={onExportJSON} title="JSON formatda yuklash" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-amber-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Download size={13} />
                                <span className="hidden sm:inline">JSON</span>
                            </button>
                            <button onClick={onExportCSV} title="CSV ro'yxatni yuklash" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-zinc-500 hover:text-blue-500 transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                                <Download size={13} />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
                            <button onClick={onBulkDelete} title="Guruhli o'chirish" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all text-xs font-bold">
                                <Trash2 size={13} />
                                <span className="hidden sm:inline">O'chir</span>
                            </button>

                            <div className="h-5 w-px bg-zinc-250 dark:bg-white/10 mx-0.5" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 md:gap-2">
                            <button
                                onClick={onOpenQuestionBank}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                                }`}
                            >
                                <BookOpen size={12} className="text-blue-500" />
                                <span className="hidden sm:inline">Savollar banki</span>
                            </button>

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
            <div ref={containerRef} className="flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 dark:border-white/5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-widest mr-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Filters:</span>

                    {/* Module Type Dropdown */}
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('module')} className={filterBtnClass(filterType !== 'All')}>
                            {getModuleIcon(filterType)}
                            <span>{filterType === 'All' ? 'All Modules' : filterType}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${openDropdown === 'module' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'module' && (
                            <div className={`${dropdownBase} w-44 space-y-0.5`}>
                                {TEST_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setFilterType(type); closeDropdown(); }}
                                        className={`${dropdownItemBase} ${filterType === type ? dropdownItemActive : dropdownItemInactive}`}
                                    >
                                        {getModuleIcon(type)}
                                        {type === 'All' ? 'All Modules' : type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Collection Dropdown */}
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('collection')} className={`${filterBtnClass(filterCollection !== 'All')} whitespace-nowrap`}>
                            {currentColl ? (
                                <>
                                    {currentColl.thumbnail ? (
                                        <img src={currentColl.thumbnail} className="w-3.5 h-3.5 rounded object-cover shrink-0" alt="" />
                                    ) : (
                                        <Folder size={10} className={
                                            currentColl.type === 'listening' ? 'text-amber-500 shrink-0' :
                                            currentColl.type === 'reading' ? 'text-emerald-500 shrink-0' :
                                            currentColl.type === 'mock' ? 'text-blue-500 shrink-0' : 'text-zinc-400 shrink-0'
                                        } />
                                    )}
                                    <span className="truncate">{currentColl.name}</span>
                                </>
                            ) : filterCollection === "Merged" ? (
                                <>
                                    <GitMerge size={10} className="text-purple-500 shrink-0" />
                                    <span>Merged Tests</span>
                                </>
                            ) : (
                                <>
                                    <Folder size={10} className="text-blue-500 shrink-0" />
                                    <span>All Collections</span>
                                </>
                            )}
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 shrink-0 ${openDropdown === 'collection' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'collection' && (
                            <div className={`${dropdownBase} w-60`}>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-0.5 space-y-0.5">
                                    <button
                                        onClick={() => { setFilterCollection("All"); closeDropdown(); }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCollection === 'All' ? dropdownItemActive : dropdownItemInactive}`}
                                    >
                                        <span className="flex items-center gap-2"><Folder size={12} className="text-zinc-400" /> All Tests</span>
                                        <span className="text-[9px] font-bold opacity-50 bg-zinc-500/10 px-1.5 py-0.5 rounded-full">{totalTestCount}</span>
                                    </button>
                                    <button
                                        onClick={() => { setFilterCollection("Merged"); closeDropdown(); }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCollection === 'Merged' ? dropdownItemActive : dropdownItemInactive}`}
                                    >
                                        <span className="flex items-center gap-2"><GitMerge size={12} className="text-purple-500 shrink-0" /> Merged Tests</span>
                                        <span className="text-[9px] font-bold opacity-50 bg-zinc-500/10 px-1.5 py-0.5 rounded-full">{mergedCount}</span>
                                    </button>
                                    <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
                                    {collections.map(c => {
                                        const isListening = c.type === 'listening';
                                        const isReading = c.type === 'reading';
                                        const isMock = c.type === 'mock';
                                        return (
                                            <div key={c.id} className="group relative flex items-center">
                                                <button
                                                    onClick={() => { setFilterCollection(c.id); closeDropdown(); }}
                                                    className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left pr-8 ${filterCollection === c.id ? dropdownItemActive : dropdownItemInactive}`}
                                                >
                                                    {c.thumbnail ? (
                                                        <img src={c.thumbnail} className="w-3.5 h-3.5 rounded object-cover shrink-0" alt="" />
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
                                                    onClick={(e) => { e.stopPropagation(); onEditCollection(c); closeDropdown(); }}
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
                                    onClick={() => { onAddCollection(); closeDropdown(); }}
                                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-colors"
                                >
                                    <Plus size={12} /> Add Collection
                                </button>
                                {onMigrate && (
                                    <>
                                        <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onMigrate(); closeDropdown(); }}
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

                    {/* Status Filter */}
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('status')} className={filterBtnClass(filterStatus !== 'All')}>
                            {filterStatus === 'All' ? 'All Status' : filterStatus}
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'status' && (
                            <div className={`${dropdownBase} w-36 space-y-0.5`}>
                                {['All', 'Public', 'Private'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => { setFilterStatus(status); closeDropdown(); }}
                                        className={`${dropdownItemBase} ${filterStatus === status ? dropdownItemActive : dropdownItemInactive}`}
                                    >
                                        {status === 'Public' && <Globe size={12} className="text-emerald-500" />}
                                        {status === 'Private' && <Lock size={12} className="text-zinc-400" />}
                                        {status === 'All' ? 'All Status' : status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Access Filter */}
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('access')} className={filterBtnClass(filterAccess !== 'All')}>
                            {filterAccess === 'All' ? 'All Access' : filterAccess === 'Free' ? 'Free Only' : 'Paid Only'}
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${openDropdown === 'access' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'access' && (
                            <div className={`${dropdownBase} w-36 space-y-0.5`}>
                                {['All', 'Free', 'Paid'].map(access => (
                                    <button
                                        key={access}
                                        onClick={() => { setFilterAccess(access); closeDropdown(); }}
                                        className={`${dropdownItemBase} ${filterAccess === access ? dropdownItemActive : dropdownItemInactive}`}
                                    >
                                        {access === 'Free' && <Globe size={12} className="text-emerald-500" />}
                                        {access === 'Paid' && <Shield size={12} className="text-blue-500" />}
                                        {access === 'All' ? 'All Access' : access === 'Free' ? 'Free Only' : 'Paid Only'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tags Filter */}
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('tag')} className={`${filterBtnClass(filterTag !== 'All')} whitespace-nowrap max-w-[160px]`}>
                            <Hash size={10} className="text-blue-500 shrink-0" />
                            <span className="truncate">{filterTag === 'All' ? 'All Tags' : `#${filterTag}`}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 shrink-0 ${openDropdown === 'tag' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'tag' && (
                            <div className={`${dropdownBase} w-44`}>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-0.5 space-y-0.5">
                                    <button
                                        onClick={() => { setFilterTag("All"); closeDropdown(); }}
                                        className={`${dropdownItemBase} ${filterTag === 'All' ? dropdownItemActive : dropdownItemInactive}`}
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
                                            onClick={() => { setFilterTag(tag); closeDropdown(); }}
                                            className={`${dropdownItemBase} truncate ${filterTag === tag ? dropdownItemActive : dropdownItemInactive}`}
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
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('sort')} className={filterBtnClass(sortBy !== 'createdAt' || sortOrder !== 'desc')}>
                            <ArrowUpDown size={10} className="text-zinc-400" />
                            <span>{currentSortOption.label}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'sort' && (
                            <div className={`${dropdownBase} w-44 space-y-0.5`}>
                                {sortOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSortBy(opt.field); setSortOrder(opt.order); closeDropdown(); }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            sortBy === opt.field && sortOrder === opt.order ? dropdownItemActive : dropdownItemInactive
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
