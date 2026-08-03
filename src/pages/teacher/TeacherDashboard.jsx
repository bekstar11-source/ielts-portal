import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import {
    Users, BookOpen, NotePencil, Headphones, Trophy,
    CaretRight, WarningCircle, ArrowRight
} from '@phosphor-icons/react';
import {
    toDate, hasActiveTeacherSubscription, getTeacherSubscriptionDaysLeft
} from '../../utils/subscription';
import {
    buildStudentStats, buildSkillAverages, buildActivitySeries,
    collectStudentsFromResults, buildAttentionList,
} from '../../utils/groupAnalytics';
import {
    CARD_CLS, ROW_CLS, SectionHeader, ActivityStrip, SkillAverages, AttentionList,
} from '../../components/teacher/dashboard/DashboardWidgets';
import { useTeacherWorkspace } from '../../hooks/useTeacherWorkspace';
import { TeacherDashboardSkeleton, RefreshBar } from '../../components/teacher/TeacherSkeletons';

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
    const { t, lang } = useTranslation();
    const navigate = useNavigate();

    // Butun o'qituvchi paneli bitta keshlangan yozuvdan oziqlanadi —
    // bu sahifada yuklangan ma'lumot Tests/GroupStats/Results da qayta
    // o'qilmaydi (va aksincha).
    const { groups, students, results, loading, isRefreshing } =
        useTeacherWorkspace({ uid: userData?.uid });

    // Ilgari bu qiymatlar `state` da saqlanardi va faqat fetch ichida
    // hisoblanardi — endi ular sof hosila.
    const assignedTestsCount = useMemo(
        () => groups.reduce((acc, g) => acc + (g.realTestCount || 0), 0),
        [groups]
    );

    const pendingWritings = useMemo(() => results.filter(r =>
        (r.type === 'writing' || r.type === 'mock_full') &&
        !(r.type === 'writing' && (r.parentResultId || r.mockKey)) &&
        !r.teacherFeedback && !r.writingBand
    ).length, [results]);

    const firstName = userData?.fullName?.split(' ')[0] || t('teacher.dashboard.roleBadge');
    const totalStudents = groups.reduce((acc, g) => acc + (g.studentIds?.length || 0), 0);

    const recentResults = useMemo(() => results.slice(0, 6), [results]);

    const insights = useMemo(() => {
        const statsMap = buildStudentStats(results);
        const roster = students.length ? students : collectStudentsFromResults(results);
        const skills = buildSkillAverages(roster, statsMap);
        const bands = roster
            .map((s) => statsMap.get(s.id)?.avgBand)
            .filter((b) => b !== null && b !== undefined);

        return {
            activity: buildActivitySeries(results, 14),
            skills,
            overallBand: bands.length
                ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10
                : null,
            attention: buildAttentionList(roster, statsMap, 4),
            activeStudents: roster.filter((s) => statsMap.get(s.id)?.isInactive === false).length,
            untestedCount: roster.filter((s) => !statsMap.has(s.id)).length,
        };
    }, [results, students]);

    const subActive = hasActiveTeacherSubscription(userData);
    const daysLeft = getTeacherSubscriptionDaysLeft(userData);
    const subNotice = !subActive
        ? { text: lang === 'en' ? "Subscription is not active — your students cannot access PRO tests." : "Obuna faol emas — o'quvchilaringiz PRO testlarni ocholmaydi.", cta: lang === 'en' ? 'Get Subscription' : 'Obuna olish' }
        : daysLeft <= 7
            ? { text: t('teacher.subscription.daysRemaining').replace('{days}', daysLeft), cta: lang === 'en' ? 'Renew' : 'Uzaytirish' }
            : null;

    const stats = [
        { label: t('teacher.dashboard.myGroups'), value: groups.length, to: '/teacher/group-stats' },
        {
            label: t('teacher.groupStats.students'),
            value: totalStudents,
            to: '/teacher/group-stats?view=students',
            hint: insights.activeStudents ? t('teacher.groupStats.statsTiles.activeCountHint').replace('{count}', insights.activeStudents) : null,
        },
        { label: t('teacher.dashboard.totalTests'), value: assignedTestsCount, to: '/teacher/tests' },
        {
            label: t('teacher.dashboard.pendingReviews'),
            value: pendingWritings,
            to: '/teacher/writing-review',
            hint: pendingWritings > 0 ? t('teacher.dashboard.pending') : null,
        },
    ];

    const cardCls = CARD_CLS;
    const rowCls = ROW_CLS;

    return (
        <div className="font-sans text-warm-ink dark:text-warm-on-dark">

            {/* Ma'lumot ekranda turganda fonda yangilanish — skeletonga
                qaytmaydi, faqat tepada ingichka chiziq yuguradi. */}
            <RefreshBar active={isRefreshing} />

            {/* ── Sarlavha + asosiy amal ── */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-lg">
                <div>
                    <h1 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold tracking-tight">
                        Welcome back, {firstName}
                    </h1>
                    <p className="text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft mt-1">
                        {groups.length} group{groups.length !== 1 ? 's' : ''} · {totalStudents} students
                        {pendingWritings > 0 && ` · ${pendingWritings} pending essays`}
                    </p>
                </div>

                <button
                    onClick={() => navigate(pendingWritings > 0 ? '/teacher/writing-review' : '/teacher/create-writing')}
                    className="inline-flex items-center gap-xs px-lg py-sm rounded-full text-[14px] font-medium bg-warm-primary text-white hover:bg-warm-primary-active active:scale-[0.98] transition-all"
                >
                    {pendingWritings > 0 ? `Review Writing (${pendingWritings})` : 'Assign Test'}
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
                <TeacherDashboardSkeleton />
            ) : groups.length === 0 ? (
                <div className={`${cardCls} flex flex-col items-center justify-center py-xxl gap-1 text-center`}>
                    <Users size={28} className="text-warm-muted-soft mb-2" />
                    <p className="text-warm-title-sm font-medium">{t('teacher.groupStats.noGroupAssignedTitle')}</p>
                    <p className="text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft">
                        {t('teacher.groupStats.noGroupAssignedDesc')}
                    </p>
                </div>
            ) : (
                <div className="animate-content-in">
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
                                <p className="text-[12px] text-warm-muted-soft dark:text-warm-on-dark-soft/70 mt-0.5 truncate">
                                    {s.hint || ' '}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* ── Kunlik faollik ── */}
                    <div className="mb-lg">
                        <ActivityStrip series={insights.activity} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">

                        {/* ── So'nggi natijalar + ko'nikmalar ── */}
                        <section className="lg:col-span-7 space-y-lg">
                            <div>
                            <SectionHeader
                                title={t('teacher.dashboard.recentResults')}
                                actionLabel={t('teacher.dashboard.viewAll')}
                                onAction={() => navigate('/teacher/results')}
                            />

                            <div className={`${cardCls} overflow-hidden divide-y divide-warm-hairline dark:divide-white/10`}>
                                {recentResults.length === 0 ? (
                                    <p className="px-5 py-8 text-center text-warm-body-sm text-warm-muted dark:text-warm-on-dark-soft">
                                        {t('teacher.dashboard.noResultsYet')}
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
                                                        {r.userName || t('teacher.dashboard.unknownStudent')}
                                                    </p>
                                                    <p className="text-[12px] text-warm-muted dark:text-warm-on-dark-soft truncate">
                                                        {r.testTitle || 'Test'}
                                                        {toDate(r.date) && ` · ${toDate(r.date).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US', { day: '2-digit', month: '2-digit' })}`}
                                                    </p>
                                                </div>
                                            </div>
                                            {isPending ? (
                                                <span className="text-[12px] text-warm-warning whitespace-nowrap">{t('teacher.dashboard.pending')}</span>
                                            ) : (
                                                <span className="text-[15px] font-semibold tabular-nums">
                                                    {r.bandScore || r.writingBand || r.score || '—'}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            </div>

                            <SkillAverages skills={insights.skills} overallBand={insights.overallBand} />
                        </section>

                        {/* ── E'tibor talab qiladi + guruhlar ── */}
                        <section className="lg:col-span-5 space-y-lg">
                            <div>
                                <SectionHeader
                                    title={t('teacher.dashboard.needsAttention')}
                                    actionLabel={insights.attention.length ? t('teacher.dashboard.viewAll') : null}
                                    onAction={() => navigate('/teacher/group-stats?view=students')}
                                />
                                <AttentionList
                                    items={insights.attention}
                                    onOpen={() => navigate('/teacher/group-stats?view=students')}
                                />
                            </div>

                            <div>
                            <SectionHeader
                                title={t('teacher.dashboard.myGroups')}
                                actionLabel={t('teacher.dashboard.manage')}
                                onAction={() => navigate('/teacher/group-stats?view=students')}
                            />

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
                                                {group.studentIds?.length || 0} {t('teacher.dashboard.studentsCount')} · {group.realTestCount || 0} {t('teacher.dashboard.testsPlural')}
                                            </p>
                                        </div>
                                        <CaretRight size={14} className="text-warm-muted-soft flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                            </div>
                        </section>

                    </div>
                </div>
            )}
        </div>
    );
}
