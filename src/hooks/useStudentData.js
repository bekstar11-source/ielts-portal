// src/hooks/useStudentData.js
// StudentDashboard va Practice sahifalarida umumiy data fetch logic
// Ikkala sahifa bitta sessionStorage cache dan foydalanadi
// => Dashboard -> Practice navigatsiyasida ZERO extra Firestore reads

import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, query, where, doc, getDoc, documentId
} from 'firebase/firestore';

const CACHE_DURATION = 5 * 60 * 1000; // 5 daqiqa (Assignments uchun)
const RESULTS_CACHE_DURATION = 60 * 1000; // 1 daqiqa (Natijalar uchun)

const safeDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// Yangi savol sanash funksiyasi
const getActualQuestionCount = (questions) => {
    if (!questions || !Array.isArray(questions)) return 0;
    return questions.reduce((sum, q) => {
        if (q.questions && Array.isArray(q.questions)) return sum + q.questions.length;
        if (q.items && Array.isArray(q.items)) return sum + q.items.length;
        if (q.groups && Array.isArray(q.groups)) return sum + q.groups.length;
        return sum + 1;
    }, 0);
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

    const CACHE_KEY = user ? `student_assignments_v8_${user.uid}` : null;
    const CACHE_TIME_KEY = user ? `student_assignments_time_v8_${user.uid}` : null;
    const RESULTS_CACHE_KEY = user ? `student_results_v8_${user.uid}` : null;
    const RESULTS_CACHE_TIME_KEY = user ? `student_results_time_v8_${user.uid}` : null;

    const fetchData = async (forceRefresh = false) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Cache tekshirish
            if (!forceRefresh) {
                const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
                const resultsCachedTime = sessionStorage.getItem(RESULTS_CACHE_TIME_KEY);
                
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION);
                const isResultsCacheValid = resultsCachedTime && (Date.now() - parseInt(resultsCachedTime) < RESULTS_CACHE_DURATION);

                if (isCacheValid) {
                    const cachedAssignments = sessionStorage.getItem(CACHE_KEY);
                    const cachedResults = isResultsCacheValid ? sessionStorage.getItem(RESULTS_CACHE_KEY) : null;
                    
                    if (cachedAssignments) {
                        try {
                            const parsedAssigments = JSON.parse(cachedAssignments);
                            setAssignments(parsedAssigments);
                            if (cachedResults) {
                                setUserResults(JSON.parse(cachedResults));
                                setLoading(false);
                                return;
                            }
                        } catch (e) { console.warn('Cache parse xatolik', e); }
                    }
                }
            }

            // 2. Firestore dan yuklash
            // Only fetch user-specific and group-specific assignments
            const [uSnap, gSnap, resultsSnap] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
                getDocs(query(collection(db, 'results'), where('userId', '==', user.uid)))
            ]);

            const userData = uSnap.data() || {};
            const userAssignments = userData.assignedTests || [];
            
            const groupAssignments = [];
            gSnap.docs.forEach(doc => {
                const gData = doc.data();
                if (gData.assignedTests) {
                    groupAssignments.push(...gData.assignedTests.map(a => ({ ...a, groupId: doc.id, groupName: gData.name })));
                }
            });

            const myResults = resultsSnap?.docs?.map(d => ({ id: d.id, ...d.data() })) || [];
            setUserResults(myResults);

            // 3. Assignment normalizatsiya
            const normalizeAssignment = (assign) => {
                if (!assign) return null;
                if (typeof assign === 'string') return { id: assign.trim(), type: 'test' };
                if (typeof assign === 'object' && assign.id) return { ...assign, id: String(assign.id).trim() };
                return null;
            };

            // Combine and normalize all assignments
            const normalizedUserAssignments = userAssignments.map(normalizeAssignment).filter(Boolean);
            const normalizedGroupAssignments = groupAssignments.map(a => {
                const norm = normalizeAssignment(a);
                return norm ? { ...norm, groupId: a.groupId, groupName: a.groupName } : null;
            }).filter(Boolean);

            const allAssignments = [
                ...normalizedUserAssignments,
                ...normalizedGroupAssignments
            ];
            
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
                        result: bestMockResult,
                        totalQuestions: 120
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
                            createdAt: set.createdAt || assign.assignedAt || 0,
                            subTests,
                            totalTests: subTests.length,
                            completedTests: completedCount,
                            status: completedCount === subTests.length && subTests.length > 0 ? 'completed' : 'open',
                            totalQuestions: subTests.reduce((sum, t) => sum + (getActualQuestionCount(t.questions) || t.totalQuestions || 0), 0)
                        });
                    }
                } else {
                    const testDataFromDb = testsMap[assign.id];
                    if (testDataFromDb) {
                        const bestResult = findBestResult(assign.id, myResults);
                        const attemptsCount = myResults.filter(r => String(r.testId).trim() === String(assign.id).trim()).length;
                        const maxAttempts = assign.maxAttempts || 1;

                        // Extract question types for card display
                        const typeMap = {
                            'mcq': 'MCQ',
                            'multiple_choice': 'MCQ',
                            'gap_fill': 'GAP FILL',
                            'notes_completion': 'NOTES',
                            'summary_completion': 'SUMMARY',
                            'table_completion': 'TABLE',
                            'flow_chart_completion': 'FLOW CHART',
                            'map_labeling': 'MAP',
                            'matching': 'MATCHING',
                            'true_false_not_given': 'TRUE/FALSE/NG',
                            'true_false': 'TRUE/FALSE/NG',
                            'tfng': 'TRUE/FALSE/NG',
                            'yes_no_not_given': 'YES/NO/NG',
                            'yes_no': 'YES/NO/NG',
                            'ynng': 'YES/NO/NG',
                            'short_answer': 'SHORT ANSWER',
                            'sentence_completion': 'SENTENCE',
                            'diagram_labeling': 'DIAGRAM',
                            'heading_matching': 'HEADINGS',
                            'paragraph_matching': 'PARA MATCH',
                        };
                        const questionTypes = [];
                        if (testDataFromDb.questions && Array.isArray(testDataFromDb.questions)) {
                            const seen = new Set();
                            testDataFromDb.questions.forEach(q => {
                                if (q.type && !seen.has(q.type)) {
                                    seen.add(q.type);
                                    const label = typeMap[q.type] || q.type.replace(/_/g, ' ').toUpperCase();
                                    questionTypes.push(label);
                                }
                            });
                        }

                        let totalQuestions = testDataFromDb.totalQuestions || 0;
                        if (!totalQuestions && testDataFromDb.questions) {
                            totalQuestions = getActualQuestionCount(testDataFromDb.questions);
                        }
                        
                        // Fallback for Reading/Listening where questions might be inside passages/parts
                        if (!totalQuestions && (testDataFromDb.passages || testDataFromDb.parts)) {
                            const sections = testDataFromDb.passages || testDataFromDb.parts || [];
                            totalQuestions = sections.reduce((sum, p) => sum + getActualQuestionCount(p.questions || p.items || p.groups), 0);
                        }

                        // Override for Full Tests to be exactly 40 if they are close or named Full
                        const isFull = testDataFromDb.difficulty?.toLowerCase().includes('full') || 
                                       testDataFromDb.title?.toLowerCase().includes('full') ||
                                       (totalQuestions > 30 && totalQuestions < 45); // If it's around 40, it's likely a full test

                        if (isFull && (testDataFromDb.type === 'reading' || testDataFromDb.type === 'listening')) {
                            totalQuestions = 40;
                        }

                        // Hard fallback logic based on type and title/difficulty
                        if (!totalQuestions) {
                            if (testDataFromDb.type === 'listening') {
                                const isFull = testDataFromDb.difficulty?.toLowerCase().includes('full') || 
                                              testDataFromDb.title?.toLowerCase().includes('full');
                                totalQuestions = isFull ? 40 : 10;
                            } else if (testDataFromDb.type === 'reading') {
                                const isFull = testDataFromDb.difficulty?.toLowerCase().includes('full') || 
                                              testDataFromDb.title?.toLowerCase().includes('full');
                                totalQuestions = isFull ? 40 : 13;
                            } else {
                                totalQuestions = 40;
                            }
                        }

                        const finalTestData = {
                            ...testDataFromDb,
                            ...assign,
                            id: assign.id,
                            title: testDataFromDb?.title || assign.title || 'IELTS Test',
                            type: testDataFromDb?.type || assign.type || 'unknown',
                            attemptsCount,
                            maxAttempts,
                            questionTypes,
                            totalQuestions
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

            // 7. Chronological Sort: Newest first (createdAt descending)
            uniqueTests.sort((a, b) => {
                const dA = safeDate(a.assignedAt) || safeDate(a.createdAt);
                const dB = safeDate(b.assignedAt) || safeDate(b.createdAt);
                const dateA = dA ? dA.getTime() : 0;
                const dateB = dB ? dB.getTime() : 0;
                return dateB - dateA;
            });

            // 8. Cache ga saqlash
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(uniqueTests));
                sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                sessionStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(myResults));
                sessionStorage.setItem(RESULTS_CACHE_TIME_KEY, Date.now().toString());
            } catch (quotaError) {
                console.warn("SessionStorage quota exceeded.");
                try {
                    sessionStorage.removeItem(CACHE_KEY);
                    sessionStorage.removeItem(CACHE_TIME_KEY);
                    sessionStorage.removeItem(RESULTS_CACHE_KEY);
                    sessionStorage.removeItem(RESULTS_CACHE_TIME_KEY);
                } catch (e) { /* ignore */ }
            }

            setAssignments(uniqueTests);

        } catch (err) {
            console.error('useStudentData fetch xatolik:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
    }, [user?.uid]);

    return { assignments, userResults, loading, error, refresh, invalidateCache };
}
