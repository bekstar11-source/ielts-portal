import React, { useState, useEffect } from "react";
import { BookPlus, Check } from "lucide-react";

export default function HighlightMenu({ position, onHighlight, onClear, onAddDictionary }) {
    const [isAdded, setIsAdded] = useState(false);

    // Reset state when position changes (new selection)
    useEffect(() => {
        setIsAdded(false);
    }, [position]);

    const handleAddDict = async (e) => {
        e.preventDefault();
        const success = await onAddDictionary();
        if (success) {
            setIsAdded(true);
            setTimeout(() => {
                onClear();
                setIsAdded(false);
            }, 1000);
        }
    };

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
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold hover:bg-gray-700 rounded transition-colors group"
                onMouseDown={() => onHighlight('yellow')}
                title="Highlight Yellow"
            >
                <div className="w-3 h-3 rounded-full bg-yellow-300 border border-yellow-400 group-hover:scale-110 transition-transform"></div>
            </button>

            <button
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold hover:bg-gray-700 rounded transition-colors group"
                onMouseDown={() => onHighlight('green')}
                title="Highlight Green"
            >
                <div className="w-3 h-3 rounded-full bg-green-300 border border-green-400 group-hover:scale-110 transition-transform"></div>
            </button>

            <div className="w-[1px] h-3 bg-gray-600 mx-1"></div>

            <button
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold hover:bg-gray-700 rounded transition-colors group ${isAdded ? 'text-green-400' : 'text-blue-400'}`}
                onMouseDown={handleAddDict}
                title="Lug'atga qo'shish"
                disabled={isAdded}
            >
                {isAdded ? (
                    <Check size={14} className="group-hover:scale-110 transition-transform animate-in zoom-in" />
                ) : (
                    <BookPlus size={14} className="group-hover:scale-110 transition-transform" />
                )}
            </button>

            <div className="w-[1px] h-3 bg-gray-600 mx-1"></div>

            <button
                className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                onMouseDown={onClear}
                title="Clear Selection"
            >
                ✕
            </button>
        </div>
    );
}