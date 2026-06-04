import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { useTranslation } from "../../context/LanguageContext";
import { db, functions } from "../../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { 
  BookOpen, Headphones, PenTool, Mic, ChevronRight, Search, Loader2 
} from 'lucide-react';
import { limit, startAfter, getCountFromServer, orderBy, getDocsFromServer } from "firebase/firestore";

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
import PracticeCard from "../../components/practice/PracticeCard";
import { deriveQuestionTypesForCard, qTypeMatchesSelected, getActualQuestionCount } from "../../utils/TestUtils";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

const getPassageNum = (test) => {
  if (!test) return null;
  if (test.passageNumber) return Number(test.passageNumber);
  if (test.passage_number) return Number(test.passage_number);
  
  // First check if passage key exists in test.passages (e.g. if key is passage1/passage2/passage3)
  if (test.passages && typeof test.passages === 'object') {
    const keys = Object.keys(test.passages);
    if (keys.length === 1) {
      const match = keys[0].match(/passage(\d)/i);
      if (match) return Number(match[1]);
    }
  }

  const title = test.title?.toLowerCase() || '';
  const match = title.match(/passage\s*:?\s*(\d)/i) || title.match(/\bp\s*(\d)\b/i);
  if (match) return Number(match[1]);

  // Difficulty mapping fallback
  const diff = String(test.difficulty || '').toLowerCase();
  if (diff === 'easy') return 1;
  if (diff === 'medium') return 2;
  if (diff === 'hard') return 3;
  return null;
};

