import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, BookOpen, CreditCard, Settings,
    LogOut, ChevronLeft, ChevronRight, FileText, Megaphone,
    BarChart2, Shield, Radio, PenTool, Trophy, ScrollText
} from 'lucide-react';

export default function AdminSidebar({ isOpen, setIsOpen }) {
    const { theme } = useTheme();
    const { logout } = useAuth();
    const location = useLocation();

    const menuGroups = [
        {
            title: "MAIN",
            items: [
                { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
                { name: "Analytics", path: "/admin/analytics", icon: BarChart2 },
                { name: "Announcements", path: "/admin/announcements", icon: Megaphone }
            ]
        },
        {
            title: "USERS",
            items: [
                { name: "Students", path: "/admin/users", icon: Users },
                { name: "Admins", path: "/admin/admins", icon: Shield },
                { name: "Gamification", path: "/admin/gamification", icon: Trophy }
            ]
        },
        {
            title: "CONTENT",
            items: [
                { name: "Tests", path: "/admin/tests", icon: FileText },
                { name: "Results", path: "/admin/results", icon: BookOpen }
            ]
        },
        {
            title: "SYSTEM",
            items: [
                { name: "Audit Logs", path: "/admin/logs", icon: ScrollText },
                { name: "Settings", path: "/admin/settings", icon: Settings }
            ]
        }
    ];

    return (
        <aside
            className={`
                fixed md:relative z-30 h-full transition-all duration-300 ease-in-out
                ${isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'}
                ${theme === 'dark' ? 'bg-[#2C2C2C] border-r border-white/5' : 'bg-white border-r border-gray-200'}
            `}
        >
            {/* LOGO AREA */}
            <div className="h-16 flex items-center justify-center border-b border-inherit relative">
                <div className={`font-bold text-xl tracking-tighter flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">A</div>
                    <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden md:block md:w-0 overflow-hidden'}`}>
                        Control
                    </span>
                </div>

                {/* Toggle Button (Mobile only inside, Desktop handled by layout or hover if needed) */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute -right-3 top-6 bg-blue-600 text-white p-1 rounded-full shadow-lg md:hidden"
                >
                    {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            </div>

            {/* MENU ITEMS */}
            <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="mb-6">
                        <div className={`px-4 mb-2 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} ${!isOpen ? 'md:hidden' : ''}`}>
                            {group.title}
                        </div>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : location.pathname.startsWith(item.path);

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                                            ${isActive
                                                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-50 text-blue-600')
                                                : (theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
                                            }
                                        `}
                                        title={!isOpen ? item.name : ""}
                                    >
                                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${!isOpen ? 'md:hidden' : ''}`}>
                                            {item.name}
                                        </span>

                                        {/* Hover Tooltip for collapsed state */}
                                        {!isOpen && (
                                            <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap hidden md:block">
                                                {item.name}
                                            </div>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* FOOTER */}
            <div className={`p-4 border-t border-inherit ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                >
                    <LogOut size={20} />
                    <span className={`font-medium text-sm ${!isOpen ? 'md:hidden' : ''}`}>Chiqish</span>
                </button>
            </div>
        </aside>
    );
}
