// src/components/ReadingInterface/HighlightableText.jsx
import React, { memo } from 'react';
import { applyHighlightsToText } from '../../utils/highlightUtils';

const HighlightableText = memo(({
    id,
    content,
    highlights,
    onTextSelect,
    onHighlightRemove,
    isReviewMode,
    className = ""
}) => {

    // Matn belgilanganda (Selection)
    const handleMouseUp = (e) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        // Faqat shu element ichida ekanligini tekshirish
        const container = e.currentTarget;
        if (!container.contains(selection.anchorNode)) return;

        // Matnni tekshirish
        const text = selection.toString();
        if (!text.trim()) return;

        onTextSelect(id, selection, container);
    };

    // Highlight ustiga bosilganda (O'chirish)
    const handleClick = (e) => {
        if (isReviewMode) return;

        // Agar bosilgan element "highlight-mark" klasiga ega bo'lsa
        if (e.target.classList.contains('highlight-mark')) {
            const highlightId = e.target.getAttribute('data-highlight-id');
            if (highlightId && onHighlightRemove) {
                // Confirm so'rash (ixtiyoriy)
                // if (window.confirm("Highlightni o'chirasizmi?")) {
                onHighlightRemove(id, highlightId);
                // }
            }
        }
    };

    // Matnni highlightlar bilan boyitib rendering qilish
    const renderedHTML = applyHighlightsToText(content, highlights);

    return (
        <span
            id={id}
            className={`highlightable-zone inline leading-relaxed relative ${className}`}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
        />
    );
}, (prev, next) => {
    // Faqat highlightlar yoki content o'zgarganda qayta render qilamiz
    return prev.content === next.content &&
        JSON.stringify(prev.highlights) === JSON.stringify(next.highlights) &&
        prev.isReviewMode === next.isReviewMode;
});

export default HighlightableText;