import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';

const DEFAULT_LIMIT = 2;

export default function QuestionTypeTags({
  types = [],
  limit = DEFAULT_LIMIT,
  tagClassName = 'px-3 py-1 rounded-full bg-[#0a1317]/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wide uppercase shadow-sm',
  moreButtonClassName = 'px-3 py-1 rounded-full bg-[#0a1317]/40 backdrop-blur-md text-white/90 text-[10px] font-bold tracking-wide uppercase shadow-sm hover:bg-[#0a1317]/55 transition-colors',
  className = 'relative z-10 flex flex-wrap gap-1',
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!types.length) return null;

  const hasMore = types.length > limit;
  const visibleTypes = expanded || !hasMore ? types : types.slice(0, limit);
  const hiddenCount = types.length - limit;

  return (
    <div className={className}>
      {visibleTypes.map((qType, idx) => (
        <span key={idx} className={tagClassName}>
          {qType}
        </span>
      ))}
      {hasMore && !expanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className={moreButtonClassName}
        >
          {t('practice.showMoreTypes').replace('{count}', hiddenCount)}
        </button>
      )}
    </div>
  );
}
