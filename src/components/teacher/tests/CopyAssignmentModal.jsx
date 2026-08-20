/**
 * Tayinlovni boshqa guruh(lar)ga nusxalash oynasi.
 *
 * Ilgari bu `TeacherTests.jsx` ichida qo'lda yasalgan modal edi: fon, z-index
 * va yopish mantig'i o'zi yozilgan, `body` scroll qulflanmasdi, fokus esa
 * oynadan chiqib ketaverardi. Endi umumiy `Modal` qobig'ida.
 */

import React from 'react';
import { CheckSquare, CopySimple, Square } from '@phosphor-icons/react';
import { useTranslation } from '../../../context/LanguageContext';
import Modal from '../Modal';
import AssignmentSettings from './AssignmentSettings';
import { getTestTypeMeta } from './testTypeIcon';

export default function CopyAssignmentModal({ state, groups, saving, isDark, onChange, onClose, onSubmit }) {
    const { t } = useTranslation();
    if (!state) return null;

    const targetGroups = groups.filter((g) => g.id !== state.sourceGroupId);
    const selectedCount = state.targetGroupIds.size;
    const studentCount = groups
        .filter((g) => state.targetGroupIds.has(g.id))
        .reduce((sum, g) => sum + (g.studentIds?.length || 0), 0);

    const toggleTarget = (groupId) => {
        const next = new Set(state.targetGroupIds);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        onChange({ targetGroupIds: next });
    };

    const sectionLabel = `text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`;
    const listBox = `rounded-xl border divide-y ${isDark ? 'border-white/8 divide-white/5' : 'border-gray-200 divide-gray-100'}`;

    return (
        <Modal
            open
            onClose={saving ? undefined : onClose}
            maxWidth="max-w-lg"
            title={t('teacher.tests.copyModal.title')}
            description={t('teacher.tests.copyModal.sourceInfo', {
                group: state.sourceGroupName,
                count: state.tests.length,
            })}
            footer={(
                <>
                    <span className="text-[12px] text-gray-500 flex-1 truncate">
                        {selectedCount > 0
                            ? t('teacher.tests.copyModal.summaryInfo', {
                                tests: state.tests.length, groups: selectedCount, students: studentCount,
                            })
                            : t('teacher.tests.copyModal.selectGroupHint')}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={saving || selectedCount === 0}
                        className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        {saving
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><CopySimple size={15} weight="bold" /> {t('teacher.tests.copyModal.copyBtn')}</>}
                    </button>
                </>
            )}
        >
            <div className="space-y-5">
                {/* Ko'chiriladigan testlar */}
                <div className="space-y-2">
                    <p className={sectionLabel}>{t('teacher.tests.copyModal.testsToCopy')}</p>
                    <div className={listBox}>
                        {state.tests.map((item) => {
                            const meta = getTestTypeMeta(item.type);
                            return (
                                <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                    <span className={`flex-1 text-[13px] truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                                        {item.title}
                                    </span>
                                    {item.selectedParts?.length > 0 && (
                                        <span className="text-[11px] text-gray-400 shrink-0">
                                            {item.selectedParts.map((n) => `P${n}`).join(', ')}
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
                        <p className={sectionLabel}>{t('teacher.tests.copyModal.toWhichGroups')}</p>
                        {selectedCount > 0 && (
                            <span className="text-[11px] text-gray-500 tabular-nums">
                                {t('teacher.tests.copyModal.selectedCount', { count: selectedCount })}
                            </span>
                        )}
                    </div>

                    {targetGroups.length === 0 ? (
                        <p className="text-[13px] text-gray-500 py-3">
                            {t('teacher.tests.copyModal.noOtherGroups')}
                        </p>
                    ) : (
                        <div className={`${listBox} overflow-hidden`}>
                            {targetGroups.map((group) => {
                                const checked = state.targetGroupIds.has(group.id);
                                const already = state.tests.filter((item) =>
                                    (group.assignedTests || []).some((a) => a.id === item.id)
                                ).length;
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => toggleTarget(group.id)}
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
                                            {group.name}
                                        </span>
                                        {already > 0 && (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 shrink-0">
                                                {t('teacher.tests.copyModal.alreadyAssigned', { count: already })}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                                            {group.studentIds?.length || 0} {t('teacher.groupStats.studentsCount')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sozlamalar */}
                <div className="space-y-2">
                    <p className={sectionLabel}>{t('teacher.tests.copyModal.copySettings')}</p>
                    <AssignmentSettings isDark={isDark} value={state} onChange={onChange} />
                </div>
            </div>
        </Modal>
    );
}
