import { useState, useEffect, useMemo } from 'react';
import { deriveQuestionTypesForCard } from '../utils/TestUtils';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

export function useListeningCollections(userResults, userData) {
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
      const snapCols = await getDocs(query(collection(db, "test_collections"), firestoreWhere("type", "==", "listening"), orderBy("createdAt", "asc")));
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
          .filter(t => t.type === 'listening');
        
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
          .filter(c => c.type?.toLowerCase() === 'listening');
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
            .filter(t => t.type === 'listening');

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

  const fetchCollectionTests = async (colId) => {
    setLoadingCollectionTests(true);
    try {
      const parentCol = collections.find(c => c.id === colId);
      const colTier = parentCol?.accessTier || 'pro';

      // 1. Fetch from tests_metadata
      const qMeta = query(
        collection(db, 'tests_metadata'),
        where('collectionId', '==', colId)
      );
      const snapMeta = await getDocs(qMeta);
      let metaDocs = snapMeta.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.type === 'listening');

      // 2. Fetch from tests
      const qTests = query(
        collection(db, 'tests'),
        where('collectionId', '==', colId)
      );
      const snapTests = await getDocs(qTests);
      let testDocs = snapTests.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.type === 'listening');

      // 3. Merge by ID to guarantee we capture all tests in the collection
      const mergedMap = new Map();
      testDocs.forEach(t => mergedMap.set(t.id, t));
      metaDocs.forEach(t => {
        if (mergedMap.has(t.id)) {
          mergedMap.set(t.id, { ...mergedMap.get(t.id), ...t });
        } else {
          mergedMap.set(t.id, t);
        }
      });

      const docs = Array.from(mergedMap.values()).map(doc => ({
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
      console.error("Error fetching collection tests:", e);
    } finally {
      setLoadingCollectionTests(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [userData]);

  const collectionProcessedTests = useMemo(() => {
    const sortedCollectionTests = [...collectionTests].sort((a, b) => {
      const titleA = a.title || '';
      const titleB = b.title || '';

      const getBookNum = (title) => {
        const match = title.match(/cambridge\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      };

      const getTestNum = (title) => {
        const match = title.match(/test\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      };

      const bookA = getBookNum(titleA);
      const bookB = getBookNum(titleB);

      if (bookA !== null && bookB !== null) {
        if (bookA !== bookB) {
          return bookB - bookA;
        }
        const testA = getTestNum(titleA);
        const testB = getTestNum(titleB);
        if (testA !== null && testB !== null) {
          if (testA !== testB) {
            return testA - testB;
          }
        }
      }

      return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const partTestsList = [];
    const fullTestsList = [];

    sortedCollectionTests.forEach(test => {
      const fullAttempt = userResults?.find(
        r => String(r.testId).trim() === String(test.id).trim() && !r.partNumber
      );

      fullTestsList.push({
        ...test,
        title: test.title,
        isFullTest: true,
        questionTypes: deriveQuestionTypesForCard(test),
        result: fullAttempt || null
      });

      if (test.parts && Object.keys(test.parts).length > 0) {
        Object.entries(test.parts).forEach(([key, partData]) => {
          const partNum = parseInt(key.replace('part', ''));
          if (isNaN(partNum)) return;

          const partAttempt = userResults?.find(
            r => String(r.testId).trim() === String(test.id).trim() && Number(r.partNumber) === partNum
          );

          partTestsList.push({
            id: `${test.id}_part_${partNum}`,
            testId: test.id,
            title: `${test.title} - Part ${partNum}`,
            type: "listening",
            difficulty: partData.difficulty || test.difficulty || "medium",
            partNumber: partNum,
            isFree: !!test.isFree,
            collectionAccessTier: test.collectionAccessTier,
            duration: 10,
            audioUrl: partData.audioUrl || test.audioUrl || "",
            startTime: partData.startSec || 0,
            endTime: partData.endSec || 0,
            parts: test.parts,
            questions: test.questions,
            questionTypes: deriveQuestionTypesForCard({ ...test, partNumber: partNum }),
            isVirtualPart: true,
            result: partAttempt || null
          });
        });
      } else {
        for (let partNum = 1; partNum <= 4; partNum++) {
          const partAttempt = userResults?.find(
            r => String(r.testId).trim() === String(test.id).trim() && Number(r.partNumber) === partNum
          );
          partTestsList.push({
            id: `${test.id}_part_${partNum}`,
            testId: test.id,
            title: `${test.title} - Part ${partNum}`,
            type: "listening",
            difficulty: test.difficulty || "medium",
            partNumber: partNum,
            isFree: !!test.isFree,
            collectionAccessTier: test.collectionAccessTier,
            duration: 10,
            audioUrl: test.audioUrl || "",
            startTime: 0,
            endTime: 0,
            parts: test.parts,
            questions: test.questions,
            questionTypes: deriveQuestionTypesForCard({ ...test, partNumber: partNum }),
            isVirtualPart: true,
            result: partAttempt || null
          });
        }
      }
    });

    // Sort so that free ones appear first
    fullTestsList.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return 0;
    });
    partTestsList.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return 0;
    });

    return { partTestsList, fullTestsList };
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
