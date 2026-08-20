/**
 * Yangi tayinlash — ALOHIDA sahifa (`/teacher/tests/assign`).
 *
 * Ilgari bu ekran `TeacherTests` ichida `showAssignPage` holati orqali
 * ochilardi. Ya'ni URL o'zgarmasdi va shuning oqibatlari bor edi:
 *   • brauzerning "Orqaga" tugmasi ro'yxatga emas, butun sahifadan
 *     tashqariga olib chiqib ketardi;
 *   • sahifa yangilansa to'ldirilgan forma yo'qolardi;
 *   • bitta fayl 1700 qatorga o'sib ketgandi.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { getListeningParts } from '../../utils/TestUtils';
import { commitAssignments } from '../../utils/teacherAssignments';
import { useTeacherWorkspace, useTeacherCatalog } from '../../hooks/useTeacherWorkspace';
import AssignTestForm from '../../components/teacher/tests/AssignTestForm';

export default function TeacherAssignTest() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const { groups, patchGroups } = useTeacherWorkspace({ uid: userData?.uid });
    const { availableTests, catalogLoading } = useTeacherCatalog(true);

    const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
    const [searchTestQuery, setSearchTestQuery] = useState('');
    const [testTypeFilter, setTestTypeFilter] = useState('all');
    const [selectedTests, setSelectedTests] = useState([]);
    const [deadline, setDeadline] = useState('');
    const [maxAttempts, setMaxAttempts] = useState('1');
    const [teacherNote, setTeacherNote] = useState('');
    const [priority, setPriority] = useState('medium');
    const [assigning, setAssigning] = useState(false);
    // { [testId]: number[] } — yo'q bo'lsa to'liq test, [1,3] esa tanlangan qismlar
    const [selectedPartsMap, setSelectedPartsMap] = useState({});

    const backToList = () => navigate('/teacher/tests');

    const handleAssign = async (e) => {
        e.preventDefault();
        if (selectedGroupIds.size === 0) return toast.error(t('teacher.assignForm.errorSelectGroup'));
        if (selectedTests.length === 0) return toast.error(t('teacher.assignForm.errorSelectTest'));

        setAssigning(true);
        try {
            const assignDate = new Date().toISOString();
            const deadlineVal = deadline ? new Date(deadline).toISOString() : null;

            const assignments = selectedTests.map((test) => {
                const parts = getListeningParts(test);
                const isFullListening = (test.type || '').toLowerCase().includes('listening') && parts.length > 1;
                const chosen = selectedPartsMap[test.id];
                const hasPartSelection = isFullListening && chosen?.length > 0 && chosen.length < parts.length;
                return {
                    id: test.id,
                    title: test.title || 'Untitled',
                    type: test.type,
                    date: assignDate,
                    deadline: deadlineVal,
                    maxAttempts: Number(maxAttempts) || 1,
                    priority,
                    teacherNote,
                    ...(hasPartSelection ? { selectedParts: [...chosen].sort((a, b) => a - b) } : {}),
                };
            });

            const groupIds = [...selectedGroupIds];
            const nextGroups = await commitAssignments({
                groups,
                groupIds,
                assignments,
                teacher: { uid: userData.uid, name: userData.fullName },
            });
            patchGroups(nextGroups);

            toast.success(t('teacher.tests.assignSuccessToast', {
                tests: assignments.length, groups: groupIds.length,
            }));
            backToList();
        } catch (err) {
            console.error(err);
            toast.error(`${t('common.error')}: ${err.message}`);
        } finally {
            setAssigning(false);
        }
    };

    return (
        <AssignTestForm
            isDark={isDark}
            groups={groups}
            availableTests={availableTests}
            catalogLoading={catalogLoading}
            selectedGroupIds={selectedGroupIds} setSelectedGroupIds={setSelectedGroupIds}
            searchTestQuery={searchTestQuery} setSearchTestQuery={setSearchTestQuery}
            testTypeFilter={testTypeFilter} setTestTypeFilter={setTestTypeFilter}
            selectedTests={selectedTests} setSelectedTests={setSelectedTests}
            deadline={deadline} setDeadline={setDeadline}
            maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
            teacherNote={teacherNote} setTeacherNote={setTeacherNote}
            priority={priority} setPriority={setPriority}
            assigning={assigning}
            selectedPartsMap={selectedPartsMap} setSelectedPartsMap={setSelectedPartsMap}
            onBack={backToList}
            onAssign={handleAssign}
        />
    );
}
