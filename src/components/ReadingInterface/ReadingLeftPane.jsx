import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import HighlightMenu from "./HighlightMenu";
import useTextSelection from "../../hooks/useTextSelection";

// --- MEMOIZED CONTENT DISPLAY ---
const ContentDisplay = memo(({ content, onClick }) => {
    return (
        <div
            id="reading-content-display"
            className="
                [&_p]:mb-4 [&_p]:indent-4
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-center
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
                [&_span.highlight-mark]:bg-yellow-200 
                [&_span[id^='loc_']]:cursor-help [&_span[id^='loc_']]:border-b [&_span[id^='loc_']]:border-dotted [&_span[id^='loc_']]:border-gray-400
            "
            dangerouslySetInnerHTML={{ __html: content }}
            onClick={onClick}
        />
    );
}, (prevProps, nextProps) => {
    // Faqat content stringi o'zgarsagina re-render qilamiz
    return prevProps.content === nextProps.content;
});

const ReadingLeftPane = memo(({
    passageLabel,
    title,
    content,
    textSize = "text-base",
    highlightedId,
    storageKey,
    isReviewMode,
    onAddToWordBank
}) => {
    const containerRef = useRef(null);
    const [displayContent, setDisplayContent] = useState(content);

    // Hook
    const { menuPos, handleTextSelection, applyHighlight, clearSelection, addToDictionary } = useTextSelection();

    // --- STORAGE ---
    useEffect(() => {
        // Review rejimida localStorage ni o'tkazib yuboramiz —
        // content allaqachon inject qilingan highlight bilan kelgan
        if (isReviewMode) {
            setDisplayContent(content);
            return;
        }

        if (!storageKey) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // 30 kunlik muddat
                if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                    setDisplayContent(parsed.html);
                }
            } catch (e) {
                console.error("Error parsing saved highlights:", e);
            }
        } else {
            // Agar saqlangan narsa bo'lmasa, original kontentni qo'yamiz
            setDisplayContent(content);
        }
    }, [storageKey, content, isReviewMode]);

    const saveCurrentContent = useCallback(() => {
        if (!containerRef.current || !storageKey) return;

        // Biz faqat ContentDisplay ichidagi HTML ni olishimiz kerak
        // Lekin ContentDisplay memoized, shuning uchun biz to'g'ridan-to'g'ri DOM dan olamiz
        const contentDiv = containerRef.current.querySelector('#reading-content-display');
        if (contentDiv) {
            const html = contentDiv.innerHTML;
            setDisplayContent(html); // State update to re-render memoized component if needed
            localStorage.setItem(storageKey, JSON.stringify({
                html: html,
                timestamp: Date.now()
            }));
        }
    }, [storageKey]);

    // --- SCROLL TO QUESTION LOCATION ---
    useEffect(() => {
        if (highlightedId && containerRef.current) {
            // 1. Span ni topamiz (loc_ bilan boshlanadigan)
            const el = containerRef.current.querySelector(`span[id="${highlightedId}"]`);
            if (el) {
                // 2. Scroll qilamiz
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 3. Highlight qilamiz (vaqtinchalik)
                el.classList.add('bg-yellow-500/30', 'transition-colors', 'duration-500');
                setTimeout(() => {
                    el.classList.remove('bg-yellow-500/30');
                }, 2000);
            }
        }
    }, [highlightedId]);

    // --- HIGHLIGHT CLICK (REMOVE) ---
    const handleHighlightClick = useCallback((e) => {
        if (e.target.classList.contains('highlight-mark')) {
            const span = e.target;
            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);
            saveCurrentContent();
        }
    }, [saveCurrentContent]);

    // --- MENU ACTION HANDLER ---
    const handleMenuAction = (action) => {
        // Faqat rangli highlightlar uchun
        applyHighlight(action, saveCurrentContent);
    };

    return (
        <>
            <HighlightMenu
                position={menuPos}
                onHighlight={handleMenuAction}
                onClear={clearSelection}
                onAddDictionary={() => addToDictionary({ sectionTitle: title, testTitle: passageLabel || "Reading Test" })}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                source="passage"
            />

            <div
                ref={containerRef}
                className={`p-8 pb-20 h-full overflow-y-auto leading-relaxed text-gray-800 selectable-text relative ${textSize}`}
                onMouseUp={handleTextSelection}
            >
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 select-none">
                    {passageLabel || "READING PASSAGE 1"}
                </div>

                {title && (
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-0 leading-tight">
                        {title}
                    </h1>
                )}

                {/* MEMOIZED CONTENT */}
                <ContentDisplay
                    content={displayContent}
                    onClick={handleHighlightClick}
                />
            </div>
        </>
    );
});

export default ReadingLeftPane;