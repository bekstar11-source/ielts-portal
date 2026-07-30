import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
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
import { deriveQuestionTypesForCard, qTypeMatchesSelected, getActualQuestionCount } from "../../utils/TestUtils";
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
  const [freeOnly, setFreeOnly] = useState(false);
  
  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium' ||
                    userData?.role === 'admin' || userData?.role === 'teacher';
  
  const { assignments, userResults = [], loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Custom hook to manage collections logic
  const collectionsData = useReadingCollections(userResults, userData);
  const { allCollectionsTests = [] } = collectionsData;
  
  const rawAssignments = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.id));
    const uniqueColTests = allCollectionsTests.filter(t => !assignedIds.has(t.id));
    let combined = [...assignments, ...uniqueColTests];

    // Sort free tests to the beginning
    combined.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return 0;
    });

    return combined.map(test => ({
      ...test,
      questionTypes: test.questionTypes || deriveQuestionTypesForCard(test)
    }));
  }, [assignments, allCollectionsTests]);

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

  const getQuestionCount = (test) => getActualQuestionCount(test);

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
                         (item.questionTypes && item.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
      const matchesFree = !freeOnly || !!item.isFree;
      return matchesSearch && matchesStatus && matchesType && matchesFree;
    });
  }, [rawAssignments, searchQuery, selectedQuestionTypes, selectedStatus, freeOnly]);

  const filteredCollectionProcessedTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const fullTestsList = (collectionsData.collectionProcessedTests.fullTestsList || []).map(test => ({
      ...test,
      questionTypes: test.questionTypes || deriveQuestionTypesForCard(test)
    })).filter(test => {
      const matchesSearch = !q || test.title?.toLowerCase().includes(q);
      const isDone = !!test.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      const matchesType = selectedQuestionTypes.length === 0 || 
                         (test.questionTypes && test.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
      const matchesFree = !freeOnly || !!test.isFree;
      return matchesSearch && matchesStatus && matchesType && matchesFree;
    });
    return { fullTestsList };
  }, [collectionsData.collectionProcessedTests, searchQuery, selectedStatus, selectedQuestionTypes, freeOnly]);

  const handleStartTest = (test) => { 
    const colTier = test.collectionAccessTier;
    const isAdminOrTeacher = userData?.role === 'admin' || userData?.role === 'teacher';
    let allowed = true;
    
    if (colTier === 'pro') {
      allowed = isPro || isAdminOrTeacher;
    } else if (colTier === 'standard') {
      allowed = isStandard || isPro || isAdminOrTeacher;
    }
    
    if (!allowed) {
      setShowPricingModal(true);
      return;
    }

    if (test.isFree || colTier === 'free') {
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
    setSelectedSet(null);
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
    <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans text-warm-ink dark:text-warm-on-dark overflow-x-hidden transition-colors duration-200">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="reading"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />



      <main className="w-full pb-24 md:pb-0">
        <PracticeHero 
          activeTab="reading" 
          subType="full"
          categories={categories} 
          totalCount={loading ? 0 : rawAssignments.filter(t => t.type === 'reading').length}
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
            if (tabId === 'listening') navigate('/listening/full');
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
            <>
                {(() => {
                    if (activeSubTab === 'full_test') {
                        const fullTests = filteredTests.filter(t => !t.isSet && getQuestionCount(t) > 14);
                        if (fullTests.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-40 text-center" key="no-fulltests">
                                    <Search size={24} className="text-gray-300 dark:text-zinc-600 mb-6" />
                                    <h3 className="text-[24px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Hech narsa topilmadi</h3>
                                </div>
                            );
                        }
                        return (
                          <motion.div 
                                key="full_test"
                                initial={false}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 pb-20"
                                ref={fullTestSectionRef}
                            >
                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">Full Reading</h2>
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
                                initial={false}
                                animate={{ opacity: 1, y: 0 }}
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
            </>
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
