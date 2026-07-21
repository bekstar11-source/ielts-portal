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

const ADMIN_TESTS_CACHE_KEY = "admin_tests_data";
const ADMIN_TESTS_CACHE_TIME_KEY = "admin_tests_data_time";
const ADMIN_TESTS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const useAdminTests = (PAGE_SIZE = 12) => {
    const [allTestsCache, setAllTestsCache] = useState([]); // full client-side cache
    const [contentCache, setContentCache] = useState(null); // lazy-loaded combinedContent map
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
    
    // States for sorting, filtering, and pagination
    const [searchTerm, setSearchTerm] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_searchTerm");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "";
    });
    const [contentSearchTerm, setContentSearchTerm] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_contentSearchTerm");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "";
    });
    const [filterType, setFilterType] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_filterType");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "All";
    });
    const [filterCollection, setFilterCollection] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_filterCollection");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "All";
    });
    const [filterStatus, setFilterStatus] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_filterStatus");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "All";
    });
    const [filterAccess, setFilterAccess] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_filterAccess");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "All";
    });
    const [filterTag, setFilterTag] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_filterTag");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "All";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_sortBy");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "createdAt";
    });
    const [sortOrder, setSortOrder] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_sortOrder");
        return (saved && saved !== "null" && saved !== "undefined") ? saved : "desc";
    });
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = sessionStorage.getItem("admin_tests_currentPage");
        if (saved) {
            const parsed = Number(saved);
            return isNaN(parsed) || parsed < 1 ? 1 : parsed;
        }
        return 1;
    });

    useEffect(() => {
        sessionStorage.setItem("admin_tests_searchTerm", searchTerm || "");
        sessionStorage.setItem("admin_tests_contentSearchTerm", contentSearchTerm || "");
        sessionStorage.setItem("admin_tests_filterType", filterType || "All");
        sessionStorage.setItem("admin_tests_filterCollection", filterCollection || "All");
        sessionStorage.setItem("admin_tests_filterStatus", filterStatus || "All");
        sessionStorage.setItem("admin_tests_filterAccess", filterAccess || "All");
        sessionStorage.setItem("admin_tests_filterTag", filterTag || "All");
        sessionStorage.setItem("admin_tests_sortBy", sortBy || "createdAt");
        sessionStorage.setItem("admin_tests_sortOrder", sortOrder || "desc");
        sessionStorage.setItem("admin_tests_currentPage", String(currentPage || 1));
    }, [searchTerm, contentSearchTerm, filterType, filterCollection, filterStatus, filterAccess, filterTag, sortBy, sortOrder, currentPage]);

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

    // Warm the cache on mount — with SessionStorage to avoid redundant Firestore reads
    useEffect(() => {
        const warmCache = async () => {
            try {
                setLoading(true);

                // Check SessionStorage cache first
                const cachedTime = sessionStorage.getItem(ADMIN_TESTS_CACHE_TIME_KEY);
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < ADMIN_TESTS_CACHE_TTL);

                if (isCacheValid) {
                    const cached = sessionStorage.getItem(ADMIN_TESTS_CACHE_KEY);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setAllTestsCache(parsed);
                                setLoading(false);
                                return;
                            }
                        } catch { /* corrupted cache, proceed to fetch */ }
                    }
                }

                const snapAll = await getDocs(query(collection(db, "tests_metadata"), limit(1500)));
                // Strip combinedContent to save bandwidth on cache — it's loaded lazily for content search
                const allDocs = snapAll.docs.map(d => {
                    const data = d.data();
                    const { combinedContent, ...rest } = data;
                    return { id: d.id, ...rest };
                });
                
                // Proactively clean up any orphaned isMergedSource flags in Firestore
                const activeSourceIds = new Set();
                const activeSourceTitles = new Set();
                allDocs.forEach(t => {
                    const titleLower = (t.title || "").toLowerCase().trim();
                    const isMerged = t.isMerged || titleLower.startsWith("merged:");
                    if (isMerged) {
                        if (Array.isArray(t.mergedSourceIds)) {
                            t.mergedSourceIds.forEach(id => activeSourceIds.add(id));
                        }
                        let content = t.title || "";
                        if (titleLower.startsWith("merged:")) {
                            content = content.slice(7).trim();
                        }
                        if (content) {
                            const parts = content.split(" + ").map(p => p.trim()).filter(Boolean);
                            parts.forEach(p => activeSourceTitles.add(p.toLowerCase()));
                        }
                    }
                });

                const orphans = allDocs.filter(t => {
                    const isMergedTest = t.isMerged || (t.title?.toLowerCase().startsWith("merged:") && !t.isMergedSource);
                    if (isMergedTest) return false;
                    const isSrcId = activeSourceIds.has(t.id);
                    const isSrcTitle = t.title && activeSourceTitles.has(t.title.toLowerCase().trim());
                    return t.isMergedSource && !isSrcId && !isSrcTitle;
                });

                let finalDocs = allDocs;
                if (orphans.length > 0) {
                    console.log(`[useAdminTests] Found ${orphans.length} orphaned source tests. Cleaning up in Firestore...`);
                    const batch = writeBatch(db);
                    orphans.forEach(o => {
                        batch.update(doc(db, "tests", o.id), { isMergedSource: false });
                        batch.update(doc(db, "tests_metadata", o.id), { isMergedSource: false });
                    });
                    await batch.commit();
                    console.log("[useAdminTests] Cleaned up orphaned source tests in Firestore.");
                    const orphanIdsSet = new Set(orphans.map(o => o.id));
                    finalDocs = allDocs.map(t => orphanIdsSet.has(t.id) ? { ...t, isMergedSource: false } : t);
                }

                setAllTestsCache(finalDocs);

                // Persist to SessionStorage (without combinedContent, safe size)
                try {
                    sessionStorage.setItem(ADMIN_TESTS_CACHE_KEY, JSON.stringify(finalDocs));
                    sessionStorage.setItem(ADMIN_TESTS_CACHE_TIME_KEY, Date.now().toString());
                } catch { /* sessionStorage full — silently skip */ }
            } catch (err) {
                console.error("Proactive search cache warming failed:", err);
            } finally {
                setLoading(false);
            }
        };
        warmCache();
        fetchCollections();
    }, []);

    // Keep SessionStorage in sync when allTestsCache changes (CRUD operations)
    useEffect(() => {
        if (allTestsCache.length === 0) return;
        try {
            sessionStorage.setItem(ADMIN_TESTS_CACHE_KEY, JSON.stringify(allTestsCache));
            sessionStorage.setItem(ADMIN_TESTS_CACHE_TIME_KEY, Date.now().toString());
        } catch { /* sessionStorage full — silently skip */ }
    }, [allTestsCache]);

    // Filter, sort, and search list reactively
    const { filteredAndSortedTests, totalTestCount } = useMemo(() => {
        const mergedSourceIdsSet = new Set();
        const mergedSourceTitlesSet = new Set();

        allTestsCache.forEach(t => {
            if (Array.isArray(t.mergedSourceIds)) {
                t.mergedSourceIds.forEach(id => mergedSourceIdsSet.add(id));
            }
            
            const titleLower = (t.title || "").toLowerCase().trim();
            if (t.isMerged || titleLower.startsWith("merged:")) {
                let content = t.title || "";
                if (titleLower.startsWith("merged:")) {
                    content = content.slice(7).trim();
                }
                if (content) {
                    const parts = content.split(" + ").map(p => p.trim()).filter(Boolean);
                    parts.forEach(p => mergedSourceTitlesSet.add(p.toLowerCase()));
                }
            }
        });

        let list = allTestsCache.map(t => {
            const isSrcId = mergedSourceIdsSet.has(t.id);
            const isSrcTitle = t.title && mergedSourceTitlesSet.has(t.title.toLowerCase().trim());
            const isMergedTest = t.isMerged || (t.title?.toLowerCase().startsWith("merged:") && !t.isMergedSource);
            
            if ((t.isMergedSource || isSrcId || isSrcTitle) && !isMergedTest) {
                return { ...t, isMergedSource: true };
            }
            return t;
        });

        // 1. Type Filter
        if (filterType !== "All") {
            const typeLower = filterType.toLowerCase();
            list = list.filter(t => t.type?.toLowerCase() === typeLower);
        }

        // 2. Collection Filter
        if (filterCollection !== "All") {
            if (filterCollection === "None") {
                list = list.filter(t => !t.collectionId);
            } else if (filterCollection === "Merged") {
                list = list.filter(t => t.isMerged || t.title?.toLowerCase().startsWith("merged:"));
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

        // 5. Search filter (by Title/ID)
        if (searchTerm.trim().length >= 2) {
            const termLower = searchTerm.toLowerCase().trim();
            list = list.filter(t => 
                (t.title || "").toLowerCase().includes(termLower) ||
                t.id.toLowerCase().includes(termLower)
            );
        }

        // 5b. Search inside text (content/JSON) filter — uses lazily loaded contentCache
        if (contentSearchTerm.trim().length >= 2 && contentCache) {
            const termLower = contentSearchTerm.toLowerCase().trim();
            list = list.filter(t => 
                (contentCache[t.id] || "").toLowerCase().includes(termLower)
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
    }, [allTestsCache, contentCache, filterType, filterCollection, filterStatus, filterAccess, filterTag, searchTerm, contentSearchTerm, sortBy, sortOrder]);

    // Lazy-load combinedContent only when content search is triggered
    useEffect(() => {
        if (contentSearchTerm.trim().length < 2 || contentCache) return;
        let cancelled = false;
        const loadContent = async () => {
            try {
                const snapAll = await getDocs(query(collection(db, "tests_metadata"), limit(1500)));
                const map = {};
                snapAll.docs.forEach(d => {
                    const data = d.data();
                    if (data.combinedContent) map[d.id] = data.combinedContent;
                });
                if (!cancelled) setContentCache(map);
            } catch (err) {
                console.error("Content search cache load failed:", err);
            }
        };
        loadContent();
        return () => { cancelled = true; };
    }, [contentSearchTerm, contentCache]);

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
        const readingCount = allTestsCache.filter(t => t.type === 'reading').length;
        const listeningCount = allTestsCache.filter(t => t.type === 'listening').length;
        const writingCount = allTestsCache.filter(t => t.type === 'writing').length;
        const speakingCount = allTestsCache.filter(t => t.type === 'speaking').length;
        return { 
            total, 
            publicCount, 
            privateCount, 
            freeCount, 
            mockCount,
            readingCount,
            listeningCount,
            writingCount,
            speakingCount
        };
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
            
            // Find the test to be deleted to see if it is a merged test
            const testToDelete = allTestsCache.find(t => t.id === id);
            let unreferencedSourceIds = [];
            
            if (testToDelete && Array.isArray(testToDelete.mergedSourceIds)) {
                // Find all other merged tests' source IDs
                const otherMergedSourceIds = new Set();
                allTestsCache.forEach(t => {
                    if (t.id !== id && (t.isMerged || t.title?.toLowerCase().startsWith("merged:")) && Array.isArray(t.mergedSourceIds)) {
                        t.mergedSourceIds.forEach(srcId => otherMergedSourceIds.add(srcId));
                    }
                });
                
                // Filter out those that are still referenced
                unreferencedSourceIds = testToDelete.mergedSourceIds.filter(srcId => !otherMergedSourceIds.has(srcId));
                
                // Update Firestore for each unreferenced source test
                unreferencedSourceIds.forEach(srcId => {
                    batch.update(doc(db, "tests", srcId), { isMergedSource: false });
                    batch.update(doc(db, "tests_metadata", srcId), { isMergedSource: false });
                });
            }
            
            batch.delete(doc(db, "tests", id));
            batch.delete(doc(db, "tests_metadata", id));
            await batch.commit();

            setAllTestsCache(prev => {
                let updated = prev.filter(t => t.id !== id);
                if (unreferencedSourceIds.length > 0) {
                    const unreferencedSet = new Set(unreferencedSourceIds);
                    updated = updated.map(t => unreferencedSet.has(t.id) ? { ...t, isMergedSource: false } : t);
                }
                return updated;
            });
            return true;
        } catch (err) {
            console.error("Delete Error:", err);
            return false;
        }
    };

    const bulkDeleteTests = async (ids) => {
        try {
            const batch = writeBatch(db);
            
            // Find tests being deleted
            const testsToDelete = allTestsCache.filter(t => ids.includes(t.id));
            let unreferencedSourceIds = [];
            
            if (testsToDelete.length > 0) {
                const deletedSourceIds = [];
                testsToDelete.forEach(t => {
                    if (Array.isArray(t.mergedSourceIds)) {
                        deletedSourceIds.push(...t.mergedSourceIds);
                    }
                });
                
                if (deletedSourceIds.length > 0) {
                    // Find all other merged tests' source IDs (not being deleted)
                    const otherMergedSourceIds = new Set();
                    allTestsCache.forEach(t => {
                        if (!ids.includes(t.id) && (t.isMerged || t.title?.toLowerCase().startsWith("merged:")) && Array.isArray(t.mergedSourceIds)) {
                            t.mergedSourceIds.forEach(srcId => otherMergedSourceIds.add(srcId));
                        }
                    });
                    
                    // Filter out those that are still referenced or are also being deleted
                    unreferencedSourceIds = deletedSourceIds.filter(srcId => !ids.includes(srcId) && !otherMergedSourceIds.has(srcId));
                    
                    // Update Firestore for each unreferenced source test
                    unreferencedSourceIds.forEach(srcId => {
                        batch.update(doc(db, "tests", srcId), { isMergedSource: false });
                        batch.update(doc(db, "tests_metadata", srcId), { isMergedSource: false });
                    });
                }
            }
            
            ids.forEach(id => {
                batch.delete(doc(db, "tests", id));
                batch.delete(doc(db, "tests_metadata", id));
            });
            await batch.commit();

            setAllTestsCache(prev => {
                let updated = prev.filter(t => !ids.includes(t.id));
                if (unreferencedSourceIds.length > 0) {
                    const unreferencedSet = new Set(unreferencedSourceIds);
                    updated = updated.map(t => unreferencedSet.has(t.id) ? { ...t, isMergedSource: false } : t);
                }
                return updated;
            });
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
            delete newTestData.isMerged;
            delete newTestData.isMergedSource;
            delete newTestData.mergedSourceIds;
            batch.set(newTestDocRef, newTestData);

            let combinedContent = "";
            if (origData.passages && Array.isArray(origData.passages)) {
                origData.passages.forEach(p => {
                    if (p.title) combinedContent += p.title + " ";
                    if (p.content) {
                        const cleanText = p.content.replace(/<[^>]*>/g, ' ');
                        combinedContent += cleanText + " ";
                    }
                });
            }

            let newMetaData = {};
            if (metaSnap.exists()) {
                newMetaData = {
                    ...metaSnap.data(),
                    id: newId,
                    title: newTitle,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    thumbnail: origData.thumbnail || "",
                    combinedContent: combinedContent.trim()
                };
                delete newMetaData.isMerged;
                delete newMetaData.isMergedSource;
                delete newMetaData.mergedSourceIds;
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
                    questionTypes: origData.questionTypes || [],
                    thumbnail: origData.thumbnail || "",
                    combinedContent: combinedContent.trim()
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

                let combinedContent = "";
                if (newTestData.passages && Array.isArray(newTestData.passages)) {
                    newTestData.passages.forEach(p => {
                        if (p.title) combinedContent += p.title + " ";
                        if (p.content) {
                            const cleanText = p.content.replace(/<[^>]*>/g, ' ');
                            combinedContent += cleanText + " ";
                        }
                    });
                }

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
                    updatedAt: nowIso,
                    thumbnail: test.thumbnail || "",
                    combinedContent: combinedContent.trim()
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

    const addCollection = async (name, thumbnail = "", type = "reading", subTests = null, accessTier = "pro", isPublic = true) => {
        try {
            const data = {
                name: name.trim(),
                thumbnail: thumbnail.trim(),
                type: type,
                accessTier: accessTier,
                isPublic: isPublic,
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

    const updateCollection = async (id, name, thumbnail = "", type = "reading", subTests = null, accessTier = "pro", isPublic = true) => {
        try {
            const data = {
                name: name.trim(),
                thumbnail: thumbnail.trim(),
                type: type,
                accessTier: accessTier,
                isPublic: isPublic
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

    const updateTestMetadata = async (id, title, collectionId, isFree, thumbnail) => {
        try {
            const finalColId = collectionId === 'None' || !collectionId ? null : collectionId;
            const updatedFields = {
                title: title.trim(),
                collectionId: finalColId,
                isFree: isFree || false,
                updatedAt: new Date().toISOString()
            };
            
            // Only update thumbnail if explicitly provided
            if (thumbnail !== undefined) {
                updatedFields.thumbnail = thumbnail;
            }
            
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
        searchTerm,
        contentSearchTerm,
        filterType,
        filterCollection,
        filterStatus,
        filterAccess,
        filterTag,
        allAvailableTags,
        sortBy,
        sortOrder,
        stats,
        isBackgroundRefreshing,
        allTests: allTestsCache,

        // Setters
        setSearchTerm,
        setContentSearchTerm,
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
