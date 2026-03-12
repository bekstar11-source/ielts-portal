import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { BookOpen, Play, CheckCircle, Clock, WarningCircle as AlertCircle, CaretRight as ChevronRight } from '@phosphor-icons/react';

export default function TeacherTests() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [assignedTests, setAssignedTests] = useState([]);
    const [myResults, setMyResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) fetchData();
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const groupIds = userData?.assignedGroupIds || [];
            if (!groupIds.length) { setLoading(false); return; }

            const groupDocs = await Promise.all(
                groupIds.map(id => getDoc(doc(db, 'groups', id)))
            );
            const groups = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));

            // Collect all unique assigned tests from all groups
            const testsMap = new Map();
            groups.forEach(g => {
                (g.assignedTests || []).forEach(test => {
                    if (!testsMap.has(test.id)) {
                        testsMap.set(test.id, { ...test, groupName: g.name });
                    }
                });
            });
            setAssignedTests([...testsMap.values()]);

            // Fetch teacher's own results (submittedBy: 'teacher' or userId === teacher uid)
            const teacherUid = userData?.uid;
            if (teacherUid) {
                const q = query(
                    collection(db, 'results'),
                    where('userId', '==', teacherUid)
                );
                const snap = await getDocs(q);
                setMyResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isCompleted = (testId) => myResults.some(r => r.testId === testId || r.assignmentId === testId);

    const getTypeColor = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('mock')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        if (t.includes('reading')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        if (t.includes('listening')) return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
        if (t.includes('writing')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    const handleStart = (test) => {
        if (test.type === 'mock') {
            navigate('/mock-exam', { state: { testId: test.id, isTeacher: true } });
        } else {
            navigate(`/test/${test.id}`, { state: { isTeacher: true } });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tayinlangan Testlar</h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Guruhingizga tayinlangan testlarni ishlang
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : assignedTests.length === 0 ? (
                <div className={`rounded-[24px] border p-12 text-center ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <BookOpen size={40} className="mx-auto mb-4 opacity-30" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Test tayinlanmagan</p>
                    <p className="text-sm mt-1 text-gray-400">Admin guruhingizga test tayinlagach bu yerda ko'rinadi</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {assignedTests.map((test, i) => {
                        const done = isCompleted(test.id);
                        const typeColor = getTypeColor(test.type);
                        const isExpired = test.endDate && new Date(test.endDate) < new Date();
                        return (
                            <div
                                key={`${test.id}-${i}`}
                                className={`rounded-[20px] border flex flex-col transition-all
                                    ${done
                                        ? (isDark ? 'bg-[#2C2C2C] border-emerald-500/20' : 'bg-white border-emerald-200 shadow-sm')
                                        : isExpired
                                            ? (isDark ? 'bg-[#2C2C2C] border-white/5 opacity-60' : 'bg-gray-50 border-gray-200 opacity-60')
                                            : (isDark ? 'bg-[#2C2C2C] border-white/5 hover:border-emerald-500/40' : 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm')
                                    }`}
                            >
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
                                            {test.type || 'test'}
                                        </span>
                                        {done && <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />}
                                    </div>
                                    <h3 className={`font-bold text-sm mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {test.title}
                                    </h3>
                                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                        <span className="opacity-50">Guruh:</span> {test.groupName}
                                    </p>
                                    {!test.endDate || test.endDate === null ? (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={10} /> Cheksiz muddat
                                        </p>
                                    ) : (
                                        <p className={`text-xs flex items-center gap-1 ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                                            <Clock size={10} />
                                            {isExpired ? 'Muddati tugagan' : `Deadline: ${new Date(test.endDate).toLocaleDateString()}`}
                                        </p>
                                    )}
                                </div>
                                <div className={`px-5 pb-5`}>
                                    <button
                                        onClick={() => handleStart(test)}
                                        disabled={isExpired && !done}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition
                                            ${done
                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                : isExpired
                                                    ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                                            }`}
                                    >
                                        {done ? (
                                            <><CheckCircle size={16} /> Bajarildi</>
                                        ) : (
                                            <><Play size={16} /> Ishlash</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
