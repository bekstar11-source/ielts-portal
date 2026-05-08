import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    updateDoc,
    addDoc,
    limit,
    startAfter,
    writeBatch,
    getCountFromServer
} from 'firebase/firestore';

export const useAdminTests = (PAGE_SIZE = 50) => {
    const [tests, setTests] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [totalTestCount, setTotalTestCount] = useState(0);

    const fetchInitial = async () => {
        setLoading(true);
        try {
            const qTests = query(collection(db, "tests"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            const snapTests = await getDocs(qTests);
            const testsData = snapTests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
            
            setTests(testsData);
            setLastVisible(snapTests.docs[snapTests.docs.length - 1]);
            setHasMore(snapTests.docs.length === PAGE_SIZE);

            const countSnap = await getCountFromServer(collection(db, "tests"));
            setTotalTestCount(countSnap.data().count);

            const qCols = query(collection(db, "test_collections"), orderBy("createdAt", "asc"));
            const snapCols = await getDocs(qCols);
            setCollections(snapCols.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Fetch Initial Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!lastVisible || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const qTests = query(
                collection(db, "tests"), 
                orderBy("createdAt", "desc"), 
                startAfter(lastVisible),
                limit(PAGE_SIZE)
            );
            const snapTests = await getDocs(qTests);
            const newTests = snapTests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
            
            setTests(prev => [...prev, ...newTests]);
            setLastVisible(snapTests.docs[snapTests.docs.length - 1]);
            setHasMore(snapTests.docs.length === PAGE_SIZE);
        } catch (err) {
            console.error("Load More Error:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "tests", id));
            setTests(prev => prev.filter(t => t.id !== id));
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
        tests, collections, loading, loadingMore, hasMore, totalTestCount,
        fetchInitial, loadMore, handleDelete, bulkAssignToCollection
    };
};
