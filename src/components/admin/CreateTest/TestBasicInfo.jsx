import React from "react";
import TagSelector from "../../ui/TagSelector";

const TYPES = [
    { value: 'reading', label: 'Reading', icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { value: 'listening', label: 'Listening', icon: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" },
    { value: 'writing', label: 'Writing', icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
    { value: 'speaking', label: 'Speaking', icon: "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" },
];

const DIFFICULTY_OPTIONS = {
    listening: [
        { value: 'full', label: "To'liq Test (1-40)" },
        { value: 'part 1', label: '1-qism' },
        { value: 'part 2', label: '2-qism' },
        { value: 'part 3', label: '3-qism' },
        { value: 'part 4', label: '4-qism' },
    ],
    default: [
        { value: 'easy', label: '1-matn (Oson)' },
        { value: 'medium', label: "2-matn (O'rta)" },
        { value: 'hard', label: '3-matn (Qiyin)' },
    ],
};

const Toggle = ({ id, label, hint, value, onChange, isDark }) => (
    <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!value)}
        className={`w-full flex items-center justify-between gap-4 py-2.5 px-1 -mx-1 rounded-lg text-left transition ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}
    >
        <span className="min-w-0">
            <span id={`${id}-label`} className={`block text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            {hint && <span className="block text-[10px] opacity-40 mt-0.5">{hint}</span>}
        </span>
        <span className={`w-10 h-5 rounded-full p-1 flex items-center transition-all duration-300 shrink-0 ${value ? 'bg-blue-600' : (isDark ? 'bg-white/15' : 'bg-gray-300')}`}>
            <span className={`w-3 h-3 bg-white rounded-full shadow transition-transform duration-300 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
    </button>
);

const Field = ({ id, label, hint, required, children }) => (
    <div>
        <label htmlFor={id} className="text-xs font-bold mb-1.5 flex items-center gap-1 opacity-60">
            {label}
            {required && <span className="text-red-500" title="Majburiy maydon">*</span>}
        </label>
        {children}
        {hint && <p className="text-[10px] opacity-40 mt-1">{hint}</p>}
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
    onTypeChangeRequest,
}) => {
    const inputCls = `w-full h-11 px-4 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#181715] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`;
    const titleMissing = !testData.title || !testData.title.trim();

    const difficultyOptions = testData.type === 'listening' ? DIFFICULTY_OPTIONS.listening : DIFFICULTY_OPTIONS.default;
    const difficultyValid = difficultyOptions.some(o => o.value === testData.difficulty);

    const handleTagsChange = (tags) => {
        setTestData(prev => ({ ...prev, tags }));
    };

    // Test turi o'zgarganda "difficulty" eski ro'yxatdan qolib ketmasligi kerak —
    // aks holda select bo'sh ko'rinadi va noto'g'ri qiymat saqlanadi.
    const applyTypeChange = (type) => {
        setTestData(prev => {
            const opts = type === 'listening' ? DIFFICULTY_OPTIONS.listening : DIFFICULTY_OPTIONS.default;
            const stillValid = opts.some(o => o.value === prev.difficulty);
            return {
                ...prev,
                type,
                difficulty: stillValid ? prev.difficulty : opts[type === 'listening' ? 0 : 1].value,
            };
        });
    };

    // Tur o'zgarishi passage/savol tuzilmasini yaroqsiz qilib qo'yishi mumkin —
    // sahifa tasdiq so'rashi uchun avval unga xabar beramiz.
    const handleTypeChange = (type) => {
        if (type === testData.type) return;
        if (onTypeChangeRequest) { onTypeChangeRequest(type, () => applyTypeChange(type)); return; }
        applyTypeChange(type);
    };

    return (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-50">Asosiy Ma'lumotlar</h3>

            {/* TEST TURI — segmented */}
            <div className="mb-4">
                <span className="text-xs font-bold mb-1.5 block opacity-60">Test Turi</span>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl ${isDark ? 'bg-[#181715]' : 'bg-gray-100'}`}>
                    {TYPES.map(t => {
                        const active = testData.type === t.value;
                        return (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => handleTypeChange(t.value)}
                                aria-pressed={active}
                                className={`h-10 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold transition ${active ? 'bg-blue-600 text-white shadow-md' : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-white')}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                </svg>
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <Field id="test-title" label="Test Nomi" required>
                        <input
                            id="test-title"
                            type="text"
                            className={`${inputCls} ${titleMissing ? 'border-red-500/40 focus:border-red-500' : ''}`}
                            value={testData.title}
                            onChange={e => setTestData({ ...testData, title: e.target.value })}
                            placeholder="Masalan: Cambridge 18 Test 1"
                        />
                    </Field>
                    {titleMissing && (
                        <p className="text-[10px] font-bold text-red-500 mt-1.5">Test nomisiz saqlab bo'lmaydi</p>
                    )}
                </div>

                <Field id="test-difficulty" label="Qiyinchilik / Bo'lim">
                    <select
                        id="test-difficulty"
                        className={`${inputCls} ${!difficultyValid ? 'border-amber-500/50' : ''}`}
                        value={difficultyValid ? testData.difficulty : ''}
                        onChange={e => setTestData({ ...testData, difficulty: e.target.value })}
                    >
                        {!difficultyValid && <option value="" disabled>Tanlang...</option>}
                        {difficultyOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </Field>

                <Field id="test-collection" label="Kolleksiya">
                    <select
                        id="test-collection"
                        className={inputCls}
                        value={testData.collectionId}
                        onChange={e => setTestData({ ...testData, collectionId: e.target.value })}
                    >
                        <option value="None">Hech qanday</option>
                        {collections.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </Field>

                <div className="md:col-span-2">
                    <span className="text-xs font-bold mb-1.5 block opacity-60">Taglar</span>
                    <TagSelector selectedTags={testData.tags || []} onChange={handleTagsChange} />
                </div>
            </div>

            {/* Test Sozlamalari */}
            <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Test Sozlamalari</h4>
                <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                    <Toggle
                        id="toggle-free"
                        label="Bepulmi?"
                        hint="Barcha foydalanuvchilar bepul ochishi mumkin"
                        value={isFree}
                        onChange={setIsFree}
                        isDark={isDark}
                    />
                    <Toggle
                        id="toggle-exclusive"
                        label="Eksklyuzivmi?"
                        hint="Mock imtihon sifatida ko'rsatiladi"
                        value={isMockMode}
                        onChange={setIsMockMode}
                        isDark={isDark}
                    />
                    {!isEditMode && (
                        <Toggle
                            id="toggle-feed"
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

export default React.memo(TestBasicInfo);
