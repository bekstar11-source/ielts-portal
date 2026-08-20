/**
 * Tayinlov sozlamalari — muddat, urinishlar, muhimlik, izoh.
 *
 * Bu to'rtta maydon ilgari TO'RT JOYDA qo'lda takrorlangan edi: tayinlash
 * formasi, nusxalash oynasi, tahrirlash oynasi va "Writing yaratish"
 * sahifasi. Ular nafaqat takrorlanardi, balki bir-biriga o'xshamasdi ham —
 * bir joyda muhimlik rangli tugmalar, boshqasida qora-oq, uchinchisida esa
 * oddiy `<select>`; muddat uchun tez tanlash tugmalari qayerdadir bor,
 * qayerdadir yo'q edi.
 *
 * Endi ular bitta komponentda va bitta ko'rinishda.
 */

import React from 'react';
import { Clock, Minus, Plus, Warning } from '@phosphor-icons/react';
import { useTranslation } from '../../../context/LanguageContext';
import { toDateTimeLocalValue } from '../../../utils/teacherResults';

const NOTE_MAX = 300;

const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS = 10;

/** Muddatgacha qolgan vaqt — o'tib ketganini ham aytadi. */
function describeDeadline(value, t) {
    if (!value) return null;
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return null;

    const diff = ts - Date.now();
    if (diff <= 0) return { text: t('teacher.tests.deadlineCountdown.expired'), isPast: true };

    const mins = Math.round(diff / 60000);
    if (mins < 60) return { text: t('teacher.tests.deadlineCountdown.minsLeft', { n: mins }), isPast: false };

    const hours = Math.round(mins / 60);
    if (hours < 48) return { text: t('teacher.tests.deadlineCountdown.hoursLeft', { n: hours }), isPast: false };

    return { text: t('teacher.tests.deadlineCountdown.daysLeft', { n: Math.round(hours / 24) }), isPast: false };
}

// Kalitlar to'liq yozilgan — `t('...' + key)` ko'rinishida bo'lsa
// `npm run check:i18n` ularni tekshira olmasdi.
const QUICK_DEADLINES = [
    { days: 1, labelKey: 'teacher.assignmentSettings.plus1Day' },
    { days: 3, labelKey: 'teacher.assignmentSettings.plus3Days' },
    { days: 7, labelKey: 'teacher.assignmentSettings.plus1Week' },
];

const PRIORITIES = [
    { key: 'low', labelKey: 'teacher.assignmentSettings.priorityLow' },
    { key: 'medium', labelKey: 'teacher.assignmentSettings.priorityMedium' },
    { key: 'high', labelKey: 'teacher.assignmentSettings.priorityHigh' },
];

/**
 * @param {object}   value     { deadline, maxAttempts, priority, teacherNote }
 * @param {function} onChange  qisman yangilanish: `onChange({ priority: 'high' })`
 */
export default function AssignmentSettings({ value, onChange, isDark = false, className = '' }) {
    const { t } = useTranslation();
    const { deadline = '', maxAttempts = '1', priority = 'medium', teacherNote = '' } = value || {};

    const label = `text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`;
    const muted = isDark ? 'text-gray-500' : 'text-gray-500';
    const field = isDark
        ? 'bg-transparent border-white/10 text-white placeholder-gray-600 focus:border-white/25'
        : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400';
    const chip = `h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
        isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
    }`;

    const hint = describeDeadline(deadline, t);
    const attempts = Number(maxAttempts) || MIN_ATTEMPTS;

    const setAttempts = (next) => onChange({
        maxAttempts: String(Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, next))),
    });

    return (
        <div className={`space-y-5 ${className}`}>
            {/* Muddat */}
            <div className="space-y-2">
                <label className={label}>{t('teacher.assignmentSettings.deadline')}</label>

                <div className="flex flex-wrap gap-1.5">
                    {QUICK_DEADLINES.map(({ days, labelKey }) => (
                        <button
                            key={days}
                            type="button"
                            onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + days);
                                d.setSeconds(0, 0);
                                onChange({ deadline: toDateTimeLocalValue(d) });
                            }}
                            className={chip}
                        >
                            {t(labelKey)}
                        </button>
                    ))}
                    {deadline && (
                        <button
                            type="button"
                            onClick={() => onChange({ deadline: '' })}
                            className={`h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                                isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {t('teacher.assignmentSettings.clear')}
                        </button>
                    )}
                </div>

                <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => onChange({ deadline: e.target.value })}
                    className={`w-full h-10 px-3 rounded-xl border text-sm outline-none transition-colors ${field}`}
                />

                {hint && (
                    <p className={`flex items-center gap-1.5 text-[13px] ${hint.isPast ? 'text-rose-500' : muted}`}>
                        {hint.isPast ? <Warning size={13} weight="fill" /> : <Clock size={13} />}
                        {hint.text}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Urinishlar */}
                <div className="space-y-2">
                    <label className={label}>{t('teacher.assignmentSettings.attempts')}</label>
                    <div className={`inline-flex items-center rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <button
                            type="button"
                            aria-label={t('teacher.assignmentSettings.attemptsDecrease')}
                            disabled={attempts <= MIN_ATTEMPTS}
                            onClick={() => setAttempts(attempts - 1)}
                            className={`w-10 h-10 flex items-center justify-center rounded-l-xl transition-colors disabled:opacity-30 ${
                                isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Minus size={14} weight="bold" />
                        </button>
                        <span className={`w-10 text-center text-sm font-medium tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {attempts}
                        </span>
                        <button
                            type="button"
                            aria-label={t('teacher.assignmentSettings.attemptsIncrease')}
                            disabled={attempts >= MAX_ATTEMPTS}
                            onClick={() => setAttempts(attempts + 1)}
                            className={`w-10 h-10 flex items-center justify-center rounded-r-xl transition-colors disabled:opacity-30 ${
                                isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Plus size={14} weight="bold" />
                        </button>
                    </div>
                </div>

                {/* Muhimlik */}
                <div className="space-y-2">
                    <label className={label}>{t('teacher.assignmentSettings.priority')}</label>
                    <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        {PRIORITIES.map(({ key, labelKey }) => {
                            const active = priority === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onChange({ priority: key })}
                                    className={`h-8 rounded-lg text-[13px] font-medium transition-colors ${
                                        active
                                            ? (isDark ? 'bg-[#1E1E1E] text-white' : 'bg-white text-gray-900 shadow-sm')
                                            : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-900')
                                    }`}
                                >
                                    {t(labelKey)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Izoh */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className={label}>{t('teacher.assignmentSettings.note')}</label>
                    {teacherNote && (
                        <span className={`text-[13px] ${muted}`}>{teacherNote.length}/{NOTE_MAX}</span>
                    )}
                </div>
                <textarea
                    rows={2}
                    value={teacherNote}
                    maxLength={NOTE_MAX}
                    onChange={(e) => onChange({ teacherNote: e.target.value })}
                    placeholder={t('teacher.assignmentSettings.notePlaceholder')}
                    className={`w-full p-3 rounded-xl border text-sm outline-none resize-none transition-colors ${field}`}
                />
            </div>
        </div>
    );
}
