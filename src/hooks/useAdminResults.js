import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, orderBy, query, deleteDoc, doc, limit } from "firebase/firestore";

export const useAdminResults = () => {
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchData = async (force = false) => {
        setLoading(true);
        try {
            // Check SessionStorage cache (10 min TTL)
            if (!force) {
                const cachedTime = sessionStorage.getItem("admin_results_time");
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 10 * 60 * 1000);
                if (isCacheValid) {
                    const cached = sessionStorage.getItem("admin_results_data");
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                // Restore Date objects
                                const restored = parsed.map(r => ({
                                    ...r,
                                    date: r.date ? new Date(r.date) : null
                                }));
                                setResults(restored);
                                setFilteredResults(restored);
                                setLoading(false);
                                return;
                            }
                        } catch { /* corrupted cache */ }
                    }
                }
            }

            const q = query(collection(db, "results"), orderBy("date", "desc"), limit(300));
            const querySnapshot = await getDocs(q);
            
            const testsSnapshot = await getDocs(query(collection(db, "tests_metadata"), limit(200)));
            const validTestIds = new Set(testsSnapshot.docs.map(doc => doc.id));

            const podcastResultsSnapshot = await getDocs(query(collection(db, "podcastResults"), orderBy("createdAt", "desc"), limit(100)));
            const podcastData = podcastResultsSnapshot.docs.map((docSnap) => {
                const d = docSnap.data();
                return {
                    id: docSnap.id,
                    ...d,
                    userName: d.userName || "Noma'lum",
                    testTitle: d.podcastTitle || "Nomsiz Podcast",
                    type: "podcast",
                    score: d.score !== undefined ? `${d.score}/${d.total}` : "-",
                    status: "graded",
                    date: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : null,
                    isOrphan: false,
                    durationDisplay: "-",
                };
            });

            const data = querySnapshot.docs.map((doc) => {
                const d = doc.data();
                
                // Duration
                let currentTimeSpent = d.timeSpent;
                if (currentTimeSpent === undefined && d.attempts && Array.isArray(d.attempts) && d.attempts.length > 0) {
                    const lastAttempt = d.attempts[d.attempts.length - 1];
                    currentTimeSpent = lastAttempt.timeSpent;
                }
                
                let durationStr = "-";
                if (currentTimeSpent) {
                    const mins = Math.floor(currentTimeSpent / 60);
                    const secs = currentTimeSpent % 60;
                    durationStr = `${mins}m ${secs}s`;
                }
                
                // Score & Band Score
                let currentScore = d.score;
                if (currentScore === undefined && d.latestScore !== undefined) currentScore = d.latestScore;
                
                let currentBandScore = d.bandScore;
                if (currentBandScore === undefined && d.latestBandScore !== undefined) currentBandScore = d.latestBandScore;
                
                return {
                    id: doc.id,
                    ...d,
                    userName: d.userName || "Noma'lum",
                    testTitle: d.testTitle || "Nomsiz Test",
                    type: d.type || "other",
                    score: currentScore !== undefined ? currentScore : "-",
                    bandScore: currentBandScore,
                    status: d.status || "pending",
                    date: d.date ? (d.date.toDate ? d.date.toDate() : new Date(d.date)) : null,
                    isOrphan: d.testId && !validTestIds.has(d.testId),
                    durationDisplay: durationStr,
                };
            });

            const allResults = [...data, ...podcastData].sort((a, b) => (b.date || 0) - (a.date || 0));
            setResults(allResults);
            setFilteredResults(allResults);

            // Cache to SessionStorage
            try {
                sessionStorage.setItem("admin_results_data", JSON.stringify(allResults));
                sessionStorage.setItem("admin_results_time", Date.now().toString());
            } catch { /* sessionStorage full */ }
        } catch (error) {
            console.error("Error fetching results:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (resultId) => {
        if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
        try {
            await deleteDoc(doc(db, "results", resultId));
            setResults(prev => prev.filter(r => r.id !== resultId));
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        let temp = [...results];
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            temp = temp.filter(item => 
                (item.userName || "").toLowerCase().includes(lowerTerm) || 
                (item.testTitle || "").toLowerCase().includes(lowerTerm)
            );
        }
        if (typeFilter !== "all") temp = temp.filter(item => item.type === typeFilter);
        if (statusFilter !== "all") {
            if (statusFilter === 'graded') temp = temp.filter(item => item.status === 'graded' || item.status === 'published');
            else if (statusFilter === 'orphan') temp = temp.filter(item => item.isOrphan);
            else temp = temp.filter(item => item.status !== 'graded' && item.status !== 'published');
        }
        setFilteredResults(temp);
        setCurrentPage(1);
    }, [searchTerm, typeFilter, statusFilter, results]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

    return {
        results, filteredResults, currentItems, loading,
        searchTerm, setSearchTerm, typeFilter, setTypeFilter,
        statusFilter, setStatusFilter, currentPage, setCurrentPage,
        totalPages, indexOfFirstItem, indexOfLastItem, handleDelete,
        refresh: () => fetchData(true)
    };
};

export const formatDateTime = (dateObj) => {
    if (!dateObj) return { date: "-", time: "" };
    const d = new Date(dateObj);
    const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d).replace(/\//g, '.');
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d);
    return { date, time };
};