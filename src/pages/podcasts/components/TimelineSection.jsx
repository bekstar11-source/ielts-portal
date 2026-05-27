import React from 'react';
import { Clock, Plus, Headphones, Type, HelpCircle, FileText, Target, Trash2, CheckCircle2 } from 'lucide-react';

const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const TimelineItem = ({ seg, currentTime, updateSegment, deleteSegment }) => (
    <div className="group relative bg-white border border-zinc-200 rounded-xl p-4 hover:border-emerald-200 hover:shadow-md transition-all duration-300">
        <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2">
                <div className="bg-zinc-50 border border-zinc-100 px-2 py-1 rounded font-mono text-[10px] font-bold text-zinc-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    {formatTime(seg.time)}
                </div>
                <div className={`p-2 rounded-lg ${seg.type === 'text' ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    {seg.type === 'text' ? <Type size={14} /> : seg.type === 'mcq' ? <HelpCircle size={14} /> : seg.type === 'gapfill' ? <FileText size={14} /> : <Target size={14} />}
                </div>
            </div>

            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-zinc-400 transition-colors">
                        {seg.type === 'text' ? 'Transcript Segment' : seg.type === 'mcq' ? 'Multiple Choice Question' : seg.type === 'gapfill' ? 'Gap-fill Challenge' : 'Sentence Completion Challenge'}
                    </span>
                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => updateSegment(seg.id, { time: Math.floor(currentTime) })}
                            className="p-2 md:p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                            title="Set to current playback time"
                        >
                            <Clock size={14} className="md:w-3 md:h-3" />
                        </button>
                        <button 
                            onClick={() => deleteSegment(seg.id)}
                            className="p-2 md:p-1.5 hover:bg-rose-50 text-rose-500 rounded transition-colors"
                        >
                            <Trash2 size={14} className="md:w-3 md:h-3" />
                        </button>
                    </div>
                </div>

                {seg.type === 'text' ? (
                    <textarea 
                        className="w-full bg-transparent border-none text-sm font-medium resize-none outline-none leading-relaxed text-zinc-700"
                        value={seg.text}
                        onChange={e => updateSegment(seg.id, { text: e.target.value })}
                        placeholder="Type transcript text here..."
                        rows={2}
                    />
                ) : seg.type === 'mcq' ? (
                    <div className="space-y-3 pt-1">
                        <input 
                            className="w-full bg-zinc-50 border border-zinc-100 p-2 rounded-lg text-sm font-bold outline-none focus:bg-white focus:border-emerald-200 transition-all"
                            value={seg.data.question}
                            onChange={e => updateSegment(seg.id, { data: { ...seg.data, question: e.target.value } })}
                            placeholder="Enter question..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {seg.data.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex gap-2 items-center">
                                    <button 
                                        onClick={() => updateSegment(seg.id, { data: { ...seg.data, correctIndex: oIdx } })}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${seg.data.correctIndex === oIdx ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-200'}`}
                                    >
                                        {seg.data.correctIndex === oIdx && <CheckCircle2 size={12} className="text-white" />}
                                    </button>
                                    <input 
                                        className="flex-1 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-lg text-xs font-medium outline-none"
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...seg.data.options];
                                            newOpts[oIdx] = e.target.value;
                                            updateSegment(seg.id, { data: { ...seg.data, options: newOpts } });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 pt-1">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-zinc-400">Sentence with {"{{gap}}"}</label>
                            <input 
                                className="w-full bg-zinc-50 border border-zinc-100 p-2 rounded-lg text-sm font-medium outline-none"
                                value={seg.data.text}
                                onChange={e => updateSegment(seg.id, { data: { ...seg.data, text: e.target.value } })}
                                placeholder="e.g. The sky is {{gap}} today."
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-zinc-400">Correct Answer</label>
                            <input 
                                className="w-full bg-emerald-50/30 border border-emerald-100 p-2 rounded-lg text-sm font-bold text-emerald-700 outline-none"
                                value={seg.data.answer}
                                onChange={e => updateSegment(seg.id, { data: { ...seg.data, answer: e.target.value } })}
                                placeholder="e.g. blue"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);

export const TimelineSection = ({ segments, addSegment, updateSegment, deleteSegment, currentTime }) => (
    <div className="space-y-4 h-full flex flex-col">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <Clock size={16} className="text-emerald-600" />
                    Interactive Timeline
                </h3>
                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-bold uppercase">{segments.length} Items</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button onClick={() => addSegment('text')} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-lg hover:bg-zinc-800 transition-colors">
                    <Plus size={12} /> Transcript
                </button>
                <button onClick={() => addSegment('mcq')} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                    <Plus size={12} /> MCQ
                </button>
                <button onClick={() => addSegment('gapfill')} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                    <Plus size={12} /> Gap-fill
                </button>
                <button onClick={() => addSegment('completion')} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                    <Plus size={12} /> Completion
                </button>
            </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {segments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50 space-y-4">
                    <div className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl">
                        <Headphones size={48} strokeWidth={1} />
                    </div>
                    <p className="text-sm font-medium italic">No segments added yet.</p>
                </div>
            ) : (
                segments.map(seg => (
                    <TimelineItem 
                        key={seg.id} 
                        seg={seg} 
                        currentTime={currentTime} 
                        updateSegment={updateSegment} 
                        deleteSegment={deleteSegment} 
                    />
                ))
            )}
        </div>
    </div>
);
