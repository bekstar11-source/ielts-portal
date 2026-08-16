import React from 'react';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import { Trash2, ArrowUp, ArrowDown, Heading1, Pilcrow, Copy } from 'lucide-react';
import { makeEmptyContentBlock } from '../../../utils/articleLevels';
import { stripHtml } from '../../../utils/textUtils';

const QUILL_MODULES = {
    toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
    ],
};

const countWords = (text) => stripHtml(text || '').split(/\s+/).filter(Boolean).length;

/**
 * Bitta daraja uchun kontent bloklari muharriri.
 * Bloklarni qo'shish, tartibini o'zgartirish, nusxalash va o'chirish imkonini beradi.
 */
const ArticleContentBlocks = ({ blocks = [], onChange }) => {
    const addBlock = (type) => onChange([...blocks, makeEmptyContentBlock(type)]);

    const updateBlock = (index, text) => {
        const next = [...blocks];
        next[index] = { ...next[index], text };
        onChange(next);
    };

    const removeBlock = (index) => {
        const next = blocks.filter((_, i) => i !== index);
        onChange(next.length ? next : [makeEmptyContentBlock('paragraph')]);
    };

    const duplicateBlock = (index) => {
        const next = [...blocks];
        next.splice(index + 1, 0, { ...blocks[index] });
        onChange(next);
    };

    const moveBlock = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= blocks.length) return;
        const next = [...blocks];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const totalWords = blocks.reduce((acc, b) => acc + countWords(b?.text), 0);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Maqola matni
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-500 dark:text-warm-on-dark-soft">
                        {blocks.length} blok · {totalWords} so&apos;z
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => addBlock('heading')}
                        className="px-2.5 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                        <Heading1 size={12} /> Sarlavha
                    </button>
                    <button
                        type="button"
                        onClick={() => addBlock('paragraph')}
                        className="px-2.5 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                        <Pilcrow size={12} /> Paragraf
                    </button>
                </div>
            </div>

            <div className="space-y-2.5">
                {blocks.map((block, idx) => (
                    <div
                        key={idx}
                        className="group bg-gray-50/60 dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.05] overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.03] dark:border-white/[0.04]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                {block.type === 'heading' ? <Heading1 size={11} /> : <Pilcrow size={11} />}
                                {block.type === 'heading' ? 'Sarlavha' : 'Paragraf'}
                                <span className="text-gray-300 dark:text-warm-muted">·</span>
                                <span className="font-medium normal-case tracking-normal">
                                    {countWords(block.text)} so&apos;z
                                </span>
                            </span>
                            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    title="Yuqoriga"
                                    disabled={idx === 0}
                                    onClick={() => moveBlock(idx, -1)}
                                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 disabled:opacity-25 disabled:hover:bg-transparent"
                                >
                                    <ArrowUp size={13} />
                                </button>
                                <button
                                    type="button"
                                    title="Pastga"
                                    disabled={idx === blocks.length - 1}
                                    onClick={() => moveBlock(idx, 1)}
                                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 disabled:opacity-25 disabled:hover:bg-transparent"
                                >
                                    <ArrowDown size={13} />
                                </button>
                                <button
                                    type="button"
                                    title="Nusxalash"
                                    onClick={() => duplicateBlock(idx)}
                                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
                                >
                                    <Copy size={13} />
                                </button>
                                <button
                                    type="button"
                                    title="O'chirish"
                                    onClick={() => removeBlock(idx)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        <div className="p-3">
                            {block.type === 'heading' ? (
                                <input
                                    type="text"
                                    placeholder="Bo'lim sarlavhasi..."
                                    className="w-full bg-white dark:bg-[#252320] border border-black/[0.05] dark:border-white/[0.06] rounded-lg px-3 py-2.5 text-base font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/40 outline-none"
                                    value={block.text}
                                    onChange={(e) => updateBlock(idx, e.target.value)}
                                />
                            ) : (
                                <div className="bg-white dark:bg-[#252320] rounded-lg overflow-hidden border border-black/[0.05] dark:border-white/[0.06] article-quill">
                                    <ReactQuill
                                        theme="snow"
                                        value={block.text}
                                        onChange={(content) => updateBlock(idx, content)}
                                        modules={QUILL_MODULES}
                                        placeholder="Paragraf matni..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ArticleContentBlocks;
