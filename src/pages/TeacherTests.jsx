import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { BookOpen, Play, CheckCircle, Clock, WarningCircle as AlertCircle, CaretRight as ChevronRight, Folder } from '@phosphor-icons/react';
import DashboardModals from '../components/dashboard/DashboardModals';

const fetchDocumentsByIds = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return {};
    const uniqueIds = [...new Set(ids)];
    const docsMap = {};
    const promises = uniqueIds.map(async (id) => {
        const cleanId = String(id).trim();
        if (!cleanId) return null;
        const snap = await getDoc(doc(db, collectionName, cleanId));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
        return null;
    });
    const results = await Promise.all(promises);
    results.forEach(d => { if (d) docsMap[d.id] = d; });
    return docsMap;
};

export default function TeacherTests() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [assignedTests, setAssignedTests] = useState([]);
    const [myResults, setMyResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSet, setSelectedSet] = useState(null);

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

            const rawAssignments = [];
            groups.forEach(g => {
                (g.assignedTests || []).forEach(test => {
                    rawAssignments.push({ ...test, groupName: g.name });
                });
            });

            const teacherUid = userData?.uid;
            let resultsList = [];
            if (teacherUid) {
                const q = query(
                    collection(db, 'results'),
                    where('userId', '==', teacherUid)
                );
                const snap = await getDocs(q);
                resultsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setMyResults(resultsList);
            }

            const setIdsToFetch = [];
            const testIdsToFetch = [];
            rawAssignments.forEach(assign => {
                if (assign.type === 'set') setIdsToFetch.push(assign.id);
                else testIdsToFetch.push(assign.id);
            });
            const setsMap = await fetchDocumentsByIds('testSets', setIdsToFetch);
            Object.values(setsMap).forEach(s => {
                if (s.testIds) s.testIds.forEach(id => testIdsToFetch.push(String(id).trim()));
            });
            const fetchedTestsMap = await fetchDocumentsByIds('tests', testIdsToFetch);

            const processedList = [];
            rawAssignments.forEach(assign => {
                if (!assign || !assign.id) return;
                
                const isCompletedFn = (tid) => resultsList.some(r => String(r.testId).trim() === String(tid).trim() || r.assignmentId === tid);
                const getBestResult = (tid) => {
                    const r = resultsList.filter(x => String(x.testId).trim() === String(tid).trim());
                    if (!r.length) return null;
                    return r.sort((a,b) => parseFloat(b.bandScore||b.score||0) - parseFloat(a.bandScore||a.score||0))[0];
                };

                if (assign.type === 'set') {
                    const set = setsMap[assign.id];
                    if (set) {
                        const subTests = (set.testIds || []).map(tid => {
                            const cleanId = String(tid).trim();
                            const td = fetchedTestsMap[cleanId];
                            if (td) {
                                return {
                                    ...td,
                                    status: isCompletedFn(cleanId) ? 'completed' : 'open',
                                    result: getBestResult(cleanId),
                                    attemptsCount: resultsList.filter(x => String(x.testId).trim() === cleanId).length,
                                    maxAttempts: assign.maxAttempts || 1,
                                    endDate: assign.endDate || null
                                };
                            }
                            return null;
                        }).filter(Boolean);
                        const doneCount = subTests.filter(t => t.status === 'completed').length;
                        processedList.push({
                            ...assign, isSet: true, title: set.name || assign.title || "Test To'plam",
                            subTests, totalTests: subTests.length, completedTests: doneCount,
                        });
                    }
                } else {
                    const td = fetchedTestsMap[assign.id];
                    if (td) {
                        processedList.push({
                            ...td, ...assign, id: assign.id,
                            title: td.title || assign.title || "Test"
                        });
                    }
                }
            });
            
            const uniqueMap = new Map();
            processedList.forEach(t => {
                if(!uniqueMap.has(t.id)) uniqueMap.set(t.id, t);
            });
            setAssignedTests([...uniqueMap.values()]);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isCompleted = (testId) => myResults.some(r => String(r.testId).trim() === String(testId).trim() || r.assignmentId === testId);

    const getTypeColor = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('mock')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        if (t.includes('reading')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        if (t.includes('listening')) return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
        if (t.includes('writing')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    const handleStart = (test) => {
        if (selectedSet) setSelectedSet(null);
        if (test.type === 'mock' || test.type === 'mock_full') {
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
                        const isExpired = test.endDate && new Date(test.endDate) < new Date();
                        
                        if (test.isSet) {
                            return (
                                <div
                                    key={`${test.id}-${i}`}
                                    className={`rounded-[20px] border flex flex-col transition-all cursor-pointer ${isDark ? 'bg-[#2C2C2C] border-white/5 hover:border-blue-500/30' : 'bg-white border-gray-200 hover:border-blue-300'} overflow-hidden relative ${isExpired ? 'opacity-60' : ''}`}
                                    onClick={() => setSelectedSet(test)}
                                >
                                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-6 -mt-6 ${isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'}`}></div>
                                    <div className="p-5 flex-1 z-10">
                                        <div className={`w-10 h-10 text-blue-400 rounded-2xl flex items-center justify-center mb-3 border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                            <Folder size={20} />
                                        </div>
                                        <h3 className={`font-bold text-sm mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {test.title}
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                            <span className="opacity-50">Guruh:</span> {test.groupName}
                                        </p>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex-1 h-1 bg-gray-500/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${(test.completedTests / test.totalTests) * 100}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-medium">{test.completedTests}/{test.totalTests}</span>
                                        </div>
                                        {isExpired && (
                                            <p className={`text-xs flex items-center gap-1 text-red-500`}>
                                                <Clock size={10} /> Muddati tugagan
                                            </p>
                                        )}
                                    </div>
                                    <div className={`px-5 pb-5 z-10`}>
                                        <button className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center transition ${isDark ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                            To'plamni Ochish
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        const done = isCompleted(test.id);
                        const typeColor = getTypeColor(test.type);
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

            {/* Set Modal */}
            <DashboardModals 
                selectedSet={selectedSet} 
                setSelectedSet={setSelectedSet} 
                handleStartTest={handleStart} 
                handleReview={(sub) => navigate(`/review/${sub.result?.id}`)}
                showKeyModal={false}
                showStartConfirm={false}
                showLogoutConfirm={false}
            />
        </div>
    );
}
