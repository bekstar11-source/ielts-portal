import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { db } from "../../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { 
  BookOpen, Headphones, PenTool, Mic, Crown, 
  RotateCw, ChevronLeft, ChevronRight, Search, Loader2 
} from 'lucide-react';
import { limit, startAfter, getCountFromServer } from "firebase/firestore";

// COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";
import LibrarySubHeader from "../../components/dashboard/LibrarySubHeader";
import PricingModal from "../../components/dashboard/PricingModal";
import SiteFooter from "../../components/common/SiteFooter";
import { useDailyLimit } from "../../hooks/useDailyLimit";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import BottomNav from "../../components/dashboard/BottomNav";

// REFACTORED COMPONENTS
import PracticeHero from "../../components/practice/PracticeHero";
import PracticeFilters from "../../components/practice/PracticeFilters";
import PracticeCard from "../../components/practice/PracticeCard";

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
  
  const { assignments, loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Library Pagination State
  const [libraryTests, setLibraryTests] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const PAGE_SIZE = 12;

  const rawAssignments = useMemo(() => {
    // Deduplicate between assignments and library tests
    const assignedIds = new Set(assignments.map(a => a.id));
    const uniqueLibrary = libraryTests.filter(t => !assignedIds.has(t.id));
    return [...assignments, ...uniqueLibrary];
  }, [assignments, libraryTests]);

  const fetchLibraryPage = async (isFirstPage = false) => {
    if (loadingLibrary || (!hasMore && !isFirstPage)) return;
    setLoadingLibrary(true);
    try {
        let q = query(
            collection(db, 'tests'),
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
            const countSnap = await getCountFromServer(query(collection(db, 'tests'), where('type', '==', 'listening')));
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

  const partsSectionRef = useRef(null);
  const fullTestSectionRef = useRef(null);
  const isManualScrollingRef = useRef(false);

  const listeningFilters = [
    { id: 'parts', label: 'Listening Parts', ref: partsSectionRef },
    { id: 'full_test', label: 'Full Tests', ref: fullTestSectionRef }
  ];
  const [activeSubTab, setActiveSubTab] = useState('parts');

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
    const handleScrollEvent = () => {
      const scrollPosition = window.scrollY + 200; 
      const sections = [
        { id: 'parts', ref: partsSectionRef },
        { id: 'full_test', ref: fullTestSectionRef }
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
        const timer = setTimeout(() => {
            isManualScrollingRef.current = false;
        }, 100);
        return;
      }
      setActiveSubTab(prev => prev !== currentSection ? currentSection : prev);
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    handleScrollEvent();
    return () => window.removeEventListener('scroll', handleScrollEvent);
  }, []);

  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    rawAssignments.forEach(item => {
      if (item.type === 'listening' && item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [rawAssignments]);

  const filteredTests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = [];
    
    rawAssignments.forEach(item => {
      let matchesTab = item.type === 'listening';
      if (!matchesTab) return;

      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      const isDone = !!item.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const matchesType = selectedQuestionTypes.length === 0 || 
                         (item.questionTypes && item.questionTypes.some(t => selectedQuestionTypes.includes(t)));
      
      const matchesPart = selectedParts.length === 0 || 
                         (item.partNumber && selectedParts.includes(item.partNumber)) ||
                         (item.title && selectedParts.some(p => item.title.toLowerCase().includes(`part ${p}`)));

      if (matchesSearch && matchesType && matchesStatus && matchesPart) {
        result.push(item);
      }
    });
    return result;
  }, [rawAssignments, searchQuery, selectedQuestionTypes, selectedStatus, selectedParts]);

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
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-24 selection:bg-[#0066cc]/30 selection:text-[#1d1d1f]">
      <DashboardHeader
        user={user} userData={userData}
        activeTab="listening"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <LibrarySubHeader 
        activeTab="listening" 
        scrolledContent={
          <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/5 h-9">
            {listeningFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleSubTabClick(filter)}
                className={`px-4 py-1.5 h-full rounded-full text-[12px] font-semibold transition-all flex items-center justify-center
                  ${activeSubTab === filter.id 
                    ? 'bg-[#1d1d1f] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]' 
                    : 'text-black/50 hover:text-black hover:bg-black/5'}
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>
        }
      />

      {/* TOP ANIMATION SECTION */}
      <div className="w-full bg-[#050505] h-[180px] md:h-[240px] flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-purple-600/20" />
        </div>
        <div className="w-full max-w-[800px] h-full flex items-center justify-center">
            <DotLottieReact
                src="https://lottie.host/880c85c0-4389-4e78-9844-3151475c4040/XoN8hOPr6z.lottie"
                loop
                autoplay
                className="w-full h-full object-contain"
            />
        </div>

        {/* BACKGROUND ANIMATED TEXT */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <motion.h2 
                initial={{ opacity: 0, filter: 'blur(20px)', scale: 0.8 }}
                animate={{ 
                    opacity: 0.12,
                    filter: 'blur(5px)',
                    scale: 1
                }}
                transition={{ 
                    duration: 4, 
                    ease: "easeOut",
                    delay: 0.5
                }}
                className="text-white text-[10vw] md:text-[6vw] font-black uppercase tracking-tighter text-center leading-none select-none"
            >
                Where Curiosity <br />
                <span className="text-[8vw] md:text-[5vw] opacity-80">Meets Excellence</span>
            </motion.h2>
        </div>
        
        {/* TEXT OVERLAY */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center z-10">
            <h1 className="text-white text-2xl md:text-4xl font-bold tracking-tight mb-2 drop-shadow-2xl">
                IELTS Listening Mastery
            </h1>
            <p className="text-white/60 text-sm md:text-base font-medium">
                Practice with real-exam format materials
            </p>
        </div>
      </div>

      <main className="w-full pb-24 md:pb-0">
        {/* SPACING */}
        <div className="h-8 md:h-12" />

        <PracticeHero 
          activeTab="listening" 
          categories={categories} 
          totalCount={loading ? 0 : (totalLibraryCount || rawAssignments.filter(t => t.type === 'listening').length)}
          filteredCount={filteredTests.length}
        />

        <PracticeFilters 
          activeTab="listening" 
          setActiveTab={() => {}}
          activeSubTab={activeSubTab}
          handleSubTabClick={handleSubTabClick}
          listeningFilters={listeningFilters}
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-16 pb-20"
                    >
                        {(() => {
                            const partTests = filteredTests.filter(t => t.title?.toLowerCase().includes('part') || t.partNumber);
                            const fullTests = filteredTests.filter(t => t.title?.toLowerCase().includes('full') || !t.title?.toLowerCase().includes('part'));

                            return (
                                <>
                                    {/* Parts Section */}
                                    <div className="space-y-4" ref={partsSectionRef}>
                                        <div className="space-y-1">
                                            <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Listening Parts</h2>
                                            <p className="text-[#86868b] text-[14px]">Displaying {partTests.length} part-based tests</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-4">
                                            {partTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
                                                <PracticeCard 
                                                    key={test.id} 
                                                    test={test} 
                                                    isCompleted={!!test.result}
                                                    onReview={handleReview}
                                                    onStart={handleStartTest}
                                                    onSelectSet={setSelectedSet}
                                                    isPro={isPro}
                                                    isStandard={isStandard}
                                                />
                                            ))}
                                        </div>

                                        {/* Pagination for Parts */}
                                        {partTests.length > itemsPerPage && (
                                            <div className="flex justify-center items-center gap-1.5 pt-10 pb-8">
                                                {(() => {
                                                    const totalPages = Math.ceil(partTests.length / itemsPerPage);
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
                                                                    if (partsSectionRef.current) {
                                                                        const yOffset = -140; 
                                                                        const y = partsSectionRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
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

                                    {/* Full Tests Section */}
                                    {fullTests.length > 0 && (
                                        <div className="space-y-4 pt-10 border-t border-zinc-100" ref={fullTestSectionRef}>
                                            <div className="space-y-1">
                                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Full Tests</h2>
                                                <p className="text-[#86868b] text-[14px]">Displaying {fullTests.length} full length tests</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-4">
                                                {fullTests.map((test) => (
                                                    <PracticeCard 
                                                        key={test.id} 
                                                        test={test} 
                                                        isCompleted={!!test.result}
                                                        onReview={handleReview}
                                                        onStart={handleStartTest}
                                                        onSelectSet={setSelectedSet}
                                                        isPro={isPro}
                                                        isStandard={isStandard}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="flex justify-center pt-10 pb-20">
                                <button
                                    onClick={() => fetchLibraryPage()}
                                    disabled={loadingLibrary}
                                    className="group relative flex items-center gap-3 px-8 py-4 bg-[#1d1d1f] text-white rounded-full font-semibold transition-all hover:bg-black active:scale-95 disabled:opacity-50"
                                >
                                    {loadingLibrary ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            Show More Tests
                                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
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
