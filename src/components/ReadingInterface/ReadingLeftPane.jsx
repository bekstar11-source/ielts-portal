// src/components/ReadingInterface/ReadingLeftPane.jsx
import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import HighlightMenu from "./HighlightMenu";
import { useTextSelection } from "../../hooks/useTextSelection";

// --- YANGI: MEMOIZED CONTENT COMPONENT ---
// Bu komponent faqat "html content" o'zgargandagina render bo'ladi.
// Menyu ochilganda (parent re-render bo'lganda) bu joy o'zgarmaydi, 
// shuning uchun Selection (belgilash) saqlanib qoladi.
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
    storageKey 
}) => {
    const containerRef = useRef(null);
    const [displayContent, setDisplayContent] = useState(content);

    // Hook
    const { menuPos, handleTextSelection, applyHighlight, clearSelection } = useTextSelection();

    // --- STORAGE LOAD ---
    useEffect(() => {
        if (!storageKey) { setDisplayContent(content); return; }
        const savedHtml = localStorage.getItem(storageKey);
        setDisplayContent(savedHtml || content);
    }, [content, storageKey]);

    // --- SAVE FUNCTION ---
    const saveCurrentContent = useCallback(() => {
        if (storageKey && containerRef.current) {
            const contentDiv = containerRef.current.querySelector('#reading-content-display');
            if (contentDiv) {
                localStorage.setItem(storageKey, contentDiv.innerHTML);
            }
        }
    }, [storageKey]);

    // --- HIGHLIGHT CLICK (ERASER) ---
    // useCallback muhim, aks holda har renderda yangi funksiya bo'lib, Childni buzib qo'yadi
    const handleHighlightClick = useCallback((e) => {
        if (e.target.classList.contains('highlight-mark')) {
            const span = e.target;
            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);
            
            // O'chirish va saqlash
            // Biz bu yerda to'g'ridan-to'g'ri DOM bilan ishlayapmiz, 
            // shuning uchun localStoragega ham o'sha zahoti yozamiz.
            if (storageKey) {
                // Biroz kutib turib saqlaymiz (DOM yangilanishi uchun)
                setTimeout(() => {
                    const contentDiv = document.getElementById('reading-content-display');
                    if (contentDiv) localStorage.setItem(storageKey, contentDiv.innerHTML);
                }, 0);
            }
        }
    }, [storageKey]);

    // --- SCROLL TO QUESTION ---
    useEffect(() => {
        if (highlightedId && containerRef.current) {
            const selector = `#${highlightedId}`;
            const element = containerRef.current.querySelector(selector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('bg-yellow-300', 'transition-colors', 'duration-500');
                setTimeout(() => element.classList.remove('bg-yellow-300'), 2500);
            }
        }
    }, [highlightedId]);

    return (
        <>
            <HighlightMenu 
                position={menuPos} 
                onHighlight={(color) => applyHighlight(color, saveCurrentContent)} 
                onClear={clearSelection} 
            />

            <div 
                ref={containerRef}
                className={`p-8 pb-20 h-full overflow-y-auto leading-relaxed text-gray-800 selectable-text ${textSize}`}
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

                {/* MEMOIZED CONTENT - Mana shu yechim */}
                <ContentDisplay 
                    content={displayContent} 
                    onClick={handleHighlightClick} 
                />
            </div>
        </>
    );
});

export default ReadingLeftPane;