import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import {
    collection, doc, getDoc, getDocs, query, where, limit
} from 'firebase/firestore';
import {
    Users, BookOpen, NotePencil, Headphones, Trophy,
    CaretRight, WarningCircle, ArrowRight
} from '@phosphor-icons/react';
import {
    toDate, hasActiveTeacherSubscription, getTeacherSubscriptionDaysLeft
} from '../../utils/subscription';
import { collectStudentIds, chunkIds } from '../../utils/teacherResults';

/** Natija turiga mos belgi — rangsiz, faqat shakl orqali farqlanadi. */
const typeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('listening')) return Headphones;
    if (t.includes('writing')) return NotePencil;
    if (t.includes('mock')) return Trophy;
    return BookOpen;
};

export default function TeacherDashboard() {
    const { userData } = useAuth();
    const navigate = useNavigate();

    const [groups, setGroups] = useState([]);
    const [pendingWritings, setPendingWritings] = useState(0);
    const [assignedTestsCount, setAssignedTestsCount] = useState(0);
    const [recentResults, setRecentResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
            const querySnap = await getDocs(q);
            const fetchedGroups = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetchedGroups);

            if (!fetchedGroups.length) { setLoading(false); return; }

            const setIdsToFetch = new Set();
            fetchedGroups.forEach(g => {
                g.assignedTests?.forEach(test => {
                    if (test.type === 'set') {
                        setIdsToFetch.add(test.id);
                    }
                });
            });

            const testSetsMap = {};
            if (setIdsToFetch.size > 0) {
                const snaps = await Promise.all(
                    [...setIdsToFetch].map(id => getDoc(doc(db, 'testSets', id)))
                );
                snaps.forEach(d => {
                    if (d.exists()) testSetsMap[d.id] = d.data();
                });
            }

            fetchedGroups.forEach(g => {
                let realTestCount = 0;
                g.assignedTests?.forEach(test => {
                    if (test.type === 'set' && testSetsMap[test.id]) {
                        realTestCount += testSetsMap[test.id].testIds?.length || 0;
                    } else {
                        realTestCount += 1;
                    }
                });
                g.realTestCount = realTestCount;
            });

            const totalTests = fetchedGroups.reduce((acc, g) => acc + (g.realTestCount || 0), 0);
            setAssignedTestsCount(totalTests);

            const allStudentIds = collectStudentIds(fetchedGroups);

            if (allStudentIds.length > 0) {
                const allResults = [];
                for (const chunk of chunkIds(allStudentIds)) {
                    const snap = await getDocs(query(
                        collection(db, 'results'),
                        where('userId', 'in', chunk),
                        limit(200) // Increase limit as we'll sort client-side if needed
                    ));
                    allResults.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }

                // Sort by date client-side. (Ilgari bu komparator ichida
                // `const db` e'lon qilinib, firebase `db` ini soya qilardi.)
                allResults.sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));

                const pending = allResults.filter(r =>
                    (r.type === 'writing' || r.type === 'mock_full') &&
                    !(r.type === 'writing' && (r.parentResultId || r.mockKey)) &&
                    !r.teacherFeedback && !r.writingBand
                );
                setPendingWritings(pending.length);
                setRecentResults(allResults.slice(0, 6));
            } else {
                setPendingWritings(0);
                setRecentResults([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const firstName = userData?.fullName?.split(' ')[0] || 'Ustoz';
    const totalStudents = groups.reduce((acc, g) => acc + (g.studentIds?.length || 0), 0);

    const subActive = hasActiveTeacherSubscription(userData);
    const daysLeft = getTeacherSubscriptionDaysLeft(userData);
    const subNotice = !subActive
        ? { text: "Obuna faol emas — o'quvchilaringiz PRO testlarni ocholmaydi.", cta: 'Obuna olish' }
        : daysLeft <= 7
            ? { text: `Obunangiz tugashiga ${daysLeft} kun qoldi.`, cta: 'Uzaytirish' }
            : null;

    const stats = [
        { label: 'Guruhlar', value: groups.length, to: '/teacher/group-stats' },
        { label: "O'quvchilar", value: totalStudents, to: '/teacher/students' },
        { label: 'Tayinlangan testlar', value: assignedTestsCount, to: '/teacher/tests' },
        { label: 'Tekshirilmagan', value: pendingWritings, to: '/teacher/writing-review' },
    ];

    const cardCls = 'rounded-2xl border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated';
    const rowCls = 'w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-warm-surface/60 dark:hover:bg-white/5';

    return (
        <div className="font-sans text-warm-ink dark:text-warm-on-dark">

            {/* ── Sarlavha + asosiy amal ── */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-lg">
                <div>
                    <h1 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold tracking-tight">
                        Salom, {firstName}
                    </h1>
                    <p className="text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft mt-1">
                        {groups.length} guruh · {totalStudents} o'quvchi
                        {pendingWritings > 0 && ` · ${pendingWritings} ta ish tekshiruv kutmoqda`}
                    </p>
                </div>

                <button
                    onClick={() => navigate(pendingWritings > 0 ? '/teacher/writing-review' : '/teacher/create-writing')}
                    className="inline-flex items-center gap-xs px-lg py-sm rounded-full text-[14px] font-medium bg-warm-primary text-white hover:bg-warm-primary-active active:scale-[0.98] transition-all"
                >
                    {pendingWritings > 0 ? `Writinglarni tekshirish (${pendingWritings})` : 'Yangi writing yaratish'}
                    <ArrowRight size={15} weight="bold" />
                </button>
            </div>

            {/* ── Obuna ogohlantirishi (faqat kerak bo'lganda) ── */}
            {subNotice && (
                <div className="flex items-center justify-between gap-4 mb-lg px-md py-sm rounded-xl border border-warm-error/25 bg-warm-error/5">
                    <div className="flex items-center gap-xs text-[13px] text-warm-error">
                        <WarningCircle size={16} weight="fill" className="flex-shrink-0" />
                        <span>{subNotice.text}</span>
                    </div>
                    <button
                        onClick={() => navigate('/teacher/subscription')}
                        className="text-[13px] font-medium text-warm-error hover:underline whitespace-nowrap"
                    >
                        {subNotice.cta}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-7 h-7 border-2 border-warm-hairline dark:border-white/10 border-t-warm-primary rounded-full animate-spin" />
                </div>
            ) : groups.length === 0 ? (
                <div className={`${cardCls} flex flex-col items-center justify-center py-xxl gap-1 text-center`}>
                    <Users size={28} className="text-warm-muted-soft mb-2" />
                    <p className="text-warm-title-sm font-medium">Guruh tayinlanmagan</p>
                    <p className="text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft">
                        Admin sizga guruh tayinlashini kuting
                    </p>
                </div>
            ) : (
                <>
                    {/* ── Ko'rsatkichlar ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden mb-lg rounded-2xl border border-warm-hairline dark:border-white/10 bg-warm-hairline dark:bg-white/10">
                        {stats.map(s => (
                            <button
                                key={s.label}
                                onClick={() => navigate(s.to)}
                                className="px-md py-md text-left bg-white dark:bg-warm-dark-elevated transition-colors hover:bg-warm-surface/60 dark:hover:bg-white/5"
                            >
                                <p className="text-[28px] leading-none font-semibold tracking-tight">{s.value}</p>
                                <p className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft mt-2">{s.label}</p>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">

                        {/* ── So'nggi natijalar ── */}
                        <section className="lg:col-span-7">
                            <div className="flex items-center justify-between mb-sm">
                                <h2 className="text-warm-title-sm font-medium">So'nggi natijalar</h2>
                                <button
                                    onClick={() => navigate('/teacher/results')}
                                    className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark transition-colors"
                                >
                                    Barchasi
                                </button>
                            </div>

                            <div className={`${cardCls} overflow-hidden divide-y divide-warm-hairline dark:divide-white/10`}>
                                {recentResults.length === 0 ? (
                                    <p className="px-5 py-8 text-center text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft">
                                        Hali natija yo'q
                                    </p>
                                ) : recentResults.map(r => {
                                    const Icon = typeIcon(r.type);
                                    const isPending = (r.type === 'writing' || r.type === 'mock_full')
                                        && !r.teacherFeedback && !r.writingBand;
                                    return (
                                        <button key={r.id} onClick={() => navigate('/teacher/results')} className={rowCls}>
                                            <div className="flex items-center gap-sm min-w-0">
                                                <Icon size={16} className="text-warm-muted-soft flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[14px] font-medium truncate">
                                                        {r.userName || "Noma'lum"}
                                                    </p>
                                                    <p className="text-[12px] text-warm-muted dark:text-warm-on-dark-soft truncate">
                                                        {r.testTitle || 'Test'}
                                                        {toDate(r.date) && ` · ${toDate(r.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}`}
                                                    </p>
                                                </div>
                                            </div>
                                            {isPending ? (
                                                <span className="text-[12px] text-warm-warning whitespace-nowrap">Kutmoqda</span>
                                            ) : (
                                                <span className="text-[15px] font-semibold tabular-nums">
                                                    {r.bandScore || r.writingBand || r.score || '—'}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ── Guruhlar ── */}
                        <section className="lg:col-span-5">
                            <div className="flex items-center justify-between mb-sm">
                                <h2 className="text-warm-title-sm font-medium">Guruhlarim</h2>
                                <button
                                    onClick={() => navigate('/teacher/students')}
                                    className="text-[13px] text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark transition-colors"
                                >
                                    Boshqarish
                                </button>
                            </div>

                            <div className={`${cardCls} overflow-hidden divide-y divide-warm-hairline dark:divide-white/10`}>
                                {groups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => navigate('/teacher/group-stats')}
                                        className={rowCls}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-medium truncate">{group.name}</p>
                                            <p className="text-[12px] text-warm-muted dark:text-warm-on-dark-soft">
                                                {group.studentIds?.length || 0} o'quvchi · {group.realTestCount || 0} test
                                            </p>
                                        </div>
                                        <CaretRight size={14} className="text-warm-muted-soft flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </section>

                    </div>
                </>
            )}
        </div>
    );
}
