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
  RotateCw, ChevronLeft, ChevronRight, Search 
} from 'lucide-react';

// COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import Pagination from "../../components/common/Pagination";
import SiteFooter from "../../components/common/SiteFooter";
import LimitReachedSheet from "../../components/dashboard/LimitReachedSheet";
import { useDailyLimit } from "../../hooks/useDailyLimit";
import { useTranslation } from "../../context/LanguageContext";

// REFACTORED COMPONENTS
import PracticeHero from "../../components/practice/PracticeHero";
import PracticeFilters from "../../components/practice/PracticeFilters";
import PracticeCard from "../../components/practice/PracticeCard";
import FullReadingCard from "../../components/practice/FullReadingCard";
import ReadingSetCard from "../../components/practice/ReadingSetCard";
import { usePracticeScroll } from "../../hooks/usePracticeScroll";
import { qTypeMatchesSelected, getPassageNum } from "../../utils/TestUtils";
import { getTier, isStaff, canAccessPremiumContent } from '../../utils/subscription';

// Categories
const categories = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
  { id: 'podcasts', label: 'Podcasts', icon: Headphones },
  { id: 'mock', label: 'Mock', icon: Crown },
];

export default function Practice() {
  const { user, logout, userData } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab');

  // State
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'reading');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tarif obuna MUDDATI bilan hisoblanadi (utils/subscription)
  const tier = getTier(userData);
  const isPro = tier === 'pro' || isStaff(userData);
  const isStandard = tier === 'standard';
  const isPremium = canAccessPremiumContent(userData);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all"); // 'all', 'completed', 'not_completed'
  const [selectedPassages, setSelectedPassages] = useState([]); // [1, 2, 3]
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
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
  const [showLimitSheet, setShowLimitSheet] = useState(false);
  const [limitType, setLimitType] = useState('reading');

  const { checkLimit, incrementUsage } = useDailyLimit(userData);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Custom Hooks for scrolling
  const fullReadingScroll = usePracticeScroll();

  // Section Refs for internal scrolling
  const passagesSectionRef = useRef(null);
  const fullTestSectionRef = useRef(null);
  const setSectionRef = useRef(null);
  const isManualScrollingRef = useRef(false);

  // Sub filters for reading
  const readingFilters = [
    { id: 'passages', label: t('practice.readingPassages'), ref: passagesSectionRef },
    { id: 'full_test', label: t('practice.fullReading'), ref: fullTestSectionRef },
    { id: 'set', label: t('practice.sets'), ref: setSectionRef }
  ];
  const [activeSubTab, setActiveSubTab] = useState('passages');

  useEffect(() => {
    if (activeTab === 'reading') {
      navigate('/reading', { replace: true });
    } else if (activeTab === 'listening') {
      navigate('/listening/parts', { replace: true });
    }
  }, [activeTab]);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabClick = (tabId) => {
    if (tabId === 'reading') {
      navigate('/reading');
      return;
    }
    if (tabId === 'listening') {
      navigate('/listening/parts');
      return;
    }
    if (tabId === 'podcasts') {
      navigate('/podcasts');
      return;
    }
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

    let ticking = false;

    const handleScrollEvent = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (isManualScrollingRef.current) {
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                isManualScrollingRef.current = false;
            }, 150);
            ticking = false;
            return;
          }

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
          
          setActiveSubTab(prev => prev !== currentSection ? currentSection : prev);
          ticking = false;
        });
        ticking = true;
      }
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
          navigate('/reading', { replace: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, location.search]);

  // Reset currentPage when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedQuestionTypes([]);
    setSelectedStatus("all");
    setSelectedPassages([]);
  }, [activeTab]);

  // Get all unique question types for the current category
  const allQuestionTypes = useMemo(() => {
    const types = new Set();
    rawAssignments.forEach(item => {
      // Normal testlar uchun
      if (item.type === activeTab && item.questionTypes) {
        item.questionTypes.forEach(t => types.add(t));
      }
      // To'plam (Set) ichidagi testlar uchun
      if (item.isSet && item.subTests) {
          item.subTests.forEach(sub => {
              if (sub.type === activeTab && sub.questionTypes) {
                  sub.questionTypes.forEach(t => types.add(t));
              }
          });
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [rawAssignments, activeTab]);

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

      const matchesSearch = !q || item.title?.toLowerCase().includes(q);
      const isDone = !!item.result;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && isDone) || 
                           (selectedStatus === 'not_completed' && !isDone);
      


      const pNum = getPassageNum(item);
      const matchesPassage = selectedPassages.length === 0 || 
                            (pNum && selectedPassages.includes(pNum));

      if (item.isSet) {
        const titleMatch = item.title?.toLowerCase().includes(q);
        
        const matchingSubTests = item.subTests?.filter((s, idx) => {
            const mSearch = s.title?.toLowerCase().includes(q);
            const mType = selectedQuestionTypes.length === 0 || 
                         (s.questionTypes && s.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
            
            const subIsDone = !!s.result;
            const mStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && subIsDone) || 
                           (selectedStatus === 'not_completed' && !subIsDone);
            
            const spNum = getPassageNum(s, null, idx);
            const mPassage = selectedPassages.length === 0 || (spNum && selectedPassages.includes(spNum));

            return mSearch && mType && mStatus && mPassage;
        }) || [];

        if (!q && selectedQuestionTypes.length === 0 && selectedStatus === 'all' && selectedPassages.length === 0) {
            result.push(item);
        } else if (titleMatch && selectedQuestionTypes.length === 0 && selectedStatus === 'all' && selectedPassages.length === 0) {
            result.push({ ...item, _forceExpand: true });
        } else if (matchingSubTests.length > 0) {
            matchingSubTests.forEach(sub => result.push({ ...sub, _fromSet: item.title }));
        }
        return;
      }

      const matchesType = selectedQuestionTypes.length === 0 || 
                         (item.questionTypes && item.questionTypes.some(t => qTypeMatchesSelected(t, selectedQuestionTypes)));
      
      if (matchesSearch && matchesType && matchesStatus && matchesPassage) {
        result.push(item);
      }
    });
    return result;
  }, [rawAssignments, searchQuery, activeTab, selectedQuestionTypes, selectedStatus, selectedPassages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Handlers
  const handleManualRefresh = async () => {
    if (!user) return;
    await refresh();
  };

  const handleStartTest = (test) => { 
    // Check limit for free users
    const type = test.type?.toLowerCase() || '';
    const isReading = type.includes('reading') || test.title?.toLowerCase().includes('reading');
    const isListening = type.includes('listening') || test.title?.toLowerCase().includes('listening');
    
    const limitTarget = isReading ? 'reading' : isListening ? 'listening' : null;
    
    if (limitTarget && !checkLimit(limitTarget, test)) {
      setLimitType(limitTarget);
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

    // Increment usage stats
    const type = test.type?.toLowerCase() || '';
    const isReading = type.includes('reading') || test.title?.toLowerCase().includes('reading');
    const isListening = type.includes('listening') || test.title?.toLowerCase().includes('listening');
    const limitTarget = isReading ? 'reading' : isListening ? 'listening' : null;
    
    if (limitTarget) {
      // Don't block navigation on stats update
      incrementUsage(limitTarget).catch(err => console.error("Stats update failed:", err));
    }

    if (test.type === 'mock_full') { 
        navigate('/mock-exam', { state: { mockData: test } }); 
        return; 
    }

    const targetId = test.id || test.testId || test.targetId;
    if (targetId) {
        navigate(`/test/${targetId}`);
    } else {
        alert(t('practice.testIdNotFound'));
    }
  };

  const handleReview = (test) => {
    const resultId = test.result?.id;
    if (!resultId) {
      alert(t('practice.resultNotFound'));
      return;
    }
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
            alert(t('practice.testAdded'));
            await refresh();
            setShowKeyModal(false); 
            setAccessKeyInput("");
        } else {
            throw new Error(t('mock.unexpectedError'));
        }
    } catch (error) { 
        setKeyError(error.message || t('mock.invalidKey')); 
    } finally { 
        setCheckingKey(false); 
    }
  };

  return (
    <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans text-warm-ink dark:text-warm-on-dark pb-section selection:bg-warm-primary/30 selection:text-warm-ink">
      
      <DashboardHeader
        user={user} userData={userData}
        activeTab={activeTab}
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <main className="w-full">
        <PracticeHero 
          activeTab={activeTab} 
          categories={categories} 
          totalCount={rawAssignments.length}
          filteredCount={filteredTests.length}
        />

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
          allQuestionTypes={allQuestionTypes}
          selectedQuestionTypes={selectedQuestionTypes}
          setSelectedQuestionTypes={setSelectedQuestionTypes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedPassages={selectedPassages}
          setSelectedPassages={setSelectedPassages}
          showQuestionFilters={showQuestionFilters}
          setShowQuestionFilters={setShowQuestionFilters}
        />

        <div className="max-w-[1440px] mx-auto px-6">
        {loading ? (
            <div className="flex justify-center py-40">
                <div className="w-8 h-8 border-2 border-warm-hairline dark:border-white/10 border-t-warm-primary rounded-full animate-spin" />
            </div>
        ) : errorMsg ? (
            <div className="text-center py-20 text-red-500">{errorMsg}</div>
        ) : (
            <>
              {filteredTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <div className="w-16 h-16 bg-warm-surface dark:bg-warm-dark-elevated rounded-full flex items-center justify-center mb-6">
                      <Search size={24} className="text-warm-muted-soft dark:text-warm-muted" />
                   </div>
                   <h3 className="text-[24px] font-semibold text-warm-ink dark:text-warm-on-dark">{t('practice.notFound')}</h3>
                   <p className="text-warm-muted dark:text-warm-on-dark-soft mt-2 max-w-[300px]">{t('practice.notFoundDesc')}</p>
                </div>
              ) : (
                  <motion.div 
                    key={`${activeTab}`}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-xl pb-20"
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
                                    <div className="space-y-4" ref={passagesSectionRef}>
                                        {isReading && (
                                            <div className="space-y-1">
                                                <h2 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold text-warm-ink dark:text-warm-on-dark tracking-tight">{t('practice.readingPassages')}</h2>
                                                <p className="text-warm-muted dark:text-warm-on-dark-soft text-[14px]">{t('practice.displayingTests').replace('{count}', filteredTests.length).replace('{total}', rawAssignments.length)}</p>
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-md pt-4">
                                            {standardTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => (
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

                                        {/* Pagination */}
                                        {standardTests.length > itemsPerPage && (
                                            <div className="flex justify-center items-center gap-1.5 pt-xl pb-8">
                                                {(() => {
                                                    const totalPages = Math.ceil(standardTests.length / itemsPerPage);
                                                    const pages = [];
                                                    const delta = 1; // Number of pages to show around current page
                                                    
                                                    for (let i = 1; i <= totalPages; i++) {
                                                        if (
                                                            i === 1 || 
                                                            i === totalPages || 
                                                            (i >= currentPage - delta && i <= currentPage + delta)
                                                        ) {
                                                            pages.push(i);
                                                        } else if (
                                                            i === currentPage - delta - 1 || 
                                                            i === currentPage + delta + 1
                                                        ) {
                                                            pages.push('...');
                                                        }
                                                    }
                                                    
                                                    // Filter out consecutive ellipses
                                                    const uniquePages = pages.filter((p, i) => p !== '...' || pages[i-1] !== '...');

                                                    return uniquePages.map((p, i) => (
                                                        p === '...' ? (
                                                            <span key={`dots-${i}`} className="text-warm-muted-soft dark:text-warm-muted px-1 text-[13px]">...</span>
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
                                                                    ? 'bg-warm-primary text-white'
                                                                    : 'bg-warm-surface dark:bg-warm-dark-elevated text-warm-ink dark:text-warm-on-dark hover:bg-warm-card dark:hover:bg-white/10'
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
                                            <h2 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold text-warm-ink dark:text-warm-on-dark tracking-tight">{t('practice.fullReading')}</h2>
                                            <div 
                                                ref={fullReadingScroll.scrollRef}
                                                onScroll={(e) => fullReadingScroll.updateScrollState(e.currentTarget)}
                                                className="flex gap-md overflow-x-auto pt-4 pb-12 hide-scrollbar -mx-6 px-6"
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
                                                    isPro={isPro}
                                                    isStandard={isStandard}
                                                  />
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-end gap-2 -mt-6 mb-8 mr-8 relative z-20">
                                                <button 
                                                    onClick={() => fullReadingScroll.handleScroll(-1)}
                                                    disabled={!fullReadingScroll.canLeft}
                                                    className={`w-10 h-10 rounded-full bg-warm-canvas/80 dark:bg-warm-dark-elevated/80 backdrop-blur-md flex items-center justify-center text-warm-ink dark:text-warm-on-dark active:scale-95 transition-all shadow-lg border border-warm-hairline dark:border-white/10 ${fullReadingScroll.canLeft ? 'hover:bg-warm-canvas dark:hover:bg-warm-dark-elevated cursor-pointer' : 'opacity-30 cursor-default'}`}
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => fullReadingScroll.handleScroll(1)}
                                                    disabled={!fullReadingScroll.canRight}
                                                    className={`w-10 h-10 rounded-full bg-warm-canvas/80 dark:bg-warm-dark-elevated/80 backdrop-blur-md flex items-center justify-center text-warm-ink dark:text-warm-on-dark active:scale-95 transition-all shadow-lg border border-warm-hairline dark:border-white/10 ${fullReadingScroll.canRight ? 'hover:bg-warm-canvas dark:hover:bg-warm-dark-elevated cursor-pointer' : 'opacity-30 cursor-default'}`}
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
                                                <h2 className="font-serif-display text-warm-display-sm md:text-warm-display-md font-semibold text-warm-ink dark:text-warm-on-dark tracking-tight">{t('practice.sets')}</h2>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-6">
                                                    {readingSets.slice(0, 3).map((set, i) => (
                                                      <ReadingSetCard 
                                                        key={set.id}
                                                        set={set}
                                                        index={i}
                                                        isCompleted={!!set.result}
                                                        onReview={handleReview}
                                                        onSelectSet={setSelectedSet}
                                                        isPro={isPro}
                                                        isStandard={isStandard}
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
      <SiteFooter />
    </div>
  );
}
