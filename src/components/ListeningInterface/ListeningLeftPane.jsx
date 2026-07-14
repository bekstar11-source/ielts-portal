// src/components/ListeningInterface/ListeningLeftPane.jsx
import React, { memo, useEffect, useRef } from "react";

const ListeningLeftPane = memo(({ content, highlightedId }) => {
    const containerRef = useRef(null);

    // Highlight o'zgarganda o'sha joyga scroll qilish
    useEffect(() => {
        if (highlightedId && containerRef.current) {
            // Agar IDingiz "loc_15" bo'lsa, selector "#loc_15" bo'lishi kerak.
            const selector = `#${highlightedId}`;

            try {
                const element = containerRef.current.querySelector(selector);

                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    element.classList.add('bg-yellow-300', 'transition-colors', 'duration-500');

                    const timer = setTimeout(() => {
                        element.classList.remove('bg-yellow-300');
                    }, 2000);

                    return () => clearTimeout(timer);
                }
            } catch {
                // ID noto'g'ri CSS selector formatida bo'lishi mumkin (masalan raqam bilan boshlanishi) — jim o'tkazib yuboramiz.
            }
        }
    }, [highlightedId]);

    return (
        <div 
            ref={containerRef}
            className="p-8 pb-32 h-full leading-relaxed text-gray-800 selectable-text"
        >
            <div 
                className="
                    [&_p]:mb-4 [&_h3]:text-[1.25em] [&_h3]:font-bold [&_h3]:mb-3 
                    [&_span.location-marker]:border-b-2 [&_span.location-marker]:border-dotted [&_span.location-marker]:border-gray-400 [&_span.location-marker]:cursor-help
                "
                dangerouslySetInnerHTML={{ __html: content }} 
            />
        </div>
    );
});

export default ListeningLeftPane;