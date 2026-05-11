import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    writeBatch,
    getCountFromServer
} from 'firebase/firestore';

export const useAdminTests = (PAGE_SIZE = 12) => {
    const [tests, setTests] = useState([]);
    const [allTestsCache, setAllTestsCache] = useState([]); // client-side cache for search/filter
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLastVisible, setPageLastVisible] = useState({});
    const [totalTestCount, setTotalTestCount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchCollections = async () => {
        try {
            const qCols = query(collection(db, "test_collections"), orderBy("createdAt", "asc"));
            const snapCols = await getDocs(qCols);
            setCollections(snapCols.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            // orderBy may fail without index; fetch without sort as fallback
            try {
                const snapCols = await getDocs(collection(db, "test_collections"));
                setCollections(snapCols.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e2) {
                console.error("Failed to load collections:", e2);
            }
        }
    };

    // Client-side filter + sort + paginate helper
    const filterAndPaginate = (allDocs, page, type, collectionId) => {
        let filtered = allDocs.filter(t =>
            !t.id.startsWith("_tag") && t.id !== "tag_metadata"
        );

        if (type !== "All") {
            filtered = filtered.filter(t => t.type?.toLowerCase() === type.toLowerCase());
        }
        if (collectionId !== "All") {
            if (collectionId === "None") {
                filtered = filtered.filter(t => !t.collectionId);
            } else {
                filtered = filtered.filter(t => t.collectionId === collectionId);
            }
        }

        // Sort by createdAt descending client-side
        filtered.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });

        const total = filtered.length;
        const start = (page - 1) * PAGE_SIZE;
        const pageItems = filtered.slice(start, start + PAGE_SIZE);
        return { pageItems, total };
    };

    const fetchInitial = async (type = "All", collectionId = "All") => {
        setLoading(true);
        setIsSearching(false);
        try {
            const hasFilter = type !== "All" || collectionId !== "All";

            if (hasFilter) {
                // When filters are active: use where constraints WITHOUT orderBy
                // (avoids compound index requirement), then sort client-side
                let constraints = [];
                if (type !== "All") {
                    constraints.push(where("type", "==", type.toLowerCase()));
                }
                if (collectionId !== "All" && collectionId !== "None") {
                    constraints.push(where("collectionId", "==", collectionId));
                }
                if (collectionId === "None") {
                    constraints.push(where("collectionId", "==", null));
                }
                constraints.push(limit(500));

                const qTests = query(collection(db, "tests"), ...constraints);
                const snapTests = await getDocs(qTests);
                const allDocs = snapTests.docs.map(d => ({ id: d.id, ...d.data() }));

                const { pageItems, total } = filterAndPaginate(allDocs, 1, type, collectionId);
                setAllTestsCache(allDocs);
                setTests(pageItems);
                setTotalTestCount(total);
                setCurrentPage(1);
                setPageLastVisible({});
                setHasMore(total > PAGE_SIZE);
            } else {
                // No filters: use server-side pagination with orderBy
                const countSnap = await getCountFromServer(query(collection(db, "tests")));
                const total = countSnap.data().count;
                setTotalTestCount(total);

                if (total === 0) {
                    setTests([]);
                    setHasMore(false);
                    setCurrentPage(1);
                    setLoading(false);
                    return;
                }

                const qTests = query(
                    collection(db, "tests"),
                    orderBy("createdAt", "desc"),
                    limit(PAGE_SIZE)
                );
                const snapTests = await getDocs(qTests);
                const testsData = snapTests.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");

                setTests(testsData);
                setAllTestsCache([]);
                if (snapTests.docs.length > 0) {
                    setPageLastVisible({ 1: snapTests.docs[snapTests.docs.length - 1] });
                }
                setCurrentPage(1);
                setHasMore(snapTests.docs.length === PAGE_SIZE);
            }

            if (collections.length === 0) {
                await fetchCollections();
            }
        } catch (err) {
            console.error("Fetch Initial Error:", err);
            // Last resort fallback: fetch without any constraints
            try {
                const snapTests = await getDocs(query(collection(db, "tests"), limit(PAGE_SIZE)));
                const data = snapTests.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
                setTests(data);
                setTotalTestCount(data.length);
                setHasMore(false);
            } catch (e) {
                console.error("Fallback failed:", e);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPage = async (page, type = "All", collectionId = "All") => {
        if (page === currentPage && !isSearching) return;

        setLoading(true);
        try {
            const hasFilter = type !== "All" || collectionId !== "All";

            if (hasFilter) {
                if (allTestsCache.length > 0) {
                    // Use cached data for client-side pagination
                    const { pageItems, total } = filterAndPaginate(allTestsCache, page, type, collectionId);
                    setTests(pageItems);
                    setTotalTestCount(total);
                    setCurrentPage(page);
                    setHasMore(page * PAGE_SIZE < total);
                } else {
                    // Re-fetch if cache is empty
                    await fetchInitial(type, collectionId);
                    return;
                }
            } else {
                // Server-side cursor pagination (no filters)
                const prevPageLastDoc = page > 1 ? pageLastVisible[page - 1] : null;
                let constraints = [orderBy("createdAt", "desc")];
                if (prevPageLastDoc && page > 1) {
                    constraints.push(startAfter(prevPageLastDoc));
                }
                constraints.push(limit(PAGE_SIZE));

                const qTests = query(collection(db, "tests"), ...constraints);
                const snapTests = await getDocs(qTests);
                const testsData = snapTests.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");

                setTests(testsData);
                if (snapTests.docs.length > 0) {
                    setPageLastVisible(prev => ({ ...prev, [page]: snapTests.docs[snapTests.docs.length - 1] }));
                }
                setCurrentPage(page);
                setHasMore(snapTests.docs.length === PAGE_SIZE);
            }
            setIsSearching(false);
        } catch (err) {
            console.error("Fetch Page Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Search: fetch all and filter client-side (reliable substring matching)
    const searchTests = async (term, type = "All", collectionId = "All") => {
        if (!term || term.trim().length < 2) {
            fetchInitial(type, collectionId);
            return;
        }
        setLoading(true);
        setIsSearching(true);
        try {
            const termLower = term.toLowerCase().trim();

            // Use cache if available, otherwise fetch all
            let allDocs = allTestsCache;
            if (allDocs.length === 0) {
                const snapAll = await getDocs(query(collection(db, "tests"), limit(1000)));
                allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllTestsCache(allDocs);
            }

            let results = allDocs.filter(t => {
                if (t.id.startsWith("_tag") || t.id === "tag_metadata") return false;
                const titleMatch = (t.title || "").toLowerCase().includes(termLower);
                if (!titleMatch) return false;
                if (type !== "All" && t.type?.toLowerCase() !== type.toLowerCase()) return false;
                if (collectionId !== "All" && collectionId !== "None" && t.collectionId !== collectionId) return false;
                if (collectionId === "None" && t.collectionId) return false;
                return true;
            });

            // Sort by createdAt desc
            results.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

            setTests(results);
            setTotalTestCount(results.length);
            setHasMore(false);
            setCurrentPage(1);
        } catch (err) {
            console.error("Search Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "tests", id));
            setTests(prev => prev.filter(t => t.id !== id));
            setAllTestsCache(prev => prev.filter(t => t.id !== id));
            setTotalTestCount(prev => prev - 1);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const bulkAssignToCollection = async (testIds, collectionId) => {
        try {
            const batch = writeBatch(db);
            testIds.forEach(id => {
                batch.update(doc(db, "tests", id), { collectionId: collectionId === 'None' ? null : collectionId });
            });
            await batch.commit();
            setTests(prev => prev.map(t => testIds.includes(t.id) ? { ...t, collectionId: collectionId === 'None' ? null : collectionId } : t));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    useEffect(() => { fetchInitial(); }, []);

    return {
        tests, collections, loading, hasMore, totalTestCount, currentPage, isSearching,
        fetchInitial, fetchPage, searchTests, handleDelete, bulkAssignToCollection
    };
};
