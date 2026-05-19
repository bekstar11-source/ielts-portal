// src/components/common/ShareModal.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareModal({
  isOpen,
  onClose,
  testId,
  testTitle,
  testType,
  currentPart = null,
  score = null,
  bandScore = null
}) {
  const [startAtPart, setStartAtPart] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate share link
  const getShareUrl = () => {
    let url = `${window.location.origin}/test/${testId}`;
    if (startAtPart && currentPart) {
      url += `?part=${currentPart}`;
    }
    return url;
  };

  const getShareText = () => {
    const capitalizedType = testType ? testType.charAt(0).toUpperCase() + testType.slice(1) : 'IELTS';
    if (bandScore !== null && bandScore !== undefined) {
      return `🚀 Men ENGLEV platformasida ushbu ${capitalizedType} testdan (${testTitle}) ${bandScore} ball oldim! Siz ham o'z kuchingizni sinab ko'ring:`;
    }
    return `📚 ENGLEV platformasidagi ushbu ajoyib ${capitalizedType} testni (${testTitle}) bajaring va IELTS ballingizni oshiring:`;
  };

  const handleCopy = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Nusxalandi! 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Nusxalashda xatolik yuz berdi");
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Flat black overlay (No backdrop blur) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute inset-0 bg-black/40"
        />

        {/* Apple Website Styled Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-[#1d1d1f] w-full max-w-[360px] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-[#d2d2d7] dark:border-[#424245] overflow-hidden p-6 flex flex-col"
        >
          {/* Close Button (Apple-style gray circle button) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center bg-[#f5f5f7] hover:bg-[#e8e8ed] dark:bg-[#323236] dark:hover:bg-[#424245] rounded-full transition-colors active:scale-90 z-10"
            title="Yopish"
          >
            <X size={14} className="text-[#86868b] dark:text-[#d2d2d7]" />
          </button>

          {/* Title Section (Left-aligned, clean typography) */}
          <div className="mb-5 pr-6">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
              Test havolasini ulashish
            </h3>
            <p className="text-[12px] text-[#86868b] mt-1 leading-normal">
              {testTitle}
            </p>
          </div>

          {/* Result Score Widget (Flat card style) */}
          {bandScore !== null && bandScore !== undefined && (
            <div className="flex items-center gap-2 bg-[#f5f5f7] dark:bg-[#2d2d30] border border-[#d2d2d7] dark:border-[#424245] rounded-xl p-3 mb-5 text-xs text-[#1d1d1f] dark:text-[#f5f5f7]">
              <Sparkles size={14} className="text-[#bf953f] shrink-0" />
              <span className="font-semibold">
                Sizning natijangiz: {bandScore} Band Score ({score} ta to'g'ri)
              </span>
            </div>
          )}

          {/* Start at offset checkbox (Store layout list-item style) */}
          {currentPart && (
            <div className="flex items-center justify-between bg-[#f5f5f7] dark:bg-[#2d2d30] border border-[#d2d2d7] dark:border-[#424245] rounded-xl p-3.5 mb-5">
              <div className="flex flex-col select-none pr-3">
                <span className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Hozirgi bo'limdan boshlash
                </span>
                <span className="text-[10px] text-[#86868b] mt-0.5 leading-tight">
                  Havola {testType === 'reading' ? `${currentPart}-matndan` : `${currentPart}-bo'limdan`} ochiladi
                </span>
              </div>
              <input
                type="checkbox"
                checked={startAtPart}
                onChange={(e) => setStartAtPart(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
              />
            </div>
          )}

          {/* Input field and copy link button */}
          <div className="flex items-center bg-[#f5f5f7] dark:bg-[#2d2d30] border border-[#d2d2d7] dark:border-[#424245] rounded-xl p-2.5">
            <input
              type="text"
              readOnly
              value={getShareUrl()}
              className="flex-1 bg-transparent text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-mono outline-none pr-3 select-all truncate"
            />
            <button
              onClick={handleCopy}
              className="text-[#0071e3] dark:text-[#2997ff] hover:underline text-[12px] font-semibold whitespace-nowrap active:scale-95 transition-all shrink-0 pl-1"
            >
              {copied ? "Nusxalandi" : "Nusxa olish"}
            </button>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
