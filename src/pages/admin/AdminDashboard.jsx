import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";

// Hooks & Components
import { useAdminDashboard } from "../../hooks/useAdminDashboard";
import AdminDashboardStats from "../../components/admin/AdminDashboard/AdminDashboardStats";
import AdminDashboardActions from "../../components/admin/AdminDashboard/AdminDashboardActions";
import RecentActivity from "../../components/admin/AdminDashboard/RecentActivity";

export default function AdminDashboard() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [isAuthorized, setIsAuthorized] = useState(false);

    const { stats } = useAdminDashboard(isAuthorized);

    useEffect(() => {
        if (userData === undefined) return;
        if (!userData || userData.role !== 'admin') {
            navigate('/');
        } else {
            setIsAuthorized(true);
        }
    }, [userData, navigate]);

    if (!isAuthorized || stats.loading) return <DashboardSkeleton />;

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6">
            <AdminDashboardStats stats={stats} isDark={isDark} />
            <AdminDashboardActions isDark={isDark} />
            <RecentActivity items={stats.activityData} isDark={isDark} />
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex-1 p-4 lg:p-6 flex flex-col gap-6 animate-pulse">
            <div className="grid grid-cols-12 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="col-span-12 md:col-span-4 h-28 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>)}
            </div>
            <div className="h-40 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
            <div className="h-48 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
        </div>
    );
}