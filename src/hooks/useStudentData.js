// src/hooks/useStudentData.js
// StudentDashboard va Practice sahifalarida umumiy data fetch logic
// Ikkala sahifa bitta sessionStorage cache dan foydalanadi
// => Dashboard -> Practice navigatsiyasida ZERO extra Firestore reads

import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, query, where, doc, getDoc, documentId
} from 'firebase/firestore';

const CACHE_DURATION = 5 * 60 * 1000; // 5 daqiqa

const safeDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
};

// Batch query: N ta alohida getDoc o'rniga bitta getDocs 'in' query
const fetchDocumentsByIds = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return {};
    const uniqueIds = [...new Set(ids.map(id => String(id).trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return {};

    const docsMap = {};
    const CHUNK_SIZE = 30;
    const chunks = [];
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
        chunks.push(uniqueIds.slice(i, i + CHUNK_SIZE));
    }

    try {
        const chunkSnapshots = await Promise.all(
            chunks.map(chunk =>
                getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))
            )
        );
        chunkSnapshots.forEach(snap => {
            snap.docs.forEach(d => { docsMap[d.id] = { id: d.id, ...d.data() }; });
        });
    } catch (e) {
        console.warn(`fetchDocumentsByIds xatolik (${collectionName}):`, e);
    }
    return docsMap;
};

