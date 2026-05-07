import React from "react";
import TagSelector from "../../ui/TagSelector";

const TestBasicInfo = ({ testData, setTestData, collections, isDark }) => {
    const handleTagsChange = (tags) => {
        setTestData(prev => ({ ...prev, tags }));
    };

    return (
        <div className={`p-5 rounded-2xl border mb-6 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-50">Asosiy Ma'lumotlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Test Nomi</label>
                    <input
                        type="text"
                        className={`w-full h-11 px-4 rounded-xl border outline-none transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={testData.title}
                        onChange={e => setTestData({ ...testData, title: e.target.value })}
                        placeholder="Masalan: Cambridge 18 Test 1"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Test Turi</label>
                    <select
                        className={`w-full h-11 px-4 rounded-xl border outline-none transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={testData.type}
                        onChange={e => setTestData({ ...testData, type: e.target.value })}
                    >
                        <option value="reading">Reading</option>
                        <option value="listening">Listening</option>
                        <option value="writing">Writing</option>
                        <option value="speaking">Speaking</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Qiyinchilik / Bo'lim</label>
                    <select
                        className={`w-full h-11 px-4 rounded-xl border outline-none transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={testData.difficulty}
                        onChange={e => setTestData({ ...testData, difficulty: e.target.value })}
                    >
                        {testData.type === 'listening' ? (
                            <>
                                <option value="full">Full Test (1-40)</option>
                                <option value="part 1">Part 1</option>
                                <option value="part 2">Part 2</option>
                                <option value="part 3">Part 3</option>
                                <option value="part 4">Part 4</option>
                            </>
                        ) : (
                            <>
                                <option value="easy">Passage 1 (Easy)</option>
                                <option value="medium">Passage 2 (Medium)</option>
                                <option value="hard">Passage 3 (Hard)</option>
                            </>
                        )}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Kolleksiya</label>
                    <select
                        className={`w-full h-11 px-4 rounded-xl border outline-none transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={testData.collectionId}
                        onChange={e => setTestData({ ...testData, collectionId: e.target.value })}
                    >
                        <option value="None">Hech qanday</option>
                        {collections.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs font-bold mb-1.5 block opacity-60">Taglar</label>
                    <TagSelector selectedTags={testData.tags || []} onTagsChange={handleTagsChange} />
                </div>
            </div>
        </div>
    );
};

export default TestBasicInfo;
