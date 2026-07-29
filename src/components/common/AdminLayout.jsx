import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useTheme } from '../../context/ThemeContext';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';

export default function AdminLayout() {
    const { theme } = useTheme();

    return (
        <SidebarProvider
            className={`h-screen overflow-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}
        >
            <AdminSidebar />

            <SidebarInset>
                <AdminHeader />

                {/* SCROLLABLE CONTENT */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
