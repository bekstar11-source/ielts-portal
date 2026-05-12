import React from 'react';
import { Settings } from 'lucide-react';

export const GeneralInfoSection = ({ form, setForm, collections }) => (
    <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Settings size={16} className="text-emerald-600" />
            </div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-500">General Info</h2>
        </div>
        
        <div className="space-y-5">
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Podcast Title</label>
                <input 
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-sm font-medium"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Enter title..."
                />
            </div>
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Episode Description</label>
                <textarea 
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-sm font-medium min-h-[80px]"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Enter episode summary..."
                />
            </div>
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">CEFR Level</label>
                <div className="grid grid-cols-5 gap-2">
                    {["A2", "B1", "B2", "C1", "C2"].map(l => (
                        <button 
                            key={l}
                            onClick={() => setForm(f => ({ ...f, level: l }))}
                            className={`py-2 rounded-lg text-xs font-bold transition-all border ${form.level === l ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Group / Collection</label>
                <select 
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-sm font-medium"
                    value={form.collectionId}
                    onChange={e => setForm(f => ({ ...f, collectionId: e.target.value }))}
                >
                    <option value="None">None (Independent)</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
        </div>
    </section>
);
