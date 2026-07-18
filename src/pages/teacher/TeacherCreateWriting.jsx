import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { Spinner } from '@phosphor-icons/react';

export default function TeacherCreateWriting() {
    const { theme } = useTheme();
    const { userData } = useAuth();
    const isDark = theme === 'dark';

    const [title, setTitle] = useState('');
    const [task1, setTask1] = useState('');
    const [task2, setTask2] = useState('');
    const [task1Image, setTask1Image] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [myGroups, setMyGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingGroups, setFetchingGroups] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // NEW DETAILED ASSIGNMENT STATES
    const [deadline, setDeadline] = useState("");
    const [maxAttempts, setMaxAttempts] = useState("1");
    const [teacherNote, setTeacherNote] = useState("");
    const [priority, setPriority] = useState("medium");

    // NEW STATES
    const [includeTask1, setIncludeTask1] = useState(true);
    const [includeTask2, setIncludeTask2] = useState(true);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
                const groupsSnap = await getDocs(q);
                const filteredGroups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMyGroups(filteredGroups);
            } catch (error) {
                console.error("Guruhlarni yuklashda xato:", error);
                setErrorMsg("Guruhlarni yuklashda xatolik yuz berdi");
            } finally {
                setFetchingGroups(false);
            }
        };

        if (userData) {
            fetchGroups();
        }
    }, [userData]);

    // Fetch existing templates for auto-fill
    useEffect(() => {
        const fetchTemplates = async () => {
            if (!userData) return;
            try {
                const q = query(
                    collection(db, 'writing_templates'),
                    where('createdBy', '==', userData.uid)
                );
                const snap = await getDocs(q);
                setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Templates loading error:", error);
            }
        };
        fetchTemplates();
    }, [userData]);

    const handleTemplateChange = (templateId) => {
        setSelectedTemplateId(templateId);
        if (!templateId) {
            setTitle('');
            setTask1('');
            setTask2('');
            setTask1Image(null);
            setImagePreview('');
            setIncludeTask1(true);
            setIncludeTask2(true);
            return;
        }
        const temp = templates.find(t => t.id === templateId);
        if (temp) {
            setTitle(temp.title || '');
            setTask1(temp.task1 || '');
            setTask2(temp.task2 || '');
            setIncludeTask1(temp.hasTask1 !== false);
            setIncludeTask2(temp.hasTask2 !== false);
            if (temp.task1ImageUrl) {
                setImagePreview(temp.task1ImageUrl);
            } else {
                setImagePreview('');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");
        
        if (!title.trim() || !selectedGroupId) {
            setErrorMsg("Iltimos, test nomi va guruhni tanlang");
            return;
        }

        if (!includeTask1 && !includeTask2) {
            setErrorMsg("Iltimos, kamida bitta Taskni tanlang (Task 1 yoki Task 2)");
            return;
        }

        if (includeTask1 && !task1.trim()) {
            setErrorMsg("Iltimos, Task 1 savolini to'ldiring");
            return;
        }

        if (includeTask2 && !task2.trim()) {
            setErrorMsg("Iltimos, Task 2 savolini to'ldiring");
            return;
        }

        setLoading(true);
        try {
            let task1ImageUrl = "";
            if (task1Image) {
                const imageRef = ref(storage, `writing_images/${Date.now()}_${task1Image.name}`);
                const metadata = { cacheControl: 'public,max-age=31536000' };
                await uploadBytes(imageRef, task1Image, metadata);
                task1ImageUrl = await getDownloadURL(imageRef);
            } else if (selectedTemplateId) {
                task1ImageUrl = templates.find(t => t.id === selectedTemplateId)?.task1ImageUrl || "";
            } else if (imagePreview && imagePreview.startsWith('http')) {
                task1ImageUrl = imagePreview;
            }

            // Create dynamic writingTasks array
            const writingTasks = [];
            if (includeTask1) {
                writingTasks.push({ 
                    id: 1, 
                    title: "Writing Task 1", 
                    prompt: task1.trim(), 
                    image: task1ImageUrl, 
                    minWords: 150 
                });
            }
            if (includeTask2) {
                writingTasks.push({ 
                    id: 2, 
                    title: "Writing Task 2", 
                    prompt: task2.trim(), 
                    image: "", 
                    minWords: 250 
                });
            }

            // 1. Yangi test yaratish
            const newTest = {
                title: title.trim(),
                type: 'writing',
                task1: includeTask1 ? task1.trim() : "",
                task2: includeTask2 ? task2.trim() : "",
                task1ImageUrl: task1ImageUrl,
                writingTasks: writingTasks,
                createdBy: userData.uid,
                createdAt: new Date().toISOString(),
                teacherName: userData.fullName || "Ustoz"
            };

            const testRef = await addDoc(collection(db, 'tests'), newTest);
            
            // Write to tests_metadata
            await setDoc(doc(db, "tests_metadata", testRef.id), {
                id: testRef.id,
                title: newTest.title,
                type: 'writing',
                difficulty: 'medium',
                duration: includeTask1 && includeTask2 ? 60 : includeTask1 ? 20 : 40,
                isExclusive: false,
                createdAt: newTest.createdAt,
                updatedAt: newTest.createdAt,
                questionTypes: ['Completion'],
                collectionId: null
            });
            
            // 2. Tanlangan guruhga tayinlash
            const groupRef = doc(db, 'groups', selectedGroupId);
            await updateDoc(groupRef, {
                assignedTests: arrayUnion({
                    id: testRef.id,
                    title: newTest.title,
                    type: 'writing',
                    date: new Date().toISOString(),
                    deadline: deadline ? new Date(deadline).toISOString() : null,
                    maxAttempts: Number(maxAttempts) || 1,
                    priority: priority,
                    teacherNote: teacherNote
                })
            });

            // Create feed post for the assigned writing test
            try {
                await addDoc(collection(db, "feed_posts"), {
                    type: "teacher_test",
                    title: "Sizning ustozingiz vazifa tayinladi",
                    content: newTest.title,
                    testId: testRef.id,
                    testType: 'writing',
                    groupId: selectedGroupId,
                    deadline: deadline ? new Date(deadline).toISOString() : null,
                    maxAttempts: Number(maxAttempts) || 1,
                    priority: priority,
                    teacherNote: teacherNote,
                    teacherId: userData.uid,
                    teacherName: userData.fullName || "Ustoz",
                    likes: [],
                    commentsCount: 0,
                    createdAt: serverTimestamp()
                });
            } catch (feedErr) {
                console.error("Error creating feed post for assigned writing test:", feedErr);
            }

            // 3. Shablon sifatida saqlash
            if (saveAsTemplate) {
                await addDoc(collection(db, 'writing_templates'), {
                    title: title.trim(),
                    task1: includeTask1 ? task1.trim() : "",
                    task2: includeTask2 ? task2.trim() : "",
                    task1ImageUrl: task1ImageUrl,
                    hasTask1: includeTask1,
                    hasTask2: includeTask2,
                    createdBy: userData.uid,
                    createdAt: new Date().toISOString()
                });
                
                // Refresh local templates
                const q = query(
                    collection(db, 'writing_templates'),
                    where('createdBy', '==', userData.uid)
                );
                const snap = await getDocs(q);
                setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }

            setSuccessMsg("Writing testi muvaffaqiyatli yaratildi va guruhga tayinlandi!");
            setTitle('');
            setTask1('');
            setTask2('');
            setTask1Image(null);
            setImagePreview('');
            setSelectedGroupId('');
            setSaveAsTemplate(false);
            setSelectedTemplateId('');
            setIncludeTask1(true);
            setIncludeTask2(true);
            setDeadline("");
            setMaxAttempts("1");
            setTeacherNote("");
            setPriority("medium");
        } catch (error) {
            console.error("Test yaratishda xato:", error);
            setErrorMsg("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = `w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
        isDark 
            ? 'bg-[#333333] border-white/10 text-white placeholder-gray-400' 
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
    }`;

    const labelClasses = `block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Yangi Writing Test Yaratish
                </h1>
                <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                    Test savollarini kiriting va guruhga tayinlang.
                </p>
            </div>

            {errorMsg && (
                <div className="bg-red-500/10 text-red-500 text-sm font-medium p-4 rounded-xl border border-red-500/20">
                    {errorMsg}
                </div>
            )}
            
            {successMsg && (
                <div className="bg-emerald-500/10 text-emerald-500 text-sm font-medium p-4 rounded-xl border border-emerald-500/20">
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className={`p-6 rounded-2xl shadow-sm border ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-100'} space-y-6`}>
                
                {/* Guruh tanlash */}
                <div>
                    <label className={labelClasses}>Guruhga tayinlash</label>
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className={inputClasses}
                        disabled={fetchingGroups}
                    >
                        <option value="">-- Guruhni tanlang --</option>
                        {myGroups.map(group => (
                            <option key={group.id} value={group.id}>
                                {group.name} {group.teacherName ? `(${group.teacherName})` : ''}
                            </option>
                        ))}
                    </select>
                    {fetchingGroups && <p className="text-xs text-emerald-500 mt-2">Guruhlar yuklanmoqda...</p>}
                    {!fetchingGroups && myGroups.length === 0 && (
                        <p className="text-xs text-red-500 mt-2">Sizda tayinlangan guruhlar yo'q.</p>
                    )}
                </div>

                {/* Shablon tanlash */}
                <div>
                    <label className={labelClasses}>Mavjud shablonlardan yuklash (ixtiyoriy)</label>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className={inputClasses}
                    >
                        <option value="">-- Yangi vazifa (shablonsiz) --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.title} ({(t.hasTask1 !== false && t.hasTask2 !== false) ? "Task 1 & 2" : t.hasTask1 !== false ? "Task 1" : "Task 2"})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Test Nomi */}
                <div>
                    <label className={labelClasses}>Test nomi</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Masalan: Test 1 Writing (Academic)"
                        className={inputClasses}
                    />
                </div>

                {/* Task Tanlash Checklist */}
                <div>
                    <label className={labelClasses}>Kiritiladigan vazifalar</label>
                    <div className="flex flex-wrap gap-6 py-2">
                        <label className={`flex items-center gap-2 cursor-pointer text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            <input
                                type="checkbox"
                                checked={includeTask1}
                                onChange={(e) => setIncludeTask1(e.target.checked)}
                                className="w-4 h-4 accent-emerald-500 rounded"
                            />
                            Task 1 ni kiritish (150 words)
                        </label>
                        <label className={`flex items-center gap-2 cursor-pointer text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            <input
                                type="checkbox"
                                checked={includeTask2}
                                onChange={(e) => setIncludeTask2(e.target.checked)}
                                className="w-4 h-4 accent-emerald-500 rounded"
                            />
                            Task 2 ni kiritish (250 words)
                        </label>
                    </div>
                </div>

                {/* Task 1 */}
                {includeTask1 && (
                    <div className="p-4 rounded-xl border border-gray-200/50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 space-y-4">
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Writing Task 1</h3>
                        <div>
                            <label className={labelClasses}>Task 1 savoli</label>
                            <textarea
                                value={task1}
                                onChange={(e) => setTask1(e.target.value)}
                                placeholder="Task 1 matnini kiriting..."
                                className={inputClasses}
                                rows={5}
                            />
                        </div>

                        {/* Task 1 Rasm yuklash */}
                        <div className="mt-4">
                            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors border ${
                                isDark 
                                    ? 'bg-[#333333] border-white/10 hover:bg-[#404040] text-gray-300' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                            }`}>
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                Rasm yuklash (Diagramma/Grafik)
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if(file) {
                                            setTask1Image(file);
                                            setImagePreview(URL.createObjectURL(file));
                                        }
                                    }} 
                                    className="hidden" 
                                />
                            </label>
                            {imagePreview && (
                                <div className="mt-4 relative inline-block">
                                    <img src={imagePreview} alt="Task 1 preview" className="h-32 w-auto object-contain rounded-lg border border-gray-200 dark:border-white/10" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTask1Image(null);
                                            setImagePreview('');
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition shadow-sm border-2 border-white dark:border-[#2C2C2C]"
                                        title="Rasmni o'chirish"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Task 2 */}
                {includeTask2 && (
                    <div className="p-4 rounded-xl border border-gray-200/50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 space-y-4">
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Writing Task 2</h3>
                        <div>
                            <label className={labelClasses}>Task 2 savoli</label>
                            <textarea
                                value={task2}
                                onChange={(e) => setTask2(e.target.value)}
                                placeholder="Task 2 matnini kiriting..."
                                className={inputClasses}
                                rows={5}
                            />
                        </div>
                    </div>
                )}

                {/* Qo'shimcha Vazifa Sozlamalari */}
                <div className="p-4 rounded-xl border border-gray-200/50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 space-y-4 text-left">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Qo'shimcha Vazifa Sozlamalari</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Deadline */}
                        <div>
                            <label className={labelClasses}>Deadline (Muddati)</label>
                            <input
                                type="datetime-local"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Max attempts */}
                        <div>
                            <label className={labelClasses}>Maksimal urinishlar</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={maxAttempts}
                                onChange={e => setMaxAttempts(e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Priority level */}
                        <div>
                            <label className={labelClasses}>Muhimlik darajasi</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className={inputClasses}
                            >
                                <option value="low">Past (Low)</option>
                                <option value="medium">O'rtacha (Medium)</option>
                                <option value="high">Yuqori (High)</option>
                            </select>
                        </div>
                    </div>

                    {/* Teacher Note / Instructions */}
                    <div>
                        <label className={labelClasses}>O'quvchilarga eslatma / izoh</label>
                        <textarea
                            value={teacherNote}
                            onChange={e => setTeacherNote(e.target.value)}
                            placeholder="Masalan: Ushbu Writing testining har bir qismini vaqt limitiga rioya qilgan holda yozing..."
                            rows={3}
                            className={inputClasses}
                        />
                    </div>
                </div>

                {/* Shablon sifatida saqlash checkbox */}
                <div className="py-2 border-t border-dashed border-gray-200 dark:border-white/10">
                    <label className={`flex items-center gap-2 cursor-pointer text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <input
                            type="checkbox"
                            checked={saveAsTemplate}
                            onChange={(e) => setSaveAsTemplate(e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded"
                        />
                        Kelajakda qayta foydalanish uchun shablon sifatida saqlash
                    </label>
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-dashed border-gray-200 dark:border-white/10">
                    <button
                        type="submit"
                        disabled={loading || myGroups.length === 0}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
                            ${loading || myGroups.length === 0
                                ? 'bg-emerald-600/50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 active:scale-[0.98]'
                            }
                        `}
                    >
                        {loading && <Spinner className="animate-spin" size={20} />}
                        {loading ? 'Yaratilmoqda...' : 'Testni Saqlash va Tayinlash'}
                    </button>
                </div>
            </form>
        </div>
    );
}
