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
import DiscountBanner from "../../components/dashboard/DiscountBanner";
import NewsFeed from "../../components/dashboard/NewsFeed";
import CatalogDashboard from "../../components/dashboard/CatalogDashboard";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import SettingsTab from "../../components/dashboard/SettingsTab";
import MyResults from "./MyResults";
// import Leaderboard from "../../components/dashboard/Leaderboard";
import SiteFooter from "../../components/common/SiteFooter";
import BottomNav from "../../components/dashboard/BottomNav";
import ProfileSidebar from "../../components/dashboard/ProfileSidebar";
import PromoSpotlight from "../../components/dashboard/PromoSpotlight";

export default function StudentDashboard() {
    const { user, logout, userData } = useAuth();
    const navigate = useNavigate();
    
    // 🔥 DATA HOOKS
    const { assignments: rawAssignments, userResults, groupIds, loading, refresh } = useStudentData(user);
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

    useEffect(() => {
        if (localStorage.getItem('show_pricing_on_load') === 'true') {
            localStorage.removeItem('show_pricing_on_load');
            dashboard.setShowPricingModal(true);
        }
    }, [dashboard]);

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

        if (limitTarget && !checkLimit(limitTarget, test)) {
            // Ilgari bu yerda mavjud bo'lmagan `setLimitType?.()` chaqirilardi:
            // optional-call jim o'tib ketar, foydalanuvchi "Boshlash"ni bosganda
            // hech narsa sodir bo'lmasdi. Endi tarif oynasi ochiladi.
            dashboard.setShowPricingModal(true);
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
        // if (dashboard.activeTab === 'leaderboard') return <Leaderboard />;
        if (dashboard.activeTab === 'results') {
            return <MyResults tests={rawAssignments} onReview={(t) => navigate(`/review/${t.result?.id}`)} onStartTest={onStartTestRequest} loading={loading} />;
        }

        if (dashboard.activeTab === 'dashboard') {
            const hasGroup = userData?.groupId && userData.groupId !== 'none';

            if (!hasGroup) {
                return (
                    <CatalogDashboard
                        onPremiumClick={() => dashboard.setShowPricingModal(true)}
                    />
                );
            }

            return (
                <div className="w-full max-w-[1000px] mx-auto px-4 pt-0 pb-6 flex flex-row gap-12 justify-center items-start bg-warm-canvas dark:bg-warm-dark transition-colors">
                    {/* Left Column: Stories & Feed */}
                    <div className="flex-1 max-w-[630px] w-full flex flex-col gap-2">
                        {/* Instagram-like news feed */}
                        <NewsFeed
                            user={user}
                            userData={userData}
                            assignments={rawAssignments}
                            groupIds={groupIds}
                            spotlight={<PromoSpotlight compact />}
                        />
                    </div>

                    {/* Right Column: Profile Sidebar */}
                    <div className="hidden lg:block w-[320px] shrink-0 sticky top-[80px] self-start">
                        <ProfileSidebar
                            user={user}
                            userData={userData}
                            stats={analyticsStats}
                            statsLoading={loading}
                            onLogoutClick={() => dashboard.setShowLogoutConfirm(true)}
                            // onSeeAllClick={() => handleTabChange('leaderboard')}
                        />
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans text-warm-ink dark:text-warm-on-dark antialiased selection:bg-warm-primary selection:text-white overflow-x-hidden transition-colors duration-200">
            <DashboardHeader
                user={user} userData={userData}
                activeTab={dashboard.activeTab} setActiveTab={dashboard.setActiveTab}
                onKeyClick={() => dashboard.setShowKeyModal(true)} 
                onLogoutClick={() => dashboard.setShowLogoutConfirm(true)}
                onPremiumClick={() => dashboard.setShowPricingModal(true)}
                onRefreshClick={handleManualRefresh}
                loading={loading}
            />
            {/* Chegirma eslatmasi — chegirma bo'lmasa hech narsa chizmaydi. */}
            <DiscountBanner userData={userData} />
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
                handleReview={(t) => {
                    const isPremium = userData?.isPremium || 
                                      userData?.isPro || 
                                      ['premium', 'pro', 'standard'].includes(userData?.accountType) || 
                                      ['admin', 'teacher'].includes(userData?.role);
                    if (!isPremium) {
                        dashboard.setShowPricingModal(true);
                    } else {
                        navigate(`/review/${t.result?.id}`);
                    }
                }}
            />
            <PricingModal 
                isOpen={dashboard.showPricingModal} 
                onClose={() => dashboard.setShowPricingModal(false)} 
                userName={userData?.fullName?.split(' ')[0]} 
            />
        </div>
    );
}