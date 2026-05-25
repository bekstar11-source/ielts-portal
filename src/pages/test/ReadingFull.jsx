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
  BookOpen, Headphones, PenTool, Mic, Search, Loader2 
} from 'lucide-react';
import { limit, startAfter, getCountFromServer } from "firebase/firestore";

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
import FullReadingCard from "../../components/practice/FullReadingCard";
import ReadingCollectionsSection from "../../components/practice/ReadingCollectionsSection";
import { useReadingCollections } from "../../hooks/useReadingCollections";
import { usePracticeScroll } from "../../hooks/usePracticeScroll";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function ReadingFull() {
  const { user, logout, userData } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  
  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
  
  const { assignments, userResults = [], loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Custom hook to manage collections logic
  const collectionsData = useReadingCollections(userResults);
  const { allCollectionsTests = [] } = collectionsData;
  
  // Library Pagination State
  const [libraryTests, setLibraryTests] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const PAGE_SIZE = 200;

  const rawAssignments = useMemo(() => {
    // Deduplicate between assignments, library tests, and all collections tests
    const assignedIds = new Set(assignments.map(a => a.id));
    const uniqueLibrary = libraryTests.filter(t => !assignedIds.has(t.id));
    const uniqueColTests = allCollectionsTests.filter(t => !assignedIds.has(t.id));
    
    // Deduplicate between library and colTests
    const libraryIds = new Set(uniqueLibrary.map(t => t.id));
    const uniqueColTestsFiltered = uniqueColTests.filter(t => !libraryIds.has(t.id));

    return [...assignments, ...uniqueLibrary, ...uniqueColTestsFiltered];
  }, [assignments, libraryTests, allCollectionsTests]);

  const fetchLibraryPage = async (isFirstPage = false) => {
    if (loadingLibrary || (!hasMore && !isFirstPage)) return;
    setLoadingLibrary(true);
    try {
        let q = query(
            collection(db, 'tests'),
            where('type', '==', 'reading'),
            limit(PAGE_SIZE)
        );

        if (!isFirstPage && lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snap = await getDocs(q);
        const newTests = snap.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
        
        if (isFirstPage) {
            setLibraryTests(newTests);
            // Fetch Total Count for students library
            const countSnap = await getCountFromServer(query(collection(db, 'tests'), where('type', '==', 'reading')));
            setTotalLibraryCount(countSnap.data().count);
        } else {
            setLibraryTests(prev => [...prev, ...newTests]);
        }
        
        setLastVisible(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
        console.error("Error fetching library tests:", err);
    } finally {
        setLoadingLibrary(false);
    }
  };

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

  const fullReadingScroll = usePracticeScroll();

  const fullTestSectionRef = useRef(null);
  const setSectionRef = useRef(null);

  const readingFilters = [];

  const [activeSubTab] = useState('set');

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    rawAssignments.forEach(item => {
      if (item.type === 'reading' && item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [rawAssignments]);

  const getQuestionCount = (test) => {
    if (test.totalQuestions) return test.totalQuestions;
    
    const countUniqueIds = (items) => {
      if (!items || !Array.isArray(items)) return 0;
      const ids = new Set();
      const extract = (obj) => {
        if (!obj) return;
        if (obj.id && !isNaN(parseInt(obj.id))) {
          ids.add(parseInt(obj.id));
        }
        if (Array.isArray(obj.items)) obj.items.forEach(extract);
        if (Array.isArray(obj.questions)) obj.questions.forEach(extract);
        if (Array.isArray(obj.groups)) obj.groups.forEach(extract);
      };
      items.forEach(extract);
      return ids.size;
    };

    if (test.questions) {
      const count = countUniqueIds(test.questions);
      if (count > 0) return count;
    }
    if (test.sections) {
      const count = countUniqueIds(test.sections);
      if (count > 0) return count;
    }
    
    const titleLower = test.title?.toLowerCase() || '';
    const isReadingFull = titleLower.includes('full') || titleLower.includes('/');
    
    return (test.questions?.length) || (isReadingFull ? 40 : 13);
  };

  const filteredTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rawAssignments.filter(item => {
      if (item.type !== 'reading') return false;
      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      const isDone = !!item.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      const matchesType = selectedQuestionTypes.length === 0 || 
                         (item.questionTypes && item.questionTypes.some(t => selectedQuestionTypes.includes(t)));
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rawAssignments, searchQuery, selectedQuestionTypes, selectedStatus]);

  const filteredCollectionProcessedTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const fullTestsList = (collectionsData.collectionProcessedTests.fullTestsList || []).filter(test => {
      const matchesSearch = !q || test.title?.toLowerCase().includes(q);
      const isDone = !!test.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      const matchesType = selectedQuestionTypes.length === 0 || 
                         (test.questionTypes && test.questionTypes.some(t => selectedQuestionTypes.includes(t)));
      return matchesSearch && matchesStatus && matchesType;
    });
    return { fullTestsList };
  }, [collectionsData.collectionProcessedTests, searchQuery, selectedStatus, selectedQuestionTypes]);

  const handleStartTest = (test) => { 
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
    setSelectedSet(null);
    incrementUsage('reading').catch(err => console.error("Stats update failed:", err));
    const targetId = test.id || test.testId || test.targetId;
    if (targetId) navigate(`/test/${targetId}`);
    else alert("Test ID topilmadi!");
  };

  const handleReview = (test) => {
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
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="reading"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />



      <main className="w-full pb-24 md:pb-0">
        <PracticeHero 
          activeTab="reading" 
          categories={categories} 
          totalCount={loading ? 0 : (totalLibraryCount || rawAssignments.filter(t => t.type === 'reading').length)}
          filteredCount={filteredTests.length}
        />

        <PracticeFilters 
          activeTab="reading" 
          setActiveTab={() => {}}
          activeSubTab={activeSubTab}
          handleSubTabClick={() => {}}
          readingFilters={readingFilters}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={(tabId) => {
            if (tabId === 'listening') navigate('/listening?section=full_test');
            else if (tabId === 'podcasts') navigate('/podcasts');
            else if (tabId !== 'reading') navigate(`/practice?tab=${tabId}`);
          }}
          allQuestionTypes={allQuestionTypes}
          selectedQuestionTypes={selectedQuestionTypes}
          setSelectedQuestionTypes={setSelectedQuestionTypes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          showQuestionFilters={showQuestionFilters}
          setShowQuestionFilters={setShowQuestionFilters}
          isStandalonePage={true}
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
                {(() => {
                    if (activeSubTab === 'full_test') {
                        const fullTests = filteredTests.filter(t => !t.isSet && getQuestionCount(t) > 14);
                        if (fullTests.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-40 text-center" key="no-fulltests">
                                    <Search size={24} className="text-gray-300 mb-6" />
                                    <h3 className="text-[24px] font-semibold text-[#1d1d1f]">Hech narsa topilmadi</h3>
                                </div>
                            );
                        }
                        return (
                            <motion.div 
                                key="full_test"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4 pb-20"
                                ref={fullTestSectionRef}
                            >
                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Full Reading</h2>
                                <div 
                                    ref={fullReadingScroll.scrollRef}
                                    onScroll={(e) => fullReadingScroll.updateScrollState(e.currentTarget)}
                                    className="flex gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
                                >
                                    {fullTests.map((test, i) => (
                                      <FullReadingCard 
                                        key={test.id}
                                        test={test}
                                        index={i}
                                        isCompleted={!!test.result}
                                        onReview={handleReview}
                                        onStart={handleStartTest}
                                        onSelectSet={setSelectedSet}
                                        isPro={isPro}
                                        isStandard={isStandard}
                                      />
                                    ))}
                                </div>
                            </motion.div>
                        );
                    }

                    if (activeSubTab === 'set') {
                        return (
                            <motion.div 
                                key="collections"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-16 pb-20"
                            >
                                <ReadingCollectionsSection
                                    collectionsSectionRef={setSectionRef}
                                    {...collectionsData}
                                    collectionProcessedTests={filteredCollectionProcessedTests}
                                    handleReview={handleReview}
                                    handleStartTest={handleStartTest}
                                    setSelectedSet={setSelectedSet}
                                    isPro={isPro}
                                    isStandard={isStandard}
                                />
                            </motion.div>
                        );
                    }

                    return null;
                })()}
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
