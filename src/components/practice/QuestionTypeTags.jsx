import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';

const DEFAULT_LIMIT = 2;

export default function QuestionTypeTags({
  types = [],
  limit = DEFAULT_LIMIT,
  tagClassName = 'px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-[9px] font-semibold tracking-wide border border-white/15 uppercase shadow-sm',
  moreButtonClassName = 'px-2 py-0.5 rounded bg-black/40 backdrop-blur-md text-white/90 text-[9px] font-semibold tracking-wide border border-white/20 uppercase shadow-sm hover:bg-black/55 transition-colors',
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
