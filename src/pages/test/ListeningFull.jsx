import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { db, functions } from "../../firebase/firebase";
import { collection, query, where, getDocs, limit, startAfter, getCountFromServer } from "firebase/firestore";
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
import { useListeningCollections } from "../../hooks/useListeningCollections";
import ListeningHeroBanner from "../../components/practice/ListeningHeroBanner";
import ListeningCollectionsSection from "../../components/practice/ListeningCollectionsSection";
import { deriveQuestionTypesForCard, qTypeMatchesSelected } from "../../utils/TestUtils";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function ListeningFull() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [selectedParts, setSelectedParts] = useState([]);
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  
  const { assignments, userResults = [], loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Custom hook to manage collections logic
  const collectionsData = useListeningCollections(userResults);
  const { allCollectionsTests = [] } = collectionsData;
  
  // Library Pagination State
  const [libraryTests, setLibraryTests] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const PAGE_SIZE = 200;

  const rawAssignments = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.id));
    const uniqueLibrary = libraryTests.filter(t => !assignedIds.has(t.id));
    const uniqueColTests = allCollectionsTests.filter(t => !assignedIds.has(t.id));
    
    const libraryIds = new Set(uniqueLibrary.map(t => t.id));
    const uniqueColTestsFiltered = uniqueColTests.filter(t => !libraryIds.has(t.id));

    return [...assignments, ...uniqueLibrary, ...uniqueColTestsFiltered];
  }, [assignments, libraryTests, allCollectionsTests]);

  const fetchLibraryPage = async (isFirstPage = false) => {
    if (loadingLibrary || (!hasMore && !isFirstPage)) return;
    setLoadingLibrary(true);
    try {
        let q = query(
            collection(db, 'tests_metadata'),
            where('type', '==', 'listening'),
            limit(PAGE_SIZE)
        );

        if (!isFirstPage && lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snap = await getDocs(q);
        const newTests = snap.docs.map(d => ({ id: d.id, ...d.data(), isPublic: true }));
        
        if (isFirstPage) {
            setLibraryTests(newTests);
            const countSnap = await getCountFromServer(query(collection(db, 'tests_metadata'), where('type', '==', 'listening')));
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
  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [activeSubTab] = useState('collections');
  const collectionsSectionRef = useRef(null);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedQuestionTypes]);

  const fullTestsList = useMemo(() => {
    const testMap = new Map();
    rawAssignments.forEach(item => {
      if (item.type === 'listening') {
        testMap.set(item.id, item);
      }
    });
    const allUniqueTests = Array.from(testMap.values());

    const resultList = [];
    allUniqueTests.forEach(test => {
      const fullAttempt = userResults?.find(
        r => String(r.testId).trim() === String(test.id).trim() && !r.partNumber
      );

      resultList.push({
        ...test,
        title: test.title?.toLowerCase().includes('full') ? test.title : `${test.title} (Full Mock)`,
        isFullTest: true,
        questionTypes: deriveQuestionTypesForCard(test),
        result: fullAttempt || null
      });
    });

    return resultList;
  }, [rawAssignments, userResults]);

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    fullTestsList.forEach(item => {
      if (item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [fullTestsList]);

  const filteredFullTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return fullTestsList.filter(full => {
      const matchesSearch = !q || full.title?.toLowerCase().includes(q);
      const isDone = !!full.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const matchesType = selectedQuestionTypes.length === 0 || 
                          (full.questionTypes && full.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [fullTestsList, searchQuery, selectedStatus, selectedQuestionTypes]);

  // Filter collections processed tests using filteredFullTests as source or matching collectionsData structure
  const filteredCollectionsData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const fullTestsListFiltered = (collectionsData.collectionProcessedTests?.fullTestsList || []).filter(test => {
      const matchesSearch = !q || test.title?.toLowerCase().includes(q);
      const isDone = !!test.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const matchesType = selectedQuestionTypes.length === 0 || 
                          (test.questionTypes && test.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
      return matchesSearch && matchesStatus && matchesType;
    });
    return {
      ...collectionsData,
      collectionProcessedTests: {
        ...collectionsData.collectionProcessedTests,
        fullTestsList: fullTestsListFiltered
      }
    };
  }, [collectionsData, searchQuery, selectedStatus, selectedQuestionTypes]);

  const handleStartTest = (test) => { 
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
    incrementUsage('listening').catch(err => console.error("Stats update failed:", err));
    
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
    <div className="min-h-screen bg-white dark:bg-[#09090b] font-sans text-gray-900 dark:text-[#f5f5f7] pb-24 selection:bg-[#0066cc]/30 selection:text-[#1d1d1f] transition-colors duration-200">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="listening"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <ListeningHeroBanner />

      <main className="w-full pb-24 md:pb-0">
        <div className="h-8 md:h-12" />

        <PracticeHero 
          activeTab="listening" 
          categories={categories} 
          totalCount={loading ? 0 : filteredFullTests.length}
          filteredCount={filteredFullTests.length}
        />

        <PracticeFilters 
          activeTab="listening" 
          setActiveTab={() => {}}
          activeSubTab="collections"
          listeningFilters={[]}
          handleSubTabClick={() => {}}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={(tabId) => {
            if (tabId === 'reading') navigate('/reading/full');
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
                <motion.div 
                    key="collections"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-16 pb-20"
                >
                    <ListeningCollectionsSection
                        collectionsSectionRef={collectionsSectionRef}
                        {...filteredCollectionsData}
                        handleReview={handleReview}
                        handleStartTest={handleStartTest}
                        setSelectedSet={setSelectedSet}
                        isPro={isPro}
                        isStandard={isStandard}
                    />
                </motion.div>
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
