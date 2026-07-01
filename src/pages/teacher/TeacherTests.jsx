import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import { deriveQuestionTypesForCard } from '../../utils/TestUtils';
import { doc, getDoc, getDocs, query, where, collection, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Plus,
  Trash,
  MagnifyingGlass as SearchIcon,
  CaretDown,
  X,
  Users,
  Eye,
  Info,
  Minus,
  Warning,
  Flame,
  ShieldWarning,
  NotePencil,
  Headphones,
  Trophy,
  ArrowsCounterClockwise,
  CheckSquare,
  Square,
  Timer,
  ListChecks,
  Lightning,
  DownloadSimple,
  BellRinging,
  PencilSimple,
  ArrowsDownUp,
  FunnelSimple,
} from '@phosphor-icons/react';

// SVG ring progress chart
const RingChart = ({ pct, isDark }) => {
    const r = 17;
    const circ = 2 * Math.PI * r;
    const color = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
    return (
        <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
            <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="22" cy="22" r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={5} />
                <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth={5}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - pct / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            </svg>
            <span className="relative text-[9px] font-black leading-none" style={{ color }}>{pct}%</span>
        </div>
    );
};

// Deadline countdown badge
const DeadlineCountdown = ({ deadline, isDark }) => {
    if (!deadline) return <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cheksiz muddat</span>;
    const now = new Date();
    const dl = new Date(deadline);
    const diff = dl - now;
    if (diff < 0) return <span className="text-rose-500 font-bold">Muddati o'tgan</span>;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const color = days === 0 ? 'text-rose-500' : days <= 2 ? 'text-amber-500' : (isDark ? 'text-gray-300' : 'text-gray-700');
    if (days > 0) return <span className={`font-bold ${color}`}>{days}k {hours}s qoldi</span>;
    if (hours > 0) return <span className="font-bold text-rose-500">{hours}s {mins}d qoldi</span>;
    return <span className="font-bold text-rose-600">{mins} daqiqa qoldi!</span>;
};

const Q_TYPE_LABELS = {
    mcq: 'MCQ', multiple_choice: 'MCQ', gap_fill: 'Gap Fill',
    notes_completion: 'Notes', summary_completion: 'Summary',
    table_completion: 'Table', flow_chart_completion: 'Flow Chart',
    map_labeling: 'Map', matching: 'Matching',
    true_false_not_given: 'T/F/NG', true_false: 'T/F/NG', tfng: 'T/F/NG',
    yes_no_not_given: 'Y/N/NG', yes_no: 'Y/N/NG', ynng: 'Y/N/NG',
    short_answer: 'Short Ans', sentence_completion: 'Sentence',
    diagram_labeling: 'Diagram', heading_matching: 'Headings',
    paragraph_matching: 'Para Match',
};

const formatQType = (t) => Q_TYPE_LABELS[t?.toLowerCase?.()] ?? t;

/** Returns array of { label, qTypes } for reading passages */
const getReadingPassages = (test) => {
    if (!test) return [];
    const raw = test.passages;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.map((p, i) => ({
        label: `Passage ${i + 1}`,
        title: p?.title ?? null,
        qTypes: Array.isArray(p?.qTypes) ? p.qTypes : [],
        qCount: p?.questions?.length ?? p?.questionCount ?? null,
    }));
};

/** Returns array of { label, qTypes } for listening parts */
const getListeningParts = (test) => {
    if (!test) return [];
    const raw = test.parts;
    if (!raw || typeof raw !== 'object') return [];
    return Object.entries(raw)
        .sort(([a], [b]) => {
            // numeric sort: part1 < part2 < part10
            const na = parseInt(a.replace(/\D/g, ''), 10);
            const nb = parseInt(b.replace(/\D/g, ''), 10);
            return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
        })
        .map(([key, part], i) => ({
            label: `Part ${i + 1}`,
            qTypes: Array.isArray(part?.qTypes) ? part.qTypes : [],
            qCount: part?.questions?.length ?? part?.questionCount ?? null,
        }));
};

const getTestIconAndColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('reading')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-blue-500/10 text-blue-500' };
    if (t.includes('listening')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-pink-500/10 text-pink-500' };
    if (t.includes('writing')) return { icon: <NotePencil size={16} weight="fill" />, colorClass: 'bg-orange-500/10 text-orange-500' };
    if (t.includes('podcast')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-indigo-500/10 text-indigo-500' };
    if (t.includes('article')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-emerald-500/10 text-emerald-500' };
    return { icon: <Trophy size={16} weight="fill" />, colorClass: 'bg-purple-500/10 text-purple-500' };
};

export default function TeacherTests() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    // State lists
    const [groups, setGroups] = useState([]);
    const [assignedTests, setAssignedTests] = useState([]);
    const [results, setResults] = useState([]);
    const [podcastAttempts, setPodcastAttempts] = useState([]);
    const [students, setStudents] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [loading, setLoading] = useState(true);

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
    const [activeMonitorFilter, setActiveMonitorFilter] = useState("all");

    // Assign form states — selectedGroupIds replaces single selectedGroupId (multi-group)
    const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const groupDropdownRef = useRef(null);
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

    // Monitor page
    const [monitorSearch, setMonitorSearch] = useState('');
    const [monitorSort, setMonitorSort] = useState({ col: null, dir: 'asc' });
    const [sendingReminder, setSendingReminder] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    // Main list filters
    const [mainSearch, setMainSearch] = useState('');
    const [mainGroupFilter, setMainGroupFilter] = useState('all');
    const [mainStatusFilter, setMainStatusFilter] = useState('all');

    // Edit assignment modal
    const [editModal, setEditModal] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editTestSearch, setEditTestSearch] = useState('');
    const [showEditTestPicker, setShowEditTestPicker] = useState(false);

    const getPriorityBadge = (priority) => {
        const p = (priority || 'medium').toLowerCase();
        switch (p) {
            case 'high':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20">
                        Yuqori
                    </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/20">
                        Past
                    </span>
                );
            case 'medium':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20">
                        O'rtacha
                    </span>
                );
        }
    };

    const groupedAssignments = useMemo(() => {
        const groupsMap = {};
        assignedTests.forEach(test => {
            const key = `${test.groupId}_${test.date}`;
            if (!groupsMap[key]) {
                groupsMap[key] = {
                    groupId: test.groupId,
                    groupName: test.groupName,
                    date: test.date,
                    deadline: test.deadline,
                    maxAttempts: test.maxAttempts,
                    priority: test.priority,
                    teacherNote: test.teacherNote,
                    studentIds: test.studentIds || [],
                    tests: []
                };
            }
            groupsMap[key].tests.push(test);
        });
        return Object.values(groupsMap).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [assignedTests]);

    const summaryStats = useMemo(() => {
        const total = groupedAssignments.length;
        const expired = groupedAssignments.filter(g => g.deadline && new Date(g.deadline) < new Date()).length;
        const active = total - expired;
        const totalTests = assignedTests.length;
        return { total, active, expired, totalTests };
    }, [groupedAssignments, assignedTests]);

    const filteredGroupedAssignments = useMemo(() => {
        return groupedAssignments.filter(g => {
            const matchGroup = mainGroupFilter === 'all' || g.groupId === mainGroupFilter;
            const isExpired = g.deadline && new Date(g.deadline) < new Date();
            const matchStatus = mainStatusFilter === 'all'
                || (mainStatusFilter === 'active' && !isExpired)
                || (mainStatusFilter === 'expired' && isExpired);
            const q = mainSearch.toLowerCase();
            const matchSearch = !q || g.groupName?.toLowerCase().includes(q)
                || g.tests.some(t => t.title?.toLowerCase().includes(q));
            return matchGroup && matchStatus && matchSearch;
        });
    }, [groupedAssignments, mainGroupFilter, mainStatusFilter, mainSearch]);

    useEffect(() => {
        if (userData) {
            fetchData();
        }
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
            const querySnap = await getDocs(q);
            const fetchedGroups = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetchedGroups);

            if (!fetchedGroups.length) {
                setLoading(false);
                return;
            }

            const groupIds = fetchedGroups.map(g => g.id);

            // 2. Fetch all student profiles in these groups
            const usersQuery = query(collection(db, "users"), where("groupId", "in", groupIds));
            const usersSnap = await getDocs(usersQuery);
            const studentsList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(studentsList);

            // Get unique student IDs for results fetch
            const studentIdsArray = studentsList.map(s => s.id);

            // 3. Fetch student results and podcast attempts (chunked to bypass 10-in Firestore limit)
            const resultsList = [];
            const podcastAttemptsList = [];
            if (studentIdsArray.length > 0) {
                const chunks = [];
                for (let i = 0; i < studentIdsArray.length; i += 10) {
                    chunks.push(studentIdsArray.slice(i, i + 10));
                }
                for (const chunk of chunks) {
                    const q = query(collection(db, 'results'), where('userId', 'in', chunk));
                    const snap = await getDocs(q);
                    snap.docs.forEach(docSnap => {
                        resultsList.push({ id: docSnap.id, ...docSnap.data() });
                    });

                    try {
                        const qP = query(collection(db, 'podcastAttempts'), where('userId', 'in', chunk));
                        const snapP = await getDocs(qP);
                        snapP.docs.forEach(docSnap => {
                            podcastAttemptsList.push({ id: docSnap.id, ...docSnap.data() });
                        });
                    } catch (pErr) {
                        console.warn("Could not fetch podcast attempts for chunk:", pErr);
                    }
                }
            }
            setResults(resultsList);
            setPodcastAttempts(podcastAttemptsList);

            // 4. Gather assigned tests with group details
            const testList = [];
            fetchedGroups.forEach(g => {
                const assignments = g.assignedTests || [];
                assignments.forEach(assign => {
                    testList.push({
                        ...assign,
                        groupId: g.id,
                        groupName: g.name,
                        studentIds: g.studentIds || []
                    });
                });
            });
            // Sort by assigned date descending if date exists
            testList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            setAssignedTests(testList);

            // 5. Fetch available tests metadata, podcasts, and articles for assignment
            const [testsSnap, podcastsSnap, articlesSnap] = await Promise.all([
                getDocs(collection(db, 'tests_metadata')),
                getDocs(query(collection(db, 'podcasts'), where('status', '==', 'published'))),
                getDocs(collection(db, 'articles'))
            ]);

            const testsList = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const podcastsList = podcastsSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'podcast' }));
            const articlesList = articlesSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'article' }));

            setAvailableTests([...testsList, ...podcastsList, ...articlesList]);

        } catch (e) {
            console.error("Error fetching data in TeacherTests:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignTest = async (e) => {
        e.preventDefault();
        if (selectedGroupIds.size === 0) return showToast("Iltimos, kamida bitta guruhni tanlang!", 'error');
        if (selectedTests.length === 0) return showToast("Iltimos, kamida bitta vazifani tanlang!", 'error');

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
            const newTestEntries = newAssignments.map(a => ({ id: a.id, title: a.title, type: a.type }));
            const feedContent = newTestEntries.length === 1
                ? newTestEntries[0].title
                : `Ustozingiz sizga ${newTestEntries.length} ta yangi vazifa tayinladi`;

            const allGroupIds = [...selectedGroupIds];

            await Promise.all(allGroupIds.map(gid =>
                updateDoc(doc(db, 'groups', gid), { assignedTests: arrayUnion(...newAssignments) })
            ));

            // Create a fresh feed post for each group (no merging with old posts)
            await Promise.all(allGroupIds.map(async gid => {
                try {
                    await addDoc(collection(db, 'feed_posts'), {
                        type: 'teacher_test',
                        title: 'Sizning ustozingiz vazifa tayinladi',
                        content: feedContent,
                        groupId: gid, deadline: deadlineVal,
                        maxAttempts: Number(maxAttempts) || 1,
                        priority, teacherNote,
                        teacherId: userData.uid,
                        teacherName: userData.fullName || 'Ustoz',
                        likes: [], commentsCount: 0,
                        createdAt: serverTimestamp(),
                        tests: newTestEntries,
                        testId: newTestEntries[0].id,
                        testType: newTestEntries[0].type,
                        assignDate: assignDate,
                    });
                } catch (feedErr) {
                    console.error("Feed post error:", feedErr);
                }
            }));

            // Optimistic local state update
            setGroups(prev => prev.map(g => {
                if (!selectedGroupIds.has(g.id)) return g;
                return { ...g, assignedTests: [...(g.assignedTests || []), ...newAssignments] };
            }));
            const newEntries = allGroupIds.flatMap(gid => {
                const grp = groups.find(g => g.id === gid);
                return newAssignments.map(a => ({ ...a, groupId: gid, groupName: grp?.name || '', studentIds: grp?.studentIds || [] }));
            });
            setAssignedTests(prev => [...newEntries, ...prev]);

            showToast(`${newAssignments.length} ta vazifa ${allGroupIds.length} ta guruhga tayinlandi!`);
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
            setAssignedTests(prev => prev.filter(a => !(a.id === assignment.id && a.groupId === assignment.groupId && a.date === assignment.date)));

            showToast("Tayinlov muvaffaqiyatli olib tashlandi!");
        } catch (err) {
            console.error(err);
            showToast("Xatolik yuz berdi: " + err.message, 'error');
        }
    };

    const handleUnassignTest = (assignment) => {
        setConfirmDialog({
            message: `"${assignment.title}" testini guruhdan olib tashlamoqchimisiz?`,
            onConfirm: () => {
                setConfirmDialog(null);
                doUnassignTest(assignment);
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedBulk.size === 0) return;
        setConfirmDialog({
            message: `${selectedBulk.size} ta vazifani o'chirishni tasdiqlaysizmi?`,
            onConfirm: async () => {
                setConfirmDialog(null);
                for (const key of selectedBulk) {
                    const [groupId, testId, date] = key.split('__');
                    const fakeAssign = assignedTests.find(a => a.groupId === groupId && a.id === testId && a.date === date);
                    if (fakeAssign) await doUnassignTest(fakeAssign);
                }
                setSelectedBulk(new Set());
                setBulkMode(false);
                showToast(`${selectedBulk.size} ta vazifa o'chirildi!`);
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

    const toggleSelectAll = () => {
        if (selectedBulk.size === assignedTests.length) {
            setSelectedBulk(new Set());
        } else {
            const all = new Set(assignedTests.map(a => `${a.groupId}__${a.id}__${a.date}`));
            setSelectedBulk(all);
        }
    };

    const doEditAssignment = async () => {
        if (!editModal) return;
        if (!editModal.tests || editModal.tests.length === 0) {
            showToast("Kamida bitta test bo'lishi kerak!", 'error');
            return;
        }
        setEditSaving(true);
        try {
            const { groupId, date } = editModal;
            const targetGroup = groups.find(g => g.id === groupId);
            if (!targetGroup) return;

            const deadlineVal = editModal.deadline ? new Date(editModal.deadline).toISOString() : null;
            const maxAttempts = Number(editModal.maxAttempts) || 1;

            // Keep assignments from other dates unchanged
            const otherAssignments = (targetGroup.assignedTests || []).filter(a => a.date !== date);

            // Rebuild this date-group's assignments from editModal.tests
            const updatedGroupAssignments = editModal.tests.map(t => ({
                id: t.id,
                title: t.title,
                type: t.type,
                ...(t.selectedParts ? { selectedParts: t.selectedParts } : {}),
                date,
                deadline: deadlineVal,
                maxAttempts,
                priority: editModal.priority,
                teacherNote: editModal.teacherNote,
            }));

            const finalAssignments = [...otherAssignments, ...updatedGroupAssignments];
            await updateDoc(doc(db, 'groups', groupId), { assignedTests: finalAssignments });

            setGroups(prev => prev.map(g => g.id !== groupId ? g : { ...g, assignedTests: finalAssignments }));
            // Rebuild flat assignedTests state for this group
            setAssignedTests(prev => {
                const others = prev.filter(a => !(a.groupId === groupId && a.date === date));
                const group = groups.find(g => g.id === groupId);
                const newEntries = updatedGroupAssignments.map(a => ({
                    ...a,
                    groupId,
                    groupName: group?.name || editModal.groupName || '',
                    studentIds: group?.studentIds || [],
                }));
                return [...newEntries, ...others];
            });
            setEditModal(null);
            setEditTestSearch('');
            setShowEditTestPicker(false);
            showToast('Tayinlov muvaffaqiyatli yangilandi!');
        } catch (err) {
            showToast('Xatolik: ' + err.message, 'error');
        } finally {
            setEditSaving(false);
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
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
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
            showToast(`Eslatma ${notSubmittedCount} ta o'quvchiga yuborildi!`);
        } catch (err) {
            showToast('Xatolik: ' + err.message, 'error');
        } finally {
            setSendingReminder(false);
        }
    };

    const getTypeColor = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('mock') || t.includes('full')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        if (t.includes('reading')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        if (t.includes('listening')) return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
        if (t.includes('writing')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        if (t.includes('podcast')) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
        if (t.includes('article')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    // Filter available tests for assignment modal
    const filteredAvailableTests = availableTests.filter(t => {
        const matchesQuery = t.title?.toLowerCase().includes(searchTestQuery.toLowerCase());
        const tLow = (t.type || '').toLowerCase();
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

    // Helpers for multi-group dropdown
    const selectedGroupNames = groups.filter(g => selectedGroupIds.has(g.id)).map(g => g.name);
    const toggleGroupId = (gid) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(gid)) next.delete(gid); else next.add(gid);
            return next;
        });
    };
    const isTestPrevAssignedInAny = (testId) =>
        groups.some(g => selectedGroupIds.has(g.id) && (g.assignedTests || []).some(a => a.id === testId));

    if (showAssignPage) {
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
                            setShowAssignPage(false);
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

                <form onSubmit={handleAssignTest} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
    }

    if (showMonitorPage && monitoringTest) {
        // Map all students in this group with their submission and analysis details
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
                                setMonitoringTest(null);
                                setShowMonitorPage(false);
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
                    <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
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
                                                                if (monitoringTest.type === 'writing' || monitoringTest.type === 'mock_full') {
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

    return (
        <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-fade-in-up transition-all ${
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

            {/* Inline Confirm Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
                            <Trash size={22} className="text-rose-500" />
                        </div>
                        <p className={`text-sm font-semibold text-center mb-6 leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            {confirmDialog.message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all active:scale-95"
                            >
                                O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Test tayinlash</h1>
                    <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Guruhlaringizga Reading, Listening, Writing yoki Mock testlarini biriktiring va topshirish jarayonini kuzating.
                    </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {assignedTests.length > 0 && (
                        <button
                            onClick={() => {
                                setBulkMode(b => !b);
                                setSelectedBulk(new Set());
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm border transition-all active:scale-95 ${
                                bulkMode
                                    ? (isDark ? 'bg-rose-600/15 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
                                    : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm')
                            }`}
                        >
                            <CheckSquare size={16} weight="bold" />
                            {bulkMode ? "Bekor qilish" : "Tanlash"}
                        </button>
                    )}
                    {bulkMode && selectedBulk.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition-all"
                        >
                            <Trash size={16} weight="bold" />
                            O'chirish ({selectedBulk.size})
                        </button>
                    )}
                    <button
                        onClick={() => setShowAssignPage(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} weight="bold" />
                        Yangi test tayinlash
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            {!loading && assignedTests.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Jami tayinlov", value: summaryStats.total, color: 'text-blue-500', bg: isDark ? 'bg-blue-500/8 border-blue-500/15' : 'bg-blue-50 border-blue-100' },
                        { label: "Faol", value: summaryStats.active, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/8 border-emerald-500/15' : 'bg-emerald-50 border-emerald-100' },
                        { label: "Muddati o'tgan", value: summaryStats.expired, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/8 border-rose-500/15' : 'bg-rose-50 border-rose-100' },
                        { label: "Jami test", value: summaryStats.totalTests, color: 'text-purple-500', bg: isDark ? 'bg-purple-500/8 border-purple-500/15' : 'bg-purple-50 border-purple-100' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter Bar */}
            {!loading && assignedTests.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Guruh yoki test nomini qidiring..."
                            value={mainSearch}
                            onChange={e => setMainSearch(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-all ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'}`}
                        />
                        {mainSearch && <button onClick={() => setMainSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                    </div>
                    <select
                        value={mainGroupFilter}
                        onChange={e => setMainGroupFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}
                    >
                        <option value="all">Barcha guruhlar</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select
                        value={mainStatusFilter}
                        onChange={e => setMainStatusFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}
                    >
                        <option value="all">Barcha statuslar</option>
                        <option value="active">Faol</option>
                        <option value="expired">Muddati o'tgan</option>
                    </select>
                    {bulkMode && (
                        <button
                            onClick={toggleSelectAll}
                            className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
                        >
                            {selectedBulk.size === assignedTests.length ? 'Bekor' : 'Hammasini tanlash'}
                        </button>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-t-transparent border-blue-650 rounded-full animate-spin" />
                </div>
            ) : assignedTests.length === 0 ? (
                <div className={`rounded-3xl border p-16 text-center ${isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-150 shadow-sm'}`}>
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-400 dark:text-zinc-500 opacity-40" />
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Hozircha hech qanday test tayinlanmagan</p>
                    <p className="text-sm mt-1.5 text-gray-400 dark:text-zinc-500">Yangi test biriktirish uchun yuqoridagi tugmani bosing.</p>
                </div>
            ) : filteredGroupedAssignments.length === 0 ? (
                <div className={`rounded-3xl border p-12 text-center ${isDark ? 'bg-[#2C2C2C]/30 border-white/5' : 'bg-white border-gray-150 shadow-sm'}`}>
                    <FunnelSimple size={36} className="mx-auto mb-3 text-gray-400 opacity-40" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Filtr bo'yicha tayinlov topilmadi</p>
                    <button onClick={() => { setMainSearch(''); setMainGroupFilter('all'); setMainStatusFilter('all'); }} className="mt-3 text-xs text-blue-500 font-semibold hover:underline">Filtrni tozalash</button>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {filteredGroupedAssignments.map((groupAssign, i) => {
                        const isExpired = groupAssign.deadline && new Date(groupAssign.deadline) < new Date();
                        const priorityBadge = getPriorityBadge(groupAssign.priority);

                        return (
                            <div
                                key={`${groupAssign.groupId}-${groupAssign.date}-${i}`}
                                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                                    isDark
                                        ? 'bg-[#2C2C2C]/50 border-white/5 hover:border-white/10'
                                        : 'bg-white border-gray-105 shadow-sm hover:shadow-md'
                                }`}
                                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex justify-between items-center gap-2 mb-4 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                                isDark ? 'bg-blue-950/45 text-blue-400 border-blue-900/30' : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                                {groupAssign.groupName}
                                            </span>
                                            {priorityBadge}
                                            {isExpired && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">Muddati o'tgan</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                                                {new Date(groupAssign.date).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {!bulkMode && (
                                                <button
                                                    onClick={() => {
                                                        setEditTestSearch('');
                                                        setShowEditTestPicker(false);
                                                        setEditModal({
                                                            groupId: groupAssign.groupId,
                                                            date: groupAssign.date,
                                                            tests: groupAssign.tests.map(t => ({ id: t.id, title: t.title, type: t.type, ...(t.selectedParts ? { selectedParts: t.selectedParts } : {}) })),
                                                            deadline: groupAssign.deadline ? new Date(groupAssign.deadline).toISOString().slice(0, 16) : '',
                                                            maxAttempts: String(groupAssign.maxAttempts || 1),
                                                            priority: groupAssign.priority || 'medium',
                                                            teacherNote: groupAssign.teacherNote || '',
                                                            groupName: groupAssign.groupName,
                                                        });
                                                    }}
                                                    className={`p-1.5 rounded-lg border transition-all hover:text-blue-500 hover:border-blue-500/30 ${isDark ? 'border-white/10 text-gray-500 hover:bg-blue-500/10' : 'border-gray-200 text-gray-400 hover:bg-blue-50'}`}
                                                    title="Tahrirlash"
                                                >
                                                    <PencilSimple size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Deadline Countdown + Max Attempts */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-4 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/30 border border-gray-100 dark:border-white/5 text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Timer size={15} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                            <DeadlineCountdown deadline={groupAssign.deadline} isDark={isDark} />
                                            {groupAssign.deadline && !isExpired && (
                                                <span className="text-[10px] text-gray-400 truncate">
                                                    ({new Date(groupAssign.deadline).toLocaleDateString('uz-UZ')})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0 sm:justify-end">
                                            <Info size={15} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                            <span>Urinishlar: <span className={isDark ? 'text-gray-250 font-bold' : 'text-gray-800 font-bold'}>{groupAssign.maxAttempts} marta</span></span>
                                        </div>
                                    </div>

                                    {/* Teacher Instructions */}
                                    {groupAssign.teacherNote && (
                                        <div className="mb-5 p-4 rounded-2xl border border-indigo-150/10 dark:border-indigo-900/10 bg-indigo-50/5 dark:bg-indigo-950/5 text-xs text-gray-500 dark:text-zinc-400 flex items-start gap-2.5 relative overflow-hidden text-left">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-2xl" />
                                            <div className="space-y-1">
                                                <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">Eslatma:</span>
                                                <p className="italic leading-relaxed whitespace-pre-wrap">{groupAssign.teacherNote}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Test list */}
                                    <div className="space-y-3 mt-4">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block text-left">
                                            Tayinlangan testlar ({groupAssign.tests.length}):
                                        </span>
                                        <div className="space-y-2.5">
                                            {groupAssign.tests.map((test, idx) => {
                                                const typeColor = getTypeColor(test.type);
                                                const bulkKey = `${groupAssign.groupId}__${test.id}__${test.date}`;
                                                const isBulkSelected = selectedBulk.has(bulkKey);
                                                const groupStudentIds = groupAssign.studentIds || [];
                                                let submittedCount = 0;
                                                if (test.type === 'podcast') {
                                                    submittedCount = students.filter(s => groupStudentIds.includes(s.id))
                                                        .filter(s => !!podcastAttempts.find(a => a.userId === s.id && a.podcastId === test.id)?.completedAt).length;
                                                } else if (test.type === 'article') {
                                                    submittedCount = students.filter(s => groupStudentIds.includes(s.id))
                                                        .filter(s => s.awardedItems?.includes(test.id)).length;
                                                } else {
                                                    const grpResults = results.filter(r => String(r.testId).trim() === String(test.id).trim() && groupStudentIds.includes(r.userId));
                                                    submittedCount = new Set(grpResults.map(r => r.userId)).size;
                                                }
                                                const totalStudents = groupStudentIds.length;
                                                const pct = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

                                                return (
                                                    <div
                                                        key={`${test.id}-${idx}`}
                                                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all text-left ${
                                                            isBulkSelected
                                                                ? (isDark ? 'bg-rose-600/10 border-rose-500/40' : 'bg-rose-50 border-rose-200')
                                                                : (isDark ? 'bg-zinc-900/10 border-white/5 hover:border-white/10' : 'bg-gray-50/10 border-gray-150 hover:border-gray-200')
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            {bulkMode && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleBulkItem(groupAssign.groupId, test.id, test.date)}
                                                                    className="shrink-0"
                                                                >
                                                                    {isBulkSelected
                                                                        ? <CheckSquare size={18} weight="fill" className="text-rose-500" />
                                                                        : <Square size={18} className="text-gray-400" />}
                                                                </button>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mb-1 ${typeColor}`}>
                                                                    {test.type === 'mock_full' ? 'Mock Exam' : test.type}
                                                                </span>
                                                                <h4 className={`font-bold text-sm leading-snug ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                                                                    {test.title}
                                                                </h4>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                                                            <div className="flex items-center gap-2">
                                                                <RingChart pct={pct} isDark={isDark} />
                                                                <div className="text-[10px] font-bold leading-tight">
                                                                    <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>{submittedCount}/{totalStudents}</div>
                                                                    <div className="text-gray-400">topshirdi</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveMonitorFilter("all");
                                                                        setMonitorSearch('');
                                                                        setMonitorSort({ col: null, dir: 'asc' });
                                                                        setMonitoringTest({ ...test, groupId: groupAssign.groupId, groupName: groupAssign.groupName });
                                                                        setShowMonitorPage(true);
                                                                    }}
                                                                    className={`px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 border transition-all active:scale-[0.98] ${
                                                                        isDark ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/25' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100 shadow-sm'
                                                                    }`}
                                                                >
                                                                    <Eye size={12} weight="bold" />
                                                                    Kuzatish
                                                                </button>
                                                                {!bulkMode && (
                                                                    <button
                                                                        onClick={() => handleUnassignTest(test)}
                                                                        className={`p-2 rounded-xl border hover:text-rose-500 hover:bg-rose-500/10 transition-all ${isDark ? 'border-white/5 text-gray-400' : 'border-gray-200 text-gray-500 bg-gray-50'}`}
                                                                        title="O'chirish"
                                                                    >
                                                                        <Trash size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}

            {/* Edit Assignment Modal */}
            {editModal && (() => {
                const editFilteredTests = availableTests.filter(t => {
                    const q = editTestSearch.toLowerCase();
                    return !q || t.title?.toLowerCase().includes(q) || (t.type || '').toLowerCase().includes(q);
                }).slice(0, 30);

                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
                    <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                            <div>
                                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tayinlovni tahrirlash</h3>
                                <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{editModal.groupName}</p>
                            </div>
                            <button onClick={() => { setEditModal(null); setEditTestSearch(''); setShowEditTestPicker(false); }} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
                        </div>

                        {/* Scrollable body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 custom-scrollbar">

                            {/* ── TESTS SECTION ── */}
                            <div className="space-y-2">
                                <label className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <span className="flex items-center gap-1.5"><ListChecks size={13} /> Tayinlangan testlar</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{editModal.tests?.length || 0} ta</span>
                                </label>

                                {/* Current tests list */}
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-gray-50/50'}`}>
                                    {(editModal.tests || []).map((t, idx) => {
                                        const { icon, colorClass } = getTestIconAndColor(t.type);
                                        const canRemove = (editModal.tests?.length || 0) > 1;
                                        return (
                                            <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 ${idx > 0 ? (isDark ? 'border-t border-white/5' : 'border-t border-gray-100') : ''}`}>
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>{icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-xs font-semibold truncate block ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{t.title}</span>
                                                    {t.selectedParts && (
                                                        <span className="text-[9px] text-pink-500 font-bold">{t.selectedParts.map(n => `Part ${n}`).join(', ')}</span>
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${colorClass}`}>
                                                    {(t.type === 'mock_full' ? 'Mock' : (t.type || '').slice(0, 4)).toUpperCase()}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={!canRemove}
                                                    title={canRemove ? "Olib tashlash" : "Kamida 1 ta test bo'lishi kerak"}
                                                    onClick={() => setEditModal(p => ({ ...p, tests: p.tests.filter(x => x.id !== t.id) }))}
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
                                        <Plus size={14} weight="bold" /> Test qo'shish
                                    </button>
                                ) : (
                                    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10 bg-[#252525]' : 'border-gray-200 bg-white shadow-sm'}`}>
                                        {/* Search */}
                                        <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                            <SearchIcon size={14} className="text-gray-400 shrink-0" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Test nomini yozing..."
                                                value={editTestSearch}
                                                onChange={e => setEditTestSearch(e.target.value)}
                                                className={`flex-1 text-xs font-semibold outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                                            />
                                            <button type="button" onClick={() => { setShowEditTestPicker(false); setEditTestSearch(''); }} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={13} /></button>
                                        </div>
                                        {/* Results */}
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                            {editFilteredTests.length > 0 ? editFilteredTests.map(t => {
                                                const { icon, colorClass } = getTestIconAndColor(t.type);
                                                const alreadyIn = (editModal.tests || []).some(x => x.id === t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        disabled={alreadyIn}
                                                        onClick={() => {
                                                            if (alreadyIn) return;
                                                            setEditModal(p => ({
                                                                ...p,
                                                                tests: [...(p.tests || []), { id: t.id, title: t.title, type: t.type }]
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
                                                        <span className={`flex-1 text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{t.title}</span>
                                                        {alreadyIn
                                                            ? <CheckCircle size={14} weight="fill" className="text-emerald-500 shrink-0" />
                                                            : <Plus size={13} className={`shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        }
                                                    </button>
                                                );
                                            }) : (
                                                <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-semibold">Test topilmadi</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── SETTINGS ── */}
                            <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-gray-50/40'}`}>
                                {/* Deadline */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Clock size={13} /> Deadline</label>
                                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                                        {[{ label: '+1 kun', days: 1 }, { label: '+3 kun', days: 3 }, { label: '+1 hafta', days: 7 }].map(({ label, days }) => (
                                            <button key={days} type="button"
                                                onClick={() => { const d = new Date(); d.setDate(d.getDate() + days); d.setSeconds(0, 0); setEditModal(p => ({ ...p, deadline: d.toISOString().slice(0, 16) })); }}
                                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-blue-500/10 hover:text-blue-400' : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 shadow-sm'}`}
                                            >{label}</button>
                                        ))}
                                        {editModal.deadline && (
                                            <button type="button" onClick={() => setEditModal(p => ({ ...p, deadline: '' }))}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all">✕ Tozalash</button>
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
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><ArrowsCounterClockwise size={13} /> Maks. urinishlar</label>
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
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Muhimlik darajasi</label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[
                                                { key: 'low', label: 'Past', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                                                { key: 'medium', label: "O'rt", activeClass: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                                                { key: 'high', label: 'Yuq', activeClass: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
                                            ].map(item => (
                                                <button key={item.key} type="button"
                                                    onClick={() => setEditModal(p => ({ ...p, priority: item.key }))}
                                                    className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${editModal.priority === item.key ? item.activeClass : (isDark ? 'border-white/5 text-gray-450 bg-[#2C2C2C]/50 hover:bg-white/5' : 'border-gray-200 text-gray-600 bg-white shadow-sm')}`}>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Note */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Eslatma / izoh</label>
                                    <textarea rows={2} value={editModal.teacherNote}
                                        onChange={e => setEditModal(p => ({ ...p, teacherNote: e.target.value }))}
                                        className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none resize-none ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 placeholder-gray-400 shadow-sm'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`flex gap-3 px-6 py-4 border-t shrink-0 ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                            <button onClick={() => { setEditModal(null); setEditTestSearch(''); setShowEditTestPicker(false); }}
                                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                Bekor qilish
                            </button>
                            <button onClick={doEditAssignment} disabled={editSaving || !editModal.tests?.length}
                                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                                {editSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
