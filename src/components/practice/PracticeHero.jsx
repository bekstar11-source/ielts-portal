import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, HelpCircle, FileText, Clipboard } from 'lucide-react';

export default function PracticeHero({ activeTab, totalCount, filteredCount }) {
  // We only display the banner for reading
  if (activeTab !== 'reading') return null;

  return (
    <div className="w-full bg-[#f0f6ff] dark:bg-zinc-950 border-b border-black/[0.03] dark:border-white/[0.05] h-[130px] md:h-[160px] flex items-center justify-center overflow-hidden relative">
      {/* Soft gradient blur backgrounds */}
      <div className="absolute w-[250px] h-[250px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-[60px] -left-10 top-0 pointer-events-none" />
      <div className="absolute w-[250px] h-[250px] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-[80px] -right-10 bottom-0 pointer-events-none" />

      {/* Floating Badges (Figma-community style) */}
      <div className="absolute inset-0 max-w-[1440px] mx-auto px-6 hidden md:block pointer-events-none">
        {/* Left Floating Badge 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 15, rotate: -5 }}
          animate={{ opacity: 1, y: 0, rotate: -3 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute left-[8%] top-[20%] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
            <CheckCircle size={13} />
          </div>
          <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">True / False / NG</span>
        </motion.div>

        {/* Left Floating Badge 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 20, rotate: 5 }}
          animate={{ opacity: 1, y: 0, rotate: 4 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute left-[12%] bottom-[15%] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
            <HelpCircle size={13} />
          </div>
          <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Multiple Choice</span>
        </motion.div>

        {/* Right Floating Badge 1 */}
        <motion.div 
          initial={{ opacity: 0, y: -15, rotate: 6 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute right-[8%] top-[25%] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500">
            <FileText size={13} />
          </div>
          <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Matching Headings</span>
        </motion.div>

        {/* Right Floating Badge 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 20, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="absolute right-[14%] bottom-[12%] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500">
            <Clipboard size={13} />
          </div>
          <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Gap Fill</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="text-center px-6 relative z-10 max-w-[500px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-2"
        >
          <BookOpen className="text-blue-500 dark:text-blue-400" size={18} />
          <h1 className="text-[20px] md:text-[24px] font-bold text-zinc-950 dark:text-white tracking-tight">
            IELTS Reading Practice
          </h1>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-zinc-550 dark:text-zinc-400 text-xs md:text-[13px] font-medium leading-relaxed"
        >
          Improve your reading speed and comprehension with our curated library of single passages and full-length exams.
        </motion.p>
      </div>
    </div>
  );
}
