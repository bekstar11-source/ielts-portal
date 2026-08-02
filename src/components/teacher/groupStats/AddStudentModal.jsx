/**
 * Guruhga o'quvchi qo'shish oynasi.
 *
 * Qidiruv indekslangan prefiks so'rovlari orqali (`useStudentSearch`) —
 * butun `users` kolleksiyasi yuklanmaydi. Tarif limiti oynaning o'zida
 * ko'rinib turadi, shuning uchun "limit to'ldi" xabari kutilmagan bo'lmaydi.
 */

import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, UserPlus, Check } from '@phosphor-icons/react';
import { useStudentSearch } from '../../../hooks/useStudentSearch';
import { Avatar, ProgressBar } from './primitives';
import Modal from './Modal';

// Har renderda yangi massiv `useStudentSearch` ichidagi memo'ni bekor
// qilmasligi uchun — barqaror bo'sh ro'yxat.
const NO_LOCAL_STUDENTS = [];

export default function AddStudentModal({ open, onClose, groupName, memberIds, usage, onAdd }) {
    const [term, setTerm] = useState('');
    const [addingId, setAddingId] = useState(null);
    const { combinedStudents: found, isSearchingDb: searching } = useStudentSearch(
        NO_LOCAL_STUDENTS,
        term
    );

    // Oyna har ochilganda toza qidiruvdan boshlanadi.
    useEffect(() => {
        if (open) setTerm('');
    }, [open]);

    const handleAdd = async (studentId) => {
        setAddingId(studentId);
        try {
            await onAdd(studentId);
        } finally {
            setAddingId(null);
        }
    };

    const limitReached = usage.max > 0 && usage.used >= usage.max;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="O'quvchi qo'shish"
            description={`"${groupName}" guruhiga qo'shish uchun ism, email yoki telefon bo'yicha qidiring.`}
            maxWidth="max-w-lg"
        >
            {usage.max > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">Tarif limiti</span>
                        <span
                            className={`tabular-nums font-medium ${
                                limitReached
                                    ? 'text-rose-500'
                                    : 'text-gray-700 dark:text-gray-200'
                            }`}
                        >
                            {usage.used} / {usage.max}
                        </span>
                    </div>
                    <ProgressBar value={(usage.used / usage.max) * 100} />
                </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] focus-within:border-emerald-500/60 transition-colors">
                <MagnifyingGlass size={15} className="text-gray-400 flex-shrink-0" />
                <input
                    autoFocus
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Ism, email yoki telefon..."
                    className="bg-transparent outline-none border-none text-xs w-full text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                {searching && (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
            </div>

            <div className="mt-3 min-h-[80px]">
                {term.trim().length < 2 ? (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 py-6 text-center">
                        Qidirish uchun kamida 2 ta belgi kiriting
                    </p>
                ) : found.length === 0 && !searching ? (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 py-6 text-center">
                        Hech kim topilmadi
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-white/[0.05] max-h-64 overflow-y-auto custom-scrollbar">
                        {found.map((student) => {
                            const inGroup = memberIds.includes(student.id);
                            return (
                                <div key={student.id} className="flex items-center gap-3 py-2.5">
                                    <Avatar name={student.fullName || student.email} size={30} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                            {student.fullName || 'Nomsiz'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                            {student.email}
                                        </p>
                                    </div>
                                    {inGroup ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                            <Check size={11} weight="bold" /> Guruhda
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={addingId === student.id || limitReached}
                                            onClick={() => handleAdd(student.id)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                        >
                                            <UserPlus size={12} />
                                            {addingId === student.id ? '...' : "Qo'shish"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
