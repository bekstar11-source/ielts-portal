import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/firebase';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    limit,
    writeBatch,
    addDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

export const useAdminTests = (PAGE_SIZE = 12) => {
    const [allTestsCache, setAllTestsCache] = useState([]); // full client-side cache
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
    
    // States for sorting, filtering, and pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [filterCollection, setFilterCollection] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All"); // All, Public, Private
    const [filterAccess, setFilterAccess] = useState("All"); // All, Free, Paid
    const [filterTag, setFilterTag] = useState("All"); // All, Tag name
    const [sortBy, setSortBy] = useState("createdAt"); // createdAt, title, difficulty
    const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
    const [currentPage, setCurrentPage] = useState(1);

    const fetchCollections = async () => {
        try {
            const qCols = query(collection(db, "test_collections"), orderBy("createdAt", "asc"));
            const snapCols = await getDocs(qCols);
            setCollections(snapCols.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
            try {
                const snapCols = await getDocs(collection(db, "test_collections"));
                setCollections(snapCols.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e2) {
                console.error("Failed to load collections:", e2);
            }
        }
    };

    // Warm the cache on mount
    useEffect(() => {
        const warmCache = async () => {
            try {
                setLoading(true);
                const snapAll = await getDocs(query(collection(db, "tests_metadata"), limit(1500)));
                const allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllTestsCache(allDocs);
            } catch (err) {
                console.error("Proactive search cache warming failed:", err);
            } finally {
                setLoading(false);
            }
        };
        warmCache();
        fetchCollections();
    }, []);

    // Filter, sort, and search list reactively
    const { filteredAndSortedTests, totalTestCount } = useMemo(() => {
        let list = [...allTestsCache];

        // 1. Type Filter
        if (filterType !== "All") {
            const typeLower = filterType.toLowerCase();
            list = list.filter(t => t.type?.toLowerCase() === typeLower);
        }

        // 2. Collection Filter
        if (filterCollection !== "All") {
            if (filterCollection === "None") {
                list = list.filter(t => !t.collectionId);
            } else {
                list = list.filter(t => t.collectionId === filterCollection);
            }
        }

        // 3. Status Filter
        if (filterStatus !== "All") {
            const wantPublic = filterStatus === "Public";
            list = list.filter(t => !!t.isPublic === wantPublic);
        }

        // 4. Access Filter
        if (filterAccess !== "All") {
            const wantFree = filterAccess === "Free";
            list = list.filter(t => !!t.isFree === wantFree);
        }

        // 4b. Tag Filter
        if (filterTag !== "All") {
            list = list.filter(t => Array.isArray(t.tags) && t.tags.includes(filterTag));
        }

        // 5. Search filter
        if (searchTerm.trim().length >= 2) {
            const termLower = searchTerm.toLowerCase().trim();
            list = list.filter(t => 
                (t.title || "").toLowerCase().includes(termLower) ||
                t.id.toLowerCase().includes(termLower)
            );
        }

        // 6. Sort
        list.sort((a, b) => {
            let valA, valB;

            if (sortBy === 'title') {
                valA = (a.title || "").toLowerCase();
                valB = (b.title || "").toLowerCase();
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sortBy === 'difficulty') {
                const diffMap = { easy: 1, medium: 2, hard: 3 };
                valA = diffMap[(a.difficulty || "medium").toLowerCase()] || 2;
                valB = diffMap[(b.difficulty || "medium").toLowerCase()] || 2;
            } else {
                // Default: createdAt
                valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return { filteredAndSortedTests: list, totalTestCount: list.length };
    }, [allTestsCache, filterType, filterCollection, filterStatus, filterAccess, filterTag, searchTerm, sortBy, sortOrder]);

    // Current page slice
    const tests = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredAndSortedTests.slice(start, start + PAGE_SIZE);
    }, [filteredAndSortedTests, currentPage, PAGE_SIZE]);

    // Calculate stats reactively
    const stats = useMemo(() => {
        const total = allTestsCache.length;
        const publicCount = allTestsCache.filter(t => t.isPublic).length;
        const privateCount = total - publicCount;
        const freeCount = allTestsCache.filter(t => t.isFree).length;
        const mockCount = allTestsCache.filter(t => t.type === 'mock').length;
        return { total, publicCount, privateCount, freeCount, mockCount };
    }, [allTestsCache]);

    // Calculate all available tags dynamically from loaded tests
    const allAvailableTags = useMemo(() => {
        const tagsSet = new Set();
        allTestsCache.forEach(t => {
            if (Array.isArray(t.tags)) {
                t.tags.forEach(tag => {
                    if (tag) tagsSet.add(tag);
                });
            }
        });
        return Array.from(tagsSet).sort();
    }, [allTestsCache]);

    // Compatible function handlers to update filter state from external triggers
    const fetchInitial = (type = "All", collectionId = "All") => {
        setFilterType(type);
        setFilterCollection(collectionId);
        setCurrentPage(1);
    };

    const fetchPage = (page) => {
        setCurrentPage(page);
    };

    const searchTests = (term) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    // Actions
    const handleDelete = async (id) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "tests", id));
            batch.delete(doc(db, "tests_metadata", id));
            await batch.commit();

            setAllTestsCache(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (err) {
            console.error("Delete Error:", err);
            return false;
        }
    };

    const bulkDeleteTests = async (ids) => {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.delete(doc(db, "tests", id));
                batch.delete(doc(db, "tests_metadata", id));
            });
            await batch.commit();

            setAllTestsCache(prev => prev.filter(t => !ids.includes(t.id)));
            return true;
        } catch (err) {
            console.error("Bulk Delete Error:", err);
            return false;
        }
    };

    const bulkAssignToCollection = async (testIds, collectionId) => {
        try {
            const batch = writeBatch(db);
            const finalColId = collectionId === 'None' || !collectionId ? null : collectionId;
            testIds.forEach(id => {
                batch.update(doc(db, "tests", id), { collectionId: finalColId });
                batch.update(doc(db, "tests_metadata", id), { collectionId: finalColId });
            });
            await batch.commit();
            
            setAllTestsCache(prev => prev.map(t => testIds.includes(t.id) ? { ...t, collectionId: finalColId } : t));
            return true;
        } catch (err) {
            console.error("Bulk Move Error:", err);
            return false;
        }
    };

    const bulkUpdateStatus = async (ids, isPublic) => {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.update(doc(db, "tests", id), { isPublic });
                batch.update(doc(db, "tests_metadata", id), { isPublic });
            });
            await batch.commit();

            setAllTestsCache(prev => prev.map(t => ids.includes(t.id) ? { ...t, isPublic } : t));
            return true;
        } catch (err) {
            console.error("Bulk Status Error:", err);
            return false;
        }
    };

    const bulkUpdateIsFree = async (ids, isFree) => {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.update(doc(db, "tests", id), { isFree });
                batch.update(doc(db, "tests_metadata", id), { isFree });
            });
            await batch.commit();

            setAllTestsCache(prev => prev.map(t => ids.includes(t.id) ? { ...t, isFree } : t));
            return true;
        } catch (err) {
            console.error("Bulk Free Error:", err);
            return false;
        }
    };

    const duplicateTest = async (id) => {
        try {
            const { getDoc, doc } = await import("firebase/firestore");
            const fullDocRef = doc(db, "tests", id);
            const fullSnap = await getDoc(fullDocRef);
            if (!fullSnap.exists()) {
                throw new Error("Test not found");
            }
            const origData = fullSnap.data();
            const metaSnap = await getDoc(doc(db, "tests_metadata", id));

            const batch = writeBatch(db);
            const newTestDocRef = doc(collection(db, "tests"));
            const newId = newTestDocRef.id;

            const newTitle = `Copy of ${origData.title || "Untitled"}`;
            const nowIso = new Date().toISOString();

            const newTestData = {
                ...origData,
                id: newId,
                title: newTitle,
                createdAt: nowIso,
                updatedAt: nowIso
            };
            batch.set(newTestDocRef, newTestData);

            let newMetaData = {};
            if (metaSnap.exists()) {
                newMetaData = {
                    ...metaSnap.data(),
                    id: newId,
                    title: newTitle,
                    createdAt: nowIso,
                    updatedAt: nowIso
                };
            } else {
                newMetaData = {
                    id: newId,
                    title: newTitle,
                    type: origData.type || "reading",
                    difficulty: origData.difficulty || "medium",
                    duration: Number(origData.duration) || 60,
                    isExclusive: origData.isExclusive || false,
                    isFree: origData.isFree || false,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    collectionId: origData.collectionId || null,
                    questionTypes: origData.questionTypes || []
                };
            }
            batch.set(doc(db, "tests_metadata", newId), newMetaData);

            await batch.commit();

            setAllTestsCache(prev => [newMetaData, ...prev]);
            return newId;
        } catch (err) {
            console.error("Duplicate Error:", err);
            return null;
        }
    };

    const importTests = async (testList) => {
        try {
            const testsToImport = Array.isArray(testList) ? testList : [testList];
            const batch = writeBatch(db);
            const importedMetadataList = [];

            const { getQuestionTypesFromQuestions } = await import("../components/admin/CreateTest/CreateTestUtils");

            for (const test of testsToImport) {
                const newTestDocRef = doc(collection(db, "tests"));
                const newId = newTestDocRef.id;
                const nowIso = new Date().toISOString();

                const newTestData = {
                    ...test,
                    id: newId,
                    title: test.title || "Imported Test",
                    type: test.type || "reading",
                    difficulty: test.difficulty || "medium",
                    duration: Number(test.duration) || 60,
                    passages: test.passages || [],
                    questions: test.questions || [],
                    keywordTable: test.keywordTable || [],
                    writingTasks: test.writingTasks || [],
                    speakingTasks: test.speakingTasks || [],
                    createdAt: nowIso,
                    updatedAt: nowIso
                };
                batch.set(newTestDocRef, newTestData);

                const newMetaData = {
                    id: newId,
                    title: newTestData.title,
                    type: newTestData.type,
                    difficulty: newTestData.difficulty,
                    duration: newTestData.duration,
                    isExclusive: test.isExclusive || false,
                    isFree: test.isFree || false,
                    isPublic: test.isPublic || false,
                    collectionId: test.collectionId || null,
                    questionTypes: test.questionTypes || getQuestionTypesFromQuestions(newTestData.questions),
                    createdAt: nowIso,
                    updatedAt: nowIso
                };
                batch.set(doc(db, "tests_metadata", newId), newMetaData);
                importedMetadataList.push(newMetaData);
            }

            await batch.commit();

            setAllTestsCache(prev => [...importedMetadataList, ...prev]);
            return true;
        } catch (err) {
            console.error("Import Error:", err);
            return false;
        }
    };

    const addCollection = async (name, thumbnail = "", type = "reading", subTests = null) => {
        try {
            const data = {
                name: name.trim(),
                thumbnail: thumbnail.trim(),
                type: type,
                createdAt: serverTimestamp()
            };
            if (type === 'mock' && subTests) {
                data.subTests = subTests;
            }
            await addDoc(collection(db, "test_collections"), data);
            await fetchCollections();
            return true;
        } catch (err) {
            console.error("Add Collection Error:", err);
            return false;
        }
    };

    const updateCollection = async (id, name, thumbnail = "", type = "reading", subTests = null) => {
        try {
            const data = {
                name: name.trim(),
                thumbnail: thumbnail.trim(),
                type: type
            };
            if (type === 'mock' && subTests) {
                data.subTests = subTests;
            }
            await updateDoc(doc(db, "test_collections", id), data);
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

    const updateTestMetadata = async (id, title, collectionId, isFree) => {
        try {
            const finalColId = collectionId === 'None' || !collectionId ? null : collectionId;
            const updatedFields = {
                title: title.trim(),
                collectionId: finalColId,
                isFree: isFree || false,
                updatedAt: new Date().toISOString()
            };
            
            const batch = writeBatch(db);
            batch.update(doc(db, "tests", id), updatedFields);
            batch.update(doc(db, "tests_metadata", id), updatedFields);
            await batch.commit();
            
            setAllTestsCache(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
            return true;
        } catch (err) {
            console.error("Update Test Metadata Error:", err);
            return false;
        }
    };

    return {
        // States
        tests,
        collections,
        loading,
        totalTestCount,
        currentPage,
        filterAccess,
        filterTag,
        allAvailableTags,
        sortBy,
        sortOrder,

        // Setters
        setSearchTerm,
        setFilterType,
        setFilterCollection,
        setFilterStatus,
        setFilterAccess,
        setFilterTag,
        setSortBy,
        setSortOrder,
        setCurrentPage,

        // Functions
        fetchInitial,
        fetchPage,
        searchTests,
        handleDelete,
        bulkDeleteTests,
        bulkAssignToCollection,
        bulkUpdateStatus,
        bulkUpdateIsFree,
        duplicateTest,
        importTests,
        addCollection,
        updateCollection,
        deleteCollection,
        updateTestMetadata
    };
};
