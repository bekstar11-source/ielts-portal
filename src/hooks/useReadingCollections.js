import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

export function useReadingCollections(userResults, userData) {
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [collectionTests, setCollectionTests] = useState([]);
  const [loadingCollectionTests, setLoadingCollectionTests] = useState(false);
  const [collectionCounts, setCollectionCounts] = useState({});
  const [allCollectionsTests, setAllCollectionsTests] = useState([]);

  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
  const isAdminOrTeacher = userData?.role === 'admin' || userData?.role === 'teacher';

  const fetchCollectionCounts = (cols, allTests = []) => {
    const counts = {};
    cols.forEach(col => {
      counts[col.id] = allTests.filter(t => String(t.collectionId) === String(col.id)).length;
    });
    setCollectionCounts(counts);
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const { orderBy, where: firestoreWhere } = await import("firebase/firestore");
      const snapCols = await getDocs(query(collection(db, "test_collections"), firestoreWhere("type", "==", "reading"), orderBy("createdAt", "asc")));
      let fetchedCols = snapCols.docs
        .map(d => ({ id: d.id, ...d.data() }));
      if (!isAdminOrTeacher) {
        fetchedCols = fetchedCols.filter(c => c.isPublic !== false);
      }
      setCollections(fetchedCols);
      
      const colIds = fetchedCols.map(c => c.id).filter(Boolean);
      let fetchedAllTests = [];
      if (colIds.length > 0) {
        const qAllTests = query(
          collection(db, 'tests_metadata'),
          where('collectionId', 'in', colIds)
        );
        const snapAllTests = await getDocs(qAllTests);
        fetchedAllTests = snapAllTests.docs
          .map(d => {
            const data = d.data();
            const parentCol = fetchedCols.find(c => c.id === data.collectionId);
            return {
              id: d.id,
              ...data,
              collectionAccessTier: parentCol?.accessTier || 'pro'
            };
          })
          .filter(t => t.type === 'reading');
        
        // Sort so that free ones appear first
        fetchedAllTests.sort((a, b) => {
          if (a.isFree && !b.isFree) return -1;
          if (!a.isFree && b.isFree) return 1;
          return 0;
        });
        
        setAllCollectionsTests(fetchedAllTests);
      }
      fetchCollectionCounts(fetchedCols, fetchedAllTests);
    } catch (e) {
      try {
        const snapCols = await getDocs(collection(db, "test_collections"));
        let fetchedCols = snapCols.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.type?.toLowerCase() === 'reading');
        if (!isAdminOrTeacher) {
          fetchedCols = fetchedCols.filter(c => c.isPublic !== false);
        }
        setCollections(fetchedCols);

        const colIds = fetchedCols.map(c => c.id).filter(Boolean);
        let fetchedAllTests = [];
        if (colIds.length > 0) {
          const qAllTests = query(
            collection(db, 'tests_metadata'),
            where('collectionId', 'in', colIds)
          );
          const snapAllTests = await getDocs(qAllTests);
          fetchedAllTests = snapAllTests.docs
            .map(d => {
              const data = d.data();
              const parentCol = fetchedCols.find(c => c.id === data.collectionId);
              return {
                id: d.id,
                ...data,
                collectionAccessTier: parentCol?.accessTier || 'pro'
              };
            })
            .filter(t => t.type === 'reading');

          // Sort so that free ones appear first
          fetchedAllTests.sort((a, b) => {
            if (a.isFree && !b.isFree) return -1;
            if (!a.isFree && b.isFree) return 1;
            return 0;
          });
          
          setAllCollectionsTests(fetchedAllTests);
        }
        fetchCollectionCounts(fetchedCols, fetchedAllTests);
      } catch (e2) {
        console.error("Failed to load collections:", e2);
      }
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchCollectionTests = (colId) => {
    setLoadingCollectionTests(true);
    try {
      const parentCol = collections.find(c => c.id === colId);
      const colTier = parentCol?.accessTier || 'pro';

      // Use already-loaded allCollectionsTests instead of a new Firestore query
      let docs = allCollectionsTests
        .filter(t => t.collectionId === colId)
        .map(doc => ({
          ...doc,
          collectionAccessTier: colTier
        }));
      // Sort so that free ones appear first
      docs.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return 0;
      });
      setCollectionTests(docs);
    } catch (e) {
      console.error("Error filtering collection tests:", e);
    } finally {
      setLoadingCollectionTests(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const collectionProcessedTests = useMemo(() => {
    const fullTestsList = [];

    collectionTests.forEach(test => {
      const fullAttempt = userResults?.find(
        r => String(r.testId).trim() === String(test.id).trim() && !r.partNumber
      );

      fullTestsList.push({
        ...test,
        isFullTest: true,
        result: fullAttempt || null
      });
    });

    return { fullTestsList };
  }, [collectionTests, userResults]);

  return {
    collections,
    loadingCollections,
    selectedCollectionId,
    setSelectedCollectionId,
    collectionTests,
    setCollectionTests,
    loadingCollectionTests,
    collectionCounts,
    fetchCollectionTests,
    collectionProcessedTests,
    allCollectionsTests
  };
}
