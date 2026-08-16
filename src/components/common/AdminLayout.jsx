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
            className={`h-[100dvh] overflow-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}
        >
            <AdminSidebar />

            <SidebarInset className="min-w-0">
                <AdminHeader />

                {/* SCROLLABLE CONTENT */}
                <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
