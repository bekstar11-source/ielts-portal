import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const DuplicateModal = ({ show, onConfirm, onCancel, duplicateInfo, isDark }) => {
    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        
                        <h3 className="text-2xl font-black mb-2 tracking-tight">O'xshash test topildi!</h3>
                        <p className="text-sm opacity-60 leading-relaxed mb-6">
                            Tizimda allaqachon <span className="font-bold text-amber-500">"{duplicateInfo}"</span> nomli yoki shunga juda o'xshash kontentli test mavjud. 
                            Baribir saqlashni xohlaysizmi?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className={`flex-1 h-12 rounded-2xl font-bold text-sm transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 h-12 rounded-2xl bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                            >
                                Ha, Saqlash
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DuplicateModal;
