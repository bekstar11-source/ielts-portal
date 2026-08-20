import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    CaretDown, CaretLeft, CheckCircle, CheckSquare, Clock, ListChecks,
    Minus, Plus, MagnifyingGlass as SearchIcon, Square, Users, Warning, X
} from '@phosphor-icons/react';
import { useTranslation } from '../../../context/LanguageContext';
import { getTestTypeMeta } from './testTypeIcon';
import { formatQType, getReadingPassages, getListeningParts } from '../../../utils/TestUtils';
import { isDeadlinePast } from '../../../utils/teacherResults';
import { Shimmer } from '../TeacherSkeletons';
import AssignmentSettings from './AssignmentSettings';

export default function AssignTestForm({
    isDark,
    groups, availableTests, catalogLoading = false,
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
    const { t, lang } = useTranslation();
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [groupQuery, setGroupQuery] = useState('');
    const [onlySelected, setOnlySelected] = useState(false);
    const [expandedTestId, setExpandedTestId] = useState(null);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const groupDropdownRef = useRef(null);

    const card = isDark ? 'border-white/8' : 'border-gray-200 bg-white';
    const field = isDark
        ? 'bg-transparent border-white/10 text-white placeholder-gray-600 focus:border-white/25'
        : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400';
    const muted = isDark ? 'text-gray-500' : 'text-gray-500';

    // `title` yo'q testlar ilgari qidiruvsiz ham ro'yxatdan tushib qolardi:
    // `undefined?.toLowerCase()` → `undefined` → falsy.
    const filteredAvailableTests = useMemo(() => {
        const q = (searchTestQuery || '').toLowerCase();
        return availableTests.filter(t => {
            const matchesQuery = !q || (t?.title || '').toLowerCase().includes(q);
            const tLow = (t?.type || '').toLowerCase();
            let matchesType = testTypeFilter === 'all';
            if (!matchesType) {
                if (testTypeFilter === 'mock_full') {
                    matchesType = tLow.includes('mock') || tLow.includes('full');
                } else {
                    matchesType = tLow === testTypeFilter;
                }
            }
            const matchesSelected = !onlySelected || selectedTests.some(s => s.id === t.id);
            return matchesQuery && matchesType && matchesSelected;
        });
    }, [availableTests, searchTestQuery, testTypeFilter, onlySelected, selectedTests]);

    const filteredGroups = useMemo(() => {
        const q = groupQuery.trim().toLowerCase();
        return q ? groups.filter(g => (g.name || '').toLowerCase().includes(q)) : groups;
    }, [groups, groupQuery]);

    const isTestPrevAssignedInAny = (testId) =>
        groups.some(g => selectedGroupIds.has(g.id) && (g.assignedTests || []).some(a => a.id === testId));

    const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id));
    const studentTotal = selectedGroups.reduce((s, g) => s + (g.studentIds?.length || 0), 0);
    const duplicateCount = selectedTests.filter(t => isTestPrevAssignedInAny(t.id)).length;
    const hasDraft = selectedTests.length > 0 || selectedGroupIds.size > 0 || Boolean(deadline) || Boolean(teacherNote);
    const blocked = assigning || selectedTests.length === 0 || selectedGroupIds.size === 0 || isDeadlinePast(deadline);

    // Dropdown tashqarisiga bosilganda yoki Escape bosilganda yopilsin.
    useEffect(() => {
        if (!showGroupDropdown) return;
        const onPointerDown = (e) => {
            if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target)) {
                setShowGroupDropdown(false);
            }
        };
        const onKeyDown = (e) => { if (e.key === 'Escape') setShowGroupDropdown(false); };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showGroupDropdown]);

    const toggleGroupId = (gid) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(gid)) next.delete(gid); else next.add(gid);
            return next;
        });
    };

    const toggleTest = (test) => {
        setSelectedTests(prev =>
            prev.some(t => t.id === test.id) ? prev.filter(t => t.id !== test.id) : [...prev, test]
        );
    };

    const removeTest = (testId) => {
        setSelectedTests(prev => prev.filter(t => t.id !== testId));
        setSelectedPartsMap(prev => { const u = { ...prev }; delete u[testId]; return u; });
    };

    const clearSelectedTests = () => {
        setSelectedTests([]);
        setSelectedPartsMap({});
        setOnlySelected(false);
    };

    const handleBack = () => {
        if (hasDraft) setConfirmLeave(true);
        else onBack();
    };

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {/* Tasodifan chiqib ketishdan saqlaydi — tanlovlar saqlanmaydi */}
            {confirmLeave && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmLeave(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={e => e.stopPropagation()}
                        className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}
                    >
                        <p className={`text-sm leading-relaxed mb-5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {lang === 'uz' ? "Tanlangan ma'lumotlar saqlanmaydi. Chiqasizmi?" : "Selected data will not be saved. Do you want to leave?"}
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setConfirmLeave(false)}
                                className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                {lang === 'uz' ? "Qolaman" : "Stay"}
                            </button>
                            <button
                                autoFocus
                                onClick={() => { setConfirmLeave(false); onBack(); }}
                                className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors"
                            >
                                {lang === 'uz' ? "Chiqish" : "Leave"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back link — boshqa ustoz sahifalari bilan bir xil */}
            <button
                type="button"
                onClick={handleBack}
                className={`flex items-center gap-2 text-sm font-medium transition-colors -mb-1 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-900'}`}
            >
                <CaretLeft size={15} weight="bold" />
                {t('teacher.assignForm.backToTests') || (lang === 'uz' ? "Tayinlangan testlar" : "Assigned Tests")}
            </button>

            <div className="min-w-0">
                <h1 className={`text-[28px] leading-tight font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('teacher.assignForm.title') || (lang === 'uz' ? "Yangi tayinlash" : "New Assignment")}
                </h1>
                <p className={`text-sm mt-1 ${muted}`}>
                    {lang === 'uz' ? "Testlarni tanlang, guruh va muddatni belgilang." : "Select tests, group and set deadline."}
                </p>
            </div>

            <form onSubmit={onAssign} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* ── Chap: test tanlash ── */}
                <div className={`lg:col-span-7 rounded-2xl border ${card}`}>
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {lang === 'uz' ? "Testlar" : "Tests"}
                            </h2>
                            <div className="flex items-center gap-2">
                                {selectedTests.length > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setOnlySelected(v => !v)}
                                            className={`h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                                                onlySelected
                                                    ? (isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-gray-900 border-gray-900 text-white')
                                                    : (isDark ? 'border-white/8 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50')
                                            }`}
                                        >
                                            {lang === 'uz' ? `Tanlanganlar ${selectedTests.length}` : `Selected ${selectedTests.length}`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearSelectedTests}
                                            className={`h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                                        >
                                            {t('teacher.tests.copyModal.clear') || (lang === 'uz' ? "Tozalash" : "Clear")}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { key: 'all', label: t('teacher.assignForm.filterAll') || (lang === 'uz' ? 'Hammasi' : 'All') },
                                { key: 'reading', label: 'Reading' },
                                { key: 'listening', label: 'Listening' },
                                { key: 'writing', label: 'Writing' },
                                { key: 'mock_full', label: 'Mock' },
                                { key: 'podcast', label: 'Podcast' },
                                { key: 'article', label: 'Article' }
                            ].map(t => {
                                const active = testTypeFilter === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setTestTypeFilter(t.key)}
                                        className={`h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                                            active
                                                ? (isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-gray-900 border-gray-900 text-white')
                                                : (isDark ? 'border-white/8 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50')
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={lang === 'uz' ? "Test nomi…" : "Test title..."}
                                value={searchTestQuery}
                                onChange={e => setSearchTestQuery(e.target.value)}
                                className={`w-full h-10 pl-9 pr-8 rounded-xl border text-sm outline-none transition-colors ${field}`}
                            />
                            {searchTestQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTestQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <X size={12} weight="bold" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Ro'yxat */}
                    <div className={`max-h-[520px] overflow-y-auto custom-scrollbar border-t ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
                        {catalogLoading ? (
                            // Katalog faqat shu oyna ochilganda yuklanadi —
                            // "Test topilmadi" o'rniga qatorlar shakli ko'rinadi.
                            <div className={`divide-y ${isDark ? 'divide-white/8' : 'divide-gray-100'}`}>
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ '--stagger': i }}>
                                        <Shimmer className="h-4 w-4 flex-shrink-0" rounded="rounded" />
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <Shimmer className="h-3.5" rounded="rounded" style={{ width: `${46 + ((i * 21) % 34)}%` }} />
                                            <Shimmer className="h-2.5 w-24" rounded="rounded" />
                                        </div>
                                        <Shimmer className="h-5 w-16 flex-shrink-0" rounded="rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredAvailableTests.length === 0 ? (
                            <div className="py-16 text-center">
                                <SearchIcon size={24} className="mx-auto mb-2.5 text-gray-400 opacity-50" />
                                <p className={`text-sm ${muted}`}>{lang === 'uz' ? "Test topilmadi" : "No tests found"}</p>
                            </div>
                        ) : filteredAvailableTests.map(test => {
                            const isSelected = selectedTests.some(t => t.id === test.id);
                            const { label: typeLabel, dot } = getTestTypeMeta(test.type);
                            const prevAssigned = isTestPrevAssignedInAny(test.id);

                            const tLow = (test.type || '').toLowerCase();
                            const passagesArr = getReadingPassages(test);
                            const partsArr = getListeningParts(test);
                            const structure = tLow.includes('reading') ? passagesArr : tLow.includes('listening') ? partsArr : [];
                            const isFullListening = tLow.includes('listening') && partsArr.length > 1;

                            const questionCount = test.totalQuestions ?? test.questionsCount ?? test.questionCount
                                ?? (structure.reduce((s, p) => s + (p.qCount || 0), 0) || null);
                            const durationMin = test.duration ?? test.timeLimit ?? null;
                            const isExpanded = expandedTestId === test.id;

                            // Bitta neytral qator: turi · tuzilishi · savol · davomiylik
                            const metaParts = [typeLabel];
                            if (structure.length > 1) metaParts.push(`${structure.length} ${tLow.includes('reading') ? (lang === 'uz' ? 'passage' : 'passages') : (lang === 'uz' ? 'part' : 'parts')}`);
                            if (questionCount) metaParts.push(`${questionCount} ${lang === 'uz' ? 'savol' : 'questions'}`);
                            if (durationMin) metaParts.push(`${durationMin} ${lang === 'uz' ? 'daq' : 'min'}`);

                            const chosenParts = selectedPartsMap[test.id];

                            return (
                                <div
                                    key={test.id}
                                    className={`border-b last:border-b-0 transition-colors ${
                                        isDark
                                            ? `border-white/5 ${isSelected ? 'bg-blue-500/[0.06]' : 'hover:bg-white/[0.03]'}`
                                            : `border-gray-100 ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleTest(test)}
                                        aria-pressed={isSelected}
                                        className="w-full flex items-start gap-3 px-4 py-3 text-left"
                                    >
                                        <span className={`mt-0.5 w-[18px] h-[18px] rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600'
                                                : (isDark ? 'border-white/20' : 'border-gray-300')
                                        }`}>
                                            {isSelected && <CheckSquare size={12} weight="bold" className="text-white" />}
                                        </span>

                                        <span className="flex-1 min-w-0">
                                            <span className={`block text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                {test.title || 'Untitled Test'}
                                            </span>
                                            <span className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${muted}`}>
                                                <span className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                                    {metaParts.join(' · ')}
                                                </span>
                                                {selectedGroupIds.size > 0 && prevAssigned && (
                                                    <span className="text-amber-600 dark:text-amber-400">· {lang === 'uz' ? "ilgari berilgan" : "previously assigned"}</span>
                                                )}
                                            </span>
                                        </span>

                                        {structure.length > 0 && (
                                            <span
                                                role="button"
                                                tabIndex={-1}
                                                onClick={(e) => { e.stopPropagation(); setExpandedTestId(isExpanded ? null : test.id); }}
                                                className={`shrink-0 p-1 rounded-md transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                                                title={lang === 'uz' ? "Tuzilishini ko'rish" : "View structure"}
                                            >
                                                <CaretDown size={14} weight="bold" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </span>
                                        )}
                                    </button>

                                    {/* Tuzilishi — talab bo'lgandagina ochiladi */}
                                    {isExpanded && structure.length > 0 && (
                                        <div className={`px-4 pb-3 pl-[46px] space-y-1.5 text-[13px] ${muted}`}>
                                            {structure.map((p, pi) => (
                                                <div key={pi} className="flex items-start gap-2">
                                                    <span className={`shrink-0 w-[74px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{p.label}</span>
                                                    <span className="flex-1">
                                                        {p.qTypes.length > 0 ? p.qTypes.map(formatQType).join(', ') : '—'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Full listening — qaysi partlar tayinlanishi */}
                                    {isSelected && isFullListening && (
                                        <div className="px-4 pb-3 pl-[46px]">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`text-[13px] mr-1 ${muted}`}>{lang === 'uz' ? "Partlar:" : "Parts:"}</span>
                                                {partsArr.map((p, pi) => {
                                                    const partNum = pi + 1;
                                                    const isPartOn = !chosenParts || chosenParts.includes(partNum);
                                                    return (
                                                        <button
                                                            key={pi}
                                                            type="button"
                                                            onClick={() => {
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
                                                                    const updated = { ...prev };
                                                                    if (next.length === allNums.length) delete updated[test.id];
                                                                    else updated[test.id] = next;
                                                                    return updated;
                                                                });
                                                            }}
                                                            className={`h-7 px-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
                                                                isPartOn
                                                                    ? (isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-gray-900 border-gray-900 text-white')
                                                                    : (isDark ? 'border-white/8 text-gray-500 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50')
                                                            }`}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── O'ng: sozlamalar ── */}
                <div className={`lg:col-span-5 rounded-2xl border lg:sticky lg:top-6 ${card}`}>
                    <div className="p-4 space-y-5">
                        {/* Tanlangan testlar */}
                        <div className="space-y-2">
                            <h2 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {lang === 'uz' ? "Tanlangan testlar" : "Selected Tests"}
                                {selectedTests.length > 0 && <span className={`ml-1.5 font-normal ${muted}`}>{selectedTests.length}</span>}
                            </h2>
                            {selectedTests.length === 0 ? (
                                <div className={`rounded-xl border border-dashed py-6 text-center text-[13px] ${isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                    <ListChecks size={20} className="mx-auto mb-2 opacity-50" />
                                    {lang === 'uz' ? "Chap tomondan test tanlang" : "Select tests from the left side"}
                                </div>
                            ) : (
                                <div className="max-h-[168px] overflow-y-auto custom-scrollbar -mx-1 px-1 space-y-1">
                                    {selectedTests.map(test => {
                                        const { dot } = getTestTypeMeta(test.type);
                                        const partsArr = getListeningParts(test);
                                        const chosen = selectedPartsMap[test.id];
                                        const partLabel = chosen && chosen.length > 0 && chosen.length < partsArr.length
                                            ? chosen.map(n => `P${n}`).join('+')
                                            : null;
                                        return (
                                            <div
                                                key={test.id}
                                                className={`flex items-center gap-2 h-9 px-2.5 rounded-lg text-[13px] ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                                <span className={`flex-1 truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{test.title}</span>
                                                {partLabel && <span className={`shrink-0 ${muted}`}>{partLabel}</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTest(test.id)}
                                                    aria-label="Remove"
                                                    className="shrink-0 p-1 rounded text-gray-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <X size={12} weight="bold" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Guruhlar */}
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {lang === 'uz' ? "Guruhlar" : "Groups"}
                            </label>
                            <div className="relative" ref={groupDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowGroupDropdown(p => !p)}
                                    aria-expanded={showGroupDropdown}
                                    className={`w-full h-10 pl-9 pr-9 rounded-xl border text-sm text-left outline-none transition-colors flex items-center ${field}`}
                                >
                                    <Users size={15} className="absolute left-3 text-gray-400" />
                                    <span className={`flex-1 truncate ${selectedGroupIds.size === 0 ? 'text-gray-400' : ''}`}>
                                        {selectedGroupIds.size === 0
                                            ? (lang === 'uz' ? 'Guruh tanlang…' : 'Select group...')
                                            : selectedGroups.map(g => g.name).join(', ')}
                                    </span>
                                    <CaretDown size={14} className={`absolute right-3 text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showGroupDropdown && (
                                    <div className={`absolute z-30 top-full mt-1.5 w-full rounded-xl border shadow-lg overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                                        {groups.length > 6 && (
                                            <div className={`p-2 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={groupQuery}
                                                    onChange={e => setGroupQuery(e.target.value)}
                                                    placeholder={lang === 'uz' ? "Guruh qidirish…" : "Search groups..."}
                                                    className={`w-full h-9 px-3 rounded-lg border text-sm outline-none transition-colors ${field}`}
                                                />
                                            </div>
                                        )}
                                        <div className={`flex items-center justify-between px-3 py-2 border-b text-[13px] ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedGroupIds(new Set(filteredGroups.map(g => g.id)))}
                                                className="font-medium text-blue-500 hover:underline"
                                            >
                                                {lang === 'uz' ? "Barchasini tanlash" : "Select all"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedGroupIds(new Set())}
                                                className={`font-medium ${muted} hover:underline`}
                                            >
                                                {t('teacher.tests.copyModal.clear') || (lang === 'uz' ? "Tozalash" : "Clear")}
                                            </button>
                                        </div>
                                        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                            {filteredGroups.length === 0 ? (
                                                <p className={`px-3 py-4 text-[13px] text-center ${muted}`}>
                                                    {lang === 'uz' ? "Guruh topilmadi" : "No groups found"}
                                                </p>
                                            ) : filteredGroups.map(g => {
                                                const checked = selectedGroupIds.has(g.id);
                                                return (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => toggleGroupId(g.id)}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                                                            isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        {checked
                                                            ? <CheckSquare size={16} weight="fill" className="text-blue-500 shrink-0" />
                                                            : <Square size={16} className="text-gray-400 shrink-0" />}
                                                        <span className="flex-1 truncate">{g.name}</span>
                                                        <span className={`text-[13px] ${muted}`}>{g.studentIds?.length || 0}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {selectedGroupIds.size > 0 && (
                                <p className={`text-[13px] ${muted}`}>
                                    {lang === 'uz' 
                                        ? `${selectedGroupIds.size} ta guruh · ${studentTotal} o'quvchi`
                                        : `${selectedGroupIds.size} groups · ${studentTotal} students`}
                                </p>
                            )}
                        </div>

                        <AssignmentSettings
                            isDark={isDark}
                            value={{ deadline, maxAttempts, priority, teacherNote }}
                            onChange={patch => {
                                if ('deadline' in patch) setDeadline(patch.deadline);
                                if ('maxAttempts' in patch) setMaxAttempts(patch.maxAttempts);
                                if ('priority' in patch) setPriority(patch.priority);
                                if ('teacherNote' in patch) setTeacherNote(patch.teacherNote);
                            }}
                        />
                    </div>

                    {/* Yakuniy qadam */}
                    <div className={`p-4 border-t space-y-3 ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
                        {duplicateCount > 0 && (
                            <p className="flex items-start gap-1.5 text-[13px] text-amber-600 dark:text-amber-400">
                                <Warning size={14} weight="fill" className="shrink-0 mt-0.5" />
                                {lang === 'uz' 
                                    ? `${duplicateCount} ta test tanlangan guruhlarga ilgari berilgan.`
                                    : `${duplicateCount} tests were already assigned to selected groups.`}
                            </p>
                        )}
                        {selectedTests.length > 0 && selectedGroupIds.size > 0 && (
                            <p className={`text-[13px] ${muted}`}>
                                {lang === 'uz'
                                    ? `${selectedTests.length} ta test · ${selectedGroupIds.size} ta guruh · ${studentTotal} o'quvchi`
                                    : `${selectedTests.length} tests · ${selectedGroupIds.size} groups · ${studentTotal} students`}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={blocked}
                            className={`w-full h-11 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                blocked
                                    ? (isDark ? 'bg-white/8 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {assigning
                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : (t('teacher.assignForm.assignBtn') || (lang === 'uz' ? 'Tayinlash' : 'Assign'))}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
