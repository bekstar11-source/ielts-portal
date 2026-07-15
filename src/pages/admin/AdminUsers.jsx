import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Users, GraduationCap } from 'lucide-react';

// Hooks
import { useAdminUsers } from '../../hooks/useAdminUsers';

// Components
import StudentsTab from '../../components/admin/AdminUsers/StudentsTab';
import GroupsTab from '../../components/admin/AdminUsers/GroupsTab';
import { TabButton } from '@/components/admin/AdminUsers/AdminUsersUtils';

export default function AdminUsers() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState('students');

    const {
        loading,
        students,
        teachers,
        groups,
        hasMoreStudents,
        totalStudents,
        refreshData,
        refreshGroups,
        loadMoreStudents,
        updateStudentLocal
    } = useAdminUsers(activeTab);

    const tabs = [
        { id: 'students', label: 'Students', icon: GraduationCap },
        { id: 'groups', label: 'Groups', icon: Users },
    ];

    if (loading && students.length === 0) return (
        <div className="flex h-screen items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className={`min-h-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>
            
            {/* Header / Nav */}
            <div className={`h-14 px-4 md:px-6 flex items-center justify-between border-b shrink-0 z-20 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                        <Users size={16} />
                    </div>
                    <div>
                        <h1 className="text-sm md:text-base font-black tracking-tight">User Management</h1>
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Portal Administration</p>
                    </div>
                </div>

                <div className={`flex p-1 rounded-xl gap-1 ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                    {tabs.map(tab => (
                        <TabButton
                            key={tab.id}
                            id={tab.id}
                            active={activeTab}
                            onClick={setActiveTab}
                            icon={tab.icon}
                            label={tab.label}
                            theme={theme}
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <main className="flex-1 p-4 md:p-6 min-h-[calc(100vh-3.5rem)] flex flex-col">
                <div className="h-full max-w-7xl mx-auto">
                    {activeTab === 'students' && (
                        <StudentsTab
                            students={students}
                            groups={groups}
                            totalCount={totalStudents}
                            onRefresh={refreshData}
                            onUpdateLocal={updateStudentLocal}
                            theme={theme}
                            hasMore={hasMoreStudents}
                            onLoadMore={loadMoreStudents}
                        />
                    )}

                    {activeTab === 'groups' && (
                        <GroupsTab
                            groups={groups}
                            teachers={teachers}
                            students={students}
                            onRefresh={refreshData}
                            onRefreshGroups={refreshGroups}
                            theme={theme}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}