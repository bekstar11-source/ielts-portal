import { useState, useEffect, useMemo } from 'react';
import { deriveQuestionTypesForCard } from '../utils/TestUtils';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

export function useListeningCollections(userResults) {
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [collectionTests, setCollectionTests] = useState([]);
  const [loadingCollectionTests, setLoadingCollectionTests] = useState(false);
  const [collectionCounts, setCollectionCounts] = useState({});
  const [allCollectionsTests, setAllCollectionsTests] = useState([]);

  const fetchCollectionCounts = async (cols) => {
    const counts = {};
    for (const col of cols) {
      try {
        const countSnap = await getCountFromServer(
          query(
            collection(db, "tests"), 
            where("collectionId", "==", col.id),
            where("type", "==", "listening")
          )
        );
        counts[col.id] = countSnap.data().count;
      } catch (e) {
        try {
          const countSnap = await getCountFromServer(
            query(
              collection(db, "tests_metadata"), 
              where("collectionId", "==", col.id),
              where("type", "==", "listening")
            )
          );
          counts[col.id] = countSnap.data().count;
        } catch (e2) {
          counts[col.id] = 0;
        }
      }
    }
    setCollectionCounts(counts);
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const { orderBy, where: firestoreWhere } = await import("firebase/firestore");
      const snapCols = await getDocs(query(collection(db, "test_collections"), firestoreWhere("type", "==", "listening"), orderBy("createdAt", "asc")));
      const fetchedCols = snapCols.docs
        .map(d => ({ id: d.id, ...d.data() }));
      setCollections(fetchedCols);
      fetchCollectionCounts(fetchedCols);
      
      const colIds = fetchedCols.map(c => c.id).filter(Boolean);
      if (colIds.length > 0) {
        const qAllTests = query(
          collection(db, 'tests_metadata'),
          where('collectionId', 'in', colIds)
        );
        const snapAllTests = await getDocs(qAllTests);
        const fetchedAllTests = snapAllTests.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.type === 'listening');
        setAllCollectionsTests(fetchedAllTests);
      }
    } catch (e) {
      try {
        const snapCols = await getDocs(collection(db, "test_collections"));
        const fetchedCols = snapCols.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.type?.toLowerCase() !== 'reading');
        setCollections(fetchedCols);
        fetchCollectionCounts(fetchedCols);

        const colIds = fetchedCols.map(c => c.id).filter(Boolean);
        if (colIds.length > 0) {
          const qAllTests = query(
            collection(db, 'tests_metadata'),
            where('collectionId', 'in', colIds)
          );
          const snapAllTests = await getDocs(qAllTests);
          const fetchedAllTests = snapAllTests.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.type === 'listening');
          setAllCollectionsTests(fetchedAllTests);
        }
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
      // 1. Fetch from tests_metadata
      const qMeta = query(
        collection(db, 'tests_metadata'),
        where('collectionId', '==', colId)
      );
      const snapMeta = await getDocs(qMeta);
      const metaDocs = snapMeta.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.type === 'listening');

      // 2. Fetch from tests
      const qTests = query(
        collection(db, 'tests'),
        where('collectionId', '==', colId)
      );
      const snapTests = await getDocs(qTests);
      const testDocs = snapTests.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.type === 'listening');

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

      const docs = Array.from(mergedMap.values());
      setCollectionTests(docs);
    } catch (e) {
      console.error("Error fetching collection tests:", e);
    } finally {
      setLoadingCollectionTests(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const collectionProcessedTests = useMemo(() => {
    const partTestsList = [];
    const fullTestsList = [];

    collectionTests.forEach(test => {
      const fullAttempt = userResults?.find(
        r => String(r.testId).trim() === String(test.id).trim() && !r.partNumber
      );

      fullTestsList.push({
        ...test,
        title: test.title?.toLowerCase().includes('full') ? test.title : `${test.title} (Full Mock)`,
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
