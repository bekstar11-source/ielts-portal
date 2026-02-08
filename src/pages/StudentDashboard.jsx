// src/pages/StudentDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; 
import { Rocket, Key, UserCircle, BookOpen, ArrowRight } from "lucide-react"; 

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsCards from "../components/dashboard/StatsCards";
import FiltersBar from "../components/dashboard/FiltersBar";
import TestGrid from "../components/dashboard/TestGrid";
import DashboardModals from "../components/dashboard/DashboardModals";
import SettingsTab from "../components/dashboard/SettingsTab";
import MyResults from "../pages/MyResults";

// --- LOGIC HELPERS ---
const safeDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
};

// Yordamchi: ID lar bo'yicha hujjatlarni olib kelish (Xatolikdan himoyalangan)
const fetchDocumentsByIds = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return {};
    const uniqueIds = [...new Set(ids)];
    const docsMap = {};
    
    // Har bir ID ni alohida try-catch bilan o'raymiz
    const promises = uniqueIds.map(async (id) => {
        try {
            const cleanId = String(id).trim(); // Bo'sh joylarni tozalash
            if (!cleanId) return null;
            const snap = await getDoc(doc(db, collectionName, cleanId));
            if (snap.exists()) return { id: snap.id, ...snap.data() };
        } catch (e) {
            console.warn(`Hujjat topilmadi: ${id}`, e);
        }
        return null;
    });

    const results = await Promise.all(promises);
    results.forEach(doc => {
        if (doc) docsMap[doc.id] = doc;
    });
    return docsMap;
};

const WelcomeState = ({ onKeyClick, userFullName }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-12 px-4"
        >
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <Rocket className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                Salom, {userFullName?.split(' ')[0] || "O'quvchi"}! 👋
            </h2>
            <p className="text-gray-500 text-center max-w-md mb-10 text-lg">
                IELTS sayohatingiz shu yerdan boshlanadi. Hozircha sizda faol testlar yo'q, lekin buni o'zgartirish oson!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
                <div 
                    onClick={onKeyClick}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group text-center"
                >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 mx-auto group-hover:scale-110 transition-transform">
                        <Key size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Kod kiriting</h3>
                    <p className="text-sm text-gray-500">O'qituvchingizdan olgan Access Keyni faollashtiring.</p>
                    <span className="text-blue-600 text-sm font-bold mt-4 inline-flex items-center gap-1">Kiritish <ArrowRight size={14}/></span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 mx-auto">
                        <UserCircle size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Profilni to'ldiring</h3>
                    <p className="text-sm text-gray-500">Ism va rasmingizni sozlamalar bo'limida yangilang.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4 mx-auto">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Natijalarni kuzating</h3>
                    <p className="text-sm text-gray-500">Test ishlaganingizdan so'ng tahlillar shu yerda chiqadi.</p>
                </div>
            </div>
            <button 
                onClick={onKeyClick}
                className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-gray-800 hover:scale-105 transition-all flex items-center gap-2"
            >
                <Key size={20} />
                Testni Faollashtirish
            </button>
        </motion.div>
    );
};

