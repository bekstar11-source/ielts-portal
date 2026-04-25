import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Zap, ArrowRight, Calendar } from 'lucide-react';

const LimitReachedSheet = ({ isOpen, onClose, onUpgrade, type = 'reading' }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1100]"
          />

          {/* Centered Modal Wrapper */}
          <div className="fixed inset-0 flex items-center justify-center z-[1200] p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[32px] px-6 pb-8 pt-8 shadow-[0_32px_80px_rgba(0,0,0,0.25)] max-w-sm w-full pointer-events-auto"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#F5F5F7] rounded-3xl flex items-center justify-center mb-6 text-[#0071E3] shadow-inner">
                  <Lock size={32} />
                </div>

                <h2 className="text-2xl font-bold text-[#1D1D1F] mb-3 tracking-tight">
                  Bugun uchun bilimlar yetarli!
                </h2>
                
                <p className="text-[#86868B] text-[16px] leading-relaxed mb-8">
                  Siz bugun 1 ta {type === 'reading' ? 'Reading' : 'Listening'} testini yakunladingiz. Ertaga yangi kun, yangi imkoniyatlar.
                </p>

                <div className="w-full space-y-3">
                  <button
                    onClick={onUpgrade}
                    className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 hover:bg-[#0077ED] active:scale-[0.98] transition-all group"
                  >
                    <Zap size={18} fill="currentColor" />
                    Premium — 29,000 so'm
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F5F5F7] p-4 rounded-2xl flex flex-col items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer border border-transparent active:border-gray-200">
                      <Calendar size={20} className="text-[#86868B] mb-2" />
                      <span className="text-[13px] font-bold text-[#1D1D1F]">Daily Pass</span>
                      <span className="text-[11px] text-[#86868B]">3,000 so'm</span>
                    </div>
                    <div className="bg-[#F5F5F7] p-4 rounded-2xl flex flex-col items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer border border-transparent active:border-gray-200">
                      <Zap size={20} className="text-[#86868B] mb-2" />
                      <span className="text-[13px] font-bold text-[#1D1D1F]">10-Day Sprint</span>
                      <span className="text-[11px] text-[#86868B]">19,000 so'm</span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full py-2 text-[#86868B] font-semibold text-[14px] hover:text-[#1D1D1F] transition-colors mt-8"
                  >
                    Ertaga qaytaman
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LimitReachedSheet;
