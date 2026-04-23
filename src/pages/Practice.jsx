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
import Pagination from "../components/common/Pagination";
import SiteFooter from "../components/common/SiteFooter";

// REFACTORED COMPONENTS
import PracticeHero from "../components/practice/PracticeHero";
import PracticeFilters from "../components/practice/PracticeFilters";
import PracticeCard from "../components/practice/PracticeCard";
import FullReadingCard from "../components/practice/FullReadingCard";
import ReadingSetCard from "../components/practice/ReadingSetCard";
import { usePracticeScroll } from "../hooks/usePracticeScroll";

// Categories
const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
  { id: 'mock', label: 'Mock', icon: Crown },
];

export default function Practice() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab');

  // State
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'reading');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real Data Hook
  const { assignments, loading, error: errorMsg, refresh } = useStudentData(user);
  const rawAssignments = useMemo(() => [...assignments], [assignments]);

  // Modals state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [testToStart, setTestToStart] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyError, setKeyError] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllCards, setShowAllCards] = useState(false);
  const itemsPerPage = 9;

  // Custom Hooks for scrolling
  const stdScroll = usePracticeScroll();
  const fullReadingScroll = usePracticeScroll();

  // Section Refs for internal scrolling
  const passagesSectionRef = useRef(null);
  const fullTestSectionRef = useRef(null);
  const setSectionRef = useRef(null);
  const isManualScrollingRef = useRef(false);

  // Sub filters for reading
  const readingFilters = [
    { id: 'passages', label: 'Passages', ref: passagesSectionRef },
    { id: 'full_test', label: 'Full Tests', ref: fullTestSectionRef },
    { id: 'set', label: 'Sets', ref: setSectionRef }
  ];
  const [activeSubTab, setActiveSubTab] = useState('passages');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/practice?tab=${tabId}`, { replace: true });
  };

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

  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'reading') return;

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
      
      if (isManualScrollingRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            isManualScrollingRef.current = false;
        }, 150);
        return;
      }
      
      setActiveSubTab(prev => prev !== currentSection ? currentSection : prev);
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    handleScrollEvent();
    return () => window.removeEventListener('scroll', handleScrollEvent);
  }, [activeTab]);

  useEffect(() => {
    const sectionFromUrl = queryParams.get('section');
    if (activeTab === 'reading' && sectionFromUrl) {
      const timer = setTimeout(() => {
        const filter = readingFilters.find(f => f.id === sectionFromUrl);
        if (filter) {
          handleSubTabClick(filter);
          navigate('/practice?tab=reading', { replace: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, location.search]);

  // Reset showAllCards when tab changes
  useEffect(() => {
    setShowAllCards(false);
  }, [activeTab]);

  // Filter & Search Logic
  const filteredTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = [];
    
    rawAssignments.forEach(item => {
      let matchesTab = true;
      if (activeTab !== 'all') {
        if (activeTab === 'mock') matchesTab = item.isMock;
        else if (activeTab === 'set') matchesTab = item.isSet;
        else matchesTab = item.type === activeTab;
      }
      if (!matchesTab) return;

      if (item.isSet) {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const matchingSubTests = item.subTests?.filter(s => s.title?.toLowerCase().includes(q)) || [];
        if (!q) {
            result.push(item);
        } else if (titleMatch) {
            item.subTests?.forEach(sub => result.push({ ...sub, _fromSet: item.title }));
        } else if (matchingSubTests.length > 0) {
            matchingSubTests.forEach(sub => result.push({ ...sub, _fromSet: item.title }));
        }
        return;
      }

      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      if (matchesSearch) result.push(item);
    });
    return result;
  }, [rawAssignments, searchQuery, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Handlers
  const handleManualRefresh = async () => {
    if (!user) return;
    await refresh();
  };

  const handleStartTest = (test) => { 
    setTestToStart(test); 
    setShowStartConfirm(true); 
  };

  const confirmStartTest = () => {
    const test = testToStart;
    setShowStartConfirm(false);
    setSelectedSet(null);
    if (test.type === 'mock_full') { 
        navigate('/mock-exam', { state: { mockData: test } }); 
        return; 
    }
    navigate(`/test/${test.id || test.testId}`);
  };

  const handleReview = (test) => {
    const resultId = test.result?.id;
    if (!resultId) {
      alert("Natija topilmadi!");
      return;
    }
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

        let mockAssignment = {};
        if (keyData.type === 'mock_bundle') {
            mockAssignment = {
                id: 'MOCK_' + keyData.key, type: 'mock_full', title: 'Full Mock Exam (L+R+W)',
                startDate: new Date().toISOString(), endDate: null, status: 'unlocked_mock',
                mockKey: keyData.key,
                subTests: { reading: keyData.assignedTests.readingId, listening: keyData.assignedTests.listeningId, writing: keyData.assignedTests.writingId }
            };
        } else {
            mockAssignment = { id: keyData.targetId, type: 'test', startDate: new Date().toISOString(), endDate: null, status: 'unlocked_key', key: keyData.key };
        }
        await updateDoc(doc(db, "users", user.uid), { assignedTests: arrayUnion(mockAssignment) });
        await updateDoc(doc(db, "accessKeys", keyDoc.id), { isUsed: true, usedBy: user.uid, usedByName: userData?.fullName, usedAt: new Date().toISOString() });

        alert("Test qo'shildi! 🚀");
        await refresh();
        setShowKeyModal(false); 
        setAccessKeyInput("");
    } catch (error) { setKeyError(error.message); } finally { setCheckingKey(false); }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-24 selection:bg-[#0066cc]/30 selection:text-[#1d1d1f]">
      
      <DashboardHeader
        user={user} userData={userData}
        activeTab={activeTab}
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <main className="w-full">
        <PracticeHero activeTab={activeTab} categories={categories} />

        <PracticeFilters 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          activeSubTab={activeSubTab}
          handleSubTabClick={handleSubTabClick}
          readingFilters={readingFilters}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleTabClick={handleTabClick}
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
                <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-6">
                      <Search size={24} className="text-gray-300" />
                   </div>
                   <h3 className="text-[24px] font-semibold text-[#1d1d1f]">Hech narsa topilmadi</h3>
                   <p className="text-[#86868b] mt-2 max-w-[300px]">Qidiruv mezonlariga mos keladigan testlar mavjud emas.</p>
                </div>
              ) : (
                  <motion.div 
                    key={`${activeTab}-${showAllCards}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-10 pb-20"
                  >
                        {(() => {
                            const isReading = activeTab.toLowerCase() === 'reading';
                            const standardTests = isReading 
                                ? filteredTests.filter(t => !t.title?.includes('/')) 
                                : filteredTests;
                            const fullReadingTests = isReading 
                                ? filteredTests.filter(t => t.title?.includes('/')) 
                                : [];

                            return (
                                <>
                                    {/* Standard/Individual Section */}
                                    <div className="space-y-4" ref={passagesSectionRef}>
                                        {isReading && (
                                            <h2 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight">Reading Passages</h2>
                                        )}
                                        
                                        {!showAllCards ? (
                                            <div className="group/scroll relative">
                                                <div 
                                                    ref={stdScroll.scrollRef}
                                                    onScroll={(e) => stdScroll.updateScrollState(e.currentTarget)}
                                                    className="grid grid-flow-col auto-cols-[minmax(320px,1fr)] md:auto-cols-[minmax(380px,1fr)] items-stretch gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
                                                >
                                                    {standardTests.slice(0, 15).map((test) => (
                                                      <div key={test.id} className="flex flex-col h-full">
                                                        <PracticeCard 
                                                          test={test} 
                                                          isCompleted={!!test.result}
                                                          onReview={handleReview}
                                                          onStart={handleStartTest}
                                                          onSelectSet={setSelectedSet}
                                                        />
                                                      </div>
                                                    ))}
                                                    {standardTests.length > 15 && (
                                                      <div className="snap-start min-w-[120px] md:min-w-[180px] flex flex-col h-full">
                                                          <button 
                                                              onClick={() => setShowAllCards(true)}
                                                              className="w-full h-full flex flex-col items-center justify-center bg-[#F6F6FA] rounded-[24px] hover:bg-gray-200/50 transition-all duration-300 group px-8"
                                                          >
                                                              <div className="w-12 h-12 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0071e3] transition-colors">
                                                                  <RotateCw size={20} className="text-[#86868b] group-hover:text-white" />
                                                              </div>
                                                              <span className="text-[15px] font-bold text-[#1d1d1f]">See All</span>
                                                              <span className="text-[12px] text-[#86868b] mt-0.5">{standardTests.length} Tests</span>
                                                          </button>
                                                      </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center justify-end gap-2 -mt-6 mb-8 mr-8 relative z-20">
                                                    <button 
                                                        onClick={() => stdScroll.handleScroll(-1)}
                                                        disabled={!stdScroll.canLeft}
                                                        className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${stdScroll.canLeft ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                    >
                                                        <ChevronLeft size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => stdScroll.handleScroll(1)}
                                                        disabled={!stdScroll.canRight}
                                                        className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${stdScroll.canRight ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                    {standardTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
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
                                                
                                                <div className="mt-12 flex justify-center">
                                                    <Pagination
                                                        currentPage={currentPage}
                                                        totalPages={Math.ceil(standardTests.length / itemsPerPage)}
                                                        onPageChange={setCurrentPage}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Full Reading Section */}
                                    {isReading && fullReadingTests.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 60 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "-100px" }}
                                            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                                            className="space-y-4"
                                            ref={fullTestSectionRef}
                                        >
                                            <h2 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight">Full Reading</h2>
                                            <div 
                                                ref={fullReadingScroll.scrollRef}
                                                onScroll={(e) => fullReadingScroll.updateScrollState(e.currentTarget)}
                                                className="flex gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
                                            >
                                                {fullReadingTests.map((test, i) => (
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

                                            <div className="flex items-center justify-end gap-2 -mt-6 mb-8 mr-8 relative z-20">
                                                <button 
                                                    onClick={() => fullReadingScroll.handleScroll(-1)}
                                                    disabled={!fullReadingScroll.canLeft}
                                                    className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${fullReadingScroll.canLeft ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => fullReadingScroll.handleScroll(1)}
                                                    disabled={!fullReadingScroll.canRight}
                                                    className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${fullReadingScroll.canRight ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Reading Sets Showcase */}
                                    {isReading && (() => {
                                        const readingSets = rawAssignments.filter(t => 
                                            t.isSet && (
                                                t.subTests?.some(s => s.type === 'reading') ||
                                                t.subTests?.length > 0
                                            )
                                        );
                                        if (readingSets.length === 0) return null;
                                        
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 40 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true, margin: "-80px" }}
                                                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                                                className="space-y-4"
                                                ref={setSectionRef}
                                            >
                                                <h2 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight">Sets</h2>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                                    {readingSets.slice(0, 2).map((set, i) => (
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
                                        );
                                    })()}
                                </>
                            );
                        })()}
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
