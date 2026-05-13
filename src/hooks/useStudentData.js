import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, documentId } from 'firebase/firestore';
import { getSafeBandScore } from '../utils/scoreUtils';

const safeDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// PERF: Cache question counts to avoid repeated heavy calculations
const questionCountCache = new Map();

// Yangi savol sanash funksiyasi
const getActualQuestionCount = (questions) => {
    if (!questions || !Array.isArray(questions)) return 0;
    
    // Lightweight key: avoids heavy JSON.stringify
    const cacheKey = `${questions.length}-${questions[0]?.id || 'no-id'}`;
    if (questionCountCache.has(cacheKey)) return questionCountCache.get(cacheKey);

    const ids = new Set();
    const extract = (obj) => {
        if (!obj) return;
        if (obj.id && !isNaN(parseInt(obj.id))) {
            ids.add(parseInt(obj.id));
        }
        if (Array.isArray(obj.items)) obj.items.forEach(extract);
        if (Array.isArray(obj.questions)) obj.questions.forEach(extract);
        if (Array.isArray(obj.groups)) obj.groups.forEach(extract);
    };
    
    questions.forEach(extract);
    const count = ids.size || questions.length; // Fallback to length if no IDs found

    questionCountCache.set(cacheKey, count);
    return count;
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
    const queryClient = useQueryClient();
    const queryKey = ['studentData', user?.uid];
    const CACHE_KEY = `student_data_cache_${user?.uid}`;

    const { data, isLoading, error, refetch } = useQuery({
        queryKey,
        enabled: !!user?.uid,
        staleTime: 1000 * 60 * 5, // 5 daqiqa
        queryFn: async () => {
            if (!user) return { assignments: [], userResults: [] };

            // 1. Firestore dan yuklash
            const [uSnap, gSnap, resultsSnap] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
                getDocs(query(
                    collection(db, 'results'), 
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                ))
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

            // 2. Assignment normalizatsiya
            const normalizeAssignment = (assign) => {
                if (!assign) return null;
                if (typeof assign === 'string') return { id: assign.trim(), type: 'test' };
                if (typeof assign === 'object' && assign.id) return { ...assign, id: String(assign.id).trim() };
                return null;
            };

            const normalizedUserAssignments = userAssignments.map(normalizeAssignment).filter(Boolean);
            const normalizedGroupAssignments = groupAssignments.map(a => {
                const norm = normalizeAssignment(a);
                return norm ? { ...norm, groupId: a.groupId, groupName: a.groupName } : null;
            }).filter(Boolean);

            const allAssignments = [...normalizedUserAssignments, ...normalizedGroupAssignments];
            
            // 3. Testlar va Set larni BATCH bilan fetch qilish
            const directTestIds = [];
            const setIdsToFetch = [];
            allAssignments.forEach(assign => {
                if (assign.type === 'set') { setIdsToFetch.push(assign.id); }
                else if (assign.id && !assign.id.startsWith('MOCK_')) { directTestIds.push(assign.id); }
            });

            // Parallel fetch sets and direct tests
            const [setsMap, directTestsMap] = await Promise.all([
                fetchDocumentsByIds('testSets', setIdsToFetch),
                fetchDocumentsByIds('tests', directTestIds)
            ]);

            // Now check if we need more tests from the sets
            const indirectTestIds = [];
            Object.values(setsMap).forEach(set => {
                if (set.testIds) {
                    set.testIds.forEach(tid => {
                        const cleanId = String(tid).trim();
                        if (!directTestsMap[cleanId]) indirectTestIds.push(cleanId);
                    });
                }
            });

            const indirectTestsMap = await fetchDocumentsByIds('tests', indirectTestIds);
            const testsMap = { ...directTestsMap, ...indirectTestsMap };

            // 4. Processlanib chiqarish
            const findBestResult = (testId, results) => {
                const attempts = results.filter(r => String(r.testId).trim() === String(testId).trim());
                if (attempts.length === 0) return null;
                
                // Optimized: Find max without full sort
                return attempts.reduce((best, current) => {
                    const scoreCurr = getSafeBandScore(current);
                    const scoreBest = getSafeBandScore(best);
                    return scoreCurr > scoreBest ? current : best;
                }, attempts[0]);
            };

            let processedList = [];
            allAssignments.forEach((assign) => {
                if (!assign || !assign.id) return;

                if (assign.type === 'mock_full' || assign.mockKey || String(assign.id).startsWith('MOCK_')) {
                    const mockAttempts = myResults.filter(r => r.mockKey === assign.mockKey);
                    const bestMockResult = mockAttempts.length > 0
                        ? mockAttempts.reduce((best, current) => {
                            const scoreCurr = getSafeBandScore(current);
                            const scoreBest = getSafeBandScore(best);
                            return scoreCurr > scoreBest ? current : best;
                        }, mockAttempts[0])
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
                        
                        const typeMap = {
                            'mcq': 'MCQ', 'multiple_choice': 'MCQ', 'gap_fill': 'GAP FILL',
                            'notes_completion': 'NOTES', 'summary_completion': 'SUMMARY',
                            'table_completion': 'TABLE', 'flow_chart_completion': 'FLOW CHART',
                            'map_labeling': 'MAP', 'matching': 'MATCHING',
                            'true_false_not_given': 'TRUE/FALSE/NG', 'true_false': 'TRUE/FALSE/NG',
                            'tfng': 'TRUE/FALSE/NG', 'yes_no_not_given': 'YES/NO/NG',
                            'yes_no': 'YES/NO/NG', 'ynng': 'YES/NO/NG',
                            'short_answer': 'SHORT ANSWER', 'sentence_completion': 'SENTENCE',
                            'diagram_labeling': 'DIAGRAM', 'heading_matching': 'HEADINGS',
                            'paragraph_matching': 'PARA MATCH',
                        };
                        
                        const questionTypes = [];
                        if (testDataFromDb.questions && Array.isArray(testDataFromDb.questions)) {
                            const seen = new Set();
                            testDataFromDb.questions.forEach(q => {
                                if (q.type && !seen.has(q.type)) {
                                    seen.add(q.type);
                                    questionTypes.push(typeMap[q.type] || q.type.replace(/_/g, ' ').toUpperCase());
                                }
                            });
                        }

                        let totalQuestions = testDataFromDb.totalQuestions || 0;
                        if (!totalQuestions && testDataFromDb.questions) totalQuestions = getActualQuestionCount(testDataFromDb.questions);
                        
                        const finalTestData = {
                            ...testDataFromDb,
                            ...assign,
                            id: assign.id,
                            title: testDataFromDb?.title || assign.title || 'IELTS Test',
                            type: testDataFromDb?.type || assign.type || 'unknown',
                            attemptsCount,
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

            const uniqueTests = processedList.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            uniqueTests.sort((a, b) => {
                const dA = safeDate(a.assignedAt) || safeDate(a.createdAt);
                const dB = safeDate(b.assignedAt) || safeDate(b.createdAt);
                return (dB ? dB.getTime() : 0) - (dA ? dA.getTime() : 0);
            });

            const result = { assignments: uniqueTests, userResults: myResults };
            
            // Cache save
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
            
            return result;
        }
    });

    // Check cache on mount
    const [cachedData, setCachedData] = useState(() => {
        const saved = sessionStorage.getItem(`student_data_cache_${user?.uid}`);
        return saved ? JSON.parse(saved) : null;
    });

    const refresh = () => {
        sessionStorage.removeItem(CACHE_KEY);
        return queryClient.invalidateQueries({ queryKey });
    };

    const finalData = data || cachedData;

    return { 
        assignments: finalData?.assignments || [], 
        userResults: finalData?.userResults || [], 
        loading: isLoading && !cachedData, 
        error: error?.message, 
        refresh 
    };
}
