// src/components/ReadingInterface/ReadingLeftPane.jsx
import React, { memo, useEffect, useRef, useState } from "react";

const ReadingLeftPane = memo(({ 
    passageLabel, 
    title, 
    content, 
    textSize = "text-base", 
    highlightedId, 
    onMouseUp, 
    storageKey 
}) => {
    const containerRef = useRef(null);
    const [displayContent, setDisplayContent] = useState(content);

    // --- STORAGE LOGIC ---
    useEffect(() => {
        if (!storageKey) { setDisplayContent(content); return; }
        const savedHtml = localStorage.getItem(storageKey);
        setDisplayContent(savedHtml || content);
    }, [content, storageKey]);

    // --- HIGHLIGHT LOGIC ---
    useEffect(() => {
        if (highlightedId && containerRef.current) {
            const selector = `#${highlightedId}`;
            try {
                const element = containerRef.current.querySelector(selector);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('bg-yellow-300', 'transition-colors', 'duration-500');
                    setTimeout(() => element.classList.remove('bg-yellow-300'), 2500);
                }
            } catch (error) {
                console.error(error); 
            } 
        }
    }, [highlightedId]);

    // 🔥 HIGHLIGHT REMOVER
    const handleHighlightClick = (e) => {
        if (e.target.classList.contains('highlight-mark')) {
            const span = e.target;
            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);

            // Storage yangilash
            if (storageKey && containerRef.current) {
                const contentDiv = containerRef.current.querySelector('#reading-content-display');
                if (contentDiv) {
                    localStorage.setItem(storageKey, contentDiv.innerHTML);
                }
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`p-8 pb-20 h-full overflow-y-auto leading-relaxed text-gray-800 selectable-text ${textSize}`}
            onMouseUp={onMouseUp}
            onClick={handleHighlightClick}
        >
            {/* --- O'ZGARISH SHU YERDA --- */}
            
            {/* 1. Kichikroq Header (Reading Passage 1) */}
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 select-none">
                {passageLabel || "READING PASSAGE 1"}
            </div>

            {/* 2. Sarlavha (Title) - Tepadagi bo'shliq olib tashlandi (mt-0) */}
            {title && (
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-0 leading-tight">
                    {title}
                </h1>
            )}
            
            {/* --------------------------- */}

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
                dangerouslySetInnerHTML={{ __html: displayContent }} 
            />
            
            {/* CSS: Highlight markerni yashirish (agar kerak bo'lsa) */}
            <style>{`
                .reading-content span[id^="loc_"] {
                    background-color: transparent; 
                    transition: background-color 0.3s;
                }
                .reading-content span[id^="loc_"]:hover {
                    background-color: rgba(255, 255, 0, 0.2); 
                }
            `}</style>
        </div>
    );
});

export default ReadingLeftPane;