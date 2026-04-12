import React, { useState, useEffect } from "react";
import { X, Trash2, StickyNote } from "lucide-react";

export default function ReadingNotesSidePanel({ 
    isVisible, 
    onClose, 
    notes = [], 
    onUpdateNote, 
    onDeleteNote,
    onScrollToNote
}) {
    if (!isVisible) return null;

    return (
        <div className={`fixed top-0 right-0 w-80 h-full bg-gray-50 border-l border-gray-200 z-[2500] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <StickyNote size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-800">Notes</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {notes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-4">
                        <StickyNote size={48} className="mb-3 text-gray-300" />
                        <p className="text-sm font-medium text-gray-500">No notes yet</p>
                        <p className="text-xs text-gray-400 mt-1">Select text in the passage and click the note icon to add one.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notes.map((note) => (
                            <NoteCard 
                                key={note.id} 
                                note={note} 
                                onUpdate={onUpdateNote} 
                                onDelete={onDeleteNote}
                                onScroll={onScrollToNote}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    IELTS Reading Assistant
                </p>
            </div>
        </div>
    );
}

function NoteCard({ note, onUpdate, onDelete, onScroll }) {
    const [content, setContent] = useState(note.content || "");

    useEffect(() => {
        setContent(note.content || "");
    }, [note.content]);

    const handleChange = (e) => {
        const val = e.target.value;
        setContent(val);
        // Debounce update? For simplicity, we can update on blur or use a timer
    };

    const handleBlur = () => {
        onUpdate(note.id, content);
    };

    return (
        <div className="bg-[#E0F2FE] rounded-none border border-blue-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            {/* Context Text */}
            <div 
                className="p-3 bg-blue-100/50 text-[11px] text-gray-600 italic border-b border-blue-200/50 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => onScroll(note)}
            >
                "{note.text.length > 80 ? note.text.substring(0, 80) + "..." : note.text}"
            </div>

            {/* Input Area */}
            <div className="bg-white border-b border-blue-200/30">
                <textarea 
                    className="w-full bg-white border-none focus:ring-0 text-sm text-gray-800 placeholder:text-gray-400 resize-none min-h-[60px] px-3 py-2.5 rounded-none block"
                    placeholder="Start typing your note..."
                    value={content}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoFocus={!note.content}
                />
            </div>

            {/* Actions */}
            <div className="px-3 py-1.5 flex justify-end bg-blue-50/30">
                <button 
                    onClick={() => onDelete(note.id)}
                    className="text-[10px] font-bold text-red-500/80 hover:text-red-600 flex items-center gap-1 transition-colors uppercase tracking-tight"
                >
                    Delete Note
                </button>
            </div>
        </div>
    );
}
