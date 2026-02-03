// src/hooks/useResizablePane.js
import { useState, useEffect, useRef } from "react";

export function useResizablePane(initialWidth = 50) {
  const [leftWidth, setLeftWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      // Foizni hisoblash
      const newWidth = (e.clientX / window.innerWidth) * 100;
      
      // Cheklovlar (min 20%, max 80%)
      if (newWidth > 20 && newWidth < 80) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Sichqonchani qo'yib yuborganda matn tanlashni qayta yoqish
      document.body.style.userSelect = "auto"; 
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const startResizing = () => {
    setIsResizing(true);
    // Tortayotganda matn belgilanib qolmasligi uchun
    document.body.style.userSelect = "none"; 
  };

  // Biz komponentga faqat kerakli narsani qaytaramiz
  return { leftWidth, startResizing, isResizing };
}