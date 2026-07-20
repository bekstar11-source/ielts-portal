import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardModals from '../dashboard/DashboardModals';
import BottomNav from '../dashboard/BottomNav';
import SiteFooter from './SiteFooter';

export default function TeacherLayout() {
    const { user, userData, logout } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isDark = theme === 'dark';
    
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const isFullWidthPage = location.pathname.includes('writing-review') || location.pathname.includes('browse-articles') || location.pathname.includes('students');

    const handleTabChange = (tabId) => {
        const pathMap = {
            'library': '/library', 'podcasts': '/podcasts',
            'articles': '/articles', 'vocabulary': '/vocabulary'
        };
        if (pathMap[tabId]) navigate(pathMap[tabId]);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#18181b] font-sans text-gray-900 dark:text-[#f5f5f7] overflow-x-hidden transition-colors duration-200">
            <DashboardHeader
                user={user}
                userData={userData}
                activeTab="teacher"
                onLogoutClick={() => setShowLogoutConfirm(true)}
                loading={false}
            />
            
            <main className="w-full pb-24 md:pb-0 pt-12">
                <div className={`${isFullWidthPage ? 'w-full h-full' : 'max-w-[1200px] mx-auto p-4 md:p-8 pb-10'}`}>
                    <Outlet />
                </div>
            </main>

            <BottomNav activeTab="teacher" setActiveTab={handleTabChange} />
            <SiteFooter />

            <DashboardModals
                showLogoutConfirm={showLogoutConfirm}
                setShowLogoutConfirm={setShowLogoutConfirm}
                confirmLogout={async () => {
                    await logout();
                    navigate('/login');
                }}
                showKeyModal={false}
                showStartConfirm={false}
            />
        </div>
    );
}
