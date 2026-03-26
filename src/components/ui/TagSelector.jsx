import React, { useState } from 'react';
import { X, Plus, Hash } from 'lucide-react';

export default function TagSelector({ selectedTags = [], onChange, isDark }) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
    };

    const addTag = () => {
        const tag = inputValue.trim().replace(/^#/, "");
        if (tag && !selectedTags.includes(tag)) {
            onChange([...selectedTags, tag]);
            setInputValue("");
        }
    };

    const removeTag = (tagToRemove) => {
        onChange(selectedTags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="flex flex-col gap-3">
            <div className={`flex flex-wrap gap-2 p-2 rounded-xl border transition-all ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-gray-200'} focus-within:border-[#3772FF] focus-within:ring-4 focus-within:ring-[#3772FF]/10`}>
                {selectedTags.map((tag, idx) => (
                    <div 
                        key={idx} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isDark 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}
                    >
                        <span>#{tag}</span>
                        <button 
                            onClick={(e) => { e.preventDefault(); removeTag(tag); }}
                            className="hover:text-red-500 transition-colors"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                ))}
                
                <div className="flex-1 min-w-[120px] flex items-center gap-2 px-1">
                    <span className="text-gray-400 font-bold text-sm">#</span>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Hashtag qo'shing..."
                        className="w-full bg-transparent border-none outline-none text-sm placeholder:text-gray-500 py-1"
                    />
                </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 ml-1 italic">
                Enter yoki vergul bosib hashtagni tasdiqlang. Masalan: cambridge18, reading, passage1
            </p>
        </div>
    );
}
