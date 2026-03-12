import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    SquaresFour as LayoutDashboard, BookOpen, NotePencil as PenLine, ChartBar as BarChart2,
    SignOut as LogOut, List as Menu, GraduationCap, CaretLeft as ChevronLeft
} from '@phosphor-icons/react';

const navItems = [
    { name: "Dashboard", path: "/teacher", icon: LayoutDashboard, exact: true },
    { name: "Testlar", path: "/teacher/tests", icon: BookOpen },
    { name: "Writing Tekshirish", path: "/teacher/writing-review", icon: PenLine },
    { name: "Guruh Statistikasi", path: "/teacher/group-stats", icon: BarChart2 },
];

function TeacherSidebar({ isOpen, setIsOpen }) {
    const { theme } = useTheme();
    const { logout, userData } = useAuth();
    const location = useLocation();
    const isDark = theme === 'dark';
    const [hovered, setHovered] = useState(false);

    // Desktop: hover bilan kengayadi. Mobile: toggle bilan
    const expanded = isOpen || hovered;

    return (
        <>
            {/* Desktop placeholder to occupy space without pushing content when expanded */}
            <div className="hidden md:block w-20 flex-shrink-0"></div>

            <aside
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`
                    fixed left-0 top-0 bottom-0 z-30 h-full flex flex-col
                    transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${expanded ? 'w-64' : 'w-20'}
                    ${isDark ? 'bg-[#2C2C2C] border-r border-white/5' : 'bg-white border-r border-gray-200'}
                    shadow-xl ${expanded ? 'md:shadow-2xl' : 'md:shadow-none'}
                `}
            >
                {/* Logo */}
                <div className={`h-16 flex items-center px-4 border-b flex-shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'} bg-inherit`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                            <GraduationCap size={16} />
                        </div>
                        <span className={`font-bold text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                            ${expanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}
                            ${isDark ? 'text-white' : 'text-gray-900'}
                        `}>
                            Teacher Panel
                        </span>
                    </div>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className={`ml-auto p-1 rounded-lg md:hidden flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500'}`}
                    >
                        <ChevronLeft size={16} />
                    </button>
                </div>

                {/* Teacher Info */}
                <div className={`px-4 py-3 border-b flex items-center gap-3 overflow-hidden bg-inherit
                    ${isDark ? 'border-white/5' : 'border-gray-100'}
                `}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {userData?.fullName?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        <p className={`text-xs font-bold truncate whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>{userData?.fullName || 'Teacher'}</p>
                        <p className="text-[10px] text-emerald-500 font-medium whitespace-nowrap">Ustoz</p>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar bg-inherit">
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                                    ${isActive
                                        ? (isDark ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-emerald-50 text-emerald-700')
                                        : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
                                    }
                                `}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                                    ${expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'}
                                `}>
                                    {item.name}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className={`p-3 border-t flex-shrink-0 bg-inherit ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <button
                        onClick={logout}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                            ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}
                        `}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                            ${expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}
                        `}>Chiqish</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function TeacherHeader({ toggleSidebar }) {
    const { theme } = useTheme();
    const { userData } = useAuth();
    const isDark = theme === 'dark';
    const location = useLocation();

    const currentPage = navItems.find(item =>
        item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
    );

    return (
        <header className={`h-16 flex items-center justify-between px-4 md:px-6 border-b flex-shrink-0 ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-xl md:hidden ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                    <Menu size={20} />
                </button>
                <h1 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {currentPage?.name || 'Teacher Panel'}
                </h1>
            </div>
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
                    {userData?.fullName?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <div className="hidden sm:block">
                    <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{userData?.fullName || 'Teacher'}</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Ustoz</p>
                </div>
            </div>
        </header>
    );
}

export default function TeacherLayout() {
    const { theme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1E1E1E] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <TeacherSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                <TeacherHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <Outlet />
                </main>
            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
