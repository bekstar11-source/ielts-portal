import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { db, functions } from "../../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
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
  const [activePartFilter, setActivePartFilter] = useState('all');
  
  const { assignments, userResults = [], loading, error: errorMsg, refresh } = useStudentData(user);
  
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

  const partsSectionRef = useRef(null);
  const fullTestSectionRef = useRef(null);
  const collectionsSectionRef = useRef(null);
  const isManualScrollingRef = useRef(false);

  const listeningFilters = [
    { id: 'parts', label: 'Listening Parts', ref: partsSectionRef },
    { id: 'full_test', label: 'Full Tests', ref: fullTestSectionRef },
    { id: 'collections', label: 'Collections', ref: collectionsSectionRef }
  ];
  const [activeSubTab, setActiveSubTab] = useState('parts');

  // Collections state
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [collectionTests, setCollectionTests] = useState([]);
  const [loadingCollectionTests, setLoadingCollectionTests] = useState(false);
  const [collectionCounts, setCollectionCounts] = useState({});

  const fetchCollectionCounts = async (cols) => {
    const counts = {};
    for (const col of cols) {
      try {
        // Query tests directly (which is the source of truth) filtering by type and collectionId
        const countSnap = await getCountFromServer(
          query(
            collection(db, "tests"), 
            where("collectionId", "==", col.id),
            where("type", "==", "listening")
          )
        );
        counts[col.id] = countSnap.data().count;
      } catch (e) {
        try {
          const countSnap = await getCountFromServer(
            query(
              collection(db, "tests_metadata"), 
              where("collectionId", "==", col.id),
              where("type", "==", "listening")
            )
          );
          counts[col.id] = countSnap.data().count;
        } catch (e2) {
          counts[col.id] = 0;
        }
      }
    }
    setCollectionCounts(counts);
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const { orderBy } = await import("firebase/firestore");
      const snapCols = await getDocs(query(collection(db, "test_collections"), orderBy("createdAt", "asc")));
      const fetchedCols = snapCols.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.type?.toLowerCase() !== 'reading');
      setCollections(fetchedCols);
      fetchCollectionCounts(fetchedCols);
    } catch (e) {
      try {
        const snapCols = await getDocs(collection(db, "test_collections"));
        const fetchedCols = snapCols.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.type?.toLowerCase() !== 'reading');
        setCollections(fetchedCols);
        fetchCollectionCounts(fetchedCols);
      } catch (e2) {
        console.error("Failed to load collections:", e2);
      }
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchCollectionTests = async (colId) => {
    setLoadingCollectionTests(true);
    try {
      // 1. Fetch from tests_metadata
      const qMeta = query(
        collection(db, 'tests_metadata'),
        where('collectionId', '==', colId)
      );
      const snapMeta = await getDocs(qMeta);
      const metaDocs = snapMeta.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.type === 'listening');

      // 2. Fetch from tests
      const qTests = query(
        collection(db, 'tests'),
        where('collectionId', '==', colId)
      );
      const snapTests = await getDocs(qTests);
      const testDocs = snapTests.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.type === 'listening');

      // 3. Merge by ID to guarantee we capture all tests in the collection
      const mergedMap = new Map();
      testDocs.forEach(t => mergedMap.set(t.id, t));
      metaDocs.forEach(t => {
        if (mergedMap.has(t.id)) {
          mergedMap.set(t.id, { ...mergedMap.get(t.id), ...t });
        } else {
          mergedMap.set(t.id, t);
        }
      });

      const docs = Array.from(mergedMap.values());
      setCollectionTests(docs);
    } catch (e) {
      console.error("Error fetching collection tests:", e);
    } finally {
      setLoadingCollectionTests(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const collectionProcessedTests = useMemo(() => {
    const partTestsList = [];
    const fullTestsList = [];

    collectionTests.forEach(test => {
      const fullAttempt = userResults?.find(
        r => String(r.testId).trim() === String(test.id).trim() && !r.partNumber
      );

      fullTestsList.push({
        ...test,
        title: test.title?.toLowerCase().includes('full') ? test.title : `${test.title} (Full Mock)`,
        isFullTest: true,
        result: fullAttempt || null
      });

      if (test.parts && Object.keys(test.parts).length > 0) {
        Object.entries(test.parts).forEach(([key, partData]) => {
          const partNum = parseInt(key.replace('part', ''));
          if (isNaN(partNum)) return;

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
            questionTypes: partData.qTypes || [],
            isVirtualPart: true,
            result: partAttempt || null
          });
        });
      } else {
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
            questionTypes: [],
            isVirtualPart: true,
            result: partAttempt || null
          });
        }
      }
    });

    return { partTestsList, fullTestsList };
  }, [collectionTests, userResults]);

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
        { id: 'full_test', ref: fullTestSectionRef },
        { id: 'collections', ref: collectionsSectionRef }
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
            questionTypes: partData.qTypes || [],
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
            questionTypes: [],
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
                         (part.questionTypes && part.questionTypes.some(t => selectedQuestionTypes.includes(t)));
      
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
                         (full.questionTypes && full.questionTypes.some(t => selectedQuestionTypes.includes(t)));

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
        <div className="w-full max-w-[800px] h-full flex items-center justify-center gap-1.5 px-4 relative z-10">
            {/* Smooth glowing background light */}
            <div className="absolute w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[60px]" />
            <div className="absolute w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-[80px]" />
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
          totalCount={loading ? 0 : (totalLibraryCount * 4 || processedTests.partTestsList.length)}
          filteredCount={filteredVirtualParts.length + filteredFullTests.length}
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
                {filteredVirtualParts.length === 0 && filteredFullTests.length === 0 ? (
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
                            return (
                                <>
                                    {/* Parts Section */}
                                    <div className="space-y-6" ref={partsSectionRef}>
                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-100 pb-4">
                                            <div className="space-y-1">
                                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Listening Parts</h2>
                                                <p className="text-[#86868b] text-[14px]">Displaying {filteredVirtualParts.length} part practice tests</p>
                                            </div>

                                            {/* Beautiful Segmented Tab Filter */}
                                            <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-xl border border-black/5 self-start md:self-auto shadow-sm">
                                                {[
                                                    { id: 'all', label: 'All Parts' },
                                                    { id: '1', label: 'Part 1' },
                                                    { id: '2', label: 'Part 2' },
                                                    { id: '3', label: 'Part 3' },
                                                    { id: '4', label: 'Part 4' },
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => {
                                                            setActivePartFilter(tab.id);
                                                            setCurrentPage(1);
                                                        }}
                                                        className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all relative ${
                                                            activePartFilter === tab.id
                                                                ? 'bg-white text-black shadow-sm border border-black/5'
                                                                : 'text-black/50 hover:text-black hover:bg-black/5'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {filteredVirtualParts.length === 0 ? (
                                            <div className="text-center py-20 text-gray-400 text-sm">
                                                Ushbu bo'limga mos part practice testlari topilmadi.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-4">
                                                {filteredVirtualParts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
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
                                        )}

                                        {/* Pagination for Parts */}
                                        {filteredVirtualParts.length > itemsPerPage && (
                                            <div className="flex justify-center items-center gap-1.5 pt-10 pb-8">
                                                {(() => {
                                                    const totalPages = Math.ceil(filteredVirtualParts.length / itemsPerPage);
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
                                    {filteredFullTests.length > 0 && (
                                        <div className="space-y-4 pt-10 border-t border-zinc-100" ref={fullTestSectionRef}>
                                            <div className="space-y-1">
                                                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Full Tests</h2>
                                                <p className="text-[#86868b] text-[14px]">Displaying {filteredFullTests.length} full length mock tests</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-4">
                                                {filteredFullTests.map((test) => (
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

                                    {/* Collections Section */}
                                    <div className="space-y-6 pt-12 border-t border-zinc-100" ref={collectionsSectionRef}>
                                        <div className="space-y-1">
                                            <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Collections</h2>
                                            <p className="text-[#86868b] text-[14px]">
                                                {selectedCollectionId 
                                                    ? "Kolleksiya tarkibidagi listening testlari" 
                                                    : "Admin tomonidan jamlangan maxsus test to'plamlari"}
                                            </p>
                                        </div>

                                        {selectedCollectionId ? (
                                            /* Active Collection View */
                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                {/* Back button and Collection Info */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-100 gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedCollectionId(null);
                                                                setCollectionTests([]);
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors shadow-sm text-zinc-700 active:scale-95"
                                                        >
                                                            <ChevronLeft size={16} />
                                                            Kolleksiyalarga Qaytish
                                                        </button>
                                                        <div className="h-6 w-px bg-zinc-200 hidden sm:block" />
                                                        <h3 className="text-lg font-bold text-zinc-900">
                                                            {collections.find(c => c.id === selectedCollectionId)?.name}
                                                        </h3>
                                                    </div>
                                                    <span className="text-xs font-bold text-[#0066cc] bg-[#0066cc]/5 border border-[#0066cc]/10 px-3 py-1.5 rounded-full self-start sm:self-auto">
                                                        {collectionTests.length} ta test
                                                    </span>
                                                </div>

                                                {loadingCollectionTests ? (
                                                    <div className="flex justify-center py-20">
                                                        <Loader2 className="w-8 h-8 text-[#0066cc] animate-spin" />
                                                    </div>
                                                ) : collectionTests.length === 0 ? (
                                                    <div className="text-center py-20 text-zinc-400 text-sm bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                                                        Ushbu kolleksiyada hozircha listening testlari mavjud emas.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-10">
                                                        {/* Parts in Collection */}
                                                        {collectionProcessedTests.partTestsList.length > 0 && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-xl font-bold text-zinc-800 tracking-tight flex items-center gap-2">
                                                                    <Headphones size={20} className="text-[#0066cc]" />
                                                                    Listening Parts ({collectionProcessedTests.partTestsList.length})
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                                                    {collectionProcessedTests.partTestsList.map(test => (
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

                                                        {/* Full Tests in Collection */}
                                                        {collectionProcessedTests.fullTestsList.length > 0 && (
                                                            <div className="space-y-4 pt-8 border-t border-zinc-100">
                                                                <h4 className="text-xl font-bold text-zinc-800 tracking-tight flex items-center gap-2">
                                                                    <BookOpen size={20} className="text-[#0066cc]" />
                                                                    Full Mock Tests ({collectionProcessedTests.fullTestsList.length})
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                                                    {collectionProcessedTests.fullTestsList.map(test => (
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
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Collections Grid View */
                                            loadingCollections ? (
                                                <div className="flex justify-center py-20">
                                                    <Loader2 className="w-8 h-8 text-[#0066cc] animate-spin" />
                                                </div>
                                            ) : collections.length === 0 ? (
                                                <div className="text-center py-20 text-zinc-400 text-sm bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                                                    Hozircha hech qanday kolleksiya yaratilmagan.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                                                    {collections.map(col => {
                                                        const testCount = collectionCounts[col.id] || 0;
                                                        return (
                                                            <div 
                                                                key={col.id}
                                                                onClick={() => {
                                                                    setSelectedCollectionId(col.id);
                                                                    fetchCollectionTests(col.id);
                                                                }}
                                                                className="group relative bg-white border border-zinc-100 rounded-3xl p-6 hover:border-[#0066cc]/30 hover:shadow-2xl hover:shadow-[#0066cc]/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden h-[200px]"
                                                            >
                                                                {/* Background glow overlay */}
                                                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#0066cc]/5 rounded-full blur-2xl group-hover:bg-[#0066cc]/10 transition-colors duration-300" />
                                                                
                                                                <div className="space-y-4">
                                                                    {/* Thumbnail or Folder Icon */}
                                                                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                                        {col.thumbnail ? (
                                                                            <img src={col.thumbnail} className="w-full h-full object-cover" alt="" />
                                                                        ) : (
                                                                            <BookOpen className="w-6 h-6 text-zinc-400 group-hover:text-[#0066cc] transition-colors" />
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Collection Title */}
                                                                    <h3 className="font-bold text-zinc-800 text-base line-clamp-2 leading-snug group-hover:text-[#0066cc] transition-colors">
                                                                        {col.name}
                                                                    </h3>
                                                                </div>

                                                                {/* Bottom Info Row */}
                                                                <div className="flex items-center justify-between pt-4 border-t border-zinc-100/50">
                                                                    <span className="text-xs font-semibold text-zinc-400">
                                                                        {testCount} ta test
                                                                    </span>
                                                                    <span className="text-xs font-bold text-[#0066cc] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                                        Ochish <ChevronRight size={14} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )
                                        )}
                                    </div>
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
