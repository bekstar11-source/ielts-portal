import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentData } from "../hooks/useStudentData";
import { db } from "../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { 
  Search, BookOpen, Headphones, PenTool, Mic, Play, Crown, 
  ChevronDown, RotateCw, Key, HelpCircle, Clock, ChevronLeft, ChevronRight 
} from 'lucide-react';

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardModals from "../components/dashboard/DashboardModals";
import PricingModal from "../components/dashboard/PricingModal";
import Pagination from "../components/common/Pagination";
import SiteFooter from "../components/common/SiteFooter";

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

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/practice?tab=${tabId}`, { replace: true });
  };
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

  // Scroll Refs
  const standardScrollRef = useRef(null);
  const fullReadingScrollRef = useRef(null);

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

  const handleSubTabClick = (filter) => {
    if (activeSubTab === filter.id) return;
    
    isManualScrollingRef.current = true;
    setActiveSubTab(filter.id);
    
    if (filter.ref && filter.ref.current) {
        const yOffset = -140; // sticky header + filter bar
        const element = filter.ref.current;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        
        window.scrollTo({ 
            top: y, 
            behavior: 'smooth' 
        });
    } else {
        isManualScrollingRef.current = false;
    }
  };

  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'reading') return;

    const handleScrollEvent = () => {
      // We add a 200px offset to detect when the section enters the view below the header
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
        }, 150); // Consider manual scroll finished 150ms after the last scroll event
        return;
      }
      
      setActiveSubTab(prev => prev !== currentSection ? currentSection : prev);
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    // Trigger once initially in case we load directly into a scrolled position
    handleScrollEvent();

    return () => {
      window.removeEventListener('scroll', handleScrollEvent);
    };
  }, [activeTab]);

  // Handle section scroll from URL
  useEffect(() => {
    const sectionFromUrl = queryParams.get('section');
    if (activeTab === 'reading' && sectionFromUrl) {
      // Small delay to ensure refs are attached and layout is stable
      const timer = setTimeout(() => {
        const filter = readingFilters.find(f => f.id === sectionFromUrl);
        if (filter) {
          handleSubTabClick(filter);
          // Clean up the URL after scrolling
          navigate('/practice?tab=reading', { replace: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, location.search]);

  // Scroll tugmalarining disable holati
  const [stdCanLeft, setStdCanLeft] = useState(false);
  const [stdCanRight, setStdCanRight] = useState(true);
  const [frCanLeft, setFrCanLeft] = useState(false);
  const [frCanRight, setFrCanRight] = useState(true);

  const updateScrollState = (el, setCanLeft, setCanRight) => {
      if (!el) return;
      setCanLeft(el.scrollLeft > 1);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  // Scrollers uchun joriy target va animatsiya ID ni saqlaymiz
  const standardScrollTarget = useRef(0);
  const standardScrollRAF = useRef(null);
  const fullReadingScrollTarget = useRef(0);
  const fullReadingScrollRAF = useRef(null);

  const scrollTo = (el, targetRef, rafRef, targetPos) => {
      if (!el) return;
      
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      targetRef.current = Math.max(0, Math.min(targetPos, maxScrollLeft));

      // Agar animatsiya allaqachon ishlayotgan bo'lsa, bekor qilamiz
      if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
      }

      el.style.scrollSnapType = 'none';

      const startPos = el.scrollLeft;
      const change = targetRef.current - startPos;

      if (Math.abs(change) < 1) {
          el.scrollLeft = targetRef.current;
          el.style.scrollSnapType = '';
          return;
      }

      const duration = 600;
      const startTime = performance.now();

      const animateScroll = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

          el.scrollLeft = startPos + change * ease;

          if (progress < 1) {
              rafRef.current = requestAnimationFrame(animateScroll);
          } else {
              el.scrollLeft = targetRef.current;
              el.style.scrollSnapType = '';
              rafRef.current = null;
          }
      };

      rafRef.current = requestAnimationFrame(animateScroll);
  };

  const handleScroll = (ref, rafRef, targetRef, direction) => {
      if (!ref.current) return;
      const firstChild = ref.current.children[0];
      if (!firstChild) return;

      const cardWidth = firstChild.offsetWidth;
      const gap = 24;
      
      // Target joriy `el.scrollLeft` emas, oldingi targetdan hisoblanadi
      // (tez bosilganda akkumulyatsiya to'g'ri ishlaydi)
      const currentTarget = targetRef.current || ref.current.scrollLeft;
      const newTarget = currentTarget + (direction * (cardWidth + gap));

      scrollTo(ref.current, targetRef, rafRef, newTarget);
  };

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

  // Pagination Logic
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const currentTests = filteredTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  // Card Rendering Helpers
  const renderCard = (test) => {
    const isCompleted = !!test.result;
    const isPremium = test.isMock || test.status === 'locked' || (test.type === 'mock_full');
    
    const cardImage = test.thumbnail || (
      test.type === 'reading' ? 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1000' :
      test.type === 'listening' ? 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800' :
      test.type === 'writing' ? 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800' :
      test.type === 'speaking' ? 'https://images.unsplash.com/photo-1506784926709-22f1ec395907?q=80&w=800' :
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800'
    );

    const passageLabel = test.type === 'reading' 
      ? (test.title.match(/Passage\s*(\d+)/i)?.[0] || (test.difficulty === 'easy' ? 'Passage 1' : test.difficulty === 'medium' ? 'Passage 2' : test.difficulty === 'hard' ? 'Passage 3' : 'Reading Passage'))
      : test.type === 'listening'
      ? (test.title.match(/Part\s*(\d+)|Section\s*(\d+)/i)?.[0] || (test.difficulty?.includes('1') ? 'Section 1' : test.difficulty?.includes('2') ? 'Section 2' : test.difficulty?.includes('3') ? 'Section 3' : test.difficulty?.includes('4') ? 'Section 4' : 'Listening Section'))
      : (test.type === 'mock_full' ? 'Full Mock' : 'IELTS Test');

    return (
        <div key={test.id} className={`${!showAllCards ? 'flex flex-col h-full' : ''}`}>
            <div 
                onClick={() => isCompleted ? handleReview(test) : (test.isSet ? setSelectedSet(test) : handleStartTest(test))}
                className="group w-full bg-[#F6F6FA] rounded-[24px] overflow-hidden transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.008] hover:z-10 flex flex-col h-full cursor-pointer"
            >
                <div className="w-full aspect-[16/10] bg-[#f5f5f7] relative overflow-hidden">
                    <img src={cardImage} alt={test.title} className="w-full h-full object-cover transition-transform duration-700" />
                    {isPremium && (
                        <div className="absolute top-5 left-5">
                            <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-black/5">
                                <Crown size={12} className="text-[#bf953f]" />
                                <span className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wide">Premium</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-7 flex flex-col flex-1">
                    <h4 className="text-[11px] font-extrabold text-[#86868b] uppercase tracking-[0.12em] mb-2.5">{test.type}</h4>
                    <h2 className="text-[26px] font-extrabold text-[#1d1d1f] leading-[1.1] tracking-tight mb-5 line-clamp-2">{test.title}</h2>

                    {test.questionTypes && test.questionTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {test.questionTypes.slice(0, 4).map((qType, idx) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold text-[#424245] bg-white/50 border border-black/[0.04] uppercase tracking-wide">
                                    {qType}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto flex items-end justify-between">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-medium text-[#86868b]">{passageLabel}</span>
                            <div className="flex items-center gap-2">
                                {isCompleted ? (
                                    <span className="text-[15px] font-bold text-[#34c759]">Result: {test.result.score}/{test.totalQuestions || 40}</span>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-[#0066cc] ring-4 ring-[#0066cc]/10" />
                                        <span className="text-[15px] font-bold text-[#0066cc]">Available Now</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <button className="bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062cc] text-white text-[15px] font-bold px-7 py-2.5 rounded-full transition-all duration-200">
                            {isCompleted ? 'Review' : 'Start'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderSeeAllCard = (count) => (
    <div className="snap-start min-w-[120px] md:min-w-[180px] flex flex-col h-full">
        <button 
            onClick={() => setShowAllCards(true)}
            className="w-full h-full flex flex-col items-center justify-center bg-[#F6F6FA] rounded-[24px] hover:bg-gray-200/50 transition-all duration-300 group px-8"
        >
            <div className="w-12 h-12 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0071e3] transition-colors">
                <RotateCw size={20} className="text-[#86868b] group-hover:text-white" />
            </div>
            <span className="text-[15px] font-bold text-[#1d1d1f]">See All</span>
            <span className="text-[12px] text-[#86868b] mt-0.5">{count} Tests</span>
        </button>
    </div>
  );

  const renderFullReadingCard = (test, index = 0) => {
    const isCompleted = !!test.result;
    
    // Curated Apple-aesthetic reading images
    const defaultImages = [
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=900',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=900',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=900',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=900',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900',
    ];
    const cardImage = test.thumbnail || defaultImages[index % defaultImages.length];
    const passages = test.title?.split('/').map(s => s.trim()) || [test.title];

    return (
        <div key={test.id} className="flex-shrink-0 w-[260px] md:w-[300px]">
            <div
                onClick={() => isCompleted ? handleReview(test) : (test.isSet ? setSelectedSet(test) : handleStartTest(test))}
                className="relative w-full aspect-[3/5.5] rounded-[24px] overflow-hidden cursor-pointer group hover:scale-[1.005] hover:z-10 transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
            >
                {/* Full-bleed image */}
                <img
                    src={cardImage}
                    alt={test.title}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Top gradient — ensures text over bright images */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />

                {/* Bottom gradient — ensures status & button readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Top text content */}
                <div className="absolute top-0 left-0 right-0 px-6 pt-7">
                    <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                        Full Reading
                    </p>
                    <h2 className="text-white text-[20px] font-bold leading-[1.3] tracking-tight">
                        {passages.length > 1
                            ? passages.map((p, i) => (
                                <span key={i}>
                                    {p}
                                    {i < passages.length - 1 && (
                                        <span className="text-white/35"> · </span>
                                    )}
                                </span>
                              ))
                            : test.title
                        }
                    </h2>

                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-7 flex items-end justify-between">
                    <div className="flex flex-col gap-2">
                        {/* Question type badges */}
                        {test.questionTypes && test.questionTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                                {test.questionTypes.slice(0, 4).map((qType, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold text-white/80 bg-white/10 backdrop-blur-sm border border-white/15 uppercase tracking-wide"
                                    >
                                        {qType}
                                    </span>
                                ))}
                            </div>
                        )}
                        {isCompleted ? (
                            <span className="text-[#34c759] text-[13px] font-bold">
                                Result: {test.result?.score}/{test.totalQuestions || 40}
                            </span>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/80 ring-[3px] ring-white/20" />
                                    <span className="text-white/80 text-[13px] font-semibold">Available Now</span>
                                </div>
                                <span className="text-white/40 text-[11px] font-medium">3 Passages · Full Test</span>
                            </>
                        )}
                    </div>

                    {/* Frosted glass Play button */}
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                        <Play size={14} className="text-white fill-white ml-0.5" />
                    </div>
                </div>
            </div>
        </div>
    );
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
        <div className="max-w-[1440px] mx-auto px-6">
          {/* HERO SECTION */}
          <div className="pt-16 pb-8 animate-in fade-in duration-1000">
             <h1 className="text-[64px] md:text-[80px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
               {activeTab === 'all' ? 'Amaliyot' : categories.find(c => c.id === activeTab)?.label}
             </h1>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="sticky top-[56px] z-40 w-full bg-white/40 backdrop-blur-xl mb-16 py-3">
          <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
             <div className="bg-[#f5f5f7] p-1.5 rounded-full flex items-center overflow-x-auto no-scrollbar">
                <LayoutGroup id="practice-filters">
                {activeTab === 'reading' ? (
                   readingFilters.map((filter) => {
                     const isActive = activeSubTab === filter.id;
                     return (
                       <button 
                         key={filter.id}
                         onClick={() => handleSubTabClick(filter)}
                         className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                       >
                         {isActive && (
                           <motion.div 
                             layoutId="active-sub-pill"
                             className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                             transition={{ type: "spring", stiffness: 400, damping: 30 }}
                           />
                         )}
                         <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                           {filter.label}
                         </span>
                       </button>
                     );
                   })
                ) : (
                   categories.map((cat) => {
                     const isActive = activeTab === cat.id;
                     return (
                       <button 
                         key={cat.id}
                         onClick={() => handleTabClick(cat.id)}
                         className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                       >
                         {isActive && (
                           <motion.div 
                             layoutId="active-pill"
                             className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                             transition={{ type: "spring", stiffness: 400, damping: 30 }}
                           />
                         )}
                         <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                           {cat.label}
                         </span>
                       </button>
                     );
                   })
                )}
                </LayoutGroup>
             </div>

            <div className="relative flex items-center bg-[#f5f5f7] rounded-full px-5 py-2.5 w-full md:w-56 transition-all focus-within:md:w-72 focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0066cc]/20 shadow-sm shadow-black/5">
               <Search size={16} className="text-gray-400 mr-2" />
               <input 
                 type="text" 
                 placeholder="Testlarni qidirish..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-transparent border-none outline-none w-full text-[14px] text-[#1d1d1f] placeholder-gray-400"
               />
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6">
          {/* CONTENT */}
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
                                                    ref={standardScrollRef}
                                                    onScroll={(e) => updateScrollState(e.currentTarget, setStdCanLeft, setStdCanRight)}
                                                    className="grid grid-flow-col auto-cols-[minmax(320px,1fr)] md:auto-cols-[minmax(380px,1fr)] items-stretch gap-6 overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
                                                >
                                                    {standardTests.slice(0, 15).map((test) => renderCard(test))}
                                                    {standardTests.length > 15 && renderSeeAllCard(standardTests.length)}
                                                </div>
                                                
                                                {/* Navigation Buttons */}
                                                <div className="flex items-center justify-end gap-2 -mt-6 mb-8 mr-8 relative z-20">
                                                    <button 
                                                        onClick={() => handleScroll(standardScrollRef, standardScrollRAF, standardScrollTarget, -1)}
                                                        disabled={!stdCanLeft}
                                                        className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${stdCanLeft ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                    >
                                                        <ChevronLeft size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleScroll(standardScrollRef, standardScrollRAF, standardScrollTarget, 1)}
                                                        disabled={!stdCanRight}
                                                        className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${stdCanRight ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                    {standardTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => renderCard(test))}
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
                                                ref={fullReadingScrollRef}
                                                onScroll={(e) => updateScrollState(e.currentTarget, setFrCanLeft, setFrCanRight)}
                                                className="flex gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
                                            >
                                                {fullReadingTests.map((test, i) => renderFullReadingCard(test, i))}
                                            </div>

                                            {/* Navigation Buttons */}
                                            <div className="flex items-center justify-end gap-2 -mt-6 mb-8 mr-8 relative z-20">
                                                <button 
                                                    onClick={() => handleScroll(fullReadingScrollRef, fullReadingScrollRAF, fullReadingScrollTarget, -1)}
                                                    disabled={!frCanLeft}
                                                    className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${frCanLeft ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleScroll(fullReadingScrollRef, fullReadingScrollRAF, fullReadingScrollTarget, 1)}
                                                    disabled={!frCanRight}
                                                    className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${frCanRight ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
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
                                                // SubTestlar reading tipida yoki tip aniqlash mumkin bo'lmagan set
                                                t.subTests?.some(s => s.type === 'reading') ||
                                                t.subTests?.length > 0
                                            )
                                        );
                                        if (readingSets.length === 0) return null;
                                        const accentColors = ['bg-[#0a84ff]', 'bg-[#bf5af2]', 'bg-[#30d158]', 'bg-[#ff9f0a]'];
                                        
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
                                                    {readingSets.slice(0, 2).map((set, i) => {
                                                        const isCompleted = !!set.result;
                                                        const subCount = set.subTests?.length || 3;
                                                        const glowColor = accentColors[i % accentColors.length];
                                                        
                                                        return (
                                                            <div
                                                                key={set.id}
                                                                onClick={() => isCompleted ? handleReview(set) : setSelectedSet(set)}
                                                                className="relative rounded-[32px] overflow-hidden bg-white min-h-[440px] flex flex-col cursor-pointer group hover:scale-[1.015] transition-transform duration-700 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-black/[0.03]"
                                                            >
                                                            {/* Background Gradients */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-[#f5f5f7] to-white opacity-100 transition-opacity duration-700" />
                                                            
                                                            {/* Subtle Corner Glow */}
                                                            <div className={`absolute -top-32 -right-32 w-96 h-96 ${glowColor} rounded-full blur-[100px] opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-700`} />
                                                            
                                                            {/* Content */}
                                                            <div className="relative z-10 flex flex-col justify-end h-full p-10">
                                                                <p className="text-[#86868b] text-[11px] font-semibold uppercase tracking-[0.2em] mb-4">
                                                                    Reading Set &middot; {subCount} passage
                                                                </p>
                                                                
                                                                <h3 className="text-[#1d1d1f] text-[32px] font-semibold leading-[1.15] tracking-tight mb-5 line-clamp-2">
                                                                    {set.title}
                                                                </h3>
                                                                
                                                                {set.questionTypes?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2 mb-5">
                                                                        {set.questionTypes.slice(0, 3).map((qt, idx) => (
                                                                            <span key={idx} className="px-3 py-1.5 rounded-full text-[10px] font-semibold text-[#1d1d1f] bg-black/5 backdrop-blur-md border border-black/5 uppercase tracking-wider">
                                                                                {qt}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Sub-tests List */}
                                                                {set.subTests?.length > 0 && (
                                                                    <div className="flex flex-col gap-2 mb-6">
                                                                        {set.subTests.slice(0, 6).map((sub, sIdx) => (
                                                                            <div key={sIdx} className="flex items-center gap-3 group/item">
                                                                                <span className="text-[11px] font-bold text-[#86868b] min-w-[20px] tabular-nums">
                                                                                    {String(sIdx + 1).padStart(2, '0')}
                                                                                </span>
                                                                                <span className="text-[14px] font-medium text-[#1d1d1f]/80 truncate group-hover/item:text-[#1d1d1f] transition-colors">
                                                                                    {sub.title || 'Passage'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {set.subTests.length > 6 && (
                                                                            <div className="text-[12px] font-medium text-[#86868b] mt-1 pl-[32px]">
                                                                                + yana {set.subTests.length - 6} ta passage
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5">
                                                                    {isCompleted ? (
                                                                        <span className="text-[#30d158] text-[15px] font-medium">
                                                                            Score: {set.result?.score}/{set.totalQuestions || 40}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[#86868b] text-[15px] font-medium">
                                                                            Not started
                                                                        </span>
                                                                    )}
                                                                    
                                                                    <span className={`${isCompleted ? 'text-[#30d158]' : 'text-[#0a84ff]'} text-[15px] font-medium flex items-center gap-1.5 group-hover:gap-2.5 transition-all`}>
                                                                        {isCompleted ? 'Review' : 'Start Set'} <ChevronRight size={16} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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

      {/* Modals & Overlays */}
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
