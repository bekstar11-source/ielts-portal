// src/components/ReadingInterface/ReadingLeftPane.jsx
import React, { memo, useEffect, useRef, useState } from "react";

const ReadingLeftPane = memo(({ passageLabel, title, content, textSize, highlightedId, onMouseUp, storageKey }) => {
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

    return (
        <div 
            ref={containerRef}
            className={`p-8 pb-32 h-full overflow-y-auto leading-relaxed text-gray-800 selectable-text ${textSize}`}
            onMouseUp={onMouseUp}
        >
            {/* 🔥 YANGI: PASSAGE SARLAVHASI (HEADING) */}
            <div className="mb-6 border-b-2 border-gray-100 pb-4">
                
                {/* 1. PASSAGE LABEL (Tepada, kichik, kulrang) */}
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                    {passageLabel}
                </div>

                {/* 2. TITLE (Pastda, katta, qora) */}
                {title && (
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                        {title.replace(/Passage \d+:?\s*/i, "")} {/* Agar title ichida Passage so'zi bo'lsa olib tashlaymiz */}
                    </h2>
                )}
            </div>

            {/* HTML Content Render
                Tailwindning "Arbitrary variants" ([&_p]) yordamida ichki HTML elementlarga stil beramiz 
            */}
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
        </div>
    );
});

export default ReadingLeftPane;