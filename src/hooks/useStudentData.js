import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, documentId } from 'firebase/firestore';
import { getSafeBandScore } from '../utils/scoreUtils';
import { collectQuestionNumbers } from '../utils/ieltsScoring';

const safeDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

const getAttemptsCountForTest = (testId, results, maxAttempts, partNum = null) => {
    const allAttempts = [];
    results.forEach(r => {
        const matchesId = String(r.testId).trim() === String(testId).trim();
        if (!matchesId) return;
        if (partNum !== null && Number(r.partNumber) !== partNum) return;
        
        if (r.attempts && Array.isArray(r.attempts)) {
            allAttempts.push(...r.attempts);
        } else {
            allAttempts.push(r);
        }
    });

    const numMax = Number(maxAttempts) || 1;
    if (numMax === 1 || numMax === 2) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return allAttempts.filter(att => {
            const dateVal = safeDate(att.createdAt || att.date);
            return dateVal && dateVal >= threeDaysAgo;
        }).length;
    }
    return allAttempts.length;
};

// PERF: Cache question counts to avoid repeated heavy calculations
const questionCountCache = new Map();

// Savol sanagich — `ieltsScoring.collectQuestionNumbers` ustidagi yupqa qobiq.
//
// Ilgari bu yerda MUSTAQIL nusxa turardi va u `TestUtils.getActualQuestionCount`
// dan farq qilardi: "35–36" kabi diapazon ID ni bitta savol deb sanardi va
// `parts`/`content` ichiga kirmasdi. Natijada bitta test dashboardda 39, test
// kartochkasida 40 ta savol deb ko'rinardi.
const getActualQuestionCount = (questions) => {
    if (!Array.isArray(questions) || questions.length === 0) return 0;

    // PERF: og'ir JSON.stringify siz yengil kalit.
    const cacheKey = `${questions.length}-${questions[0]?.id || 'no-id'}`;
    if (questionCountCache.has(cacheKey)) return questionCountCache.get(cacheKey);

    const count = collectQuestionNumbers({ questions }).size || questions.length;
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

    const { data, isLoading, error, isFetching } = useQuery({
        queryKey,
        enabled: !!user?.uid,
        staleTime: 1000 * 60 * 2, // 2 daqiqa stale time
        queryFn: async () => {
            if (!user) return { assignments: [], userResults: [] };

            // 1. Firestore dan yuklash
            const [uSnap, gSnap, resultsSnap, podcastAttemptsSnap] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
                getDocs(query(
                    collection(db, 'results'), 
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                )),
                getDocs(query(
                    collection(db, 'podcastAttempts'),
                    where('userId', '==', user.uid)
                )).catch(() => ({ docs: [] }))
            ]);

            const userData = uSnap.data() || {};
            const userAssignments = userData.assignedTests || [];
            const awardedItems = userData.awardedItems || [];
            
            const groupAssignments = [];
            gSnap.docs.forEach(doc => {
                const gData = doc.data();
                if (gData.assignedTests) {
                    groupAssignments.push(...gData.assignedTests.map(a => ({ ...a, groupId: doc.id, groupName: gData.name })));
                }
            });

            const myResults = resultsSnap?.docs?.map(d => ({ id: d.id, ...d.data() })) || [];
            const podcastAttempts = podcastAttemptsSnap?.docs?.map(d => ({ id: d.id, ...d.data() })) || [];

            // 2. Assignment normalizatsiya
            const normalizeAssignment = (assign) => {
                if (!assign) return null;
                if (typeof assign === 'string') return { id: assign.trim(), type: 'test' };
                if (typeof assign === 'object' && assign.id) return { ...assign, id: String(assign.id).trim() };
                return null;
            };

            const normalizedUserAssignments = userAssignments.map(a => {
                const norm = normalizeAssignment(a);
                return norm ? { ...norm, isAssignment: true } : null;
            }).filter(Boolean);
            const normalizedGroupAssignments = groupAssignments.map(a => {
                const norm = normalizeAssignment(a);
                return norm ? { ...norm, groupId: a.groupId, groupName: a.groupName, isAssignment: true } : null;
            }).filter(Boolean);

            const allAssignments = [...normalizedUserAssignments, ...normalizedGroupAssignments];
            
            // 3. Testlar va Set larni BATCH bilan fetch qilish
            const directTestIds = [];
            const setIdsToFetch = [];
            const podcastIdsToFetch = [];
            const articleIdsToFetch = [];
            allAssignments.forEach(assign => {
                if (assign.type === 'set') { 
                    setIdsToFetch.push(assign.id); 
                } else if (assign.type === 'podcast') {
                    podcastIdsToFetch.push(assign.id);
                } else if (assign.type === 'article') {
                    articleIdsToFetch.push(assign.id);
                } else if (assign.id && !assign.id.startsWith('MOCK_')) { 
                    directTestIds.push(assign.id); 
                }
            });

            // Parallel fetch sets, direct tests, podcasts, and articles
            const [setsMap, directTestsMap, podcastsMap, articlesMap] = await Promise.all([
                fetchDocumentsByIds('testSets', setIdsToFetch),
                fetchDocumentsByIds('tests_metadata', directTestIds),
                fetchDocumentsByIds('podcasts', podcastIdsToFetch),
                fetchDocumentsByIds('articles', articleIdsToFetch)
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

            const indirectTestsMap = await fetchDocumentsByIds('tests_metadata', indirectTestIds);
            const testsMap = { ...directTestsMap, ...indirectTestsMap };

            // 4. Processlanib chiqarish
            const findBestResult = (testId, results) => {
                const attempts = results.filter(r => String(r.testId).trim() === String(testId).trim());
                if (attempts.length === 0) return null;
                
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
                                const maxAtts = assign.maxAttempts || 1;
                                const subAttemptsCount = getAttemptsCountForTest(cleanId, myResults, maxAtts);
                                return {
                                    ...testDetail,
                                    status: bestResult ? 'completed' : 'open',
                                    result: bestResult,
                                    attemptsCount: subAttemptsCount,
                                    maxAttempts: maxAtts,
                                    endDate: assign.deadline || assign.endDate || null,
                                    startDate: assign.startDate || null,
                                    isAssignment: true,
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
                } else if (assign.type === 'podcast') {
                    const podcastData = podcastsMap[assign.id];
                    if (podcastData) {
                        const attempt = podcastAttempts.find(a => a.podcastId === assign.id);
                        const isCompleted = awardedItems.includes(assign.id) || !!attempt?.completedAt;
                        
                        processedList.push({
                            ...podcastData,
                            ...assign,
                            id: assign.id,
                            title: podcastData.title || assign.title || 'Podcast Episode',
                            type: 'podcast',
                            status: isCompleted ? 'completed' : 'open',
                            result: attempt ? {
                                id: attempt.id,
                                bandScore: attempt.ieltsBands?.overall || attempt.score || null,
                                score: attempt.ieltsBands?.overall || attempt.score || null,
                                date: attempt.completedAt?.toDate ? attempt.completedAt.toDate() : attempt.completedAt,
                            } : null
                        });
                    }
                } else if (assign.type === 'article') {
                    const articleData = articlesMap[assign.id];
                    if (articleData) {
                        const isCompleted = awardedItems.includes(assign.id);
                        processedList.push({
                            ...articleData,
                            ...assign,
                            id: assign.id,
                            title: articleData.title || assign.title || 'Article',
                            type: 'article',
                            status: isCompleted ? 'completed' : 'open',
                            result: isCompleted ? {
                                id: assign.id,
                                bandScore: null,
                                score: null,
                                date: assign.date || null,
                            } : null
                        });
                    }
                } else {
                    const testDataFromDb = testsMap[assign.id];
                    if (testDataFromDb) {
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

                        const now = new Date();
                        const start = safeDate(assign.startDate);
                        const end = safeDate(assign.deadline || assign.endDate);

                        const tLow = (testDataFromDb.type || '').toLowerCase();
                        const isListening = tLow.includes('listening');

                        // Part-specific assignment: expand into one entry per selected part
                        if (isListening && Array.isArray(assign.selectedParts) && assign.selectedParts.length > 0) {
                            assign.selectedParts.forEach(partNum => {
                                const partResult = myResults.find(r =>
                                    String(r.testId).trim() === String(assign.id).trim() &&
                                    Number(r.partNumber) === partNum
                                ) || null;
                                const maxAtts = assign.maxAttempts || 1;
                                const partAttemptsCount = getAttemptsCountForTest(assign.id, myResults, maxAtts, partNum);

                                let status = 'open';
                                if (partResult) status = 'completed';
                                else if (start && now < start) status = 'upcoming';
                                else if (end && now > end) status = 'expired';

                                processedList.push({
                                    ...testDataFromDb,
                                    ...assign,
                                    id: assign.id,
                                    partNumber: partNum,
                                    title: `${testDataFromDb?.title || assign.title || 'IELTS Test'} · Part ${partNum}`,
                                    type: testDataFromDb?.type || assign.type || 'listening',
                                    attemptsCount: partAttemptsCount,
                                    questionTypes,
                                    totalQuestions,
                                    status,
                                    result: partResult,
                                });
                            });
                            return;
                        }

                        const bestResult = findBestResult(assign.id, myResults);
                        const maxAtts = assign.maxAttempts || 1;
                        const attemptsCount = getAttemptsCountForTest(assign.id, myResults, maxAtts);

                        const finalTestData = {
                            ...testDataFromDb,
                            ...assign,
                            id: assign.id,
                            title: testDataFromDb?.title || assign.title || 'IELTS Test',
                            type: testDataFromDb?.type || assign.type || 'unknown',
                            attemptsCount,
                            maxAttempts: maxAtts,
                            questionTypes,
                            totalQuestions
                        };

                        let status = 'open';
                        if (bestResult) status = 'completed';
                        else if (start && now < start) status = 'upcoming';
                        else if (end && now > end) status = 'expired';

                        processedList.push({ ...finalTestData, status, result: bestResult });
                    }
                }
            });

            // Dedup: part entries share the same id but differ by partNumber
            const uniqueTests = processedList.filter((v, i, a) =>
                a.findIndex(t => t.id === v.id && (t.partNumber ?? null) === (v.partNumber ?? null)) === i
            );
            uniqueTests.sort((a, b) => {
                const dA = safeDate(a.assignedAt) || safeDate(a.createdAt);
                const dB = safeDate(b.assignedAt) || safeDate(b.createdAt);
                return (dB ? dB.getTime() : 0) - (dA ? dA.getTime() : 0);
            });

            const groupIds = gSnap.docs.map(d => d.id);
            return { assignments: uniqueTests, userResults: myResults, groupIds };
        }
    });

    const refresh = () => {
        return queryClient.invalidateQueries({ queryKey });
    };

    return {
        assignments: data?.assignments || [],
        userResults: data?.userResults || [],
        groupIds: data?.groupIds || [],
        loading: isLoading,
        isFetching,
        error: error?.message,
        refresh 
    };
}