export default function ReadingParts() {
  const { user, logout, userData } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [selectedPassages, setSelectedPassages] = useState([]); 
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  
  const isPro = userData?.accountType === 'pro' || userData?.isPro || userData?.role === 'admin' || userData?.role === 'teacher';
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
  
  const { assignments, loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Library Pagination State
  const [libraryTests, setLibraryTests] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [allTestsLoaded, setAllTestsLoaded] = useState(false);
  const PAGE_SIZE = 24;

  const rawAssignments = useMemo(() => {
    // Deduplicate between assignments and library tests
    const assignedIds = new Set(assignments.map(a => a.id));
    const uniqueLibrary = libraryTests.filter(t => !assignedIds.has(t.id));
    let combined = [...assignments, ...uniqueLibrary];

    // Filter combined tests based on plan
    // Sort combined tests so free tests are at the beginning
    combined.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return 0;
    });

    return combined.map(test => ({
      ...test,
      questionTypes: test.questionTypes || deriveQuestionTypesForCard(test)
    }));
  }, [assignments, libraryTests]);

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
                where('type', '==', 'reading'),
                where('isFree', '==', true),
                orderBy('createdAt', 'desc')
            );
            const snapFree = await getDocsFromServer(qFree);
            const freeTests = snapFree.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
            
            // 2. Fetch the first page of all tests
            const qAll = query(
                collection(db, 'tests_metadata'),
                where('type', '==', 'reading'),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );
            snap = await getDocsFromServer(qAll);
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
            // For subsequent pages, just fetch the next page normally
            const qAll = query(
                collection(db, 'tests_metadata'),
                where('type', '==', 'reading'),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible),
                limit(PAGE_SIZE)
            );
            snap = await getDocsFromServer(qAll);
            newTests = snap.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
        }

        if (isFirstPage) {
            setLibraryTests(newTests);
            // Fetch Total Count for students library
            let countQuery = query(collection(db, 'tests_metadata'), where('type', '==', 'reading'));
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
            where('type', '==', 'reading'),
            orderBy('createdAt', 'desc'),
            limit(500)
        );
        const snap = await getDocsFromServer(qAll);
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
                             selectedPassages.length > 0 ||
                             freeOnly;
    if (hasActiveFilters) {
      fetchAllTestsForSearch();
    }
  }, [debouncedSearchQuery, selectedStatus, selectedQuestionTypes, selectedPassages, freeOnly]);

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

  const { checkLimit, incrementUsage } = useDailyLimit(userData);

  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedStatus, selectedQuestionTypes, selectedPassages, freeOnly]);

  const handleShowMore = async () => {
    if (filteredTests.length > visibleCount) {
      setVisibleCount(prev => prev + 12);
    } else if (hasMore) {
      await fetchLibraryPage(false);
      setVisibleCount(prev => prev + 12);
    }
  };

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    rawAssignments.forEach(item => {
      if (item.type === 'reading' && item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [rawAssignments]);

  const getQuestionCount = (test) => getActualQuestionCount(test);

  const filteredTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = [];
    
    rawAssignments.forEach(item => {
      let matchesTab = item.type === 'reading' && !item.isSet;
      if (!matchesTab) return;

      // Filter: only show single-passage "parts" (not full reading tests)
      let passagesCount = 0;
      if (item.passages) {
        if (Array.isArray(item.passages)) {
          passagesCount = item.passages.length;
        } else if (typeof item.passages === 'object') {
          passagesCount = Object.keys(item.passages).length;
        }
      }
      if (passagesCount > 1) return; // Multi-passage = full test, skip
      
      if (passagesCount === 0) {
        const qCount = getQuestionCount(item);
        if (qCount > 14) return;
      }

      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      const isDone = !!item.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
       const pNum = getPassageNum(item);
       const matchesPassage = selectedPassages.length === 0 || 
                             (pNum && selectedPassages.includes(pNum));

      const matchesType = selectedQuestionTypes.length === 0 || 
                         (item.questionTypes && item.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
      
      const matchesFree = !freeOnly || !!item.isFree;
      
      if (matchesSearch && matchesType && matchesStatus && matchesPassage && matchesFree) {
        result.push(item);
      }
    });
    return result;
  }, [rawAssignments, searchQuery, selectedQuestionTypes, selectedStatus, selectedPassages, freeOnly]);

  const handleStartTest = (test) => { 
    if (test.isFree) {
      // Free tests are always allowed, bypass limit!
      setTestToStart(test); 
      setShowStartConfirm(true); 
      return;
    }
    if (!checkLimit('reading')) {
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
    if (!test.isFree) {
      incrementUsage('reading').catch(err => console.error("Stats update failed:", err));
    }
    const targetId = test.id || test.testId || test.targetId;
    if (targetId) navigate(`/test/${targetId}`);
    else alert("Test ID topilmadi!");
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
    <div className="min-h-screen bg-white dark:bg-[#09090b] font-sans text-gray-900 dark:text-[#f5f5f7] overflow-x-hidden transition-colors duration-200">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="reading"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />



      <main className="w-full pb-24 md:pb-0">
        <PracticeHero 
          activeTab="reading" 
          subType="parts"
          categories={categories} 
          totalCount={loading ? 0 : (totalLibraryCount || rawAssignments.filter(t => t.type === 'reading' && !t.title?.includes('/') && !t.isSet).length)}
          filteredCount={filteredTests.length}
        />

        <PracticeFilters 
          activeTab="reading" 
          setActiveTab={() => {}}
          activeSubTab="passages"
          handleSubTabClick={() => {}}
          readingFilters={[]}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={(tabId) => {
            if (tabId === 'listening') navigate('/listening/parts');
            else if (tabId === 'podcasts') navigate('/podcasts');
            else if (tabId !== 'reading') navigate(`/practice?tab=${tabId}`);
          }}
          allQuestionTypes={allQuestionTypes}
          selectedQuestionTypes={selectedQuestionTypes}
          setSelectedQuestionTypes={setSelectedQuestionTypes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedPassages={selectedPassages}
          setSelectedPassages={setSelectedPassages}
          showQuestionFilters={showQuestionFilters}
          setShowQuestionFilters={setShowQuestionFilters}
          isStandalonePage={true}
          hideSubTabs={true}
          freeOnly={freeOnly}
          setFreeOnly={setFreeOnly}
          showFreeFilter={!isPro && !isStandard}
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
                {filteredTests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 text-center" key="no-passages">
                        <Search size={24} className="text-gray-300 dark:text-zinc-600 mb-6" />
                        <h3 className="text-[24px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Hech narsa topilmadi</h3>
                    </div>
                ) : (
                    <motion.div 
                        key="passages"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-10 pb-20"
                    >
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">Reading Passages</h2>
                                <p className="text-[#86868b] dark:text-zinc-450 text-[14px]">Displaying {filteredTests.length} passages</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 pt-4">
                                {filteredTests.slice(0, visibleCount).map((test) => (
                                    <PracticeCard 
                                        key={test.id} 
                                        test={test} 
                                        passageNumber={getPassageNum(test)}
                                        isCompleted={!!test.result}
                                        onReview={handleReview}
                                        onStart={handleStartTest}
                                        onSelectSet={setSelectedSet}
                                        isPro={isPro}
                                        isStandard={isStandard}
                                    />
                                ))}
                            </div>
                            {/* Show More Button */}
                            {(filteredTests.length > visibleCount || hasMore) && (
                                <div className="flex justify-center items-center pt-10 pb-8">
                                    <button
                                        onClick={handleShowMore}
                                        disabled={loadingLibrary}
                                        className="group relative flex items-center gap-3 px-8 py-3.5 bg-[#1d1d1f] hover:bg-black dark:bg-[#f5f5f7] dark:hover:bg-white dark:text-[#1d1d1f] text-white rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50 text-[11.5px] shadow-sm"
                                    >
                                        {loadingLibrary ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <>
                                                {t('practice.showMore') || "Show More"}
                                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
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
