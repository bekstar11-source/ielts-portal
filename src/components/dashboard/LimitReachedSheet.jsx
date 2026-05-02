import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Zap, ArrowRight, Calendar, Sparkles } from 'lucide-react';

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
            className="fixed inset-0 bg-[#f5f5f7]/60 backdrop-blur-xl z-[2100]"
          />

          {/* Centered Modal Wrapper */}
          <div className="fixed inset-0 flex items-center justify-center z-[2200] p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white/90 border border-white rounded-[32px] px-8 pb-10 pt-10 shadow-[0_32px_80px_rgba(0,0,0,0.15)] max-w-sm w-full pointer-events-auto overflow-hidden relative"
            >
              {/* Subtle background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 bg-[#f5f5f7] rounded-[22px] flex items-center justify-center mb-6 text-[#0071E3] shadow-sm">
                  <Lock size={30} strokeWidth={2.5} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-4"
                >
                  <Sparkles size={10} /> Pro Required
                </motion.div>

                <h2 className="text-2xl font-bold text-[#1d1d1f] mb-3 tracking-tight">
                  Pro Tarif Kerak
                </h2>
                
                <p className="text-[#86868b] text-[15px] leading-relaxed mb-10 px-2">
                  Barcha {type === 'reading' ? 'Reading' : 'Listening'} testlarini yechish va tahlil qilish uchun Pro tarifiga o'ting.
                </p>

                <div className="w-full space-y-4">
                  <button
                    onClick={onUpgrade}
                    className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 hover:bg-[#0077ED] active:scale-[0.98] transition-all group shadow-xl shadow-blue-500/20"
                  >
                    <Zap size={18} fill="currentColor" />
                    Pro — 39,000 so'm
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button 
                    onClick={onUpgrade}
                    className="w-full bg-[#f5f5f7] p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors border border-transparent active:border-gray-200 group"
                  >
                    <Sparkles size={18} className="text-[#86868b] group-hover:text-[#0071E3] transition-colors" />
                    <div className="text-left">
                      <div className="text-[13px] font-bold text-[#1d1d1f]">3 Oylik Pro Plan</div>
                      <div className="text-[11px] text-[#86868b]">Eng yaxshi tanlov (99,000 so'm)</div>
                    </div>
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-2 text-[#86868b] font-semibold text-[14px] hover:text-[#1d1d1f] transition-colors mt-4"
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
