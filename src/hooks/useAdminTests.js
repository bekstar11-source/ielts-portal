import { useState, useEffect, useRef } from 'react';
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
    getCountFromServer,
    addDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

export const useAdminTests = (PAGE_SIZE = 12) => {
    const [tests, setTests] = useState([]);
    const [allTestsCache, setAllTestsCache] = useState([]); // proactive full client-side cache for instant searching
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLastVisible, setPageLastVisible] = useState({});
    const [totalTestCount, setTotalTestCount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Stale-While-Revalidate (SWR) Page Cache
    const [swrCache, setSwrCache] = useState({}); // Key -> { tests, total }

    // Race-Condition Counter
    const latestRequestIdRef = useRef(0);
    // Client-side pagination fallback when compound queries lack indexes
    const fallbackDocsRef = useRef(null);

    const normalizeType = (type) => (type === 'All' ? 'All' : (type || '').toLowerCase());
    const cacheKeyFor = (type, collectionId, page) =>
        `${normalizeType(type)}_${collectionId || 'All'}_${page}`;

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

    // Helper to get total count via high-speed, lightweight Firestore counting
    const getFilterCount = async (type, collectionId) => {
        const normalizedType = normalizeType(type);
        try {
            let countConstraints = [];
            if (normalizedType !== "All") {
                countConstraints.push(where("type", "==", normalizedType));
            }
            if (collectionId !== "All") {
                if (collectionId === "None") {
                    countConstraints.push(where("collectionId", "==", null));
                } else {
                    countConstraints.push(where("collectionId", "==", collectionId));
                }
            }
            const qCount = query(collection(db, "tests_metadata"), ...countConstraints);
            const countSnap = await getCountFromServer(qCount);
            return countSnap.data().count;
        } catch (e) {
            console.error("Failed to get count:", e);
            return 0;
        }
    };

    // Proactively warm the search cache in the background on mount
    useEffect(() => {
        const warmCache = async () => {
            try {
                const snapAll = await getDocs(query(collection(db, "tests_metadata"), limit(1500)));
                const allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllTestsCache(allDocs);
            } catch (err) {
                console.error("Proactive search cache warming failed:", err);
            }
        };
        warmCache();
    }, []);

    const fetchInitial = async (type = "All", collectionId = "All") => {
        const requestId = ++latestRequestIdRef.current;
        const normalizedType = normalizeType(type);
        setIsSearching(false);
        fallbackDocsRef.current = null;

        const cacheKey = cacheKeyFor(type, collectionId, 1);
        const cached = swrCache[cacheKey];

        if (cached) {
            // Instant SWR Render: 0ms lag!
            setTests(cached.tests);
            setTotalTestCount(cached.total);
            setCurrentPage(1);
            setHasMore(cached.total > PAGE_SIZE);
            setLoading(false);
            setIsBackgroundRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            // 1. Kick off server-side count (fast, cheap)
            const totalPromise = getFilterCount(type, collectionId);

            // 2. Fetch page documents ordered by creation date
            let constraints = [];
            if (normalizedType !== "All") {
                constraints.push(where("type", "==", normalizedType));
            }
            if (collectionId !== "All") {
                if (collectionId === "None") {
                    constraints.push(where("collectionId", "==", null));
                } else {
                    constraints.push(where("collectionId", "==", collectionId));
                }
            }
            constraints.push(orderBy("createdAt", "desc"));
            constraints.push(limit(PAGE_SIZE));

            const qTests = query(collection(db, "tests_metadata"), ...constraints);
            const snapTests = await getDocs(qTests);
            
            const total = await totalPromise;

            // Shield: discard if a newer request was initiated
            if (requestId !== latestRequestIdRef.current) return;

            const testsData = snapTests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");

            // Save to SWR cache
            setSwrCache(prev => ({
                ...prev,
                [cacheKey]: { tests: testsData, total }
            }));

            setTests(testsData);
            setTotalTestCount(total);
            setCurrentPage(1);
            setPageLastVisible(
                snapTests.docs.length > 0
                    ? { 1: snapTests.docs[snapTests.docs.length - 1] }
                    : {}
            );
            setHasMore(testsData.length === PAGE_SIZE && testsData.length < total);
        } catch (err) {
            console.error("Fetch Initial Error:", err);
            // Fallback for missing compound indexes: fetch unordered and sort client-side
            try {
                let constraints = [];
                if (normalizedType !== "All") {
                    constraints.push(where("type", "==", normalizedType));
                }
                if (collectionId !== "All" && collectionId !== "None") {
                    constraints.push(where("collectionId", "==", collectionId));
                }
                if (collectionId === "None") {
                    constraints.push(where("collectionId", "==", null));
                }
                constraints.push(limit(500));

                const qTests = query(collection(db, "tests_metadata"), ...constraints);
                const snapTests = await getDocs(qTests);
                
                if (requestId !== latestRequestIdRef.current) return;

                let docs = snapTests.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
                
                docs.sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                });

                fallbackDocsRef.current = docs;
                const total = docs.length;
                const pageItems = docs.slice(0, PAGE_SIZE);

                setSwrCache(prev => ({
                    ...prev,
                    [cacheKey]: { tests: pageItems, total }
                }));

                setTests(pageItems);
                setTotalTestCount(total);
                setCurrentPage(1);
                setPageLastVisible({});
                setHasMore(total > PAGE_SIZE);
            } catch (e2) {
                console.error("Index fallback failed:", e2);
            }
        } finally {
            if (requestId === latestRequestIdRef.current) {
                setLoading(false);
                setIsBackgroundRefreshing(false);
            }
        }

        if (collections.length === 0) {
            await fetchCollections();
        }
    };

    const fetchPage = async (page, type = "All", collectionId = "All") => {
        if (page === currentPage && !isSearching) return;

        const requestId = ++latestRequestIdRef.current;
        const normalizedType = normalizeType(type);
        const cacheKey = cacheKeyFor(type, collectionId, page);
        const cached = swrCache[cacheKey];

        // Client-side pagination when server-side cursor pagination is unavailable
        if (fallbackDocsRef.current) {
            const total = fallbackDocsRef.current.length;
            const start = (page - 1) * PAGE_SIZE;
            const pageItems = fallbackDocsRef.current.slice(start, start + PAGE_SIZE);
            setTests(pageItems);
            setCurrentPage(page);
            setHasMore(page * PAGE_SIZE < total);
            setSwrCache(prev => ({ ...prev, [cacheKey]: { tests: pageItems, total } }));
            setLoading(false);
            setIsBackgroundRefreshing(false);
            return;
        }

        if (cached) {
            // SWR instant page navigation
            setTests(cached.tests);
            setCurrentPage(page);
            setHasMore(page * PAGE_SIZE < cached.total);
            setLoading(false);
            setIsBackgroundRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const prevPageLastDoc = page > 1 ? pageLastVisible[page - 1] : null;
            
            let constraints = [];
            if (normalizedType !== "All") {
                constraints.push(where("type", "==", normalizedType));
            }
            if (collectionId !== "All") {
                if (collectionId === "None") {
                    constraints.push(where("collectionId", "==", null));
                } else {
                    constraints.push(where("collectionId", "==", collectionId));
                }
            }
            constraints.push(orderBy("createdAt", "desc"));
            
            if (prevPageLastDoc && page > 1) {
                constraints.push(startAfter(prevPageLastDoc));
            }
            constraints.push(limit(PAGE_SIZE));

            const qTests = query(collection(db, "tests_metadata"), ...constraints);
            const snapTests = await getDocs(qTests);
            
            if (requestId !== latestRequestIdRef.current) return;

            const testsData = snapTests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");

            const total = totalTestCount;

            setSwrCache(prev => ({
                ...prev,
                [cacheKey]: { tests: testsData, total }
            }));

            setTests(testsData);
            if (snapTests.docs.length > 0) {
                setPageLastVisible(prev => ({ ...prev, [page]: snapTests.docs[snapTests.docs.length - 1] }));
            }
            setCurrentPage(page);
            setHasMore(page * PAGE_SIZE < total);
        } catch (err) {
            console.error("Fetch Page Error:", err);
            // Re-fetch full filtered set for client-side page slice
            try {
                let constraints = [];
                if (normalizedType !== "All") {
                    constraints.push(where("type", "==", normalizedType));
                }
                if (collectionId !== "All" && collectionId !== "None") {
                    constraints.push(where("collectionId", "==", collectionId));
                }
                if (collectionId === "None") {
                    constraints.push(where("collectionId", "==", null));
                }
                constraints.push(limit(500));
                const snapTests = await getDocs(query(collection(db, "tests_metadata"), ...constraints));
                if (requestId !== latestRequestIdRef.current) return;

                let docs = snapTests.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
                docs.sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                });
                fallbackDocsRef.current = docs;
                const total = docs.length;
                const start = (page - 1) * PAGE_SIZE;
                const pageItems = docs.slice(start, start + PAGE_SIZE);
                setSwrCache(prev => ({ ...prev, [cacheKey]: { tests: pageItems, total } }));
                setTests(pageItems);
                setCurrentPage(page);
                setHasMore(page * PAGE_SIZE < total);
            } catch (e2) {
                console.error("Fetch Page fallback failed:", e2);
            }
        } finally {
            if (requestId === latestRequestIdRef.current) {
                setLoading(false);
                setIsBackgroundRefreshing(false);
            }
        }
    };

    const searchTests = async (term, type = "All", collectionId = "All") => {
        if (!term || term.trim().length < 2) {
            fetchInitial(type, collectionId);
            return;
        }

        const requestId = ++latestRequestIdRef.current;
        const normalizedType = normalizeType(type);
        fallbackDocsRef.current = null;
        setLoading(true);
        setIsSearching(true);

        try {
            const termLower = term.toLowerCase().trim();

            let allDocs = allTestsCache;
            if (allDocs.length === 0) {
                // Fetch on demand if background warm hasn't completed yet
                const snapAll = await getDocs(query(collection(db, "tests_metadata"), limit(1500)));
                allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllTestsCache(allDocs);
            }

            if (requestId !== latestRequestIdRef.current) return;

            let results = allDocs.filter(t => {
                if (t.id.startsWith("_tag") || t.id === "tag_metadata") return false;
                const titleMatch = (t.title || "").toLowerCase().includes(termLower);
                if (!titleMatch) return false;
                if (normalizedType !== "All" && t.type?.toLowerCase() !== normalizedType) return false;
                if (collectionId !== "All" && collectionId !== "None" && t.collectionId !== collectionId) return false;
                if (collectionId === "None" && t.collectionId) return false;
                return true;
            });

            // Sort descending client-side
            results.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

            // Show up to 100 accurate search matches instantly
            setTests(results.slice(0, 100));
            setTotalTestCount(results.length);
            setHasMore(false);
            setCurrentPage(1);
        } catch (err) {
            console.error("Search Error:", err);
        } finally {
            if (requestId === latestRequestIdRef.current) {
                setLoading(false);
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            await Promise.all([
                deleteDoc(doc(db, "tests", id)),
                deleteDoc(doc(db, "tests_metadata", id)).catch(() => {})
            ]);
            setTests(prev => prev.filter(t => t.id !== id));
            setAllTestsCache(prev => prev.filter(t => t.id !== id));
            setTotalTestCount(prev => prev - 1);
            setSwrCache({}); // Invalidate SWR cache to force reload
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
                batch.update(doc(db, "tests_metadata", id), { collectionId: collectionId === 'None' ? null : collectionId });
            });
            await batch.commit();
            
            // Sync current state
            setTests(prev => prev.map(t => testIds.includes(t.id) ? { ...t, collectionId: collectionId === 'None' ? null : collectionId } : t));
            setAllTestsCache(prev => prev.map(t => testIds.includes(t.id) ? { ...t, collectionId: collectionId === 'None' ? null : collectionId } : t));
            setSwrCache({}); // Invalidate SWR cache to force reload
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const addCollection = async (name, thumbnail = "", type = "reading") => {
        try {
            await addDoc(collection(db, "test_collections"), {
                name: name.trim(),
                thumbnail: thumbnail.trim(),
                type: type,
                createdAt: serverTimestamp()
            });
            await fetchCollections();
            return true;
        } catch (err) {
            console.error("Add Collection Error:", err);
            return false;
        }
    };

    const updateCollection = async (id, name, thumbnail = "", type = "reading") => {
        try {
            await updateDoc(doc(db, "test_collections", id), {
                name: name.trim(),
                thumbnail: thumbnail.trim(),
                type: type
            });
            await fetchCollections();
            return true;
        } catch (err) {
            console.error("Update Collection Error:", err);
            return false;
        }
    };

    const deleteCollection = async (id) => {
        try {
            await deleteDoc(doc(db, "test_collections", id));
            await fetchCollections();
            return true;
        } catch (err) {
            console.error("Delete Collection Error:", err);
            return false;
        }
    };

    useEffect(() => { fetchInitial(); }, []);

    return {
        tests, collections, loading, hasMore, totalTestCount, currentPage, isSearching, isBackgroundRefreshing,
        fetchInitial, fetchPage, searchTests, handleDelete, bulkAssignToCollection,
        addCollection, updateCollection, deleteCollection
    };
};
