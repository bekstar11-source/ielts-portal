import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { db, storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const groupsSnap = await getDocs(collection(db, 'groups'));
                const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const assigned = userData?.assignedGroupIds || [];
                const filteredGroups = groupsData.filter(g => assigned.includes(g.id));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");
        
        if (!title.trim() || !task1.trim() || !task2.trim() || !selectedGroupId) {
            setErrorMsg("Iltimos, barcha maydonlarni to'ldiring va guruhni tanlang");
            return;
        }

        setLoading(true);
        try {
            let task1ImageUrl = "";
            if (task1Image) {
                const imageRef = ref(storage, `writing_images/${Date.now()}_${task1Image.name}`);
                await uploadBytes(imageRef, task1Image);
                task1ImageUrl = await getDownloadURL(imageRef);
            }

            // 1. Yangi test yaratish
            const newTest = {
                title: title.trim(),
                type: 'writing',
                task1: task1.trim(),
                task2: task2.trim(),
                createdBy: userData.uid,
                createdAt: new Date().toISOString(),
                teacherName: userData.fullName || "Ustoz"
            };

            if (task1ImageUrl) {
                newTest.task1ImageUrl = task1ImageUrl;
            }

            const testRef = await addDoc(collection(db, 'tests'), newTest);
            
            // 2. Tanlangan guruhga tayinlash
            const groupRef = doc(db, 'groups', selectedGroupId);
            await updateDoc(groupRef, {
                assignedTests: arrayUnion({
                    id: testRef.id,
                    title: newTest.title,
                    type: 'writing',
                    date: new Date().toISOString()
                })
            });

            setSuccessMsg("Writing testi muvaffaqiyatli yaratildi va guruhga tayinlandi!");
            setTitle('');
            setTask1('');
            setTask2('');
            setTask1Image(null);
            setImagePreview('');
            setSelectedGroupId('');
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

                {/* Task 1 */}
                <div>
                    <label className={labelClasses}>Task 1 savoli</label>
                    <textarea
                        value={task1}
                        onChange={(e) => setTask1(e.target.value)}
                        placeholder="Task 1 matnini kiriting..."
                        className={inputClasses}
                        rows={5}
                    />

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

                {/* Task 2 */}
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
