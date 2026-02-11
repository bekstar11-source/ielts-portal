// src/components/ReadingInterface/HighlightMenu.jsx
import React from "react";

export default function HighlightMenu({ position, onHighlight, onClear }) {
    // Agar pozitsiya bo'lmasa, menyuni ko'rsatma
    if (!position) return null;

    return (
        <div 
            className="absolute z-[1000] flex items-center gap-1 bg-gray-900 text-white p-1.5 rounded-lg shadow-xl -translate-x-1/2 animate-in fade-in zoom-in duration-100"
            style={{ 
                top: position.top, 
                left: position.left 
            }} 
            onMouseDown={(e) => e.preventDefault()} // Selection o'chmasligi uchun muhim
        >
            <button 
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold hover:bg-gray-700 rounded transition-colors"
                onMouseDown={() => onHighlight('yellow')}
            >
                <span className="text-yellow-300">🖊️</span> Highlight
            </button>
            
            <button 
                className="w-4 h-4 rounded-full bg-green-200 hover:scale-110 transition-transform border border-gray-600"
                onMouseDown={() => onHighlight('green')}
            ></button>

            <div className="w-[1px] h-3 bg-gray-600 mx-1"></div>

            <button 
                className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                onMouseDown={onClear}
            >
                ✕
            </button>
        </div>
    );
}