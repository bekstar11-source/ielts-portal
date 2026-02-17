import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

export default function NoteInput({ position, initialNote = "", onSave, onClose, onDelete }) {
    const [note, setNote] = useState(initialNote);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    if (!position) return null;

    return (
        <div
            className="absolute z-[1100] bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64 animate-in fade-in zoom-in duration-200"
            style={{
                top: position.top + 40, // Highlight menu orqasidan pastroqda chiqadi
                left: position.left
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Note</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            </div>

            <textarea
                ref={inputRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full text-sm p-2 border border-gray-200 rounded mb-2 focus:outline-none focus:border-blue-500 resize-none h-24"
            />

            <div className="flex justify-between gap-2 mt-2">
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                    >
                        Delete Highlight
                    </button>
                )}
                <button
                    onClick={() => onSave(note)}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors ml-auto"
                >
                    <Check size={12} /> Save
                </button>
            </div>
        </div>
    );
}
