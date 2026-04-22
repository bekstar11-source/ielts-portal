import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudentData } from "../hooks/useStudentData";
import { db } from "../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { 
  Search, BookOpen, Headphones, PenTool, Mic, Play, Crown, 
  ChevronDown, RotateCw, Key, HelpCircle, Clock 
} from 'lucide-react';

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardModals from "../components/dashboard/DashboardModals";
import PricingModal from "../components/dashboard/PricingModal";
import Pagination from "../components/common/Pagination";

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

  // State
  const [activeTab, setActiveTab] = useState('reading');
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
        <div key={test.id} className={`${!showAllCards ? 'snap-start flex flex-col h-full' : ''}`}>
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
        <div key={test.id} className="snap-start flex-shrink-0 w-[260px] md:w-[300px]">
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
        activeTab="practice"
        onLogoutClick={() => setShowLogoutConfirm(true)}
        loading={loading}
      />

      <main className="max-w-[1440px] mx-auto px-6">
        
        {/* HERO SECTION */}
        <div className="pt-24 pb-8 animate-in fade-in duration-1000">
           <h1 className="text-[64px] md:text-[80px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
             {activeTab === 'all' ? 'Amaliyot' : categories.find(c => c.id === activeTab)?.label}
           </h1>
        </div>

        {/* FILTER BAR */}
        <div className="sticky top-12 z-40 bg-white/40 backdrop-blur-xl -mx-6 px-6 mb-16">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between py-2 gap-4">
             <div className="bg-[#f5f5f7] p-1.5 rounded-full flex items-center overflow-x-auto no-scrollbar">
                {categories.map((cat) => {
                   const isActive = activeTab === cat.id;
                   return (
                     <button 
                       key={cat.id}
                       onClick={() => setActiveTab(cat.id)}
                       className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                     >
                       {isActive && (
                         <motion.div 
                           layoutId="active-pill"
                           className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                           transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                         />
                       )}
                       <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                         {cat.label}
                       </span>
                     </button>
                   );
                })}
             </div>

            <div className="relative flex items-center bg-[#f5f5f7] rounded-full px-5 py-2.5 w-full md:w-56 transition-all focus-within:md:w-72 focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0066cc]/20 shadow-sm shadow-black/5">
               <Search size={16} className="text-gray-400 mr-2" />
               <input 
                 type="text" 
                 placeholder="Search products" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-transparent border-none outline-none w-full text-[14px] text-[#1d1d1f] placeholder-gray-400"
               />
            </div>
          </div>
        </div>

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
                    className="space-y-24 pb-20"
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
                                    <div className="space-y-4">
                                        {isReading && (
                                            <h2 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight">Reading Passages</h2>
                                        )}
                                        
                                        {!showAllCards ? (
                                            <div className="grid grid-flow-col auto-cols-[minmax(320px,1fr)] md:auto-cols-[minmax(380px,1fr)] items-stretch gap-6 overflow-x-auto pt-4 pb-12 hide-scrollbar snap-x -mx-6 px-6">
                                                {standardTests.slice(0, 7).map((test) => renderCard(test))}
                                                {standardTests.length > 7 && renderSeeAllCard(standardTests.length)}
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

                                    {/* Full Reading Section - Hidden when viewing all standard cards */}
                                    {isReading && !showAllCards && fullReadingTests.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 60 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "-100px" }}
                                            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                                            className="space-y-4"
                                        >
                                            <h2 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight">Full Reading</h2>
                                            <div className="flex gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar snap-x -mx-6 px-6">
                                                {fullReadingTests.map((test, i) => renderFullReadingCard(test, i))}
                                            </div>
                                        </motion.div>
                                    )}
                                </>
                            );
                        })()}
                  </motion.div>
              )}
            </AnimatePresence>
        )}
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
    </div>
  );
}