export default function StudentDashboard() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [rawAssignments, setRawAssignments] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [testToStart, setTestToStart] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyError, setKeyError] = useState("");

  useEffect(() => {
    // Agar foydalanuvchi ADMIN bo'lsa, uni o'z joyiga haydaymiz
    if (userData?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [userData, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        console.log("Firebase'dan yuklash boshlandi...");
        const [userSnap, groupsSnap, resultsSnap] = await Promise.all([
            getDoc(doc(db, 'users', user.uid)),
            getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
            getDocs(query(collection(db, 'results'), where('userId', '==', user.uid)))
        ]);

        const myResults = resultsSnap.docs.map(d => d.data());

        // 🔥 MA'LUMOTLARNI TOZALASH (NORMALIZATION)
        let allAssignments = [];
        const currentUserData = userSnap.data();
        
        // Helper: String yoki Object bo'lishidan qat'iy nazar to'g'irlash
        const normalizeAssignment = (assign) => {
            if (!assign) return null;
            if (typeof assign === 'string') {
                return { id: assign.trim(), type: 'test' };
            }
            if (typeof assign === 'object' && assign.id) {
                return { ...assign, id: String(assign.id).trim() };
            }
            return null;
        };

        if (currentUserData?.assignedTests) {
            allAssignments = [...allAssignments, ...currentUserData.assignedTests.map(normalizeAssignment)];
        }
        
        groupsSnap.docs.forEach(gDoc => {
            const gData = gDoc.data();
            if (gData.assignedTests) {
                allAssignments = [...allAssignments, ...gData.assignedTests.map(normalizeAssignment)];
            }
        });

        // Null qiymatlarni olib tashlash
        allAssignments = allAssignments.filter(Boolean);
        console.log("Jami tayinlovlar (tozalangan):", allAssignments);

        const testIdsToFetch = [];
        const setIdsToFetch = [];

        allAssignments.forEach(assign => {
            if (assign.type === 'set') { setIdsToFetch.push(assign.id); } 
            else if (assign.id && !assign.id.startsWith('MOCK_')) { testIdsToFetch.push(assign.id); }
        });

        const setsMap = await fetchDocumentsByIds('testSets', setIdsToFetch);
        Object.values(setsMap).forEach(set => { 
            if (set.testIds) {
                set.testIds.forEach(tid => testIdsToFetch.push(String(tid).trim()));
            } 
        });
        
        const testsMap = await fetchDocumentsByIds('tests', testIdsToFetch);
        console.log("Bazadan topilgan testlar:", Object.keys(testsMap));

        let processedList = [];

        allAssignments.forEach((assign) => {
            if (!assign || !assign.id) return;

            const findBestResult = (testId) => {
                const attempts = myResults.filter(r => String(r.testId).trim() === String(testId).trim());
                if (attempts.length === 0) return null;
                return attempts.sort((a, b) => parseFloat(b.bandScore || b.score || 0) - parseFloat(a.bandScore || a.score || 0))[0];
            };

            if (assign.type === 'mock_full' || assign.mockKey || String(assign.id).startsWith('MOCK_')) {
                const mockAttempts = myResults.filter(r => r.mockKey === assign.mockKey);
                const bestMockResult = mockAttempts.length > 0 
                    ? mockAttempts.sort((a, b) => parseFloat(b.bandScore || 0) - parseFloat(a.bandScore || 0))[0] 
                    : null;
                processedList.push({ 
                    ...assign, 
                    title: assign.title || "Full Mock Exam", 
                    isMock: true, 
                    status: bestMockResult ? 'completed' : 'open', 
                    result: bestMockResult 
                });
            } 
            else if (assign.type === 'set') {
                const set = setsMap[assign.id];
                if (set) {
                    const subTests = (set.testIds || []).map(testId => {
                        const cleanId = String(testId).trim();
                        const testDetail = testsMap[cleanId];
                        if (testDetail) {
                             const bestResult = findBestResult(cleanId);
                             return { ...testDetail, status: bestResult ? 'completed' : 'open', result: bestResult };
                        }
                        return null;
                    }).filter(Boolean);

                    const completedCount = subTests.filter(t => t.status === 'completed').length;
                    processedList.push({
                        ...assign, isSet: true, title: set.name || assign.title || "Test Set", subTests,
                        totalTests: subTests.length, completedTests: completedCount,
                        status: completedCount === subTests.length && subTests.length > 0 ? 'completed' : 'open'
                    });
                }
            } 
            else {
                const testDataFromDb = testsMap[assign.id];
                // Agar test bazada bo'lsa yoki assignmentda title bo'lsa (qo'lda qo'shilgan)
                if (testDataFromDb || assign.title) {
                    const finalTestData = {
                        ...testDataFromDb,
                        ...assign,
                        id: assign.id, // ID aniq bo'lishi kerak
                        title: testDataFromDb?.title || assign.title || "IELTS Test",
                        type: testDataFromDb?.type || assign.type || "unknown"
                    };

                    const bestResult = findBestResult(assign.id);
                    const now = new Date();
                    const start = safeDate(assign.startDate);
                    const end = safeDate(assign.endDate);
                    
                    let status = 'open';
                    if (bestResult) status = 'completed';
                    else if (start && now < start) status = 'upcoming';
                    else if (end && now > end) status = 'expired';

                    processedList.push({ ...finalTestData, status, result: bestResult });
                }
            }
        });

        // Dublikatlarni olib tashlash (ID bo'yicha)
        const uniqueTests = processedList.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        console.log("Yakuniy ro'yxat:", uniqueTests.length);
        setRawAssignments(uniqueTests);

      } catch (err) {
          console.error("DEBUG ERROR:", err);
          setErrorMsg("Ma'lumot yuklashda xatolik yuz berdi.");
      } finally {
          setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // --- STATS ---
  const stats = useMemo(() => {
      const total = rawAssignments.length;
      const completed = rawAssignments.filter(t => t.status === 'completed' || (t.isSet && t.completedTests > 0)).length;
      let totalScore = 0, scoreCount = 0;
      rawAssignments.forEach(t => {
          if (t.result?.bandScore) { totalScore += parseFloat(t.result.bandScore); scoreCount++; }
          if (t.isSet) { (t.subTests || []).forEach(sub => { if(sub.result?.bandScore) { totalScore += parseFloat(sub.result.bandScore); scoreCount++; } }); }
      });
      const avg = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 0;
      return { total, completed, avg };
  }, [rawAssignments]);

  const filteredTests = useMemo(() => {
      let baseList = rawAssignments;
      if (activeTab === 'archive') {
          baseList = baseList.filter(t => t.status === 'completed' || (t.isSet && t.completedTests === t.totalTests));
      } 
      else if (activeTab === 'favorites') {
          baseList = []; 
      }
      return baseList.filter(item => {
          const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
          let matchesType = true;
          if (filterType !== 'all') {
              if (filterType === 'mock') matchesType = item.isMock;
              else if (filterType === 'set') matchesType = item.isSet;
              else matchesType = item.type === filterType;
          }
          return matchesSearch && matchesType;
      });
  }, [rawAssignments, searchQuery, filterType, activeTab]);

  const handleStartTest = (test) => { setTestToStart(test); setShowStartConfirm(true); };
  
  const confirmStartTest = () => {
      const test = testToStart; setShowStartConfirm(false);
      if (test.type === 'mock_full') { navigate('/mock-exam', { state: { mockData: test } }); return; }
      navigate(`/test/${test.id}`);
  };

  const handleReview = (test) => {
      if (test.type === 'mock_full') { navigate(`/mock-result/${test.mockKey || test.id}`); } 
      else { navigate(`/test/${test.id}/review`); }
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
      sessionStorage.removeItem(`dashboard_data_${user.uid}`);
      setShowKeyModal(false); setAccessKeyInput(""); 
      window.location.reload(); 
    } catch (error) { setKeyError(error.message); } finally { setCheckingKey(false); }
  };

  const renderContent = () => {
      if (activeTab === 'settings') return <SettingsTab user={user} userData={userData} />;
      if (activeTab === 'results') {
        return <MyResults tests={rawAssignments} onReview={handleReview} onStartTest={handleStartTest} loading={loading} />;
      }
      if (activeTab === 'progress') return <div className="text-center py-20 text-gray-400"><h3 className="text-xl font-bold text-gray-700 mb-2">Statistika Tez Orada...</h3></div>;

      if ((activeTab === 'dashboard' || activeTab === 'favorites' || activeTab === 'archive') && filteredTests.length === 0 && !loading) {
        if (activeTab === 'dashboard') {
            return <WelcomeState onKeyClick={() => setShowKeyModal(true)} userFullName={userData?.fullName} />;
        } else {
            return (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 mx-auto max-w-2xl mt-10">
                    <p className="text-gray-500 font-medium">{activeTab === 'favorites' ? "Sevimlilar ro'yxati bo'sh" : "Arxiv bo'sh"}</p>
                </div>
            );
        }
      }

      return (
          <>
            {activeTab === 'dashboard' && <StatsCards stats={stats} />}
            <FiltersBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterType={filterType} setFilterType={setFilterType} />
            <TestGrid 
                loading={loading} 
                tests={filteredTests} 
                onStartTest={handleStartTest} 
                onSelectSet={setSelectedSet} 
                onReview={handleReview} 
                errorMsg={errorMsg} 
            />
          </>
      );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] selection:bg-blue-100">
      <style>{`body { font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <DashboardHeader 
          user={user} userData={userData} 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          onKeyClick={() => setShowKeyModal(true)} onLogoutClick={() => setShowLogoutConfirm(true)} 
      />
      <main className="max-w-5xl mx-auto p-6 md:p-8">
        {renderContent()}
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
      </main>
    </div>
  );
}