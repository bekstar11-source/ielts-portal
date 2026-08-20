import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { toDateTimeLocalValue } from '../../utils/teacherResults';
import { useTeacherWorkspace, useTeacherCatalog } from '../../hooks/useTeacherWorkspace';
import { TeacherTestsSkeleton, RefreshBar } from '../../components/teacher/TeacherSkeletons';
import { DeadlineCountdown } from '../../components/teacher/tests/TeacherTestHelpers';
import { getTestTypeMeta } from '../../components/teacher/tests/testTypeIcon';
import ConfirmDialog from '../../components/teacher/ConfirmDialog';
import CopyAssignmentModal from '../../components/teacher/tests/CopyAssignmentModal';
import EditAssignmentModal from '../../components/teacher/tests/EditAssignmentModal';
import { commitAssignments, removeAssignments, updateAssignment } from '../../utils/teacherAssignments';
import {
  BookOpen,
  Clock,
  CopySimple,
  Plus,
  Trash,
  MagnifyingGlass as SearchIcon,
  X,
  Eye,
  Minus,
  MinusSquare,
  ArrowsCounterClockwise,
  CheckSquare,
  Square,
  Timer,
  PencilSimple,
  FunnelSimple,
} from '@phosphor-icons/react';

/**
 * Ingichka progress chizig'i. Rangli "donut" o'rniga — bir qarashda
 * taqqoslash osonroq va kartochkada kamroq vizual shovqin.
 */
