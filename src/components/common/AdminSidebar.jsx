import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, BookOpen, CreditCard, Settings,
    LogOut, ChevronLeft, ChevronRight, FileText, Megaphone,
    BarChart2, Shield, Radio, PenTool, Trophy, ScrollText, Headphones, Key, Flame
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
                { name: "Roadmap", path: "/admin/roadmap", icon: Flame },
                { name: "Writing Review", path: "/admin/writing-review", icon: PenTool },
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
        <>
            {/* Desktop placeholder to occupy space without pushing content when expanded */}
            <div className="hidden md:block w-16 flex-shrink-0"></div>

            <aside
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`
                    fixed left-0 top-0 bottom-0 z-30 h-full flex flex-col
                    transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${expanded ? 'w-52' : 'w-16'}
                    ${theme === 'dark' ? 'bg-[#1E1E1E] border-r border-white/5' : 'bg-white border-r border-gray-200'}
                    shadow-xl ${expanded ? 'md:shadow-2xl' : 'md:shadow-none'}

                `}
            >
                {/* LOGO AREA */}
                <div className="h-14 flex items-center px-4 border-b border-inherit relative flex-shrink-0 bg-inherit">
                    <div className={`font-bold text-lg tracking-tighter flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-xs font-black">A</div>
                        <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
                            Control
                        </span>
                    </div>

                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute -right-3 top-5 bg-blue-600 text-white p-1 rounded-full shadow-lg md:hidden"
                    >
                        <ChevronLeft size={12} />
                    </button>
                </div>

                {/* MENU ITEMS */}
                <div className="flex-1 overflow-y-auto py-3 px-2.5 custom-scrollbar bg-inherit">
                    {menuGroups.map((group, idx) => (
                        <div key={idx} className="mb-4">
                            <div className={`px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden whitespace-nowrap
                                ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}
                                ${expanded ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'}
                            `}>
                                {group.title}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = item.exact
                                        ? location.pathname === item.path
                                        : location.pathname.startsWith(item.path);

                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={`
                                                flex items-center gap-3 px-2.5 py-2 rounded-xl
                                                transition-all duration-200
                                                ${isActive
                                                    ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-50 text-blue-600')
                                                    : (theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
                                                }
                                            `}
                                        >
                                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                            <span className={`font-semibold text-[13px] whitespace-nowrap transition-all duration-300 overflow-hidden
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
        </>
    );
}
