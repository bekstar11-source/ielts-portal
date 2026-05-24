import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";

export function useAdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalTests: 0,
        avgScore: 0,
        activeStudents: 0,
        completionRate: 0
    });
    const [activityData, setActivityData] = useState([]);
    const [scoreDist, setScoreDist] = useState([]);
    const [skillRadar, setSkillRadar] = useState([]);
    const [atRiskStudents, setAtRiskStudents] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [resultsSnap, usersSnap, testsSnap] = await Promise.all([
                    getDocs(query(collection(db, "results"), orderBy("createdAt", "desc"), limit(1000))),
                    getDocs(query(collection(db, "users"), limit(1000))),
                    getDocs(collection(db, "tests_metadata"))
                ]);

                const results = resultsSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate() })).reverse();
                const users = usersSnap.docs.filter(d => d.data().role !== 'admin');
                const tests = testsSnap.docs;

                // 1. KPI STATS
                const totalScore = results.reduce((a, b) => a + (Number(b.bandScore) || Number(b.score) || 0), 0);
                const avgScore = results.length ? (totalScore / results.length).toFixed(1) : 0;
                const activeUserCount = users.filter(u => (u.data().stats?.totalTests || 0) > 0).length;
                const completionRate = users.length ? Math.round((activeUserCount / users.length) * 100) : 0;

                setStats({
                    totalTests: results.length,
                    avgScore,
                    activeStudents: activeUserCount,
                    completionRate
                });

                // 2. ACTIVITY CHART (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                const activityMap = last7Days.reduce((acc, date) => {
                    acc[date] = 0;
                    return acc;
                }, {});

                results.forEach(r => {
                    if (r.createdAt) {
                        const date = r.createdAt.toISOString().split('T')[0];
                        if (activityMap.hasOwnProperty(date)) activityMap[date]++;
                    }
                });

                setActivityData(Object.entries(activityMap).map(([date, count]) => ({
                    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    tests: count
                })));

                // 3. SCORE DISTRIBUTION
                const dist = { '0-4': 0, '4.5-5.5': 0, '6.0-7.0': 0, '7.5+': 0 };
                results.forEach(r => {
                    const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);
                    if (val < 4.5) dist['0-4']++;
                    else if (val < 6) dist['4.5-5.5']++;
                    else if (val < 7.5) dist['6.0-7.0']++;
                    else dist['7.5+']++;
                });
                setScoreDist(Object.entries(dist).map(([range, count]) => ({ range, count })));

                // 4. SKILL RADAR
                const skills = { Reading: { sum: 0, n: 0 }, Listening: { sum: 0, n: 0 }, Writing: { sum: 0, n: 0 }, Speaking: { sum: 0, n: 0 } };
                const testTypeMap = {};
                tests.forEach(t => testTypeMap[t.id] = t.data().type);

                results.forEach(r => {
                    let type = r.type;
                    if (!type && r.testId) type = testTypeMap[r.testId];
                    if (type) type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

                    if (skills[type]) {
                        const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);
                        skills[type].sum += val;
                        skills[type].n++;
                    }
                });

                setSkillRadar(Object.entries(skills).map(([subject, data]) => ({
                    subject,
                    A: data.n ? (data.sum / data.n).toFixed(1) : 0,
                    fullMark: 9
                })));

                // 5. AT-RISK STUDENTS
                const atRiskMap = new Map();
                results.forEach(r => {
                    const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);
                    if (val < 5.0) {
                        if (!atRiskMap.has(r.userId) || r.createdAt > atRiskMap.get(r.userId).createdAt) {
                            atRiskMap.set(r.userId, {
                                id: r.userId,
                                name: r.userName || 'Unknown Student',
                                score: val,
                                subject: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1)) : 'Test',
                                createdAt: r.createdAt
                            });
                        }
                    }
                });
                setAtRiskStudents(Array.from(atRiskMap.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5));

            } catch (e) {
                console.error("Analytics Error:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return {
        loading,
        stats,
        activityData,
        scoreDist,
        skillRadar,
        atRiskStudents
    };
}