export function useStudentData(user) {
    const [assignments, setAssignments] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const CACHE_KEY = user ? `student_assignments_${user.uid}` : null;
    const CACHE_TIME_KEY = user ? `student_assignments_time_${user.uid}` : null;
    const RESULTS_CACHE_KEY = user ? `student_results_${user.uid}` : null;
    const RESULTS_CACHE_TIME_KEY = user ? `student_results_time_${user.uid}` : null;

    const fetchData = async (forceRefresh = false) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Cache tekshirish
            if (!forceRefresh) {
                const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION);

                if (isCacheValid) {
                    const cachedAssignments = sessionStorage.getItem(CACHE_KEY);
                    const cachedResults = sessionStorage.getItem(RESULTS_CACHE_KEY);
                    if (cachedAssignments && cachedResults) {
                        try {
                            setAssignments(JSON.parse(cachedAssignments));
                            setUserResults(JSON.parse(cachedResults));
                            setLoading(false);
                            return;
                        } catch (e) { console.warn('Cache parse xatolik', e); }
                    }
                }
            }

            // 2. Firestore dan yuklash
            const [userSnap, groupsSnap, resultsSnap] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
                getDocs(query(collection(db, 'results'), where('userId', '==', user.uid)))
            ]);

            const myResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUserResults(myResults);

            // 3. Assignment normalizatsiya
            const normalizeAssignment = (assign) => {
                if (!assign) return null;
                if (typeof assign === 'string') return { id: assign.trim(), type: 'test' };
                if (typeof assign === 'object' && assign.id) return { ...assign, id: String(assign.id).trim() };
                return null;
            };

            let allAssignments = [];
            const currentUserData = userSnap.data();

            if (currentUserData?.assignedTests) {
                allAssignments = [...allAssignments, ...currentUserData.assignedTests.map(normalizeAssignment)];
            }
            groupsSnap.docs.forEach(gDoc => {
                const gData = gDoc.data();
                if (gData.assignedTests) {
                    allAssignments = [...allAssignments, ...gData.assignedTests.map(normalizeAssignment)];
                }
            });
            allAssignments = allAssignments.filter(Boolean);

            // 4. Testlar va Set larni BATCH bilan fetch qilish
            const testIdsToFetch = [];
            const setIdsToFetch = [];
            allAssignments.forEach(assign => {
                if (assign.type === 'set') { setIdsToFetch.push(assign.id); }
                else if (assign.id && !assign.id.startsWith('MOCK_')) { testIdsToFetch.push(assign.id); }
            });

            const setsMap = await fetchDocumentsByIds('testSets', setIdsToFetch);
            Object.values(setsMap).forEach(set => {
                if (set.testIds) {
                    set.testIds.forEach(tid => testIdsToFetch.push(String(tid).trim()));
                }
            });

            const testsMap = await fetchDocumentsByIds('tests', testIdsToFetch);

            // 5. Processlanib chiqarish
            const findBestResult = (testId, results) => {
                const attempts = results.filter(r => String(r.testId).trim() === String(testId).trim());
                if (attempts.length === 0) return null;
                return attempts.sort((a, b) => parseFloat(b.bandScore || b.score || 0) - parseFloat(a.bandScore || a.score || 0))[0];
            };

            let processedList = [];
            allAssignments.forEach((assign) => {
                if (!assign || !assign.id) return;

                if (assign.type === 'mock_full' || assign.mockKey || String(assign.id).startsWith('MOCK_')) {
                    const mockAttempts = myResults.filter(r => r.mockKey === assign.mockKey);
                    const bestMockResult = mockAttempts.length > 0
                        ? mockAttempts.sort((a, b) => parseFloat(b.bandScore || 0) - parseFloat(a.bandScore || 0))[0]
                        : null;
                    processedList.push({
                        ...assign,
                        title: assign.title || 'Full Mock Exam',
                        isMock: true,
                        status: bestMockResult ? 'completed' : 'open',
                        result: bestMockResult
                    });
                } else if (assign.type === 'set') {
                    const set = setsMap[assign.id];
                    if (set) {
                        const subTests = (set.testIds || []).map(testId => {
                            const cleanId = String(testId).trim();
                            const testDetail = testsMap[cleanId];
                            if (testDetail) {
                                const bestResult = findBestResult(cleanId, myResults);
                                const subAttemptsCount = myResults.filter(r => String(r.testId).trim() === cleanId).length;
                                return {
                                    ...testDetail,
                                    status: bestResult ? 'completed' : 'open',
                                    result: bestResult,
                                    attemptsCount: subAttemptsCount,
                                    maxAttempts: assign.maxAttempts || 1,
                                    endDate: assign.endDate || null,
                                    startDate: assign.startDate || null,
                                };
                            }
                            return null;
                        }).filter(Boolean);

                        const completedCount = subTests.filter(t => t.status === 'completed').length;
                        processedList.push({
                            ...assign,
                            isSet: true,
                            title: set.name || assign.title || 'Test Set',
                            subTests,
                            totalTests: subTests.length,
                            completedTests: completedCount,
                            status: completedCount === subTests.length && subTests.length > 0 ? 'completed' : 'open'
                        });
                    }
                } else {
                    const testDataFromDb = testsMap[assign.id];
                    if (testDataFromDb) {
                        const bestResult = findBestResult(assign.id, myResults);
                        const attemptsCount = myResults.filter(r => String(r.testId).trim() === String(assign.id).trim()).length;
                        const maxAttempts = assign.maxAttempts || 1;

                        const finalTestData = {
                            ...testDataFromDb,
                            ...assign,
                            id: assign.id,
                            title: testDataFromDb?.title || assign.title || 'IELTS Test',
                            type: testDataFromDb?.type || assign.type || 'unknown',
                            attemptsCount,
                            maxAttempts
                        };

                        const now = new Date();
                        const start = safeDate(assign.startDate);
                        const end = safeDate(assign.endDate);
                        let status = 'open';
                        if (bestResult) status = 'completed';
                        else if (start && now < start) status = 'upcoming';
                        else if (end && now > end) status = 'expired';

                        processedList.push({ ...finalTestData, status, result: bestResult });
                    }
                }
            });

            // 6. Dublikatlarni o'chirish
            const uniqueTests = processedList.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

            // 7. Cache ga saqlash
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(uniqueTests));
            sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            sessionStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(myResults));
            sessionStorage.setItem(RESULTS_CACHE_TIME_KEY, Date.now().toString());

            setAssignments(uniqueTests);

        } catch (err) {
            console.error('useStudentData fetch xatolik:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Cache ni o'chirib qayta yuklash
    const invalidateCache = () => {
        if (!user) return;
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_TIME_KEY);
        sessionStorage.removeItem(RESULTS_CACHE_KEY);
        sessionStorage.removeItem(RESULTS_CACHE_TIME_KEY);
    };

    const refresh = async () => {
        invalidateCache();
        await fetchData(true);
    };

    useEffect(() => {
        if (user) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);

    return { assignments, userResults, loading, error, refresh, invalidateCache };
}
