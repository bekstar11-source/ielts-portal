/**
 * O'qituvchining guruhlari, ulardagi o'quvchilar va natijalarni yuklaydi.
 *
 * Sahifa faqat ko'rinish bilan shug'ullanishi uchun barcha Firestore
 * mantiqi shu yerga yig'ilgan. `groups.assignedTests` ichidagi `set`
 * turidagi tayinlovlar `testSets` orqali haqiqiy test ID lariga yoyiladi —
 * "bajarilish foizi" aynan shu ID lar bo'yicha hisoblanadi.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { toDate } from '../utils/subscription';
import { collectStudentIds, chunkIds } from '../utils/teacherResults';

export function useGroupStats(userData) {
    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);
    const [results, setResults] = useState([]);
    const [testSetsMap, setTestSetsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // StrictMode / tez-tez qayta chaqirishda eski javob yangisini bosib
    // ketmasligi uchun.
    const requestRef = useRef(0);

    const fetchData = useCallback(async () => {
        if (!userData?.uid) return;
        const requestId = ++requestRef.current;
        setLoading(true);
        setError(null);

        try {
            const groupSnap = await getDocs(
                query(collection(db, 'groups'), where('teacherId', '==', userData.uid))
            );
            const fetchedGroups = groupSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

            if (!fetchedGroups.length) {
                if (requestId === requestRef.current) {
                    setGroups([]);
                    setStudents([]);
                    setResults([]);
                }
                return;
            }

            // Tayinlangan test to'plamlari
            const setIds = new Set();
            fetchedGroups.forEach((g) =>
                g.assignedTests?.forEach((t) => t?.type === 'set' && setIds.add(t.id))
            );

            const setsMap = {};
            if (setIds.size) {
                const snaps = await Promise.all(
                    [...setIds].map((id) => getDoc(doc(db, 'testSets', id)))
                );
                snaps.forEach((s) => {
                    if (s.exists()) setsMap[s.id] = s.data();
                });
            }

            fetchedGroups.forEach((g) => {
                g.realTestCount = (g.assignedTests || []).reduce(
                    (sum, t) =>
                        sum + (t?.type === 'set' ? setsMap[t.id]?.testIds?.length || 0 : 1),
                    0
                );
            });

            const studentIds = collectStudentIds(fetchedGroups);
            if (!studentIds.length) {
                if (requestId === requestRef.current) {
                    setGroups(fetchedGroups);
                    setTestSetsMap(setsMap);
                    setStudents([]);
                    setResults([]);
                }
                return;
            }

            const studentsData = [];
            const allResults = [];
            for (const chunk of chunkIds(studentIds)) {
                const [usnap, rsnap] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk))),
                    getDocs(query(collection(db, 'results'), where('userId', 'in', chunk))),
                ]);
                studentsData.push(...usnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                allResults.push(...rsnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            }

            allResults.sort(
                (a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0)
            );

            if (requestId !== requestRef.current) return;
            setGroups(fetchedGroups);
            setTestSetsMap(setsMap);
            setStudents(studentsData);
            setResults(allResults);
        } catch (e) {
            console.error('useGroupStats:', e);
            if (requestId === requestRef.current) setError(e);
        } finally {
            if (requestId === requestRef.current) setLoading(false);
        }
    }, [userData?.uid]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { groups, students, results, testSetsMap, loading, error, refresh: fetchData };
}
