/**
 * Tayinlovni tahrirlash oynasi — testlar ro'yxati + umumiy sozlamalar.
 *
 * Qidiruv va "test qo'shish" panelining ochiq/yopiqligi shu yerda saqlanadi:
 * ular sof ko'rinish holati va sahifaga (`TeacherTests`) hech qanday
 * aloqasi yo'q edi.
 */

import React, { useState } from 'react';
import { CheckCircle, ListChecks, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import { useTranslation } from '../../../context/LanguageContext';
import Modal from '../Modal';
import AssignmentSettings from './AssignmentSettings';
import { getTestIconAndColor } from './testTypeIcon';

const PICKER_LIMIT = 30;

export default function EditAssignmentModal({
    state, availableTests, saving, isDark, onChange, onClose, onSave,
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);

    if (!state) return null;

    const tests = state.tests || [];
    const canRemove = tests.length > 1;

    const matches = availableTests.filter((item) => {
        const q = search.toLowerCase();
        return !q || item.title?.toLowerCase().includes(q) || (item.type || '').toLowerCase().includes(q);
    }).slice(0, PICKER_LIMIT);

    const addTest = (item) => {
        onChange({ tests: [...tests, { id: item.id, title: item.title, type: item.type }] });
        setSearch('');
    };

    return (
        <Modal
            open
            onClose={onClose}
            maxWidth="max-w-2xl"
            title={t('teacher.tests.editModal.title')}
            description={state.groupName}
            footer={(
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving || !tests.length}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                    >
                        {saving
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : t('common.save')}
                    </button>
                </>
            )}
        >
            <div className="space-y-5">
                {/* Tayinlangan testlar */}
                <div className="space-y-2">
                    <div className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="flex items-center gap-1.5">
                            <ListChecks size={13} /> {t('teacher.tests.editModal.assignedTests')}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            {t('teacher.tests.editModal.testsCount', { count: tests.length })}
                        </span>
                    </div>

                    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-gray-50/50'}`}>
                        {tests.map((item, index) => {
                            const { icon, colorClass } = getTestIconAndColor(item.type);
                            return (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 ${index > 0 ? (isDark ? 'border-t border-white/5' : 'border-t border-gray-100') : ''}`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>{icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-xs font-semibold truncate block ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                                            {item.title}
                                        </span>
                                        {item.selectedParts?.length > 0 && (
                                            <span className="text-[10px] text-gray-400">
                                                {item.selectedParts.map((n) => `P${n}`).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!canRemove}
                                        title={canRemove
                                            ? t('teacher.tests.editModal.removeTest')
                                            : t('teacher.tests.editModal.mustHaveOneTest')}
                                        onClick={() => onChange({ tests: tests.filter((x) => x.id !== item.id) })}
                                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${canRemove ? 'text-gray-400 hover:text-rose-500 hover:bg-rose-500/10' : 'opacity-25 cursor-not-allowed text-gray-400'}`}
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Test qo'shish */}
                    {!pickerOpen ? (
                        <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-xs font-semibold transition-colors ${isDark ? 'border-white/15 text-gray-400 hover:border-blue-500/50 hover:text-blue-400' : 'border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-600'}`}
                        >
                            <Plus size={14} weight="bold" /> {t('teacher.tests.editModal.addTestBtn')}
                        </button>
                    ) : (
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10 bg-[#252525]' : 'border-gray-200 bg-white'}`}>
                            <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                                <MagnifyingGlass size={14} className="text-gray-400 shrink-0" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('teacher.tests.editModal.searchTestPlaceholder')}
                                    className={`flex-1 text-xs font-semibold outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => { setPickerOpen(false); setSearch(''); }}
                                    className="text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {matches.length === 0 ? (
                                    <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-semibold">
                                        {t('teacher.tests.editModal.noTestFound')}
                                    </div>
                                ) : matches.map((item) => {
                                    const { icon, colorClass } = getTestIconAndColor(item.type);
                                    const alreadyIn = tests.some((x) => x.id === item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            disabled={alreadyIn}
                                            onClick={() => addTest(item)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-50'} ${
                                                alreadyIn
                                                    ? 'opacity-40 cursor-not-allowed'
                                                    : (isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50')
                                            }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>{icon}</div>
                                            <span className={`flex-1 text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                                                {item.title}
                                            </span>
                                            {alreadyIn
                                                ? <CheckCircle size={14} weight="fill" className="text-emerald-500 shrink-0" />
                                                : <Plus size={13} className={`shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sozlamalar */}
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-gray-50/40'}`}>
                    <AssignmentSettings isDark={isDark} value={state} onChange={onChange} />
                </div>
            </div>
        </Modal>
    );
}
