import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, query, orderBy, where, limit, startAfter, getCountFromServer
} from 'firebase/firestore';

export const useAdminUsers = (activeTab = 'students') => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testSets, setTestSets] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMoreStudents, setHasMoreStudents] = useState(true);
    const [totalStudents, setTotalStudents] = useState(0);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const userQuery = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc'),
                limit(100)
            );
            const [u, countSnap] = await Promise.all([
                getDocs(userQuery),
                getCountFromServer(collection(db, 'users'))
            ]);

            const allFetchedUsers = u.docs.map(d => ({ id: d.id, ...d.data() }));
            allFetchedUsers.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            
            setTotalStudents(countSnap.data().count);
            const studentList = allFetchedUsers.filter(user => user.role !== 'admin' && user.role !== 'teacher');
            
            setStudents(studentList);
            setLastDoc(u.docs[u.docs.length - 1]);
            setHasMoreStudents(u.docs.length === 100);
        } catch (e) {
            console.error("Error fetching students:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
            setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching teachers:", e);
        }
    };

    const fetchGroups = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc')));
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching groups:", e);
        }
    };

    const fetchTests = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'tests_metadata'), orderBy('createdAt', 'desc')));
            setAllTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching tests:", e);
        }
    };

    const fetchTestSets = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'testSets'), orderBy('createdAt', 'desc')));
            setTestSets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching test sets:", e);
        }
    };

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const promises = [fetchStudents()];
            
            if (activeTab === 'groups' || teachers.length > 0) promises.push(fetchTeachers());
            if (activeTab === 'groups' || activeTab === 'assign' || groups.length > 0) promises.push(fetchGroups());
            if (activeTab === 'assign' || activeTab === 'sets' || allTests.length > 0) promises.push(fetchTests());
            if (activeTab === 'sets' || testSets.length > 0) promises.push(fetchTestSets());

            await Promise.all(promises);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [activeTab, teachers.length, groups.length, allTests.length, testSets.length]);

    const loadMoreStudents = useCallback(async () => {
        if (!lastDoc || !hasMoreStudents) return;
        setLoading(true);
        try {
            const nextQuery = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc'),
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
        const loadTabRequiredData = async () => {
            if (students.length === 0) {
                await fetchStudents();
            }

            if (activeTab === 'groups') {
                const promises = [];
                if (teachers.length === 0) promises.push(fetchTeachers());
                if (groups.length === 0) promises.push(fetchGroups());
                if (promises.length > 0) {
                    setLoading(true);
                    await Promise.all(promises);
                    setLoading(false);
                }
            } else if (activeTab === 'assign') {
                const promises = [];
                if (groups.length === 0) promises.push(fetchGroups());
                if (allTests.length === 0) promises.push(fetchTests());
                if (promises.length > 0) {
                    setLoading(true);
                    await Promise.all(promises);
                    setLoading(false);
                }
            } else if (activeTab === 'sets') {
                const promises = [];
                if (testSets.length === 0) promises.push(fetchTestSets());
                if (allTests.length === 0) promises.push(fetchTests());
                if (promises.length > 0) {
                    setLoading(true);
                    await Promise.all(promises);
                    setLoading(false);
                }
            }
        };

        loadTabRequiredData();
    }, [activeTab]);

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
