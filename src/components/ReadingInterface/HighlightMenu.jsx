// src/components/ReadingInterface/HighlightMenu.jsx
import React from "react";

export default function HighlightMenu({ position, onHighlight, onClear }) {
    // Agar pozitsiya bo'lmasa, menyuni ko'rsatma
    if (!position) return null;

    return (
        <div 
            // 1. Position & Layout
            className="fixed z-[9999] flex items-center gap-1 bg-gray-800 p-1.5 rounded-lg shadow-xl -translate-x-1/2 animate-in fade-in zoom-in duration-200"
            // 2. Dynamic Style (JS orqali hisoblangan koordinatalar)
            style={{ 
                top: position.top, 
                left: position.left 
            }} 
            // 3. Selection Protection (Juda muhim!)
            // Bu tugmani bosganda matn belgilanishi (selection) yo'qolib ketmasligi uchun
            onMouseDown={(e) => e.preventDefault()}
        >
            {/* Highlight Button */}
            <button 
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-white hover:bg-gray-700 rounded transition-colors"
                onMouseDown={() => onHighlight('yellow')} // Default rang sariq
            >
                <span className="text-sm">🖊️</span>
                Highlight
            </button>

            {/* Divider (Ajratuvchi chiziq) */}
            <div className="w-[1px] h-4 bg-gray-600 mx-1"></div>

            {/* Close / Clear Button */}
            <button 
                className="px-2 py-1 text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-gray-700 rounded transition-colors"
                onMouseDown={onClear}
                title="Clear Selection"
            >
                ✕
            </button>
        </div>
    );
}