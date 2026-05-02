import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../hooks/useStudentData";
import { db } from "../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { 
  BookOpen, Headphones, PenTool, Mic, Crown, 
  RotateCw, ChevronLeft, ChevronRight, Search 
} from 'lucide-react';

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardModals from "../components/dashboard/DashboardModals";
import PricingModal from "../components/dashboard/PricingModal";
import SiteFooter from "../components/common/SiteFooter";
import LimitReachedSheet from "../components/dashboard/LimitReachedSheet";
import { useDailyLimit } from "../hooks/useDailyLimit";

// REFACTORED COMPONENTS
import PracticeHero from "../components/practice/PracticeHero";
import PracticeFilters from "../components/practice/PracticeFilters";
import PracticeCard from "../components/practice/PracticeCard";
import FullReadingCard from "../components/practice/FullReadingCard";
import ReadingSetCard from "../components/practice/ReadingSetCard";
import { usePracticeScroll } from "../hooks/usePracticeScroll";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function Reading() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab] = useState('reading');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [selectedPassages, setSelectedPassages] = useState([]); 
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  
  const { assignments, loading, error: errorMsg, refresh } = useStudentData(user);
  const rawAssignments = useMemo(() => [...assignments], [assignments]);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [testToStart, setTestToStart] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [showLimitSheet, setShowLimitSheet] = useState(false);
  const [limitType, setLimitType] = useState('reading');

  const { checkLimit, incrementUsage } = useDailyLimit(userData);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fullReadingScroll = usePracticeScroll();

  const passagesSectionRef = useRef(null);
  const fullTestSectionRef = useRef(null);
  const setSectionRef = useRef(null);
  const isManualScrollingRef = useRef(false);

  const readingFilters = [
    { id: 'passages', label: 'Passages', ref: passagesSectionRef },
    { id: 'full_test', label: 'Full Tests', ref: fullTestSectionRef },
    { id: 'set', label: 'Sets', ref: setSectionRef }
  ];
  const [activeSubTab, setActiveSubTab] = useState('passages');

  const handleSubTabClick = (filter) => {
    if (activeSubTab === filter.id) return;
    isManualScrollingRef.current = true;
    setActiveSubTab(filter.id);
    if (filter.ref && filter.ref.current) {
        const yOffset = -140; 
        const element = filter.ref.current;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
        isManualScrollingRef.current = false;
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const sectionFromUrl = queryParams.get('section');
    if (sectionFromUrl) {
      const timer = setTimeout(() => {
        const filter = readingFilters.find(f => f.id === sectionFromUrl);
        if (filter) {
          handleSubTabClick(filter);
          navigate('/reading', { replace: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  useEffect(() => {
    const handleScrollEvent = () => {
      const scrollPosition = window.scrollY + 200; 
      const sections = [
        { id: 'passages', ref: passagesSectionRef },
        { id: 'full_test', ref: fullTestSectionRef },
        { id: 'set', ref: setSectionRef }
      ];

      let currentSection = sections[0].id;
      for (const section of sections) {
        if (section.ref.current) {
          const absoluteTop = window.scrollY + section.ref.current.getBoundingClientRect().top;
          if (scrollPosition >= absoluteTop) {
            currentSection = section.id;
          }
        }
      }
      if (isManualScrollingRef.current) return;
      setActiveSubTab(prev => prev !== currentSection ? currentSection : prev);
    };
    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    handleScrollEvent();
    return () => window.removeEventListener('scroll', handleScrollEvent);
  }, []);

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    rawAssignments.forEach(item => {
      if (item.type === 'reading' && item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
      if (item.isSet && item.subTests) {
          item.subTests.forEach(sub => {
              if (sub.type === 'reading' && sub.questionTypes) {
                  sub.questionTypes.forEach(t => types.add(t));
              }
          });
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [rawAssignments]);

  const filteredTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = [];
    
    rawAssignments.forEach(item => {
      let matchesTab = item.type === 'reading' || item.isSet;
      if (!matchesTab) return;

      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      const isDone = !!item.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const getPassageNum = (test, indexInSet) => {
        if (test.passageNumber) return Number(test.passageNumber);
        if (test.passage_number) return Number(test.passage_number);
        const title = test.title?.toLowerCase() || '';
        const match = title.match(/passage\s*:?\s*(\d)/i) || title.match(/\bp\s*(\d)\b/i);
        if (match) return Number(match[1]);
        if (indexInSet !== undefined) return indexInSet + 1;
        return null;
      };

      const pNum = getPassageNum(item);
      const matchesPassage = selectedPassages.length === 0 || 
                            (pNum && selectedPassages.includes(pNum));

      if (item.isSet) {
        const matchingSubTests = item.subTests?.filter((s, idx) => {
            const mSearch = s.title?.toLowerCase().includes(q);
            const mType = selectedQuestionTypes.length === 0 || 
                         (s.questionTypes && s.questionTypes.some(t => selectedQuestionTypes.includes(t)));
            const subIsDone = !!s.result;
            const mStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && subIsDone) || 
                           (selectedStatus === 'not_completed' && !subIsDone);
            const spNum = getPassageNum(s, idx);
            const mPassage = selectedPassages.length === 0 || (spNum && selectedPassages.includes(spNum));
            return s.type === 'reading' && mSearch && mType && mStatus && mPassage;
        }) || [];

        if (!q && selectedQuestionTypes.length === 0 && selectedStatus === 'all' && selectedPassages.length === 0) {
            result.push(item);
        } else if (matchingSubTests.length > 0) {
            matchingSubTests.forEach(sub => result.push({ ...sub, _fromSet: item.title }));
        }
        return;
      }

      const matchesType = selectedQuestionTypes.length === 0 || 
                         (item.questionTypes && item.questionTypes.some(t => selectedQuestionTypes.includes(t)));
      
      if (matchesSearch && matchesType && matchesStatus && matchesPassage) {
        result.push(item);
      }
    });
    return result;
  }, [rawAssignments, searchQuery, selectedQuestionTypes, selectedStatus, selectedPassages]);

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
        const q = query(collection(db, "accessKeys"), where("key", "==", accessKeyInput.trim().toUpperCase()));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) throw new Error("Kalit xato!");
        const keyDoc = querySnapshot.docs[0];
        const keyData = keyDoc.data();
        if (keyData.isUsed) throw new Error("Bu kalit ishlatilgan!");

        const mockAssignment = { id: keyData.targetId, type: 'test', startDate: new Date().toISOString(), endDate: null, status: 'unlocked_key', key: keyData.key };
        await updateDoc(doc(db, "users", user.uid), { assignedTests: arrayUnion(mockAssignment) });
        await updateDoc(doc(db, "accessKeys", keyDoc.id), { isUsed: true, usedBy: user.uid, usedByName: userData?.fullName, usedAt: new Date().toISOString() });

        alert("Test qo'shildi! 🚀");
        await refresh();
        setShowKeyModal(false); 
        setAccessKeyInput("");
    } catch (error) { setKeyError(error.message); } finally { setCheckingKey(false); }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-24">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="reading"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <main className="w-full">
        <PracticeHero 
          activeTab="reading" 
          categories={categories} 
          totalCount={rawAssignments.filter(t => t.type === 'reading').length}
          filteredCount={filteredTests.length}
        />

        <PracticeFilters 
          activeTab="reading" 
          setActiveTab={() => {}}
          activeSubTab={activeSubTab}
          handleSubTabClick={handleSubTabClick}
          readingFilters={readingFilters}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={(tabId) => {
            if (tabId === 'listening') navigate('/listening');
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
                    <div className="flex flex-col items-center justify-center py-40 text-center">
                        <Search size={24} className="text-gray-300 mb-6" />
                        <h3 className="text-[24px] font-semibold text-[#1d1d1f]">Hech narsa topilmadi</h3>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-10 pb-20"
                    >
                        <div className="space-y-4" ref={passagesSectionRef}>
                            <div className="space-y-1">
                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Reading Passages</h2>
                                <p className="text-[#86868b] text-[14px]">Displaying {filteredTests.filter(t => !t.title?.includes('/') && !t.isSet).length} passages</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-4">
                                {filteredTests.filter(t => !t.title?.includes('/') && !t.isSet).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
                                    <PracticeCard 
                                        key={test.id} 
                                        test={test} 
                                        isCompleted={!!test.result}
                                        onReview={handleReview}
                                        onStart={handleStartTest}
                                        onSelectSet={setSelectedSet}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {filteredTests.filter(t => !t.title?.includes('/') && !t.isSet).length > itemsPerPage && (
                                <div className="flex justify-center items-center gap-1.5 pt-10 pb-8">
                                    {(() => {
                                        const passages = filteredTests.filter(t => !t.title?.includes('/') && !t.isSet);
                                        const totalPages = Math.ceil(passages.length / itemsPerPage);
                                        const pages = [];
                                        const delta = 1; 
                                        
                                        for (let i = 1; i <= totalPages; i++) {
                                            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                                                pages.push(i);
                                            } else if (i === currentPage - delta - 1 || i === currentPage + delta + 1) {
                                                pages.push('...');
                                            }
                                        }
                                        const uniquePages = pages.filter((p, i) => p !== '...' || pages[i-1] !== '...');

                                        return uniquePages.map((p, i) => (
                                            p === '...' ? (
                                                <span key={`dots-${i}`} className="text-[#86868b] px-1 text-[13px]">...</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        setCurrentPage(p);
                                                        if (passagesSectionRef.current) {
                                                            const yOffset = -140; 
                                                            const y = passagesSectionRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
                                                            window.scrollTo({ top: y, behavior: 'smooth' });
                                                        }
                                                    }}
                                                    className={`w-8 h-8 rounded-full text-[13px] font-semibold transition-all ${
                                                        currentPage === p 
                                                        ? 'bg-[#1d1d1f] text-white' 
                                                        : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>

                        {filteredTests.some(t => t.title?.includes('/')) && (
                            <motion.div 
                                className="space-y-4"
                                ref={fullTestSectionRef}
                            >
                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Full Reading</h2>
                                <div 
                                    ref={fullReadingScroll.scrollRef}
                                    onScroll={(e) => fullReadingScroll.updateScrollState(e.currentTarget)}
                                    className="flex gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
                                >
                                    {filteredTests.filter(t => t.title?.includes('/')).map((test, i) => (
                                      <FullReadingCard 
                                        key={test.id}
                                        test={test}
                                        index={i}
                                        isCompleted={!!test.result}
                                        onReview={handleReview}
                                        onStart={handleStartTest}
                                        onSelectSet={setSelectedSet}
                                      />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {filteredTests.some(t => t.isSet) && (
                            <motion.div
                                className="space-y-4"
                                ref={setSectionRef}
                            >
                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Sets</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                    {filteredTests.filter(t => t.isSet).map((set, i) => (
                                      <ReadingSetCard 
                                        key={set.id}
                                        set={set}
                                        index={i}
                                        isCompleted={!!set.result}
                                        onReview={handleReview}
                                        onSelectSet={setSelectedSet}
                                      />
                                    ))}
                                </div>
                            </motion.div>
                        )}
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
      />
      <PricingModal 
        isOpen={showPricingModal} 
        onClose={() => setShowPricingModal(false)}
        userName={userData?.fullName?.split(' ')[0]} 
      />
      <SiteFooter />
    </div>
  );
}
