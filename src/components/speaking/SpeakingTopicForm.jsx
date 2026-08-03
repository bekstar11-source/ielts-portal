/**
 * O'qituvchi uchun Speaking mavzusi yaratish.
 *
 * Statik baza kodda turadi va uni faqat deploy o'zgartiradi; o'qituvchi
 * o'z guruhiga mos savollarni shu yerdan qo'shadi. Shakl statik mavzu
 * bilan bir xil — o'quvchi tomonda ikkalasi farqlanmaydi.
 */

import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash, SpinnerGap } from '@phosphor-icons/react';

import { db } from '../../firebase/firebase';
import { Card, SectionTitle } from '../teacher/groupStats/primitives';

const PARTS = [
    { value: 1, label: 'Part 1 — Introduction' },
    { value: 2, label: 'Part 2 — Cue card' },
    { value: 3, label: 'Part 3 — Discussion' },
];

const emptyQuestion = () => ({ key: Math.random().toString(36).slice(2), text: '', cueCard: '' });

const inputClass =
    'w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-warm-primary/50';

/**
 * @param {{ author: { uid: string, name?: string }, groups?: Array<{id: string, name: string}>, onCreated?: () => void }} props
 */
export default function SpeakingTopicForm({ author, groups = [], onCreated }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [part, setPart] = useState(1);
    const [groupId, setGroupId] = useState('');
    const [questions, setQuestions] = useState([emptyQuestion()]);
    const [saving, setSaving] = useState(false);

    const updateQuestion = useCallback((key, field, value) => {
        setQuestions((prev) =>
            prev.map((q) => (q.key === key ? { ...q, [field]: value } : q))
        );
    }, []);

    const submit = useCallback(async () => {
        const cleanTitle = title.trim();
        const rows = questions
            .map((q) => ({ text: q.text.trim(), cueCard: q.cueCard.trim() }))
            .filter((q) => q.text.length > 0);

        if (!cleanTitle) {
            toast.error('Mavzu nomini yozing.');
            return;
        }
        if (rows.length === 0) {
            toast.error('Kamida bitta savol kerak.');
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, 'speakingQuestions'), {
                title: cleanTitle,
                description: description.trim() || null,
                part,
                // Guruh tanlanmasa — barcha o'quvchilarga ochiq.
                groupId: groupId || null,
                published: true,
                authorId: author.uid,
                authorName: author.name || null,
                questions: rows.map((row, index) => ({
                    id: `t${Date.now().toString(36)}${index}`,
                    part,
                    text: row.text,
                    // Cue card faqat Part 2 uchun ma'noga ega.
                    ...(part === 2 && row.cueCard ? { cueCard: row.cueCard } : {}),
                })),
                createdAt: serverTimestamp(),
            });

            toast.success("Mavzu qo'shildi.");
            setTitle('');
            setDescription('');
            setQuestions([emptyQuestion()]);
            onCreated?.();
        } catch (error) {
            console.error('Speaking topic create error:', error);
            toast.error("Saqlab bo'lmadi.");
        } finally {
            setSaving(false);
        }
    }, [title, description, part, groupId, questions, author, onCreated]);

    return (
        <Card className="p-5 sm:p-6">
            <SectionTitle>Yangi mavzu qo‘shish</SectionTitle>

            <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mavzu nomi (masalan: Travel)"
                    className={inputClass}
                />
                <select
                    value={part}
                    onChange={(e) => setPart(Number(e.target.value))}
                    className={inputClass}
                >
                    {PARTS.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Qisqa izoh (ixtiyoriy)"
                    className={inputClass}
                />
                <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className={inputClass}
                >
                    <option value="">Barcha o‘quvchilarga</option>
                    {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-4 space-y-3">
                {questions.map((q, index) => (
                    <div key={q.key} className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                            <input
                                value={q.text}
                                onChange={(e) => updateQuestion(q.key, 'text', e.target.value)}
                                placeholder={`Savol ${index + 1} (ingliz tilida)`}
                                className={inputClass}
                            />
                            {part === 2 && (
                                <textarea
                                    value={q.cueCard}
                                    onChange={(e) => updateQuestion(q.key, 'cueCard', e.target.value)}
                                    rows={3}
                                    placeholder={'Cue card bandlari — har biri yangi qatordan'}
                                    className={`${inputClass} resize-none`}
                                />
                            )}
                        </div>
                        {questions.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setQuestions((prev) => prev.filter((item) => item.key !== q.key))}
                                className="mt-2 p-2 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                                aria-label="Savolni o‘chirish"
                            >
                                <Trash size={15} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-warm-primary hover:opacity-80 transition-opacity"
            >
                <Plus size={13} />
                Savol qo‘shish
            </button>

            <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
                {saving && <SpinnerGap size={15} className="animate-spin" />}
                Saqlash
            </button>
        </Card>
    );
}
