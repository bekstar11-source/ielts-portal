import React from 'react';
import { Music, Play, Upload, Image as ImageIcon } from 'lucide-react';

export const MediaAssetsSection = ({ 
    form, setForm, thumbRef, fileRef, handleFileUpload, thumbProgress, uploadProgress 
}) => (
    <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Music size={16} className="text-emerald-600" />
            </div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Media Assets</h2>
        </div>

        <div className="space-y-6">
            {/* Media Type Toggle */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">Media Type</label>
                <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
                    {['audio', 'video', 'youtube'].map(type => (
                        <button 
                            key={type}
                            onClick={() => setForm(f => ({ ...f, mediaType: type }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${form.mediaType === type ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            {type === 'audio' ? <Music size={14} /> : type === 'video' ? <Play size={14} /> : <Music size={14} className="rotate-90" />}
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Thumbnail */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Cover Artwork</label>
                <div 
                    onClick={() => thumbRef.current.click()}
                    className="relative aspect-square w-full bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all group overflow-hidden"
                >
                    <input ref={thumbRef} type="file" accept="image/*" hidden onChange={e => handleFileUpload(e.target.files[0], 'thumb')} />
                    {form.thumbnail ? (
                        <img src={form.thumbnail} className="w-full h-full object-cover" alt="Thumb" />
                    ) : (
                        <>
                            <ImageIcon className="text-zinc-300 group-hover:text-emerald-500 mb-2" size={32} />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Upload Thumbnail</span>
                        </>
                    )}
                    {thumbProgress > 0 && <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all" style={{ width: `${thumbProgress}%` }} />}
                </div>
            </div>

            {/* Audio/Video Source */}
            {form.mediaType !== 'youtube' ? (
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">
                        {form.mediaType === 'audio' ? 'Audio Source (URL)' : 'Video Source (URL)'}
                    </label>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-[10px] font-mono"
                            placeholder="https://..."
                            value={form.audioUrl}
                            onChange={e => setForm(f => ({ ...f, audioUrl: e.target.value }))}
                        />
                        <button 
                            onClick={() => fileRef.current.click()}
                            className="p-3 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            <Upload size={16} />
                        </button>
                        <input 
                            ref={fileRef} 
                            type="file" 
                            accept={form.mediaType === 'audio' ? "audio/*" : "video/*"} 
                            hidden 
                            onChange={e => handleFileUpload(e.target.files[0], 'audio')} 
                        />
                    </div>
                    {uploadProgress > 0 && <div className="w-full h-1 bg-zinc-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${uploadProgress}%` }} /></div>}
                </div>
            ) : (
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">YouTube Video ID / URL</label>
                    <input 
                        className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-rose-500 transition-all text-xs font-medium"
                        placeholder="Paste YouTube link or Embed code here..."
                        value={form.youtubeId}
                        onChange={e => {
                            const val = e.target.value;
                            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                            const match = val.match(regExp);
                            if (match && match[2].length === 11) setForm(f => ({ ...f, youtubeId: match[2] }));
                            else if (val.length === 11) setForm(f => ({ ...f, youtubeId: val }));
                            else setForm(f => ({ ...f, youtubeId: val }));
                        }}
                    />
                    <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-tight">Video ID: <span className="text-rose-500">{form.youtubeId?.length === 11 ? form.youtubeId : 'Not detected'}</span></p>
                </div>
            )}

            {/* Show Video Toggle */}
            {form.mediaType !== 'audio' && (
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Video Display</label>
                            <p className="text-xs font-bold text-zinc-600">{form.showVideo ? 'Video + Script' : 'Audio Script Only'}</p>
                        </div>
                        <button 
                            onClick={() => setForm(f => ({ ...f, showVideo: !f.showVideo }))}
                            className={`w-12 h-6 rounded-full transition-all relative ${form.showVideo ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.showVideo ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    </section>
);
