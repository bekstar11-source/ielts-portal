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

const isoDaysAgo = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

const computeTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
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

                const last30 = isoDaysAgo(30);
                const prev60 = isoDaysAgo(60);

                // Fetch Counts + Groups + trend windows + recent activity in parallel
                const [
                    usersSnap, testsCountSnap, totalResultsSnap, groupsSnap,
                    usersLast30Snap, usersPrev30Snap,
                    testsLast30Snap, testsPrev30Snap,
                    resultsLast30Snap, resultsPrev30Snap,
                    recentUsersSnap, recentResultsSnap
                ] = await Promise.all([
                    getCountFromServer(collection(db, "users")),
                    getCountFromServer(collection(db, "tests")),
                    getCountFromServer(collection(db, "results")),
                    getDocs(collection(db, "groups")),
                    getCountFromServer(query(collection(db, "users"), where("createdAt", ">=", last30))),
                    getCountFromServer(query(collection(db, "users"), where("createdAt", ">=", prev60), where("createdAt", "<", last30))),
                    getCountFromServer(query(collection(db, "tests"), where("createdAt", ">=", last30))),
                    getCountFromServer(query(collection(db, "tests"), where("createdAt", ">=", prev60), where("createdAt", "<", last30))),
                    getCountFromServer(query(collection(db, "results"), where("date", ">=", last30))),
                    getCountFromServer(query(collection(db, "results"), where("date", ">=", prev60), where("date", "<", last30))),
                    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5))),
                    getDocs(query(collection(db, "results"), orderBy("date", "desc"), limit(5)))
                ]);

                const recentUsers = recentUsersSnap.docs.map(d => ({
                    type: "user",
                    id: d.id,
                    label: d.data().fullName || "O'quvchi",
                    date: safeToDate(d.data().createdAt)
                }));
                const recentResults = recentResultsSnap.docs.map(d => ({
                    type: "result",
                    id: d.id,
                    label: d.data().userName || "Noma'lum",
                    detail: d.data().testTitle,
                    date: safeToDate(d.data().date)
                }));
                const activityData = [...recentUsers, ...recentResults]
                    .filter(a => a.date)
                    .sort((a, b) => b.date - a.date)
                    .slice(0, 6);

                const statsData = {
                    users: usersSnap.data().count,
                    totalTests: testsCountSnap.data().count,
                    results: totalResultsSnap.data().count,
                    trends: {
                        users: computeTrend(usersLast30Snap.data().count, usersPrev30Snap.data().count),
                        tests: computeTrend(testsLast30Snap.data().count, testsPrev30Snap.data().count),
                        results: computeTrend(resultsLast30Snap.data().count, resultsPrev30Snap.data().count)
                    },
                    activityData,
                    loading: false
                };

                const groupsData = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                setStats(statsData);
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
        const cachedTime = sessionStorage.getItem("admin_users_time");
        const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 10 * 60 * 1000);

        if (isCacheValid) {
            const cachedUsers = sessionStorage.getItem("admin_users");
            if (cachedUsers) {
                const studentsOnly = JSON.parse(cachedUsers);
                setAllUsers(studentsOnly);
                setDisplayedUsers(studentsOnly);
                return;
            }
        }

        setLoadingUsers(true);
        try {
            const q = query(collection(db, "users"), limit(500));
            const snap = await getDocs(q);
            const studentsOnly = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.role !== 'admin' && u.role !== 'teacher');

            setAllUsers(studentsOnly);
            setDisplayedUsers(studentsOnly);

            sessionStorage.setItem("admin_users", JSON.stringify(studentsOnly));
            sessionStorage.setItem("admin_users_time", Date.now().toString());
        } catch (err) {
            console.error("Fetch Users Error:", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const invalidateUsersCache = () => {
        sessionStorage.removeItem("admin_users");
        sessionStorage.removeItem("admin_users_time");
    };

    const handleUpdateStatus = async (userId, newType) => {
        try {
            await updateDoc(doc(db, "users", userId), { studentType: newType });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, studentType: newType } : u));
            invalidateUsersCache();
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
            invalidateUsersCache();
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
            invalidateUsersCache();
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
