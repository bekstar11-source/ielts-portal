import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Hash } from 'lucide-react';
import {
    normalizeArticleCategory,
    formatArticleCategoryHashtag,
} from '../../../utils/articleCategory';

export default function CategoryHashtagInput({
    value,
    onChange,
    existingCategories = [],
    required = false,
    placeholder = 'Masalan: Science',
}) {
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    const normalizedValue = normalizeArticleCategory(value);
    const inputValue = normalizedValue ? formatArticleCategoryHashtag(normalizedValue) : '';

    const filtered = useMemo(() => {
        const q = normalizedValue.toLowerCase();
        if (!q) return existingCategories;
        return existingCategories.filter((cat) => cat.toLowerCase().includes(q));
    }, [existingCategories, normalizedValue]);

    // Ro'yxat qisqarganda tanlangan indeks chegaradan chiqib ketmasligi uchun
    const highlight = highlightIndex < filtered.length ? highlightIndex : 0;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyCategory = (cat) => {
        onChange(normalizeArticleCategory(cat));
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleInputChange = (e) => {
        let raw = e.target.value;
        if (raw && !raw.startsWith('#')) {
            raw = `#${raw}`;
        }
        const inner = raw.startsWith('#') ? raw.slice(1).trimStart() : raw.trim();
        onChange(inner);
        setHighlightIndex(0);
        setOpen(true);
    };

    const handleFocus = () => {
        setOpen(true);
    };

    const handleKeyDown = (e) => {
        if (!open || filtered.length === 0) {
            if (e.key === 'ArrowDown' && existingCategories.length > 0) {
                setOpen(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => ((i < filtered.length ? i : 0) + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => ((i < filtered.length ? i : 0) - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter' && filtered[highlight]) {
            e.preventDefault();
            applyCategory(filtered[highlight]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const showDropdown = open && existingCategories.length > 0;

    return (
        <div ref={wrapperRef} className="relative space-y-2">
            <div className="relative">
                <Hash
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
                    size={16}
                />
                <input
                    ref={inputRef}
                    required={required}
                    type="text"
                    className="w-full bg-gray-50 dark:bg-[#252320] border-none rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-gray-900 dark:text-white"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />

                {showDropdown && (
                    <ul className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-[#252320] border border-black/[0.06] dark:border-white/[0.08] rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? (
                            filtered.map((cat, idx) => (
                                <li key={cat}>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => applyCategory(cat)}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                                            idx === highlight
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-800 dark:text-warm-on-dark hover:bg-gray-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {formatArticleCategoryHashtag(cat)}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-2.5 text-xs text-gray-400">
                                Mos kategoriya topilmadi — Enter bilan yangi saqlanadi
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {existingCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {existingCategories.slice(0, 12).map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => applyCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                normalizedValue === cat
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-warm-on-dark-soft hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                        >
                            {formatArticleCategoryHashtag(cat)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
