import React, { useState, useRef, useEffect } from 'react';
import {
    Search, LayoutGrid, List, Plus, GitMerge, ChevronDown,
    Folder, BookOpen, Headphones, PenTool, Mic2, Layers, Award, Edit2, Loader2,
    Upload, Globe, Lock, ArrowUpDown, RefreshCw, MoreHorizontal, BarChart3, Sparkles,
    CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const AdminTestsToolbar = ({
    searchTerm, setSearchTerm,
    contentSearchTerm, setContentSearchTerm,
    viewMode, setViewMode,
    onCreate,
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
    filterCompleteness = "All",
    setFilterCompleteness,
    sortBy = "createdAt",
    setSortBy,
    sortOrder = "desc",
    setSortOrder,
    onImport,
    onOpenQuestionBank,
    onFindDuplicates,
    stats = null
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Single dropdown state: which dropdown is open, or null
    const [openDropdown, setOpenDropdown] = useState(null);
    const containerRef = useRef(null);
    const actionsRef = useRef(null);

    const toggleDropdown = (name) => setOpenDropdown(prev => prev === name ? null : name);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            const inFilters = containerRef.current && containerRef.current.contains(e.target);
            const inActions = actionsRef.current && actionsRef.current.contains(e.target);
            if (!inFilters && !inActions) {
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

    // Per-passage/part options for the "search by specific Passage/Part" section —
    // only meaningful once the admin has narrowed down to Reading or Listening.
    const segmentFilterOptions = filterType === 'Reading'
        ? [{ label: 'P1', title: 'Passage 1' }, { label: 'P2', title: 'Passage 2' }, { label: 'P3', title: 'Passage 3' }]
        : filterType === 'Listening'
            ? [{ label: 'Pt1', title: 'Part 1' }, { label: 'Pt2', title: 'Part 2' }, { label: 'Pt3', title: 'Part 3' }, { label: 'Pt4', title: 'Part 4' }]
            : [];

    const completenessLabel = (value) => {
        if (value === 'All') return 'Qismlar';
        if (value === 'Complete') return "To'liq";
        if (value === 'Incomplete') return "To'liq emas";
        if (value.startsWith('Missing')) {
            const label = value.slice('Missing'.length);
            const opt = segmentFilterOptions.find(o => o.label === label);
            return opt ? `${opt.title} yo'q` : 'Qismlar';
        }
        return 'Qismlar';
    };

    const dropdownBase = `absolute top-full mt-1 left-0 z-50 rounded-xl border shadow-xl p-1 animate-dropdown ${
        isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-zinc-150 text-zinc-850'
    }`;
    const dropdownItemBase = `w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left`;
    const dropdownItemActive = isDark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-950';
    const dropdownItemInactive = isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950';
    const filterBtnClass = (isActive) => `flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all select-none ${
        isActive
            ? isDark
                ? 'bg-blue-500/25 border-blue-500/60 text-blue-300 shadow-sm shadow-blue-500/10'
                : 'bg-blue-100 border-blue-400 text-blue-800 shadow-sm shadow-blue-500/10'
            : isDark
                ? 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'
                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
    }`;
    const secondaryBtnClass = `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
        isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
    }`;

    return (
        <header className={`border-b flex flex-col px-6 py-3.5 shrink-0 transition-colors z-45 gap-4 ${isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-zinc-200'}`}>
            {/* Top Row: Search & Actions */}
            <div className="flex items-end justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="flex items-end gap-3 flex-1 min-w-[260px]">
                    {/* View Mode Toggle */}
                    <div className={`flex p-1 rounded-lg shrink-0 ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                        <button onClick={() => setViewMode('grid')} title="Grid ko'rinish" className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setViewMode('list')} title="Ro'yxat ko'rinish" className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><List size={14} /></button>
                    </div>

                    {/* Search by Title Box */}
                    <div className="flex flex-col gap-1 w-full max-w-[220px] shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Nomi</span>
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} size={13} />
                            <input
                                type="text"
                                placeholder="Nomi bo'yicha qidirish..."
                                className={`w-full border-none pl-8 pr-3 py-2 rounded-lg text-sm outline-none transition-all ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-zinc-100 focus:bg-zinc-200/50'}`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Search by Content Box */}
                    <div className="flex flex-col gap-1 w-full max-w-[220px] shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Matn</span>
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} size={13} />
                            <input
                                type="text"
                                placeholder="Matn bo'yicha qidirish..."
                                className={`w-full border-none pl-8 pr-3 py-2 rounded-lg text-sm outline-none transition-all ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-zinc-100 focus:bg-zinc-200/50'}`}
                                value={contentSearchTerm}
                                onChange={e => setContentSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div ref={actionsRef} className="flex items-center gap-2 shrink-0 relative">
                    <button onClick={onOpenQuestionBank} className={secondaryBtnClass}>
                        <BookOpen size={12} className="text-blue-500" />
                        <span className="hidden sm:inline">Savollar banki</span>
                    </button>

                    <button onClick={onFindDuplicates} className={secondaryBtnClass}>
                        <Search size={12} className="text-purple-500" />
                        <span className="hidden sm:inline">Duplikatlar</span>
                    </button>

                    <button onClick={onImport} className={secondaryBtnClass}>
                        <Upload size={12} className="text-amber-500" />
                        <span className="hidden sm:inline">JSON Import</span>
                    </button>

                    {onMigrate && (
                        <div className="relative">
                            <button
                                onClick={() => toggleDropdown('overflow')}
                                title="Qo'shimcha amallar"
                                className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-600'}`}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            {openDropdown === 'overflow' && (
                                <div className={`${dropdownBase} w-56 right-0 left-auto`}>
                                    <button
                                        onClick={() => { onMigrate(); closeDropdown(); }}
                                        disabled={isMigrating}
                                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left disabled:opacity-50 ${
                                            isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
                                        }`}
                                    >
                                        {isMigrating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                        Migrate Metadata
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={onCreate} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 ${isDark ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                        <Plus size={12} />
                        <span>Create Test</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row: Filters & Sort */}
            <div ref={containerRef} className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-white/5 flex-wrap">
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
                                        {access === 'Paid' && <Award size={12} className="text-blue-500" />}
                                        {access === 'All' ? 'All Access' : access === 'Free' ? 'Free Only' : 'Paid Only'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                {/* Structure Completeness Filter (Reading/Listening: missing passages/parts, or a specific Passage/Part) */}
                    <div className="relative shrink-0">
                        <button onClick={() => toggleDropdown('completeness')} className={filterBtnClass(filterCompleteness !== 'All')} title="Reading/Listening testlarini qismlari (Passage/Part) bo'yicha tekshirish yoki qidirish">
                            {filterCompleteness === 'Complete' ? <CheckCircle2 size={12} className="text-emerald-500" /> : filterCompleteness.startsWith('Missing') || filterCompleteness === 'Incomplete' ? <AlertTriangle size={12} className="text-amber-500" /> : <Layers size={10} className="text-zinc-400" />}
                            <span>{completenessLabel(filterCompleteness)}</span>
                            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${openDropdown === 'completeness' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'completeness' && (
                            <div className={`${dropdownBase} w-56 space-y-0.5`}>
                                <button
                                    onClick={() => { setFilterCompleteness("All"); closeDropdown(); }}
                                    className={`${dropdownItemBase} ${filterCompleteness === 'All' ? dropdownItemActive : dropdownItemInactive}`}
                                >
                                    <Layers size={12} className="text-zinc-400" />
                                    Barcha testlar
                                </button>
                                <button
                                    onClick={() => { setFilterCompleteness("Complete"); closeDropdown(); }}
                                    className={`${dropdownItemBase} ${filterCompleteness === 'Complete' ? dropdownItemActive : dropdownItemInactive}`}
                                >
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    To'liq (barcha qismlar mavjud)
                                </button>
                                <button
                                    onClick={() => { setFilterCompleteness("Incomplete"); closeDropdown(); }}
                                    className={`${dropdownItemBase} ${filterCompleteness === 'Incomplete' ? dropdownItemActive : dropdownItemInactive}`}
                                >
                                    <AlertTriangle size={12} className="text-amber-500" />
                                    To'liq emas (qism yetishmayapti)
                                </button>

                                {segmentFilterOptions.length > 0 && (
                                    <>
                                        <div className="h-px bg-zinc-150 dark:bg-white/5 my-1" />
                                        <span className={`block px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                            {filterType === 'Listening' ? "Aniq Part bo'yicha qidirish" : "Aniq Passage bo'yicha qidirish"}
                                        </span>
                                        {segmentFilterOptions.map(({ label, title }) => {
                                            const value = `Missing${label}`;
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => { setFilterCompleteness(value); closeDropdown(); }}
                                                    className={`${dropdownItemBase} ${filterCompleteness === value ? dropdownItemActive : dropdownItemInactive}`}
                                                >
                                                    <AlertTriangle size={12} className="text-amber-500" />
                                                    {title} yo'q
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
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

                <div className="relative shrink-0">
                    <button
                        onClick={() => toggleDropdown('stats')}
                        className={filterBtnClass(openDropdown === 'stats')}
                    >
                        <BarChart3 size={13} />
                        <span>{totalTestCount} ta test</span>
                        <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${openDropdown === 'stats' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'stats' && stats && (
                        <div className={`${dropdownBase} left-auto right-0 w-[280px] p-2 grid grid-cols-2 gap-1`}>
                            {[
                                { title: "Tests", value: stats.total, icon: <Layers size={12} className="text-blue-500" /> },
                                { title: "Mock", value: stats.mockCount, icon: <Award size={12} className="text-rose-500" /> },
                                { title: "Reading", value: stats.readingCount, icon: <BookOpen size={12} className="text-emerald-500" /> },
                                { title: "Listening", value: stats.listeningCount, icon: <Headphones size={12} className="text-amber-500" /> },
                                { title: "Writing", value: stats.writingCount, icon: <PenTool size={12} className="text-violet-500" /> },
                                { title: "Speaking", value: stats.speakingCount, icon: <Mic2 size={12} className="text-fuchsia-500" /> },
                                { title: "Public", value: stats.publicCount, icon: <Globe size={12} className="text-teal-500" /> },
                                { title: "Private", value: stats.privateCount, icon: <Lock size={12} className="text-zinc-500" /> },
                                { title: "Free", value: stats.freeCount, icon: <Sparkles size={12} className="text-cyan-500" /> }
                            ].map((card, i) => (
                                <div key={i} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'}`}>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {card.icon}
                                        <span className={`text-[10px] font-black uppercase tracking-wider truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{card.title}</span>
                                    </div>
                                    <span className="text-xs font-black tracking-tight shrink-0">{card.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminTestsToolbar;
