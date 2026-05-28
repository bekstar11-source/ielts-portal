import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, HelpCircle, FileText, Clipboard, Headphones } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export default function PracticeHero({ activeTab, totalCount, filteredCount, subType }) {
  const { t } = useTranslation();

  // Support both reading and listening
  if (activeTab !== 'reading' && activeTab !== 'listening') return null;

  const isReading = activeTab === 'reading';

  // Badges data depending on activeTab
  const badges = isReading
    ? [
        { id: 1, text: 'True / False / NG', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', style: 'left-[8%] top-[20%] rotate-[-3deg]', delay: 0.2 },
        { id: 2, text: 'Multiple Choice', icon: HelpCircle, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30', style: 'left-[12%] bottom-[15%] rotate-[4deg]', delay: 0.4 },
        { id: 3, text: 'Matching Headings', icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30', style: 'right-[8%] top-[25%] rotate-[5deg]', delay: 0.3 },
        { id: 4, text: 'Gap Fill', icon: Clipboard, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30', style: 'right-[14%] bottom-[12%] rotate-[-4deg]', delay: 0.5 },
      ]
    : [
        { id: 1, text: 'Matching', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', style: 'left-[8%] top-[20%] rotate-[-3deg]', delay: 0.2 },
        { id: 2, text: 'Multiple Choice', icon: HelpCircle, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30', style: 'left-[12%] bottom-[15%] rotate-[4deg]', delay: 0.4 },
        { id: 3, text: 'Map / Plan / Diagram', icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30', style: 'right-[8%] top-[25%] rotate-[5deg]', delay: 0.3 },
        { id: 4, text: 'Gap Fill', icon: Clipboard, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30', style: 'right-[14%] bottom-[12%] rotate-[-4deg]', delay: 0.5 },
      ];

  const IconComponent = isReading ? BookOpen : Headphones;
  const titleText = isReading ? t('practice.heroTitle') : t('practice.heroTitleListening');
  const subtitleText = isReading ? t('practice.heroSubtitle') : t('practice.heroSubtitleListening');

  return (
    <div className="w-full bg-[#f0f6ff] dark:bg-zinc-950 border-b border-black/[0.03] dark:border-white/[0.05] h-[130px] md:h-[160px] flex items-center justify-center overflow-hidden relative">
      {/* Soft gradient blur backgrounds */}
      <div className={`absolute w-[250px] h-[250px] ${isReading ? 'bg-blue-400/10 dark:bg-blue-500/5' : 'bg-purple-400/10 dark:bg-purple-500/5'} rounded-full blur-[60px] -left-10 top-0 pointer-events-none`} />
      <div className="absolute w-[250px] h-[250px] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-[80px] -right-10 bottom-0 pointer-events-none" />

      {/* Floating Badges (Figma-community style) */}
      <div className="absolute inset-0 max-w-[1440px] mx-auto px-6 hidden md:block pointer-events-none">
        {badges.map((badge) => {
          const BadgeIcon = badge.icon;
          return (
            <motion.div 
              key={badge.id}
              initial={{ opacity: 0, y: badge.delay * 50, rotate: parseFloat(badge.style.match(/rotate-\[(.*?)deg\]/)?.[1] || '0') }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: badge.delay }}
              className={`absolute ${badge.style.split(' rotate-')[0]} bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2`}
            >
              <div className={`w-6 h-6 rounded-lg ${badge.bgColor} flex items-center justify-center ${badge.color}`}>
                <BadgeIcon size={13} />
              </div>
              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{badge.text}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="text-center px-6 relative z-10 max-w-[500px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-2"
        >
          <IconComponent className="text-blue-500 dark:text-blue-400" size={18} />
          <h1 className="text-[20px] md:text-[24px] font-bold text-zinc-950 dark:text-white tracking-tight">
            {titleText}{subType === 'parts' ? ' (Parts)' : subType === 'full' ? ' (Full)' : ''}
          </h1>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-zinc-550 dark:text-zinc-400 text-xs md:text-[13px] font-medium leading-relaxed"
        >
          {subtitleText}
        </motion.p>
      </div>
    </div>
  );
}
