import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { db, functions } from "../../firebase/firebase";
import { collection, query, where, getDocs, limit, startAfter, getCountFromServer, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { 
  BookOpen, Headphones, PenTool, Mic, Search 
} from 'lucide-react';

// COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import SiteFooter from "../../components/common/SiteFooter";
import { useDailyLimit } from "../../hooks/useDailyLimit";
import BottomNav from "../../components/dashboard/BottomNav";

// REFACTORED COMPONENTS
import PracticeHero from "../../components/practice/PracticeHero";
import PracticeFilters from "../../components/practice/PracticeFilters";
import ListeningPartsSection from "../../components/practice/ListeningPartsSection";
import { deriveQuestionTypesForCard, qTypeMatchesSelected } from "../../utils/TestUtils";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function ListeningParts() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isPro = userData?.accountType === 'pro' || userData?.isPro || userData?.role === 'admin' || userData?.role === 'teacher';
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium' ||
                    userData?.role === 'admin' || userData?.role === 'teacher';
  const isAdminOrTeacher = userData?.role === 'admin' || userData?.role === 'teacher';

  const { checkLimit, incrementUsage } = useDailyLimit(userData);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [selectedParts, setSelectedParts] = useState([]);
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  const [activePartFilter, setActivePartFilter] = useState('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  
  const { assignments, userResults = [], loading, error: errorMsg, refresh } = useStudentData(user);
  
  const [collectionsMap, setCollectionsMap] = useState({});
  const [privateColIds, setPrivateColIds] = useState(new Set());

  useEffect(() => {
    const fetchCollectionsData = async () => {
      try {
        const snap = await getDocs(collection(db, 'test_collections'));
        const mapping = {};
        const privateIds = new Set();
        snap.docs.forEach(d => {
          const data = d.data();
          mapping[d.id] = data.name;
          if (data.isPublic === false) {
            privateIds.add(d.id);
          }
        });
        setCollectionsMap(mapping);
        setPrivateColIds(privateIds);
      } catch (err) {
        console.error("Error fetching collections data:", err);
      }
    };
    fetchCollectionsData();
  }, []);
  
  // Library Pagination State
  const [libraryTests, setLibraryTests] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [allTestsLoaded, setAllTestsLoaded] = useState(false);
  const PAGE_SIZE = 24;

  const rawAssignments = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.id));
    const uniqueLibrary = libraryTests.filter(t => !assignedIds.has(t.id));
    let combined = [...assignments, ...uniqueLibrary];

    // Filter out tests in private collections for students
    if (!isAdminOrTeacher && privateColIds.size > 0) {
      combined = combined.filter(t => !t.collectionId || !privateColIds.has(t.collectionId));
    }

    return combined;
  }, [assignments, libraryTests, privateColIds, isAdminOrTeacher]);

  const fetchLibraryPage = async (isFirstPage = false) => {
    if (loadingLibrary || (!hasMore && !isFirstPage)) return;
    setLoadingLibrary(true);
    try {
        let newTests = [];
        let snap;
        
        if (isFirstPage) {
            // 1. Fetch all free tests for this type
            const qFree = query(
                collection(db, 'tests_metadata'),
                where('type', '==', 'listening'),
                where('isFree', '==', true),
                orderBy('createdAt', 'desc')
            );
            const snapFree = await getDocs(qFree);
            const freeTests = snapFree.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
            
            // 2. Fetch the first page of all tests
            const qAll = query(
                collection(db, 'tests_metadata'),
                where('type', '==', 'listening'),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );
            snap = await getDocs(qAll);
            const allTests = snap.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
            
            // Merge: free tests first, then all tests, deduplicated by ID
            const mergedMap = new Map();
            freeTests.forEach(t => mergedMap.set(t.id, t));
            allTests.forEach(t => {
                if (!mergedMap.has(t.id)) {
                    mergedMap.set(t.id, t);
                }
            });
            newTests = Array.from(mergedMap.values());
        } else {
            const qAll = query(
                collection(db, 'tests_metadata'),
                where('type', '==', 'listening'),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible),
                limit(PAGE_SIZE)
            );
            snap = await getDocs(qAll);
            newTests = snap.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
        }

        if (isFirstPage) {
            setLibraryTests(newTests);
            let countQuery = query(collection(db, 'tests_metadata'), where('type', '==', 'listening'));
            const countSnap = await getCountFromServer(countQuery);
            setTotalLibraryCount(countSnap.data().count);
        } else {
            setLibraryTests(prev => {
                const mergedMap = new Map();
                prev.forEach(t => mergedMap.set(t.id, t));
                newTests.forEach(t => {
                    if (!mergedMap.has(t.id)) {
                        mergedMap.set(t.id, t);
                    }
                });
                return Array.from(mergedMap.values());
            });
        }
        
        if (snap && snap.docs.length > 0) {
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } else if (isFirstPage) {
            setHasMore(false);
        }
    } catch (err) {
        console.error("Error fetching library tests:", err);
    } finally {
        setLoadingLibrary(false);
    }
  };

  const fetchAllTestsForSearch = async () => {
    if (allTestsLoaded || loadingLibrary) return;
    setLoadingLibrary(true);
    try {
        const qAll = query(
            collection(db, 'tests_metadata'),
            where('type', '==', 'listening'),
            orderBy('createdAt', 'desc'),
            limit(500)
        );
        const snap = await getDocs(qAll);
        const allTests = snap.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
        
        setLibraryTests(prev => {
            const mergedMap = new Map();
            prev.forEach(t => mergedMap.set(t.id, t));
            allTests.forEach(t => {
                if (!mergedMap.has(t.id)) {
                    mergedMap.set(t.id, t);
                }
            });
            return Array.from(mergedMap.values());
        });
        setHasMore(false);
        setAllTestsLoaded(true);
    } catch (err) {
        console.error("Error fetching all tests for search:", err);
    } finally {
        setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const hasActiveFilters = debouncedSearchQuery.trim().length > 0 || 
                             selectedStatus !== 'all' || 
                             selectedQuestionTypes.length > 0 || 
                             selectedParts.length > 0 ||
                             freeOnly ||
                             activePartFilter !== 'all';
    if (hasActiveFilters) {
      fetchAllTestsForSearch();
    }
  }, [debouncedSearchQuery, selectedStatus, selectedQuestionTypes, selectedParts, freeOnly, activePartFilter]);

  useEffect(() => {
    fetchLibraryPage(true);
  }, []);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [testToStart, setTestToStart] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyError, setKeyError] = useState("");

  const [visibleCount, setVisibleCount] = useState(12);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedStatus, selectedQuestionTypes, activePartFilter, freeOnly]);

  const handleShowMore = async () => {
    if (filteredVirtualParts.length > visibleCount) {
      setVisibleCount(prev => prev + 12);
    } else if (hasMore) {
      await fetchLibraryPage(false);
      setVisibleCount(prev => prev + 12);
    }
  };

  const partTestsList = useMemo(() => {
    const testMap = new Map();
    rawAssignments.forEach(item => {
      if (item.type === 'listening') {
        testMap.set(item.id, item);
      }
    });
    const allUniqueTests = Array.from(testMap.values());

    const resultList = [];
    allUniqueTests.forEach(test => {
      if (test.parts && Object.keys(test.parts).length > 0) {
        Object.entries(test.parts).forEach(([key, partData]) => {
          const partNum = parseInt(key.replace('part', ''));
          if (isNaN(partNum)) return;

          const partAttempt = userResults?.find(
            r => String(r.testId).trim() === String(test.id).trim() && Number(r.partNumber) === partNum
          );

          resultList.push({
            id: `${test.id}_part_${partNum}`,
            testId: test.id,
            title: `${test.title} - Part ${partNum}`,
            type: "listening",
            difficulty: partData.difficulty || test.difficulty || "medium",
            partNumber: partNum,
            isFree: !!test.isFree,
            duration: 10,
            thumbnail: partData.thumbnail || test.thumbnail || null,
            collectionId: test.collectionId,
            collectionName: test.collectionName || collectionsMap[test.collectionId] || "",
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
          resultList.push({
            id: `${test.id}_part_${partNum}`,
            testId: test.id,
            title: `${test.title} - Part ${partNum}`,
            type: "listening",
            difficulty: test.difficulty || "medium",
            partNumber: partNum,
            isFree: !!test.isFree,
            duration: 10,
            thumbnail: test.thumbnail || null,
            collectionId: test.collectionId,
            collectionName: test.collectionName || collectionsMap[test.collectionId] || "",
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

    const getBookNum = (title) => {
      const match = (title || '').match(/cambridge\s*(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    resultList.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;

      const bookA = getBookNum(a.title);
      const bookB = getBookNum(b.title);
      if (bookA !== null && bookB !== null && bookA !== bookB) {
        return bookB - bookA; // descending: 20, 19, 18...
      }

      return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    return resultList;
  }, [rawAssignments, userResults, collectionsMap]);

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    partTestsList.forEach(item => {
      if (item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [partTestsList]);

  const filteredVirtualParts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = partTestsList.filter(part => {
      const matchesSearch = !q || part.title?.toLowerCase().includes(q);
      const isDone = !!part.result;
      const matchesStatus = selectedStatus === 'all' ||
                           (selectedStatus === 'completed' && isDone) ||
                           (selectedStatus === 'not_completed' && !isDone);

      const matchesType = selectedQuestionTypes.length === 0 ||
                          (part.questionTypes && part.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));

      const matchesPartTab = activePartFilter === 'all' || String(part.partNumber) === activePartFilter;
      const matchesPartFilter = selectedParts.length === 0 || selectedParts.includes(part.partNumber);
      const matchesFree = !freeOnly || !!part.isFree;

      return matchesSearch && matchesStatus && matchesType && matchesPartTab && matchesPartFilter && matchesFree;
    });

    const getBookNum = (title) => {
      const match = (title || '').match(/cambridge\s*(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    filtered.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;

      const bookA = getBookNum(a.title);
      const bookB = getBookNum(b.title);
      if (bookA !== null && bookB !== null && bookA !== bookB) {
        return sortOrder === 'asc' ? bookA - bookB : bookB - bookA;
      }
      const cmp = (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [partTestsList, searchQuery, selectedStatus, selectedQuestionTypes, activePartFilter, selectedParts, freeOnly, sortOrder]);

  const handleStartTest = (test) => { 
    if (test.isFree) {
      // Free tests are always allowed, bypass limit!
      setTestToStart(test); 
      setShowStartConfirm(true); 
      return;
    }
    if (!checkLimit('listening')) {
      setShowPricingModal(true);
      return;
    }
    setTestToStart(test); 
    setShowStartConfirm(true); 
  };

  const confirmStartTest = async () => {
    const test = testToStart;
    if (!test) return;
    setShowStartConfirm(false);
    setSelectedSet(null);
    if (!test.isFree) {
      incrementUsage('listening').catch(err => console.error("Stats update failed:", err));
    }
    
    if (test.isVirtualPart) {
      navigate(`/test/${test.testId}?part=${test.partNumber}`);
    } else {
      const targetId = test.id || test.testId || test.targetId;
      if (targetId) navigate(`/test/${targetId}`);
      else alert("Test ID topilmadi!");
    }
  };

  const handleReview = (test) => {
    if (!isPremium && !test.isFree) {
      setShowPricingModal(true);
      return;
    }
    const resultId = test.result?.id;
    if (!resultId) return alert("Natija topilmadi!");
    navigate(`/review/${resultId}`);
  };

  const handleVerifyKey = async () => {
    if (!accessKeyInput.trim()) return;
    setCheckingKey(true);
    setKeyError("");
    try {
        const verifyAccessKeyFn = httpsCallable(functions, 'verifyAccessKey');
        const res = await verifyAccessKeyFn({ key: accessKeyInput });

        if (res.data && res.data.success) {
            alert("Test qo'shildi! 🚀");
            await refresh();
            setShowKeyModal(false); 
            setAccessKeyInput("");
        } else {
            throw new Error("Kalitni faollashtirishda kutilmagan xatolik yuz berdi.");
        }
    } catch (error) { 
        setKeyError(error.message || "Kalit xato yoki ishlatilgan!"); 
    } finally { 
        setCheckingKey(false); 
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] font-sans text-gray-900 dark:text-[#f5f5f7] pb-24 selection:bg-[#0066cc]/30 selection:text-[#1d1d1f] transition-colors duration-200">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="listening"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <main className="w-full pb-24 md:pb-0">
        <PracticeHero 
          activeTab="listening" 
          subType="parts"
          categories={categories} 
          totalCount={loading ? 0 : (totalLibraryCount * 4 || partTestsList.length)}
          filteredCount={filteredVirtualParts.length}
        />

        <PracticeFilters 
          activeTab="listening" 
          setActiveTab={() => {}}
          activeSubTab="parts"
          listeningFilters={[]}
          handleSubTabClick={() => {}}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={(tabId) => {
            if (tabId === 'reading') navigate('/reading/parts');
            else if (tabId === 'podcasts') navigate('/podcasts');
            else navigate(`/practice?tab=${tabId}`);
          }}
          allQuestionTypes={allQuestionTypes}
          selectedQuestionTypes={selectedQuestionTypes}
          setSelectedQuestionTypes={setSelectedQuestionTypes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedParts={selectedParts}
          setSelectedParts={setSelectedParts}
          showQuestionFilters={showQuestionFilters}
          setShowQuestionFilters={setShowQuestionFilters}
          isStandalonePage={true}
          freeOnly={freeOnly}
          setFreeOnly={setFreeOnly}
          showFreeFilter={!isPro && !isStandard}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        <div className="max-w-[1440px] mx-auto px-6">
        {loading ? (
            <div className="flex justify-center py-40">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-[#0066cc] rounded-full animate-spin" />
            </div>
        ) : errorMsg ? (
            <div className="text-center py-20 text-red-500">{errorMsg}</div>
        ) : (
            <AnimatePresence mode="wait">
                {filteredVirtualParts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-4 duration-700" key="no-parts">
                        <div className="w-16 h-16 bg-[#f5f5f7] dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                            <Search size={24} className="text-gray-300 dark:text-zinc-650" />
                        </div>
                        <h3 className="text-[24px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Hech narsa topilmadi</h3>
                        <p className="text-[#86868b] dark:text-[#86868b] mt-2 max-w-[300px]">Qidiruv mezonlariga mos keladigan testlar mavjud emas.</p>
                    </div>
                ) : (
                    <motion.div 
                        key="parts"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-16 pb-20"
                    >
                        <ListeningPartsSection
                            filteredVirtualParts={filteredVirtualParts}
                            activePartFilter={activePartFilter}
                            setActivePartFilter={setActivePartFilter}
                            visibleCount={visibleCount}
                            handleShowMore={handleShowMore}
                            handleReview={handleReview}
                            handleStartTest={handleStartTest}
                            setSelectedSet={setSelectedSet}
                            isPro={isPro}
                            isStandard={isStandard}
                            hasMore={hasMore}
                            loadingLibrary={loadingLibrary}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        )}
        </div>
      </main>

      <DashboardModals
        showKeyModal={showKeyModal} setShowKeyModal={setShowKeyModal}
        accessKeyInput={accessKeyInput} setAccessKeyInput={setAccessKeyInput}
        handleVerifyKey={handleVerifyKey} checkingKey={checkingKey} keyError={keyError}
        showStartConfirm={showStartConfirm} setShowStartConfirm={setShowStartConfirm} confirmStartTest={confirmStartTest}
        showLogoutConfirm={showLogoutConfirm} setShowLogoutConfirm={setShowLogoutConfirm} confirmLogout={logout}
        selectedSet={selectedSet} setSelectedSet={setSelectedSet}
        handleStartTest={handleStartTest}
        handleReview={handleReview}
        isPro={isPro}
        isStandard={isStandard}
      />
      <PricingModal 
        isOpen={showPricingModal} 
        onClose={() => setShowPricingModal(false)}
        userName={userData?.fullName?.split(' ')[0]} 
      />
      <BottomNav 
        activeTab="library" 
        setActiveTab={(id) => {
          if (id === 'dashboard') navigate('/dashboard');
          else if (id === 'library') navigate('/library');
          else if (id === 'podcasts') navigate('/podcasts');
          else if (id === 'results') navigate('/my-results');
          else if (id === 'settings') navigate('/settings');
        }} 
      />
      <SiteFooter />
    </div>
  );
}
