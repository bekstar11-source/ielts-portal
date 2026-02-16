import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export function useAnalytics(userId) {
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
        if (!userId) return;

        const fetchResults = async () => {
            try {
                const q = query(
                    collection(db, 'results'),
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc') // Eng o'xirgi natijalar
                );
                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
                    date: r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
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

                // 4. Weak Areas (Fake Logic for now -> Need detailed question metadata)
                // Hozircha faqat Reading/Listening bo'yicha eng past o'rtacha ballni olamiz
                const weakAreas = [];
                Object.entries(skillAverages).forEach(([skill, avg]) => {
                    if (avg > 0 && avg < 6.0) weakAreas.push(`${skill.charAt(0).toUpperCase() + skill.slice(1)}`);
                });

                setStats({
                    averageScore: results.length ? (totalScore / results.length).toFixed(1) : 0,
                    skillAverages,
                    recentProgress,
                    consistency: consistencyLabel,
                    totalTests: results.length,
                    timeSpent: totalTime,
                    weakAreas
                });
            } catch (error) {
                console.error("Analytics Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [userId]);

    return { stats, loading };
}
