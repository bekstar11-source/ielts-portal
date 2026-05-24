import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, query, orderBy, where, limit, startAfter, getCountFromServer
} from 'firebase/firestore';

export const useAdminUsers = () => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testSets, setTestSets] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMoreStudents, setHasMoreStudents] = useState(true);
    const [totalStudents, setTotalStudents] = useState(0);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const [teacherSnap, g, t, s] = await Promise.all([
                getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
                getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'tests_metadata'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'testSets'), orderBy('createdAt', 'desc'))),
            ]);

            const userQuery = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc'),
                limit(100)
            );
            const u = await getDocs(userQuery);
            const allFetchedUsers = u.docs.map(d => ({ id: d.id, ...d.data() }));

            allFetchedUsers.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            
            const countSnap = await getCountFromServer(collection(db, 'users'));
            setTotalStudents(countSnap.data().count);

            const studentList = allFetchedUsers.filter(user => user.role !== 'admin' && user.role !== 'teacher');
            setStudents(studentList);
            setLastDoc(u.docs[u.docs.length - 1]);
            setHasMoreStudents(u.docs.length === 100);

            setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setGroups(g.docs.map(d => ({ id: d.id, ...d.data() })));
            setAllTests(t.docs.map(d => ({ id: d.id, ...d.data() })));
            setTestSets(s.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    const loadMoreStudents = useCallback(async () => {
        if (!lastDoc || !hasMoreStudents) return;
        setLoading(true);
        try {
            const nextQuery = query(
                collection(db, 'users'),
                startAfter(lastDoc),
                limit(100)
            );
            const snap = await getDocs(nextQuery);
            const newUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const newStudents = newUsers.filter(user => user.role !== 'admin' && user.role !== 'teacher');
            
            setStudents(prev => [...prev, ...newStudents]);
            setLastDoc(snap.docs[snap.docs.length - 1]);
            setHasMoreStudents(snap.docs.length === 100);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    }, [lastDoc, hasMoreStudents]);

    useEffect(() => { 
        refreshData(); 
    }, [refreshData]);

    return {
        loading,
        students,
        teachers,
        groups,
        allTests,
        testSets,
        hasMoreStudents,
        totalStudents,
        refreshData,
        loadMoreStudents
    };
};
