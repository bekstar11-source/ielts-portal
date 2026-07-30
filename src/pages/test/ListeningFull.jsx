import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
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
import { getTier, canAccessPremiumContent } from '../../utils/subscription';
import BottomNav from "../../components/dashboard/BottomNav";

// REFACTORED COMPONENTS
import PracticeHero from "../../components/practice/PracticeHero";
import PracticeFilters from "../../components/practice/PracticeFilters";
import { useListeningCollections } from "../../hooks/useListeningCollections";
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
  const [freeOnly, setFreeOnly] = useState(false);
  
  const { assignments, userResults = [], loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Custom hook to manage collections logic
  const collectionsData = useListeningCollections(userResults, userData);
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
    return combined;
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
  // Tarif obuna MUDDATI bilan hisoblanadi (utils/subscription) — ilgari
  // bu yerda faqat bayroqlar o'qilib, muddati o'tgan obuna ham amal qilardi.
  const tier = getTier(userData);
  const isPro = tier === 'pro';
  const isStandard = tier === 'standard';
  const isPremium = canAccessPremiumContent(userData);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [activeSubTab] = useState('collections');
  const collectionsSectionRef = useRef(null);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedQuestionTypes, freeOnly]);

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
        title: test.title,
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
      const matchesFree = !freeOnly || !!full.isFree;

      return matchesSearch && matchesStatus && matchesType && matchesFree;
    });
  }, [fullTestsList, searchQuery, selectedStatus, selectedQuestionTypes, freeOnly]);

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
      const matchesFree = !freeOnly || !!test.isFree;
      return matchesSearch && matchesStatus && matchesType && matchesFree;
    });
    return {
      ...collectionsData,
      collectionProcessedTests: {
        ...collectionsData.collectionProcessedTests,
        fullTestsList: fullTestsListFiltered
      }
    };
  }, [collectionsData, searchQuery, selectedStatus, selectedQuestionTypes, freeOnly]);

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
    if (!checkLimit('listening', test)) {
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
    <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans text-warm-ink dark:text-warm-on-dark pb-24 selection:bg-warm-primary/30 selection:text-warm-ink transition-colors duration-200">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="listening"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <main className="w-full pb-24 md:pb-0">
        <PracticeHero 
          activeTab="listening" 
          subType="full"
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
                <motion.div 
                    key="collections"
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
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
                        searchQuery={searchQuery}
                        selectedStatus={selectedStatus}
                        selectedQuestionTypes={selectedQuestionTypes}
                        freeOnly={freeOnly}
                    />
                </motion.div>
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
