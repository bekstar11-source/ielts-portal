import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const LeaveConfirmModal = ({ show, onConfirm, onCancel, onSave, isDark }) => {
    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className={`relative w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-8 rounded-3xl shadow-2xl ${isDark ? 'bg-[#1E1E1E] text-white border border-white/5' : 'bg-white text-gray-900'}`}
                    >
                        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-4-4m0 0L8 3m4-4v12" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-black mb-2 tracking-tight">Saqlanmagan o'zgarishlar</h3>
                        <p className="text-sm opacity-60 leading-relaxed mb-6">
                            Ushbu sahifada saqlanmagan o'zgarishlar bor. Chiqib ketsangiz, ular yo'qoladi.
                        </p>

                        <div className="flex flex-col gap-2">
                            {onSave && (
                                <button
                                    onClick={onSave}
                                    className="h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
                                >
                                    Saqlab, chiqish
                                </button>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className={`flex-1 h-12 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                                >
                                    Qolish
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition-all active:scale-[0.98]"
                                >
                                    Saqlamay chiqish
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LeaveConfirmModal;
