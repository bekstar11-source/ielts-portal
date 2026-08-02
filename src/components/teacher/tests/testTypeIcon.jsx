import React from 'react';
import { BookOpen, NotePencil, Headphones, Trophy } from '@phosphor-icons/react';

// JSX qaytaradi, lekin komponent EMAS — shuning uchun komponent fayllaridan
// alohida turadi (aks holda Vite'ning Fast Refresh'i buziladi).
export const getTestIconAndColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('reading')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-blue-500/10 text-blue-500' };
    if (t.includes('listening')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-pink-500/10 text-pink-500' };
    if (t.includes('writing')) return { icon: <NotePencil size={16} weight="fill" />, colorClass: 'bg-orange-500/10 text-orange-500' };
    if (t.includes('podcast')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-indigo-500/10 text-indigo-500' };
    if (t.includes('article')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-emerald-500/10 text-emerald-500' };
    return { icon: <Trophy size={16} weight="fill" />, colorClass: 'bg-purple-500/10 text-purple-500' };
};

/**
 * Neytral yorliq + faqat kichik nuqta uchun rang.
 * To'liq rangli "pill"lar ro'yxatda vizual shovqin hosil qilardi —
 * tayinlash sahifasi ham `TeacherTests` bilan bir xil tilda gapiradi.
 */
export const getTestTypeMeta = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('mock') || t.includes('full')) return { label: 'Mock', dot: 'bg-purple-500' };
    if (t.includes('reading')) return { label: 'Reading', dot: 'bg-blue-500' };
    if (t.includes('listening')) return { label: 'Listening', dot: 'bg-pink-500' };
    if (t.includes('writing')) return { label: 'Writing', dot: 'bg-orange-500' };
    if (t.includes('podcast')) return { label: 'Podcast', dot: 'bg-indigo-500' };
    if (t.includes('article')) return { label: 'Article', dot: 'bg-emerald-500' };
    return { label: (type || 'Test').toUpperCase(), dot: 'bg-gray-400' };
};
