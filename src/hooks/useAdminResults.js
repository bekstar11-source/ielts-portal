import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, orderBy, query, deleteDoc, doc, limit, writeBatch } from "firebase/firestore";

const CACHE_KEY = "admin_results_data";
const CACHE_TIME_KEY = "admin_results_time";
const PAGE_SIZE_KEY = "admin_results_page_size";
const CACHE_TTL = 10 * 60 * 1000;
export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

export const DATE_RANGES = {
    all: { label: "Butun davr", days: null },
    today: { label: "Bugun", days: 0 },
    week: { label: "7 kun", days: 7 },
    month: { label: "30 kun", days: 30 },
};

// Podcast natijalari boshqa kolleksiyada saqlanadi
const COLLECTION_BY_TYPE = { podcast: "podcastResults" };
const collectionForType = (type) => COLLECTION_BY_TYPE[type] || "results";

// 'published' ham baholangan hisoblanadi — filtr va badge bir xil mantiqda ishlashi uchun
export const isGraded = (status) => status === "graded" || status === "published";

const toDate = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

const formatDuration = (seconds) => {
    const s = Number(seconds);
    if (!Number.isFinite(s) || s <= 0) return "-";
    const total = Math.floor(s);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours > 0 ? `${hours}s ${mins}d` : `${mins}d ${secs}s`;
};

// Saralash uchun raqamli qiymat (band score ustunlik qiladi, "7/10" ko'rinishi ham qo'llab-quvvatlanadi)
const numericScore = (item) => {
    if (typeof item.bandScore === "number") return item.bandScore;
    if (typeof item.score === "number") return item.score;
    const raw = String(item.score ?? "");
    const match = raw.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?$/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    const total = match[2] ? parseFloat(match[2]) : null;
    return total ? (value / total) * 9 : value;
};

// Sana oralig'ining boshlanish nuqtasi (mahalliy vaqt bo'yicha kun boshidan)
const rangeStartDate = (key) => {
    const cfg = DATE_RANGES[key];
    if (!cfg || cfg.days === null) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (cfg.days > 0) d.setDate(d.getDate() - cfg.days + 1);
    return d;
};

const csvCell = (value) => {
    const str = value === undefined || value === null ? "" : String(value);
    // Formula injection'dan himoya: =, +, -, @ bilan boshlangan qiymatlar
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
};

