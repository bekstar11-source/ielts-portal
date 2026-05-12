import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { calculateBandScore } from '../utils/ieltsScoring';

// --- Processing Logic (Extracted for purity) ---
const processResults = (results) => {
    if (!results || results.length === 0) return {
        averageScore: 0,
        skillAverages: { reading: 0, listening: 0, writing: 0, speaking: 0 },
        recentProgress: [],
        weakAreas: [],
        consistency: "Noma'lum",
        totalTests: 0,
        timeSpent: 0,
        allResults: []
    };

    const skillScores = { reading: [], listening: [], writing: [], speaking: [] };
    let totalTime = 0;

    results.forEach(r => {
        const type = String(r.type || "").toLowerCase();
        
        if (type === 'mock_full' || type.startsWith('mock')) {
            const rBand = parseFloat(r.scores?.readingBand || r.readingBand || r.reading || 0);
            const lBand = parseFloat(r.scores?.listeningBand || r.listeningBand || r.listening || 0);
            const wBand = parseFloat(r.scores?.writingBand || r.writingBand || r.scores?.writing || r.writing || r.writingScore || 0);
            const sBand = parseFloat(r.scores?.speakingBand || r.speakingBand || r.scores?.speaking || r.speaking || r.speakingScore || 0);

            if (rBand > 0) skillScores.reading.push(rBand);
            if (lBand > 0) skillScores.listening.push(lBand);
            if (wBand > 0) skillScores.writing.push(wBand);
            if (sBand > 0) skillScores.speaking.push(sBand);
        } else {
            let bScore = parseFloat(r.bandScore || r.writingBand || r.speakingBand || r.readingBand || r.listeningBand || 0);
            let exactType = String(r.type || "").toLowerCase();
            const title = String(r.testTitle || r.title || r.name || "").toLowerCase();
            
            if (exactType.includes('reading') || title.includes('reading') || title.includes('passage')) exactType = 'reading';
            else if (exactType.includes('listening') || title.includes('listening')) exactType = 'listening';
            else if (exactType.includes('writing') || title.includes('writing')) exactType = 'writing';
            else if (exactType.includes('speaking') || title.includes('speaking')) exactType = 'speaking';

            if (bScore === 0 && (r.score !== undefined || r.correctAnswers !== undefined)) {
                const rawScore = parseFloat(r.score || r.correctAnswers || 0);
                if (exactType === 'reading' || exactType === 'listening') {
                    bScore = calculateBandScore(rawScore, exactType, r.totalQuestions || 40) || 0;
                } else if (rawScore > 0 && rawScore <= 9) {
                    bScore = rawScore;
                }
            }

            if (bScore > 0) {
                if (exactType === 'reading') skillScores.reading.push(bScore);
                else if (exactType === 'listening') skillScores.listening.push(bScore);
                else if (exactType === 'writing') skillScores.writing.push(bScore);
                else if (exactType === 'speaking') skillScores.speaking.push(bScore);
            }
        }
        if (r.timeSpent) totalTime += r.timeSpent;
    });

    const calculateAvg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const skillAverages = {
        reading: calculateAvg(skillScores.reading),
        listening: calculateAvg(skillScores.listening),
        writing: calculateAvg(skillScores.writing),
        speaking: calculateAvg(skillScores.speaking)
    };

    const getValidBand = (r) => {
        let b = parseFloat(r.bandScore || 0);
        if (b === 0 && r.score !== undefined) {
            let t = String(r.type || "").toLowerCase();
            const raw = parseFloat(r.score);
            if (t.includes('reading') || t.includes('listening')) {
                b = calculateBandScore(raw, t.includes('reading') ? 'reading' : 'listening', r.totalQuestions || 40) || 0;
            } else b = raw;
        }
        return b;
    };

    const recentProgress = results.slice(0, 5).reverse().map(r => {
        let s = 0;
        const type = String(r.type || "").toLowerCase();
        if (type === 'mock_full' || type.startsWith('mock')) {
            s = parseFloat(r.scores?.overallBand || r.overallBand || 0);
            if (s === 0) s = (parseFloat(r.scores?.readingBand || 0) + parseFloat(r.scores?.listeningBand || 0)) / 2 || 0;
        } else s = getValidBand(r);
        return {
            date: r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
            score: s,
            type: r.type
        };
    });

    const scores = results.map(r => {
        const type = String(r.type || "").toLowerCase();
        if (type === 'mock_full' || type.startsWith('mock')) return parseFloat(r.scores?.overallBand || r.overallBand || 0);
        return getValidBand(r);
    }).filter(s => s > 0);

    const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const stdDev = Math.sqrt(scores.length ? scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length : 0);

    let consistencyLabel = "Barkamol";
    if (stdDev > 1.5) consistencyLabel = "O'zgaruvchan";
    else if (stdDev > 0.5) consistencyLabel = "Barqaror";
    else if (scores.length < 3) consistencyLabel = "Kam ma'lumot";

    const weakAreas = Object.entries(skillAverages)
        .filter(([_, avg]) => avg > 0 && avg < 6.0)
        .map(([skill]) => skill.charAt(0).toUpperCase() + skill.slice(1));

    const totalGraded = [].concat(...Object.values(skillScores));

    return {
        averageScore: totalGraded.length ? (totalGraded.reduce((a,b)=>a+b,0) / totalGraded.length).toFixed(1) : 0,
        skillAverages,
        recentProgress,
        consistency: consistencyLabel,
        totalTests: results.length,
        timeSpent: totalTime,
        weakAreas,
        allResults: results
    };
};

export function useAnalytics(userId, initialResults = null) {
    const { data: results, isLoading } = useQuery({
        queryKey: ['userAnalyticsResults', userId],
        enabled: !!userId && !initialResults,
        staleTime: 1000 * 60 * 5, // 5 minutes
        queryFn: async () => {
            const q = query(
                collection(db, 'results'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    });

    // Use either fetched results or initialResults
    const effectiveResults = initialResults || results || [];

    const stats = useMemo(() => processResults(effectiveResults), [effectiveResults]);

    return { stats, loading: initialResults ? false : isLoading };
}
