import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { calculateBandScore } from '../utils/ieltsScoring';

export function useAnalytics(userId, initialResults = null) {
    const [stats, setStats] = useState({
        averageScore: 0,
        skillAverages: { reading: 0, listening: 0, writing: 0, speaking: 0 },
        recentProgress: [],
        weakAreas: [],
        consistency: 0,
        totalTests: 0,
        timeSpent: 0,
        allResults: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

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

            // 1. Calculate Averages
            const skillScores = { reading: [], listening: [], writing: [], speaking: [] };
            let totalTime = 0;

            results.forEach(r => {
                const type = String(r.type || "").toLowerCase();
                
                // --- FULL MOCK EXAM HANDLING ---
                if (type === 'mock_full' || type.startsWith('mock')) {
                    const rBand = parseFloat(r.scores?.readingBand || r.readingBand || r.reading || 0);
                    const lBand = parseFloat(r.scores?.listeningBand || r.listeningBand || r.listening || 0);
                    const wBand = parseFloat(r.scores?.writingBand || r.writingBand || r.scores?.writing || r.writing || r.writingScore || 0);
                    const sBand = parseFloat(r.scores?.speakingBand || r.speakingBand || r.scores?.speaking || r.speaking || r.speakingScore || 0);

                    if (rBand > 0) skillScores.reading.push(rBand);
                    if (lBand > 0) skillScores.listening.push(lBand);
                    if (wBand > 0) skillScores.writing.push(wBand);
                    if (sBand > 0) skillScores.speaking.push(sBand);
                } 
                // --- REGULAR TESTS HANDLING ---
                else {
                    // Try every possible field that could contain a score or band
                    let bScore = parseFloat(r.bandScore || r.writingBand || r.speakingBand || r.readingBand || r.listeningBand || 0);

                    // --- ULTRA ROBUST TYPE DETECTION ---
                    let exactType = String(r.type || "").toLowerCase();
                    const title = String(r.testTitle || r.title || r.name || "").toLowerCase();
                    const tags = Array.isArray(r.tags) ? r.tags.join(" ").toLowerCase() : "";
                    
                    const isReading = exactType.includes('reading') || title.includes('reading') || title.includes('passage') || title.includes('text') || tags.includes('reading');
                    const isListening = exactType.includes('listening') || title.includes('listening') || title.includes('audio') || tags.includes('listening');
                    const isWriting = exactType.includes('writing') || title.includes('writing') || title.includes('essay') || tags.includes('writing');
                    const isSpeaking = exactType.includes('speaking') || title.includes('speaking') || title.includes('interview') || tags.includes('speaking');

                    if (isReading) exactType = 'reading';
                    else if (isListening) exactType = 'listening';
                    else if (isWriting) exactType = 'writing';
                    else if (isSpeaking) exactType = 'speaking';

                    // Fallback to calculating band score if only raw score is available
                    if (bScore === 0 && (r.score !== undefined || r.correctAnswers !== undefined)) {
                        const rawScore = parseFloat(r.score || r.correctAnswers || 0);
                        if (exactType === 'reading' || exactType === 'listening') {
                            const totalQ = r.totalQuestions || 40;
                            bScore = calculateBandScore(rawScore, exactType, totalQ) || 0;
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

            // Helper for fallback band calculation
            const getValidBand = (r) => {
                let b = parseFloat(r.bandScore || 0);
                if (b === 0 && r.score !== undefined && r.score !== null) {
                    let t = String(r.type || "").toLowerCase();
                    const title = String(r.testTitle || "").toLowerCase();
                    if (!t.includes('reading') && !t.includes('listening') && !t.includes('writing') && !t.includes('speaking')) {
                        if (title.includes('reading')) t = 'reading';
                        else if (title.includes('listening')) t = 'listening';
                        else if (title.includes('writing')) t = 'writing';
                        else if (title.includes('speaking')) t = 'speaking';
                    }

                    const raw = parseFloat(r.score);
                    if (t.includes('reading') || t.includes('listening')) {
                        const exactType = t.includes('reading') ? 'reading' : 'listening';
                        b = calculateBandScore(raw, exactType, r.totalQuestions || 40) || 0;
                    } else {
                        b = raw;
                    }
                }
                return b;
            };

            // 2. Recent Progress
            const recentProgress = results.slice(0, 5).reverse().map(r => {
                let s = 0;
                const type = String(r.type || "").toLowerCase();
                if (type === 'mock_full' || type.startsWith('mock')) {
                    // Try to get overall or average
                    s = parseFloat(r.scores?.overallBand || r.overallBand || 0);
                    if (s === 0) {
                        const b1 = parseFloat(r.scores?.readingBand || 0);
                        const b2 = parseFloat(r.scores?.listeningBand || 0);
                        s = (b1 + b2) / 2 || 0;
                    }
                } else {
                    s = getValidBand(r);
                }
                return {
                    date: r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : new Date(r.date || 0).toLocaleDateString()) : 'N/A',
                    score: s,
                    type: r.type
                };
            });

            // 3. Consistency
            const scores = results.map(r => {
                const type = String(r.type || "").toLowerCase();
                if (type === 'mock_full' || type.startsWith('mock')) {
                    const s = parseFloat(r.scores?.overallBand || r.overallBand || 0);
                    if (s > 0) return s;
                    const b1 = parseFloat(r.scores?.readingBand || 0);
                    const b2 = parseFloat(r.scores?.listeningBand || 0);
                    return (b1 + b2) / 2 || 0;
                }
                return getValidBand(r);
            }).filter(s => s > 0);
            const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const variance = scores.length ? scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length : 0;
            const stdDev = Math.sqrt(variance);

            let consistencyLabel = "Barkamol";
            if (stdDev > 1.5) consistencyLabel = "O'zgaruvchan";
            else if (stdDev > 0.5) consistencyLabel = "Barqaror";
            else if (scores.length < 3) consistencyLabel = "Kam ma'lumot";

            // 4. Weak Areas
            const weakAreas = [];
            Object.entries(skillAverages).forEach(([skill, avg]) => {
                if (avg > 0 && avg < 6.0) weakAreas.push(`${skill.charAt(0).toUpperCase() + skill.slice(1)}`);
            });

            const totalGraded = [].concat(...Object.values(skillScores));

            const processed = {
                averageScore: totalGraded.length ? (totalGraded.reduce((a,b)=>a+b,0) / totalGraded.length).toFixed(1) : 0,
                skillAverages,
                recentProgress,
                consistency: consistencyLabel,
                totalTests: results.length,
                timeSpent: totalTime,
                weakAreas,
                allResults: results
            };

            if (typeof window !== 'undefined') {
                window.__DEBUG_ANALYTICS__ = { 
                    resultsCount: results.length,
                    results: results.slice(0, 3), // Faqat bir nechtasini ko'ramiz
                    processed 
                };
            }

            return processed;
        };

        const fetchResults = async () => {
            try {
                if (initialResults && initialResults.length > 0) {
                    console.log(`[useAnalytics] Processing ${initialResults.length} initial results...`);
                    const calculatedStats = processResults(initialResults);
                    setStats(calculatedStats);
                    setLoading(false);
                    
                    // Natijalarni keshga ham yangilab qo'yamiz
                    if (calculatedStats.totalTests > 0 && calculatedStats.averageScore > 0) {
                        const CACHE_KEY = `analytics_stats_v6_${userId}`;
                        const CACHE_TIME_KEY = `analytics_stats_time_v6_${userId}`;
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify(calculatedStats));
                        sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                    }
                    return;
                }

                // 🚀 CACHE LOGIC
                const CACHE_KEY = `analytics_stats_v7_${userId}`;
                const CACHE_TIME_KEY = `analytics_stats_time_v7_${userId}`;
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
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    limit(50) // PERF: Limit to last 50 results for analytics
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

                sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                
                // Faqat ma'lumot bo'lsagina keshga saqlaymiz (0 ballarni keshlamaymiz)
                if (calculatedStats.totalTests > 0 && calculatedStats.averageScore > 0) {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(calculatedStats));
                }

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
