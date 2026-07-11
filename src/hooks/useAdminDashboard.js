import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import {
    collection,
    getCountFromServer,
    getDocs,
    query,
    limit,
    where,
    doc,
    updateDoc,
    arrayUnion,
    orderBy
} from 'firebase/firestore';

const safeToDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export const useAdminDashboard = (isAuthorized) => {
    const [stats, setStats] = useState({ users: 0, tests: 0, results: 0, activityData: [], loading: true });
    const [allUsers, setAllUsers] = useState([]);
    const [displayedUsers, setDisplayedUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [groups, setGroups] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isAuthorized) return;

        const fetchInitialData = async () => {
            try {
                // Check Cache
                const cachedTime = sessionStorage.getItem("admin_data_time");
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 10 * 60 * 1000);

                if (isCacheValid) {
                    const cachedStats = sessionStorage.getItem("admin_stats");
                    const cachedGroups = sessionStorage.getItem("admin_groups");
                    if (cachedStats) {
                        setStats(JSON.parse(cachedStats));
                        if (cachedGroups) setGroups(JSON.parse(cachedGroups));
                        return;
                    }
                }

                // Fetch Counts
                const usersSnap = await getCountFromServer(collection(db, "users"));
                const testsCountSnap = await getCountFromServer(collection(db, "tests"));
                const totalResultsSnap = await getCountFromServer(collection(db, "results"));

                const statsData = {
                    users: usersSnap.data().count,
                    totalTests: testsCountSnap.data().count,
                    results: totalResultsSnap.data().count,
                    activityData: [],
                    loading: false
                };

                setStats(statsData);

                // Fetch Groups
                const groupsSnap = await getDocs(collection(db, "groups"));
                const groupsData = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setGroups(groupsData);

                // Cache
                sessionStorage.setItem("admin_stats", JSON.stringify(statsData));
                sessionStorage.setItem("admin_groups", JSON.stringify(groupsData));
                sessionStorage.setItem("admin_data_time", Date.now().toString());

            } catch (err) {
                console.error("Dashboard Stats Error:", err);
                setStats(prev => ({ ...prev, activityData: [], loading: false }));
            }
        };

        fetchInitialData();
    }, [isAuthorized]);

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const q = query(collection(db, "users"), limit(500));
            const snap = await getDocs(q);
            const studentsOnly = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.role !== 'admin' && u.role !== 'teacher');
            
            setAllUsers(studentsOnly);
            setDisplayedUsers(studentsOnly);
        } catch (err) {
            console.error("Fetch Users Error:", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleUpdateStatus = async (userId, newType) => {
        try {
            await updateDoc(doc(db, "users", userId), { studentType: newType });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, studentType: newType } : u));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const handleAddToGroup = async (userId, groupId) => {
        setProcessing(true);
        try {
            await updateDoc(doc(db, "groups", groupId), { studentIds: arrayUnion(userId) });
            await updateDoc(doc(db, "users", userId), { studentType: 'group', groupId: groupId });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, studentType: 'group', groupId: groupId } : u));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        } finally {
            setProcessing(false);
        }
    };

    const handleBlockUser = async (userId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await updateDoc(doc(db, "users", userId), { isBlocked: newStatus });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: newStatus } : u));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    return {
        stats, groups, allUsers, displayedUsers, setDisplayedUsers,
        loadingUsers, processing,
        fetchAllUsers, handleUpdateStatus, handleAddToGroup, handleBlockUser
    };
};
