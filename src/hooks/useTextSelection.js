// src/hooks/useTextSelection.js
import { useState, useCallback, useEffect } from "react";

export function useTextSelection() {
    const [menuPos, setMenuPos] = useState(null);

    // 1. Matn belgilanganda menyu pozitsiyasini hisoblash
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        
        // Agar hech narsa belgilanmagan bo'lsa yoki kursor shunchaki turgan bo'lsa
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setMenuPos(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Agar tanlangan soha juda kichik bo'lsa (xatolik bo'lsa)
        if (rect.width < 1) {
            setMenuPos(null);
            return;
        }

        // Menyuni belgilangan matnning o'rtasida va tepasida ko'rsatish
        // (rect.top va rect.left viewportga nisbatan olinadi, bu fixed position uchun to'g'ri)
        setMenuPos({ 
            top: rect.top - 45, // Matndan biroz teparoqda
            left: rect.left + (rect.width / 2) 
        });
    }, []);

    // 2. Haqiqiy Highlight qilish funksiyasi (DOM manipulyatsiyasi)
    const applyHighlight = useCallback((color = 'yellow') => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // Yangi SPAN element yaratamiz
        const span = document.createElement("span");
        
        // Unga sariq fon va kerakli stillarni beramiz
        // Tailwind class: bg-yellow-200 (yoki #fef08a)
        span.style.backgroundColor = color === 'yellow' ? '#fef08a' : color; 
        span.className = "highlight-mark rounded px-0.5 cursor-pointer mix-blend-multiply";

        try {
            // Tanlangan matnni shu span ichiga o'raymiz
            range.surroundContents(span);
        } catch (e) {
            console.error("Highlight xatoligi (bloklar kesishganda ishlamaydi):", e);
            alert("Iltimos, faqat bitta paragraf ichidagi matnni belgilang.");
        }

        // Ish tugagach menyuni yopish va belgilashni olib tashlash
        selection.removeAllRanges();
        setMenuPos(null);
    }, []);

    // 3. Menyuny yopish yoki belgilashni bekor qilish
    const clearSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        setMenuPos(null);
    }, []);

    // Qo'shimcha: Oyna o'lchami o'zgarganda yoki scroll bo'lganda menyuni yopish (xatolikni oldini olish uchun)
    useEffect(() => {
        const handleResizeOrScroll = () => {
            if (menuPos) setMenuPos(null);
        };
        
        window.addEventListener('resize', handleResizeOrScroll);
        // window.addEventListener('scroll', handleResizeOrScroll); // Scroll paytida yopilmasligi uchun buni o'chirib turish mumkin

        return () => {
            window.removeEventListener('resize', handleResizeOrScroll);
            // window.removeEventListener('scroll', handleResizeOrScroll);
        };
    }, [menuPos]);

    return { 
        menuPos, 
        handleTextSelection, 
        applyHighlight, 
        clearSelection 
    };
}