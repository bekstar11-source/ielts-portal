import React, { useState, useEffect } from 'react';
import { X, Flag, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Test/passage darajasidagi xato haqida xabar berish oynasi.
 * Savol darajasidagi report `DetailedAnswersModal` ichida — ikkalasi ham
 * `testComments` kolleksiyasiga `isReport: true` bilan yozadi, admin ularni
 * /admin/reports sahifasida ko'radi.
 */
export default function ReportIssueModal({
    isOpen,
    onClose,
    testData,
    resultId = null,
    partNumber = null,
    moduleType = null
}) {
    const { t } = useTranslation();
    const { user, userData } = useAuth();
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setText('');
            setSubmitted(false);
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!text.trim() || !user || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            await addDoc(collection(db, 'testComments'), {
                testId: testData?.id || null,
                testTitle: testData?.title || null,
                resultId,
                questionId: null,
                qNumber: null,
                partNumber,
                moduleType: moduleType || testData?.type || null,
                userId: user.uid,
                userName: userData?.fullName || user.displayName || 'Student',
                userRole: userData?.role || 'student',
                text: text.trim(),
                isReport: true,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setSubmitted(true);
            setTimeout(() => onClose(), 1400);
        } catch (err) {
            console.error('Error submitting report:', err);
            setError(t('testSolving.reportError') || "Xato yuz berdi. Qayta urinib ko'ring.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.98 }}
                    className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center">
                                <Flag size={16} className="stroke-[2.5]" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-bold text-gray-900 dark:text-white truncate">
                                    {t('testSolving.reportTestIssue') || 'Xato haqida xabar berish'}
                                </h2>
                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                                    {testData?.title}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    {submitted ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                            <CheckCircle2 size={32} className="text-emerald-500 stroke-[2.5]" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {t('testSolving.reportSubmitted') || 'Xabar yuborildi'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                {t('testSolving.reportThanks') || "Xabaringiz uchun rahmat — administrator tez orada ko'rib chiqadi."}
                            </p>
                        </div>
                    ) : (
                        <div className="p-5 flex flex-col gap-3">
                            <textarea
                                autoFocus
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={t('testSolving.reportTestPlaceholder') || "Bu testda qanday xato yoki kamchilik bor? Savol raqami, to'g'ri javob va h.k. — batafsil yozing..."}
                                className="w-full text-sm font-medium bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-3 min-h-[130px] resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-300 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                            />
                            {error && (
                                <p className="text-[12px] font-semibold text-rose-600">{error}</p>
                            )}
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                                >
                                    {t('testSolving.reportCancel') || 'Bekor qilish'}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !text.trim()}
                                    className="px-4 py-2 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-200 disabled:text-zinc-400 rounded-lg transition-all"
                                >
                                    {submitting ? '...' : (t('testSolving.reportSubmit') || 'Yuborish')}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