export const useAdminResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("all");
    const [sort, setSort] = useState({ key: "date", dir: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [itemsPerPage, setItemsPerPageState] = useState(() => {
        const saved = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "", 10);
        return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 15;
    });

    const setItemsPerPage = useCallback((size) => {
        setItemsPerPageState(size);
        try { localStorage.setItem(PAGE_SIZE_KEY, String(size)); } catch { /* ignore */ }
    }, []);

    const isMounted = useRef(true);
    useEffect(() => () => { isMounted.current = false; }, []);

    // Toast 3 soniyadan keyin o'zi yopiladi
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    // Qidiruvni debounce qilish — har bosishda ro'yxat qayta hisoblanmasligi uchun
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const writeCache = useCallback((data) => {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
            sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        } catch { /* sessionStorage to'lgan */ }
    }, []);

    const fetchData = useCallback(async (force = false) => {
        if (force) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            if (!force) {
                const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
                const isCacheValid = cachedTime && Date.now() - parseInt(cachedTime, 10) < CACHE_TTL;
                if (isCacheValid) {
                    const cached = sessionStorage.getItem(CACHE_KEY);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            // Bo'sh massiv ham to'g'ri natija — uni ham keshdan qabul qilamiz
                            if (Array.isArray(parsed)) {
                                const restored = parsed.map((r) => ({ ...r, date: toDate(r.date) }));
                                if (isMounted.current) {
                                    setResults(restored);
                                    setLoading(false);
                                }
                                return;
                            }
                        } catch { /* buzilgan kesh */ }
                    }
                }
            }

            const [snapshot, testsSnapshot, podcastSnapshot] = await Promise.all([
                getDocs(query(collection(db, "results"), orderBy("date", "desc"), limit(300))),
                getDocs(collection(db, "tests_metadata")),
                getDocs(query(collection(db, "podcastResults"), orderBy("createdAt", "desc"), limit(100))),
            ]);

            const validTestIds = new Set(testsSnapshot.docs.map((d) => d.id));

            const podcastData = podcastSnapshot.docs.map((docSnap) => {
                const d = docSnap.data();
                return {
                    ...d,
                    id: docSnap.id,
                    userName: d.userName || "Noma'lum",
                    testTitle: d.podcastTitle || "Nomsiz Podcast",
                    type: "podcast",
                    score: d.score !== undefined && d.total ? `${d.score}/${d.total}` : (d.score ?? "-"),
                    bandScore: undefined,
                    status: "graded",
                    date: toDate(d.createdAt),
                    isOrphan: false,
                    durationDisplay: formatDuration(d.timeSpent),
                };
            });

            const data = snapshot.docs.map((docSnap) => {
                const d = docSnap.data();

                let timeSpent = d.timeSpent;
                if (timeSpent === undefined && Array.isArray(d.attempts) && d.attempts.length > 0) {
                    timeSpent = d.attempts[d.attempts.length - 1]?.timeSpent;
                }

                const score = d.score !== undefined ? d.score : d.latestScore;
                const bandScore = d.bandScore !== undefined ? d.bandScore : d.latestBandScore;

                return {
                    ...d,
                    id: docSnap.id,
                    userName: d.userName || "Noma'lum",
                    testTitle: d.testTitle || "Nomsiz Test",
                    type: d.type || "other",
                    score: score !== undefined ? score : "-",
                    bandScore,
                    status: d.status || "pending",
                    date: toDate(d.date),
                    isOrphan: Boolean(d.testId) && !validTestIds.has(d.testId),
                    durationDisplay: formatDuration(timeSpent),
                };
            });

            const allResults = [...data, ...podcastData].sort(
                (a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
            );

            if (!isMounted.current) return;
            setResults(allResults);
            writeCache(allResults);
        } catch (err) {
            console.error("Error fetching results:", err);
            if (isMounted.current) setError("Natijalarni yuklashda xatolik yuz berdi. Qayta urinib ko'ring.");
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [writeCache]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = useCallback(async (resultId) => {
        const target = results.find((r) => r.id === resultId);
        if (!target) return false;

        setDeletingId(resultId);
        setError(null);
        try {
            await deleteDoc(doc(db, collectionForType(target.type), resultId));
            const next = results.filter((r) => r.id !== resultId);
            if (isMounted.current) {
                setResults(next);
                setSelectedIds((prev) => {
                    if (!prev.has(resultId)) return prev;
                    const copy = new Set(prev);
                    copy.delete(resultId);
                    return copy;
                });
                setToast({ type: "success", message: "Natija o'chirildi" });
            }
            // Kesh ham yangilanadi, aks holda sahifa qayta ochilganda o'chirilgan natija qaytadi
            writeCache(next);
            return true;
        } catch (err) {
            console.error("Error deleting result:", err);
            if (isMounted.current) setError("O'chirib bo'lmadi. Ruxsatni tekshiring yoki qayta urinib ko'ring.");
            return false;
        } finally {
            if (isMounted.current) setDeletingId(null);
        }
    }, [results, writeCache]);

    const handleBulkDelete = useCallback(async () => {
        const targets = results.filter((r) => selectedIds.has(r.id));
        if (targets.length === 0) return false;

        setBulkDeleting(true);
        setError(null);
        try {
            // Firestore batch limiti 500 ta amal — bo'laklarga bo'lib yuboramiz
            for (let i = 0; i < targets.length; i += 400) {
                const batch = writeBatch(db);
                targets.slice(i, i + 400).forEach((t) => {
                    batch.delete(doc(db, collectionForType(t.type), t.id));
                });
                await batch.commit();
            }
            const removed = new Set(targets.map((t) => t.id));
            const next = results.filter((r) => !removed.has(r.id));
            if (isMounted.current) {
                setResults(next);
                setSelectedIds(new Set());
                setToast({ type: "success", message: `${targets.length} ta natija o'chirildi` });
            }
            writeCache(next);
            return true;
        } catch (err) {
            console.error("Error bulk deleting results:", err);
            if (isMounted.current) setError("Tanlangan natijalarni o'chirib bo'lmadi. Qayta urinib ko'ring.");
            return false;
        } finally {
            if (isMounted.current) setBulkDeleting(false);
        }
    }, [results, selectedIds, writeCache]);

    const filteredResults = useMemo(() => {
        let temp = results;

        if (debouncedSearch) {
            temp = temp.filter(
                (item) =>
                    (item.userName || "").toLowerCase().includes(debouncedSearch) ||
                    (item.testTitle || "").toLowerCase().includes(debouncedSearch) ||
                    item.id.toLowerCase().includes(debouncedSearch)
            );
        }
        if (typeFilter !== "all") temp = temp.filter((item) => item.type === typeFilter);
        if (statusFilter === "graded") temp = temp.filter((item) => isGraded(item.status));
        else if (statusFilter === "pending") temp = temp.filter((item) => !isGraded(item.status));
        else if (statusFilter === "orphan") temp = temp.filter((item) => item.isOrphan);

        const from = rangeStartDate(dateRange);
        if (from) temp = temp.filter((item) => item.date && item.date >= from);

        const dir = sort.dir === "asc" ? 1 : -1;
        return [...temp].sort((a, b) => {
            if (sort.key === "user") return dir * (a.userName || "").localeCompare(b.userName || "");
            if (sort.key === "score") {
                const av = numericScore(a);
                const bv = numericScore(b);
                if (av === null && bv === null) return 0;
                if (av === null) return 1;   // qiymatsizlar doim oxirida
                if (bv === null) return -1;
                return dir * (av - bv);
            }
            return dir * ((a.date?.getTime() || 0) - (b.date?.getTime() || 0));
        });
    }, [results, debouncedSearch, typeFilter, statusFilter, dateRange, sort]);

    const stats = useMemo(() => {
        const bands = results.map(numericScore).filter((v) => v !== null);
        return {
            total: results.length,
            graded: results.filter((r) => isGraded(r.status)).length,
            pending: results.filter((r) => !isGraded(r.status)).length,
            orphan: results.filter((r) => r.isOrphan).length,
            avgBand: bands.length ? (bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(1) : null,
            students: new Set(results.map((r) => r.userId || r.userName)).size,
        };
    }, [results]);

    const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));

    // Filtr o'zgarganda 1-sahifaga qaytish (natijalar o'zgarishi sahifani surib yubormaydi)
    useEffect(() => { setCurrentPage(1); }, [debouncedSearch, typeFilter, statusFilter, dateRange, sort, itemsPerPage]);

    // O'chirishdan keyin sahifa oxiridan chiqib ketmasligi uchun cheklab qo'yamiz
    useEffect(() => {
        setCurrentPage((p) => Math.min(p, totalPages));
    }, [totalPages]);

    const safePage = Math.min(currentPage, totalPages);
    const indexOfFirstItem = (safePage - 1) * itemsPerPage;
    const indexOfLastItem = indexOfFirstItem + itemsPerPage;
    const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);

    // --- Ko'p tanlash ---
    const toggleSelect = useCallback((id) => {
        setSelectedIds((prev) => {
            const copy = new Set(prev);
            if (copy.has(id)) copy.delete(id); else copy.add(id);
            return copy;
        });
    }, []);

    // Faqat joriy sahifadagi qatorlarni tanlaydi/bekor qiladi
    const togglePageSelection = useCallback(() => {
        setSelectedIds((prev) => {
            const pageIds = currentItems.map((r) => r.id);
            const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
            const copy = new Set(prev);
            pageIds.forEach((id) => (allSelected ? copy.delete(id) : copy.add(id)));
            return copy;
        });
    }, [currentItems]);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const pageSelectionState = useMemo(() => {
        if (currentItems.length === 0) return "none";
        const count = currentItems.filter((r) => selectedIds.has(r.id)).length;
        if (count === 0) return "none";
        return count === currentItems.length ? "all" : "some";
    }, [currentItems, selectedIds]);

    // Filtrlangan natijalarni CSV ga chiqarish (tanlov bo'lsa — faqat tanlanganlar)
    const exportCsv = useCallback(() => {
        const rows = selectedIds.size > 0
            ? filteredResults.filter((r) => selectedIds.has(r.id))
            : filteredResults;
        if (rows.length === 0) {
            setToast({ type: "error", message: "Eksport qilish uchun natija yo'q" });
            return;
        }

        const header = ["Sana", "Vaqt", "O'quvchi", "Test", "Tur", "Davomiylik", "Ball", "Band", "Status", "ID"];
        const lines = rows.map((r) => {
            const { date, time } = formatDateTime(r.date);
            return [
                date, time, r.userName, r.testTitle, r.type, r.durationDisplay,
                r.score ?? "", r.bandScore ?? "",
                isGraded(r.status) ? "Baholangan" : "Kutilmoqda", r.id,
            ].map(csvCell).join(",");
        });

        // BOM — Excel kirillcha/lotincha belgilarni to'g'ri o'qishi uchun
        const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `natijalar-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ type: "success", message: `${rows.length} ta natija eksport qilindi` });
    }, [filteredResults, selectedIds]);

    const hasActiveFilters = Boolean(searchTerm.trim()) || typeFilter !== "all" || statusFilter !== "all" || dateRange !== "all";
    const resetFilters = useCallback(() => {
        setSearchTerm("");
        setTypeFilter("all");
        setStatusFilter("all");
        setDateRange("all");
    }, []);

    const toggleSort = useCallback((key) => {
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { key, dir: key === "user" ? "asc" : "desc" }
        );
    }, []);

    return {
        results, filteredResults, currentItems, loading, refreshing, error, stats,
        deletingId, bulkDeleting, toast, dismissToast: () => setToast(null),
        searchTerm, setSearchTerm, typeFilter, setTypeFilter,
        statusFilter, setStatusFilter, dateRange, setDateRange,
        sort, toggleSort,
        currentPage: safePage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        totalPages, indexOfFirstItem, indexOfLastItem,
        selectedIds, toggleSelect, togglePageSelection, clearSelection, pageSelectionState,
        hasActiveFilters, resetFilters, handleDelete, handleBulkDelete, exportCsv,
        clearError: () => setError(null),
        refresh: () => fetchData(true),
    };
};

export const formatDateTime = (dateObj) => {
    if (!dateObj) return { date: "-", time: "" };
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return { date: "-", time: "" };
    const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d).replace(/\//g, '.');
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return { date, time };
};
