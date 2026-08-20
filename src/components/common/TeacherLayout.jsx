import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardModals from '../dashboard/DashboardModals';
import TeacherBottomNav from '../teacher/TeacherBottomNav';

export default function TeacherLayout() {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const isFullWidthPage = location.pathname.includes('writing-review') || location.pathname.includes('browse-articles');

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

            {/* Ustozning o'z navigatsiyasi — o'quvchi menyusi emas. */}
            <TeacherBottomNav />

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
