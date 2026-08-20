/**
 * Bitta tayinlovni kuzatish — ALOHIDA sahifa
 * (`/teacher/tests/monitor/:groupId/:testId?date=...`).
 *
 * Ilgari bu ham `TeacherTests` ichidagi holat edi, ya'ni monitoring ekranini
 * hamkasbga ulashib ham bo'lmasdi. Endi manzil o'zi yetarli: guruh, test va
 * tayinlangan sana — hammasi URL da.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useTeacherWorkspace } from '../../hooks/useTeacherWorkspace';
import { TeacherTestsSkeleton } from '../../components/teacher/TeacherSkeletons';
import { EmptyState, Button } from '../../components/teacher/groupStats/primitives';
import MonitorTestPage from '../../components/teacher/tests/MonitorTestPage';
import { Warning } from '@phosphor-icons/react';

/** CSV — Excel uchun BOM bilan, aks holda kirill/lotin harflari buziladi. */
function exportMonitorCSV(rows, test) {
    const table = [['Ism', 'Email/Telefon', 'Status', 'Ball/Natija', 'Sana', 'Qoidabuzarlik']];
    rows.forEach(({ student, submitted, score, submitDate, hasViolation, violationText }) => {
        table.push([
            student.fullName || '',
            student.email || student.phoneNumber || '',
            submitted ? 'Topshirdi' : 'Kutilmoqda',
            String(score),
            submitDate,
            hasViolation ? (violationText || 'Ha') : '',
        ]);
    });

    const csv = table.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${test?.title || 'natijalar'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function TeacherMonitorTest() {
    const { groupId, testId } = useParams();
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date');

    const { userData } = useAuth();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const { groups, students, results, podcastAttempts, loading, refresh } =
        useTeacherWorkspace({ uid: userData?.uid });

    const [sendingReminder, setSendingReminder] = useState(false);

    /** Tayinlov URL dagi guruh + test (+ sana) bo'yicha topiladi. */
    const monitoringTest = useMemo(() => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return null;
        const assignments = (group.assignedTests || []).filter((a) => a.id === testId);
        const assignment = assignments.find((a) => a.date === date) || assignments[0];
        if (!assignment) return null;
        return {
            ...assignment,
            groupId: group.id,
            groupName: group.name,
            studentIds: group.studentIds || [],
        };
    }, [groups, groupId, testId, date]);

    const sendReminder = async (test, notSubmittedCount) => {
        setSendingReminder(true);
        try {
            await addDoc(collection(db, 'feed_posts'), {
                type: 'teacher_reminder',
                title: 'Eslatma: Topshiriq kutilmoqda',
                content: `"${test.title}" testi hali topshirilmagan. Iltimos, imkon qadar tezroq topshiring.`,
                groupId: test.groupId,
                teacherId: userData.uid,
                teacherName: userData.fullName || 'Ustoz',
                likes: [],
                commentsCount: 0,
                createdAt: serverTimestamp(),
                testId: test.id,
            });
            toast.success(t('teacher.tests.reminderSentToast', { count: notSubmittedCount }));
        } catch (err) {
            toast.error(`${t('common.error')}: ${err.message}`);
        } finally {
            setSendingReminder(false);
        }
    };

    if (loading) return <TeacherTestsSkeleton cards={2} />;

    if (!monitoringTest) {
        return (
            <EmptyState
                icon={Warning}
                title={t('teacher.tests.monitorNotFoundTitle')}
                description={t('teacher.tests.monitorNotFoundDesc')}
                action={<Button onClick={() => navigate('/teacher/tests')}>{t('teacher.assignForm.backToTests')}</Button>}
            />
        );
    }

    return (
        <MonitorTestPage
            isDark={isDark}
            monitoringTest={monitoringTest}
            results={results}
            podcastAttempts={podcastAttempts}
            students={students}
            fetchData={refresh}
            exportMonitorCSV={exportMonitorCSV}
            sendReminder={sendReminder}
            sendingReminder={sendingReminder}
            onBack={() => navigate('/teacher/tests')}
        />
    );
}
