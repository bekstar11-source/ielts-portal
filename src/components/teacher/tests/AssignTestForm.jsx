import React, { useState, useRef } from 'react';
import { ArrowLeft, CheckCircle, X } from '@phosphor-icons/react';
// Note: You will need to add the other Phosphor icons and Firebase imports later

export default function AssignTestForm({ 
    isDark, toast, showToast,
    groups, availableTests,
    selectedGroupIds, setSelectedGroupIds,
    searchTestQuery, setSearchTestQuery,
    testTypeFilter, setTestTypeFilter,
    selectedTests, setSelectedTests,
    deadline, setDeadline,
    maxAttempts, setMaxAttempts,
    teacherNote, setTeacherNote,
    priority, setPriority,
    assigning, selectedPartsMap, setSelectedPartsMap,
    onBack, onAssign
}) {
    const filteredAvailableTests = availableTests.filter(t => {
        const matchesQuery = t?.title?.toLowerCase().includes(searchTestQuery.toLowerCase());
        const tLow = (t?.type || '').toLowerCase();
        let matchesType = testTypeFilter === 'all';
        if (!matchesType) {
            if (testTypeFilter === 'mock_full') {
                matchesType = tLow.includes('mock') || tLow.includes('full');
            } else {
                matchesType = tLow === testTypeFilter;
            }
        }
        return matchesQuery && matchesType;
    });

    const isTestPrevAssignedInAny = (testId) =>
        groups.some(g => selectedGroupIds.has(g.id) && (g.assignedTests || []).some(a => a.id === testId));
    
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const groupDropdownRef = useRef(null);
    const selectedGroupNames = groups.filter(g => selectedGroupIds.has(g.id)).map(g => g.name);
    
    const toggleGroupId = (gid) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(gid)) next.delete(gid); else next.add(gid);
            return next;
        });
    };

    // We replace the handleAssignTest call with onAssign
    const handleAssignSubmit = (e) => {
        e.preventDefault();
        onAssign(e);
    };

    // Now the JSX
    return (
        <div className={`space-y-6 animate-fade-in-up text-left ${isDark ? 'text-white' : 'text-slate-800'}`}>
        return (
            <div className={`space-y-6 animate-fade-in-up text-left ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {/* Toast for assign page */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-fade-in-up ${
                    toast.type === 'error'
                        ? (isDark ? 'bg-rose-950 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700')
                        : (isDark ? 'bg-emerald-950 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                }`}>
                    {toast.type === 'error'
                        ? <X size={16} weight="bold" className="text-rose-500 shrink-0" />
                        : <CheckCircle size={16} weight="fill" className="text-emerald-500 shrink-0" />
                    }
                    {toast.message}
                </div>
            )}
                {/* Back Button and Header */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            setSelectedTests([]);
                            setSelectedGroupIds(new Set());
                            setSelectedPartsMap({});
                            setDeadline("");
                            setMaxAttempts("1");
                            setTeacherNote("");
                            setPriority("medium");
                            onBack();
                        }}
                        className={`flex items-center gap-2.5 transition-colors font-semibold text-sm group w-fit ${isDark ? 'text-gray-455 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all ${isDark ? 'bg-white/5 border-white/10 group-hover:border-white/20' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        Orqaga qaytish
                    </button>
                    
                    <div className="mt-2">
                        <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Yangi vazifa tayinlash</h1>
                        <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-gray-450' : 'text-gray-500'}`}>Guruhlar uchun yangi topshiriq tayyorlang va yuboring</p>
                    </div>
                </div>

                <form onSubmit={handleAssignSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Test Picker (col-span-7) */}
                    <div className={`lg:col-span-7 p-6 rounded-3xl border flex flex-col gap-5 ${
                        isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                    }`}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    1. Testni tanlang
                                </label>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {filteredAvailableTests.length} ta test
                                </span>
                            </div>
                            
                            {/* Type Filter Buttons */}
                            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-gray-100/50 dark:bg-[#2C2C2C]/50 border border-gray-200/50 dark:border-white/5">
                                {[
                                    { key: 'all', label: 'Barchasi' },
                                    { key: 'reading', label: 'Reading' },
                                    { key: 'listening', label: 'Listening' },
                                    { key: 'writing', label: 'Writing' },
                                    { key: 'mock_full', label: 'Mock' },
                                    { key: 'podcast', label: 'Podcast' },
                                    { key: 'article', label: 'Article' }
                                ].map(t => {
                                    const isActive = testTypeFilter === t.key;
                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setTestTypeFilter(t.key)}
                                            className={`flex-1 min-w-[70px] text-center py-2 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                isActive
                                                    ? 'bg-white dark:bg-[#1E1E1E] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/10'
                                                    : 'text-gray-500 dark:text-gray-450 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search Input */}
                            <div className="relative">
                                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Test nomini yozing..."
                                    value={searchTestQuery}
                                    onChange={e => setSearchTestQuery(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all duration-200 ${
                                        isDark 
                                            ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'
                                    }`}
                                />
                            </div>

                            {/* List of tests to select */}
                            <div className={`border rounded-2xl overflow-y-auto custom-scrollbar p-1.5 space-y-1.5 h-[420px] ${
                                isDark ? 'bg-[#2C2C2C]/50 border-white/10' : 'bg-gray-50/80 border-gray-200'
                            }`}>
                                {filteredAvailableTests.length > 0 ? (
                                    filteredAvailableTests.map(test => {
                                        const isSelected = selectedTests.some(t => t.id === test.id);
                                        const { icon, colorClass } = getTestIconAndColor(test.type);

                                        const isPreviouslyAssigned = isTestPrevAssignedInAny(test.id);

                                        // Rich metadata
                                        const questionCount = test.totalQuestions ?? test.questionsCount ?? test.questionCount ?? null;
                                        const durationMin = test.duration ?? test.timeLimit ?? null;
                                        const difficulty = test.difficulty ?? test.level ?? null;

                                        const difficultyConfig = {
                                            easy: { label: 'Oson', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                                            medium: { label: "O'rtacha", color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
                                            hard: { label: 'Qiyin', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
                                        }[difficulty?.toLowerCase()] ?? null;

                                        // Determine if full test or part test
                                        const tLow2 = (test.type || '').toLowerCase();
                                        const passagesArr = getReadingPassages(test);
                                        const partsArr = getListeningParts(test);
                                        const isFullReading = tLow2.includes('reading') && passagesArr.length > 1;
                                        const isPartReading = tLow2.includes('reading') && passagesArr.length === 1;
                                        const isFullListening = tLow2.includes('listening') && partsArr.length > 1;
                                        const isPartListening = tLow2.includes('listening') && partsArr.length === 1;

                                        let typeLabel;
                                        if (tLow2.includes('mock') || tLow2.includes('full')) typeLabel = 'Mock Exam';
                                        else if (isFullReading) typeLabel = `Full Reading · ${passagesArr.length}P`;
                                        else if (isPartReading) typeLabel = `Reading · Passage ${test.partNumber ?? 1}`;
                                        else if (isFullListening) typeLabel = `Full Listening · ${partsArr.length}P`;
                                        else if (isPartListening) typeLabel = `Listening · Part ${test.partNumber ?? 1}`;
                                        else typeLabel = (test.type || '').toUpperCase();

                                        return (
                                            <div
                                                key={test.id}
                                                onClick={() => {
                                                    setSelectedTests(prev =>
                                                        prev.some(t => t.id === test.id)
                                                            ? prev.filter(t => t.id !== test.id)
                                                            : [...prev, test]
                                                    );
                                                }}
                                                className={`p-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                                                    isSelected
                                                        ? (isDark ? 'bg-blue-600/12 border-blue-500/60 shadow-sm shadow-blue-500/10' : 'bg-blue-50 border-blue-300 shadow-sm')
                                                        : (isDark ? 'border-transparent hover:bg-white/5 hover:border-white/8' : 'border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm')
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon */}
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass} ${isSelected ? 'ring-2 ring-blue-500/30' : ''}`}>
                                                        {icon}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className={`text-sm font-bold leading-snug ${isSelected ? (isDark ? 'text-blue-300' : 'text-blue-800') : (isDark ? 'text-zinc-100' : 'text-gray-800')}`}>
                                                                {test.title || 'Untitled Test'}
                                                            </span>
                                                            {isSelected
                                                                ? <CheckCircle size={18} weight="fill" className="text-blue-500 shrink-0 mt-0.5" />
                                                                : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 dark:border-zinc-600 shrink-0 mt-0.5" />
                                                            }
                                                        </div>

                                                        {/* Badges row */}
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
                                                                {typeLabel}
                                                            </span>
                                                            {selectedGroupIds.size > 0 && (isPreviouslyAssigned ? (
                                                                <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
                                                                    Ilgari berilgan
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wide">
                                                                    Yangi
                                                                </span>
                                                            ))}
                                                            {difficultyConfig && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${difficultyConfig.bg} ${difficultyConfig.color}`}>
                                                                    {difficultyConfig.label}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Passage / Part structure — reuse already-computed arrays */}
                                                        {tLow2.includes('reading') && passagesArr.length > 0 ? (
                                                            <div className="mt-2 space-y-1.5">
                                                                {passagesArr.map((p, pi) => (
                                                                    <div key={pi} className="flex items-start gap-2">
                                                                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${
                                                                            isSelected
                                                                                ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                                                                                : 'bg-blue-500/8 text-blue-400 border-blue-500/15 dark:bg-blue-500/10'
                                                                        }`}>{p.label}</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {p.qTypes.length > 0
                                                                                ? p.qTypes.map((qt, qi) => (
                                                                                    <span key={qi} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-white/8">
                                                                                        {formatQType(qt)}
                                                                                    </span>
                                                                                ))
                                                                                : <span className="text-[9px] text-gray-400 dark:text-zinc-600 italic">—</span>
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : tLow2.includes('listening') && partsArr.length > 0 ? (
                                                            <div className="mt-2 space-y-1.5">
                                                                {partsArr.map((p, pi) => (
                                                                    <div key={pi} className="flex items-start gap-2">
                                                                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${
                                                                            isSelected
                                                                                ? 'bg-pink-500/15 text-pink-500 border-pink-500/30'
                                                                                : 'bg-pink-500/8 text-pink-400 border-pink-500/15 dark:bg-pink-500/10'
                                                                        }`}>{p.label}</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {p.qTypes.length > 0
                                                                                ? p.qTypes.map((qt, qi) => (
                                                                                    <span key={qi} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-white/8">
                                                                                        {formatQType(qt)}
                                                                                    </span>
                                                                                ))
                                                                                : <span className="text-[9px] text-gray-400 dark:text-zinc-600 italic">—</span>
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {isSelected && isFullListening && (
                                                                    <div className="mt-2 pt-2 border-t border-pink-500/15" onClick={e => e.stopPropagation()}>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-pink-500 mb-1.5">Tayinlanadigan partlar:</p>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {partsArr.map((p, pi) => {
                                                                                const partNum = pi + 1;
                                                                                const chosen = selectedPartsMap[test.id];
                                                                                const isPartOn = !chosen || chosen.includes(partNum);
                                                                                return (
                                                                                    <button
                                                                                        key={pi}
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setSelectedPartsMap(prev => {
                                                                                                const allNums = partsArr.map((_, i) => i + 1);
                                                                                                const current = prev[test.id] ?? allNums;
                                                                                                let next;
                                                                                                if (current.includes(partNum)) {
                                                                                                    next = current.filter(n => n !== partNum);
                                                                                                    if (next.length === 0) next = allNums;
                                                                                                } else {
                                                                                                    next = [...current, partNum].sort((a, b) => a - b);
                                                                                                }
                                                                                                const isAll = next.length === allNums.length;
                                                                                                const updated = { ...prev };
                                                                                                if (isAll) delete updated[test.id];
                                                                                                else updated[test.id] = next;
                                                                                                return updated;
                                                                                            });
                                                                                        }}
                                                                                        className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                                                                                            isPartOn
                                                                                                ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/40'
                                                                                                : (isDark ? 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200')
                                                                                        }`}
                                                                                    >
                                                                                        {p.label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        {selectedPartsMap[test.id] && selectedPartsMap[test.id].length < partsArr.length && (
                                                                            <p className="text-[9px] mt-1 text-amber-500 font-semibold">
                                                                                Faqat {selectedPartsMap[test.id].map(n => `Part ${n}`).join(', ')} tayinlanadi
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (questionCount || durationMin || test.description) ? (
                                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                                {questionCount && (
                                                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500 font-semibold">
                                                                        <ListChecks size={11} />{questionCount} savol
                                                                    </span>
                                                                )}
                                                                {durationMin && (
                                                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500 font-semibold">
                                                                        <Clock size={11} />{durationMin} daqiqa
                                                                    </span>
                                                                )}
                                                                {test.description && !questionCount && !durationMin && (
                                                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium truncate max-w-[260px] italic">
                                                                        {test.description}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                                        <SearchIcon size={28} className="text-gray-400" />
                                        <p className="text-xs font-semibold text-gray-400">Bunday test topilmadi</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Settings & Submit (col-span-5) */}
                    <div className={`lg:col-span-5 p-6 rounded-3xl border flex flex-col gap-5 lg:sticky lg:top-6 ${
                        isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                    }`}>
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    2. Sozlamalar
                                </label>
                                {selectedTests.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                        <CheckCircle size={10} weight="fill" />
                                        {selectedTests.length} tanlandi
                                    </span>
                                )}
                            </div>

                            {/* Selected items list */}
                            {selectedTests.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 p-2 rounded-xl bg-blue-500/5 dark:bg-blue-500/8 border border-blue-200/50 dark:border-blue-500/15">
                                        {selectedTests.map((test, idx) => {
                                            const { colorClass } = getTestIconAndColor(test.type);
                                            const prevAssigned = isTestPrevAssignedInAny(test.id);
                                            const tLowSel = (test.type || '').toLowerCase();
                                            const isFullListeningSel = tLowSel.includes('listening') && getListeningParts(test).length > 1;
                                            const chosenParts = selectedPartsMap[test.id];
                                            const partLabel = isFullListeningSel && chosenParts && chosenParts.length > 0 && chosenParts.length < getListeningParts(test).length
                                                ? chosenParts.map(n => `P${n}`).join('+')
                                                : null;
                                            return (
                                                <div key={test.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${prevAssigned ? 'bg-amber-500/5 border-amber-500/20 dark:border-amber-500/20' : 'bg-white dark:bg-[#2C2C2C]/70 border-gray-150 dark:border-white/5'}`}>
                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${colorClass}`}>
                                                        {test.type === 'mock_full' ? 'Mock' : (test.type || '').slice(0, 4).toUpperCase()}
                                                    </span>
                                                    <span className={`flex-1 truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{test.title}</span>
                                                    {partLabel && (
                                                        <span className="text-[8px] bg-pink-500/15 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/30 font-bold tracking-wider shrink-0">{partLabel}</span>
                                                    )}
                                                    {prevAssigned && (
                                                        <span className="text-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 uppercase font-bold tracking-wider shrink-0">Ilgari berilgan</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTests(prev => prev.filter(t => t.id !== test.id));
                                                            setSelectedPartsMap(prev => { const u = { ...prev }; delete u[test.id]; return u; });
                                                        }}
                                                        className="text-gray-400 hover:text-rose-500 p-0.5 rounded shrink-0 transition-colors"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedTests.length === 0 && (
                                <div className={`flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed ${isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                    <ListChecks size={22} className="opacity-40" />
                                    <span className="text-[11px] font-semibold opacity-60">Chap tomonda testni tanlang</span>
                                </div>
                            )}

                            {/* Multi-Group Select */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Users size={14} className="text-gray-400 shrink-0" /> Guruhlarni tanlang
                                    {selectedGroupIds.size > 0 && (
                                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            {selectedGroupIds.size} ta tanlandi
                                        </span>
                                    )}
                                </label>
                                <div className="relative" ref={groupDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowGroupDropdown(p => !p)}
                                        className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm font-semibold outline-none text-left transition-all duration-200 flex items-center ${
                                            isDark
                                                ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500'
                                                : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'
                                        } ${selectedGroupIds.size === 0 ? 'text-gray-400' : ''}`}
                                    >
                                        <Users size={18} className="absolute left-4 text-gray-400" />
                                        <span className="flex-1 truncate">
                                            {selectedGroupIds.size === 0
                                                ? "Guruhni tanlang..."
                                                : selectedGroupNames.join(', ')}
                                        </span>
                                        <CaretDown size={16} className={`absolute right-4 text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showGroupDropdown && (
                                        <div className={`absolute z-30 top-full mt-1.5 w-full rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                                            {groups.map(g => {
                                                const checked = selectedGroupIds.has(g.id);
                                                return (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => toggleGroupId(g.id)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left transition-all ${
                                                            checked
                                                                ? (isDark ? 'bg-blue-600/15 text-blue-300' : 'bg-blue-50 text-blue-700')
                                                                : (isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700')
                                                        }`}
                                                    >
                                                        {checked
                                                            ? <CheckSquare size={16} weight="fill" className="text-blue-500 shrink-0" />
                                                            : <Square size={16} className="text-gray-400 shrink-0" />}
                                                        <span className="flex-1">{g.name}</span>
                                                        {g.studentIds?.length > 0 && (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                                                {g.studentIds.length} o'q
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deadline */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Clock size={14} className="text-gray-400 shrink-0" /> Deadline (Muddati)
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {[
                                        { label: '+1 kun', days: 1 },
                                        { label: '+3 kun', days: 3 },
                                        { label: '+1 hafta', days: 7 },
                                        { label: '+2 hafta', days: 14 },
                                    ].map(({ label, days }) => (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + days);
                                                d.setSeconds(0, 0);
                                                setDeadline(d.toISOString().slice(0, 16));
                                            }}
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                    {deadline && (
                                        <button type="button" onClick={() => setDeadline('')}
                                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all">
                                            ✕ Tozalash
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none transition-all duration-200 ${
                                        isDark
                                            ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm'
                                    }`}
                                />
                            </div>

                            {/* Max Attempts Stepper */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <ArrowsCounterClockwise size={14} className="text-gray-400 shrink-0" /> Maksimal urinishlar
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={Number(maxAttempts) <= 1}
                                        onClick={() => setMaxAttempts(prev => String(Math.max(1, Number(prev) - 1)))}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-lg active:scale-95 transition-all ${
                                            isDark 
                                                ? 'bg-[#2C2C2C] border-white/10 text-white hover:bg-white/5 disabled:opacity-40' 
                                                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-40 shadow-sm'
                                        }`}
                                    >
                                        <Minus size={16} weight="bold" />
                                    </button>
                                    <span className={`w-12 text-center text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {maxAttempts}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={Number(maxAttempts) >= 10}
                                        onClick={() => setMaxAttempts(prev => String(Math.min(10, Number(prev) + 1)))}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-lg active:scale-95 transition-all ${
                                            isDark 
                                                ? 'bg-[#2C2C2C] border-white/10 text-white hover:bg-white/5 disabled:opacity-40' 
                                                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-40 shadow-sm'
                                        }`}
                                    >
                                        <Plus size={16} weight="bold" />
                                    </button>
                                </div>
                            </div>

                            {/* Priority Level */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Warning size={14} className="text-gray-400 shrink-0" /> Muhimlik darajasi
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'low', label: 'Past', icon: <ShieldWarning size={13} className="text-emerald-500" />, activeClass: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                                        { key: 'medium', label: 'O\'rtacha', icon: <Warning size={13} className="text-amber-500" />, activeClass: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                                        { key: 'high', label: 'Yuqori', icon: <Flame size={13} className="text-rose-500" />, activeClass: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400' }
                                    ].map(item => {
                                        const isSelected = priority === item.key;
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setPriority(item.key)}
                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                                    isSelected ? item.activeClass : (isDark ? 'border-white/5 text-gray-450 bg-[#2C2C2C]/50 hover:bg-white/5' : 'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 shadow-sm')
                                                }`}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Teacher Note / Instructions */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    O'quvchilarga eslatma / izoh
                                </label>
                                <textarea
                                    value={teacherNote}
                                    onChange={e => setTeacherNote(e.target.value)}
                                    placeholder="Masalan: Testning har bir qismini diqqat bilan o'qing va yangi lug'atlarni yozib boring..."
                                    rows={3}
                                    className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none resize-none transition-all duration-200 ${
                                        isDark 
                                            ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-gray-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder-gray-400 shadow-sm'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-dashed border-gray-200 dark:border-white/10 space-y-3">
                            {selectedTests.length > 0 && selectedGroupIds.size > 0 && (
                                <div className={`flex items-center gap-2 p-3 rounded-xl text-[11px] font-semibold ${isDark ? 'bg-blue-500/8 text-blue-300 border border-blue-500/15' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                    <Lightning size={13} weight="fill" className="text-blue-500 shrink-0" />
                                    <span>{selectedTests.length} ta test · {selectedGroupIds.size} ta guruh · {groups.filter(g => selectedGroupIds.has(g.id)).reduce((s, g) => s + (g.studentIds?.length || 0), 0)} o'quvchi</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={assigning || selectedTests.length === 0 || selectedGroupIds.size === 0}
                                className={`w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                    ${assigning || selectedTests.length === 0 || selectedGroupIds.size === 0
                                        ? 'bg-blue-600/40 cursor-not-allowed text-white/60'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98]'
                                    }
                                `}
                            >
                                {assigning
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><Lightning size={16} weight="fill" /> Vazifalarni tayinlash ({selectedTests.length} × {selectedGroupIds.size} guruh)</>
                                }
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
        </div>
    );
}
