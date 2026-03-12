import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, BookOpen, CreditCard, Settings,
    LogOut, ChevronLeft, ChevronRight, FileText, Megaphone,
    BarChart2, Shield, Radio, PenTool, Trophy, ScrollText, Headphones, Key
} from 'lucide-react';

export default function AdminSidebar({ isOpen, setIsOpen }) {
    const { theme } = useTheme();
    const { logout } = useAuth();
    const location = useLocation();
    const [hovered, setHovered] = useState(false);

    // Desktop: hover bilan kengayadi. Mobile: toggle bilan
    const expanded = isOpen || hovered;

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
                { name: "Students & Teachers", path: "/admin/users", icon: Users },
                { name: "Gamification", path: "/admin/gamification", icon: Trophy }
            ]
        },
        {
            title: "CONTENT",
            items: [
                { name: "Tests", path: "/admin/tests", icon: FileText },
                { name: "Mock Keys", path: "/admin/key-manager", icon: Key },
                { name: "Results", path: "/admin/results", icon: BookOpen },
                { name: "Podcast Mastery", path: "/admin/podcasts", icon: Headphones }
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
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`
                fixed md:relative z-30 h-full flex flex-col
                transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${expanded ? 'w-64' : 'w-20'}
                ${theme === 'dark' ? 'bg-[#2C2C2C] border-r border-white/5' : 'bg-white border-r border-gray-200'}
                shadow-xl md:shadow-none
            `}
        >
            {/* LOGO AREA */}
            <div className="h-16 flex items-center px-4 border-b border-inherit relative flex-shrink-0">
                <div className={`font-bold text-xl tracking-tighter flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-sm font-black">A</div>
                    <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        Control
                    </span>
                </div>

                {/* Mobile close button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute -right-3 top-6 bg-blue-600 text-white p-1 rounded-full shadow-lg md:hidden"
                >
                    <ChevronLeft size={14} />
                </button>
            </div>

            {/* MENU ITEMS */}
            <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="mb-5">
                        <div className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 overflow-hidden whitespace-nowrap
                            ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}
                            ${expanded ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'}
                        `}>
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
                                            flex items-center gap-3 px-3 py-2.5 rounded-xl
                                            transition-all duration-200
                                            ${isActive
                                                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-50 text-blue-600')
                                                : (theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
                                            }
                                        `}
                                    >
                                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                        <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 overflow-hidden
                                            ${expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'}
                                        `}>
                                            {item.name}
                                        </span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
