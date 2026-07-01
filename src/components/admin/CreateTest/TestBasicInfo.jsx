import React from "react";
import TagSelector from "../../ui/TagSelector";

const Toggle = ({ label, hint, value, onChange, isDark }) => (
    <div className="flex items-center justify-between py-2.5">
        <div>
            <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            {hint && <p className="text-[10px] opacity-40 mt-0.5">{hint}</p>}
        </div>
        <button
            onClick={() => onChange(!value)}
            className={`w-10 h-5 rounded-full p-1 transition-all duration-300 shrink-0 ${value ? 'bg-blue-600' : 'bg-gray-400'}`}
        >
            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const TestBasicInfo = ({
    testData,
    setTestData,
    collections,
    isDark,
    isFree,
    setIsFree,
    isMockMode,
    setIsMockMode,
    publishToFeed,
    setPublishToFeed,
    isEditMode,
}) => {
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
                                <option value="full">To'liq Test (1-40)</option>
                                <option value="part 1">1-qism</option>
                                <option value="part 2">2-qism</option>
                                <option value="part 3">3-qism</option>
                                <option value="part 4">4-qism</option>
                            </>
                        ) : (
                            <>
                                <option value="easy">1-matn (Oson)</option>
                                <option value="medium">2-matn (O'rta)</option>
                                <option value="hard">3-matn (Qiyin)</option>
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
                    <TagSelector selectedTags={testData.tags || []} onChange={handleTagsChange} />
                </div>
            </div>

            {/* Test Sozlamalari */}
            <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Test Sozlamalari</h4>
                <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                    <Toggle
                        label="Bepulmi?"
                        hint="Barcha foydalanuvchilar bepul ochishi mumkin"
                        value={isFree}
                        onChange={setIsFree}
                        isDark={isDark}
                    />
                    <Toggle
                        label="Eksklyuzivmi?"
                        hint="Mock imtihon sifatida ko'rsatiladi"
                        value={isMockMode}
                        onChange={setIsMockMode}
                        isDark={isDark}
                    />
                    {!isEditMode && (
                        <Toggle
                            label="Feedga post qilish?"
                            hint="Saqlanganda yangilik sifatida e'lon qilinadi"
                            value={publishToFeed}
                            onChange={setPublishToFeed}
                            isDark={isDark}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestBasicInfo;
