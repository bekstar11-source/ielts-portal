import { useState, useEffect, useCallback } from 'react';
import { generateId } from '../utils/highlightUtils';
import { 
    HL_STORAGE_PREFIX, 
    NOTES_STORAGE_PREFIX, 
    loadFromStorage, 
    saveToStorage 
} from '../components/ReadingInterface/ReadingInterfaceUtils';

export const useReadingPersistence = (testId) => {
    // --- HIGHLIGHTS ---
    const hlKey = `${HL_STORAGE_PREFIX}${testId}`;
    const [allHighlights, setAllHighlights] = useState(() => loadFromStorage(hlKey));

    useEffect(() => {
        if (testId) {
            setAllHighlights(loadFromStorage(hlKey));
        }
    }, [testId, hlKey]);

    const addHighlight = useCallback((partId, newHighlight) => {
        setAllHighlights(prev => {
            const existing = prev[partId] || [];
            const next = {
                ...prev,
                [partId]: [...existing, { ...newHighlight, id: newHighlight.id || generateId() }]
            };
            saveToStorage(hlKey, next);
            return next;
        });
    }, [hlKey]);

    const removeHighlight = useCallback((partId, highlightId) => {
        setAllHighlights(prev => {
            const existing = prev[partId] || [];
            const next = {
                ...prev,
                [partId]: existing.filter(h => h.id !== highlightId)
            };
            saveToStorage(hlKey, next);
            return next;
        });
    }, [hlKey]);

    // --- NOTES ---
    const notesKey = `${NOTES_STORAGE_PREFIX}${testId}`;
    const [allNotes, setAllNotes] = useState(() => loadFromStorage(notesKey));

    useEffect(() => {
        if (testId) {
            setAllNotes(loadFromStorage(notesKey));
        }
    }, [testId, notesKey]);

    const addNote = useCallback((passageIndex, noteData) => {
        setAllNotes(prev => {
            const existing = prev[passageIndex] || [];
            const next = {
                ...prev,
                [passageIndex]: [...existing, { ...noteData, content: "" }]
            };
            saveToStorage(notesKey, next);
            return next;
        });
    }, [notesKey]);

    const updateNote = useCallback((passageIndex, noteId, content) => {
        setAllNotes(prev => {
            const existing = prev[passageIndex] || [];
            const next = {
                ...prev,
                [passageIndex]: existing.map(n => n.id === noteId ? { ...n, content } : n)
            };
            saveToStorage(notesKey, next);
            return next;
        });
    }, [notesKey]);

    const deleteNote = useCallback((passageIndex, noteId, onNoteDeleted) => {
        setAllNotes(prev => {
            const existing = prev[passageIndex] || [];
            const noteToDelete = existing.find(n => n.id === noteId);

            if (onNoteDeleted) onNoteDeleted(noteToDelete);

            const next = {
                ...prev,
                [passageIndex]: existing.filter(n => n.id !== noteId)
            };
            saveToStorage(notesKey, next);
            return next;
        });
    }, [notesKey]);

    return {
        allHighlights,
        setAllHighlights,
        addHighlight,
        removeHighlight,
        allNotes,
        setAllNotes,
        addNote,
        updateNote,
        deleteNote
    };
};
