import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export function useAnalytics(userId, initialResults = null) {
    const [stats, setStats] = useState({
        averageScore: 0,
        skillAverages: { reading: 0, listening: 0, writing: 0, speaking: 0 },
        recentProgress: [],
        weakAreas: [],
        consistency: 0,
        totalTests: 0,
        timeSpent: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const processResults = (results) => {
            // 1. Calculate Averages
            let totalScore = 0;
            const skillScores = { reading: [], listening: [], writing: [], speaking: [] };
            let totalTime = 0;

            results.forEach(r => {
                const score = parseFloat(r.bandScore || 0);
                totalScore += score;
                if (r.type && skillScores[r.type.toLowerCase()]) {
                    skillScores[r.type.toLowerCase()].push(score);
                }
                if (r.timeSpent) totalTime += r.timeSpent;
            });

            const calculateAvg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

            const skillAverages = {
                reading: calculateAvg(skillScores.reading),
                listening: calculateAvg(skillScores.listening),
                writing: calculateAvg(skillScores.writing),
                speaking: calculateAvg(skillScores.speaking)
            };

            // 2. Recent Progress (Last 5 tests)
            const recentProgress = results.slice(0, 5).reverse().map(r => ({
                date: r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : new Date(r.date || 0).toLocaleDateString()) : 'N/A',
                score: parseFloat(r.bandScore || 0),
                type: r.type
            }));

            // 3. Consistency (Standard Deviation)
            const scores = results.map(r => parseFloat(r.bandScore || 0)).filter(s => s > 0);
            const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const variance = scores.length ? scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length : 0;
            const stdDev = Math.sqrt(variance).toFixed(2);

            let consistencyLabel = "Barkamol";
            if (stdDev > 1.5) consistencyLabel = "O'zgaruvchan";
            else if (stdDev > 0.5) consistencyLabel = "Barqaror";
            else if (scores.length < 3) consistencyLabel = "Kam ma'lumot";

            // 4. Weak Areas
            const weakAreas = [];
            Object.entries(skillAverages).forEach(([skill, avg]) => {
                if (avg > 0 && avg < 6.0) weakAreas.push(`${skill.charAt(0).toUpperCase() + skill.slice(1)}`);
            });

            return {
                averageScore: results.length ? (totalScore / results.length).toFixed(1) : 0,
                skillAverages,
                recentProgress,
                consistency: consistencyLabel,
                totalTests: results.length,
                timeSpent: totalTime,
                weakAreas
            };
        };

        const fetchResults = async () => {
            try {
                // Agar tashqaridan natijalar kelsa, ularni ishlatamiz (Read larni tejash uchun)
                if (initialResults && initialResults.length > 0) {
                    const calculatedStats = processResults(initialResults);
                    setStats(calculatedStats);
                    setLoading(false);
                    return;
                }

                // 🚀 CACHE LOGIC
                const CACHE_KEY = `analytics_stats_${userId}`;
                const CACHE_TIME_KEY = `analytics_stats_time_${userId}`;
                const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 5 * 60 * 1000);

                if (isCacheValid) {
                    const cachedData = sessionStorage.getItem(CACHE_KEY);
                    if (cachedData) {
                        try {
                            setStats(JSON.parse(cachedData));
                            setLoading(false);
                            return;
                        } catch(e) { console.warn("Cache parse error", e); }
                    }
                }

                const q = query(
                    collection(db, 'results'),
                    where('userId', '==', userId)
                );
                const snapshot = await getDocs(q);
                let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 2. Sort results locally (Latest first)
                results.sort((a, b) => {
                    const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.date || 0).getTime();
                    const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date || 0).getTime();
                    return dateB - dateA;
                });

                const calculatedStats = processResults(results);

                sessionStorage.setItem(CACHE_KEY, JSON.stringify(calculatedStats));
                sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

                setStats(calculatedStats);
            } catch (error) {
                console.error("Analytics Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    // 🔥 FIX: initialResults o'rniga uzunligini ishlatamiz
    // Chunki initialResults har render da yangi array referansi bo'lib keladi
    // va shu sabab hook qayta ishga tushib results collection'ni qayta o'qib yuborar edi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, initialResults?.length]);

    return { stats, loading };
}
