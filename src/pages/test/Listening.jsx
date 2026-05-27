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
import ListeningPartsSection from "../../components/practice/ListeningPartsSection";
import ListeningCollectionsSection from "../../components/practice/ListeningCollectionsSection";
import { deriveQuestionTypesForCard, qTypeMatchesSelected } from "../../utils/TestUtils";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function Listening() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab] = useState('listening');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [selectedParts, setSelectedParts] = useState([]);
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  const [activePartFilter, setActivePartFilter] = useState('all');
  
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
            // Fetch Total Count for students library
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
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [activeSubTab, setActiveSubTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    return section === 'collections' || section === 'full_test' ? section : 'parts';
  });

  const collectionsSectionRef = useRef(null);

  useEffect(() => {
    const sectionFromUrl = new URLSearchParams(location.search).get('section');
    if (sectionFromUrl === 'collections' || sectionFromUrl === 'full_test') {
      setActiveSubTab(sectionFromUrl);
    } else if (!sectionFromUrl) {
      setActiveSubTab('parts');
    }
  }, [location.search]);

  // Reset pagination to page 1 when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedQuestionTypes, activePartFilter, activeSubTab]);

  const processedTests = useMemo(() => {
    // 1. Get unique tests from rawAssignments (which has assignments + libraryTests)
    const testMap = new Map();
    rawAssignments.forEach(item => {
      if (item.type === 'listening') {
        testMap.set(item.id, item);
      }
    });
    const allUniqueTests = Array.from(testMap.values());

    const partTestsList = [];
    const fullTestsList = [];

    allUniqueTests.forEach(test => {
      // Find full test attempt
      const fullAttempt = userResults?.find(
        r => String(r.testId).trim() === String(test.id).trim() && !r.partNumber
      );

      // Create full test object
      const fullTestObj = {
        ...test,
        title: test.title?.toLowerCase().includes('full') ? test.title : `${test.title} (Full Mock)`,
        isFullTest: true,
        questionTypes: deriveQuestionTypesForCard(test),
        result: fullAttempt || null
      };
      fullTestsList.push(fullTestObj);

      // Create virtual part tests
      if (test.parts && Object.keys(test.parts).length > 0) {
        Object.entries(test.parts).forEach(([key, partData]) => {
          const partNum = parseInt(key.replace('part', ''));
          if (isNaN(partNum)) return;

          // Find part attempt
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
        // Fallback for older tests that do not have parts in metadata
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
  }, [rawAssignments, userResults]);

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    processedTests.fullTestsList.forEach(item => {
      if (item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    processedTests.partTestsList.forEach(item => {
      if (item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [processedTests]);

  const filteredVirtualParts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return processedTests.partTestsList.filter(part => {
      const matchesSearch = !q || part.title?.toLowerCase().includes(q);
      const isDone = !!part.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const matchesType = selectedQuestionTypes.length === 0 || 
                         (part.questionTypes && part.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
      
      const matchesPartTab = activePartFilter === 'all' || String(part.partNumber) === activePartFilter;

      return matchesSearch && matchesStatus && matchesType && matchesPartTab;
    });
  }, [processedTests.partTestsList, searchQuery, selectedStatus, selectedQuestionTypes, activePartFilter]);

  const filteredFullTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return processedTests.fullTestsList.filter(full => {
      const matchesSearch = !q || full.title?.toLowerCase().includes(q);
      const isDone = !!full.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const matchesType = selectedQuestionTypes.length === 0 || 
                         (full.questionTypes && full.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [processedTests.fullTestsList, searchQuery, selectedStatus, selectedQuestionTypes]);

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
    
    if (test.isVirtualPart) {
      navigate(`/test/${test.testId}?part=${test.partNumber}`);
    } else {
      const targetId = test.id || test.testId || test.targetId;
      if (targetId) navigate(`/test/${targetId}`);
      else alert("Test ID topilmadi!");
    }
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
        {/* SPACING */}
        <div className="h-8 md:h-12" />

        <PracticeHero 
          activeTab="listening" 
          categories={categories} 
          totalCount={loading ? 0 : (totalLibraryCount * 4 || processedTests.partTestsList.length)}
          filteredCount={filteredVirtualParts.length + filteredFullTests.length}
        />

        <PracticeFilters 
          activeTab="listening" 
          setActiveTab={() => {}}
          activeSubTab={activeSubTab}
          listeningFilters={[]}
          handleSubTabClick={() => {}}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={(tabId) => {
            if (tabId === 'reading') navigate('/reading');
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
                {(() => {
                    if (activeSubTab === 'parts') {
                        if (filteredVirtualParts.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-4 duration-700" key="no-parts">
                                    <div className="w-16 h-16 bg-[#f5f5f7] dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                                        <Search size={24} className="text-gray-300 dark:text-zinc-650" />
                                    </div>
                                    <h3 className="text-[24px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Hech narsa topilmadi</h3>
                                    <p className="text-[#86868b] dark:text-[#86868b] mt-2 max-w-[300px]">Qidiruv mezonlariga mos keladigan testlar mavjud emas.</p>
                                </div>
                            );
                        }
                        return (
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
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    itemsPerPage={itemsPerPage}
                                    handleReview={handleReview}
                                    handleStartTest={handleStartTest}
                                    setSelectedSet={setSelectedSet}
                                    isPro={isPro}
                                    isStandard={isStandard}
                                    hasMore={hasMore}
                                    fetchLibraryPage={fetchLibraryPage}
                                    loadingLibrary={loadingLibrary}
                                />
                            </motion.div>
                        );
                    }

                    if (activeSubTab === 'full_test' || activeSubTab === 'collections') {
                        return (
                            <motion.div 
                                key="collections"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-16 pb-20"
                            >
                                <ListeningCollectionsSection
                                    collectionsSectionRef={collectionsSectionRef}
                                    {...collectionsData}
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
