import React, { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, query, where, doc, getDoc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Search, Filter, BookOpen, Clock, ChevronRight, 
    Trophy, LayoutGrid, List, Star, ExternalLink, Key, RotateCw
} from 'lucide-react';
import { useStudentData } from "../hooks/useStudentData";

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import PlanetBackground from "../components/dashboard/PlanetBackground";
import TestGrid from "../components/dashboard/TestGrid";
import FiltersBar from "../components/dashboard/FiltersBar";
import DashboardModals from "../components/dashboard/DashboardModals";
import Pagination from "../components/common/Pagination"; // Pagination Component import


export default function Practice() {
    const { user, logout, userData } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('practice');
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
    const itemsPerPage = 8;

    // 🚀 SHARED HOOK — StudentDashboard bilan bitta cache (zero duplicate reads)
    const { assignments, loading, error: errorMsg, refresh } = useStudentData(user);
    const rawAssignments = useMemo(() => [...assignments], [assignments]);

    const handleManualRefresh = async () => {
        if (!user) return;
        await refresh(); // hook orqali cache invalidate + qayta fetch
    };

    const filteredTests = useMemo(() => {
        const q = searchQuery.toLowerCase();

        const result = [];
        rawAssignments.forEach(item => {
            // Type filteri
            let matchesType = true;
            if (filterType !== 'all') {
                if (filterType === 'mock') matchesType = item.isMock;
                else if (filterType === 'set') matchesType = item.isSet;
                else matchesType = item.type === filterType;
            }
            if (!matchesType) return;

            // Qidiruv bo'lmasa — hammasi oddiy ko'rinadi
            if (!q) {
                result.push(item);
                return;
            }

            // To'plam uchun: qidiruv bo'lsa subTestlarni alohida kartochka sifatida chiqar
            if (item.isSet) {
                const titleMatch = item.title?.toLowerCase().includes(q);
                const matchingSubTests = item.subTests?.filter(s => s.title?.toLowerCase().includes(q)) || [];

                if (titleMatch) {
                    // To'plam nomi mos kelsa — ichidagi BARCHA testlarni alohida chiqar
                    item.subTests?.forEach(sub => result.push({ ...sub, _fromSet: item.title }));
                } else if (matchingSubTests.length > 0) {
                    // Faqat mos kelgan subTestlarni alohida chiqar
                    matchingSubTests.forEach(sub => result.push({ ...sub, _fromSet: item.title }));
                }
                return;
            }

            // Oddiy test uchun
            const matchesSearch = !q || item.title?.toLowerCase().includes(q);
            if (matchesSearch) result.push(item);
        });
        return result;
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
            
            // Cache Invalidation + qayta fetch (reload talab qilmaydi)
            await refresh();

            setShowKeyModal(false); setAccessKeyInput("");
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
                activeTab="practice" 
                onKeyClick={() => setShowKeyModal(true)} 
                onLogoutClick={() => setShowLogoutConfirm(true)}
                onRefreshClick={handleManualRefresh}
                loading={loading}
            />

            <PlanetBackground />

            <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8">
                <div className="mb-12 text-center">
                    <style>{`
                        @keyframes word-appear {
                            0%   { opacity: 0; transform: translateY(20px); filter: blur(10px); }
                            100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                        }
                        .hero-word {
                            display: inline-block;
                            opacity: 0;
                            animation: word-appear 0.8s ease-out forwards;
                        }
                        .hero-header {
                            color: #ffffff;
                            font-weight: 700;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            letter-spacing: -0.04em;
                            line-height: 1.1;
                        }
                        .hero-description {
                            color: #a1a1aa; /* A slightly darker gray to match the image */
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            font-weight: 500;
                            font-size: 0.95rem; /* Make it a bit smaller */
                            letter-spacing: -0.02em;
                            max-width: 600px;
                            margin-left: auto;
                            margin-right: auto;
                        }
                    `}</style>

                    <h1 className="hero-header text-6xl md:text-7xl mb-2">
                        <span className="hero-word" style={{ animationDelay: '0.1s' }}>Amaliyot</span>
                        {' '}
                        <span className="hero-word" style={{ animationDelay: '0.2s' }}>Markazi</span>
                    </h1>
                    <p className="hero-description text-lg md:text-xl opacity-90 leading-relaxed">
                        Barcha mavjud testlar va to&apos;plamlar shu yerda.
                    </p>
                    <div className="mt-10 w-24 h-0 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mx-auto opacity-30"></div>
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
        </div>
    );
}
