// src/components/ReadingInterface/HighlightableText.jsx
import React, { memo } from 'react';
import { applyHighlightsToText } from '../../utils/highlightUtils';

const HighlightableText = memo(({
    id,
    content,
    highlights,
    onTextSelect,
    onHighlightRemove,
    onOpenNotes,
    isReviewMode,
    className = ""
}) => {

    // Matn belgilanganda (Selection)
    const handleSelection = (e) => {
        // PointerUp ham mouseup, ham touchend uchun ishlaydi
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
            // NOTE LARNI BOSGANDA O'CHMAYDIGAN QILISH
            if (e.target.getAttribute('data-is-note') === 'true') {
                if (onOpenNotes) onOpenNotes();
                return;
            }

            const highlightId = e.target.getAttribute('data-highlight-id');
            if (highlightId && onHighlightRemove) {
                onHighlightRemove(id, highlightId);
            }
        }
    };

    // Matnni highlightlar bilan boyitib rendering qilish
    const renderedHTML = applyHighlightsToText(content, highlights);

    return (
        <span
            id={id}
            className={`highlightable-zone inline leading-relaxed relative selection:bg-blue-100 ${className}`}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
            onPointerUp={handleSelection}
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