import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import PlanetBackground from "../components/dashboard/PlanetBackground";
import TestGrid from "../components/dashboard/TestGrid";
import FiltersBar from "../components/dashboard/FiltersBar";
import DashboardModals from "../components/dashboard/DashboardModals";
import Pagination from "../components/common/Pagination"; // Pagination Component import

// --- LOGIC HELPERS ---
const safeDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
};

// Yordamchi: ID lar bo'yicha hujjatlarni olib kelish
const fetchDocumentsByIds = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return {};
    const uniqueIds = [...new Set(ids)];
    const docsMap = {};

    const promises = uniqueIds.map(async (id) => {
        try {
            const cleanId = String(id).trim();
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

export default function Practice() {
    const { user, logout, userData } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('practice');
    const [rawAssignments, setRawAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");

    // Modals state
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const [testToStart, setTestToStart] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [selectedSet, setSelectedSet] = useState(null);
    const [accessKeyInput, setAccessKeyInput] = useState("");
    const [checkingKey, setCheckingKey] = useState(false);
    const [keyError, setKeyError] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Sahifada nechta test ko'rinishi kerak

    // Data Fetching Logic (Taken from StudentDashboard)
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                const [userSnap, groupsSnap, resultsSnap] = await Promise.all([
                    getDoc(doc(db, 'users', user.uid)),
                    getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
                    getDocs(query(collection(db, 'results'), where('userId', '==', user.uid)))
                ]);

                const myResults = resultsSnap.docs.map(d => d.data());
                let allAssignments = [];
                const currentUserData = userSnap.data();

                const normalizeAssignment = (assign) => {
                    if (!assign) return null;
                    if (typeof assign === 'string') return { id: assign.trim(), type: 'test' };
                    if (typeof assign === 'object' && assign.id) return { ...assign, id: String(assign.id).trim() };
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

                allAssignments = allAssignments.filter(Boolean);

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
                        // 🔥 FIX: Faqat bazada real mavjud testlarni chiqaramiz.
                        // Aks holda bosganda "Test topilmadi" deb dashboardga qaytarib yuboradi.
                        if (testDataFromDb) {
                            const finalTestData = {
                                ...testDataFromDb,
                                ...assign,
                                id: assign.id,
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

                const uniqueTests = processedList.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                setRawAssignments(uniqueTests);

            } catch (err) {
                console.error("Error fetching practice tests:", err);
                setErrorMsg("Testlarni yuklashda xatolik yuz berdi.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const filteredTests = useMemo(() => {
        let baseList = rawAssignments;
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
    }, [rawAssignments, searchQuery, filterType]);

    // PAGINATION LOGIC
    const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
    const currentTests = filteredTests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Filter o'zgarsa 1-sahifaga qaytish
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    const handleStartTest = (test) => { setTestToStart(test); setShowStartConfirm(true); };

    const confirmStartTest = () => {
        const test = testToStart;
        setShowStartConfirm(false);
        setSelectedSet(null); // 🔥 Close set modal if open
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
            setShowKeyModal(false); setAccessKeyInput("");
            window.location.reload(); // Reload to fetch new test
        } catch (error) { setKeyError(error.message); } finally { setCheckingKey(false); }
    };

    return (
        <div className="min-h-screen bg-[#050505] font-sans text-white selection:bg-orange-500/20">
            <style>{`
                body { 
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; 
                    background-color: #050505;
                }
            `}</style>

            <DashboardHeader
                user={user} userData={userData}
                activeTab={activeTab} setActiveTab={setActiveTab}
                onKeyClick={() => setShowKeyModal(true)} onLogoutClick={() => setShowLogoutConfirm(true)}
            />

            <PlanetBackground />

            <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Amaliyot Markazi</h1>
                    <p className="text-gray-400">Barcha mavjud testlar va to'plamlar shu yerda.</p>
                </div>

                <FiltersBar
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    filterType={filterType} setFilterType={setFilterType}
                />

                {currentTests.length === 0 && !loading && !errorMsg ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 mx-auto max-w-2xl mt-8">
                        <p className="text-gray-500 font-medium">Hozircha hech qanday test topilmadi.</p>
                    </div>
                ) : (
                    <TestGrid
                        loading={loading}
                        tests={currentTests} // Faqat hozirgi sahifadagi testlar
                        onStartTest={handleStartTest}
                        onSelectSet={setSelectedSet}
                        onReview={handleReview}
                        errorMsg={errorMsg}
                    />
                )}

                {!loading && !errorMsg && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}

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
