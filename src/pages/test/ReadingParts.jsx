import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { db, functions } from "../../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { 
  BookOpen, Headphones, PenTool, Mic, ChevronRight, Search, Loader2 
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
import PracticeCard from "../../components/practice/PracticeCard";

const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function ReadingParts() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); 
  const [selectedPassages, setSelectedPassages] = useState([]); 
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  
  const isPro = userData?.accountType === 'pro' || userData?.isPro;
  const isStandard = userData?.accountType === 'standard';
  const isPremium = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
  
  const { assignments, loading, error: errorMsg, refresh } = useStudentData(user);
  
  // Library Pagination State
  const [libraryTests, setLibraryTests] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const PAGE_SIZE = 200;

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedQuestionTypes, selectedPassages]);

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
    const result = [];
    
    rawAssignments.forEach(item => {
      let matchesTab = item.type === 'reading' && !item.isSet;
      if (!matchesTab) return;

      // Filter out tests with more than 14 questions for the parts page
      const qCount = getQuestionCount(item);
      if (qCount > 14) return;

      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      const isDone = !!item.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      
      const getPassageNum = (test) => {
        if (test.passageNumber) return Number(test.passageNumber);
        if (test.passage_number) return Number(test.passage_number);
        const title = test.title?.toLowerCase() || '';
        const match = title.match(/passage\s*:?\s*(\d)/i) || title.match(/\bp\s*(\d)\b/i);
        if (match) return Number(match[1]);
        return null;
      };

      const pNum = getPassageNum(item);
      const matchesPassage = selectedPassages.length === 0 || 
                            (pNum && selectedPassages.includes(pNum));

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
                                {filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
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
 
                            {/* Pagination & Load More */}
                            <div className="flex flex-col items-center gap-5 pt-10 pb-8">
                                {filteredTests.length > itemsPerPage && (
                                    <div className="flex justify-center items-center gap-1">
                                        {(() => {
                                            const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
                                            let pages = [];
                                            if (totalPages <= 5) {
                                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                            } else {
                                                if (currentPage <= 3) {
                                                    pages = [1, 2, 3, '...', totalPages];
                                                } else if (currentPage >= totalPages - 2) {
                                                    pages = [1, '...', totalPages - 2, totalPages - 1, totalPages];
                                                } else {
                                                    pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                                                }
                                            }
 
                                            return pages.map((p, i) => (
                                                p === '...' ? (
                                                    <span key={`dots-${i}`} className="text-[#86868b] dark:text-zinc-500 px-1 text-[11.5px]">...</span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => {
                                                            setCurrentPage(p);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className={`w-7 h-7 rounded-full text-[11.5px] font-semibold transition-all ${
                                                            currentPage === p 
                                                            ? 'bg-[#1d1d1f] text-white dark:bg-white dark:text-zinc-900' 
                                                            : 'bg-[#f5f5f7] text-[#1d1d1f] dark:bg-zinc-800 dark:text-[#f5f5f7] hover:bg-gray-200 dark:hover:bg-zinc-700'
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
