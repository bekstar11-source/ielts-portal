// src/components/ListeningInterface/ListeningLeftPane.jsx
import React, { memo, useEffect, useRef } from "react";

const ListeningLeftPane = memo(({ content, highlightedId }) => {
    const containerRef = useRef(null);

    // Highlight o'zgarganda o'sha joyga scroll qilish
    useEffect(() => {
        // 🔥 1. ID keldimi tekshiramiz
        if (highlightedId) {
            console.log(`%c 🔍 QIDIRUV BOSHLANDI: "${highlightedId}"`, "color: blue; font-weight: bold;");

            if (containerRef.current) {
                // ID oldiga # qo'shamiz (masalan: loc_15 -> #loc_15)
                // Agar sizning ID laringiz raqam bilan boshlansa (masalan: 15), selector ishlamasligi mumkin.
                // Shuning uchun IDlar harf bilan boshlangani ma'qul (masalan: loc_15).
                
                // Hozirgi holatda biz IDni to'g'ridan-to'g'ri qidirib ko'ramiz
                // Agar IDingiz "loc_15" bo'lsa, selector "#loc_15" bo'lishi kerak.
                const selector = `#${highlightedId}`;
                
                console.log("🎯 Selector:", selector);

                try {
                    const element = containerRef.current.querySelector(selector);

                    if (element) {
                        // 🔥 2. Element topilsa
                        console.log("%c ✅ ELEMENT TOPILDI:", "color: green; font-weight: bold;", element);
                        
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Rang berish
                        element.classList.add('bg-yellow-300', 'transition-colors', 'duration-500');
                        
                        const timer = setTimeout(() => {
                            element.classList.remove('bg-yellow-300');
                        }, 2000);

                        return () => clearTimeout(timer);
                    } else {
                        // 🔥 3. Element topilmasa
                        console.error(`❌ ELEMENT TOPILMADI! Script ichida id="${highlightedId}" bormi?`);
                        console.log("📄 Hozirgi HTML tarkibi (qisqacha):", containerRef.current.innerHTML.substring(0, 500) + "...");
                    }
                } catch (error) {
                    console.error("⚠️ Selector xatosi (ID noto'g'ri formatda bo'lishi mumkin):", error);
                }
            }
        }
    }, [highlightedId]);

    return (
        <div 
            ref={containerRef}
            className="p-8 pb-32 h-full text-base leading-relaxed text-gray-800 selectable-text"
        >
            <div 
                className="
                    [&_p]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3 
                    [&_span.location-marker]:border-b-2 [&_span.location-marker]:border-dotted [&_span.location-marker]:border-gray-400 [&_span.location-marker]:cursor-help
                "
                dangerouslySetInnerHTML={{ __html: content }} 
            />
        </div>
    );
});

export default ListeningLeftPane;