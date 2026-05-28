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
                // Check Cache
                const cachedTime = sessionStorage.getItem("admin_analytics_time");
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 5 * 60 * 1000);

                if (isCacheValid) {
                    const cachedStats = sessionStorage.getItem("admin_analytics_stats");
                    const cachedActivity = sessionStorage.getItem("admin_analytics_activity");
                    const cachedDist = sessionStorage.getItem("admin_analytics_dist");
                    const cachedRadar = sessionStorage.getItem("admin_analytics_radar");
                    const cachedAtRisk = sessionStorage.getItem("admin_analytics_atRisk");

                    if (cachedStats && cachedActivity && cachedDist && cachedRadar && cachedAtRisk) {
                        setStats(JSON.parse(cachedStats));
                        setActivityData(JSON.parse(cachedActivity));
                        setScoreDist(JSON.parse(cachedDist));
                        setSkillRadar(JSON.parse(cachedRadar));
                        setAtRiskStudents(JSON.parse(cachedAtRisk));
                        setLoading(false);
                        return;
                    }
                }

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

                const statsData = {
                    totalTests: results.length,
                    avgScore,
                    activeStudents: activeUserCount,
                    completionRate
                };
                setStats(statsData);

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

                const finalActivityData = Object.entries(activityMap).map(([date, count]) => ({
                    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    tests: count
                }));
                setActivityData(finalActivityData);

                // 3. SCORE DISTRIBUTION
                const dist = { '0-4': 0, '4.5-5.5': 0, '6.0-7.0': 0, '7.5+': 0 };
                results.forEach(r => {
                    const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);
                    if (val < 4.5) dist['0-4']++;
                    else if (val < 6) dist['4.5-5.5']++;
                    else if (val < 7.5) dist['6.0-7.0']++;
                    else dist['7.5+']++;
                });
                const finalScoreDist = Object.entries(dist).map(([range, count]) => ({ range, count }));
                setScoreDist(finalScoreDist);

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

                const finalSkillRadar = Object.entries(skills).map(([subject, data]) => ({
                    subject,
                    A: data.n ? (data.sum / data.n).toFixed(1) : 0,
                    fullMark: 9
                }));
                setSkillRadar(finalSkillRadar);

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
                const finalAtRiskStudents = Array.from(atRiskMap.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
                setAtRiskStudents(finalAtRiskStudents);

                // Cache Data
                sessionStorage.setItem("admin_analytics_stats", JSON.stringify(statsData));
                sessionStorage.setItem("admin_analytics_activity", JSON.stringify(finalActivityData));
                sessionStorage.setItem("admin_analytics_dist", JSON.stringify(finalScoreDist));
                sessionStorage.setItem("admin_analytics_radar", JSON.stringify(finalSkillRadar));
                sessionStorage.setItem("admin_analytics_atRisk", JSON.stringify(finalAtRiskStudents));
                sessionStorage.setItem("admin_analytics_time", Date.now().toString());

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
