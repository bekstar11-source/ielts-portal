import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, BellRinging, DownloadSimple, ArrowsCounterClockwise, 
    Users, Warning, Info, Trash, Plus, Minus, CheckCircle, ShieldWarning, NotePencil,
    ArrowsDownUp, Clock, Flame, MagnifyingGlass, X
} from '@phosphor-icons/react';

export default function MonitorTestPage({ 
    isDark, toast, showToast,
    monitoringTest, results, podcastAttempts, students, groups,
    onBack, fetchData, sendReminder, exportMonitorCSV
}) {
    const navigate = useNavigate();
    const [monitorSearch, setMonitorSearch] = useState('');
    const [monitorSort, setMonitorSort] = useState({ col: null, dir: 'asc' });
    const [sendingReminder, setSendingReminder] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [activeMonitorFilter, setActiveMonitorFilter] = useState("all");

    const monitoringStudents = students
            .filter(s => s.groupId === monitoringTest.groupId)
            .map(student => {
                let submitted = false;
                let score = "-";
                let submitDate = "-";
                let resDoc = null;
                let att = null;
                let isLow = false;
                let hasViolation = false;
                let violationText = null;

                if (monitoringTest.type === 'podcast') {
                    att = podcastAttempts.find(a => a.userId === student.id && a.podcastId === monitoringTest.id);
                    submitted = !!att?.completedAt;
                    score = att?.ieltsBands?.overall ? `${att.ieltsBands.overall} Band` : "-";
                    submitDate = att?.completedAt ? (att.completedAt.toDate ? att.completedAt.toDate() : new Date(att.completedAt)).toLocaleDateString() : "-";
                    
                    const band = parseFloat(att?.ieltsBands?.overall);
                    if (submitted && !isNaN(band) && band < 5.5) {
                        isLow = true;
                    }
                } else if (monitoringTest.type === 'article') {
                    submitted = student.awardedItems?.includes(monitoringTest.id);
                    score = submitted ? "O'qilgan (10 XP)" : "-";
                    submitDate = "-";
                } else {
                    resDoc = results.find(r => 
                        String(r.testId).trim() === String(monitoringTest.id).trim() && 
                        r.userId === student.id
                    );
                    submitted = !!resDoc;
                    score = resDoc ? (resDoc.bandScore || resDoc.score) : "-";
                    submitDate = resDoc?.date ? (resDoc.date.toDate ? resDoc.date.toDate() : new Date(resDoc.date)).toLocaleDateString() : "-";
                    
                    if (submitted && resDoc) {
                        // Check low score
                        if (resDoc.bandScore) {
                            const band = parseFloat(resDoc.bandScore);
                            if (!isNaN(band) && band < 5.5) isLow = true;
                        } else if (resDoc.score !== undefined && resDoc.score !== '-') {
                            const cleanScore = String(resDoc.score).replace(/[^\d./]/g, '').trim();
                            if (cleanScore.includes('/')) {
                                const [achieved, total] = cleanScore.split('/').map(Number);
                                if (!isNaN(achieved) && !isNaN(total) && total > 0) {
                                    isLow = (achieved / total) < 0.5;
                                }
                            } else {
                                const val = parseFloat(cleanScore);
                                if (!isNaN(val)) {
                                    if (val <= 9) isLow = val < 5.5;
                                    else isLow = val < 20;
                                }
                            }
                        }

                        // Check violations
                        let timeSpentSeconds = 0;
                        let dbTimeSpent = resDoc.timeSpent;
                        if (dbTimeSpent === undefined && resDoc.attempts && Array.isArray(resDoc.attempts) && resDoc.attempts.length > 0) {
                            const lastAttempt = resDoc.attempts[resDoc.attempts.length - 1];
                            dbTimeSpent = lastAttempt.timeSpent;
                        }

                        if (dbTimeSpent) {
                            timeSpentSeconds = dbTimeSpent;
                        } else if (resDoc.duration) {
                            timeSpentSeconds = resDoc.duration * 60;
                        } else if (resDoc.startedAt && resDoc.date) {
                            const start = resDoc.startedAt.toDate ? resDoc.startedAt.toDate() : new Date(resDoc.startedAt);
                            const end = resDoc.date.toDate ? resDoc.date.toDate() : new Date(resDoc.date);
                            timeSpentSeconds = Math.floor((end - start) / 1000);
                        }

                        const isPartTest = resDoc.partNumber != null || 
                                           (resDoc.testTitle && (
                                             resDoc.testTitle.toLowerCase().includes("part") || 
                                             resDoc.testTitle.toLowerCase().includes("passage") || 
                                             resDoc.testTitle.toLowerCase().includes("section")
                                           ));

                        const isFast = !isPartTest && (resDoc.status === 'graded' || resDoc.status === 'published') && timeSpentSeconds > 0 && timeSpentSeconds < 600 && resDoc.type !== 'speaking';
                        hasViolation = !!resDoc.violation || isFast;
                        if (resDoc.violation === 'tab_closed') violationText = 'Tab yopilgan (erta yakunlangan)';
                        else if (isFast) violationText = 'Tez yechilgan (< 10 daq)';
                        else if (resDoc.violation) violationText = resDoc.violation === 'tab_switch' ? 'Tab almashtirilgan' : resDoc.violation;
                    }
                }

                return {
                    id: student.id,
                    student,
                    submitted,
                    score,
                    submitDate,
                    resDoc,
                    att,
                    isLow,
                    hasViolation,
                    violationText
                };
            });

        // Compute counts
        const totalCount = monitoringStudents.length;
        const notSubmittedCount = monitoringStudents.filter(ms => !ms.submitted).length;
        const violatorsCount = monitoringStudents.filter(ms => ms.hasViolation).length;
        const lowScoreCount = monitoringStudents.filter(ms => ms.isLow).length;

        // Apply active filter tab + search
        let filteredMonitoring = [...monitoringStudents];
        if (activeMonitorFilter === "not_submitted") {
            filteredMonitoring = filteredMonitoring.filter(ms => !ms.submitted);
        } else if (activeMonitorFilter === "violators") {
            filteredMonitoring = filteredMonitoring.filter(ms => ms.hasViolation);
        } else if (activeMonitorFilter === "low_score") {
            filteredMonitoring = filteredMonitoring.filter(ms => ms.isLow);
        }
        if (monitorSearch.trim()) {
            const q = monitorSearch.toLowerCase();
            filteredMonitoring = filteredMonitoring.filter(ms =>
                ms.student.fullName?.toLowerCase().includes(q) ||
                ms.student.email?.toLowerCase().includes(q) ||
                ms.student.phoneNumber?.toLowerCase().includes(q)
            );
        }

        // Sort
        if (monitorSort.col) {
            filteredMonitoring = [...filteredMonitoring].sort((a, b) => {
                let av, bv;
                if (monitorSort.col === 'name') { av = a.student.fullName || ''; bv = b.student.fullName || ''; }
                else if (monitorSort.col === 'score') { av = parseFloat(String(a.score)) || 0; bv = parseFloat(String(b.score)) || 0; }
                else if (monitorSort.col === 'date') { av = a.submitDate || ''; bv = b.submitDate || ''; }
                else if (monitorSort.col === 'status') { av = a.submitted ? 1 : 0; bv = b.submitted ? 1 : 0; }
                if (typeof av === 'string') return monitorSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                return monitorSort.dir === 'asc' ? av - bv : bv - av;
            });
        }

        const toggleSort = (col) => {
            setMonitorSort(prev => prev.col === col
                ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { col, dir: 'asc' });
        };
        const SortIcon = ({ col }) => (
            <ArrowsDownUp size={11} className={`inline ml-1 ${monitorSort.col === col ? 'text-blue-400' : 'text-gray-500 opacity-50'}`} />
        );

        return (
            <div className={`space-y-6 animate-fade-in-up text-left ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {/* Back Button and Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                ;
                                onBack();
                                setMonitorSearch('');
                                setMonitorSort({ col: null, dir: 'asc' });
                            }}
                            className={`flex items-center gap-2.5 transition-colors font-semibold text-sm group w-fit ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all ${isDark ? 'bg-white/5 border-white/10 group-hover:border-white/20' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            Orqaga qaytish
                        </button>
                        <div className="mt-1">
                            <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Test monitoringi</h1>
                            <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{monitoringTest.title}</span> · <span className="font-bold">{monitoringTest.groupName}</span>
                                {lastRefresh && <span className="ml-2 text-[11px] text-gray-400">· {lastRefresh}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {notSubmittedCount > 0 && (
                            <button
                                onClick={() => sendReminder(monitoringTest, notSubmittedCount)}
                                disabled={sendingReminder}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-semibold text-xs transition-all ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
                            >
                                {sendingReminder
                                    ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                    : <BellRinging size={14} weight="fill" />}
                                Eslatma yuborish ({notSubmittedCount})
                            </button>
                        )}
                        <button
                            onClick={() => exportMonitorCSV(monitoringStudents, monitoringTest)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-semibold text-xs transition-all ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                            <DownloadSimple size={14} weight="bold" />
                            CSV yuklab olish
                        </button>
                        <button
                            onClick={() => { fetchData(); setLastRefresh(new Date().toLocaleTimeString('uz-UZ')); }}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-semibold text-xs transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
                        >
                            <ArrowsCounterClockwise size={14} weight="bold" />
                            Yangilash
                        </button>
                    </div>
                </div>

                {/* Dashboard Stats / Tabs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                    {/* All Students */}
                    <div
                        onClick={() => setActiveMonitorFilter("all")}
                        className={`rounded-3xl border p-5 flex items-center gap-4 cursor-pointer transition-all duration-300 ${
                            activeMonitorFilter === "all"
                                ? (isDark ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-sm' : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm')
                                : (isDark ? 'bg-[#2C2C2C]/50 border-white/5 hover:bg-white/5 hover:border-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md')
                        }`}
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            activeMonitorFilter === "all" ? 'bg-blue-500/20 text-blue-450' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-550')
                        }`}>
                            <Users size={24} weight="bold" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-black tracking-tight leading-none">
                                {totalCount}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-450 mt-1.5">
                                Barcha o'quvchilar
                            </p>
                        </div>
                    </div>

                    {/* Bajarmaganlar - Highlighted if > 0 */}
                    <div
                        onClick={() => setActiveMonitorFilter("not_submitted")}
                        className={`rounded-3xl border p-5 flex items-center gap-4 cursor-pointer transition-all duration-300 relative ${
                            activeMonitorFilter === "not_submitted"
                                ? (isDark ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-sm' : 'bg-amber-50 border-amber-300 text-amber-805 shadow-sm')
                                : (notSubmittedCount > 0
                                    ? (isDark ? 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/30 text-amber-400 animate-pulse' : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800')
                                    : (isDark ? 'bg-[#2C2C2C]/50 border-white/5 hover:bg-white/5 hover:border-white/10 text-gray-400' : 'bg-white border-gray-100 shadow-sm hover:shadow-md')
                                  )
                        }`}
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative ${
                            activeMonitorFilter === "not_submitted"
                                ? 'bg-amber-500/25 text-amber-500'
                                : (notSubmittedCount > 0 ? 'bg-amber-500/20 text-amber-650' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-550'))
                        }`}>
                            <Clock size={24} weight="bold" />
                            {notSubmittedCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-amber-500 text-[10px] font-bold text-white items-center justify-center leading-none">
                                        !
                                    </span>
                                </span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-black tracking-tight leading-none">
                                {notSubmittedCount}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-455 mt-1.5">
                                Bajarmaganlar
                            </p>
                        </div>
                    </div>

                    {/* Qoida buzganlar */}
                    <div
                        onClick={() => setActiveMonitorFilter("violators")}
                        className={`rounded-3xl border p-5 flex items-center gap-4 cursor-pointer transition-all duration-300 ${
                            activeMonitorFilter === "violators"
                                ? (isDark ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-sm' : 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm')
                                : (violatorsCount > 0
                                    ? (isDark ? 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/30 text-rose-405' : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-850')
                                    : (isDark ? 'bg-[#2C2C2C]/50 border-white/5 hover:bg-white/5 hover:border-white/10 text-gray-400' : 'bg-white border-gray-100 shadow-sm hover:shadow-md')
                                  )
                        }`}
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            activeMonitorFilter === "violators"
                                ? 'bg-rose-500/25 text-rose-500'
                                : (violatorsCount > 0 ? 'bg-rose-500/20 text-rose-650' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-555'))
                        }`}>
                            <Warning size={24} weight="bold" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-black tracking-tight leading-none">
                                {violatorsCount}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-455 mt-1.5">
                                Qoida buzganlar
                            </p>
                        </div>
                    </div>

                    {/* Past Natija Olganlar */}
                    <div
                        onClick={() => setActiveMonitorFilter("low_score")}
                        className={`rounded-3xl border p-5 flex items-center gap-4 cursor-pointer transition-all duration-300 ${
                            activeMonitorFilter === "low_score"
                                ? (isDark ? 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-sm' : 'bg-orange-50 border-orange-200 text-orange-800 shadow-sm')
                                : (lowScoreCount > 0
                                    ? (isDark ? 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800')
                                    : (isDark ? 'bg-[#2C2C2C]/50 border-white/5 hover:bg-white/5 hover:border-white/10 text-gray-400' : 'bg-white border-gray-100 shadow-sm hover:shadow-md')
                                  )
                        }`}
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            activeMonitorFilter === "low_score"
                                ? 'bg-orange-500/25 text-orange-500'
                                : (lowScoreCount > 0 ? 'bg-orange-500/20 text-orange-605' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-550'))
                        }`}>
                            <Flame size={24} weight="bold" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-black tracking-tight leading-none">
                                {lowScoreCount}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-455 mt-1.5">
                                Past natija olganlar
                            </p>
                        </div>
                    </div>
                </div>

                {/* Student Search */}
                <div className="relative">
                    <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="O'quvchi ismini qidiring..."
                        value={monitorSearch}
                        onChange={e => setMonitorSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all ${
                            isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'
                        }`}
                    />
                    {monitorSearch && (
                        <button onClick={() => setMonitorSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={14} weight="bold" />
                        </button>
                    )}
                </div>

                {/* Warning Callout for Not Submitted */}
                {notSubmittedCount > 0 && activeMonitorFilter !== 'not_submitted' && (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-amber-500/5 border-amber-500/10 text-amber-250' : 'bg-amber-50 border-amber-200 text-amber-850'
                    }`}>
                        <div className="flex items-center gap-2.5">
                            <Info size={18} className="text-amber-550 shrink-0" />
                            <p className="text-xs font-semibold">
                                Guruhda <span className="font-bold text-amber-600 dark:text-amber-400">{notSubmittedCount} ta o'quvchi</span> topshiriqni hali topshirmagan.
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveMonitorFilter('not_submitted')}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                                isDark ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-400' : 'bg-white border-amber-200 hover:bg-amber-50 text-amber-700'
                            }`}
                        >
                            Ko'rish
                        </button>
                    </div>
                )}

                <div className={`p-6 rounded-3xl border overflow-hidden ${
                    isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs font-semibold">
                            <thead>
                                <tr className={`border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-150 bg-gray-50'}`}>
                                    <th className="py-4 px-6 rounded-l-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                                        O'quvchi <SortIcon col="name" />
                                    </th>
                                    <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                                        Status <SortIcon col="status" />
                                    </th>
                                    <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => toggleSort('score')}>
                                        Ball / Natija <SortIcon col="score" />
                                    </th>
                                    <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                                        Topshirilgan Sana <SortIcon col="date" />
                                    </th>
                                    <th className="py-4 px-6 text-center rounded-r-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Amal</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                {filteredMonitoring.length > 0 ? (
                                    filteredMonitoring.map(({ student, submitted, score, submitDate, resDoc, isLow, hasViolation, violationText }) => {
                                        // Specific row styling depending on completed / not completed status
                                        const rowHighlightClass = !submitted
                                            ? (isDark 
                                                ? 'border-l-4 border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10' 
                                                : 'border-l-4 border-l-amber-500 bg-amber-50/30 hover:bg-amber-50/50')
                                            : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-55/50');

                                        return (
                                            <tr key={student.id} className={`${rowHighlightClass} transition-all duration-150`}>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.fullName}</span>
                                                        <span className="text-[11px] text-gray-405 font-medium mt-0.5">{student.email || student.phoneNumber}</span>
                                                        {submitted && hasViolation && (
                                                            <span className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                                                                <Warning size={11} className="text-rose-500" />
                                                                Qoidabuzarlik: {violationText}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {submitted ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                                                                isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            }`}>
                                                                Topshirdi
                                                            </span>
                                                            {hasViolation && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${
                                                                    isDark ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' : 'bg-rose-100 text-rose-700 border-rose-200'
                                                                }`} title={violationText}>
                                                                    Qoidabuzarlik
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                                                            isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-705 border-amber-200'
                                                        }`}>
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                            </span>
                                                            Kutilmoqda
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {isLow ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="font-bold text-red-500 font-mono text-sm">
                                                                {score}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                                isDark ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25' : 'bg-orange-50 text-orange-700 border border-orange-200'
                                                            }`}>
                                                                Past natija
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className={submitted ? "font-bold text-blue-500 font-mono text-sm" : "text-gray-400 dark:text-zinc-500"}>
                                                            {score}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-center text-gray-400 dark:text-zinc-550">
                                                    {submitDate}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {submitted && resDoc ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (monitoringTest.type === 'writing') {
                                                                    navigate('/teacher/writing-review', { state: { selectedId: resDoc.id } });
                                                                } else {
                                                                    navigate(`/review/${resDoc.id}`);
                                                                }
                                                            }}
                                                            className={`px-3.5 py-1.5 rounded-xl border font-semibold hover:bg-opacity-95 active:scale-95 transition-all text-xs ${
                                                                isDark 
                                                                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/20 hover:bg-blue-600/30' 
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm'
                                                            }`}
                                                        >
                                                            Ko'rish
                                                        </button>
                                                    ) : submitted && monitoringTest.type === 'podcast' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigate(`/podcast/spotify/${monitoringTest.id}`);
                                                            }}
                                                            className={`px-3.5 py-1.5 rounded-xl border font-semibold hover:bg-opacity-95 active:scale-95 transition-all text-xs ${
                                                                isDark 
                                                                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/30' 
                                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm'
                                                            }`}
                                                        >
                                                            Ko'rish
                                                        </button>
                                                    ) : submitted && monitoringTest.type === 'article' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigate(`/article/${monitoringTest.id}`);
                                                            }}
                                                            className={`px-3.5 py-1.5 rounded-xl border font-semibold hover:bg-opacity-95 active:scale-95 transition-all text-xs ${
                                                                isDark 
                                                                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/30' 
                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm'
                                                            }`}
                                                        >
                                                            Ko'rish
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-zinc-650 font-bold">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-400 dark:text-zinc-500 font-bold">Bu ro'yxat bo'sh</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
}
