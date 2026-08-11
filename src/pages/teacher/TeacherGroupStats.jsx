/**
 * Guruh — o'qituvchi uchun yagona boshqaruv sahifasi.
 *
 * Ikkita ko'rinish bitta ma'lumot yuklashdan foydalanadi:
 *   • "Tahlil"     — ko'rsatkichlar, grafiklar, reyting
 *   • "O'quvchilar" — ro'yxatni boshqarish (qo'shish, chiqarish, qidirish)
 *
 * Ilgari alohida `/teacher/students` sahifasi ham shu ishni bajarardi —
 * o'sha sahifa shu yerga birlashtirildi va `?view=students` bilan ochiladi.
 *
 * Sahifa faqat ko'rinish bilan shug'ullanadi:
 *   • ma'lumot yuklash  → `useGroupStats`
 *   • hisob-kitoblar    → `utils/groupAnalytics`
 *   • a'zolikni o'zgartirish → `utils/groupMembership`
 *
 * Barcha ko'rsatkichlar tanlangan VAQT ORALIG'I bo'yicha qayta hisoblanadi,
 * shuning uchun "o'rtacha band" nimaga tegishli ekani doim aniq.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Users,
    ChartLineUp,
    Target,
    Warning,
    MagnifyingGlass,
    Download,
    UserPlus,
    ArrowsClockwise,
    ClipboardText,
} from '@phosphor-icons/react';

import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { useGroupStats } from '../../hooks/useGroupStats';
import { canAddStudent, addStudentToGroup, removeStudentFromGroup } from '../../utils/groupMembership';
import {
    SKILLS,
    collectAssignedTestIds,
    filterByRange,
    buildStudentStats,
    buildGroupSummary,
    buildSkillAverages,
    buildTrendSeries,
    buildBandDistribution,
    buildLeaderboards,
    formatRelativeDays,
    EMPTY_STUDENT_STATS,
} from '../../utils/groupAnalytics';

import {
    Card,
    StatTile,
    Segmented,
    Button,
    EmptyState,
    SectionTitle,
    ProgressBar,
} from '../../components/teacher/groupStats/primitives';
import {
    TeacherGroupStatsSkeleton,
    RefreshBar,
} from '../../components/teacher/TeacherSkeletons';
import {
    TrendChart,
    SkillBreakdown,
    BandDistribution,
    Leaderboards,
    SKILL_LABELS,
} from '../../components/teacher/groupStats/GroupCharts';
import StudentRow from '../../components/teacher/groupStats/StudentRow';
import AddStudentModal from '../../components/teacher/groupStats/AddStudentModal';
import ConfirmDialog from '../../components/teacher/groupStats/ConfirmDialog';

export default function TeacherGroupStats() {
    const { userData } = useAuth();
    const { t } = useTranslation();
    const { groups, students, results, testSetsMap, loading, isRefreshing, error, refresh } =
        useGroupStats(userData);

    const RANGES = useMemo(() => [
        { value: 30, label: t('teacher.groupStats.ranges.days30') },
        { value: 90, label: t('teacher.groupStats.ranges.days90') },
        { value: null, label: t('teacher.groupStats.ranges.allTime') },
    ], [t]);

    const SORTS = useMemo(() => [
        { value: 'band', label: t('teacher.groupStats.sorts.band') },
        { value: 'name', label: t('teacher.groupStats.sorts.name') },
        { value: 'tests', label: t('teacher.groupStats.sorts.tests') },
        { value: 'activity', label: t('teacher.groupStats.sorts.activity') },
    ], [t]);

    const FILTERS = useMemo(() => [
        { value: 'all', label: t('teacher.groupStats.filters.all') },
        { value: 'attention', label: t('teacher.groupStats.filters.attention') },
        { value: 'inactive', label: t('teacher.groupStats.filters.inactive') },
        { value: 'untested', label: t('teacher.groupStats.filters.untested') },
    ], [t]);

    const VIEWS = useMemo(() => [
        { value: 'stats', label: t('teacher.groupStats.views.stats') },
        { value: 'students', label: t('teacher.groupStats.views.students') },
    ], [t]);

    // Ko'rinish URL da saqlanadi — havola ulashsa ham o'sha bo'lim ochiladi.
    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get('view') === 'students' ? 'students' : 'stats';
    const setView = (next) =>
        setSearchParams(next === 'students' ? { view: 'students' } : {}, { replace: true });

    const navigate = useNavigate();
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [range, setRange] = useState(90);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('band');
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState(null);
    const [removing, setRemoving] = useState(false);

    // Tanlangan guruh yo'q bo'lsa (yoki o'chirilgan bo'lsa) — birinchisi.
    const currentGroup =
        groups.find((g) => g.id === selectedGroupId) || groups[0] || null;
    const memberIds = useMemo(() => currentGroup?.studentIds || [], [currentGroup]);

    const groupStudents = useMemo(
        () => students.filter((s) => memberIds.includes(s.id)),
        [students, memberIds]
    );

    const assignedTestIds = useMemo(
        () => collectAssignedTestIds(currentGroup, testSetsMap),
        [currentGroup, testSetsMap]
    );

    /** Guruh a'zolarining tanlangan oraliqdagi natijalari. */
    const scopedResults = useMemo(() => {
        const ids = new Set(memberIds);
        return filterByRange(
            results.filter((r) => ids.has(r.userId)),
            range
        );
    }, [results, memberIds, range]);

    const statsMap = useMemo(
        () => buildStudentStats(scopedResults, assignedTestIds),
        [scopedResults, assignedTestIds]
    );

    const summary = useMemo(
        () => buildGroupSummary(groupStudents, statsMap, assignedTestIds.size),
        [groupStudents, statsMap, assignedTestIds]
    );
    const skillAverages = useMemo(
        () => buildSkillAverages(groupStudents, statsMap),
        [groupStudents, statsMap]
    );
    const trend = useMemo(
        () => buildTrendSeries(scopedResults, memberIds),
        [scopedResults, memberIds]
    );
    const distribution = useMemo(
        () => buildBandDistribution(groupStudents, statsMap),
        [groupStudents, statsMap]
    );
    const leaderboards = useMemo(
        () => buildLeaderboards(groupStudents, statsMap),
        [groupStudents, statsMap]
    );

    const visibleStudents = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const rows = groupStudents
            .map((student) => ({ student, stats: statsMap.get(student.id) || EMPTY_STUDENT_STATS }))
            .filter(({ student }) =>
                !term ||
                student.fullName?.toLowerCase().includes(term) ||
                student.email?.toLowerCase().includes(term)
            )
            .filter(({ stats }) => {
                if (filter === 'attention') return stats.isLow || (stats.isInactive && stats.count > 0);
                if (filter === 'inactive') return stats.isInactive && stats.count > 0;
                if (filter === 'untested') return stats.count === 0;
                return true;
            });

        const byName = (a, b) =>
            (a.student.fullName || a.student.email || '').localeCompare(
                b.student.fullName || b.student.email || ''
            );

        return rows.sort((a, b) => {
            if (sortBy === 'name') return byName(a, b);
            if (sortBy === 'tests') return b.stats.count - a.stats.count || byName(a, b);
            if (sortBy === 'activity') {
                const aDays = a.stats.daysSinceActive ?? Infinity;
                const bDays = b.stats.daysSinceActive ?? Infinity;
                return aDays - bDays || byName(a, b);
            }
            // 'band' — bandi yo'qlar oxirida
            const aBand = a.stats.avgBand ?? -1;
            const bBand = b.stats.avgBand ?? -1;
            return bBand - aBand || byName(a, b);
        });
    }, [groupStudents, statsMap, searchTerm, filter, sortBy]);

    const planUsage = {
        used: new Set(groups.flatMap((g) => g.studentIds || [])).size,
        max: Number(userData?.teacherSubscription?.maxStudents) || 0,
    };

    const rangeLabel = RANGES.find((r) => r.value === range)?.label || '';

    // ---- Amallar -----------------------------------------------------------

    const handleAdd = async (studentId) => {
        const allowed = canAddStudent(userData, groups);
        if (!allowed.ok) {
            toast.error(allowed.reason);
            return;
        }
        try {
            await addStudentToGroup(currentGroup.id, studentId);
            toast.success(t('teacher.groupStats.studentAddedSuccess'));
            await refresh();
        } catch (e) {
            toast.error(`${t('teacher.groupStats.studentAddFailed')}: ${e.message}`);
        }
    };

    const handleRemove = async () => {
        if (!pendingRemoval) return;
        setRemoving(true);
        try {
            await removeStudentFromGroup(currentGroup.id, pendingRemoval.id);
            toast.success(t('teacher.groupStats.studentRemovedSuccess'));
            setPendingRemoval(null);
            await refresh();
        } catch (e) {
            toast.error(`${t('teacher.groupStats.studentRemoveFailed')}: ${e.message}`);
        } finally {
            setRemoving(false);
        }
    };

    const handleExportCSV = () => {
        if (!currentGroup || !visibleStudents.length) return;
        const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

        const header = [
            t('teacher.groupStats.students'),
            'Email',
            t('teacher.groupStats.sorts.band'),
            t('teacher.groupStats.totalResults'),
            ...SKILLS.map((s) => SKILL_LABELS[s]),
            `${t('teacher.groupStats.studentRow.completed')} %`,
            t('teacher.groupStats.sorts.activity'),
        ];

        const rows = visibleStudents.map(({ student, stats }) => [
            student.fullName,
            student.email,
            stats.avgBand ?? '',
            stats.count,
            ...SKILLS.map((s) => stats.skills[s].avg ?? ''),
            stats.completionRate ?? '',
            formatRelativeDays(stats.daysSinceActive),
        ]);

        const csv =
            '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentGroup.name || 'guruh'}_statistika.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(t('teacher.groupStats.csvDownloaded'));
    };

    // ---- Ko'rinish ---------------------------------------------------------

    if (loading) return <TeacherGroupStatsSkeleton />;

    if (error) {
        return (
            <EmptyState
                icon={Warning}
                title={t('teacher.groupStats.fetchErrorTitle')}
                description={t('teacher.groupStats.fetchErrorDesc')}
                action={
                    <Button onClick={refresh}>
                        <ArrowsClockwise size={13} /> {t('teacher.groupStats.retry')}
                    </Button>
                }
            />
        );
    }

    if (!groups.length) {
        return (
            <EmptyState
                icon={Users}
                title={t('teacher.groupStats.noGroupAssignedTitle')}
                description={t('teacher.groupStats.noGroupAssignedDesc')}
            />
        );
    }

    return (
        <div className="space-y-5 animate-content-in">
            <RefreshBar active={isRefreshing} />

            {/* Sarlavha */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        {currentGroup?.name || t('teacher.groupStats.group')}
                    </h1>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                        {view === 'students'
                            ? `${memberIds.length} ${t('teacher.groupStats.studentsCount')}${
                                  planUsage.max
                                      ? ` · ${t('teacher.groupStats.tariffUsage')} ${planUsage.used}/${planUsage.max}`
                                      : ''
                              }`
                            : `${memberIds.length} ${t('teacher.groupStats.studentsCount')} · ${summary.totalResults} ${t('teacher.groupStats.totalResults')} (${rangeLabel.toLowerCase()})`}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {view === 'stats' && (
                        <Segmented options={RANGES} value={range} onChange={setRange} size="sm" />
                    )}
                    <Button onClick={refresh} title={t('teacher.groupStats.refresh')} className="px-2.5">
                        <ArrowsClockwise size={13} />
                    </Button>
                    <Button onClick={handleExportCSV} disabled={!visibleStudents.length}>
                        <Download size={13} /> {t('teacher.groupStats.exportCSV')}
                    </Button>
                    {/* Davomat ekrani — hozircha namuna ma'lumot bilan. */}
                    <Button
                        onClick={() => navigate(`/teacher/group/${currentGroup?.id || 'go-english'}`)}
                        disabled={!currentGroup}
                    >
                        <ClipboardText size={13} /> {t('teacher.groupDetail.takeAttendance')}
                    </Button>
                    <Button variant="primary" onClick={() => setShowAdd(true)}>
                        <UserPlus size={13} /> {t('teacher.groupStats.addStudent')}
                    </Button>
                </div>
            </div>

            {/* Guruhlar + ko'rinish */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 min-w-0">
                    {groups.length > 1 && groups.map((g) => {
                        const active = g.id === currentGroup?.id;
                        return (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                    setSelectedGroupId(g.id);
                                    setExpandedId(null);
                                    setFilter('all');
                                }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-colors ${
                                    active
                                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                        : 'bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 dark:bg-[#202022] dark:text-gray-300 dark:border-white/[0.06] dark:hover:bg-white/[0.04]'
                                }`}
                            >
                                {g.name}
                                <span className={`ml-2 tabular-nums ${active ? 'opacity-60' : 'opacity-40'}`}>
                                    {g.studentIds?.length || 0}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-shrink-0">
                    <Segmented options={VIEWS} value={view} onChange={setView} />
                </div>
            </div>

            {view === 'stats' && (
            <>
            {/* Ko'rsatkichlar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile
                    icon={Users}
                    label={t('teacher.groupStats.statsTiles.students')}
                    value={summary.studentCount}
                    hint={t('teacher.groupStats.statsTiles.activeCountHint').replace('{count}', summary.activeCount)}
                />
                <StatTile
                    icon={ChartLineUp}
                    label={t('teacher.groupStats.statsTiles.avgBand')}
                    value={summary.avgBand !== null ? summary.avgBand.toFixed(1) : '—'}
                    hint={t('teacher.groupStats.statsTiles.basedOnResults').replace('{count}', summary.totalResults)}
                    tone="accent"
                />
                <StatTile
                    icon={Target}
                    label={t('teacher.groupStats.statsTiles.testCompletion')}
                    value={summary.completionRate !== null ? `${summary.completionRate}%` : '—'}
                    hint={
                        summary.assignedCount
                            ? t('teacher.groupStats.statsTiles.testsAssignedHint').replace('{count}', summary.assignedCount)
                            : t('teacher.groupStats.statsTiles.noTestsAssignedHint')
                    }
                />
                <StatTile
                    icon={Warning}
                    label={t('teacher.groupStats.statsTiles.needsAttention')}
                    value={summary.attentionCount}
                    hint={
                        summary.untestedCount
                            ? t('teacher.groupStats.statsTiles.untestedHint').replace('{count}', summary.untestedCount)
                            : t('teacher.groupStats.statsTiles.lowOrInactiveHint')
                    }
                    tone={summary.attentionCount ? 'warn' : 'neutral'}
                />
            </div>

            {/* Grafiklar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                    <TrendChart data={trend} rangeLabel={rangeLabel} />
                </div>
                <SkillBreakdown skills={skillAverages} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <BandDistribution buckets={distribution} />
                <Leaderboards top={leaderboards.top} improved={leaderboards.improved} />
            </div>
            </>
            )}

            {/* O'quvchilar ro'yxati — boshqaruv */}
            {view === 'students' && (
            <Card className="p-4 sm:p-5">
                <SectionTitle
                    action={
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                            {visibleStudents.length} / {groupStudents.length}
                        </span>
                    }
                >
                    {t('teacher.groupStats.students')}
                </SectionTitle>

                {planUsage.max > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="text-gray-500 dark:text-gray-400">{t('teacher.groupStats.tariffLimit')}</span>
                            <span
                                className={`tabular-nums font-medium ${
                                    planUsage.used >= planUsage.max
                                        ? 'text-rose-500'
                                        : 'text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                {planUsage.used} / {planUsage.max}
                            </span>
                        </div>
                        <ProgressBar value={(planUsage.used / planUsage.max) * 100} />
                    </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.06] focus-within:border-emerald-500/50 transition-colors lg:max-w-[240px] w-full">
                        <MagnifyingGlass size={14} className="text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('teacher.groupStats.searchPlaceholder')}
                            className="bg-transparent outline-none border-none text-xs w-full text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap lg:ml-auto">
                        <Segmented options={FILTERS} value={filter} onChange={setFilter} size="sm" />
                        <Segmented options={SORTS} value={sortBy} onChange={setSortBy} size="sm" />
                    </div>
                </div>

                {groupStudents.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('teacher.groupStats.noStudentsInGroup')}
                        </p>
                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                            {t('teacher.groupStats.noStudentsInGroupDesc')}
                        </p>
                        <Button variant="primary" className="mt-4" onClick={() => setShowAdd(true)}>
                            <UserPlus size={13} /> {t('teacher.groupStats.addStudent')}
                        </Button>
                    </div>
                ) : visibleStudents.length === 0 ? (
                    <div className="py-10 text-center">
                        <ClipboardText size={22} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('teacher.groupStats.noStudentsFoundFilter')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visibleStudents.map(({ student, stats }) => (
                            <StudentRow
                                key={student.id}
                                student={student}
                                stats={stats}
                                expanded={expandedId === student.id}
                                onToggle={() =>
                                    setExpandedId(expandedId === student.id ? null : student.id)
                                }
                                onRemove={() => setPendingRemoval(student)}
                            />
                        ))}
                    </div>
                )}
            </Card>
            )}

            <AddStudentModal
                open={showAdd}
                onClose={() => setShowAdd(false)}
                groupName={currentGroup?.name || t('teacher.groupStats.group')}
                memberIds={memberIds}
                usage={planUsage}
                onAdd={handleAdd}
            />

            <ConfirmDialog
                open={Boolean(pendingRemoval)}
                onClose={() => setPendingRemoval(null)}
                onConfirm={handleRemove}
                loading={removing}
                title={t('teacher.groupStats.removeDialog.title')}
                description={t('teacher.groupStats.removeDialog.desc')
                    .replace('{name}', pendingRemoval?.fullName || pendingRemoval?.email || t('teacher.dashboard.unknownStudent'))
                    .replace('{group}', currentGroup?.name || '')}
                confirmLabel={t('teacher.groupStats.removeDialog.confirm')}
                cancelLabel={t('teacher.groupStats.removeDialog.cancel')}
            />
        </div>
    );
}
