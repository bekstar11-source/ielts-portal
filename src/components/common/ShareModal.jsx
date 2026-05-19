// src/components/common/ShareModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Sparkles } from 'lucide-react';
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
      return `🚀 I scored ${bandScore} on this ${capitalizedType} Test (${testTitle}) on ENGLEV! Try to beat my score:`;
    }
    return `📚 Practice this ${capitalizedType} Test (${testTitle}) on ENGLEV to level up your IELTS prep:`;
  };

  const handleCopy = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Havola nusxalandi! 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Nusxalashda xatolik yuz berdi");
    }
  };

  const handleTelegramShare = () => {
    const url = getShareUrl();
    const text = getShareText();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleWhatsappShare = () => {
    const url = getShareUrl();
    const text = getShareText();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-zinc-800/50 overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Share2 size={16} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Havolani ulashish
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition-colors"
            >
              <X size={14} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Test Info Preview */}
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-5 border border-gray-100 dark:border-zinc-850">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
              {testType || 'IELTS'} Test
            </span>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1">
              {testTitle}
            </h4>
            {bandScore !== null && bandScore !== undefined && (
              <div className="flex items-center gap-1.5 mt-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg py-1.5 px-3 w-fit">
                <Sparkles size={13} className="text-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Natija: {bandScore} Band Score ({score} ta to'g'ri)
                </span>
              </div>
            )}
          </div>

          {/* YouTube style: Start at option */}
          {currentPart && (
            <div className="flex items-center justify-between mb-5 bg-gray-50/50 dark:bg-zinc-800/30 p-3 rounded-lg border border-gray-100/50 dark:border-zinc-800/50">
              <label htmlFor="start-at-checkbox" className="flex flex-col cursor-pointer select-none">
                <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                  Hozirgi bo'limdan boshlash
                </span>
                <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                  Havola orqali o'tganda {testType === 'reading' ? `${currentPart}-matndan` : `${currentPart}-bo'limdan`} boshlanadi
                </span>
              </label>
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="start-at-checkbox"
                  checked={startAtPart}
                  onChange={(e) => setStartAtPart(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
            </div>
          )}

          {/* Copy Link input */}
          <div className="flex items-center gap-2 mb-6">
            <input
              type="text"
              readOnly
              value={getShareUrl()}
              className="flex-1 bg-gray-100 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300 text-xs px-3.5 py-3 rounded-xl border border-gray-200/60 dark:border-zinc-700/50 outline-none select-all truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                copied
                  ? 'bg-green-500 text-white shadow-green-500/10'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Nusxalandi
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Nusxa olish
                </>
              )}
            </button>
          </div>

          {/* Share on Socials */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block text-center">
              Tezkor ulashish
            </span>
            <div className="grid grid-cols-2 gap-3">
              {/* Telegram Button */}
              <button
                onClick={handleTelegramShare}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#229ED9] hover:bg-[#1f93cb] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/15 active:scale-95 transition-all"
              >
                {/* SVG for Telegram logo */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.89 1.2-5.33 3.52-.5.35-.96.52-1.37.51-.45-.01-1.32-.26-1.97-.47-.8-.26-1.43-.4-1.38-.85.03-.24.36-.49.99-.75 3.86-1.68 6.43-2.78 7.72-3.3 3.67-1.48 4.43-1.74 4.93-1.75.11 0 .36.03.52.16.14.11.18.26.19.38 0 .07-.01.15-.02.21z" />
                </svg>
                Telegram
              </button>

              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsappShare}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold text-xs shadow-md shadow-green-500/15 active:scale-95 transition-all"
              >
                {/* SVG for WhatsApp logo */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 2.051 14.11 1.05 11.48 1.05c-5.442 0-9.866 4.372-9.87 9.802 0 1.672.45 3.302 1.308 4.73L1.933 21.05l5.705-1.497c-.001 0-.001-.001 0 0z" />
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
