// src/pages/StudentDashboard.jsx
import React, { useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudentData } from "../../hooks/useStudentData";
import { useDailyLimit } from "../../hooks/useDailyLimit";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useStudentDashboard } from "../../hooks/dashboard/useStudentDashboard";

// COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import NewsFeed from "../../components/dashboard/NewsFeed";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import SettingsTab from "../../components/dashboard/SettingsTab";
import MyResults from "./MyResults";
import Leaderboard from "../../components/dashboard/Leaderboard";
import SiteFooter from "../../components/common/SiteFooter";
import BottomNav from "../../components/dashboard/BottomNav";

export default function StudentDashboard() {
    const { user, logout, userData } = useAuth();
    const navigate = useNavigate();
    
    // 🔥 DATA HOOKS
    const { assignments: rawAssignments, userResults, loading, refresh } = useStudentData(user);
    const { stats: analyticsStats } = useAnalytics(user?.uid, userResults);
    const { checkLimit, incrementUsage } = useDailyLimit(userData);

    // 🔥 LOGIC HOOK
    const dashboard = useStudentDashboard(user, userData, rawAssignments, userResults, analyticsStats, refresh, loading);

    useEffect(() => {
        if (userData?.role === 'admin') { navigate('/admin', { replace: true }); return; }
        if (userData && userData.accountType === 'public' && userData.onboardingCompleted === false) {
            navigate('/onboarding', { replace: true });
        }
    }, [userData, navigate]);

    const handleManualRefresh = async () => {
        if (!user) return;
        localStorage.removeItem(`gamification_counts_${user.uid}`);
        localStorage.removeItem(`gamification_counts_time_${user.uid}`);
        sessionStorage.removeItem(`analytics_stats_${user.uid}`);
        await refresh();
    };

    const onStartTestRequest = (test) => {
        const type = test.type?.toLowerCase() || '';
        const isReading = type.includes('reading') || test.title?.toLowerCase().includes('reading');
        const isListening = type.includes('listening') || test.title?.toLowerCase().includes('listening');
        const limitTarget = isReading ? 'reading' : isListening ? 'listening' : null;

        if (limitTarget && !checkLimit(limitTarget)) {
            dashboard.setLimitType?.(limitTarget); // Note: setLimitType might need to be added to hook if needed
            return;
        }
        dashboard.handleStartTest(test);
    };

    const handleTabChange = (tabId) => {
        const pathMap = {
            'library': '/library', 'podcasts': '/podcasts',
            'articles': '/articles', 'vocabulary': '/vocabulary'
        };
        if (pathMap[tabId]) navigate(pathMap[tabId]);
        else {
            dashboard.setActiveTab(tabId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const filteredTests = useMemo(() => {
        let baseList = rawAssignments;
        if (dashboard.activeTab === 'archive') {
            baseList = baseList.filter(t => t.status === 'completed' || (t.isSet && t.completedTests === t.totalTests));
        } else if (dashboard.activeTab === 'favorites') {
            baseList = [];
        }
        return baseList.filter(item => {
            const matchesSearch = item.title?.toLowerCase().includes(dashboard.searchQuery.toLowerCase());
            let matchesType = true;
            if (dashboard.filterType !== 'all') {
                if (dashboard.filterType === 'mock') matchesType = item.isMock;
                else if (dashboard.filterType === 'set') matchesType = item.isSet;
                else matchesType = item.type === dashboard.filterType;
            }
            return matchesSearch && matchesType;
        });
    }, [rawAssignments, dashboard.searchQuery, dashboard.filterType, dashboard.activeTab]);

    const renderContent = () => {
        if (dashboard.activeTab === 'settings') return <SettingsTab user={user} userData={userData} />;
        if (dashboard.activeTab === 'leaderboard') return <Leaderboard />;
        if (dashboard.activeTab === 'results') {
            return <MyResults tests={rawAssignments} onReview={(t) => navigate(`/review/${t.result?.id}`)} onStartTest={onStartTestRequest} loading={loading} />;
        }

        if (dashboard.activeTab === 'dashboard') {
            return (
                <div className="flex flex-col gap-2 max-w-lg mx-auto bg-white dark:bg-[#09090b] transition-colors pb-6">
                    {/* Compact stats widget */}
                    <div className="px-4 pt-4 pb-2 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg font-extrabold shadow-sm">
                                {dashboard.overallBand || "0.0"}
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-800 dark:text-zinc-200">Overall Band</h3>
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Target: {userData?.targetBand || 7.5}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/5 px-2.5 py-1.5 rounded-xl border border-orange-500/10">
                                <span>🔥</span>
                                <span>{userData?.streakCount || 0} kun</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/5 px-2.5 py-1.5 rounded-xl border border-yellow-500/10">
                                <span>🏆</span>
                                <span>{userData?.gamification?.points || 0} ball</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Instagram-like news feed */}
                    <NewsFeed user={user} userData={userData} />
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] font-sans text-[#1d1d1f] dark:text-[#f5f5f7] antialiased selection:bg-black selection:text-white overflow-x-hidden transition-colors duration-200">
            <DashboardHeader
                user={user} userData={userData}
                activeTab={dashboard.activeTab} setActiveTab={dashboard.setActiveTab}
                onKeyClick={() => dashboard.setShowKeyModal(true)} 
                onLogoutClick={() => dashboard.setShowLogoutConfirm(true)}
                onPremiumClick={() => dashboard.setShowPricingModal(true)}
                onRefreshClick={handleManualRefresh}
                loading={loading}
            />
            <main className="w-full pb-24 md:pb-0">
                {renderContent()}
            </main>
            
            <BottomNav activeTab={dashboard.activeTab} setActiveTab={handleTabChange} />
            <SiteFooter />

            <DashboardModals
                showKeyModal={dashboard.showKeyModal} setShowKeyModal={dashboard.setShowKeyModal}
                accessKeyInput={dashboard.accessKeyInput} setAccessKeyInput={dashboard.setAccessKeyInput}
                handleVerifyKey={dashboard.handleVerifyKey} checkingKey={dashboard.checkingKey} keyError={dashboard.keyError}
                showStartConfirm={dashboard.showStartConfirm} setShowStartConfirm={dashboard.setShowStartConfirm} 
                confirmStartTest={() => dashboard.confirmStartTest(incrementUsage)}
                showLogoutConfirm={dashboard.showLogoutConfirm} setShowLogoutConfirm={dashboard.setShowLogoutConfirm} confirmLogout={logout}
                selectedSet={dashboard.selectedSet} setSelectedSet={dashboard.setSelectedSet}
                handleStartTest={onStartTestRequest}
                handleReview={(t) => navigate(`/review/${t.result?.id}`)}
            />
            <PricingModal 
                isOpen={dashboard.showPricingModal} 
                onClose={() => dashboard.setShowPricingModal(false)} 
                userName={userData?.fullName?.split(' ')[0]} 
            />
        </div>
    );
}