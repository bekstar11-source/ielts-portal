import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useTheme } from '../../context/ThemeContext';

export default function AdminLayout() {
    const { theme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

    return (
        <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1E1E1E] text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* SIDEBAR */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">

                {/* HEADER */}
                <AdminHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                {/* SCROLLABLE CONTENT */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <Outlet />
                </main>
            </div>

            {/* MOBILE OVERLAY */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
