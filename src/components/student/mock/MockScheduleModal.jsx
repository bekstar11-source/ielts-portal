/**
 * Imtihon sanasini tanlash oynasi.
 *
 * Muhim: o'tib ketgan kunlar tanlanmaydi va joriy oydan orqaga o'tib
 * bo'lmaydi. Ilgari kalendar istalgan o'tgan sanani qabul qilardi va
 * karta darrov "sana o'tib ketgan" holatida tug'ilardi.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { CaretLeft, CaretRight, CircleNotch } from '@phosphor-icons/react';
import MockModalShell from './MockModalShell';
import { MUTED_CLS, isSameDay, startOfDay, toDate } from './mockHelpers';

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const WEEKDAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Imtihonni ancha oldindan rejalashtirish ma'nosiz — 6 oy bilan chegaralaymiz.
const MAX_MONTHS_AHEAD = 6;

function monthLabel(date, lang) {
    return lang === 'uz'
        ? `${date.getFullYear()}-yil ${MONTHS_UZ[date.getMonth()]}`
        : date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function MockScheduleModal({ open, onClose, t, lang, mock, onConfirm, onClear, loading }) {
    const today = startOfDay(new Date());
    const existing = toDate(mock?.scheduledDate);

    const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [selected, setSelected] = useState(() => (existing && existing >= today ? existing : today));

    // Boshqa mock uchun qayta ochilganda tanlov eskisidan qolib ketmasin.
    useEffect(() => {
        if (!open) return;
        const initial = existing && startOfDay(existing) >= today ? startOfDay(existing) : today;
        setSelected(initial);
        setViewDate(new Date(initial.getFullYear(), initial.getMonth(), 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mock?.id]);

    // Oyning birinchi kuni bo'yicha chegara — hisoblash arzon, memo shart emas.
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD, 1);

    const canGoBack = viewDate > minMonth;
    const canGoForward = viewDate < maxMonth;

    const cells = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        // Hafta dushanbadan boshlanadi: yakshanba (0) → 6.
        const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const result = Array.from({ length: offset }, () => null);
        for (let day = 1; day <= daysInMonth; day += 1) {
            result.push(new Date(year, month, day));
        }
        return result;
    }, [viewDate]);

    const weekdays = lang === 'uz' ? WEEKDAYS_UZ : WEEKDAYS_EN;

    return (
        <MockModalShell
            open={open}
            onClose={onClose}
            title={t('mock.scheduleTitle')}
            closeLabel={t('mock.close')}
            maxWidth="max-w-sm"
        >
            <div className="px-6 pb-6 pt-3">
                {mock?.title && (
                    <p className={`text-[13px] truncate ${MUTED_CLS}`}>{mock.title}</p>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                        disabled={!canGoBack}
                        aria-label="◀"
                        className="p-2 rounded-lg transition-colors hover:bg-warm-surface dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <CaretLeft size={16} />
                    </button>
                    <span className="text-[14px] font-medium">{monthLabel(viewDate, lang)}</span>
                    <button
                        type="button"
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                        disabled={!canGoForward}
                        aria-label="▶"
                        className="p-2 rounded-lg transition-colors hover:bg-warm-surface dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <CaretRight size={16} />
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1">
                    {weekdays.map((day) => (
                        <div key={day} className={`text-[11px] text-center py-1.5 ${MUTED_CLS}`}>{day}</div>
                    ))}

                    {cells.map((date, index) => {
                        if (!date) return <div key={`pad-${index}`} />;
                        const isPast = date < today;
                        const isSelected = isSameDay(date, selected);
                        const isToday = isSameDay(date, today);

                        return (
                            <button
                                key={date.toISOString()}
                                type="button"
                                disabled={isPast}
                                onClick={() => setSelected(date)}
                                className={`aspect-square rounded-lg text-[13px] tabular-nums transition-colors ${
                                    isSelected
                                        ? 'bg-warm-primary text-warm-on-primary font-medium'
                                        : isPast
                                            ? 'text-warm-muted-soft/50 cursor-not-allowed'
                                            : 'hover:bg-warm-surface dark:hover:bg-white/5'
                                } ${isToday && !isSelected ? 'ring-1 ring-warm-primary/40' : ''}`}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl py-3 text-[14px] font-medium border border-warm-hairline dark:border-white/10 transition-colors hover:bg-warm-surface dark:hover:bg-white/5"
                    >
                        {t('common.back')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(selected)}
                        disabled={loading}
                        className="flex-[2] rounded-xl py-3 text-[14px] font-medium bg-warm-primary text-warm-on-primary transition-colors hover:bg-warm-primary-active disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <CircleNotch size={15} className="animate-spin" />}
                        {t('mock.confirmSchedule')}
                    </button>
                </div>

                {existing && (
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={loading}
                        className={`mt-3 w-full text-[13px] transition-colors hover:text-warm-error disabled:opacity-50 ${MUTED_CLS}`}
                    >
                        {t('mock.clearSchedule')}
                    </button>
                )}
            </div>
        </MockModalShell>
    );
}
