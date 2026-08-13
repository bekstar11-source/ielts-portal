import React from "react";

const WritingSection = ({ 
    testData, activeWritingTask, setActiveWritingTask, 
    handleWritingUpdate, handleWritingImageUpload,
    uploading, uploadingPart,
    isDark 
}) => {
    const activeTask = testData.writingTasks?.[activeWritingTask] || {};

    return (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-50">Writing Tasklar</h3>
            
            <div className="flex gap-2 mb-6 p-1 rounded-xl bg-gray-500/5">
                {testData.writingTasks?.map((task, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveWritingTask(idx)}
                        className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${activeWritingTask === idx ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                        {task.title || `Task ${idx + 1}`}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Task Nomi</label>
                    <input
                        type="text"
                        className={`w-full h-10 px-4 rounded-xl border outline-none text-xs ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                        value={activeTask.title || ""}
                        onChange={e => handleWritingUpdate('title', e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Savol Matni (Prompt)</label>
                    <textarea
                        className={`w-full h-32 p-4 rounded-xl border outline-none text-xs resize-none ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                        value={activeTask.prompt || ""}
                        onChange={e => handleWritingUpdate('prompt', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold mb-1.5 block opacity-60">Minimal So'zlar</label>
                        <input
                            type="number"
                            className={`w-full h-10 px-4 rounded-xl border outline-none text-xs ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                            value={activeTask.minWords || ""}
                            onChange={e => handleWritingUpdate('minWords', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold mb-1.5 block opacity-60">Task Rasmi (ixtiyoriy)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className={`flex-1 h-10 px-4 rounded-xl border outline-none text-xs ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                                value={activeTask.image || ""}
                                onChange={e => handleWritingUpdate('image', e.target.value)}
                                placeholder="URL..."
                            />
                            <label
                                title="Rasm yuklash"
                                className={`h-10 px-4 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-500 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <input type="file" className="hidden" accept="image/*" onChange={handleWritingImageUpload} disabled={uploading} />
                                {uploading && uploadingPart === 'writing' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="text-[10px] font-bold">Yuklash</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                {activeTask.image && (
                    <div className={`relative mt-4 p-2 rounded-xl border flex justify-center ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                        <img src={activeTask.image} alt="Writing Task" className="max-h-[200px] object-contain" />
                        <button
                            type="button"
                            onClick={() => handleWritingUpdate('image', '')}
                            aria-label="Rasmni olib tashlash"
                            className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 text-white text-xs font-bold flex items-center justify-center hover:bg-red-500 transition"
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(WritingSection);
