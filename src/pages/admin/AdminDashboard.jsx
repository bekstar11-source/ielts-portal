import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";

// Hooks & Components
import { useAdminDashboard } from "../../hooks/useAdminDashboard";
import AdminDashboardStats from "../../components/admin/AdminDashboard/AdminDashboardStats";
import AdminDashboardActions from "../../components/admin/AdminDashboard/AdminDashboardActions";
import AdminDashboardUsers from "../../components/admin/AdminDashboard/AdminDashboardUsers";
import AdvancedAnalyticsChart from "../../components/common/AdvancedAnalyticsChart";
import { UserDetailModal, GroupSelectionModal } from "../../components/admin/AdminDashboard/AdminDashboardModals";

// Modals (Will extract soon or use from existing if available)
// Note: Keeping it brief here to show the impact of refactoring

export default function AdminDashboard() {
    const { userData } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [chartRange, setChartRange] = useState("week");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("fullName");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const itemsPerPage = 25;

    const {
        stats, groups, displayedUsers, setDisplayedUsers,
        fetchAllUsers, handleUpdateStatus, handleAddToGroup, handleBlockUser
    } = useAdminDashboard(isAuthorized);

    useEffect(() => {
        if (userData === undefined) return;
        if (!userData || userData.role !== 'admin') {
            navigate('/');
        } else {
            setIsAuthorized(true);
            fetchAllUsers();
        }
    }, [userData, navigate]);

    if (!isAuthorized || stats.loading) return <DashboardSkeleton />;

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6">
            <AdminDashboardStats stats={stats} isDark={isDark} />
            <AdminDashboardActions isDark={isDark} />

            {/* ACTIVITY CHART */}
            <div className={`rounded-[24px] p-6 border transition-colors ${isDark ? 'bg-[#272727] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-gray-900 dark:text-white font-medium">Faollik Statistikasi</h3>
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                        {["week", "month"].map(range => (
                            <button
                                key={range}
                                onClick={() => setChartRange(range)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${chartRange === range ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white/70'}`}
                            >
                                {range === 'week' ? 'Haftalik' : 'Oylik'}
                            </button>
                        ))}
                    </div>
                </div>
                <AdvancedAnalyticsChart
                    data={chartRange === 'week' ? stats.activityData?.slice(-7) : stats.activityData}
                    height={350}
                    seriesConfig={[
                        { key: 'tests', label: 'Bajarilgan Testlar', color: '#3B82F6', type: 'count' },
                        { key: 'score', label: 'O\'rtacha Ball', color: '#F59E0B', type: 'decimal' },
                        { key: 'users', label: 'Yangi O\'quvchilar', color: '#EC4899', type: 'count' },
                    ]}
                />
            </div>

            <AdminDashboardUsers 
                users={displayedUsers}
                totalCount={stats.users}
                groups={groups}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortOption={sortOption}
                setSortOption={setSortOption}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onSelectUser={(u) => { setSelectedUser(u); setShowDetailModal(true); }}
                onShowGroupModal={(u) => { setSelectedUser(u); setShowGroupModal(true); }}
                isDark={isDark}
            />

            {showDetailModal && (
                <UserDetailModal 
                    user={selectedUser} 
                    onClose={() => setShowDetailModal(false)} 
                    onBlock={handleBlockUser} 
                    onUpdateType={handleUpdateStatus}
                    isDark={isDark}
                />
            )}

            {showGroupModal && (
                <GroupSelectionModal 
                    user={selectedUser} 
                    groups={groups} 
                    onClose={() => setShowGroupModal(false)} 
                    onAdd={handleAddToGroup}
                    isDark={isDark}
                />
            )}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex-1 p-4 lg:p-6 flex flex-col gap-6 animate-pulse">
            <div className="grid grid-cols-12 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="col-span-12 md:col-span-4 h-32 bg-gray-200 dark:bg-white/5 rounded-[24px]"></div>)}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-white/5 rounded-[24px]"></div>
            <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-[24px]"></div>
        </div>
    );
}