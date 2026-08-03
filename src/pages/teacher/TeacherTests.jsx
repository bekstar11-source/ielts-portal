import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { db } from '../../firebase/firebase';
import { getListeningParts } from '../../utils/TestUtils';
import { toDateTimeLocalValue } from '../../utils/teacherResults';
import { useTeacherWorkspace, useTeacherCatalog } from '../../hooks/useTeacherWorkspace';
import { TeacherTestsSkeleton, RefreshBar, Shimmer } from '../../components/teacher/TeacherSkeletons';
import { DeadlineCountdown } from '../../components/teacher/tests/TeacherTestHelpers';
import { getTestIconAndColor } from '../../components/teacher/tests/testTypeIcon';
import AssignTestForm from '../../components/teacher/tests/AssignTestForm';
import MonitorTestPage from '../../components/teacher/tests/MonitorTestPage';
import { doc, getDocs, query, where, collection, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import {
  BookOpen,
  CaretLeft,
  CheckCircle,
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
  ListChecks,
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
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    // Panelning umumiy keshi — groups/students/results/podcastAttempts
    // shu yerdan keladi va boshqa o'qituvchi sahifalari bilan BO'LISHILADI.
    const {
        groups, students, results, podcastAttempts,
        loading, isRefreshing, refresh, patch,
    } = useTeacherWorkspace({ uid: userData?.uid });

    /**
     * Tayinlash/o'chirish/tahrirlash darhol ko'rinishi uchun optimistik
     * yangilanish LOKAL state ga emas, umumiy keshga yoziladi. Shunda
     * o'qituvchi Dashboard yoki GroupStats ga o'tganda ham o'zgarishni
     * ko'radi — qayta o'qishsiz.
     */
    const setGroups = (updater) => patch((prev) => {
        const next = (typeof updater === 'function' ? updater(prev.groups) : updater)
            .map((g) => ({
                ...g,
                // `set` tayinlovlari haqiqiy test soniga yoyilgani uchun
                // ko'rsatkichlar ham darhol to'g'ri qoladi.
                realTestCount: (g.assignedTests || []).reduce(
                    (sum, assign) => sum + (assign?.type === 'set'
                        ? (prev.testSetsMap[assign.id]?.testIds?.length || 0)
                        : 1),
                    0
                ),
            }));
        return { groups: next };
    });

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

    // Toast notification
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Inline confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }

    // View mode page visibility
    const [showAssignPage, setShowAssignPage] = useState(false);
    const [showMonitorPage, setShowMonitorPage] = useState(false);
    const [monitoringTest, setMonitoringTest] = useState(null);

    // Assign form states — selectedGroupIds replaces single selectedGroupId (multi-group)
    const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
    const [searchTestQuery, setSearchTestQuery] = useState("");
    const [testTypeFilter, setTestTypeFilter] = useState("all");
    const [selectedTests, setSelectedTests] = useState([]);
    const [deadline, setDeadline] = useState("");
    const [maxAttempts, setMaxAttempts] = useState("1");
    const [teacherNote, setTeacherNote] = useState("");
    const [priority, setPriority] = useState("medium");
    const [assigning, setAssigning] = useState(false);
    // { [testId]: number[] } — null/absent = full test, [1,3] = specific parts
    const [selectedPartsMap, setSelectedPartsMap] = useState({});

    // Bulk delete
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedBulk, setSelectedBulk] = useState(new Set());

    // Monitor page — qidiruv/saralash/`lastRefresh` MonitorTestPage ichida
    // saqlanadi; bu yerda faqat "eslatma yuborilmoqda" holati kerak.
    const [sendingReminder, setSendingReminder] = useState(false);

    // Main list filters
    const [mainSearch, setMainSearch] = useState('');
    const [mainGroupFilter, setMainGroupFilter] = useState('all');
    const [mainStatusFilter, setMainStatusFilter] = useState('all');
    const [mainSort, setMainSort] = useState('newest'); // 'newest' | 'deadline' | 'progress'

    // Edit assignment modal
    const [editModal, setEditModal] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editTestSearch, setEditTestSearch] = useState('');
    const [showEditTestPicker, setShowEditTestPicker] = useState(false);

    // Copy assignment modal
    const [copyModal, setCopyModal] = useState(null);
    const [copySaving, setCopySaving] = useState(false);

    // Testlar/podkastlar/maqolalar katalogi — UCHTA to'liq kolleksiya o'qishi.
    // Ilgari u sahifa har ochilganda yuborilardi, garchi o'qituvchi tayinlash
    // oynasini umuman ochmasa ham. Endi faqat kerak bo'lganda va 30 daqiqalik
    // kesh bilan.
    const { availableTests, catalogLoading } = useTeacherCatalog(
        showAssignPage || Boolean(editModal)
    );

    /**
     * Topshirganlar indeksi. Ilgari har bir test kartochkasi uchun butun
     * `results` massivi qaytadan filtrlanardi — 50 ta test × 2000 natija har
     * renderда. Endi bir marta indeks quriladi, qidiruv O(1).
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

    /**
     * Panelning umumiy keshini bekor qiladi. Ilgari bu funksiya butun
     * zanjirni (groups → users → results → podcastAttempts → katalog)
     * qo'lda qayta o'qirdi; endi u faqat keshni "eskirgan" deb belgilaydi,
     * qayta o'qishni esa react-query bir marta bajaradi.
     */
    const fetchData = () => refresh();

    /**
     * Tayyor tayinlov yozuvlarini guruhlarga yozadi, feed post yaratadi va
     * lokal holatni yangilaydi.
     *
     * Yangi tayinlash ham, mavjudini nusxalash ham SHU funksiyadan o'tadi —
     * aks holda ikki xil yozuv oqimi paydo bo'lib, feed post yoki maydon
     * tarkibi bir-biridan chetga chiqib ketardi.
     */
    const commitAssignments = async (groupIds, assignments) => {
        const testEntries = assignments.map(a => ({ id: a.id, title: a.title, type: a.type }));
        const feedContent = testEntries.length === 1
            ? testEntries[0].title
            : `Ustozingiz sizga ${testEntries.length} ta yangi vazifa tayinladi`;
        const first = assignments[0];

        await Promise.all(groupIds.map(gid =>
            updateDoc(doc(db, 'groups', gid), { assignedTests: arrayUnion(...assignments) })
        ));

        // Create a fresh feed post for each group (no merging with old posts)
        await Promise.all(groupIds.map(async gid => {
            try {
                await addDoc(collection(db, 'feed_posts'), {
                    type: 'teacher_test',
                    title: 'Sizning ustozingiz vazifa tayinladi',
                    content: feedContent,
                    groupId: gid,
                    deadline: first.deadline,
                    maxAttempts: first.maxAttempts,
                    priority: first.priority,
                    teacherNote: first.teacherNote,
                    teacherId: userData.uid,
                    teacherName: userData.fullName || 'Ustoz',
                    likes: [], commentsCount: 0,
                    createdAt: serverTimestamp(),
                    tests: testEntries,
                    testId: testEntries[0].id,
                    testType: testEntries[0].type,
                    assignDate: first.date,
                });
            } catch (feedErr) {
                console.error("Feed post error:", feedErr);
            }
        }));

        // Optimistic local state update
        const targetSet = new Set(groupIds);
        setGroups(prev => prev.map(g => (
            targetSet.has(g.id)
                ? { ...g, assignedTests: [...(g.assignedTests || []), ...assignments] }
                : g
        )));
    };

    const handleAssignTest = async (e) => {
        e.preventDefault();
        if (selectedGroupIds.size === 0) return showToast(t('teacher.assignForm.errorSelectGroup', "Iltimos, kamida bitta guruhni tanlang!"), 'error');
        if (selectedTests.length === 0) return showToast(t('teacher.assignForm.errorSelectTest', "Iltimos, kamida bitta vazifani tanlang!"), 'error');

        setAssigning(true);
        try {
            const assignDate = new Date().toISOString();
            const deadlineVal = deadline ? new Date(deadline).toISOString() : null;
            const newAssignments = selectedTests.map(test => {
                const partsArr = getListeningParts(test);
                const isFullListening = (test.type || '').toLowerCase().includes('listening') && partsArr.length > 1;
                const chosenParts = selectedPartsMap[test.id];
                const hasPartSelection = isFullListening && chosenParts && chosenParts.length > 0 && chosenParts.length < partsArr.length;
                return {
                    id: test.id,
                    title: test.title || 'Untitled',
                    type: test.type,
                    date: assignDate,
                    deadline: deadlineVal,
                    maxAttempts: Number(maxAttempts) || 1,
                    priority: priority,
                    teacherNote: teacherNote,
                    ...(hasPartSelection ? { selectedParts: [...chosenParts].sort((a, b) => a - b) } : {})
                };
            });

            const allGroupIds = [...selectedGroupIds];
            await commitAssignments(allGroupIds, newAssignments);

            showToast(t('teacher.tests.assignSuccessToast', { tests: newAssignments.length, groups: allGroupIds.length }));
            setShowAssignPage(false);
            setSelectedTests([]);
            setSelectedGroupIds(new Set());
            setSelectedPartsMap({});
            setDeadline("");
            setMaxAttempts("1");
            setTeacherNote("");
            setPriority("medium");
        } catch (err) {
            console.error(err);
            showToast("Xatolik yuz berdi: " + err.message, 'error');
        } finally {
            setAssigning(false);
        }
    };

    const doUnassignTest = async (assignment) => {
        try {
            const targetGroup = groups.find(g => g.id === assignment.groupId);
            if (!targetGroup) return;
            const originalAssign = targetGroup.assignedTests?.find(a => a.id === assignment.id && a.date === assignment.date);
            if (!originalAssign) return;

            await updateDoc(doc(db, 'groups', assignment.groupId), {
                assignedTests: arrayRemove(originalAssign)
            });

            // Update feed posts in background
            try {
                const feedQuery = query(
                    collection(db, 'feed_posts'),
                    where('type', '==', 'teacher_test'),
                    where('groupId', '==', assignment.groupId)
                );
                const feedSnap = await getDocs(feedQuery);
                for (const docSnap of feedSnap.docs) {
                    const data = docSnap.data();
                    if (data.testId === assignment.id && (!data.tests || data.tests.length <= 1)) {
                        await deleteDoc(docSnap.ref);
                    } else if (data.tests && Array.isArray(data.tests)) {
                        const updatedTests = data.tests.filter(t => t.id !== assignment.id);
                        if (updatedTests.length === 0) {
                            await deleteDoc(docSnap.ref);
                        } else {
                            const newContent = updatedTests.length === 1
                                ? updatedTests[0].title
                                : `Ustozingiz sizga ${updatedTests.length} ta yangi vazifa tayinladi`;
                            await updateDoc(docSnap.ref, {
                                tests: updatedTests,
                                content: newContent,
                                testId: updatedTests[0].id,
                                testType: updatedTests[0].type
                            });
                        }
                    }
                }
            } catch (feedErr) {
                console.error("Error updating/deleting feed post for unassigned test:", feedErr);
            }

            // Optimistic local state update
            setGroups(prev => prev.map(g => {
                if (g.id !== assignment.groupId) return g;
                return {
                    ...g,
                    assignedTests: (g.assignedTests || []).filter(a => !(a.id === assignment.id && a.date === assignment.date))
                };
            }));
            showToast(t('teacher.tests.unassignSuccess', "Tayinlov muvaffaqiyatli olib tashlandi!"));
        } catch (err) {
            console.error(err);
            showToast("Xatolik yuz berdi: " + err.message, 'error');
        }
    };

    const handleUnassignTest = (assignment) => {
        setConfirmDialog({
            message: t('teacher.tests.confirmUnassignDesc', { title: assignment.title }),
            onConfirm: () => {
                setConfirmDialog(null);
                doUnassignTest(assignment);
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedBulk.size === 0) return;
        const keys = [...selectedBulk];
        setConfirmDialog({
            message: t('teacher.tests.confirmBulkDeleteDesc', { count: keys.length }),
            onConfirm: async () => {
                setConfirmDialog(null);
                let removed = 0;
                for (const key of keys) {
                    const [groupId, testId, date] = key.split('__');
                    const assignment = assignedTests.find(a => a.groupId === groupId && a.id === testId && a.date === date);
                    // `doUnassignTest` xatoni o'zi ushlaydi, shuning uchun bu
                    // yerda faqat topilganlarini sanaymiz.
                    if (assignment) {
                        await doUnassignTest(assignment);
                        removed++;
                    }
                }
                setSelectedBulk(new Set());
                setBulkMode(false);
                showToast(t('teacher.tests.bulkDeleteSuccess', { count: removed }));
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
                else if (editModal) { setEditModal(null); setEditTestSearch(''); setShowEditTestPicker(false); }
                else if (bulkMode) exitBulkMode();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [confirmDialog, copyModal, editModal, bulkMode]);

    /** Tahrirlash modalini saqlash: Firestore + optimistic update */
    const doEditAssignment = async () => {
        if (!editModal || !editModal.tests?.length) return;
        setEditSaving(true);
        try {
            const targetGroup = groups.find(g => g.id === editModal.groupId);
            if (!targetGroup) return;

            const oldAssigns = targetGroup.assignedTests || [];
            // Bitta tayinlov blokidagi barcha qadimgi testlarni olib tashlaymiz
            const unchanged = oldAssigns.filter(a => !(a.date === editModal.date));

            const deadlineVal = editModal.deadline ? new Date(editModal.deadline).toISOString() : null;
            const maxAttemptsVal = Number(editModal.maxAttempts) || 1;

            const updatedAssignments = editModal.tests.map(t => ({
                id: t.id,
                title: t.title || 'Untitled',
                type: t.type,
                date: editModal.date,
                deadline: deadlineVal,
                maxAttempts: maxAttemptsVal,
                priority: editModal.priority,
                teacherNote: editModal.teacherNote,
                ...(t.selectedParts ? { selectedParts: t.selectedParts } : {}),
            }));

            const finalAssignedTests = [...unchanged, ...updatedAssignments];

            await updateDoc(doc(db, 'groups', editModal.groupId), {
                assignedTests: finalAssignedTests
            });

            // Optimistic update
            setGroups(prev => prev.map(g => {
                if (g.id !== editModal.groupId) return g;
                return { ...g, assignedTests: finalAssignedTests };
            }));

            showToast(t('teacher.tests.updateSuccessToast', "Tayinlov muvaffaqiyatli yangilandi!"));
            setEditModal(null);
            setEditTestSearch('');
            setShowEditTestPicker(false);
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

    const toggleCopyTarget = (gid) => {
        setCopyModal(prev => {
            const next = new Set(prev.targetGroupIds);
            if (next.has(gid)) next.delete(gid); else next.add(gid);
            return { ...prev, targetGroupIds: next };
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
            await commitAssignments(targetIds, assignments);

            showToast(t('teacher.tests.copySuccessToast', { tests: assignments.length, groups: targetIds.length }));
            setCopyModal(null);
        } catch (err) {
            console.error(err);
            showToast('Xatolik: ' + err.message, 'error');
        } finally {
            setCopySaving(false);
        }
    };

    const exportMonitorCSV = (monitoringStudents, monitoringTest) => {
        const rows = [['Ism', 'Email/Telefon', 'Status', 'Ball/Natija', 'Sana', 'Qoidabuzarlik']];
        monitoringStudents.forEach(({ student, submitted, score, submitDate, hasViolation, violationText }) => {
            rows.push([
                student.fullName || '',
                student.email || student.phoneNumber || '',
                submitted ? 'Topshirdi' : 'Kutilmoqda',
                String(score),
                submitDate,
                hasViolation ? (violationText || 'Ha') : '',
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${monitoringTest?.title || 'natijalar'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const sendReminder = async (monitoringTest, notSubmittedCount) => {
        setSendingReminder(true);
        try {
            await addDoc(collection(db, 'feed_posts'), {
                type: 'teacher_reminder',
                title: 'Eslatma: Topshiriq kutilmoqda',
                content: `"${monitoringTest.title}" testi hali topshirilmagan. Iltimos, imkon qadar tezroq topshiring.`,
                groupId: monitoringTest.groupId,
                teacherId: userData.uid,
                teacherName: userData.fullName || 'Ustoz',
                likes: [],
                commentsCount: 0,
                createdAt: serverTimestamp(),
                testId: monitoringTest.id,
            });
            showToast(t('teacher.tests.reminderSentToast', { count: notSubmittedCount }));
        } catch (err) {
            showToast('Xatolik: ' + err.message, 'error');
        } finally {
            setSendingReminder(false);
        }
    };

    /**
     * Tur uchun yorliq va NUQTA rangi.
     * Ilgari har bir tur to'liq rangli "pill" edi — kartochkada 5–6 xil rang
     * bir vaqtda ko'rinib, muhim narsani (progress va muddat) bosib ketardi.
     * Endi rang faqat kichik nuqtada, matn esa neytral.
     */
    const getTypeMeta = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('mock') || t.includes('full')) return { label: 'Mock', dot: 'bg-purple-500' };
        if (t.includes('reading')) return { label: 'Reading', dot: 'bg-blue-500' };
        if (t.includes('listening')) return { label: 'Listening', dot: 'bg-pink-500' };
        if (t.includes('writing')) return { label: 'Writing', dot: 'bg-orange-500' };
        if (t.includes('podcast')) return { label: 'Podcast', dot: 'bg-indigo-500' };
        if (t.includes('article')) return { label: 'Article', dot: 'bg-emerald-500' };
        return { label: (type || 'Test').toUpperCase(), dot: 'bg-gray-400' };
    };

    const PRIORITY_META = {
        high: { label: t('teacher.tests.priorityHigh', 'Yuqori'), className: 'text-rose-600 dark:text-rose-400' },
        low: { label: t('teacher.tests.priorityLow', 'Past'), className: 'text-emerald-600 dark:text-emerald-400' },
    };

    if (showAssignPage) {
        return (
            <AssignTestForm
                isDark={isDark} toast={toast}
                groups={groups} availableTests={availableTests} catalogLoading={catalogLoading}
                selectedGroupIds={selectedGroupIds} setSelectedGroupIds={setSelectedGroupIds}
                searchTestQuery={searchTestQuery} setSearchTestQuery={setSearchTestQuery}
                testTypeFilter={testTypeFilter} setTestTypeFilter={setTestTypeFilter}
                selectedTests={selectedTests} setSelectedTests={setSelectedTests}
                deadline={deadline} setDeadline={setDeadline}
                maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
                teacherNote={teacherNote} setTeacherNote={setTeacherNote}
                priority={priority} setPriority={setPriority}
                assigning={assigning} selectedPartsMap={selectedPartsMap} setSelectedPartsMap={setSelectedPartsMap}
                onBack={() => {
                    setSelectedTests([]);
                    setSelectedGroupIds(new Set());
                    setSelectedPartsMap({});
                    setDeadline("");
                    setMaxAttempts("1");
                    setTeacherNote("");
                    setPriority("medium");
                    setShowAssignPage(false);
                }}
                onAssign={handleAssignTest}
            />
        );
    }

    if (showMonitorPage && monitoringTest) {
        return (
            <MonitorTestPage
                isDark={isDark}
                monitoringTest={monitoringTest} results={results}
                podcastAttempts={podcastAttempts} students={students}
                fetchData={fetchData}
                exportMonitorCSV={exportMonitorCSV}
                sendReminder={sendReminder}
                sendingReminder={sendingReminder}
                onBack={() => { setShowMonitorPage(false); setMonitoringTest(null); }}
            />
        );
    }

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <RefreshBar active={isRefreshing} />

            {/* Toast Notification — bulk paneli ochiq bo'lsa uning ustiga chiqadi */}
            {toast && (
                <div
                    className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in-up transition-all ${
                        bulkMode && selectedBulk.size > 0 ? 'bottom-24' : 'bottom-6'
                    } ${
                        toast.type === 'error'
                            ? (isDark ? 'bg-[#1E1E1E] border-rose-500/30 text-rose-300' : 'bg-white border-rose-200 text-rose-700')
                            : (isDark ? 'bg-[#1E1E1E] border-emerald-500/30 text-emerald-300' : 'bg-white border-emerald-200 text-emerald-700')
                    }`}
                >
                    {toast.type === 'error'
                        ? <X size={15} weight="bold" className="text-rose-500 shrink-0" />
                        : <CheckCircle size={15} weight="fill" className="text-emerald-500 shrink-0" />
                    }
                    {toast.message}
                </div>
            )}

            {/* Inline Confirm Dialog */}
            {confirmDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setConfirmDialog(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={e => e.stopPropagation()}
                        className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}
                    >
                        <p className={`text-sm leading-relaxed mb-5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {confirmDialog.message}
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </button>
                            <button
                                autoFocus
                                onClick={confirmDialog.onConfirm}
                                className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors"
                            >
                                {t('common.delete', "O'chirish")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back link */}
            <button
                onClick={() => navigate('/teacher')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors -mb-1 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-900'}`}
            >
                <CaretLeft size={15} weight="bold" />
                {t('common.dashboard', 'Bosh sahifa')}
            </button>

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
                                : `${summaryStats.total} ${t('teacher.groupStats.totalResults', 'tayinlov')} · ${summaryStats.totalTests} ${t('teacher.groupStats.testsPlural', 'test')}`}
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
                        onClick={() => setShowAssignPage(true)}
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
                        onClick={() => setShowAssignPage(true)}
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
                                            <span className="text-[13px] text-gray-500">{groupAssign.tests.length} {t('teacher.groupStats.testsPlural', 'ta test')}</span>
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
                                                {new Date(groupAssign.date).toLocaleDateString(language === 'en' ? 'en-US' : 'uz-UZ', { day: '2-digit', month: 'short' })}
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
                                                    setEditTestSearch('');
                                                    setShowEditTestPicker(false);
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
                                        const typeMeta = getTypeMeta(test.type);
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
                                                        onClick={() => {
                                                            setMonitoringTest({
                                                                ...test,
                                                                groupId: groupAssign.groupId,
                                                                groupName: groupAssign.groupName,
                                                                studentIds: groupAssign.studentIds || [],
                                                            });
                                                            setShowMonitorPage(true);
                                                        }}
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
                            {selectedBulk.size} {t('teacher.tests.selectedCountSuffix', 'ta tanlandi')}
                        </span>
                        <button
                            onClick={toggleSelectAll}
                            className={`h-9 px-3 rounded-xl text-[13px] font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {allVisibleSelected ? t('teacher.tests.cancelSelection', 'Bekor qilish') : t('teacher.tests.selectAllBtn', 'Hammasi')}
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

            {/* ── Nusxalash modali ── */}
            {copyModal && (() => {
                const targetGroups = groups.filter(g => g.id !== copyModal.sourceGroupId);
                const selectedCount = copyModal.targetGroupIds.size;
                const studentCount = groups
                    .filter(g => copyModal.targetGroupIds.has(g.id))
                    .reduce((s, g) => s + (g.studentIds?.length || 0), 0);

                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
                        onClick={() => !copySaving && setCopyModal(null)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            onClick={e => e.stopPropagation()}
                            className={`w-full max-w-lg rounded-2xl border shadow-xl flex flex-col max-h-[85vh] ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}
                        >
                            {/* Sarlavha */}
                            <div className={`flex items-start justify-between gap-3 px-5 pt-4 pb-3.5 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                <div className="min-w-0">
                                    <h3 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {t('teacher.copyModal.title', 'Boshqa guruhga nusxalash')}
                                    </h3>
                                    <p className="text-[13px] text-gray-500 mt-0.5 truncate">
                                        {t('teacher.copyModal.source', 'Manba')}: {copyModal.sourceGroupName} · {copyModal.tests.length} {t('teacher.groupStats.testsPlural', 'ta test')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setCopyModal(null)}
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDark ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 custom-scrollbar">
                                {/* Ko'chiriladigan testlar */}
                                <div className="space-y-2">
                                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t('teacher.copyModal.copiedTests', "Ko'chiriladigan testlar")}
                                    </p>
                                    <div className={`rounded-xl border divide-y ${isDark ? 'border-white/8 divide-white/5' : 'border-gray-200 divide-gray-100'}`}>
                                        {copyModal.tests.map(tItem => {
                                            const meta = getTypeMeta(tItem.type);
                                            return (
                                                <div key={tItem.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                                    <span className={`flex-1 text-[13px] truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{tItem.title}</span>
                                                    {tItem.selectedParts?.length > 0 && (
                                                        <span className="text-[11px] text-gray-400 shrink-0">
                                                            {tItem.selectedParts.map(n => `P${n}`).join(', ')}
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] text-gray-500 shrink-0">{meta.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Maqsad guruhlar */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {t('teacher.copyModal.targetGroups', 'Qaysi guruhlarga')}
                                        </p>
                                        {selectedCount > 0 && (
                                            <span className="text-[11px] text-gray-500 tabular-nums">{selectedCount} {t('teacher.tests.selectedCountSuffix', 'ta tanlandi')}</span>
                                        )}
                                    </div>

                                    {targetGroups.length === 0 ? (
                                        <p className="text-[13px] text-gray-500 py-3">
                                            {t('teacher.copyModal.noOtherGroups', "Nusxalash uchun boshqa guruhingiz yo'q.")}
                                        </p>
                                    ) : (
                                        <div className={`rounded-xl border divide-y overflow-hidden ${isDark ? 'border-white/8 divide-white/5' : 'border-gray-200 divide-gray-100'}`}>
                                            {targetGroups.map(g => {
                                                const checked = copyModal.targetGroupIds.has(g.id);
                                                const already = copyModal.tests.filter(tItem =>
                                                    (g.assignedTests || []).some(a => a.id === tItem.id)
                                                ).length;
                                                return (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => toggleCopyTarget(g.id)}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                                            checked
                                                                ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50')
                                                                : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')
                                                        }`}
                                                    >
                                                        {checked
                                                            ? <CheckSquare size={17} weight="fill" className="text-blue-500 shrink-0" />
                                                            : <Square size={17} className="text-gray-400 shrink-0" />}
                                                        <span className={`flex-1 text-[13px] font-medium truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                                                            {g.name}
                                                        </span>
                                                        {already > 0 && (
                                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 shrink-0">
                                                                {t('teacher.copyModal.alreadyHas', { count: already })}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                                                            {g.studentIds?.length || 0} {t('teacher.groupStats.studentsShort', "o'q")}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Sozlamalar */}
                                <div className="space-y-3">
                                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t('teacher.copyModal.settingsTitle', 'Nusxa uchun sozlamalar')}
                                    </p>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] text-gray-500 flex items-center gap-1.5">
                                            <Clock size={13} className="text-gray-400" /> {t('teacher.assignForm.deadline', 'Deadline')}
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: t('teacher.assignForm.day1', '+1 kun'), days: 1 },
                                                { label: t('teacher.assignForm.day3', '+3 kun'), days: 3 },
                                                { label: t('teacher.assignForm.week1', '+1 hafta'), days: 7 }
                                            ].map(({ label, days }) => (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => {
                                                        const d = new Date();
                                                        d.setDate(d.getDate() + days);
                                                        d.setSeconds(0, 0);
                                                        setCopyModal(p => ({ ...p, deadline: toDateTimeLocalValue(d) }));
                                                    }}
                                                    className={`h-7 px-2.5 rounded-lg border text-[12px] font-medium transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                            {copyModal.deadline && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCopyModal(p => ({ ...p, deadline: '' }))}
                                                    className="h-7 px-2.5 rounded-lg border border-rose-500/25 text-rose-500 text-[12px] font-medium hover:bg-rose-500/5 transition-colors"
                                                >
                                                    {t('common.clear', 'Tozalash')}
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="datetime-local"
                                            value={copyModal.deadline}
                                            onChange={e => setCopyModal(p => ({ ...p, deadline: e.target.value }))}
                                            className={`w-full h-10 px-3 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-transparent border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] text-gray-500 flex items-center gap-1.5">
                                                <ArrowsCounterClockwise size={13} className="text-gray-400" /> {t('teacher.assignForm.attempts', 'Urinishlar')}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={Number(copyModal.maxAttempts) <= 1}
                                                    onClick={() => setCopyModal(p => ({ ...p, maxAttempts: String(Math.max(1, Number(p.maxAttempts) - 1)) }))}
                                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center disabled:opacity-40 transition-colors ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <Minus size={13} weight="bold" />
                                                </button>
                                                <span className={`flex-1 text-center text-sm font-medium tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {copyModal.maxAttempts}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={Number(copyModal.maxAttempts) >= 10}
                                                    onClick={() => setCopyModal(p => ({ ...p, maxAttempts: String(Math.min(10, Number(p.maxAttempts) + 1)) }))}
                                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center disabled:opacity-40 transition-colors ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <Plus size={13} weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] text-gray-500">{t('teacher.assignForm.priority', 'Muhimlik')}</label>
                                            <div className="grid grid-cols-3 gap-1">
                                                {[
                                                    { key: 'low', label: t('teacher.assignForm.priorityLow', 'Past') },
                                                    { key: 'medium', label: t('teacher.assignForm.priorityMedium', "O'rt") },
                                                    { key: 'high', label: t('teacher.assignForm.priorityHigh', 'Yuq') },
                                                ].map(item => (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        onClick={() => setCopyModal(p => ({ ...p, priority: item.key }))}
                                                        className={`h-9 rounded-lg border text-[12px] font-medium transition-colors ${
                                                            copyModal.priority === item.key
                                                                ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-900 border-gray-900 text-white')
                                                                : (isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50')
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] text-gray-500">{t('teacher.assignForm.note', 'Eslatma / izoh')}</label>
                                        <textarea
                                            rows={2}
                                            value={copyModal.teacherNote}
                                            onChange={e => setCopyModal(p => ({ ...p, teacherNote: e.target.value }))}
                                            placeholder={t('teacher.assignForm.optional', 'Ixtiyoriy')}
                                            className={`w-full p-3 rounded-xl border text-[13px] outline-none resize-none transition-colors ${isDark ? 'bg-transparent border-white/10 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Amallar */}
                            <div className={`flex items-center gap-2 px-5 py-3.5 border-t ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                <span className="text-[12px] text-gray-500 flex-1 truncate">
                                    {selectedCount > 0
                                        ? `${copyModal.tests.length} × ${selectedCount} ${t('teacher.tests.groupCountSuffix', 'guruh')} · ${studentCount} ${t('teacher.groupStats.studentsShort', "o'quvchi")}`
                                        : t('teacher.copyModal.selectGroupHint', 'Guruh tanlang')}
                                </span>
                                <button
                                    onClick={() => setCopyModal(null)}
                                    className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </button>
                                <button
                                    onClick={doCopyAssignment}
                                    disabled={copySaving || selectedCount === 0}
                                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {copySaving
                                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><CopySimple size={15} weight="bold" /> {t('teacher.copyModal.copyBtn', 'Nusxalash')}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Edit Assignment Modal */}
            {editModal && (() => {
                const editFilteredTests = availableTests.filter(tItem => {
                    const q = editTestSearch.toLowerCase();
                    return !q || tItem.title?.toLowerCase().includes(q) || (tItem.type || '').toLowerCase().includes(q);
                }).slice(0, 30);

                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
                    <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                            <div>
                                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('teacher.editModal.title', 'Tayinlovni tahrirlash')}</h3>
                                <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{editModal.groupName}</p>
                            </div>
                            <button onClick={() => { setEditModal(null); setEditTestSearch(''); setShowEditTestPicker(false); }} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
                        </div>

                        {/* Scrollable body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 custom-scrollbar">

                            {/* ── TESTS SECTION ── */}
                            <div className="space-y-2">
                                <label className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <span className="flex items-center gap-1.5"><ListChecks size={13} /> {t('teacher.editModal.assignedTests', 'Tayinlangan testlar')}</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{editModal.tests?.length || 0} {t('teacher.groupStats.testsPlural', 'ta')}</span>
                                </label>

                                {/* Current tests list */}
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-gray-50/50'}`}>
                                    {(editModal.tests || []).map((tItem, idx) => {
                                        const { icon, colorClass } = getTestIconAndColor(tItem.type);
                                        const canRemove = (editModal.tests?.length || 0) > 1;
                                        return (
                                            <div key={tItem.id} className={`flex items-center gap-3 px-3 py-2.5 ${idx > 0 ? (isDark ? 'border-t border-white/5' : 'border-t border-gray-100') : ''}`}>
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>{icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-xs font-semibold truncate block ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{tItem.title}</span>
                                                    {tItem.selectedParts && (
                                                        <span className="text-[9px] text-pink-500 font-bold">{tItem.selectedParts.map(n => `Part ${n}`).join(', ')}</span>
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${colorClass}`}>
                                                    {(tItem.type === 'mock_full' ? 'Mock' : (tItem.type || '').slice(0, 4)).toUpperCase()}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={!canRemove}
                                                    title={canRemove ? t('common.remove', "Olib tashlash") : t('teacher.editModal.minTestError', "Kamida 1 ta test bo'lishi kerak")}
                                                    onClick={() => setEditModal(p => ({ ...p, tests: p.tests.filter(x => x.id !== tItem.id) }))}
                                                    className={`p-1.5 rounded-lg transition-all shrink-0 ${canRemove ? 'text-gray-400 hover:text-rose-500 hover:bg-rose-500/10' : 'opacity-25 cursor-not-allowed text-gray-400'}`}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add test picker toggle */}
                                {!showEditTestPicker ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowEditTestPicker(true)}
                                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-xs font-semibold transition-all ${isDark ? 'border-white/15 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5' : 'border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <Plus size={14} weight="bold" /> {t('teacher.editModal.addTestBtn', "Test qo'shish")}
                                    </button>
                                ) : (
                                    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10 bg-[#252525]' : 'border-gray-200 bg-white shadow-sm'}`}>
                                        {/* Search */}
                                        <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                            <SearchIcon size={14} className="text-gray-400 shrink-0" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder={t('teacher.editModal.searchTestPlaceholder', "Test nomini yozing...")}
                                                value={editTestSearch}
                                                onChange={e => setEditTestSearch(e.target.value)}
                                                className={`flex-1 text-xs font-semibold outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                                            />
                                            <button type="button" onClick={() => { setShowEditTestPicker(false); setEditTestSearch(''); }} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={13} /></button>
                                        </div>
                                        {/* Results */}
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                            {editFilteredTests.length > 0 ? editFilteredTests.map(tItem => {
                                                const { icon, colorClass } = getTestIconAndColor(tItem.type);
                                                const alreadyIn = (editModal.tests || []).some(x => x.id === tItem.id);
                                                return (
                                                    <button
                                                        key={tItem.id}
                                                        type="button"
                                                        disabled={alreadyIn}
                                                        onClick={() => {
                                                            if (alreadyIn) return;
                                                            setEditModal(p => ({
                                                                ...p,
                                                                tests: [...(p.tests || []), { id: tItem.id, title: tItem.title, type: tItem.type }]
                                                            }));
                                                            setEditTestSearch('');
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-50'} ${
                                                            alreadyIn
                                                                ? 'opacity-40 cursor-not-allowed'
                                                                : (isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50')
                                                        }`}
                                                    >
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>{icon}</div>
                                                        <span className={`flex-1 text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{tItem.title}</span>
                                                        {alreadyIn
                                                            ? <CheckCircle size={14} weight="fill" className="text-emerald-500 shrink-0" />
                                                            : <Plus size={13} className={`shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        }
                                                    </button>
                                                );
                                            }) : (
                                                <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-semibold">{t('teacher.editModal.noTestFound', 'Test topilmadi')}</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── SETTINGS ── */}
                            <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-gray-50/40'}`}>
                                {/* Deadline */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Clock size={13} /> {t('teacher.assignForm.deadline', 'Deadline')}</label>
                                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                                        {[
                                            { label: t('teacher.assignForm.day1', '+1 kun'), days: 1 },
                                            { label: t('teacher.assignForm.day3', '+3 kun'), days: 3 },
                                            { label: t('teacher.assignForm.week1', '+1 hafta'), days: 7 }
                                        ].map(({ label, days }) => (
                                            <button key={days} type="button"
                                                onClick={() => { const d = new Date(); d.setDate(d.getDate() + days); d.setSeconds(0, 0); setEditModal(p => ({ ...p, deadline: toDateTimeLocalValue(d) })); }}
                                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-blue-500/10 hover:text-blue-400' : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 shadow-sm'}`}
                                            >{label}</button>
                                        ))}
                                        {editModal.deadline && (
                                            <button type="button" onClick={() => setEditModal(p => ({ ...p, deadline: '' }))}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all">✕ {t('common.clear', 'Tozalash')}</button>
                                        )}
                                    </div>
                                    <input type="datetime-local" value={editModal.deadline}
                                        onChange={e => setEditModal(p => ({ ...p, deadline: e.target.value }))}
                                        className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'}`}
                                    />
                                </div>

                                {/* Max Attempts + Priority in a row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><ArrowsCounterClockwise size={13} /> {t('teacher.assignForm.attempts', 'Maks. urinishlar')}</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" disabled={Number(editModal.maxAttempts) <= 1}
                                                onClick={() => setEditModal(p => ({ ...p, maxAttempts: String(Math.max(1, Number(p.maxAttempts) - 1)) }))}
                                                className={`w-9 h-9 rounded-xl border flex items-center justify-center disabled:opacity-40 transition-all ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white hover:bg-white/5' : 'bg-white border-gray-200 shadow-sm hover:bg-gray-100'}`}>
                                                <Minus size={13} weight="bold" />
                                            </button>
                                            <span className={`flex-1 text-center text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{editModal.maxAttempts}</span>
                                            <button type="button" disabled={Number(editModal.maxAttempts) >= 10}
                                                onClick={() => setEditModal(p => ({ ...p, maxAttempts: String(Math.min(10, Number(p.maxAttempts) + 1)) }))}
                                                className={`w-9 h-9 rounded-xl border flex items-center justify-center disabled:opacity-40 transition-all ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white hover:bg-white/5' : 'bg-white border-gray-200 shadow-sm hover:bg-gray-100'}`}>
                                                <Plus size={13} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('teacher.assignForm.priority', 'Muhimlik darajasi')}</label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[
                                                { key: 'low', label: t('teacher.assignForm.priorityLow', 'Past'), activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                                                { key: 'medium', label: t('teacher.assignForm.priorityMedium', "O'rt"), activeClass: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                                                { key: 'high', label: t('teacher.assignForm.priorityHigh', 'Yuq'), activeClass: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
                                            ].map(item => (
                                                <button key={item.key} type="button"
                                                    onClick={() => setEditModal(p => ({ ...p, priority: item.key }))}
                                                    className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${editModal.priority === item.key ? item.activeClass : (isDark ? 'border-white/5 text-gray-400 bg-[#2C2C2C]/50 hover:bg-white/5' : 'border-gray-200 text-gray-600 bg-white shadow-sm')}`}>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Note */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('teacher.assignForm.note', 'Eslatma / izoh')}</label>
                                    <textarea rows={2} value={editModal.teacherNote}
                                        onChange={e => setEditModal(p => ({ ...p, teacherNote: e.target.value }))}
                                        placeholder={t('teacher.assignForm.optional', 'Ixtiyoriy')}
                                        className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none resize-none ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 placeholder-gray-400 shadow-sm'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`flex gap-3 px-6 py-4 border-t shrink-0 ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                            <button onClick={() => { setEditModal(null); setEditTestSearch(''); setShowEditTestPicker(false); }}
                                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {t('common.cancel', 'Bekor qilish')}
                            </button>
                            <button onClick={doEditAssignment} disabled={editSaving || !editModal.tests?.length}
                                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                                {editSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('common.save', 'Saqlash')}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
