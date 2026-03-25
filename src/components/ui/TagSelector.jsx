import React from 'react';

const TAG_COLORS = [
    { id: 'red', color: '#FF5F57', label: 'Muhim', bg: 'bg-[#FF5F57]/10', border: 'border-[#FF5F57]/20', text: 'text-[#FF5F57]' },
    { id: 'orange', color: '#FFBD2E', label: 'Kutilmoqda', bg: 'bg-[#FFBD2E]/10', border: 'border-[#FFBD2E]/20', text: 'text-[#FFBD2E]' },
    { id: 'yellow', color: '#FFD166', label: 'Ko\'rib chiqish', bg: 'bg-[#FFD166]/10', border: 'border-[#FFD166]/20', text: 'text-[#FFD166]' },
    { id: 'green', color: '#27C93F', label: 'Tayyor', bg: 'bg-[#27C93F]/10', border: 'border-[#27C93F]/20', text: 'text-[#27C93F]' },
    { id: 'blue', color: '#1A73E8', label: 'Yangi', bg: 'bg-[#1A73E8]/10', border: 'border-[#1A73E8]/20', text: 'text-[#1A73E8]' },
    { id: 'purple', color: '#9757D7', label: 'Arxiv', bg: 'bg-[#9757D7]/10', border: 'border-[#9757D7]/20', text: 'text-[#9757D7]' },
    { id: 'gray', color: '#8E8E93', label: 'Boshqa', bg: 'bg-[#8E8E93]/10', border: 'border-[#8E8E93]/20', text: 'text-[#8E8E93]' },
];

import { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export default function TagSelector({ selectedTags = [], onChange, isDark, allowEdit = false }) {
    const [tagLabels, setTagLabels] = useState({});
    const [editingLabelId, setEditingLabelId] = useState(null);
    const [tempLabel, setTempLabel] = useState("");

    const fetchLabels = async () => {
        try {
            const docSnap = await getDoc(doc(db, "tests", "tag_metadata"));
            if (docSnap.exists()) {
                setTagLabels(docSnap.data());
            } else {
                const defaults = {};
                TAG_COLORS.forEach(t => defaults[t.id] = t.label);
                setTagLabels(defaults);
            }
        } catch (err) {
            console.warn("Tag labels fetch error:", err.message);
            const defaults = {};
            TAG_COLORS.forEach(t => defaults[t.id] = t.label);
            setTagLabels(defaults);
        }
    };

    useEffect(() => {
        fetchLabels();
    }, []);

    const saveLabel = async (id) => {
        const newLabels = { ...tagLabels, [id]: tempLabel };
        setTagLabels(newLabels);
        try {
            await setDoc(doc(db, "tests", "tag_metadata"), newLabels);
            setEditingLabelId(null);
        } catch (err) {
            alert("Nomni saqlashda xatolik: " + err.message);
        }
    };
    const toggleTag = (tagId) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(id => id !== tagId));
        } else {
            onChange([...selectedTags, tagId]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                const currentLabel = tagLabels[tag.id] || tag.label;

                return (
                    <div key={tag.id} className="flex items-center gap-1 group/tag">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                toggleTag(tag.id);
                            }}
                            className={`
                                flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold transition-all duration-200
                                ${isSelected 
                                    ? `${tag.bg} ${tag.border} ${tag.text} ring-1 ring-offset-1 ${isDark ? 'ring-offset-[#1E1E1E]' : 'ring-offset-white'} ${tag.id === 'blue' ? 'ring-[#1A73E8]' : 'ring-' + tag.color}` 
                                    : isDark 
                                        ? 'bg-[#2C2C2C] border-white/10 text-gray-400 hover:border-white/20' 
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}
                            `}
                            title={currentLabel}
                        >
                            <div 
                                className="w-1.5 h-1.5 rounded-full shadow-sm" 
                                style={{ backgroundColor: tag.color }}
                            />
                            {editingLabelId === tag.id ? (
                                <input 
                                    autoFocus
                                    className="bg-transparent border-none outline-none w-16"
                                    value={tempLabel}
                                    onChange={(e) => setTempLabel(e.target.value)}
                                    onBlur={() => saveLabel(tag.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveLabel(tag.id)}
                                />
                            ) : (
                                <span>{currentLabel}</span>
                            )}
                        </button>
                        {allowEdit && editingLabelId !== tag.id && (
                            <button 
                                onClick={() => { setEditingLabelId(tag.id); setTempLabel(currentLabel); }}
                                className="opacity-0 group-hover/tag:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 text-gray-400"
                            >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export { TAG_COLORS };
