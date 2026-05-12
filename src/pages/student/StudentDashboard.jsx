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
import HeroSection from "../../components/dashboard/HeroSection";
import AnnouncementsBoard from "../../components/dashboard/AnnouncementsBoard";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import SettingsTab from "../../components/dashboard/SettingsTab";
import MyResults from "../../pages/MyResults";
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
    const dashboard = useStudentDashboard(user, userData, rawAssignments, userResults, analyticsStats, refresh);

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
                <HeroSection
                    userName={userData?.fullName?.split(' ')[0] || "O'quvchi"}
                    targetBand={userData?.targetBand || 7.5}
                    currentBand={dashboard.overallBand}
                    previousBand={userData?.previousIELTSScore || 0}
                    examDate={userData?.examDate}
                    onUpgradeClick={() => dashboard.setShowPricingModal(true)}
                    skillStats={dashboard.skillStats}
                    onToggleSkill={dashboard.toggleSkill}
                    streakCount={userData?.streakCount || 0}
                    points={userData?.gamification?.points || 0}
                    usageStats={userData?.usageStats}
                    onStartTest={onStartTestRequest}
                    assignments={rawAssignments.length > 0 ? rawAssignments : dashboard.publicTestsFallback}
                />
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#1d1d1f] antialiased selection:bg-black selection:text-white overflow-x-hidden">
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
                {dashboard.activeTab === 'dashboard' && <div className="mt-12"><AnnouncementsBoard /></div>}
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