const ProgressBar = ({ pct, isExpired, isDark, rounded = true }) => {
    const fill = pct >= 100
        ? 'bg-emerald-500'
        : isExpired
            ? 'bg-rose-500'
            : pct > 0 ? 'bg-blue-500' : 'bg-transparent';
    const shape = rounded ? 'rounded-full' : '';
    return (
        <div className={`w-full h-1 overflow-hidden ${shape} ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
            <div
                className={`h-full transition-[width] duration-500 ${shape} ${fill}`}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
        </div>
    );
};



export default function TeacherTests() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    // Panelning umumiy keshi — groups/students/results/podcastAttempts
    // shu yerdan keladi va boshqa o'qituvchi sahifalari bilan BO'LISHILADI.
    const {
        groups, students, results, podcastAttempts,
        loading, isRefreshing, patchGroups,
    } = useTeacherWorkspace({ uid: userData?.uid });

    // Tayinlovlar ro'yxati — `groups` dan kelib chiqadigan SOF hosila.
    // Ilgari u alohida state edi va har bir mutatsiyada `groups` bilan
    // qo'lda sinxronlanardi; endi bitta manba qoldi.
    const assignedTests = useMemo(() => {
        const list = groups.flatMap((g) =>
            (g.assignedTests || []).map((assign) => ({
                ...assign,
                groupId: g.id,
                groupName: g.name,
                studentIds: g.studentIds || [],
            }))
        );
        return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [groups]);

    // Panelning qolgan sahifalari bilan bir xil xabar tizimi. Ilgari bu
    // sahifada o'zining `useState` + `setTimeout` + `fixed div` toast'i bor
    // edi: taymer tozalanmasdi va bulk paneli ochilganda pozitsiyasi qo'lda
    // tuzatilardi.
    const showToast = (message, type = 'success') =>
        (type === 'error' ? toast.error(message) : toast.success(message));

    const [confirmDialog, setConfirmDialog] = useState(null);   // { title, message, onConfirm }

    // Ommaviy o'chirish
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedBulk, setSelectedBulk] = useState(new Set());

    // Ro'yxat filtrlari
    const [mainSearch, setMainSearch] = useState('');
    const [mainGroupFilter, setMainGroupFilter] = useState('all');
    const [mainStatusFilter, setMainStatusFilter] = useState('all');
    const [mainSort, setMainSort] = useState('newest');   // 'newest' | 'deadline' | 'progress'

    const [editModal, setEditModal] = useState(null);
    const [editSaving, setEditSaving] = useState(false);

    const [copyModal, setCopyModal] = useState(null);
    const [copySaving, setCopySaving] = useState(false);

    // Katalog UCHTA to'liq kolleksiya o'qishi — faqat tahrirlash oynasi
    // ochilganda va 30 daqiqalik kesh bilan.
    const { availableTests } = useTeacherCatalog(Boolean(editModal));

    /**
     * Topshirganlar indeksi. Ilgari har bir test kartochkasi uchun butun
     * `results` massivi qaytadan filtrlanardi — 50 ta test × 2000 natija har
     * renderda. Endi bir marta indeks quriladi, qidiruv O(1).
     */
    const submissionIndex = useMemo(() => {
        const byTest = new Map();      // testId -> Set(userId)
        const byPodcast = new Map();   // podcastId -> Set(userId)
        const byArticle = new Map();   // articleId -> Set(userId)

        for (const r of results) {
            const key = String(r.testId ?? '').trim();
            if (!key) continue;
            if (!byTest.has(key)) byTest.set(key, new Set());
            byTest.get(key).add(r.userId);
        }
        for (const a of podcastAttempts) {
            if (!a.completedAt) continue;
            const key = String(a.podcastId ?? '').trim();
            if (!key) continue;
            if (!byPodcast.has(key)) byPodcast.set(key, new Set());
            byPodcast.get(key).add(a.userId);
        }
        for (const s of students) {
            for (const itemId of s.awardedItems || []) {
                const key = String(itemId).trim();
                if (!byArticle.has(key)) byArticle.set(key, new Set());
                byArticle.get(key).add(s.id);
            }
        }
        return { byTest, byPodcast, byArticle };
    }, [results, podcastAttempts, students]);

    const countSubmitted = (test, memberIds) => {
        const key = String(test.id ?? '').trim();
        const source = test.type === 'podcast' ? submissionIndex.byPodcast
            : test.type === 'article' ? submissionIndex.byArticle
                : submissionIndex.byTest;
        const doneSet = source.get(key);
        if (!doneSet) return 0;
        let n = 0;
        for (const id of memberIds) if (doneSet.has(id)) n++;
        return n;
    };

    /** Tayinlovlar guruh + sana bo'yicha birlashtiriladi va progress qo'shiladi. */
    const groupedAssignments = useMemo(() => {
        const groupsMap = new Map();
        assignedTests.forEach(test => {
            const key = `${test.groupId}_${test.date}`;
            if (!groupsMap.has(key)) {
                groupsMap.set(key, {
                    groupId: test.groupId,
                    groupName: test.groupName,
                    date: test.date,
                    deadline: test.deadline,
                    maxAttempts: test.maxAttempts,
                    priority: test.priority,
                    teacherNote: test.teacherNote,
                    studentIds: test.studentIds || [],
                    tests: []
                });
            }
            groupsMap.get(key).tests.push(test);
        });

        const now = Date.now();
        return [...groupsMap.values()].map(g => {
            const memberIds = g.studentIds || [];
            const total = memberIds.length;
            const perTest = g.tests.map(t => {
                const submitted = countSubmitted(t, memberIds);
                return { test: t, submitted, total, pct: total > 0 ? Math.round((submitted / total) * 100) : 0 };
            });
            // Guruh darajasidagi umumiy progress — barcha test × o'quvchi juftlari.
            const expected = total * g.tests.length;
            const done = perTest.reduce((s, p) => s + p.submitted, 0);
            const deadlineMs = g.deadline ? new Date(g.deadline).getTime() : null;
            return {
                ...g,
                perTest,
                dateMs: g.date ? new Date(g.date).getTime() : 0,
                deadlineMs,
                isExpired: Boolean(deadlineMs && deadlineMs < now),
                submittedTotal: done,
                expectedTotal: expected,
                pct: expected > 0 ? Math.round((done / expected) * 100) : 0,
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignedTests, submissionIndex]);

    const summaryStats = useMemo(() => {
        const total = groupedAssignments.length;
        const expired = groupedAssignments.filter(g => g.isExpired).length;
        return { total, active: total - expired, expired, totalTests: assignedTests.length };
    }, [groupedAssignments, assignedTests]);

    const filteredGroupedAssignments = useMemo(() => {
        const q = mainSearch.trim().toLowerCase();
        const list = groupedAssignments.filter(g => {
            const matchGroup = mainGroupFilter === 'all' || g.groupId === mainGroupFilter;
            const matchStatus = mainStatusFilter === 'all'
                || (mainStatusFilter === 'active' && !g.isExpired)
                || (mainStatusFilter === 'expired' && g.isExpired);
            const matchSearch = !q || g.groupName?.toLowerCase().includes(q)
                || g.tests.some(t => t.title?.toLowerCase().includes(q));
            return matchGroup && matchStatus && matchSearch;
        });

        if (mainSort === 'deadline') {
            // Muddati bor va eng yaqinlari birinchi; muddatsizlar oxirida.
            return list.sort((a, b) => (a.deadlineMs ?? Infinity) - (b.deadlineMs ?? Infinity));
        }
        if (mainSort === 'progress') {
            return list.sort((a, b) => a.pct - b.pct);
        }
        return list.sort((a, b) => b.dateMs - a.dateMs);
    }, [groupedAssignments, mainGroupFilter, mainStatusFilter, mainSearch, mainSort]);

    /** O'qituvchi ma'lumoti — feed postlar uchun. */
    const teacherInfo = { uid: userData?.uid, name: userData?.fullName };

    /** Nusxalash — yozuv mantig'i `utils/teacherAssignments` da. */
    const applyAssignments = async (groupIds, assignments) => {
        const nextGroups = await commitAssignments({
            groups, groupIds, assignments, teacher: teacherInfo,
        });
        patchGroups(nextGroups);
    };

    /**
     * Tanlangan tayinlovlarni o'chiradi va HAQIQIY natijani xabar qiladi.
     * Ilgari bu son xatolardan qat'i nazar oshaverardi.
     */
    const runRemoval = async (targets) => {
        try {
            const result = await removeAssignments({ groups, targets });
            patchGroups(result.groups);
            return result;
        } catch (err) {
            console.error(err);
            showToast('Xatolik yuz berdi: ' + err.message, 'error');
            return { removed: 0, failed: targets.length };
        }
    };

    const handleUnassignTest = (assignment) => {
        setConfirmDialog({
            title: t('teacher.tests.confirmUnassignTitle'),
            message: t('teacher.tests.confirmUnassignDesc', { title: assignment.title }),
            onConfirm: async () => {
                setConfirmDialog(null);
                const { removed } = await runRemoval([assignment]);
                if (removed) showToast(t('teacher.tests.unassignSuccess', "Tayinlov muvaffaqiyatli olib tashlandi!"));
                else showToast(t('teacher.tests.unassignFailed', "Tayinlovni olib tashlab bo'lmadi."), 'error');
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedBulk.size === 0) return;
        const targets = [...selectedBulk].map(key => {
            const [groupId, testId, date] = key.split('__');
            return { groupId, id: testId, date };
        });

        setConfirmDialog({
            title: t('teacher.tests.confirmBulkDeleteTitle'),
            message: t('teacher.tests.confirmBulkDeleteDesc', { count: targets.length }),
            onConfirm: async () => {
                setConfirmDialog(null);
                const { removed, failed } = await runRemoval(targets);
                setSelectedBulk(new Set());
                setBulkMode(false);
                if (removed) showToast(t('teacher.tests.bulkDeleteSuccess', { count: removed }));
                if (failed) showToast(t('teacher.tests.bulkDeleteFailed', { count: failed }), 'error');
            }
        });
    };

    const toggleBulkItem = (groupId, testId, date) => {
        const key = `${groupId}__${testId}__${date}`;
        setSelectedBulk(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    /** Bitta tayinlovdagi (guruh + sana) barcha testlarni birdaniga belgilash. */
    const toggleBulkAssignment = (groupAssign) => {
        const keys = groupAssign.tests.map(t => `${groupAssign.groupId}__${t.id}__${t.date}`);
        const allSelected = keys.every(k => selectedBulk.has(k));
        setSelectedBulk(prev => {
            const next = new Set(prev);
            if (allSelected) {
                keys.forEach(k => next.delete(k));
            } else {
                keys.forEach(k => next.add(k));
            }
            return next;
        });
    };

    const exitBulkMode = () => {
        setBulkMode(false);
        setSelectedBulk(new Set());
    };

    /** Barcha ko'rinib turgan topshiriqlarni birdaniga belgilash / bekor qilish. */
    const allVisibleKeys = useMemo(() => {
        return filteredGroupedAssignments.flatMap(g =>
            g.tests.map(t => `${g.groupId}__${t.id}__${t.date}`)
        );
    }, [filteredGroupedAssignments]);

    const allVisibleSelected = allVisibleKeys.length > 0 && allVisibleKeys.every(k => selectedBulk.has(k));

    const toggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedBulk(new Set());
        } else {
            setSelectedBulk(new Set(allVisibleKeys));
        }
    };

    // Keyboard shortcuts: Esc -> exit bulk / close modals
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (confirmDialog) setConfirmDialog(null);
                else if (copyModal) setCopyModal(null);
                else if (editModal) setEditModal(null);
                else if (bulkMode) exitBulkMode();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [confirmDialog, copyModal, editModal, bulkMode]);

    /** Tahrirlash modalini saqlash — feed post ham shu bilan birga yangilanadi. */
    const doEditAssignment = async () => {
        if (!editModal || !editModal.tests?.length) return;
        setEditSaving(true);
        try {
            const deadlineVal = editModal.deadline ? new Date(editModal.deadline).toISOString() : null;
            const maxAttemptsVal = Number(editModal.maxAttempts) || 1;

            const nextGroups = await updateAssignment({
                groups,
                groupId: editModal.groupId,
                date: editModal.date,
                assignments: editModal.tests.map(item => ({
                    id: item.id,
                    title: item.title || 'Untitled',
                    type: item.type,
                    date: editModal.date,
                    deadline: deadlineVal,
                    maxAttempts: maxAttemptsVal,
                    priority: editModal.priority,
                    teacherNote: editModal.teacherNote,
                    ...(item.selectedParts ? { selectedParts: item.selectedParts } : {}),
                })),
            });
            patchGroups(nextGroups);

            showToast(t('teacher.tests.updateSuccessToast', "Tayinlov muvaffaqiyatli yangilandi!"));
            setEditModal(null);
        } catch (err) {
            console.error(err);
            showToast('Xatolik: ' + err.message, 'error');
        } finally {
            setEditSaving(false);
        }
    };

    /** Mavjud tayinlovni boshqa guruh(lar)ga ko'chirish modalini ochadi. */
    const openCopyModal = (groupAssign) => {
        setCopyModal({
            sourceGroupId: groupAssign.groupId,
            sourceGroupName: groupAssign.groupName,
            tests: groupAssign.tests.map(t => ({
                id: t.id,
                title: t.title,
                type: t.type,
                ...(t.selectedParts ? { selectedParts: t.selectedParts } : {}),
            })),
            // Muddat o'tib ketgan bo'lsa uni nusxaga ko'chirishning ma'nosi yo'q —
            // bunday holda maydon bo'sh ochiladi.
            deadline: groupAssign.deadline && !groupAssign.isExpired
                ? toDateTimeLocalValue(groupAssign.deadline)
                : '',
            maxAttempts: String(groupAssign.maxAttempts || 1),
            priority: groupAssign.priority || 'medium',
            teacherNote: groupAssign.teacherNote || '',
            targetGroupIds: new Set(),
        });
    };

    const doCopyAssignment = async () => {
        if (!copyModal || copyModal.targetGroupIds.size === 0) return;
        setCopySaving(true);
        try {
            // Nusxa YANGI tayinlov: o'z sanasi bilan, ya'ni manba tayinlovdan
            // alohida kartochka bo'lib turadi va alohida tahrirlanadi.
            const assignDate = new Date().toISOString();
            const deadlineVal = copyModal.deadline ? new Date(copyModal.deadline).toISOString() : null;
            const maxAttemptsVal = Number(copyModal.maxAttempts) || 1;

            const assignments = copyModal.tests.map(t => ({
                id: t.id,
                title: t.title || 'Untitled',
                type: t.type,
                date: assignDate,
                deadline: deadlineVal,
                maxAttempts: maxAttemptsVal,
                priority: copyModal.priority,
                teacherNote: copyModal.teacherNote,
                ...(t.selectedParts ? { selectedParts: t.selectedParts } : {}),
            }));

            const targetIds = [...copyModal.targetGroupIds];
            await applyAssignments(targetIds, assignments);

            showToast(t('teacher.tests.copySuccessToast', { tests: assignments.length, groups: targetIds.length }));
            setCopyModal(null);
        } catch (err) {
            console.error(err);
            showToast('Xatolik: ' + err.message, 'error');
        } finally {
            setCopySaving(false);
        }
    };

    const PRIORITY_META = {
        high: { label: t('teacher.tests.priorityHigh', 'Yuqori'), className: 'text-rose-600 dark:text-rose-400' },
        low: { label: t('teacher.tests.priorityLow', 'Past'), className: 'text-emerald-600 dark:text-emerald-400' },
    };

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <RefreshBar active={isRefreshing} />

            <ConfirmDialog
                open={Boolean(confirmDialog)}
                onClose={() => setConfirmDialog(null)}
                onConfirm={confirmDialog?.onConfirm}
                title={confirmDialog?.title}
                description={confirmDialog?.message}
                confirmLabel={t('common.delete')}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="min-w-0">
                    <h1 className={`text-[28px] leading-tight font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('teacher.tests.title', 'Tayinlangan testlar')}
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {loading
                            ? t('common.loading', 'Yuklanmoqda…')
                            : assignedTests.length === 0
                                ? t('teacher.tests.noTestsAssigned', "Hali birorta vazifa biriktirilmagan")
                                : `${t('teacher.tests.assignmentsCount', { count: summaryStats.total })} · ${t('teacher.tests.testsCount', { count: summaryStats.totalTests })}`}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {assignedTests.length > 0 && (
                        <button
                            onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                            className={`flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-medium border transition-colors ${
                                bulkMode
                                    ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-900 border-gray-900 text-white')
                                    : (isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50')
                            }`}
                        >
                            <CheckSquare size={15} />
                            {bulkMode ? t('teacher.tests.exitBulk', 'Tayyor') : t('teacher.tests.bulkMode', 'Tanlash')}
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/teacher/tests/assign')}
                        className="flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Plus size={16} weight="bold" />
                        {t('teacher.tests.assignNewTask', 'Yangi tayinlash')}
                    </button>
                </div>
            </div>

            {/* Filtrlar */}
            {!loading && assignedTests.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { key: 'all', label: t('teacher.tests.tabAll', 'Hammasi'), count: summaryStats.total },
                            { key: 'active', label: t('teacher.tests.tabActive', 'Faol'), count: summaryStats.active },
                            { key: 'expired', label: t('teacher.tests.tabOverdue', "Muddati o'tgan"), count: summaryStats.expired },
                        ].map(chip => {
                            const active = mainStatusFilter === chip.key;
                            return (
                                <button
                                    key={chip.key}
                                    onClick={() => setMainStatusFilter(chip.key)}
                                    className={`h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors flex items-center gap-1.5 ${
                                        active
                                            ? (isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-gray-900 border-gray-900 text-white')
                                            : (isDark ? 'border-white/8 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50')
                                    }`}
                                >
                                    {chip.label}
                                    <span className={active ? 'opacity-60' : 'opacity-45'}>{chip.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1 min-w-0">
                            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('teacher.tests.searchPlaceholder', "Guruh yoki test nomi…")}
                                value={mainSearch}
                                onChange={e => setMainSearch(e.target.value)}
                                className={`w-full h-10 pl-9 pr-8 rounded-xl border text-sm outline-none transition-colors ${isDark ? 'bg-transparent border-white/10 text-white placeholder-gray-600 focus:border-white/25' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400'}`}
                            />
                            {mainSearch && (
                                <button onClick={() => setMainSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                                    <X size={12} weight="bold" />
                                </button>
                            )}
                        </div>
                        <select
                            value={mainGroupFilter}
                            onChange={e => setMainGroupFilter(e.target.value)}
                            className={`h-10 px-3 rounded-xl border text-sm outline-none cursor-pointer transition-colors ${isDark ? 'bg-transparent border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                        >
                            <option value="all">{t('teacher.tests.allGroups', 'Barcha guruhlar')}</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <select
                            value={mainSort}
                            onChange={e => setMainSort(e.target.value)}
                            title={t('common.sort', 'Saralash')}
                            className={`h-10 px-3 rounded-xl border text-sm outline-none cursor-pointer transition-colors ${isDark ? 'bg-transparent border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                        >
                            <option value="newest">{t('teacher.tests.sortNewest', 'Eng yangi')}</option>
                            <option value="deadline">{t('teacher.tests.sortDeadline', 'Muddati yaqin')}</option>
                            <option value="progress">{t('teacher.tests.sortProgress', 'Kam topshirilgan')}</option>
                        </select>
                    </div>
                </div>
            )}

            {loading ? (
                <TeacherTestsSkeleton cards={4} />
            ) : assignedTests.length === 0 ? (
                <div className={`rounded-2xl border border-dashed p-14 text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <BookOpen size={32} className="mx-auto mb-3 text-gray-400 opacity-50" />
                    <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('teacher.tests.noTestsAssigned', 'Hali test tayinlanmagan')}</p>
                    <p className="text-sm mt-1 text-gray-500">{t('teacher.tests.noAssignmentsEmptyDesc', 'Guruhlaringizga birinchi vazifani biriktiring.')}</p>
                    <button
                        onClick={() => navigate('/teacher/tests/assign')}
                        className="mt-5 inline-flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Plus size={16} weight="bold" />
                        {t('teacher.tests.assignNewTask', 'Yangi tayinlash')}
                    </button>
                </div>
            ) : filteredGroupedAssignments.length === 0 ? (
                <div className={`rounded-2xl border border-dashed p-12 text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <FunnelSimple size={28} className="mx-auto mb-3 text-gray-400 opacity-50" />
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('teacher.tests.noAssignmentsFiltered', "Filtrga mos tayinlov yo'q")}</p>
                    <button
                        onClick={() => { setMainSearch(''); setMainGroupFilter('all'); setMainStatusFilter('all'); }}
                        className="mt-3 text-sm text-blue-500 font-medium hover:underline"
                    >
                        {t('teacher.tests.clearFiltersBtn', 'Filtrni tozalash')}
                    </button>
                </div>
            ) : (
                <div className={`flex flex-col gap-3 ${bulkMode && selectedBulk.size > 0 ? 'pb-20' : ''}`}>
                    {filteredGroupedAssignments.map((groupAssign) => {
                        const { isExpired, pct, submittedTotal, expectedTotal } = groupAssign;
                        const priority = PRIORITY_META[(groupAssign.priority || '').toLowerCase()];
                        const assignKeys = groupAssign.tests.map(t => `${groupAssign.groupId}__${t.id}__${t.date}`);
                        const allInAssignSelected = assignKeys.every(k => selectedBulk.has(k));
                        const someInAssignSelected = !allInAssignSelected && assignKeys.some(k => selectedBulk.has(k));

                        return (
                            <div
                                key={`${groupAssign.groupId}-${groupAssign.date}`}
                                className={`rounded-2xl border transition-colors ${
                                    someInAssignSelected || allInAssignSelected
                                        ? (isDark ? 'border-blue-500/40 bg-blue-500/[0.04]' : 'border-blue-300 bg-blue-50/40')
                                        : (isDark ? 'border-white/8 hover:border-white/15' : 'border-gray-200 bg-white hover:border-gray-300')
                                }`}
                            >
                                {/* ── Kartochka sarlavhasi ── */}
                                <div className="flex items-start gap-3 px-5 pt-4 pb-3.5">
                                    {bulkMode && (
                                        <button
                                            type="button"
                                            onClick={() => toggleBulkAssignment(groupAssign)}
                                            className="shrink-0 mt-0.5 text-gray-400 hover:text-blue-500 transition-colors"
                                            title="Butun tayinlovni tanlash"
                                        >
                                            {allInAssignSelected
                                                ? <CheckSquare size={18} weight="fill" className="text-blue-500" />
                                                : someInAssignSelected
                                                    ? <MinusSquare size={18} weight="fill" className="text-blue-500" />
                                                    : <Square size={18} />}
                                        </button>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className={`text-[15px] font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {groupAssign.groupName}
                                            </h3>
                                            <span className="text-gray-300 dark:text-gray-700">·</span>
                                            <span className="text-[13px] text-gray-500">{t('teacher.tests.testsCount', { count: groupAssign.tests.length })}</span>
                                            {priority && (
                                                <span className={`text-[11px] font-medium ${priority.className}`}>{priority.label}</span>
                                            )}
                                        </div>

                                        {/* Meta qatori — muddat, urinishlar, tayinlangan sana */}
                                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-[12px] text-gray-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Timer size={13} className="text-gray-400 shrink-0" />
                                                <DeadlineCountdown deadline={groupAssign.deadline} isDark={isDark} />
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <ArrowsCounterClockwise size={13} className="text-gray-400 shrink-0" />
                                                {groupAssign.maxAttempts || 1} {t('teacher.tests.attemptSuffix', 'urinish')}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Clock size={13} className="text-gray-400 shrink-0" />
                                                {new Date(groupAssign.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'uz-UZ', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Umumiy holat */}
                                    <div className="shrink-0 flex items-center gap-2">
                                        {expectedTotal > 0 ? (
                                            <span className={`text-[12px] font-medium tabular-nums whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {submittedTotal}/{expectedTotal}
                                                <span className="hidden sm:inline"> {t('teacher.tests.submittedStatus', 'topshirdi')}</span>
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                {t('teacher.groupStats.noStudentsInGroup', "O'quvchi yo'q")}
                                            </span>
                                        )}
                                        {!bulkMode && groups.length > 1 && (
                                            <button
                                                onClick={() => openCopyModal(groupAssign)}
                                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                                                title={t('teacher.tests.copyBtn', 'Boshqa guruhga nusxalash')}
                                            >
                                                <CopySimple size={15} />
                                            </button>
                                        )}
                                        {!bulkMode && (
                                            <button
                                                onClick={() => {
                                                    setEditModal({
                                                        groupId: groupAssign.groupId,
                                                        date: groupAssign.date,
                                                        tests: groupAssign.tests.map(t => ({ id: t.id, title: t.title, type: t.type, ...(t.selectedParts ? { selectedParts: t.selectedParts } : {}) })),
                                                        deadline: groupAssign.deadline ? toDateTimeLocalValue(groupAssign.deadline) : '',
                                                        maxAttempts: String(groupAssign.maxAttempts || 1),
                                                        priority: groupAssign.priority || 'medium',
                                                        teacherNote: groupAssign.teacherNote || '',
                                                        groupName: groupAssign.groupName,
                                                    });
                                                }}
                                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                                                title={t('teacher.tests.editBtn', 'Tayinlovni tahrirlash')}
                                            >
                                                <PencilSimple size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Tayinlovning umumiy progressi */}
                                <ProgressBar pct={pct} isExpired={isExpired} isDark={isDark} rounded={false} />

                                {/* ── Testlar ro'yxati ── */}
                                <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                    {groupAssign.perTest.map(({ test, submitted, total, pct: testPct }, idx) => {
                                        const typeMeta = getTestTypeMeta(test.type);
                                        const bulkKey = `${groupAssign.groupId}__${test.id}__${test.date}`;
                                        const isBulkSelected = selectedBulk.has(bulkKey);
                                        const notSubmitted = total - submitted;

                                        return (
                                            <div
                                                key={`${test.id}-${idx}`}
                                                className={`group flex items-center gap-3 px-5 py-3 transition-colors ${
                                                    isBulkSelected
                                                        ? (isDark ? 'bg-blue-500/[0.06]' : 'bg-blue-50/60')
                                                        : (isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/70')
                                                }`}
                                            >
                                                {bulkMode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBulkItem(groupAssign.groupId, test.id, test.date)}
                                                        className="shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        {isBulkSelected
                                                            ? <CheckSquare size={17} weight="fill" className="text-blue-500" />
                                                            : <Square size={17} />}
                                                    </button>
                                                )}

                                                {/* Nom va turi */}
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-sm font-medium truncate ${isDark ? 'text-zinc-100' : 'text-gray-900'}`} title={test.title}>
                                                        {test.title}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeMeta.dot}`} />
                                                        <span className="text-[11px] text-gray-500">{typeMeta.label}</span>
                                                        {test.selectedParts?.length > 0 && (
                                                            <span className="text-[11px] text-gray-400">
                                                                · {test.selectedParts.map(n => `P${n}`).join(', ')}
                                                            </span>
                                                        )}
                                                        <span className="sm:hidden text-[11px] text-gray-400 tabular-nums">
                                                            · {submitted}/{total}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Progress */}
                                                <div className="hidden sm:flex flex-col items-end gap-1.5 w-24 shrink-0">
                                                    <span className={`text-[12px] tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {submitted}/{total}
                                                    </span>
                                                    <ProgressBar pct={testPct} isExpired={isExpired} isDark={isDark} />
                                                </div>

                                                {/* Amallar */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => navigate(
                                                            `/teacher/tests/monitor/${groupAssign.groupId}/${test.id}?date=${encodeURIComponent(test.date)}`
                                                        )}
                                                        className={`h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
                                                            isDark ? 'text-gray-300 hover:bg-white/8' : 'text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                        title={notSubmitted > 0 ? t('teacher.tests.notSubmittedCount', { count: notSubmitted }) : t('teacher.tests.allSubmitted', 'Hamma topshirdi')}
                                                    >
                                                        <Eye size={15} />
                                                        <span className="hidden md:inline">{t('teacher.tests.monitorBtn', 'Kuzatish')}</span>
                                                    </button>
                                                    {!bulkMode && (
                                                        <button
                                                            onClick={() => handleUnassignTest(test)}
                                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                                                                isDark ? 'text-gray-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                                            }`}
                                                            title={t('teacher.tests.unassignBtn', 'Tayinlovdan olib tashlash')}
                                                        >
                                                            <Trash size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Ustoz eslatmasi ── */}
                                {groupAssign.teacherNote && (
                                    <div className={`px-5 py-3 border-t text-[13px] leading-relaxed ${isDark ? 'border-white/5 text-gray-400' : 'border-gray-100 text-gray-600'}`}>
                                        <span className="text-gray-400 dark:text-gray-500">{t('teacher.tests.teacherNotePrefix', 'Eslatma: ')}</span>
                                        <span className="whitespace-pre-wrap">{groupAssign.teacherNote}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Bulk amal paneli (pastda, doim ko'rinadi) ── */}
            {bulkMode && selectedBulk.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border shadow-lg ${
                        isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'
                    }`}>
                        <span className={`text-sm font-medium px-1.5 tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('teacher.tests.selectedCount', { count: selectedBulk.size })}
                        </span>
                        <button
                            onClick={toggleSelectAll}
                            className={`h-9 px-3 rounded-xl text-[13px] font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {allVisibleSelected ? t('teacher.tests.deselectAll', 'Bekor qilish') : t('teacher.tests.selectAll', 'Hammasi')}
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={handleBulkDelete}
                            className="h-9 px-3.5 rounded-xl text-[13px] font-medium bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors"
                        >
                            <Trash size={14} weight="bold" />
                            {t('common.delete', "O'chirish")}
                        </button>
                        <button
                            onClick={exitBulkMode}
                            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={t('common.close', 'Yopish (Esc)')}
                        >
                            <X size={15} weight="bold" />
                        </button>
                    </div>
                </div>
            )}

            <CopyAssignmentModal
                state={copyModal}
                groups={groups}
                saving={copySaving}
                isDark={isDark}
                onChange={patch => setCopyModal(prev => ({ ...prev, ...patch }))}
                onClose={() => setCopyModal(null)}
                onSubmit={doCopyAssignment}
            />

            <EditAssignmentModal
                state={editModal}
                availableTests={availableTests}
                saving={editSaving}
                isDark={isDark}
                onChange={patch => setEditModal(prev => ({ ...prev, ...patch }))}
                onClose={() => setEditModal(null)}
                onSave={doEditAssignment}
            />

        </div>
    );
}
