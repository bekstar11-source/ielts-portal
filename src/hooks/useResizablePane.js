// src/hooks/useResizablePane.js
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Ikki panelni ajratuvchi vertikal chegarani boshqaradi.
 *
 * Kenglik `containerRef` ning HAQIQIY o'lchamlari asosida hisoblanadi. Ilgari
 * `e.clientX / window.innerWidth` ishlatilardi — bu panel konteyneri ekranning chap
 * chetidan boshlanadi va butun oyna kengligini egallaydi deb faraz qilardi. Sidebar
 * yoki padding bo'lganda chegara sichqoncha ostidan siljib ketardi.
 *
 * @param {number} initialWidth - chap panelning boshlang'ich kengligi (foizda)
 * @param {number} minWidth - eng kichik kenglik (foizda)
 * @param {number} maxWidth - eng katta kenglik (foizda)
 */
export function useResizablePane(initialWidth = 50, minWidth = 20, maxWidth = 80) {
  const [leftWidth, setLeftWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isResizing) return;

    const applyPosition = (clientX) => {
      const node = containerRef.current;
      // Konteyner ref biriktirilmagan bo'lsa, eski xatti-harakatga qaytamiz
      const rect = node ? node.getBoundingClientRect() : null;
      const left = rect ? rect.left : 0;
      const width = rect ? rect.width : window.innerWidth;
      if (!width) return;

      const newWidth = ((clientX - left) / width) * 100;
      if (newWidth > minWidth && newWidth < maxWidth) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseMove = (e) => applyPosition(e.clientX);
    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) applyPosition(e.touches[0].clientX);
    };

    const stopResizing = () => {
      setIsResizing(false);
      // Sichqonchani qo'yib yuborganda matn tanlashni qayta yoqamiz
      document.body.style.userSelect = "auto";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", stopResizing);
    document.addEventListener("touchcancel", stopResizing);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", stopResizing);
      document.removeEventListener("touchcancel", stopResizing);
    };
  }, [isResizing, minWidth, maxWidth]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
    // Tortayotganda matn belgilanib qolmasligi uchun
    document.body.style.userSelect = "none";
  }, []);

  // Biz komponentga faqat kerakli narsani qaytaramiz
  return { leftWidth, startResizing, isResizing, containerRef };
}
